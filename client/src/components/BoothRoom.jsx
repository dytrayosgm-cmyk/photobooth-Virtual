import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, Copy, Grid, Layers, Mic, MicOff, PhoneOff, Video, VideoOff, Zap } from "lucide-react";
import { playBeep, playShutterSound } from "../utils/sound.js";

function VideoTile({ stream, name, muted, status, videoRef, channel, isLocal }) {
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (stream) {
      videoEl.srcObject = stream;

      const attemptPlay = async () => {
        try {
          if (isLocal) {
            videoEl.muted = true;
          }
          await videoEl.play();
        } catch (err) {
          console.warn(`[VideoTile ${channel}] Play blocked by autoplay policy, muting for visual playback:`, err);
          videoEl.muted = true;
          await videoEl.play().catch(() => {});
        }
      };

      videoEl.onloadedmetadata = attemptPlay;
      attemptPlay();
    } else {
      videoEl.srcObject = null;
    }
  }, [stream, videoRef, isLocal, channel]);

  // Unmute remote video on first interaction so partner audio is heard
  useEffect(() => {
    if (isLocal) return;
    const handleInteraction = () => {
      const videoEl = videoRef.current;
      if (videoEl && videoEl.muted && !muted) {
        videoEl.muted = false;
        videoEl.play().catch(() => {});
      }
    };
    window.addEventListener("click", handleInteraction, { once: true });
    window.addEventListener("touchstart", handleInteraction, { once: true });
    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
    };
  }, [isLocal, muted, videoRef]);

  return (
    <div className="video-tile">
      {/* Viewfinder brackets */}
      <div className="bracket bracket-tl" />
      <div className="bracket bracket-tr" />
      <div className="bracket bracket-bl" />
      <div className="bracket bracket-br" />

      {/* Stream Video or Waiting Placeholder */}
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          webkit-playsinline="true"
        />
      ) : (
        <div className="video-tile-empty">
          <Camera size={36} />
          <span className="font-mono text-xs">{status}</span>
        </div>
      )}

      {/* Top HUD info */}
      <div className="tile-tag">
        <span className="rec-dot" style={{ width: 6, height: 6 }} />
        <span className="font-mono text-[10px]">{channel}</span>
        <span className="text-slate-400 font-mono text-[10px]">| {name}</span>
      </div>

      {muted && stream && (
        <span className="tile-status-icon">
          <MicOff size={13} />
        </span>
      )}

      {/* Bottom HUD */}
      <div className="absolute bottom-3 right-3 text-[10px] font-mono text-digi-amber bg-black/60 px-2 py-0.5 rounded pointer-events-none">
        {isLocal ? "LENS: LOCAL" : "LENS: REMOTE"}
      </div>
    </div>
  );
}

