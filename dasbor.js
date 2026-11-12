// Dasbor berjenjang Peta Sehat: Indonesia (nasional) > Provinsi > Kota/Kabupaten > Kecamatan > Kelurahan/Desa.
// Semua angka berasal dari laporan dan setoran yang dimasukkan lewat aplikasi (otomatis dijumlahkan ke wilayah dan semua induknya). Publik: hanya agregat.
(function () {
  const esc = UI.esc, $ = id => document.getElementById(id), v = $('v');
  const NAMA_TINGKAT = { negara: 'Nasional', provinsi: 'Provinsi', kota: 'Kota/Kabupaten', kecamatan: 'Kecamatan', kelurahan: 'Kelurahan/Desa' };
  const ANAK = { negara: 'Provinsi', provinsi: 'Kota/Kabupaten', kota: 'Kecamatan', kecamatan: 'Kelurahan/Desa', kelurahan: '' };
  const IKON = { negara: '🌏', provinsi: '🏛️', kota: '🏙️', kecamatan: '🏘️', kelurahan: '📍' };
  const JENIS = { genangan: '💧 Genangan air', sampah: '🗑️ Sampah', asap: '🔥 Asap', sanitasi: '🚽 Sanitasi' };
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'], dua = n => ('0' + n).slice(-2);
  const tgl = ms => { const d = new Date(ms); return d.getDate() + ' ' + BULAN[d.getMonth()]; }, jam = ms => tgl(ms) + ' ' + new Date(ms).getFullYear() + ' ' + dua(new Date(ms).getHours()) + '.' + dua(new Date(ms).getMinutes());
  const angka = n => (n == null ? '<3' : Number(n).toLocaleString('id-ID')), css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  let grafik = [], st = { id: TS.prm.get('w') || '', hari: Number(TS.prm.get('hari')) || 90 }, data = null;
  $('bTema').onclick = () => { UI.tema.ganti(); if (data) gambarGrafik(); };

  const kpi = (ik, a, b, ket) => '<div class="kartu" style="margin:0"><small>' + ik + ' ' + esc(a) + '</small><div class="angka-besar">' + b + '</div>' + (ket ? '<small class="muted">' + ket + '</small>' : '') + '</div>';
  function tampil(d) {
    data = d; const r = d.ringkasan, tk = d.tingkat, adaAnak = d.anak.length > 0, persen = r.total ? Math.round(r.selesai / r.total * 100) : null;
    const jejak = ['<a href="#" data-w="">' + IKON.negara + ' Indonesia</a>'].concat(d.jejak.map(j => '<a href="#" data-w="' + esc(j.id) + '">' + esc(j.nama) + '</a>')).join(' <span class="muted">›</span> ');
    v.innerHTML = '<div class="kartu"><div class="baris antara bungkus"><div><div class="muted kecil" id="jejak" style="line-height:26px">' + jejak + '</div><h1 style="margin:2px 0 0">' + IKON[tk] + ' ' + esc(d.nama) + '</h1><span class="pill biru">' + esc(NAMA_TINGKAT[tk] || tk) + '</span></div>' +
      '<label class="fld" style="margin:0">Periode<select id="hari" class="in" style="width:auto"><option value="30">30 hari</option><option value="90">90 hari</option><option value="365">1 tahun</option><option value="0">Semua waktu</option></select></label></div>' +
      '<p class="muted kecil" style="margin:8px 0 0">Diperbarui ' + jam(d.dibuat) + '. Data dari laporan dan setoran yang dimasukkan lewat aplikasi Peta Sehat, dijumlahkan ke kelurahan, kota/kabupaten, provinsi, dan nasional.</p></div>' +
      '<div class="kartu" id="pemilih"><h2 style="margin:0 0 6px">📍 Pilih wilayah</h2><div class="dsb-pilih" id="pemilihIsi"><span class="muted">Memuat pilihan wilayah…</span></div></div>' +
      '<div class="kisi dsb-kpi">' + kpi('📝', 'Laporan', angka(r.total)) + kpi('🎯', 'Misi aktif', angka(r.aktif), r.merah ? '🔴 ' + r.merah + ' · 🟡 ' + r.kuning + ' · 🟢 ' + r.hijau : '') + kpi('✅', 'Selesai', angka(r.selesai), persen == null ? '' : persen + '% dari laporan') +
      kpi('🛡️', 'Terverifikasi', angka(r.terverifikasi)) + kpi('⏰', 'Terlambat', angka(r.terlambat)) + kpi('♻️', 'Sampah disetor', angka(r.kg) + ' kg', angka(r.setoran) + ' setoran') + kpi('🦸', 'Kader', angka(r.kader)) + kpi('🏘️', 'Warga', angka(r.warga)) + '</div>' +
      (r.total || r.setoran ? '' : '<div class="kartu kosong"><div class="ik">🌿</div><p>Belum ada laporan di ' + esc(d.nama) + ' pada periode ini.</p>' + (d.hari && d.total_semua_waktu > 0 ? '<p class="muted">Sepanjang waktu ada ' + d.total_semua_waktu + ' laporan di seluruh Indonesia.</p><button class="tombol sebaris" id="bSemua">Lihat semua waktu</button>' : '<p class="muted">Data akan muncul setelah ada laporan atau setoran yang dimasukkan lewat aplikasi.</p>') + '</div>') +
      '<div class="kisi" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))"><div class="kartu" style="margin:0"><h2>Tren mingguan</h2><div style="height:220px"><canvas id="gTren" role="img" aria-label="Laporan dan misi selesai 12 minggu terakhir"></canvas></div></div>' +
      '<div class="kartu" style="margin:0"><h2>Jenis masalah</h2><div style="height:220px"><canvas id="gJenis" role="img" aria-label="Jumlah laporan per jenis masalah"></canvas></div></div>' +
      (adaAnak ? '<div class="kartu" style="margin:0"><h2>Per ' + esc(ANAK[tk].toLowerCase()) + ': misi aktif</h2><div style="height:' + Math.max(220, Math.min(d.anak.length, 12) * 30 + 50) + 'px"><canvas id="gAnak" role="img" aria-label="Misi aktif per wilayah"></canvas></div></div>' : '') + '</div>' +
      (adaAnak ? '<div class="kartu dsb-hp"><h2 style="margin:0 0 4px">Rincian per ' + esc(ANAK[tk].toLowerCase()) + '</h2><p class="muted kecil">Ketuk untuk melihat tingkat di bawahnya.</p>' + d.anak.map(a => '<div class="dsb-kartu" data-w="' + esc(a.id) + '" style="' + (a.tingkat === 'kelurahan' ? '' : 'cursor:pointer') + '"><div class="baris antara"><b>' + esc(a.nama) + '</b>' + (a.tingkat === 'kelurahan' ? '' : '<span class="muted">›</span>') + '</div><div class="dsb-chip"><span>📝 ' + angka(a.total) + ' laporan</span><span>🎯 ' + angka(a.aktif) + ' aktif</span><span>✅ ' + angka(a.selesai) + '</span></div><div class="dsb-chip"><span>🔴 ' + a.merah + '</span><span>🟡 ' + a.kuning + '</span><span>🟢 ' + a.hijau + '</span><span>⏰ ' + angka(a.terlambat) + '</span><span>♻️ ' + angka(a.kg) + ' kg</span></div></div>').join('') + '<button class="tombol garis" id="bCsv2" style="margin-top:10px">⬇️ Unduh CSV</button></div>' : '') +
      (adaAnak ? '<div class="kartu dsb-lebar"><div class="baris antara bungkus"><h2 style="margin:0">Rincian per ' + esc(ANAK[tk].toLowerCase()) + '</h2><button class="tombol kecil garis sebaris" id="bCsv">⬇️ Unduh CSV</button></div><p class="muted kecil">Ketuk baris untuk melihat tingkat di bawahnya.</p><div class="gulir-x"><table class="tabel" id="tAnak"><tr><th>' + esc(ANAK[tk]) + '</th><th>Laporan</th><th>Aktif</th><th>🔴</th><th>🟡</th><th>🟢</th><th>Selesai</th><th>Terlambat</th><th>Setoran (kg)</th><th>Kader</th><th>Warga</th></tr>' +
        d.anak.map(a => '<tr data-w="' + esc(a.id) + '" style="' + (a.tingkat === 'kelurahan' ? '' : 'cursor:pointer') + '"><td><b>' + esc(a.nama) + '</b></td><td>' + angka(a.total) + '</td><td>' + angka(a.aktif) + '</td><td>' + a.merah + '</td><td>' + a.kuning + '</td><td>' + a.hijau + '</td><td>' + angka(a.selesai) + '</td><td>' + angka(a.terlambat) + '</td><td>' + angka(a.kg) + '</td><td>' + angka(a.kader) + '</td><td>' + angka(a.warga) + '</td></tr>').join('') + '</table></div></div>' :
        (tk === 'kelurahan' ? '<div class="kartu"><p class="muted">Ini tingkat paling bawah (kelurahan/desa).</p></div>' : '<div class="kartu"><p class="muted">Belum ada wilayah di bawah ini yang memasukkan data.</p></div>')) +
      '<p class="muted kecil" style="margin:0 16px 24px">' + esc(d.catatan) + '</p>';
    if ($('bSemua')) $('bSemua').onclick = () => { st.hari = 0; muat(); };
    $('hari').value = String(d.hari); $('hari').onchange = e => { st.hari = Number(e.target.value); muat(); };
    v.onclick = e => { const a = e.target.closest('[data-w]'); if (!a) return; if (a.tagName === 'A') e.preventDefault(); if (a.tagName === 'TR' && a.style.cursor !== 'pointer') return; st.id = a.dataset.w; try { history.replaceState(null, '', 'dasbor.html?w=' + encodeURIComponent(st.id) + '&hari=' + st.hari); } catch (x) {} muat(); window.scrollTo(0, 0); };
    if ($('bCsv')) $('bCsv').onclick = csv; if ($('bCsv2')) $('bCsv2').onclick = csv;
    gambarGrafik(); isiPemilih(d);
  }
  // Pemilih wilayah bertingkat: Provinsi > Kota/Kabupaten > Kecamatan > Kelurahan/Desa. Daftar anak diambil dari server dan disimpan sementara.
  const cacheAnak = {};
  async function anakDari(id) { if (cacheAnak[id]) return cacheAnak[id]; try { const r = await TS.panggil('dasborWilayah', { wilayah_id: id, hari: st.hari }, { get: true, tanpaToken: true }); cacheAnak[id] = r.anak.filter(a => !a.semu).map(a => ({ id: a.id, nama: a.nama, tingkat: a.tingkat })).sort((x, y) => x.nama.localeCompare(y.nama)); } catch (e) { cacheAnak[id] = []; } return cacheAnak[id]; }
  async function isiPemilih(d) {
    cacheAnak[d.wilayah_id] = d.anak.filter(a => !a.semu).map(a => ({ id: a.id, nama: a.nama, tingkat: a.tingkat })).sort((x, y) => x.nama.localeCompare(y.nama));
    const induk = [''].concat(d.jejak.map(j => j.id)), tingkat = d.jejak.length < induk.length ? induk.length : 0, daftar = await Promise.all(induk.map(anakDari)), el = $('pemilihIsi'); if (!el || data !== d) return;
    const kolom = []; induk.forEach((pid, k) => { const opsi = daftar[k]; if (!opsi.length) return; const dipilih = d.jejak[k] ? d.jejak[k].id : ''; kolom.push({ pid: pid, opsi: opsi, dipilih: dipilih, label: NAMA_TINGKAT[opsi[0].tingkat] || 'Wilayah' }); });
    el.innerHTML = kolom.map((c, i) => '<label class="fld" style="margin:0">' + esc(c.label) + '<select class="in" data-p="' + esc(c.pid) + '"><option value="">Semua ' + esc(c.label.toLowerCase()) + '</option>' + c.opsi.map(o => '<option value="' + esc(o.id) + '"' + (o.id === c.dipilih ? ' selected' : '') + '>' + esc(o.nama) + '</option>').join('') + '</select></label>').join('') + (kolom.length ? '' : '<span class="muted">Belum ada wilayah yang memasukkan data.</span>') + (d.wilayah_id ? '<button class="tombol garis kecil sebaris" id="bSemuaWil" type="button">🌏 Seluruh Indonesia</button>' : '');
    el.querySelectorAll('select').forEach(sel => { sel.onchange = () => { st.id = sel.value || sel.dataset.p; try { history.replaceState(null, '', 'dasbor.html?w=' + encodeURIComponent(st.id) + '&hari=' + st.hari); } catch (x) {} muat(); }; });
    if ($('bSemuaWil')) $('bSemuaWil').onclick = () => { st.id = ''; muat(); };
  }
  function gambarGrafik() {
    grafik.forEach(g => g.destroy()); grafik = []; if (!window.Chart || !data) return; const d = data, ink = css('--ink-muted'), gar = css('--line'); Chart.defaults.font.family = 'Plus Jakarta Sans, system-ui, sans-serif'; Chart.defaults.color = ink;
    const opsi = { responsive: true, maintainAspectRatio: false, animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : undefined, scales: { x: { grid: { color: gar } }, y: { grid: { color: gar }, beginAtZero: true, ticks: { precision: 0 } } } };
    grafik.push(new Chart($('gTren'), { type: 'line', data: { labels: d.tren.map(t => tgl(t.minggu)), datasets: [{ label: 'Dilaporkan', data: d.tren.map(t => t.lapor), borderColor: css('--merah'), backgroundColor: css('--merah'), tension: .3 }, { label: 'Selesai', data: d.tren.map(t => t.selesai), borderColor: css('--hijau'), backgroundColor: css('--hijau'), tension: .3 }] }, options: opsi }));
    const kj = Object.keys(d.jenis); grafik.push(new Chart($('gJenis'), { type: 'bar', data: { labels: kj.map(k => JENIS[k] || k), datasets: [{ label: 'Laporan', data: kj.map(k => d.jenis[k]), backgroundColor: css('--tosca') }] }, options: Object.assign({}, opsi, { plugins: { legend: { display: false } } }) }));
    if ($('gAnak')) { const a = d.anak.slice(0, 12); grafik.push(new Chart($('gAnak'), { type: 'bar', data: { labels: a.map(x => x.nama), datasets: [{ label: '🔴 Merah', data: a.map(x => x.merah), backgroundColor: css('--merah') }, { label: '🟡 Kuning', data: a.map(x => x.kuning), backgroundColor: css('--kuning') }, { label: '🟢 Hijau', data: a.map(x => x.hijau), backgroundColor: css('--hijau') }] },
      options: Object.assign({}, opsi, { indexAxis: 'y', scales: { x: { stacked: true, grid: { color: gar }, ticks: { precision: 0 } }, y: { stacked: true, grid: { display: false } } } }) })); }
  }
  function csv() {
    const d = data, k = ['Wilayah', 'Tingkat', 'Laporan', 'Aktif', 'Merah', 'Kuning', 'Hijau', 'Selesai', 'Terverifikasi', 'Terlambat', 'Setoran', 'Kg', 'Kader', 'Warga'], q = x => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"';
    const baris = [k.map(q).join(';')].concat(d.anak.map(a => [a.nama, a.tingkat, a.total, a.aktif, a.merah, a.kuning, a.hijau, a.selesai, a.terverifikasi, a.terlambat, a.setoran, a.kg, a.kader == null ? '<3' : a.kader, a.warga == null ? '<3' : a.warga].map(q).join(';')));
    const b = new Blob(['﻿' + baris.join('\n')], { type: 'text/csv;charset=utf-8' }), u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = 'dasbor-' + (d.nama || 'indonesia').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 3000);
  }
  async function muat() {
    try { tampil(await TS.panggil('dasborWilayah', { wilayah_id: st.id, hari: st.hari }, { get: true, tanpaToken: true })); }
    catch (e) { v.innerHTML = '<div class="kartu tengah"><p><b>' + esc(e.message) + '</b></p><button class="tombol garis" id="ulang">Coba lagi</button></div>'; $('ulang').onclick = muat; }
  }
  muat();
})();
