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
  else console.log("✅ Database terhubung");
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

// Notifikasi
app.use((req, res, next) => {
  res.locals.pesan = null;
  if (req.query.pesan === 'berhasil') res.locals.pesan = { tipe: 'sukses', teks: '✅ Data berhasil disimpan' };
  if (req.query.pesan === 'gagal') res.locals.pesan = { tipe: 'error', teks: '❌ Gagal menyimpan data' };
  next();
});

// Halaman Login
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
    const hasil = await pool.query("SELECT * FROM pengguna WHERE username=$1 AND aktif=true", [username.trim()]);
    const user = hasil.rows[0];
    if (user && user.password === password) {
      req.session.user = { id: user.id, nama: user.nama, peran: user.peran };
      if (user.peran === 'SPV') return res.redirect('/spv');
      if (user.peran === 'RA') return res.redirect('/ra');
      if (user.peran === 'OT') return res.redirect('/ot');
    } else {
      res.render('login', { pesan: { tipe: 'error', teks: '❌ Username atau password salah' } });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.render('login', { pesan: { tipe: 'error', teks: '❌ Kesalahan sistem' } });
  }
});

// Halaman Supervisor
app.get('/spv', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  try {
    const hariIni = new Date().toISOString().split('T')[0];
    const daftarKamar = await pool.query("SELECT nomor_kamar, lantai, tipe_kamar FROM kamar WHERE aktif=true ORDER BY nomor_kamar");
    const daftarRA = await pool.query("SELECT nama FROM pengguna WHERE peran='RA' AND aktif=true ORDER BY nama");
    const daftarTugas = await pool.query(`
      SELECT t.*, k.lantai 
      FROM tugas t JOIN kamar k ON t.kamar = k.nomor_kamar
      WHERE t.tanggal=$1 ORDER BY t.kamar
    `, [hariIni]);
    res.render('spv', { user: req.session.user, tanggal: hariIni, daftarKamar: daftarKamar.rows, daftarRA: daftarRA.rows, daftarTugas: daftarTugas.rows, pesan: res.locals.pesan });
  } catch (err) {
    console.error("SPV error:", err);
    res.render('spv', { user: req.session.user, tanggal: new Date().toISOString().split('T')[0], daftarKamar: [], daftarRA: [], daftarTugas: [], pesan: { tipe: 'error', teks: '❌ Gagal memuat data' } });
  }
});

app.post('/tambah-tugas', async (req, res) => {
  try {
    const { tanggal, petugas, kamar } = req.body;
    const daftarKamar = Array.isArray(kamar) ? kamar : [kamar];
    for (const k of daftarKamar) {
      const status = req.body[`status_${k}`] || 'VD';
      await pool.query(`
        INSERT INTO tugas (tanggal, kamar, petugas, status_awal)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tanggal, kamar) DO UPDATE SET petugas=$3, status_awal=$4
      `, [tanggal, k, petugas, status]);
    }
    res.redirect('/spv?pesan=berhasil');
  } catch (err) {
    console.error("Tambah tugas error:", err);
    res.redirect('/spv?pesan=gagal');
  }
});

// ===================== HALAMAN RA - PERBAIKAN UTAMA =====================
app.get('/ra', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'RA') return res.redirect('/');
  try {
    const hariIni = new Date().toISOString().split('T')[0];
    const daftarTugas = await pool.query(`
      SELECT 
        t.*, 
        l.waktu_masuk, l.waktu_keluar,
        l.sheet_twin, l.sheet_king, l.duvet_twin, l.duvet_king,
        l.bath_towel, l.hand_towel, l.bath_mat, l.pillow_case,
        l.shampoo, l.soap, l.shower_gel, l.shower_cap, l.dental_kit,
        l.laundry_bag, l.laundry_list, l.dnd_sign, l.magic, l.shoe,
        l.sugar, l.tea, l.coffee, l.creamer, l.mineral
      FROM tugas t
      LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
      WHERE t.tanggal = $1 AND t.petugas = $2
      ORDER BY t.kamar
    `, [hariIni, req.session.user.nama]);

    res.render('ra', {
      user: req.session.user,
      tanggal: hariIni,
      tugas: daftarTugas.rows,
      pesan: res.locals.pesan
    });
  } catch (err) {
    console.error("RA Load Error:", err);
    res.redirect('/?pesan=gagal');
  }
});

// Proses Mulai Kamar
app.post('/mulai-kamar', async (req, res) => {
  try {
    const { tanggal, kamar } = req.body;
    const waktuMulai = new Date().toTimeString().slice(0, 5);
    await pool.query(`
      INSERT INTO laporan (tanggal, nomor_kamar, waktu_masuk, petugas)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (tanggal, nomor_kamar) DO UPDATE SET waktu_masuk = $3
    `, [tanggal, kamar, waktuMulai, req.session.user.nama]);
    res.redirect('/ra?pesan=berhasil');
  } catch (err) {
    console.error("Mulai Error:", err);
    res.redirect('/ra?pesan=gagal');
  }
});

