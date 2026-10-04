# TwinCam — Virtual Digicam Photobooth LDR

Aplikasi photobooth virtual jarak jauh (LDR) bertema **Retro Digicam 2000s / Y2K Cyber Studio**. Dilengkapi panggilan video peer-to-peer (WebRTC), sinkronisasi hitung mundur dan shutter (Socket.io), audio efek shutter mechanical & flash visual, canvas editor photostrip kustom, dan ekspor PNG resolusi tinggi langsung di browser.

---

## Fitur Utama

1. **Tema Unik Retro Digicam 2000s & Y2K Cyber**:
   - Tampilan viewfinder kamera digital (bracket sudut `⌜ ⌝`, indikator `REC ●`, tanggal oranye khas digicam `'26 10 04`, status ISO/baterai).
   - Efek flash layar putih nyata dan suara shutter kamera (disintesis via Web Audio API tanpa perlu aset eksternal).
2. **Koneksi Real-Time LDR**:
   - Pembuatan room privat 6-karakter acak.
   - P2P Video Call menggunakan WebRTC (PeerJS) dengan fallback Google STUN.
   - Fitur Mute/Unmute Mic dan Matikan/Nyalakan Kamera.
3. **Sinkronisasi Pemotretan**:
   - Pilihan tata letak: **Strip 4 × 1 (Vertikal)** atau **Grid 2 × 2**.
   - Shutter tersinkron otomatis 4 putaran dengan countdown 3-2-1.
   - Mendukung **Mode Sesi Berdua** maupun **Mode Solo Test** (memudahkan pengujian langsung tanpa perlu 2 perangkat).
4. **Studio Editor & Kustomisasi**:
   - 7 Filter Warna Digital (Normal, B&W High, Warm Gold, Vintage Sepia, Golden Hour, Cyber Fade, Obsidian Noir).
   - 4 Template Frame Unik:
     - `Digicam 2000` (Bezel abu metalik, stempel tanggal oranye, badge baterai/REC)
     - `Y2K Cyber` (Gradasi neon violet & cyan chrome)
     - `Studio Noir` (Minimalis monokrom dengan stamp barcode ala studio Korea)
     - `35mm Negative` (Rol film analog dengan lubang perforasi)
   - Input judul strip kustom (misal nama pasangan) dan tanggal/pesan pribadi.
   - Stiker Y2K interaktif yang dapat digeser (drag & drop) dan dihapus.
5. **Ekspor & Privasi**:
   - Unduh photostrip resolusi tinggi format PNG tanpa watermark.
   - 100% Client-Side Rendered: Foto diproses langsung di browser pengguna dan tidak pernah disimpan di database/server.

---

## Menjalankan Secara Lokal

### 1. Jalankan Server (Signaling & PeerJS)
```bash
cd server
npm install
npm run dev
```
Server akan berjalan di `http://localhost:3001`.

### 2. Jalankan Client (Vite + React)
Buka terminal baru:
```bash
cd client
npm install
npm run dev
```
Buka browser di `http://localhost:5173`. 
> *Catatan*: Browser memerlukan `localhost` atau HTTPS agar izin akses webcam dan mikrofon dapat diaktifkan.

---

## Panduan Deployment Gratis

### 1. Backend di Render.com (Web Service)
1. Push repository ini ke GitHub.
2. Di dashboard Render, buat **New Web Service** dan hubungkan repositori Anda.
3. Atur konfigurasi:
   - **Name**: `twincam-server` (atau nama pilihan Anda)
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Di bagian **Environment Variables**, tambahkan:
   - `CLIENT_ORIGIN`: URL frontend Vercel Anda (contoh: `https://twincam.vercel.app` atau `*` saat awal).
   - (*PORT diisi otomatis oleh Render*).
5. Klik **Deploy Web Service**.
6. Salin URL publik Render (misal: `https://twincam-server.onrender.com`). Cek endpoint kesehatan di `https://twincam-server.onrender.com/health`.

> **Catatan Render Free Tier**: Server Render mode gratis akan tertidur (spin down) setelah 15 menit tidak aktif. Saat pertama kali diakses, server memerlukan waktu ~30 detik untuk bangun (cold start).

---

### 2. Frontend di Vercel (Static / Vite)
1. Buka dashboard Vercel dan pilih **Add New Project**.
2. Impor repositori GitHub yang sama.
3. Atur konfigurasi proyek:
   - **Framework Preset**: `Vite`
   - **Root Directory**: klik edit dan pilih folder `client`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Di bagian **Environment Variables**, tambahkan:
   - `VITE_SOCKET_URL`: URL Backend Render Anda (contoh: `https://twincam-server.onrender.com`).
5. Klik **Deploy**.
6. Setelah deployment selesai, pastikan kembali variabel `CLIENT_ORIGIN` di Render mencakup domain Vercel Anda.

---

## Konfigurasi WebRTC, STUN, & TURN

- Secara default, aplikasi menyertakan Google STUN gratis (`stun:stun.l.google.com:19302` dan `stun1`).
- Pada sebagian besar jaringan WiFi rumah dan koneksi umum, STUN sudah cukup untuk menghubungkan kedua pengguna secara P2P.
- Jika pengguna berada di bawah jaringan seluler tertentu (Symmetric NAT) atau firewall kampus/kantor yang ketat, Anda dapat menambahkan TURN server kustom melalui environment variable di client:
  ```env
  VITE_ICE_SERVERS=[{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:turn.domain.com:3478","username":"user","credential":"pass"}]
  ```
  *(Anda bisa mendapatkan kuota TURN server gratis dari penyedia seperti Metered.ca atau Xirsys)*.

---

## Struktur Direktori

```
├── client/
│   ├── index.html              # HTML shell & font Digicam/Y2K
│   ├── package.json
│   ├── tailwind.config.js      # Palette warna Digicam Cyber
│   ├── vite.config.js
│   ├── .env.example            # Template environment variables
│   └── src/
│       ├── App.jsx             # State room & navigasi view
│       ├── main.jsx
│       ├── styles.css          # Desain Retro Digicam Y2K
│       ├── components/
│       │   ├── Lobby.jsx       # Viewfinder preview & room actions
│       │   ├── BoothRoom.jsx   # Dual video stage, shutter & flash
│       │   └── PhotoEditor.jsx # Canvas strip render & templates
│       ├── hooks/
│       │   └── useWebRTC.js    # PeerJS & Socket.io handler
│       └── utils/
│           └── sound.js        # Web Audio API sound generator
├── server/
│   ├── server.js               # Express, Socket.io, & PeerServer
│   ├── package.json
│   └── .env.example
├── prompt.md                   # Spesifikasi proyek
└── README.md
```
