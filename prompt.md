Bertindaklah sebagai Senior Fullstack Web & WebRTC Engineer. Buatlah aplikasi web lengkap bernama "Virtual Photobooth LDR" (inspirasi: Momoto) yang memungkinkan 2 pengguna melakukan video call jarak jauh dan mengambil photobooth strip bersama secara real-time.

Aplikasi ini harus memiliki desain UI yang sangat estetik, minimalis ala Korea (Y2K / Soft Pastel / Clean Warm Ivory), responsive, dan siap dideploy secara gratis (Frontend di Vercel, Backend di Render).

---

### 1. TECH STACK REQUIREMENTS
- Frontend: Next.js (App Router) atau React + Vite + Tailwind CSS + Lucide Icons.
- Real-time & WebRTC: PeerJS (WebRTC audio/video) + Socket.io-client (sinkronisasi state, hitung mundur, dan shutter).
- Canvas Processing: HTML5 Canvas API (atau Fabric.js/Konva.js) untuk menggabungkan frame foto, menyusun template strip, menambahkan filter warna, stiker, dan export PNG kualitas tinggi.
- Backend: Node.js (Express + Socket.io) untuk signaling server dan room management sederhana (simpan state di memory).

---

### 2. CORE FEATURES & FLOW

1. Room & Koneksi:
   - Halaman utama memiliki opsi "Buat Room" (generate 6 karakter kode unik) dan "Gabung Room" via kode.
   - User 1 (Host) dan User 2 (Guest) terhubung via PeerJS untuk video call (2 preview webcam berdampingan).
   - Terdapat kontrol toggle kamera dan mikrofon (mute/unmute).

2. Sinkronisasi Shutter & Pemotretan Bersama:
   - Host memilih tata letak: 4x1 (Strip panjang vertikal) atau 2x2 (Grid).
   - Host menekan tombol "Mulai Sesi". Server Socket.io mengirim broadcast trigger hitung mundur (3-2-1) ke kedua client.
   - Pada detik ke-0, tangkap frame dari `<video>` lokal dan `<video>` remote secara serentak ke dalam canvas.
   - Proses diulang otomatis sebanyak 4 kali untuk menghasilkan 4 pasang foto.

3. Editor & Kustomisasi Estetik:
   - Preview photobooth strip hasil tangkapan.
   - Template Pilihan:
     * Klasik Minimalis (Putih/Hitam dengan tipografi estetik)
     * Koran / Newsprint Vintage
     * Pastel Romantic / Y2K Frame
     * Film Reel / Polaroid style
   - Filter Warna (CSS Canvas Filters): Normal, B&W (Hitam Putih kontras), Warm Vintage, Soft Sepia, Golden Hour, Pastel Fade, Noir.
   - Pilihan Stiker: Emoji estetik, glitter/sparkle, pita, hati yang bisa digeser (drag & drop).

4. Export & Download:
   - Tombol "Download Strip" yang merender canvas ke PNG resolusi tinggi (300 DPI ready) langsung di browser tanpa watermark.

---

### 3. OUTPUT YANG DIHARAPKAN DARI ANDA

1. Struktur Direktori Lengkap:
   - `/server` (Node.js Express + Socket.io)
   - `/client` (Frontend Next.js/Vite + Tailwind)

2. Kode Lengkap (Production-Ready):
   - `server.js`: Logika socket room, join-room, start-timer, sync-filter.
   - `useWebRTC.js` / Hooks: Logika peer connection, stream handling.
   - Komponen UI:
     * `Lobby.jsx` (Input room code, preview webcam)
     * `BoothRoom.jsx` (Video call split screen, countdown overlay)
     * `PhotoEditor.jsx` (Canvas rendering, filter picker, frame template selector, download action)
   - Konfigurasi Tailwind & styling estetik.

3. Langkah Deployment Gratis:
   - Cara deploy server ke Render.com (termasuk setting WebSockets).
   - Cara deploy client ke Vercel dan menghubungkan URL Socket/PeerJS server.
   - Panduan konfigurasi free STUN/TURN server publik (Google STUN) agar koneksi P2P tembus jaringan seluler/NAT.