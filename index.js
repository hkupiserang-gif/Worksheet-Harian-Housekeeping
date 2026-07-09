// ======================================
// ✅ HALAMAN OT - FULL & DIPERBAIKI
// ======================================
app.get('/ot', (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'OT') return res.redirect('/');
  const hariIni = getTanggalWIB();
  
  db.all(`SELECT nomor_kamar, lantai, tipe_kamar FROM kamar WHERE aktif = 1 ORDER BY nomor_kamar`, [], (err, daftarKamar) => {
    db.all(`
      SELECT * FROM permintaan_tamu 
      WHERE tanggal = ? 
      ORDER BY waktu_masuk DESC, id DESC
    `, [hariIni], (err, daftarPermintaan) => {
      res.render('ot', {
        user: req.session.user,
        tanggal: hariIni,
        daftarKamar,
        daftarPermintaan,
        pesan: res.locals.pesan,
        waktuSekarang: getWaktuWIB(),
        waktuSingkat: getWaktuWIBJamMenit()
      });
    });
  });
});

// Simpan permintaan baru
app.post('/tambah-permintaan', (req, res) => {
  const { nomor_kamar, jenis_permintaan, keterangan } = req.body;
  const hariIni = getTanggalWIB();
  const waktuMasuk = getWaktuWIBJamMenit();

  if (!nomor_kamar || !jenis_permintaan) {
    return res.redirect('/ot?pesan=gagal');
  }

  db.run(`
    INSERT INTO permintaan_tamu 
    (tanggal, nomor_kamar, jenis_permintaan, keterangan, waktu_masuk, dibuat_oleh, status)
    VALUES (?, ?, ?, ?, ?, ?, 'Dipinjam Tamu')
  `, [hariIni, nomor_kamar, jenis_permintaan, keterangan || '', waktuMasuk, req.session.user.nama],
  (err) => {
    if (err) {
      console.error('Error simpan permintaan:', err.message);
      return res.redirect('/ot?pesan=gagal');
    }
    res.redirect('/ot?pesan=berhasil');
  });
});

// Ubah status permintaan
app.post('/ubah-status-permintaan', (req, res) => {
  const { id, status } = req.body;
  const waktuSelesai = status === 'Dikembalikan' ? getWaktuWIBJamMenit() : null;

  db.run(`
    UPDATE permintaan_tamu 
    SET status = ?, waktu_selesai = ?
    WHERE id = ?
  `, [status, waktuSelesai, id],
  (err) => {
    if (err) return res.redirect('/ot?pesan=gagal');
    res.redirect('/ot?pesan=berhasil');
  });
});

// Hapus permintaan
app.post('/hapus-permintaan', (req, res) => {
  const { id } = req.body;
  db.run(`DELETE FROM permintaan_tamu WHERE id = ?`, [id], (err) => {
    if (err) return res.redirect('/ot?pesan=gagal');
    res.redirect('/ot?pesan=berhasil');
  });
});

// Unduh Laporan PDF Permintaan Tamu
app.get('/unduh-pdf-ot', (req, res) => {
  const tanggal = req.query.tanggal || getTanggalWIB();
  
  db.all(`
    SELECT nomor_kamar, jenis_permintaan, keterangan, status, waktu_masuk, waktu_selesai, dibuat_oleh
    FROM permintaan_tamu 
    WHERE tanggal = ?
    ORDER BY waktu_masuk DESC
  `, [tanggal], (err, data) => {
    if (err) return res.send('❌ Gagal mengambil data');
    if (data.length === 0) return res.send('❌ Tidak ada data permintaan untuk tanggal ini');

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 25, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=LAPORAN_PERMINTAAN_TAMU_${tanggal}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text('HORISON HOTEL & CONVENTION', { align: 'center' });
    doc.fontSize(14).text('LAPORAN PERMINTAAN TAMU', { align: 'center', underline: true });
    doc.moveDown(1);
    doc.fontSize(11).font('Helvetica').text(`Tanggal: ${tanggal}`, { align: 'left' });
    doc.text(`Dibuat Oleh: ${data[0].dibuat_oleh || '-'}`, { align: 'left' });
    doc.moveDown(1);

    // Tabel Header
    doc.fontSize(10).font('Helvetica-Bold');
    let y = doc.y;
    doc.text('No', 25, y, { width: 30 });
    doc.text('Kamar', 55, y, { width: 50 });
    doc.text('Permintaan', 110, y, { width: 180 });
    doc.text('Waktu Masuk', 295, y, { width: 70 });
    doc.text('Status', 370, y, { width: 80 });
    doc.text('Waktu Selesai', 450, y, { width: 70 });

    y += 15;
    doc.moveTo(25, y).lineTo(520, y).stroke();
    y += 8;

    // Isi Data
    doc.fontSize(10).font('Helvetica');
    data.forEach((row, index) => {
      if (y > 720) { doc.addPage(); y = 40; }
      doc.text(String(index + 1), 25, y, { width: 30 });
      doc.text(row.nomor_kamar, 55, y, { width: 50 });
      doc.text(`${row.jenis_permintaan}${row.keterangan ? ` (${row.keterangan})` : ''}`, 110, y, { width: 180 });
      doc.text(row.waktu_masuk || '-', 295, y, { width: 70 });
      doc.text(row.status, 370, y, { width: 80 });
      doc.text(row.waktu_selesai || '-', 450, y, { width: 70 });
      y += 18;
    });

    // Tanda Tangan
    y += 30;
    doc.text('Diketahui,', 350, y);
    doc.moveDown(4);
    doc.text('( ____________________ )', 350, y);
    doc.text('Supervisor', 360, y + 20);

    doc.end();
  });
});
