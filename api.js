// Penghubung ke backend Peta Sehat v8 (dipakai semua halaman).
//   TS.mode  'asli' | 'belum' (alamat server kosong)
//   TS.panggil(aksi, data, {get})  -> data; melempar Error berkode JARINGAN | BUKAN_JSON | KONFIG | AUTH | PERAN | VALIDASI | LIMIT | GPS | LOKASI | SERVER
//   TS.kirim(aksi, data, label)    -> {status:'terkirim'|'antre'}; laporan disimpan di antrean offline bila tak ada sinyal
//   TS.sesi() / TS.masuk / TS.keluar / TS.wajibMasuk(perans)
(function () {
  const CFG = window.TITIK_SEHAT_CONFIG || {};
  const prm = new URLSearchParams(location.search);
  const simpan = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  };
  const alamatApi = () => (simpan.get('ts_api_url') || CFG.API_URL || '').trim();
  const isApk = location.hostname === 'appassets.androidplatform.net';
  const mode = alamatApi() ? 'asli' : 'belum';

  const pendengar = {};
  const on = (n, f) => { (pendengar[n] = pendengar[n] || []).push(f); };
  const emit = (n, x) => (pendengar[n] || []).forEach(f => { try { f(x); } catch (e) { console.error(e); } });
  const galat = (kode, pesan, rinci) => { const e = new Error(pesan); e.kode = kode; e.rinci = rinci || []; return e; };

  // ---------- Sesi (token di perangkat ini; tidak ada kata sandi yang disimpan) ----------
  const sesi = () => { const t = simpan.get('ts_token'); if (!t) return null; try { return { token: t, user: JSON.parse(simpan.get('ts_user')) }; } catch (e) { return null; } };
  const simpanSesi = (token, user) => { simpan.set('ts_token', token); simpan.set('ts_user', JSON.stringify(user)); };
  const halamanPeran = peran => (peran === 'puskesmas' || peran === 'admin' || peran === 'bank_sampah' ? 'panel.html' : 'app.html');
  function pergi(u) { location.replace(u); }

  const DIAG = [
    'Alamat harus berbentuk https://script.google.com/macros/s/…/exec.',
    'Di Apps Script: Terapkan > Kelola deployment > akses "Siapa saja", jalankan sebagai "Saya".',
    'Setelah mengubah kode, pilih "Versi baru" pada deployment yang SAMA.'
  ];

  async function panggil(aksi, data, opsi) {
    data = data || {}; opsi = opsi || {};
    const s = sesi();
    const q = Object.assign({ action: aksi }, data);
    if (s && !opsi.tanpaToken && !q.token) q.token = s.token;
    let j;
    {
      const url = alamatApi();
      if (!url) throw galat('KONFIG', 'Aplikasi belum dihubungkan ke server Peta Sehat.', ['Admin: isi GAS_URL di web/config.js lalu bangun ulang aplikasi.']);
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const batas = setTimeout(() => ctrl && ctrl.abort(), opsi.waktu || 30000);
      let res;
      try {
        res = opsi.get
          ? await fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + new URLSearchParams(q).toString(), { redirect: 'follow', signal: ctrl && ctrl.signal })
          : await fetch(url, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(q), signal: ctrl && ctrl.signal });
      } catch (e) {
        const luring = navigator.onLine === false;
        throw galat('JARINGAN', luring ? 'Tidak ada sinyal internet.' : 'Server tidak bisa dihubungi.', luring ? [] : DIAG);
      } finally { clearTimeout(batas); }
      const teks = await res.text();
      try { j = JSON.parse(teks); } catch (e) { throw galat('BUKAN_JSON', 'Server menjawab dengan halaman, bukan data (kode ' + res.status + ').', DIAG); }
    }
    if (!j.ok) {
      const e = galat(j.kode || 'SERVER', j.error || 'Galat server.');
      if (e.kode === 'AUTH' && s && aksi !== 'masuk' && aksi !== 'daftar') { // sesi habis atau dicabut
        simpan.set('ts_token', null); simpan.set('ts_user', null);
        if (!opsi.diam) { pergi('login.html?sesi=habis'); }
      }
      throw e;
    }
    return j.data;
  }

  async function masuk(no_hp, password, peran) {
    const d = await panggil('masuk', { no_hp: no_hp, password: password, peran: peran || '', perangkat: isApk ? 'apk' : 'web' }, { tanpaToken: true });
    simpanSesi(d.token, d.user); return d.user;
  }
  async function keluar() {
    try { if (window.PetaSehatAndroid && typeof PetaSehatAndroid.hentikanPemantau !== 'undefined') PetaSehatAndroid.hentikanPemantau(); } catch (e) { /* abaikan */ }
    try { await panggil('keluar', {}, { diam: true }); } catch (e) { /* tetap keluar */ }
    simpan.set('ts_token', null); simpan.set('ts_user', null); pergi('login.html');
  }
  // Pastikan sudah masuk dengan peran yang benar; kembalikan sesi atau arahkan ke halaman yang tepat
  function wajibMasuk(perans) {
    const s = sesi();
    if (!s) { pergi('login.html?lanjut=' + encodeURIComponent(location.pathname.split('/').pop() + location.search)); return null; }
    if (perans && perans.indexOf(s.user.peran) < 0) { pergi(halamanPeran(s.user.peran)); return null; }
    return s;
  }

  // Cadangan data terakhir untuk offline
  async function dengCache(kunci, aksi, data, opsi) {
    try { const d = await panggil(aksi, data, opsi); simpan.set('ts_c_' + kunci, JSON.stringify({ t: Date.now(), d: d })); return { data: d, luring: false }; }
    catch (e) {
      const c = simpan.get('ts_c_' + kunci);
      if (e.kode === 'JARINGAN' && c) { const o = JSON.parse(c); return { data: o.d, luring: true, waktu: o.t }; }
      throw e;
    }
  }

  // ---------- Antrean offline (IndexedDB, cadangan localStorage) ----------
  const STORE = 'antrean'; let dbJanji = null;
  function bukaDb() {
    if (dbJanji) return dbJanji;
    dbJanji = new Promise(ok => {
      try { const r = indexedDB.open('titiksehat', 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' }); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); } catch (e) { ok(null); }
    });
    return dbJanji;
  }
  const lsAntrean = () => { try { return JSON.parse(simpan.get('ts_antrean') || '[]'); } catch (e) { return []; } };
  async function antreanOp(op, nilai) {
    const db = await bukaDb();
    if (!db) { let a = lsAntrean(); if (op === 'tambah') a.push(nilai); else if (op === 'hapus') a = a.filter(x => x.id !== nilai); else return a; simpan.set('ts_antrean', JSON.stringify(a)); return a; }
    return new Promise((ok, gagal) => {
      const tx = db.transaction(STORE, op === 'semua' ? 'readonly' : 'readwrite'), st = tx.objectStore(STORE);
      const r = op === 'tambah' ? st.put(nilai) : op === 'hapus' ? st.delete(nilai) : st.getAll();
      r.onsuccess = () => ok(r.result); r.onerror = () => gagal(r.error);
    });
  }
  const antrean = () => antreanOp('semua').then(a => (a || []).sort((x, y) => x.waktu - y.waktu));
  const uuid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12));

  let sedangKirim = false;
  async function kirimAntrean() {
    if (sedangKirim || !sesi()) return;
    sedangKirim = true;
    try {
      for (const item of await antrean()) {
        try { const r = await panggil(item.aksi, item.data, { diam: true }); await antreanOp('hapus', item.id); emit('terkirim', { item: item, hasil: r }); }
        catch (e) {
          if (e.kode === 'JARINGAN' || e.kode === 'BUKAN_JSON' || e.kode === 'AUTH') { emit('tertunda', { galat: e }); break; }
          await antreanOp('hapus', item.id); emit('ditolak', { item: item, galat: e });
        }
      }
    } finally { sedangKirim = false; emit('antrean', (await antrean()).length); }
  }
  async function kirim(aksi, data, label) {
    data = Object.assign({ idKirim: uuid() }, data);
    try { return { status: 'terkirim', id: data.idKirim, hasil: await panggil(aksi, data, { waktu: 60000 }) }; }
    catch (e) {
      if (e.kode !== 'JARINGAN') throw e;
      await antreanOp('tambah', { id: data.idKirim, aksi: aksi, data: data, waktu: Date.now(), label: label || aksi, galat: e.message });
      emit('antrean', (await antrean()).length);
      return { status: 'antre', id: data.idKirim, galat: e };
    }
  }
  if (mode === 'asli') {
    window.addEventListener('online', kirimAntrean);
    setInterval(() => { antrean().then(a => { if (a.length && navigator.onLine !== false) kirimAntrean(); }); }, 30000);
    setTimeout(kirimAntrean, 2000);
  }

  // ---------- Perangkat: GPS dan foto ----------
  function gps(opsi) {
    return new Promise((ok, gagal) => {
      if (!navigator.geolocation) return gagal(galat('GPS', 'Perangkat ini tidak mendukung GPS.'));
      navigator.geolocation.getCurrentPosition(p => ok({ lat: p.coords.latitude, lng: p.coords.longitude, akurasi: Math.round(p.coords.accuracy || 0), waktu: p.timestamp || Date.now() }),
        e => gagal(galat('GPS', e && e.code === 1 ? 'Izin lokasi ditolak. Aktifkan GPS dan izinkan lokasi untuk Peta Sehat.' : 'Lokasi belum didapat. Pindah ke tempat terbuka lalu coba lagi.')),
        Object.assign({ enableHighAccuracy: true, timeout: 20000, maximumAge: 15000 }, opsi || {}));
    });
  }
  // Foto -> JPEG terkecil (maks 1280 px), tetap di bawah batas server (2 juta karakter)
  function fotoDariFile(file) {
    return new Promise((ok, gagal) => {
      if (!file || !/^image\//.test(file.type || 'image/jpeg')) return gagal(galat('VALIDASI', 'Pilih berkas foto.'));
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        let sisi = 1280, kualitas = 0.72, out = '';
        for (let i = 0; i < 5; i++) {
          const k = Math.min(1, sisi / Math.max(img.width, img.height)), c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); out = c.toDataURL('image/jpeg', kualitas);
          if (out.length < 1800000) break; sisi = Math.round(sisi * 0.75); kualitas = Math.max(0.5, kualitas - 0.06);
        }
        URL.revokeObjectURL(url); ok({ base64: out, waktu: file.lastModified || Date.now() });
      };
      img.onerror = () => { URL.revokeObjectURL(url); gagal(galat('VALIDASI', 'Foto tidak bisa dibaca. Coba foto lain.')); };
      img.src = url;
    });
  }
  const jarakM = (a, b) => { const R = 6371000, r = Math.PI / 180, dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r, h = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };

  // Akun lama tanpa email diminta melengkapi (untuk reset password). Boleh ditunda, ditanyakan lagi saat masuk berikutnya.
  async function mintaEmail() {
    const isi = await UI.dialog('<h2>Lengkapi email Anda</h2><p class="muted">Email dipakai untuk mengatur ulang password bila Anda lupa, dan bisa dipakai untuk masuk.</p><label class="fld">Email<input id="meEmail" type="email" autocomplete="email" autocapitalize="none" placeholder="nama@email.com"></label><div id="meGalat" class="galat-teks" role="alert"></div><div class="dialog-tombol"><button type="button" class="tombol garis" id="meNanti">Nanti</button><button type="button" class="tombol" id="meSimpan">Simpan</button></div>', (m, tutup) => {
      m.querySelector('#meNanti').onclick = () => tutup(null); m.querySelector('#meEmail').focus();
      m.querySelector('#meSimpan').onclick = async () => { try { await panggil('ubahProfil', { email: m.querySelector('#meEmail').value }); tutup(true); } catch (e) { m.querySelector('#meGalat').textContent = e.message; } };
    });
    if (isi) { UI.toast('Email tersimpan.', 'sukses'); const s = sesi(); if (s) { s.user.email_ada = true; simpanSesi(s.token, s.user); } }
    return !!isi;
  }

  window.TS = { mintaEmail: mintaEmail, mode: mode, CFG: CFG, simpan: simpan, alamatApi: alamatApi, panggil: panggil, kirim: kirim, kirimAntrean: kirimAntrean, antrean: antrean, on: on, dengCache: dengCache,
    sesi: sesi, simpanSesi: simpanSesi, masuk: masuk, keluar: keluar, wajibMasuk: wajibMasuk, halamanPeran: halamanPeran, pergi: pergi, isApk: isApk, prm: prm,
    gps: gps, fotoDariFile: fotoDariFile, jarakM: jarakM, pusat: CFG.PUSAT || [0.5071, 101.4478], diagnosa: DIAG };
})();
