# 🏪 OASIS (Omnichannel Access System for Integrated Stores)

**Sistem Akses Omnichannel untuk Toko Terintegrasi** — Kelola ribuan akun toko online Anda dari satu aplikasi desktop dengan isolasi sesi penuh tanpa hambatan.

Dibangun dengan [Electron.js](https://www.electronjs.org/) menggunakan teknologi `BaseWindow` dan `WebContentsView` terbaru untuk performa maksimal.

---

### 📸 Pratinjau Aplikasi

<p align="center">
  <img src="screenshots/1.png" width="800" alt="OASIS Dashboard">
</p>
<p align="center">
  <img src="screenshots/2.png" width="400" alt="Sesi Aktif Shopee">
  <img src="screenshots/3.png" width="400" alt="Dashboard Marketplace">
</p>

---

## ✨ Fitur Unggulan

### 🔐 Isolasi Sesi Sempurna

Setiap tab berjalan di lingkungan **partisi sesi yang terisolasi sepenuhnya**. Anda bisa log masuk ke Shopee di Tab 1, Tokopedia di Tab 2, dan akun Shopee lain di Tab 3 tanpa pernah bentrok. Tidak perlu lagi menggunakan banyak browser atau mode incognito.

### 💾 Sesi Persisten (Tetap Log Masuk)

Sesi log masuk Anda **tersimpan secara otomatis** dan tetap ada meskipun tab ditutup atau aplikasi dimatikan:

- Tutup tab, buka lagi nanti — **Anda masih dalam keadaan log masuk!**
- Dasbor menampilkan semua sesi tersimpan dengan kontrol **Fokus**, **Buka Kembali**, atau **Hapus**.

### 🛡️ Fitur Profesional (Alat Anti-Banned)

- **Proxy Per-Sesi (`HTTP`/`SOCKS`):** Assign IP proxy unik untuk setiap akun tertentu. Samarkan jejak digital geografis toko Anda untuk menghindari _banned_ dari platform e-commerce.
- **User-Agent Kustom:** Ubah sidik jari browser (fingerprint) untuk setiap sesi (misal: simulasi iPhone atau versi Chrome tertentu).
- **Hapus Cookie Mandiri:** Bersihkan data cache dan cookie untuk satu akun tertentu tanpa memengaruhi akun lainnya di tab sebelah.
- **Duplikat Sesi:** Gandakan tab aktif secara instan dengan token otorisasi yang sama untuk mengelola toko yang sama di banyak jendela.

### 🚀 Produktivitas Maksimal

- **Manajemen Data (Backup/Restore):** Ekspor seluruh pengaturan, sesi, proxy, dan pintasan ke dalam satu file JSON cadangan. Pindahkan data antar perangkat dengan mudah.
- **Pintasan Kustom:** Tambahkan toko atau situs favorit Anda dengan pemilihan warna ikon dan pengambilan favicon otomatis.
- **Badge Notifikasi:** Tab di sidebar secara otomatis menampilkan angka notifikasi (misal: pesanan baru) yang diambil langsung dari judul situs web secara real-time.
- **Tata Letak Dinamis:** Ubah posisi sidebar dari samping (Lama) ke atas (Modern) sesuai kenyamanan Anda.

### 🌓 Antarmuka Modern & Bahasa Indonesia

- **Bahasa Indonesia:** Seluruh UI aplikasi, menu, dan dialog telah diterjemahkan ke Bahasa Indonesia yang komunikatif.
- **Mode Gelap/Terang:** Tema yang nyaman di mata dengan penyimpanan preferensi otomatis.

---

## 🛠️ Detail Teknis (Untuk Pemilik Source Code)

### Arsitektur Proyek

- **`main.js`**: Menangani proses utama, sistem jendela, IPC, manajemen sesi, dan protokol download.
- **`preload.js`**: Bridge keamanan antara proses utama dan renderer (UI).
- **`renderer.js`**: Logika antarmuka, dasbor, manajemen tab, dan toast notifikasi.
- **`index.html`**: Struktur layout menggunakan CSS Vanilla modern (Glassmorphism & Flexbox).

### Teknologi yang Digunakan

- **Electron v40**: Framework desktop lintas platform.
- **BaseWindow + WebContentsView**: API jendela terbaru untuk kontrol tampilan yang lebih presisi.
- **Session Partitioning**: Metode isolasi data tingkat tinggi.
- **Google Favicon API**: Pengambilan otomatis ikon situs web.

---

## 🚀 Cara Menjalankan

### Prasyarat

- [Node.js](https://nodejs.org/) v18 ke atas.

### Instalasi

1. Ekstrak folder `OASIS`.
2. Buka terminal/CMD di dalam folder tersebut.
3. Jalankan perintah:
   ```bash
   npm install
   npm start
   ```

### Membangun Aplikasi (Build)

Gunakan perintah berikut untuk membuat file `.exe` atau `.dmg` siap pakai:

```bash
npm run build:mac   # Untuk macOS
npm run build:win   # Untuk Windows
npm run build:linux # Untuk Linux
```

---

## 🎨 Kustomisasi Branding

Anda dapat mengubah identitas aplikasi dengan mudah:

1. Ganti ikon di `assets/icon/icon.png` (ukuran minimal 1024x1024).
2. Ubah `productName` di `package.json`.
3. Jalankan `npm run build` kembali.

---

## 📝 Lisensi

Produk ini bersifat **PROPRIETARY (Close Source)**.
Lisensi penggunaan dan hak distribusi hanya diizinkan bagi pemilik sah kode sumber ini. Dilarang mendistribusikan ulang kode ini tanpa izin tertulis sesuai dengan ketentuan dalam [LICENSE.md](LICENSE.md).

---

© 2026 OASIS - Seluruh Hak Cipta Dilindungi.