// Proses Selesai Kamar
app.post('/selesai-kamar', async (req, res) => {
  try {
    const {
      tanggal, kamar, waktu_masuk,
      sheet_twin, sheet_king, duvet_twin, duvet_king,
      bath_towel, hand_towel, bath_mat, pillow_case,
      shampoo, soap, shower_gel, shower_cap, dental_kit,
      laundry_bag, laundry_list, dnd_sign, magic, shoe,
      sugar, tea, coffee, creamer, mineral
    } = req.body;

    const waktuSelesai = new Date().toTimeString().slice(0, 5);

    await pool.query(`
      INSERT INTO laporan (
        tanggal, nomor_kamar, waktu_masuk, waktu_keluar,
        sheet_twin, sheet_king, duvet_twin, duvet_king,
        bath_towel, hand_towel, bath_mat, pillow_case,
        shampoo, soap, shower_gel, shower_cap, dental_kit,
        laundry_bag, laundry_list, dnd_sign, magic, shoe,
        sugar, tea, coffee, creamer, mineral, petugas
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
      ON CONFLICT (tanggal, nomor_kamar) DO UPDATE SET
        waktu_masuk=$3, waktu_keluar=$4,
        sheet_twin=$5, sheet_king=$6, duvet_twin=$7, duvet_king=$8,
        bath_towel=$9, hand_towel=$10, bath_mat=$11, pillow_case=$12,
        shampoo=$13, soap=$14, shower_gel=$15, shower_cap=$16, dental_kit=$17,
        laundry_bag=$18, laundry_list=$19, dnd_sign=$20, magic=$21, shoe=$22,
        sugar=$23, tea=$24, coffee=$25, creamer=$26, mineral=$27
    `, [
      tanggal, kamar, waktu_masuk, waktuSelesai,
      sheet_twin || 0, sheet_king || 0, duvet_twin || 0, duvet_king || 0,
      bath_towel || 0, hand_towel || 0, bath_mat || 0, pillow_case || 0,
      shampoo || 0, soap || 0, shower_gel || 0, shower_cap || 0, dental_kit || 0,
      laundry_bag || 0, laundry_list || 0, dnd_sign || 0, magic || 0, shoe || 0,
      sugar || 0, tea || 0, coffee || 0, creamer || 0, mineral || 0,
      req.session.user.nama
    ]);

    await pool.query("UPDATE tugas SET selesai = true WHERE tanggal = $1 AND kamar = $2", [tanggal, kamar]);
    res.redirect('/ra?pesan=berhasil');
  } catch (err) {
    console.error("Selesai Error:", err);
    res.redirect('/ra?pesan=gagal');
  }
});

// Halaman Order Taker
app.get('/ot', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'OT') return res.redirect('/');
  try {
    const hariIni = new Date().toISOString().split('T')[0];
    const daftarKamar = await pool.query("SELECT nomor_kamar FROM kamar WHERE aktif=true ORDER BY nomor_kamar");
    const daftarPermintaan = await pool.query("SELECT * FROM permintaan_tamu WHERE tanggal=$1 ORDER BY waktu_masuk DESC", [hariIni]);
    res.render('ot', { user: req.session.user, tanggal: hariIni, daftarKamar: daftarKamar.rows, daftarPermintaan: daftarPermintaan.rows, pesan: res.locals.pesan });
  } catch (err) {
    console.error("OT error:", err);
    res.render('ot', { user: req.session.user, tanggal: new Date().toISOString().split('T')[0], daftarKamar: [], daftarPermintaan: [], pesan: { tipe: 'error', teks: '❌ Gagal memuat data' } });
  }
});

app.post('/tambah-permintaan', async (req, res) => {
  try {
    const { nomor_kamar, jenis_permintaan, keterangan } = req.body;
    await pool.query(`INSERT INTO permintaan_tamu (nomor_kamar, jenis_permintaan, keterangan, dibuat_oleh) VALUES ($1,$2,$3,$4)`, [nomor_kamar, jenis_permintaan, keterangan || '', req.session.user.nama]);
    res.redirect('/ot?pesan=berhasil');
  } catch (err) {
    console.error("Tambah permintaan error:", err);
    res.redirect('/ot?pesan=gagal');
  }
});

app.post('/selesai-permintaan', async (req, res) => {
  try {
    const { id } = req.body;
    await pool.query("UPDATE permintaan_tamu SET status='Selesai', waktu_selesai=CURRENT_TIME WHERE id=$1", [id]);
    res.redirect('/ot?pesan=berhasil');
  } catch (err) {
    console.error("Selesai permintaan error:", err);
    res.redirect('/ot?pesan=gagal');
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.listen(PORT, () => console.log(`✅ Server berjalan di port ${PORT}`));
