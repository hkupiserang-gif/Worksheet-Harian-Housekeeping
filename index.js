const express = require('express');
const { Pool } = require('pg');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8888;

// Koneksi Database Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect((err) => {
  if (err) console.error("❌ Koneksi DB gagal:", err);
  else console.log("✅ Database terhubung dengan baik");
});

// Konfigurasi Aplikasi
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'horison-hotel-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Variabel pesan global
app.use((req, res, next) => {
  res.locals.pesan = null;
  if (req.query.pesan === 'berhasil') res.locals.pesan = { tipe: 'sukses', teks: '✅ Berhasil disimpan' };
  if (req.query.pesan === 'gagal') res.locals.pesan = { tipe: 'error', teks: '❌ Gagal menyimpan data' };
  next();
});

// ===================== HALAMAN LOGIN =====================
app.get('/', (req, res) => {
  if (req.session.user) {
    if (req.session.user.peran === 'SPV') return res.redirect('/spv');
    if (req.session.user.peran === 'RA') return res.redirect('/ra');
    if (req.session.user.peran === 'OT') return res.redirect('/ot');
  }
  res.render('login', { pesan: res.locals.pesan });
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hasil = await pool.query(
      "SELECT * FROM pengguna WHERE username = $1 AND aktif = true",
      [username.trim()]
    );
    const user = hasil.rows[0];

    if (user && user.password === password) {
      req.session.user = { id: user.id, nama: user.nama, peran: user.peran };
      if (user.peran === 'SPV') return res.redirect('/spv');
      if (user.peran === 'RA') return res.redirect('/ra');
      if (user.peran === 'OT') return res.redirect('/ot');
    } else {
      res.render('login', { pesan: { tipe: 'error', teks: '❌ Username atau sandi salah' } });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.render('login', { pesan: { tipe: 'error', teks: '❌ Kesalahan sistem' } });
  }
});

// ===================== HALAMAN SUPERVISOR =====================
app.get('/spv', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  try {
    const hariIni = new Date().toISOString().split('T')[0];
    const kamar = await pool.query("SELECT nomor_kamar, lantai, tipe_kamar FROM kamar WHERE aktif = true ORDER BY nomor_kamar");
    const daftarRA = await pool.query("SELECT nama FROM pengguna WHERE peran = 'RA' AND aktif = true ORDER BY nama");
    const tugas = await pool.query(`
      SELECT t.*, k.lantai 
      FROM tugas t
      JOIN kamar k ON t.kamar = k.nomor_kamar
      WHERE t.tanggal = $1 
      ORDER BY t.kamar
    `, [hariIni]);

    res.render('spv', {
      user: req.session.user,
      tanggal: hariIni,
      daftarKamar: kamar.rows,
      daftarRA: daftarRA.rows,
      daftarTugas: tugas.rows,
      pesan: res.locals.pesan
    });
  } catch (err) {
    console.error("SPV error:", err);
    res.render('spv', {
      user: req.session.user,
      tanggal: new Date().toISOString().split('T')[0],
      daftarKamar: [], daftarRA: [], daftarTugas: [],
      pesan: { tipe: 'error', teks: '❌ Gagal memuat data kamar' }
    });
  }
});

app.post('/tambah-tugas', async (req, res) => {
  try {
    const { tanggal, petugas, kamar, status_awal } = req.body;
    await pool.query(`
      INSERT INTO tugas (tanggal, kamar, petugas, status_awal)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (tanggal, kamar) DO UPDATE 
      SET petugas = $3, status_awal = $4
    `, [tanggal, kamar, petugas, status_awal]);
    res.redirect('/spv?pesan=berhasil');
  } catch (err) {
    console.error("Tambah tugas error:", err);
    res.redirect('/spv?pesan=gagal');
  }
});

// ===================== HALAMAN RA =====================
app.get('/ra', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'RA') return res.redirect('/');
  try {
    const hariIni = new Date().toISOString().split('T')[0];
    const tugas = await pool.query(`
      SELECT t.*, l.waktu_masuk, l.waktu_keluar, l.keterangan
      FROM tugas t 
      LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
      WHERE t.tanggal = $1 AND t.petugas = $2 
      ORDER BY t.kamar
    `, [hariIni, req.session.user.nama]);

    res.render('ra', {
      user: req.session.user,
      tugas: tugas.rows,
      pesan: res.locals.pesan
    });
  } catch (err) {
    console.error("RA error:", err);
    res.redirect('/?pesan=gagal');
  }
});

app.post('/simpan-laporan', async (req, res) => {
  try {
    const { tanggal, kamar, waktu_masuk, waktu_keluar, keterangan } = req.body;
    await pool.query(`
      INSERT INTO laporan (tanggal, nomor_kamar, waktu_masuk, waktu_keluar, keterangan, petugas)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (tanggal, nomor_kamar) DO UPDATE
      SET waktu_masuk=$3, waktu_keluar=$4, keterangan=$5
    `, [tanggal, kamar, waktu_masuk || null, waktu_keluar || null, keterangan || '', req.session.user.nama]);

    if (waktu_keluar) {
      await pool.query("UPDATE tugas SET selesai = true WHERE tanggal = $1 AND kamar = $2", [tanggal, kamar]);
    }
    res.redirect('/ra?pesan=berhasil');
  } catch (err) {
    console.error("Simpan laporan error:", err);
    res.redirect('/ra?pesan=gagal');
  }
});

// ===================== HALAMAN OT =====================
app.get('/ot', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'OT') return res.redirect('/');
  res.render('ot', { user: req.session.user, pesan: res.locals.pesan });
});

// ===================== LOGOUT =====================
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.listen(PORT, () => console.log(`✅ Server berjalan di port ${PORT}`));