export default function BoothRoom({
  room,
  role,
  members,
  localStream,
  remoteStream,
  socket,
  toggleTrack,
  onLeave,
  onEditor,
  hasPhotos
}) {
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [layout, setLayout] = useState("strip");
  const [countdown, setCountdown] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [completedNotice, setCompletedNotice] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const roleNames = { host: "Kamu (Host)", guest: "Kamu (Guest)" };
  const isSolo = members.length <= 1;

  useEffect(() => {
    const handleStart = ({ sessionId, startAt, layout: sessionLayout }) => {
      setCapturing(true);
      setError("");
      setCompletedNotice(false);

      const begin = async () => {
        for (let round = 0; round < 4; round += 1) {
          const target = startAt + round * 4200;
          let lastBeepSec = null;

          while (Date.now() < target) {
            const remaining = target - Date.now();
            const sec = remaining <= 3000 ? Math.ceil(remaining / 1000) : null;
            setCountdown(sec);

            if (sec && sec !== lastBeepSec) {
              lastBeepSec = sec;
              playBeep(sec === 1 ? 1200 : 800, 0.09);
            }
            await new Promise((resolve) => setTimeout(resolve, Math.min(120, remaining)));
          }

          setCountdown(null);

          // Shutter flash & mechanical sound!
          playShutterSound();
          setFlashActive(true);
          setTimeout(() => setFlashActive(false), 140);

          const captureFrame = (vidElement, mirror = true) => {
            if (!vidElement || !vidElement.videoWidth) return null;
            const canvas = document.createElement("canvas");
            canvas.width = 640;
            canvas.height = Math.round(640 * (vidElement.videoHeight / vidElement.videoWidth));
            const context = canvas.getContext("2d");
            if (mirror) {
              context.translate(canvas.width, 0);
              context.scale(-1, 1);
            }
            context.drawImage(vidElement, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL("image/jpeg", 0.85);
          };

          const localData = captureFrame(localVideo.current, true);
          const remoteData = captureFrame(remoteVideo.current, false);

          if (!localData && !remoteData) {
            setError("Kamera belum siap. Mohon coba mulai lagi.");
            socket.emit("finish-session", sessionId);
            return;
          }

          if (localData) {
            socket.emit("photo-captured", { sessionId, round, data: localData });
          }

          window.dispatchEvent(
            new CustomEvent("photo-captured-local", {
              detail: {
                sessionId,
                round,
                role,
                localData,
                remoteData,
                partnerRole: role === "host" ? "guest" : "host",
                layout: sessionLayout
              }
            })
          );
        }

        if (role === "host") {
          setTimeout(() => socket.emit("finish-session", sessionId), 600);
        }

        // Show completed message and smoothly transition to Editor
        setCompletedNotice(true);
        setTimeout(() => {
          onEditor();
        }, 1400);
      };

      begin();
    };

    const handlePartnerPhoto = (photo) => {
      window.dispatchEvent(new CustomEvent("photo-captured-remote", { detail: photo }));
    };

    const handleFinish = () => {
      setCapturing(false);
      setCountdown(null);
    };

    const handleError = (message) => setError(message);

    socket?.on("session-start", handleStart);
    socket?.on("photo-received", handlePartnerPhoto);
    socket?.on("session-finished", handleFinish);
    socket?.on("session-error", handleError);

    return () => {
      socket?.off("session-start", handleStart);
      socket?.off("photo-received", handlePartnerPhoto);
      socket?.off("session-finished", handleFinish);
      socket?.off("session-error", handleError);
    };
  }, [socket, role, onEditor]);

  const startSession = () => {
    setError("");
    socket.emit("start-timer", layout, (result) => {
      if (result?.error) setError(result.error);
    });
  };

  const copyRoom = async () => {
    await navigator.clipboard.writeText(room);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const partnerReady = members.length === 2 && Boolean(remoteStream);
  const canStart = role === "host" && (partnerReady || isSolo) && !capturing;

  return (
    <main className="room-page">
      {/* Shutter Flash Light */}
      <div className={`flash-layer ${flashActive ? "active" : ""}`} />

      {/* Top Bar */}
      <header className="room-topbar">
        <button className="btn-secondary text-xs h-9 px-3" onClick={onLeave}>
          <ArrowLeft size={15} /> Keluar
        </button>

        <a className="wordmark" href="/">
          TWINCAM
          <span className="wordmark-badge">STUDIO</span>
        </a>

        <button className="room-code-badge" onClick={copyRoom} title="Klik untuk salin kode">
          <span className="text-xs text-slate-400">ROOM:</span>
          <span className="text-digi-amber tracking-wider">{room}</span>
          {copied ? <Check size={14} className="text-digi-green" /> : <Copy size={14} />}
        </button>
      </header>

      {/* Room Heading */}
      <section className="room-heading">
        <div className="eyebrow">
          <Zap size={13} /> {isSolo ? "SOLO TEST STUDIO" : "DUAL-LENS PRIVATE SESSION"}
        </div>
        <h1>
          Frame your <em>digital story.</em>
        </h1>
        <p>
          {isSolo
            ? "Mode Solo aktif untuk pengujian. Undang teman via kode room untuk sesi berdua."
            : "Posisikan dirimu dan pasangan di depan kamera. Shutter akan otomatis tersinkron."}
        </p>
      </section>

      {/* Video Viewfinder Stage */}
      <section className="video-stage">
        <VideoTile
          stream={localStream}
          name={roleNames[role]}
          muted={!micOn}
          status="Menyiapkan kamera..."
          videoRef={localVideo}
          channel="CAM-01"
          isLocal={true}
        />

        <div className="stage-connector">
          <span>SYNC</span>
          <i />
          <span>LINK</span>
        </div>

        <VideoTile
          stream={remoteStream}
          name={isSolo ? "Slot Tamu (Kosong)" : "Pasanganmu"}
          status={isSolo ? "Menunggu teman join..." : "Menghubungkan video..."}
          videoRef={remoteVideo}
          channel="CAM-02"
          isLocal={false}
        />

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="countdown-overlay">
            <span className="countdown-number">{countdown}</span>
            <span className="countdown-label">GET READY • POSE!</span>
          </div>
        )}

        {/* Completed Notice */}
        {completedNotice && (
          <div className="countdown-overlay">
            <span className="text-3xl font-display font-bold text-white mb-2">🎉 4 SHOTS COMPLETE!</span>
            <span className="countdown-label">MEMBUKA STUDIO KEEPSAKE...</span>
          </div>
        )}
      </section>

      {/* Audio & Video Controls */}
      <div className="booth-controls">
        <button
          className={`control-btn ${!micOn ? "btn-muted" : ""}`}
          onClick={() => setMicOn(toggleTrack("audio"))}
          aria-label="Toggle mic"
          title={micOn ? "Mute Mic" : "Unmute Mic"}
        >
          {micOn ? <Mic size={18} /> : <MicOff size={18} />}
        </button>

        <button
          className={`control-btn ${!cameraOn ? "btn-muted" : ""}`}
          onClick={() => setCameraOn(toggleTrack("video"))}
          aria-label="Toggle camera"
          title={cameraOn ? "Matikan Kamera" : "Nyalakan Kamera"}
        >
          {cameraOn ? <Video size={18} /> : <VideoOff size={18} />}
        </button>

        <button
          className="control-btn btn-leave"
          onClick={onLeave}
          aria-label="Tutup Panggilan"
          title="Keluar dari Room"
        >
          <PhoneOff size={18} />
        </button>
      </div>

      {/* Session Settings & Shutter Button */}
      <section className="session-bar">
        <div className="layout-group">
          <span>FORMAT STRIP:</span>
          <div className="layout-btn-group">
            <button
              className={`layout-toggle ${layout === "strip" ? "selected" : ""}`}
              onClick={() => setLayout("strip")}
            >
              <Layers size={14} /> 4 × 1 Vertikal
            </button>
            <button
              className={`layout-toggle ${layout === "grid" ? "selected" : ""}`}
              onClick={() => setLayout("grid")}
            >
              <Grid size={14} /> 2 × 2 Grid
            </button>
          </div>
        </div>

        <button
          className="start-session-btn"
          disabled={!canStart}
          onClick={startSession}
        >
          <Camera size={18} />
          {capturing
            ? "Pemotretan berlangsung..."
            : role !== "host"
            ? "Menunggu Host Memulai"
            : isSolo
            ? "Mulai Sesi (Solo Test)"
            : "Mulai Sesi Bersama (4 Foto)"}
        </button>
      </section>

      {error && <div className="alert-banner max-w-xl mx-auto">{error}</div>}

      {/* Quick Editor Jump */}
      {hasPhotos && (
        <div className="text-center mt-3 pb-8">
          <button className="btn-secondary text-xs h-9 px-4" onClick={onEditor}>
            Lihat & Edit Hasil Foto Terakhir →
          </button>
        </div>
      )}
    </main>
  );
}
