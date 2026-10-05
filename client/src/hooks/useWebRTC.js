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

const customPeerHost = import.meta.env.VITE_PEER_HOST;
const customPeerPort = import.meta.env.VITE_PEER_PORT ? Number(import.meta.env.VITE_PEER_PORT) : undefined;
const customPeerPath = import.meta.env.VITE_PEER_PATH || "/peer";
const customPeerSecure = import.meta.env.VITE_PEER_SECURE === "true";

let customIceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:80?transport=tcp",
      "turn:openrelay.metered.ca:443",
      "turns:openrelay.metered.ca:443?transport=tcp"
    ],
    username: "openrelayproject",
    credential: "openrelayproject"
  }
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
  const remoteStreamRef = useRef(null);
  const callRef = useRef(null);
  const peerRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    let active = true;

    const handleRemoteStream = (remote) => {
      if (!active || !remote) return;
      console.log("[WebRTC] Remote stream attached! Tracks:", remote.getTracks().map((t) => `${t.kind}:${t.readyState}:${t.enabled}`));
      remote.getTracks().forEach((track) => {
        track.enabled = true;
        track.onunmute = () => {
          console.log(`[WebRTC] Remote track unmuted: ${track.kind}`);
          if (active) {
            setRemoteStream(new MediaStream(remote.getTracks()));
          }
        };
      });
      remote.onaddtrack = () => {
        console.log("[WebRTC] Track added to remote stream");
        if (active) {
          setRemoteStream(new MediaStream(remote.getTracks()));
        }
      };
      remoteStreamRef.current = remote;
      setRemoteStream(remote);
    };

    const handleCallClose = () => {
      console.log("[WebRTC] Call closed");
      callRef.current = null;
      remoteStreamRef.current = null;
      if (active) setRemoteStream(null);
    };

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
        if (peerRef.current?.id) {
          currentSocket.emit("peer-ready", peerRef.current.id);
        }
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
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: true
          });
        }

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        // 3. Inisialisasi PeerJS
        if (PeerConstructor) {
          try {
            const peerOptions = {
              config: {
                iceServers: customIceServers
              }
            };

            // Jika ada VITE_PEER_HOST, gunakan server custom. Jika tidak, gunakan PeerJS Cloud resmi (0.peerjs.com)
            if (customPeerHost) {
              peerOptions.host = customPeerHost;
              peerOptions.port = customPeerPort || (customPeerSecure ? 443 : 80);
              peerOptions.path = customPeerPath;
              peerOptions.secure = customPeerSecure;
            }

            console.log("[WebRTC] Initializing PeerJS with options:", peerOptions);
            const currentPeer = new PeerConstructor(undefined, peerOptions);
            peerRef.current = currentPeer;

            currentPeer.on("open", (peerId) => {
              console.log("[WebRTC] Peer open with ID:", peerId);
              if (currentSocket) currentSocket.emit("peer-ready", peerId);
            });

            currentPeer.on("call", (call) => {
              console.log("[WebRTC] Incoming call received from peer");
              if (callRef.current && callRef.current !== call) {
                try { callRef.current.close(); } catch {}
              }
              callRef.current = call;
              call.answer(localStreamRef.current || stream);
              call.on("stream", handleRemoteStream);
              call.on("close", handleCallClose);
              call.on("error", (err) => {
                console.warn("[WebRTC] Inbound call error:", err);
                callRef.current = null;
              });
            });

            currentPeer.on("error", (error) => {
              console.warn("[WebRTC] PeerJS notice:", error?.type, error?.message || error);
            });

            const makeCall = (targetPeerId) => {
              if (!peerRef.current || !targetPeerId) return;
              const activeStream = localStreamRef.current || stream;
              if (!activeStream) return;
              if (callRef.current) {
                try { callRef.current.close(); } catch {}
                callRef.current = null;
              }
              console.log("[WebRTC] Calling target peer:", targetPeerId);
              const call = peerRef.current.call(targetPeerId, activeStream);
              if (!call) return;
              callRef.current = call;
              call.on("stream", handleRemoteStream);
              call.on("close", handleCallClose);
              call.on("error", (err) => {
                console.warn("[WebRTC] Outbound call error:", err);
                callRef.current = null;
              });
            };

            if (currentSocket) {
              currentSocket.on("peer-available", ({ role, peerId }) => {
                console.log("[WebRTC] Peer available:", role, peerId);
                if (!peerId) return;

                if (role === "guest") {
                  // Host calls Guest
                  setTimeout(() => {
                    if (!active) return;
                    makeCall(peerId);
                  }, 300);
                  // Retry calling if remote stream not established after 3.5s
                  setTimeout(() => {
                    if (!active) return;
                    if (!remoteStreamRef.current) {
                      console.log("[WebRTC] Host retrying call to Guest...");
                      makeCall(peerId);
                    }
                  }, 3500);
                } else if (role === "host") {
                  // Guest waits for Host call. Fallback after 3.5s if not connected:
                  setTimeout(() => {
                    if (!active) return;
                    if (!remoteStreamRef.current && !callRef.current) {
                      console.log("[WebRTC] Fallback: Host call not received yet, Guest calling Host...");
                      makeCall(peerId);
                    }
                  }, 3500);
                }
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
