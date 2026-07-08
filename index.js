const express = require('express');
const { Pool } = require('pg');
const session = require('express-session');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8888;

// =============================================
// Koneksi Database
// =============================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000
});

pool.connect()
  .then(() => console.log("✅ Database terhubung dan siap digunakan"))
  .catch(err => console.error("❌ Gagal terhubung ke database:", err));

// =============================================
// Konfigurasi Aplikasi
// =============================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'horison-hotel-system-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000, httpOnly: true }
}));

// =============================================
// Notifikasi Global
// =============================================
app.use((req, res, next) => {
  res.locals.pesan = null;
  if (req.query.pesan === 'berhasil') {
    res.locals.pesan = { tipe: 'sukses', teks: '✅ Berhasil disimpan' };
  } else if (req.query.pesan === 'gagal') {
    res.locals.pesan = { tipe: 'error', teks: '❌ Gagal menyimpan, coba lagi' };
  }
  next();
});

// =============================================
// Halaman Login
// =============================================
app.get('/', (req, res) => {
  if (req.session.user) {
    switch(req.session.user.peran) {
      case 'SPV': return res.redirect('/spv');
      case 'RA': return res.redirect('/ra');
      case 'OT': return res.redirect('/ot');
    }
  }
  res.render('login');
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hasil = await pool.query(
      `SELECT id, nama, username, peran FROM pengguna WHERE username = $1 AND aktif = true`,
      [username.trim()]
    );
    const pengguna = hasil.rows[0];

    if (pengguna && password === pengguna.sandi) {
      req.session.user = pengguna;
      switch(pengguna.peran) {
        case 'SPV': return res.redirect('/spv');
        case 'RA': return res.redirect('/ra');
        case 'OT': return res.redirect('/ot');
      }
    }
    res.render('login', { pesan: '❌ Nama pengguna atau sandi salah' });
  } catch (err) {
    console.error("Login error:", err);
    res.render('login', { pesan: '❌ Kesalahan sistem, coba lagi' });
  }
});

// =============================================
// Panel Supervisor
// =============================================
app.get('/spv', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  try {
    const hariIni = new Date().toISOString().split('T')[0];

    const daftarKamar = await pool.query(`
      SELECT nomor_kamar, lantai, tipe_kamar, status FROM kamar WHERE aktif = true ORDER BY nomor_kamar
    `);

    const daftarTugas = await pool.query(`
      SELECT t.*, l.waktu_masuk, l.waktu_keluar
      FROM tugas t
      LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
      WHERE t.tanggal = $1 ORDER BY t.kamar
    `, [hariIni]);

    const daftarRA = await pool.query(`
      SELECT nama FROM pengguna WHERE peran = 'RA' AND aktif = true ORDER BY nama
    `);

    res.render('spv', {
      user: req.session.user,
      daftarKamar: daftarKamar.rows,
      daftarTugas: daftarTugas.rows,
      daftarRA: daftarRA.rows,
      tanggal: hariIni
    });
  } catch (err) {
    console.error("SPV error:", err);
    res.render('spv', { user: req.session.user, daftarKamar: [], daftarTugas: [], daftarRA: [], tanggal: new Date().toISOString().split('T')[0] });
  }
});

app.post('/tambah-tugas', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  try {
    const { tanggal, petugas, kamar, status_awal } = req.body;
    if (!tanggal || !petugas || !kamar || !status_awal) return res.redirect('/spv?pesan=gagal');

    await pool.query(`
      INSERT INTO tugas (tanggal, kamar, petugas, status_awal)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (tanggal, kamar) DO UPDATE
      SET petugas = $3, status_awal = $4, selesai = false
    `, [tanggal, kamar, petugas, status_awal]);

    res.redirect('/spv?pesan=berhasil');
  } catch (err) {
    console.error("Tugas error:", err);
    res.redirect('/spv?pesan=gagal');
  }
});

// =============================================
// Panel Room Attendant
// =============================================
app.get('/ra', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'RA') return res.redirect('/');
  try {
    const hariIni = new Date().toISOString().split('T')[0];
    const hasil = await pool.query(`
      SELECT t.*, l.waktu_masuk, l.waktu_keluar, l.linen, l.amenities, l.keterangan
      FROM tugas t
      LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
      WHERE t.tanggal = $1 AND t.petugas = $2
      ORDER BY t.kamar
    `, [hariIni, req.session.user.nama]);

    res.render('ra', { user: req.session.user, tugas: hasil.rows });
  } catch (err) {
    console.error("RA error:", err);
    res.redirect('/?pesan=gagal');
  }
});

