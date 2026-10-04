import { useState } from "react";
import { ArrowRight, Camera, Disc, Radio, Sparkles, Video, Zap } from "lucide-react";

export default function Lobby({
  stream,
  cameraReady,
  isOnline,
  connectionState,
  onCreate,
  onJoin,
  error,
  busy
}) {
  const [code, setCode] = useState("");
  const today = new Date();
  const dateFormatted = `'${String(today.getFullYear()).slice(-2)} ${String(today.getMonth() + 1).padStart(2, "0")} ${String(today.getDate()).padStart(2, "0")}`;

  return (
    <main className="lobby">
      {/* Top Navigation */}
      <nav className="topbar">
        <a className="wordmark" href="/">
          TWINCAM
          <span className="wordmark-badge">DIGI-01</span>
        </a>
        <div className="topbar-meta">
          <div className="pill-rec">
            <span className="rec-dot" />
            REC ● LIVE
          </div>
          <div
            className={`pill-status ${
              isOnline
                ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
                : "text-rose-400 border-rose-500/40 bg-rose-500/10"
            }`}
          >
            <span>{isOnline ? "● SERVER: ONLINE" : "○ SERVER: OFFLINE (PORT 3001)"}</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <Sparkles size={14} /> DUAL-LENS LDR PHOTOBOOTH
          </div>
          <h1>
            Capture the grid,<br />
            closer than <em>ever.</em>
          </h1>
          <p className="hero-description">
            Nostalgic digital cam photobooth for two hearts across distance.
            Pose together via real-time video, sync the shutter, and create your 2000s digicam keepsake strip.
          </p>

          <div className="lobby-actions">
            <div className="action-row">
              <button
                className="btn-primary"
                disabled={busy}
                onClick={onCreate}
                title={
                  !isOnline
                    ? "Server backend offline. Jalankan: cd server && npm run dev"
                    : "Klik untuk membuat room"
                }
              >
                <Zap size={16} /> {busy ? "Memproses..." : "Buat Room Baru"}{" "}
                <ArrowRight size={16} />
              </button>

              <div className="join-box">
                <input
                  value={code}
                  maxLength={6}
                  onChange={(event) =>
                    setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                  }
                  placeholder="KODE ROOM"
                  aria-label="Kode room"
                />
                <button
                  disabled={busy || code.length !== 6}
                  onClick={() => onJoin(code)}
                  aria-label="Gabung room"
                  title="Gabung ke room"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {error && <div className="alert-banner">{error}</div>}

            {!isOnline && (
              <div
                className="alert-banner"
                style={{
                  borderColor: "#f43f5e",
                  color: "#fda4af",
                  background: "rgba(244, 63, 94, 0.12)"
                }}
              >
                🔴 <b>Backend Server Belum Aktif</b>: Buka terminal baru lalu jalankan{" "}
                <code>cd server && npm run dev</code> agar bisa membuat room dan melakukan panggilan.
              </div>
            )}

            {!stream && (
              <p className="text-xs text-digi-amber font-mono mt-1">
                ⚠ Webcam belum aktif. Izinkan akses kamera browser Anda untuk mulai.
              </p>
            )}
          </div>

          <div className="feature-bar">
            <span><Video size={14} /> P2P Private Stream</span>
            <i />
            <span><Camera size={14} /> 4 Digital Shots</span>
            <i />
            <span><Disc size={14} /> High-Res PNG Keepsake</span>
          </div>
        </div>

        {/* Digicam Viewfinder Visual */}
        <div className="hero-visual">
          <div className="viewfinder-card">
            <div className="viewfinder-screen">
              {/* Camera Brackets */}
              <div className="bracket bracket-tl" />
              <div className="bracket bracket-tr" />
              <div className="bracket bracket-bl" />
              <div className="bracket bracket-br" />
              <div className="crosshair" />

              {/* Top LCD Status */}
              <div className="lcd-bar-top">
                <span className="hud-tag">
                  <span className="rec-dot" style={{ width: 6, height: 6 }} /> REC
                </span>
                <span>RAW [4:3]</span>
                <span>BAT 98% [||||]</span>
              </div>

              {/* Live Webcam Stream or Placeholder */}
              {stream ? (
                <video
                  ref={(element) => {
                    if (element && element.srcObject !== stream) {
                      element.srcObject = stream;
                      element.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                />
              ) : (
                <div className="viewfinder-placeholder">
                  <Camera size={38} />
                  <span className="font-mono text-xs">CAMERA OFFLINE</span>
                </div>
              )}

              {/* Bottom LCD Status */}
              <div className="lcd-bar-bottom">
                <span className="date-stamp">{dateFormatted}</span>
                <span className="hud-tag">ISO 400 • F2.8</span>
                <span>04 SHOTS</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="h-16 border-t border-digi-border flex items-center justify-between text-xs text-slate-500 font-mono">
        <span>TWINCAM 2000 // DIGITAL ARCHIVE</span>
        <span>NO SERVER STORAGE • 100% PRIVATE & LOCAL</span>
        <span>REV 2.0</span>
      </footer>
    </main>
  );
}
