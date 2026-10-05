import express from "express";
import { createServer } from "node:http";
import { randomInt } from "node:crypto";
import { ExpressPeerServer } from "peer";
import { Server } from "socket.io";
import { WebSocketServer } from "ws";

const app = express();
const httpServer = createServer(app);
const port = Number(process.env.PORT) || 8080;
const allowedOrigins = (process.env.CLIENT_ORIGIN || "*")
  .split(",")
  .map((origin) => origin.trim());
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins.includes("*") ? "*" : allowedOrigins },
  maxHttpBufferSize: 2e6
});

// Enable CORS for Express HTTP endpoints and PeerJS handshake
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowed = allowedOrigins.includes("*") || (origin && allowedOrigins.includes(origin));
  if (isAllowed || !origin) {
    res.header("Access-Control-Allow-Origin", origin || "*");
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
const peerServer = ExpressPeerServer(httpServer, {
  proxied: true,
  allow_discovery: false,
  createWebSocketServer: ({ server }) => {
    const peerSockets = new WebSocketServer({ noServer: true });
    server.on("upgrade", (request, socket, head) => {
      const requestPath = new URL(request.url || "/", "http://localhost").pathname;
      if (!requestPath.startsWith("/peer")) return;
      peerSockets.handleUpgrade(request, socket, head, (connection) => {
        peerSockets.emit("connection", connection, request);
      });
    });
    return peerSockets;
  }
});
peerServer.on("connection", (client) => {
  console.log(`[PeerServer] Client connected: ${client.getId()}`);
});
peerServer.on("disconnect", (client) => {
  console.log(`[PeerServer] Client disconnected: ${client.getId()}`);
});
app.use("/peer", peerServer);
app.get("/", (_req, res) => res.json({ status: "ok", service: "Virtual Photobooth LDR" }));
app.get("/health", (_req, res) => res.json({ status: "ok" }));

const rooms = new Map();
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createRoomCode() {
  let code;
  do {
    code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function roomSnapshot(room) {
  return [...room.members.values()].map(({ socketId, role, peerId }) => ({
    socketId,
    role,
    peerId
  }));
}

io.on("connection", (socket) => {
  socket.on("create-room", (...args) => {
    const ack = typeof args[args.length - 1] === "function" ? args[args.length - 1] : null;
    const code = createRoomCode();
    const room = { members: new Map(), session: null };
    rooms.set(code, room);
    joinRoom(socket, code, room, "host", ack);
  });

  socket.on("join-room", (rawCode, ack) => {
    const code = String(rawCode || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return ack?.({ error: "Room tidak ditemukan. Periksa kembali kodenya." });
    if (room.members.size >= 2) return ack?.({ error: "Room ini sudah penuh." });
    joinRoom(socket, code, room, "guest", ack);
  });

  socket.on("peer-ready", (peerId) => {
    const code = socket.data.roomCode;
    const room = code && rooms.get(code);
    if (typeof peerId !== "string" || peerId.length > 100) return;
    socket.data.peerId = peerId;
    const member = room?.members.get(socket.id);
    if (!member) return;
    member.peerId = peerId;
    socket.to(code).emit("peer-available", { role: member.role, peerId });
    for (const other of room.members.values()) {
      if (other.socketId !== socket.id && other.peerId) {
        socket.emit("peer-available", { role: other.role, peerId: other.peerId });
      }
    }
    io.to(code).emit("room-members", roomSnapshot(room));
  });

  socket.on("start-timer", (layout, ack) => {
    const code = socket.data.roomCode;
    const room = code && rooms.get(code);
    const member = room?.members.get(socket.id);
    if (!member || member.role !== "host") {
      return ack?.({ error: "Hanya host yang dapat memulai sesi." });
    }
    if (room.members.size < 1) return ack?.({ error: "Room tidak valid atau kosong." });
    if (room.session) return ack?.({ error: "Sesi pemotretan sedang berlangsung." });
    if (!["strip", "grid"].includes(layout)) return ack?.({ error: "Layout tidak valid." });

    const sessionId = `${Date.now()}-${randomInt(1_000_000)}`;
    const startAt = Date.now() + 3000;
    room.session = { id: sessionId, startAt, layout };
    io.to(code).emit("session-start", { sessionId, startAt, layout });
    ack?.({ ok: true, sessionId });
  });

  socket.on("photo-captured", ({ sessionId, round, data } = {}) => {
    const code = socket.data.roomCode;
    const room = code && rooms.get(code);
    const member = room?.members.get(socket.id);
    if (!member || !room.session || room.session.id !== sessionId) return;
    if (!Number.isInteger(round) || round < 0 || round > 3) return;
    if (typeof data !== "string" || !data.startsWith("data:image/jpeg;base64,") || data.length > 450_000) {
      return socket.emit("session-error", "Frame foto tidak valid atau terlalu besar.");
    }
    socket.to(code).emit("photo-received", {
      sessionId,
      round,
      role: member.role,
      data,
      layout: room.session.layout
    });
  });

  socket.on("finish-session", (sessionId) => {
    const code = socket.data.roomCode;
    const room = code && rooms.get(code);
    if (!room || room.session?.id !== sessionId) return;
    room.session = null;
    io.to(code).emit("session-finished", { sessionId });
  });

  socket.on("sync-filter", (filter) => {
    if (socket.data.roomCode && typeof filter === "string" && filter.length <= 40) {
      socket.to(socket.data.roomCode).emit("filter-changed", filter);
    }
  });

  socket.on("disconnect", () => {
    removeFromRoom(socket);
  });

  socket.on("leave-room", () => removeFromRoom(socket));
});

function joinRoom(socket, code, room, role, ack) {
  room.members.set(socket.id, { socketId: socket.id, role, peerId: socket.data.peerId || null });
  socket.data.roomCode = code;
  socket.join(code);
  ack?.({ code, role, members: roomSnapshot(room) });
  for (const member of room.members.values()) {
    if (member.socketId !== socket.id && member.peerId) {
      io.to(socket.id).emit("peer-available", { role: member.role, peerId: member.peerId });
    }
  }
  const joinedMember = room.members.get(socket.id);
  if (joinedMember?.peerId) {
    socket.to(code).emit("peer-available", { role: joinedMember.role, peerId: joinedMember.peerId });
  }
  io.to(code).emit("room-members", roomSnapshot(room));
}

function removeFromRoom(socket) {
  const code = socket.data.roomCode;
  const room = code && rooms.get(code);
  if (!room) return;
  const member = room.members.get(socket.id);
  room.members.delete(socket.id);
  socket.leave(code);
  socket.data.roomCode = null;
  if (member?.role === "host") {
    socket.to(code).emit("room-closed");
    rooms.delete(code);
    return;
  }
  room.session = null;
  socket.to(code).emit("partner-left");
  if (room.members.size === 0) rooms.delete(code);
}

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Virtual Photobooth LDR server listening on ${port}`);
});