app.post('/simpan-laporan', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'RA') return res.redirect('/');
  try {
    const {
      tanggal, kamar, waktu_masuk, waktu_keluar,
      sheet_double, sheet_single, duvet_double, duvet_single,
      bath_towel, hand_towel, bath_mat, pillow_case,
      tissue, hand_soap, shampoo, shower_gel, tooth_brush,
      sterilizer, shower_cap, slipper, laundry_bag, laundry_list,
      memo_pad, pencil, plastic_bin, tissue_box, coffee, sugar,
      tea, creamer, mineral_water, keterangan
    } = req.body;

    if (!tanggal || !kamar) return res.redirect('/ra?pesan=gagal');

    const linen = {
      sheet_double: Number(sheet_double) || 0,
      sheet_single: Number(sheet_single) || 0,
      duvet_double: Number(duvet_double) || 0,
      duvet_single: Number(duvet_single) || 0,
      bath_towel: Number(bath_towel) || 0,
      hand_towel: Number(hand_towel) || 0,
      bath_mat: Number(bath_mat) || 0,
      pillow_case: Number(pillow_case) || 0
    };

    const amenities = {
      tissue: Number(tissue) || 0,
      hand_soap: Number(hand_soap) || 0,
      shampoo: Number(shampoo) || 0,
      shower_gel: Number(shower_gel) || 0,
      tooth_brush: Number(tooth_brush) || 0,
      sterilizer: Number(sterilizer) || 0,
      shower_cap: Number(shower_cap) || 0,
      slipper: Number(slipper) || 0,
      laundry_bag: Number(laundry_bag) || 0,
      laundry_list: Number(laundry_list) || 0,
      memo_pad: Number(memo_pad) || 0,
      pencil: Number(pencil) || 0,
      plastic_bin: Number(plastic_bin) || 0,
      tissue_box: Number(tissue_box) || 0,
      coffee: Number(coffee) || 0,
      sugar: Number(sugar) || 0,
      tea: Number(tea) || 0,
      creamer: Number(creamer) || 0,
      mineral_water: Number(mineral_water) || 0
    };

    await pool.query(`
      INSERT INTO laporan (
        tanggal, nomor_kamar, shift, status_kamar,
        waktu_masuk, waktu_keluar, linen, amenities, keterangan, petugas
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (tanggal, nomor_kamar) DO UPDATE
      SET waktu_masuk = EXCLUDED.waktu_masuk,
          waktu_keluar = EXCLUDED.waktu_keluar,
          linen = EXCLUDED.linen,
          amenities = EXCLUDED.amenities,
          keterangan = EXCLUDED.keterangan
    `, [
      tanggal, kamar, 'Morning', 'HK',
      waktu_masuk || null,
      waktu_keluar || null,
      JSON.stringify(linen),
      JSON.stringify(amenities),
      keterangan?.trim() || '',
      req.session.user.nama
    ]);

    if (waktu_keluar) {
      await pool.query(`UPDATE tugas SET selesai = true WHERE tanggal = $1 AND kamar = $2`, [tanggal, kamar]);
    }

    res.redirect('/ra?pesan=berhasil');
  } catch (err) {
    console.error("Simpan laporan error:", err);
    res.redirect('/ra?pesan=gagal');
  }
});

// =============================================
// Panel Order Taker
// =============================================
app.get('/ot', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'OT') return res.redirect('/');
  try {
    const hasil = await pool.query(`
      SELECT * FROM request_tamu WHERE petugas = $1 ORDER BY tanggal DESC, jam DESC
    `, [req.session.user.nama]);
    res.render('ot', { user: req.session.user, daftarRequest: hasil.rows });
  } catch (err) {
    console.error("OT error:", err);
    res.render('ot', { user: req.session.user, daftarRequest: [] });
  }
});

app.post('/simpan-request', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'OT') return res.redirect('/');
  try {
    const { tanggal, jam, nomor_kamar, barang } = req.body;
    await pool.query(`
      INSERT INTO request_tamu (tanggal, jam, nomor_kamar, barang, petugas)
      VALUES ($1, $2, $3, $4, $5)
    `, [tanggal, jam, nomor_kamar, barang, req.session.user.nama]);
    res.redirect('/ot?pesan=berhasil');
  } catch (err) {
    console.error("Simpan request error:", err);
    res.redirect('/ot?pesan=gagal');
  }
});

// =============================================
// Unduh Laporan & Logout
// =============================================
app.get('/unduh-laporan', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  try {
    const hasil = await pool.query(`
      SELECT l.*, k.lantai, k.tipe_kamar
      FROM laporan l
      LEFT JOIN kamar k ON l.nomor_kamar = k.nomor_kamar
      ORDER BY l.tanggal DESC, l.nomor_kamar
    `);
    if (!hasil.rows.length) return res.redirect('/spv?pesan=gagal');

    const data = hasil.rows.map(r => ({
      Tanggal: r.tanggal,
      Kamar: r.nomor_kamar,
      Lantai: r.lantai,
      Tipe: r.tipe_kamar,
      Shift: r.shift,
      Status: r.status_kamar,
      Masuk: r.waktu_masuk ? r.waktu_masuk.slice(0,5) : '-',
      Keluar: r.waktu_keluar ? r.waktu_keluar.slice(0,5) : '-',
      Linen: JSON.stringify(r.linen),
      Amenities: JSON.stringify(r.amenities),
      Keterangan: r.keterangan || '-',
      Petugas: r.petugas
    }));

    const namaFile = `Laporan_HK_${new Date().toISOString().slice(0,10)}.csv`;
    const jalur = path.join(__dirname, namaFile);

    const csvWriter = createCsvWriter({
      path: jalur,
      header: Object.keys(data[0]).map(id => ({ id, title: id })),
      fieldDelimiter: ';'
    });

    await csvWriter.writeRecords(data);
    res.download(jalur, namaFile, () => fs.unlink(jalur, () => {}));
  } catch (err) {
    console.error("Unduh laporan error:", err);
    res.redirect('/spv?pesan=gagal');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.listen(PORT, () => console.log(`🚀 Server berjalan di port ${PORT}`));
