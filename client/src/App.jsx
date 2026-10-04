import { useEffect, useState } from "react";
import Lobby from "./components/Lobby.jsx";
import BoothRoom from "./components/BoothRoom.jsx";
import PhotoEditor from "./components/PhotoEditor.jsx";
import { useWebRTC } from "./hooks/useWebRTC.js";

export default function App() {
  const { socket, localStream, remoteStream, connectionState, toggleTrack } = useWebRTC();
  const [room, setRoom] = useState(null);
  const [role, setRole] = useState(null);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState("lobby");
  const [photos, setPhotos] = useState([]);
  const cameraReady = Boolean(localStream && socket && connectionState === "ready");

  useEffect(() => {
    if (!socket) return undefined;
    const updateMembers = (next) => setMembers(next);
    const left = () => {
      setMembers((current) => current.filter((member) => member.role === role));
      setError("Pasanganmu terputus dari room.");
    };
    const closed = () => {
      setRoom(null);
      setRole(null);
      setMembers([]);
      setView("lobby");
      setError("Host telah menutup room.");
    };
    socket.on("room-members", updateMembers);
    socket.on("partner-left", left);
    socket.on("room-closed", closed);
    return () => {
      socket.off("room-members", updateMembers);
      socket.off("partner-left", left);
      socket.off("room-closed", closed);
    };
  }, [socket, role]);

  useEffect(() => {
    const addLocal = (event) => {
      const { round, data, layout: sessionLayout } = event.detail;
      setPhotos((current) => {
        const next = [...current];
        next[round] = { ...(next[round] || {}), [role]: data, layout: sessionLayout };
        return next;
      });
    };
    const addRemote = (event) => {
      const { round, data, layout: sessionLayout } = event.detail;
      setPhotos((current) => {
        const next = [...current];
        next[round] = { ...(next[round] || {}), [event.detail.role]: data, layout: sessionLayout };
        return next;
      });
    };
    window.addEventListener("photo-captured-local", addLocal);
    window.addEventListener("photo-captured-remote", addRemote);
    return () => {
      window.removeEventListener("photo-captured-local", addLocal);
      window.removeEventListener("photo-captured-remote", addRemote);
    };
  }, [role]);

  const isOnline = Boolean(socket && (connectionState === "ready" || socket?.connected));

  const makeRoom = (eventName, value) => {
    if (!socket) {
      setError("Koneksi socket belum siap. Refresh halaman.");
      return;
    }
    if (!socket.connected) {
      setError("Server belum terhubung. Pastikan backend server dijalankan di terminal dengan: cd server && npm run dev");
      return;
    }
    if (!localStream) {
      setError("Akses kamera belum aktif. Izinkan akses webcam browser Anda untuk melanjutkan.");
      return;
    }

    setBusy(true);
    setError("");

    const timeoutTimer = setTimeout(() => {
      setBusy(false);
      setError("Koneksi ke server timeout. Silakan coba lagi.");
    }, 6000);

    const onResult = (result) => {
      clearTimeout(timeoutTimer);
      setBusy(false);
      if (result?.error) return setError(result.error);
      setRoom(result.code);
      setRole(result.role);
      setMembers(result.members || []);
      setPhotos([]);
      setView("booth");
    };

    if (value !== undefined) {
      socket.emit(eventName, value, onResult);
    } else {
      socket.emit(eventName, onResult);
    }
  };

  if (view === "editor") {
    return <PhotoEditor photos={photos} socket={socket} onBack={() => setView("booth")} />;
  }

  if (view === "booth") {
    return <BoothRoom room={room} role={role} members={members} localStream={localStream} remoteStream={remoteStream} socket={socket} toggleTrack={toggleTrack} hasPhotos={photos.some(Boolean)} onLeave={() => { socket.emit("leave-room"); setRoom(null); setRole(null); setView("lobby"); }} onEditor={() => setView("editor")} />;
  }

  return (
    <Lobby
      stream={localStream}
      cameraReady={cameraReady}
      isOnline={isOnline}
      connectionState={connectionState}
      busy={busy}
      error={error}
      onCreate={() => makeRoom("create-room")}
      onJoin={(code) => makeRoom("join-room", code)}
    />
  );
}
