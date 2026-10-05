import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Columns, Download, Palette, RotateCcw, Sparkles, Trash2, Type, Users, Wand2 } from "lucide-react";

const filters = [
  ["normal", "Normal"],
  ["bw", "B&W High"],
  ["warm", "Warm Gold"],
  ["sepia", "Vintage Sepia"],
  ["golden", "Golden Hour"],
  ["pastel", "Pastel Soft"],
  ["noir", "Obsidian Noir"]
];

const templates = [
  { id: "coquette", label: "🎀 Coquette Ribbon", desc: "Pita manis & nuansa soft girlie" },
  { id: "one-fine-day", label: "✨ One Fine Day", desc: "K-Pop idol strip ala Blok M" },
  { id: "scrapbook", label: "💌 Washi Scrapbook", desc: "Selotip washi tape & cap couple" },
  { id: "search-ui", label: "🔍 Cute Browser", desc: "Window search ala Lemon8 viral" },
  { id: "digicam", label: "📸 Digicam 2000s", desc: "Kamera saku LCD & date stamp" },
  { id: "minimal", label: "🎞️ Studio Barcode", desc: "Clean Life Four Cuts Korea" }
];

const colorPalettes = [
  { id: "auto", label: "Auto", color: "transparent" },
  { id: "#ffe4e6", label: "Strawberry", color: "#ffe4e6" },
  { id: "#e0f2fe", label: "Baby Sky", color: "#e0f2fe" },
  { id: "#fef08a", label: "Buttercream", color: "#fef08a" },
  { id: "#f3e8ff", label: "Lilac", color: "#f3e8ff" },
  { id: "#dcfce7", label: "Matcha", color: "#dcfce7" },
  { id: "#ffffff", label: "Pure White", color: "#ffffff" },
  { id: "#18181b", label: "Noir Dark", color: "#18181b" }
];

const stickers = [
  "🎀", "🧸", "🌸", "🐾", "🍓", "🍰", "💌", "🍒", "💖", "🐰",
  "⭐", "✨", "🪞", "🧷", "🌷", "🧁", "🐈", "🫧", "🤍", "💐",
  "💍", "🫶", "💿", "⚡", "📸", "👾"
];

const filterCss = {
  normal: "none",
  bw: "grayscale(1) contrast(1.25)",
  warm: "sepia(.3) saturate(1.25) contrast(1.05)",
  sepia: "sepia(.65) contrast(1.1)",
  golden: "sepia(.32) saturate(1.45) brightness(1.08)",
  pastel: "saturate(.85) brightness(1.1) contrast(.92) hue-rotate(10deg)",
  noir: "grayscale(1) contrast(1.75) brightness(.82)"
};

