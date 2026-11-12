// ======================================================================
// KONFIGURASI PETA SEHAT: satu-satunya tempat mengatur alamat server.
// Tidak ada rahasia di berkas ini (token Telegram, MAP_KEY, dst. hanya di Properti skrip Apps Script).
// ======================================================================
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxgoxGpe8syQhXZ1PCLx6E2jzQO9LcTaeFoNzZzMlHM1pGURMrJUDfjn-PzTt5XxSFOOw/exec'; // URL aplikasi web Apps Script (berakhiran /exec), diisi setelah deploy

window.TITIK_SEHAT_CONFIG = {
  API_URL: /^https:\/\//.test(GAS_URL) ? GAS_URL : '',
  // Alamat publik folder web/ (GitHub Pages), dipakai untuk tautan unduhan dan tautan masuk ke aplikasi. Contoh: 'https://nama.github.io/titik-sehat/'
  APP_URL: '',
  // Alamat berkas APK (GitHub Releases). Dipakai halaman Unduh.
  APK_URL: '',
  PUSAT: [0.5071, 101.4478],
  // Interval pembaruan otomatis peta (detik). Ini polling, BUKAN real-time.
  POLLING_DETIK: 60,
  // Selang pemeriksaan notifikasi oleh layanan latar belakang APK (detik, minimal 30). Naikkan bila kuota Apps Script terasa penuh.
  PANTAU_DETIK: { kader: 60, warga: 180, petugas: 180 }
};
