import { useEffect, useRef, useState } from "react";
import PeerModule from "peerjs";
import { io } from "socket.io-client";

// Robust constructor resolution across Vite dev, ESM bundler, and CJS
const PeerConstructor =
  (typeof PeerModule === "function" ? PeerModule : null) ||
  PeerModule?.Peer ||
  PeerModule?.default ||
  (typeof window !== "undefined" && window.Peer ? window.Peer : null);

const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

let peerHost = "localhost";
try {
  peerHost = import.meta.env.VITE_PEER_HOST || (socketUrl.startsWith("http") ? new URL(socketUrl).hostname : socketUrl);
} catch {
  peerHost = "localhost";
}

const peerSecure = import.meta.env.VITE_PEER_SECURE
  ? import.meta.env.VITE_PEER_SECURE === "true"
  : socketUrl.startsWith("https://");

let customIceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" }
];
try {
  if (import.meta.env.VITE_ICE_SERVERS) {
    customIceServers = JSON.parse(import.meta.env.VITE_ICE_SERVERS);
  }
} catch {
  // fallback default
}

export function useWebRTC() {
  const [socket, setSocket] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState("idle");

  const localStreamRef = useRef(null);
  const callRef = useRef(null);
  const peerRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    let active = true;

    // 1. Inisialisasi Socket.io langsung saat mount
    let currentSocket = null;
    try {
      currentSocket = io(socketUrl, {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
        timeout: 10000
      });
      socketRef.current = currentSocket;
      setSocket(currentSocket);

      currentSocket.on("connect", () => {
        if (active) setConnectionState("ready");
      });
      currentSocket.on("disconnect", () => {
        if (active) setConnectionState("offline");
      });
      currentSocket.on("connect_error", (err) => {
        console.warn("Socket.io connect error:", err.message);
      });
    } catch (sockErr) {
      console.error("Failed to connect Socket.io:", sockErr);
    }

    // 2. Request Akses Media Kamera & Mikrofon secara aman
    const initMediaAndPeer = async () => {
      if (!navigator?.mediaDevices?.getUserMedia) {
        console.warn("Media devices API tidak didukung pada browser/konteks ini.");
        if (active) setConnectionState("media-unsupported");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: true
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        // 3. Inisialisasi PeerJS jika constructor tersedia
        if (PeerConstructor) {
          try {
            const currentPeer = new PeerConstructor(undefined, {
              host: peerHost,
              port: peerSecure ? 443 : Number(import.meta.env.VITE_PEER_PORT) || 3001,
              path: "/peer",
              secure: peerSecure,
              config: {
                iceServers: customIceServers
              }
            });

            peerRef.current = currentPeer;

            currentPeer.on("open", (peerId) => {
              if (currentSocket) currentSocket.emit("peer-ready", peerId);
            });

            currentPeer.on("call", (call) => {
              callRef.current = call;
              call.answer(stream);
              call.on("stream", (remote) => {
                if (active) setRemoteStream(remote);
              });
              call.on("close", () => {
                if (active) setRemoteStream(null);
              });
            });

            currentPeer.on("error", (error) => {
              console.warn("PeerJS notice:", error?.message || error);
            });

            if (currentSocket) {
              currentSocket.on("peer-available", ({ role, peerId }) => {
                if (!peerRef.current || !peerId || role !== "guest" || callRef.current) return;
                const call = peerRef.current.call(peerId, stream);
                if (!call) return;
                callRef.current = call;
                call.on("stream", (remote) => {
                  if (active) setRemoteStream(remote);
                });
                call.on("close", () => {
                  if (active) setRemoteStream(null);
                });
              });
            }
          } catch (peerInitErr) {
            console.error("PeerJS initialization error:", peerInitErr);
          }
        }
      } catch (mediaError) {
        console.warn("Camera access error:", mediaError.name, mediaError.message);
        if (active) {
          setConnectionState(
            mediaError.name === "NotAllowedError" || mediaError.name === "PermissionDeniedError"
              ? "permission-denied"
              : "media-error"
          );
        }
      }
    };

    initMediaAndPeer();

    return () => {
      active = false;
      callRef.current?.close();
      peerRef.current?.destroy();
      socketRef.current?.disconnect();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const toggleTrack = (kind) => {
    const track = localStream?.getTracks().find((item) => item.kind === kind);
    if (track) track.enabled = !track.enabled;
    return track?.enabled ?? false;
  };

  return { socket, localStream, remoteStream, connectionState, toggleTrack };
}