export default function PhotoEditor({ photos, socket, onBack }) {
  const canvasRef = useRef(null);
  const [filter, setFilter] = useState("normal");
  const [template, setTemplate] = useState("coquette");
  const [customColor, setCustomColor] = useState("auto");
  const [customTitle, setCustomTitle] = useState("OUR SWEET MOMENTS");
  const [customDate, setCustomDate] = useState(() => {
    const d = new Date();
    return `'${String(d.getFullYear()).slice(-2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  });
  const [coupleArrangement, setCoupleArrangement] = useState("side-by-side");
  const [placedStickers, setPlacedStickers] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let active = true;
    setRendered(false);

    const ctx = canvas.getContext("2d");
    const isCuteTheme = ["coquette", "one-fine-day", "scrapbook", "search-ui"].includes(template);
    const padding = template === "digicam" ? 32 : isCuteTheme ? 34 : 28;
    const gap = isCuteTheme ? 20 : 16;
    const photoWidth = 500;
    const photoHeight = 560;
    const headerHeight = template === "search-ui" ? 54 : template === "one-fine-day" ? 70 : 0;
    const footerHeight = template === "scrapbook" ? 170 : 140;

    const grid = photos.some((photo) => photo?.layout === "grid");
    const count = Math.max(photos.length, 1);
    const columns = grid ? 2 : 1;
    const rows = grid ? Math.ceil(count / 2) : count;

    canvas.width = padding * 2 + columns * photoWidth + (columns - 1) * gap;
    canvas.height = padding * 2 + rows * photoHeight + (rows - 1) * gap + headerHeight + footerHeight;

    // 1. Tentukan Background Warna
    let bgFill = "#ffffff";
    if (customColor !== "auto") {
      bgFill = customColor;
    } else {
      if (template === "coquette") bgFill = "#fdf2f4"; // soft baby pink
      else if (template === "one-fine-day") bgFill = "#1e295d"; // deep navy K-Pop
      else if (template === "scrapbook") bgFill = "#faf7f2"; // vintage soft butter paper
      else if (template === "search-ui") bgFill = "#f0f4f8"; // clean pastel desktop
      else if (template === "digicam") bgFill = "#121620"; // dark titanium
      else bgFill = "#09090b"; // minimal noir
    }
    ctx.fillStyle = bgFill;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const isDarkBg = bgFill === "#18181b" || bgFill === "#121620" || bgFill === "#09090b" || bgFill === "#1e295d";

    // 2. Render Template Header Khusus
    if (template === "search-ui") {
      // Cute Browser Window Header
      const winX = padding;
      const winY = padding;
      const winW = canvas.width - padding * 2;
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.beginPath();
      ctx.roundRect(winX, winY, winW, 38, 8);
      ctx.fill();

      // Window dots
      const dots = ["#f87171", "#fbbf24", "#4ade80"];
      dots.forEach((dotColor, idx) => {
        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(winX + 18 + idx * 14, winY + 19, 4.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Search field
      const searchBoxX = winX + 75;
      const searchBoxW = winW - 90;
      ctx.fillStyle = "#f1f5f9";
      ctx.beginPath();
      ctx.roundRect(searchBoxX, winY + 7, searchBoxW, 24, 12);
      ctx.fill();

      ctx.fillStyle = "#64748b";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("🔍 google.com/search?q=my+favorite+person♡", searchBoxX + 14, winY + 23);
    } else if (template === "one-fine-day") {
      // Arched K-Pop Header
      ctx.textAlign = "center";
      ctx.fillStyle = isDarkBg ? "#f43f5e" : "#e11d48";
      ctx.font = "italic bold 32px 'Space Grotesk', sans-serif";
      ctx.fillText("★ One Fine Day ★", canvas.width / 2, padding + 40);

      ctx.font = "11px sans-serif";
      ctx.fillStyle = isDarkBg ? "#94a3b8" : "#64748b";
      ctx.fillText("MEMORIES TO CHERISH FOREVER", canvas.width / 2, padding + 58);
    } else if (template === "coquette") {
      // Coquette decorative top lace
      ctx.textAlign = "center";
      ctx.font = "18px sans-serif";
      ctx.fillText("🎀 ♡ 🎀", canvas.width / 2, padding + 10);
    }

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

    // Helper: Washi Tape Drawing
    const drawWashiTape = (tapeX, tapeY, width, height, angle, tapeColor) => {
      ctx.save();
      ctx.translate(tapeX, tapeY);
      ctx.rotate(angle);
      ctx.fillStyle = tapeColor;
      ctx.fillRect(-width / 2, -height / 2, width, height);
      // Highlights
      ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
      ctx.fillRect(-width / 2, -height / 2, width, 3);
      ctx.restore();
    };

    Promise.all(
      photos.map(async (photo, index) => {
        // Ensure both partners are always displayed in dual sessions even if one shot packet was delayed
        const fallbackGuest = photo?.guest || photos.find((p) => p?.guest)?.guest;
        const fallbackHost = photo?.host || photos.find((p) => p?.host)?.host;
        const [host, guest] = await Promise.all([
          loadImage(fallbackHost),
          loadImage(fallbackGuest)
        ]);
        if (!active) return;

        const x = padding + (grid ? index % 2 : 0) * (photoWidth + gap);
        const y = padding + headerHeight + (grid ? Math.floor(index / 2) : index) * (photoHeight + gap);

        // Frame slot border/background
        ctx.fillStyle = "#ffffff";
        if (template === "search-ui") {
          // Alternating colorful borders ala Lemon8
          const frameBorders = ["#f87171", "#60a5fa", "#facc15", "#34d399"];
          ctx.strokeStyle = frameBorders[index % frameBorders.length];
          ctx.lineWidth = 6;
          ctx.strokeRect(x - 3, y - 3, photoWidth + 6, photoHeight + 6);
        } else if (template === "coquette") {
          // Soft dashed cute border
          ctx.strokeStyle = "rgba(244, 63, 94, 0.4)";
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(x - 5, y - 5, photoWidth + 10, photoHeight + 10);
          ctx.setLineDash([]);
        } else if (template === "scrapbook") {
          // Soft polaroid white border shadow
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x - 6, y - 6, photoWidth + 12, photoHeight + 12);
        }

        // Draw photos (Dual or Solo)
        ctx.save();
        ctx.filter = filterCss[filter] || "none";

        if (host && guest) {
          if (coupleArrangement === "side-by-side") {
            const halfW = Math.floor(photoWidth / 2) - 2;
            drawCover(host, x, y, halfW, photoHeight);
            drawCover(guest, x + halfW + 4, y, halfW, photoHeight);

            ctx.restore();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x + halfW + 2, y);
            ctx.lineTo(x + halfW + 2, y + photoHeight);
            ctx.stroke();
          } else {
            const panelHeight = Math.floor(photoHeight / 2) - 2;
            drawCover(host, x, y, photoWidth, panelHeight);
            drawCover(guest, x + panelHeight + 4, photoWidth, panelHeight);

            ctx.restore();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, y + panelHeight + 2);
            ctx.lineTo(x + photoWidth, y + panelHeight + 2);
            ctx.stroke();
          }
        } else {
          const single = host || guest;
          if (single) drawCover(single, x, y, photoWidth, photoHeight);
          ctx.restore();
        }

        // Template Slot Ornaments
        if (template === "scrapbook") {
          // Real Masking / Washi Tape on corners!
          const tapeColors = [
            "rgba(251, 146, 60, 0.75)",
            "rgba(244, 114, 182, 0.75)",
            "rgba(56, 189, 248, 0.75)",
            "rgba(163, 230, 53, 0.75)"
          ];
          const tapeCol = tapeColors[index % tapeColors.length];
          drawWashiTape(x + 22, y + 6, 54, 18, -0.15, tapeCol);
          drawWashiTape(x + photoWidth - 22, y + 6, 54, 18, 0.15, tapeCol);
        } else if (template === "coquette") {
          // Cute little ribbon bows on photo corners
          ctx.font = "22px sans-serif";
          ctx.fillText("🎀", x + 12, y + 22);
          ctx.fillText("♡", x + photoWidth - 22, y + 22);
        } else if (template === "digicam") {
          // Orange digital date stamp on bottom right of each photo
          ctx.fillStyle = "rgba(251, 191, 36, 0.95)";
          ctx.font = "bold 16px 'Share Tech Mono', monospace";
          ctx.textAlign = "right";
          ctx.fillText(customDate, x + photoWidth - 14, y + photoHeight - 14);

          ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 8, y + 8, 12, 12);
        }
      })
    ).then(() => {
      if (!active) return;

      const centerX = canvas.width / 2;
      const footerY = canvas.height - footerHeight;

      // 3. Render Footer Berdasarkan Template
      if (template === "scrapbook") {
        // Couple Monogram Wreath Badge (seperti di referensi foto!)
        const badgeY = footerY + 68;
        const radius = 48;

        // Outer circular rings
        ctx.strokeStyle = "#854d0e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, badgeY, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(centerX, badgeY, radius - 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Monogram text
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#713f12";
        ctx.font = "bold 15px 'Space Grotesk', cursive, sans-serif";
        ctx.fillText(customTitle, centerX, badgeY - 8);

        ctx.font = "12px 'Share Tech Mono', monospace";
        ctx.fillText(customDate, centerX, badgeY + 12);

        ctx.font = "11px sans-serif";
        ctx.fillStyle = "#a16207";
        ctx.fillText("✿ MEMORIES OF US ✿", centerX, footerY + 140);
      } else if (template === "coquette") {
        // Coquette Ribbon Sweet Footer
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#e11d48";
        ctx.font = "bold 26px 'Space Grotesk', sans-serif";
        ctx.fillText(`♡ ${customTitle.toUpperCase()} ♡`, centerX, footerY + 54);

        ctx.font = "14px 'Share Tech Mono', monospace";
        ctx.fillStyle = "#fb7185";
        ctx.fillText(`🎀 ${customDate} • FOREVER & ALWAYS 🎀`, centerX, footerY + 88);

        ctx.font = "11px sans-serif";
        ctx.fillStyle = "#f43f5e";
        ctx.fillText("KEEP SWEET MEMORIES ALIVE", centerX, footerY + 114);
      } else if (template === "one-fine-day") {
        // One Fine Day Mascot Footer
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = isDarkBg ? "#ffffff" : "#1e293b";
        ctx.font = "800 24px 'Space Grotesk', sans-serif";
        ctx.fillText(customTitle.toUpperCase(), centerX, footerY + 48);

        ctx.font = "13px 'Share Tech Mono', monospace";
        ctx.fillStyle = isDarkBg ? "#f43f5e" : "#e11d48";
        ctx.fillText(`DATE: ${customDate} • SHOT 04/04`, centerX, footerY + 80);

        ctx.font = "20px sans-serif";
        ctx.fillText("🐾 (˶ᵔ ᵕ ᵔ˶) 🐾", centerX, footerY + 115);
      } else if (template === "search-ui") {
        // Cute Browser Footer
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#334155";
        ctx.font = "700 22px 'Space Grotesk', sans-serif";
        ctx.fillText(`★ ${customTitle.toUpperCase()} ★`, centerX, footerY + 52);

        ctx.font = "13px 'Share Tech Mono', monospace";
        ctx.fillStyle = "#64748b";
        ctx.fillText(`URL: /archive/${customDate} // KEEP SAFE`, centerX, footerY + 84);
      } else if (template === "digicam") {
        // Digicam 2000s Footer
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#f1f5f9";
        ctx.font = "700 24px 'Space Grotesk', sans-serif";
        ctx.fillText(customTitle.toUpperCase(), centerX, footerY + 50);

        ctx.font = "14px 'Share Tech Mono', monospace";
        ctx.fillStyle = "#f59e0b";
        ctx.fillText(`REC ● 4K 30FPS // ${customDate} // BAT 98%`, centerX, footerY + 84);

        ctx.font = "11px 'Share Tech Mono', monospace";
        ctx.fillStyle = "#64748b";
        ctx.fillText("TWINCAM DIGITAL KEEPSAKE • ZERO SERVER STORAGE", centerX, footerY + 108);
      } else {
        // Minimal Studio Barcode
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = isDarkBg ? "#ffffff" : "#09090b";
        ctx.font = "800 22px 'Space Grotesk', sans-serif";
        ctx.fillText(customTitle.toUpperCase(), centerX, footerY + 45);

        const barY = footerY + 68;
        const barWidth = 180;
        const startBarX = centerX - barWidth / 2;
        ctx.fillStyle = isDarkBg ? "#ffffff" : "#09090b";
        for (let i = 0; i < 34; i++) {
          const w = i % 3 === 0 ? 3 : i % 2 === 0 ? 1 : 2;
          ctx.fillRect(startBarX + i * 5.2, barY, w, 24);
        }

        ctx.font = "12px monospace";
        ctx.fillStyle = "#64748b";
        ctx.fillText(`NO. ${Math.abs(customTitle.length * 94821).toString().slice(0, 8)} • ${customDate}`, centerX, footerY + 112);
      }

      // 4. Render Draggable Stickers
      placedStickers.forEach(({ sticker, x, y }) => {
        ctx.font = "42px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(sticker, x * canvas.width, y * canvas.height);
      });

      setRendered(true);
    });

    return () => {
      active = false;
    };
  }, [photos, filter, template, customColor, customTitle, customDate, placedStickers, coupleArrangement]);

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
    link.download = `photostrip-${template}-${Date.now()}.png`;
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
              x: Math.max(0.04, Math.min(0.96, (event.clientX - bounds.left) / bounds.width)),
              y: Math.max(0.04, Math.min(0.96, (event.clientY - bounds.top) / bounds.height))
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
          {/* Tool 1: Template Pilihan Lucu & Unik */}
          <div>
            <div className="tool-section-title">
              <span>01 // TEMPLATE STRIP</span>
              <Sparkles size={13} className="text-digi-pink" />
            </div>
            <div className="grid grid-cols-1 gap-2">
              {templates.map(({ id, label, desc }) => (
                <button
                  key={id}
                  className={`p-2.5 rounded-lg border text-left flex flex-col transition-all ${
                    template === id
                      ? "border-digi-pink bg-pink-500/10 text-white"
                      : "border-digi-border bg-digi-card text-slate-300 hover:border-slate-600"
                  }`}
                  onClick={() => setTemplate(id)}
                >
                  <span className="font-semibold text-xs flex items-center justify-between">
                    {label}
                    {template === id && <Check size={13} className="text-digi-pink" />}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tool 2: Posisi Berdua (Couple Arrangement) */}
          <div>
            <div className="tool-section-title">
              <span>02 // TATA LETAK BERDUA</span>
              <Columns size={13} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`chip-btn justify-center h-10 text-xs font-mono transition-all ${
                  coupleArrangement === "side-by-side" ? "active ring-1 ring-digi-pink text-white font-bold" : ""
                }`}
                onClick={() => setCoupleArrangement("side-by-side")}
                title="Host dan Pasangan tampil berdampingan (kiri dan kanan)"
              >
                👥 Berdampingan
              </button>
              <button
                className={`chip-btn justify-center h-10 text-xs font-mono transition-all ${
                  coupleArrangement === "stacked" ? "active ring-1 ring-digi-pink text-white font-bold" : ""
                }`}
                onClick={() => setCoupleArrangement("stacked")}
                title="Host di atas, Pasangan di bawah (split vertikal)"
              >
                ↕ Atas - Bawah
              </button>
            </div>
          </div>

          {/* Tool 3: Color Palette Picker */}
          <div>
            <div className="tool-section-title">
              <span>03 // WARNA FRAME</span>
              <Palette size={13} />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {colorPalettes.map(({ id, label, color }) => (
                <button
                  key={id}
                  className={`h-9 rounded-md border flex items-center justify-center text-[10px] font-mono transition-all ${
                    customColor === id
                      ? "ring-2 ring-digi-pink border-white text-white font-bold"
                      : "border-digi-border text-slate-300 hover:border-slate-500"
                  }`}
                  style={{ backgroundColor: color === "transparent" ? "#242938" : color }}
                  onClick={() => setCustomColor(id)}
                  title={label}
                >
                  <span
                    className={
                      color === "#ffffff" || color === "#ffe4e6" || color === "#fef08a" || color === "#dcfce7" || color === "#f3e8ff" || color === "#e0f2fe"
                        ? "text-slate-900"
                        : "text-white"
                    }
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tool 4: Filter */}
          <div>
            <div className="tool-section-title">
              <span>04 // FILTER FOTO</span>
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

          {/* Tool 5: Custom Text & Date */}
          <div>
            <div className="tool-section-title">
              <span>05 // CAPTION & NAMA</span>
              <Type size={13} />
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-slate-400 font-mono mb-1 block">JUDUL STRIP / NAMA COUPLE</label>
                <input
                  type="text"
                  maxLength={30}
                  className="text-input-field"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Misal: Dytra & Sarah ♡"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono mb-1 block">TANGGAL / PESAN</label>
                <input
                  type="text"
                  maxLength={24}
                  className="text-input-field"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  placeholder="04.10.2026"
                />
              </div>
            </div>
          </div>

          {/* Tool 6: Cute Stickers */}
          <div>
            <div className="tool-section-title">
              <span>06 // STIKER GEMES</span>
              {placedStickers.length > 0 && (
                <button
                  onClick={removeLastSticker}
                  className="text-red-400 text-[10px] hover:underline flex items-center gap-1"
                >
                  <Trash2 size={11} /> Hapus Terakhir
                </button>
              )}
            </div>
            <div className="sticker-tray max-h-36 overflow-y-auto p-1 bg-digi-card/60 rounded-lg border border-digi-border">
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
              💡 Klik stiker di atas, lalu <b>seret/geser langsung</b> di atas gambar preview untuk mengatur posisinya!
            </small>
          </div>

          {/* Reset Action */}
          <button
            className="btn-secondary text-xs w-full justify-center text-slate-400"
            onClick={() => {
              setFilter("normal");
              setTemplate("coquette");
              setCustomColor("auto");
              setCustomTitle("OUR SWEET MOMENTS");
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
            <span className="flex items-center gap-1.5">
              <span className="rec-dot" style={{ width: 6, height: 6 }} /> PREVIEW // HI-RES RENDER
            </span>
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
              <Download size={18} /> Download Strip Lucu (PNG Kualitas Tinggi)
            </button>
          </div>

          <p className="text-center text-xs text-slate-500 font-mono mt-3">
            🔒 100% Client-Side Rendered • Siap cetak / upload ke Instagram Story tanpa watermark
          </p>
        </section>
      </div>
    </main>
  );
}
