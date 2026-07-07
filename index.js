const express = require('express');
const { Pool } = require('pg');
const session = require('express-session');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8888;

// Koneksi Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(() => console.log("✅ Koneksi DB berhasil"))
  .catch(err => console.error("❌ Koneksi DB gagal:", err));

// Konfigurasi Aplikasi
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'hotel-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// ================= RUTE =================
app.get('/', (req, res) => {
  if (req.session.user) {
    if (req.session.user.peran === 'SPV') return res.redirect('/spv');
    if (req.session.user.peran === 'RA') return res.redirect('/ra');
    if (req.session.user.peran === 'OT') return res.redirect('/ot');
  }
  res.render('login', { pesan: null });
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hasil = await pool.query("SELECT * FROM pengguna WHERE username = $1", [username]);
    const pengguna = hasil.rows[0];

    if (pengguna && password === pengguna.sandi) {
      req.session.user = pengguna;
      if (pengguna.peran === 'SPV') return res.redirect('/spv');
      if (pengguna.peran === 'RA') return res.redirect('/ra');
      if (pengguna.peran === 'OT') return res.redirect('/ot');
    }
    res.render('login', { pesan: '❌ Username atau kata sandi salah!' });
  } catch (err) {
    console.error("Login error:", err);
    res.render('login', { pesan: '❌ Terjadi kesalahan sistem' });
  }
});

// Supervisor
app.get('/spv', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  try {
    const hariIni = new Date().toISOString().split('T')[0];
    const tugas = await pool.query("SELECT * FROM tugas WHERE tanggal = $1 ORDER BY kamar ASC", [hariIni]);
    res.render('spv', { user: req.session.user, tugas: tugas.rows });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

app.post('/tambah-tugas', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  try {
    const { tanggal, kamar, petugas, status_awal } = req.body;
    await pool.query(`
      INSERT INTO tugas (tanggal, kamar, petugas, status_awal, selesai)
      VALUES ($1, $2, $3, $4, false)
      ON CONFLICT (tanggal, kamar) DO UPDATE SET petugas = $3, status_awal = $4
    `, [tanggal, kamar, petugas, status_awal]);
    res.redirect('/spv');
  } catch (err) {
    console.error(err);
    res.redirect('/spv');
  }
});

// Room Attendant
app.get('/ra', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'RA') return res.redirect('/');
  try {
    const hariIni = new Date().toISOString().split('T')[0];
    const tugas = await pool.query("SELECT * FROM tugas WHERE tanggal = $1 AND petugas = $2", [hariIni, req.session.user.nama]);
    res.render('ra', { user: req.session.user, tugas: tugas.rows });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

app.post('/simpan-laporan', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'RA') return res.redirect('/');
  try {
    const { tanggal, kamar, shift, lantai_bagian, waktu_masuk, waktu_keluar, status_hk, status_fo, status_out, keterangan } = req.body;
    const status = status_fo ? 'FO' : status_hk ? 'HK' : status_out ? 'OUT' : 'HK';

    await pool.query(`
      INSERT INTO laporan (tanggal, nomor_kamar, shift, lantai_bagian, status_kamar, waktu_masuk, waktu_keluar, keterangan, petugas)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [tanggal, kamar, shift, lantai_bagian, status, waktu_masuk, waktu_keluar, keterangan || '', req.session.user.nama]);

    await pool.query("UPDATE tugas SET selesai = true WHERE tanggal = $1 AND kamar = $2", [tanggal, kamar]);
    res.redirect('/ra');
  } catch (err) {
    console.error(err);
    res.redirect('/ra');
  }
});

// Order Taker
app.get('/ot', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'OT') return res.redirect('/');
  res.render('ot', { user: req.session.user });
});

// Unduh Laporan
app.get('/unduh', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  try {
    const hasil = await pool.query("SELECT * FROM laporan ORDER BY tanggal DESC");
    const namaFile = `Laporan_HK_${new Date().toISOString().slice(0,10)}.csv`;
    const jalur = `/tmp/${namaFile}`;

    const csv = createCsvWriter({
      path: jalur,
      header: [
        {id: 'tanggal', title: 'Tanggal'},
        {id: 'nomor_kamar', title: 'No Kamar'},
        {id: 'shift', title: 'Shift'},
        {id: 'lantai_bagian', title: 'Lantai/Bagian'},
        {id: 'status_kamar', title: 'Status'},
        {id: 'waktu_masuk', title: 'Waktu Masuk'},
        {id: 'waktu_keluar', title: 'Waktu Keluar'},
        {id: 'petugas', title: 'Petugas'},
        {id: 'keterangan', title: 'Keterangan'}
      ]
    });

    await csv.writeRecords(hasil.rows);
    res.download(jalur, namaFile, () => fs.unlink(jalur, () => {}));
  } catch (err) {
    console.error(err);
    res.redirect('/spv');
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.listen(PORT, () => console.log(`✅ Server berjalan di port ${PORT}`));
