import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, RotateCcw, Sparkles, Trash2, Type, Wand2 } from "lucide-react";

const filters = [
  ["normal", "Normal"],
  ["bw", "B&W High"],
  ["warm", "Warm Gold"],
  ["sepia", "Vintage Sepia"],
  ["golden", "Golden Hour"],
  ["pastel", "Cyber Fade"],
  ["noir", "Obsidian Noir"]
];

const templates = [
  ["digicam", "Digicam 2000"],
  ["cyber", "Y2K Cyber"],
  ["minimal", "Studio Noir"],
  ["film", "35mm Negative"]
];

const stickers = ["✨", "⭐", "🎀", "🖤", "💿", "⚡", "📸", "♡", "👾", "🛸", "🔥", "🎞️"];

const filterCss = {
  normal: "none",
  bw: "grayscale(1) contrast(1.3)",
  warm: "sepia(.3) saturate(1.25) contrast(1.05)",
  sepia: "sepia(.7) contrast(1.1)",
  golden: "sepia(.35) saturate(1.5) brightness(1.08)",
  pastel: "saturate(.8) brightness(1.1) contrast(.9) hue-rotate(15deg)",
  noir: "grayscale(1) contrast(1.8) brightness(.8)"
};

export default function PhotoEditor({ photos, socket, onBack }) {
  const canvasRef = useRef(null);
  const [filter, setFilter] = useState("normal");
  const [template, setTemplate] = useState("digicam");
  const [customTitle, setCustomTitle] = useState("TWINCAM ARCHIVE");
  const [customDate, setCustomDate] = useState(() => {
    const d = new Date();
    return `'${String(d.getFullYear()).slice(-2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  });
  const [placedStickers, setPlacedStickers] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let active = true;
    setRendered(false);

    const ctx = canvas.getContext("2d");
    const padding = template === "digicam" ? 32 : template === "film" ? 36 : 28;
    const gap = 16;
    const photoWidth = 500;
    const photoHeight = 560;
    const footerHeight = 140;

    const grid = photos.some((photo) => photo?.layout === "grid");
    const count = Math.max(photos.length, 1);
    const columns = grid ? 2 : 1;
    const rows = grid ? Math.ceil(count / 2) : count;

    canvas.width = padding * 2 + columns * photoWidth + (columns - 1) * gap;
    canvas.height = padding * 2 + rows * photoHeight + (rows - 1) * gap + footerHeight;

    // Background style based on template
    if (template === "digicam") {
      ctx.fillStyle = "#121620";
    } else if (template === "cyber") {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, "#1c142b");
      grad.addColorStop(1, "#101628");
      ctx.fillStyle = grad;
    } else if (template === "film") {
      ctx.fillStyle = "#0d0f12";
    } else {
      ctx.fillStyle = "#09090b"; // minimal noir
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle outer border
    ctx.strokeStyle = template === "cyber" ? "#f43f5e" : "#2a3449";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    const loadImage = (source) =>
      new Promise((resolve) => {
        if (!source) return resolve(null);
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = source;
      });

    const drawCover = (image, x, y, width, height) => {
      const scale = Math.max(width / image.width, height / image.height);
      const sourceWidth = width / scale;
      const sourceHeight = height / scale;
      ctx.drawImage(
        image,
        (image.width - sourceWidth) / 2,
        (image.height - sourceHeight) / 2,
        sourceWidth,
        sourceHeight,
        x,
        y,
        width,
        height
      );
    };

    Promise.all(
      photos.map(async (photo, index) => {
        const [host, guest] = await Promise.all([
          loadImage(photo?.host),
          loadImage(photo?.guest)
        ]);
        if (!active) return;

        const x = padding + (grid ? index % 2 : 0) * (photoWidth + gap);
        const y = padding + (grid ? Math.floor(index / 2) : index) * (photoHeight + gap);

        // Frame slot background
        ctx.fillStyle = "#05070a";
        ctx.fillRect(x, y, photoWidth, photoHeight);

        // Draw photos (Dual or Solo)
        ctx.save();
        ctx.filter = filterCss[filter] || "none";

        if (host && guest) {
          // Dual mode: Top half host, bottom half guest
          const panelHeight = photoHeight / 2;
          drawCover(host, x, y, photoWidth, panelHeight);
          drawCover(guest, x, y + panelHeight, photoWidth, panelHeight);

          // Divider between duo photos
          ctx.restore();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y + panelHeight);
          ctx.lineTo(x + photoWidth, y + panelHeight);
          ctx.stroke();
        } else {
          // Solo mode: Single photo occupies whole slot
          const single = host || guest;
          if (single) drawCover(single, x, y, photoWidth, photoHeight);
          ctx.restore();
        }

        // Template overlays per slot
        if (template === "digicam") {
          // Orange digital date stamp on bottom right of each photo
          ctx.fillStyle = "rgba(251, 191, 36, 0.9)";
          ctx.font = "bold 16px 'Share Tech Mono', monospace";
          ctx.textAlign = "right";
          ctx.fillText(customDate, x + photoWidth - 14, y + photoHeight - 14);

          // Little corner brackets
          ctx.strokeStyle = "rgba(255,255,255,0.4)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 8, y + 8, 12, 12);
        } else if (template === "film") {
          // 35mm film perforations
          ctx.fillStyle = "#ffffff";
          for (let hole = y + 8; hole < y + photoHeight - 10; hole += 28) {
            ctx.fillRect(x + 6, hole, 10, 16);
            ctx.fillRect(x + photoWidth - 16, hole, 10, 16);
          }
          ctx.fillStyle = "rgba(245, 158, 11, 0.8)";
          ctx.font = "12px 'Share Tech Mono', monospace";
          ctx.textAlign = "left";
          ctx.fillText(`KODAK 400 • FRAME 0${index + 1}`, x + 24, y + photoHeight - 12);
        } else if (template === "cyber") {
          // Cyber neon accent line
          ctx.strokeStyle = "#06b6d4";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x - 2, y - 2, photoWidth + 4, photoHeight + 4);
        }
      })
    ).then(() => {
      if (!active) return;

      // Footer Typography & Details
      const centerX = canvas.width / 2;
      const footerY = canvas.height - footerHeight;

      if (template === "digicam") {
        // Digicam HUD bottom bar
        ctx.textAlign = "center";
        ctx.fillStyle = "#f1f5f9";
        ctx.font = "700 24px 'Space Grotesk', sans-serif";
        ctx.fillText(customTitle.toUpperCase(), centerX, footerY + 50);

        ctx.font = "14px 'Share Tech Mono', monospace";
        ctx.fillStyle = "#f59e0b";
        ctx.fillText(`REC ● 4K 30FPS // ${customDate} // BAT 98%`, centerX, footerY + 84);

        ctx.font = "11px 'Share Tech Mono', monospace";
        ctx.fillStyle = "#64748b";
        ctx.fillText("TWINCAM DIGITAL KEEPSAKE • ZERO SERVER STORAGE", centerX, footerY + 108);
      } else if (template === "minimal") {
        // Minimalist Seoul Studio Barcode
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "800 22px 'Space Grotesk', sans-serif";
        ctx.fillText(customTitle.toUpperCase(), centerX, footerY + 45);

        // Faux Barcode
        const barY = footerY + 68;
        const barWidth = 180;
        const startBarX = centerX - barWidth / 2;
        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < 34; i++) {
          const w = (i % 3 === 0 ? 3 : i % 2 === 0 ? 1 : 2);
          ctx.fillRect(startBarX + i * 5.2, barY, w, 24);
        }

        ctx.font = "12px monospace";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(`NO. ${Math.abs(customTitle.length * 94821).toString().slice(0, 8)} • ${customDate}`, centerX, footerY + 112);
      } else if (template === "cyber") {
        // Y2K Cyber Glow
        ctx.textAlign = "center";
        ctx.fillStyle = "#f43f5e";
        ctx.font = "900 24px 'Space Grotesk', sans-serif";
        ctx.fillText(`★ ${customTitle.toUpperCase()} ★`, centerX, footerY + 48);

        ctx.font = "13px 'Share Tech Mono', monospace";
        ctx.fillStyle = "#06b6d4";
        ctx.fillText(`DIGITAL KEEPSAKE ARCHIVE // ${customDate}`, centerX, footerY + 80);

        ctx.fillStyle = "#a855f7";
        ctx.font = "11px 'Share Tech Mono', monospace";
        ctx.fillText("CYBER DUAL-LENS PHOTOBOOTH SYSTEM", centerX, footerY + 106);
      } else {
        // Vintage Film Reel
        ctx.textAlign = "center";
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "700 22px 'Space Grotesk', sans-serif";
        ctx.fillText(customTitle.toUpperCase(), centerX, footerY + 48);

        ctx.font = "13px 'Share Tech Mono', monospace";
        ctx.fillStyle = "#f59e0b";
        ctx.fillText(`35MM ISO 400 • ${customDate} • EXP. 04`, centerX, footerY + 82);
      }

      // Render draggable stickers
      placedStickers.forEach(({ sticker, x, y }) => {
        ctx.font = "40px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(sticker, x * canvas.width, y * canvas.height);
      });

      setRendered(true);
    });

    return () => {
      active = false;
    };
  }, [photos, filter, template, customTitle, customDate, placedStickers]);

  useEffect(() => {
    const onRemoteFilter = (nextFilter) => {
      if (filters.some(([id]) => id === nextFilter)) setFilter(nextFilter);
    };
    socket?.on("filter-changed", onRemoteFilter);
    return () => {
      socket?.off("filter-changed", onRemoteFilter);
    };
  }, [socket]);

  const changeFilter = (nextFilter) => {
    setFilter(nextFilter);
    socket?.emit("sync-filter", nextFilter);
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `twincam-${template}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();
  };

  const addSticker = (sticker) => {
    setPlacedStickers((items) => [...items, { sticker, x: 0.8, y: 0.85 }]);
  };

  const removeLastSticker = () => {
    setPlacedStickers((items) => items.slice(0, -1));
  };

  const moveSticker = (event) => {
    if (dragging === null || !canvasRef.current) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    setPlacedStickers((items) =>
      items.map((item, index) =>
        index === dragging
          ? {
              ...item,
              x: Math.max(0.05, Math.min(0.95, (event.clientX - bounds.left) / bounds.width)),
              y: Math.max(0.05, Math.min(0.95, (event.clientY - bounds.top) / bounds.height))
            }
          : item
      )
    );
  };

  return (
    <main className="editor-page">
      {/* Top Header */}
      <header className="room-topbar">
        <button className="btn-secondary text-xs h-9 px-3" onClick={onBack}>
          <ArrowLeft size={15} /> Kembali ke Booth
        </button>

        <a className="wordmark" href="/">
          TWINCAM
          <span className="wordmark-badge">STUDIO</span>
        </a>

        <div className="pill-rec">
          <Sparkles size={12} />
          READY TO EXPORT
        </div>
      </header>

      {/* Editor Grid */}
      <div className="editor-grid">
        {/* Left Tools Sidebar */}
        <aside className="editor-sidebar">
          {/* Tool 1: Filter */}
          <div>
            <div className="tool-section-title">
              <span>01 // DIGITAL FILTER</span>
              <Wand2 size={13} />
            </div>
            <div className="chip-grid">
              {filters.map(([id, label]) => (
                <button
                  key={id}
                  className={`chip-btn ${filter === id ? "active" : ""}`}
                  onClick={() => changeFilter(id)}
                >
                  <span className={`filter-circle filter-${id}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tool 2: Frame Template */}
          <div>
            <div className="tool-section-title">
              <span>02 // DIGICAM FRAME</span>
            </div>
            <div className="chip-grid">
              {templates.map(([id, label]) => (
                <button
                  key={id}
                  className={`chip-btn ${template === id ? "active" : ""}`}
                  onClick={() => setTemplate(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tool 3: Custom Text */}
          <div>
            <div className="tool-section-title">
              <span>03 // CUSTOM CAPTION</span>
              <Type size={13} />
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-slate-400 font-mono mb-1 block">JUDUL STRIP</label>
                <input
                  type="text"
                  maxLength={28}
                  className="text-input-field"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Misal: Dytra & Partner ♡"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono mb-1 block">TANGGAL / PESAN</label>
                <input
                  type="text"
                  maxLength={20}
                  className="text-input-field"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  placeholder="'26 10 04"
                />
              </div>
            </div>
          </div>

          {/* Tool 4: Stickers */}
          <div>
            <div className="tool-section-title">
              <span>04 // STICKERS</span>
              {placedStickers.length > 0 && (
                <button
                  onClick={removeLastSticker}
                  className="text-red-400 text-[10px] hover:underline flex items-center gap-1"
                >
                  <Trash2 size={11} /> Hapus Terakhir
                </button>
              )}
            </div>
            <div className="sticker-tray">
              {stickers.map((sticker, idx) => (
                <button
                  key={`${sticker}-${idx}`}
                  className="sticker-pill"
                  onClick={() => addSticker(sticker)}
                  title="Klik untuk pasang di strip (geser pada preview)"
                >
                  {sticker}
                </button>
              ))}
            </div>
            <small className="text-[10px] text-slate-400 mt-2 block">
              💡 Klik stiker untuk memasang, lalu geser stiker langsung pada preview.
            </small>
          </div>

          {/* Reset Action */}
          <button
            className="btn-secondary text-xs w-full justify-center text-slate-400"
            onClick={() => {
              setFilter("normal");
              setTemplate("digicam");
              setCustomTitle("TWINCAM ARCHIVE");
              setPlacedStickers([]);
              socket?.emit("sync-filter", "normal");
            }}
          >
            <RotateCcw size={13} /> Reset Semua Pengaturan
          </button>
        </aside>

        {/* Right Preview Panel */}
        <section className="canvas-container">
          <div className="w-full flex items-center justify-between mb-3 text-xs font-mono text-slate-400">
            <span>PREVIEW // HI-RES RENDER</span>
            <span className="text-digi-amber">DRAG STICKER TO REPOSITION</span>
          </div>

          <div className="canvas-scroller">
            <canvas
              ref={canvasRef}
              onPointerDown={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();
                const x = (event.clientX - bounds.left) / bounds.width;
                const y = (event.clientY - bounds.top) / bounds.height;
                const index = placedStickers.findLastIndex(
                  (item) => Math.abs(item.x - x) < 0.1 && Math.abs(item.y - y) < 0.1
                );
                if (index >= 0) setDragging(index);
              }}
              onPointerMove={moveSticker}
              onPointerUp={() => setDragging(null)}
              onPointerLeave={() => setDragging(null)}
            />
          </div>

          {/* Download Action Bar */}
          <div className="download-bar">
            <button
              className="btn-download"
              disabled={!rendered || photos.length === 0}
              onClick={download}
            >
              <Download size={18} /> Download High-Res Photostrip (PNG)
            </button>
          </div>

          <p className="text-center text-xs text-slate-500 font-mono mt-3">
            🔒 100% Client-Side Rendered • Foto langsung diunduh ke browsermu tanpa watermark
          </p>
        </section>
      </div>
    </main>
  );
}
