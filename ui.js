// Komponen antarmuka bersama (tanpa alert/confirm/prompt bawaan browser):
//   UI.toast(teks, jenis)              pesan singkat di bawah layar ('info' | 'sukses' | 'galat')
//   UI.banner(el, teks, jenis, aksi)   kotak pesan di dalam halaman, aksi = {label, fn}
//   UI.konfirmasi(judul, isi, opsi)    -> Promise<boolean>, opsi {ya, tidak, bahaya}
//   UI.tanya(judul, label, opsi)       -> Promise<string|null> (pengganti prompt), opsi {nilai, placeholder, multiline}
//   UI.salin(teks)                     salin ke papan klip, atau tampilkan kotak untuk disalin manual
//   UI.esc(teks)                       escape HTML untuk semua data dari server
//   UI.tema.pasang()                   mode gelap: ikut sistem, bisa diganti manual (tersimpan di HP)
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function toast(teks, jenis) {
    const el = document.createElement('div');
    el.className = 'toast' + (jenis ? ' toast-' + jenis : '');
    el.setAttribute('role', jenis === 'galat' ? 'alert' : 'status');
    el.textContent = teks;
    document.querySelectorAll('.toast').forEach(t => t.remove());
    document.body.appendChild(el);
    if (jenis === 'galat' && window.Suara) { Suara.main('error'); Suara.haptic('dua'); }
    setTimeout(() => el.remove(), jenis === 'galat' ? 6000 : 4000);
  }

  function banner(el, teks, jenis, aksi) {
    if (!el) return;
    if (!teks) { el.hidden = true; el.innerHTML = ''; return; }
    el.className = 'banner-ui banner-' + (jenis || 'info');
    el.setAttribute('role', jenis === 'galat' ? 'alert' : 'status');
    el.innerHTML = '<span>' + esc(teks) + '</span>' + (aksi ? '<button type="button" class="tombol kecil">' + esc(aksi.label) + '</button>' : '');
    if (aksi) el.querySelector('button').onclick = aksi.fn;
    el.hidden = false;
  }

  function dialog(isiHtml, siap) {
    return new Promise(selesai => {
      const lama = document.activeElement;
      const m = document.createElement('div');
      m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
      m.innerHTML = '<div class="isi-modal dialog-ui">' + isiHtml + '</div>';
      document.body.appendChild(m);
      const tutup = v => { m.remove(); document.removeEventListener('keydown', tombol); if (lama && lama.focus) lama.focus(); selesai(v); };
      const tombol = e => { if (e.key === 'Escape') tutup(null); };
      document.addEventListener('keydown', tombol);
      m.addEventListener('click', e => { if (e.target === m) tutup(null); });
      siap(m, tutup);
    });
  }

  function konfirmasi(judul, isi, opsi) {
    opsi = opsi || {};
    return dialog('<h2>' + esc(judul) + '</h2>' + (isi ? '<p class="muted">' + esc(isi) + '</p>' : '') +
      '<div class="dialog-tombol"><button type="button" class="tombol garis" data-v="0">' + esc(opsi.tidak || 'Batal') + '</button>' +
      '<button type="button" class="tombol' + (opsi.bahaya ? ' merah' : '') + '" data-v="1">' + esc(opsi.ya || 'Ya') + '</button></div>', (m, tutup) => {
      m.querySelectorAll('[data-v]').forEach(b => { b.onclick = () => tutup(b.dataset.v === '1'); });
      m.querySelector('[data-v="1"]').focus();
    }).then(v => v === true);
  }

  function tanya(judul, label, opsi) {
    opsi = opsi || {};
    const isian = opsi.multiline
      ? '<textarea id="uiTanya" rows="3" maxlength="300" placeholder="' + esc(opsi.placeholder || '') + '">' + esc(opsi.nilai || '') + '</textarea>'
      : '<input id="uiTanya" value="' + esc(opsi.nilai || '') + '" placeholder="' + esc(opsi.placeholder || '') + '">';
    return dialog('<h2>' + esc(judul) + '</h2><label class="fld">' + esc(label) + isian + '</label>' +
      '<div class="dialog-tombol"><button type="button" class="tombol garis" data-v="0">' + esc(opsi.tidak || 'Batal') + '</button>' +
      '<button type="button" class="tombol" data-v="1">' + esc(opsi.ya || 'Simpan') + '</button></div>', (m, tutup) => {
      const inp = m.querySelector('#uiTanya');
      m.querySelector('[data-v="0"]').onclick = () => tutup(null);
      m.querySelector('[data-v="1"]').onclick = () => tutup(inp.value);
      inp.focus(); if (inp.select) inp.select();
    }).then(v => (v === null ? null : String(v)));
  }

  function salin(teks) {
    const manual = () => dialog('<h2>Salin tautan</h2><p class="muted">Tekan lama lalu pilih Salin.</p><input readonly value="' + esc(teks) + '">' +
      '<div class="dialog-tombol"><button type="button" class="tombol" data-v="1">Tutup</button></div>', (m, tutup) => {
      const i = m.querySelector('input'); i.focus(); i.select(); m.querySelector('[data-v]').onclick = () => tutup(true);
    });
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(teks).then(() => toast('Tautan disalin.', 'sukses'), manual);
    else manual();
  }

  // Mode gelap: data-theme di <html>. Tanpa pilihan manual -> ikut prefers-color-scheme (lewat CSS).
  const tema = {
    kunci: 'ts_tema',
    baca() { try { return localStorage.getItem(this.kunci) || ''; } catch (e) { return ''; } },
    aktif() { const t = this.baca(); return t || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); },
    pasang() { const t = this.baca(); if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); },
    ganti() { const baru = this.aktif() === 'dark' ? 'light' : 'dark'; try { localStorage.setItem(this.kunci, baru); } catch (e) {} this.pasang(); return baru; }
  };
  tema.pasang();

  // Header: menjadi kaca setelah digulir 8px; ikon menu ⋮ (menggantikan bilah judul Android) bila berjalan di APK.
  document.addEventListener('DOMContentLoaded', () => {
    const bar = document.querySelector('.bar'); if (!bar) return;
    const cek = () => bar.classList.toggle('gulir', (window.scrollY || document.documentElement.scrollTop) > 8);
    window.addEventListener('scroll', cek, { passive: true }); cek();
    const aksi = bar.querySelector('.aksi');
    if (aksi && window.PetaSehatAndroid && window.PetaSehatAndroid.menu) { const b = document.createElement('button'); b.className = 'ikon-tombol menu'; b.setAttribute('aria-label', 'Menu'); b.textContent = '⋮'; b.onclick = () => window.PetaSehatAndroid.menu(); aksi.appendChild(b); }
  });
  window.UI = { toast: toast, banner: banner, konfirmasi: konfirmasi, tanya: tanya, salin: salin, esc: esc, tema: tema, dialog: dialog };
})();
