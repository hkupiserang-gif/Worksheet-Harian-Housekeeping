const express = require('express');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 8888;

// ===================== KONEKSI DATABASE SQLITE =====================
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error("❌ Koneksi SQLite gagal:", err.message);
  else console.log("✅ Terhubung ke database SQLite");
});

// Buat tabel & masukkan data awal jika belum ada
db.serialize(() => {
  // Tabel pengguna
  db.run(`CREATE TABLE IF NOT EXISTS pengguna (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    peran TEXT NOT NULL,
    aktif BOOLEAN DEFAULT 1
  )`);

  // Masukkan akun default jika belum ada
  db.get(`SELECT * FROM pengguna WHERE username = 'spv'`, (err, row) => {
    if (!row) {
      db.run(`INSERT INTO pengguna (nama, username, password, peran) VALUES 
        ('Supervisor', 'spv', 'spv123', 'SPV'),
        ('Room Attendant 1', 'ra1', 'ra123', 'RA'),
        ('Room Attendant 2', 'ra2', 'ra123', 'RA'),
        ('Alwi', 'alwi', 'alwi123', 'RA'),
        ('Order Taker', 'ot', 'ot123', 'OT')`);
      console.log("✅ Akun pengguna default berhasil dibuat");
    }
  });

  // Tabel kamar
  db.run(`CREATE TABLE IF NOT EXISTS kamar (
    nomor_kamar TEXT PRIMARY KEY,
    lantai INTEGER,
    tipe_kamar TEXT,
    aktif BOOLEAN DEFAULT 1
  )`);

  // Masukkan data kamar jika belum ada
  db.get(`SELECT * FROM kamar WHERE nomor_kamar = '312'`, (err, row) => {
    if (!row) {
      db.run(`INSERT INTO kamar (nomor_kamar, lantai, tipe_kamar) VALUES 
        ('312', 3, 'Twin'),
        ('313', 3, 'King'),
        ('314', 3, 'Twin'),
        ('201', 2, 'Twin'),
        ('202', 2, 'King'),
        ('203', 2, 'Twin'),
        ('204', 2, 'King'),
        ('205', 2, 'Twin'),
        ('206', 2, 'King')`);
      console.log("✅ Data kamar berhasil dibuat");
    }
  });

  // Tabel tugas
  db.run(`CREATE TABLE IF NOT EXISTS tugas (
    tanggal TEXT,
    kamar TEXT,
    petugas TEXT,
    status_awal TEXT,
    selesai BOOLEAN DEFAULT 0,
    PRIMARY KEY (tanggal, kamar)
  )`);

  // Tabel laporan
  db.run(`CREATE TABLE IF NOT EXISTS laporan (
    tanggal TEXT,
    nomor_kamar TEXT,
    waktu_masuk TEXT,
    waktu_keluar TEXT,
    sheet_twin INTEGER DEFAULT 0,
    sheet_king INTEGER DEFAULT 0,
    duvet_twin INTEGER DEFAULT 0,
    duvet_king INTEGER DEFAULT 0,
    bath_towel INTEGER DEFAULT 0,
    hand_towel INTEGER DEFAULT 0,
    bath_mat INTEGER DEFAULT 0,
    pillow_case INTEGER DEFAULT 0,
    shampoo INTEGER DEFAULT 0,
    soap INTEGER DEFAULT 0,
    shower_gel INTEGER DEFAULT 0,
    shower_cap INTEGER DEFAULT 0,
    dental_kit INTEGER DEFAULT 0,
    laundry_bag INTEGER DEFAULT 0,
    laundry_list INTEGER DEFAULT 0,
    dnd_sign INTEGER DEFAULT 0,
    magic INTEGER DEFAULT 0,
    shoe INTEGER DEFAULT 0,
    sugar INTEGER DEFAULT 0,
    tea INTEGER DEFAULT 0,
    coffee INTEGER DEFAULT 0,
    creamer INTEGER DEFAULT 0,
    mineral INTEGER DEFAULT 0,
    petugas TEXT,
    PRIMARY KEY (tanggal, nomor_kamar)
  )`);

  // Tabel permintaan tamu
  db.run(`CREATE TABLE IF NOT EXISTS permintaan_tamu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT DEFAULT (DATE('now')),
    nomor_kamar TEXT,
    jenis_permintaan TEXT,
    keterangan TEXT,
    status TEXT DEFAULT 'Diproses',
    waktu_masuk TEXT DEFAULT (TIME('now')),
    waktu_selesai TEXT,
    dibuat_oleh TEXT
  )`);
});

// ===================== KONFIGURASI APLIKASI =====================
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

// Pesan notifikasi
app.use((req, res, next) => {
  res.locals.pesan = null;
  if (req.query.pesan === 'berhasil') res.locals.pesan = { tipe: 'sukses', teks: '✅ Data berhasil disimpan' };
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

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM pengguna WHERE username = ? AND aktif = 1`, [username.trim()], (err, user) => {
    if (err) {
      console.error("Login error:", err.message);
      return res.render('login', { pesan: { tipe: 'error', teks: '❌ Kesalahan sistem' } });
    }
    if (user && user.password === password) {
      req.session.user = { id: user.id, nama: user.nama, peran: user.peran };
      if (user.peran === 'SPV') return res.redirect('/spv');
      if (user.peran === 'RA') return res.redirect('/ra');
      if (user.peran === 'OT') return res.redirect('/ot');
    } else {
      res.render('login', { pesan: { tipe: 'error', teks: '❌ Username atau kata sandi salah' } });
    }
  });
});

// ===================== HALAMAN SUPERVISOR =====================
app.get('/spv', (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  const hariIni = new Date().toISOString().split('T')[0];

  db.all(`SELECT nomor_kamar, lantai, tipe_kamar FROM kamar WHERE aktif = 1 ORDER BY nomor_kamar`, [], (err, daftarKamar) => {
    if (err) {
      console.error("Load kamar error:", err.message);
      return res.render('spv', { user: req.session.user, tanggal: hariIni, daftarKamar: [], daftarRA: [], daftarTugas: [], pesan: { tipe: 'error', teks: '❌ Gagal memuat data' } });
    }

    db.all(`SELECT nama FROM pengguna WHERE peran = 'RA' AND aktif = 1 ORDER BY nama`, [], (err, daftarRA) => {
      if (err) {
        console.error("Load RA error:", err.message);
        return res.render('spv', { user: req.session.user, tanggal: hariIni, daftarKamar, daftarRA: [], daftarTugas: [], pesan: { tipe: 'error', teks: '❌ Gagal memuat data' } });
      }

      db.all(`SELECT t.*, k.lantai FROM tugas t JOIN kamar k ON t.kamar = k.nomor_kamar WHERE t.tanggal = ? ORDER BY t.kamar`, [hariIni], (err, daftarTugas) => {
        if (err) {
          console.error("Load tugas error:", err.message);
          return res.render('spv', { user: req.session.user, tanggal: hariIni, daftarKamar, daftarRA, daftarTugas: [], pesan: { tipe: 'error', teks: '❌ Gagal memuat data' } });
        }
        res.render('spv', { user: req.session.user, tanggal: hariIni, daftarKamar, daftarRA, daftarTugas, pesan: res.locals.pesan });
      });
    });
  });
});

app.post('/tambah-tugas', (req, res) => {
  const { tanggal, petugas, kamar } = req.body;
  const daftarKamar = Array.isArray(kamar) ? kamar : [kamar];
  let selesai = 0;
  const total = daftarKamar.length;

  if (total === 0) return res.redirect('/spv?pesan=gagal');

  daftarKamar.forEach((nomorKamar) => {
    const status = req.body[`status_${nomorKamar}`] || 'VD';
    db.run(`INSERT OR REPLACE INTO tugas (tanggal, kamar, petugas, status_awal) VALUES (?, ?, ?, ?)`,
      [tanggal, nomorKamar, petugas, status], (err) => {
        if (err) console.error("Tambah tugas error:", err.message);
        selesai++;
        if (selesai === total) res.redirect('/spv?pesan=berhasil');
      });
  });
});

// ===================== HALAMAN ROOM ATTENDANT =====================
app.get('/ra', (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'RA') return res.redirect('/');
  const hariIni = new Date().toISOString().split('T')[0];

  db.all(`
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
    WHERE t.tanggal = ? AND t.petugas = ?
    ORDER BY t.kamar
  `, [hariIni, req.session.user.nama], (err, tugas) => {
    if (err) {
      console.error("Load RA error:", err.message);
      return res.redirect('/?pesan=gagal');
    }
    res.render('ra', { user: req.session.user, tanggal: hariIni, tugas, pesan: res.locals.pesan });
  });
});

// Proses Mulai Kamar
app.post('/mulai-kamar', (req, res) => {
  const { tanggal, kamar } = req.body;
  const waktuMulai = new Date().toTimeString().slice(0, 5);

  db.run(`
    INSERT OR REPLACE INTO laporan (tanggal, nomor_kamar, waktu_masuk, petugas)
    VALUES (?, ?, ?, ?)
  `, [tanggal, kamar, waktuMulai, req.session.user.nama], (err) => {
    if (err) {
      console.error("Mulai kamar error:", err.message);
      return res.redirect('/ra?pesan=gagal');
    }
    res.redirect('/ra?pesan=berhasil');
  });
});

// Proses Selesai Kamar
app.post('/selesai-kamar', (req, res) => {
  const {
    tanggal, kamar, waktu_masuk,
    sheet_twin, sheet_king, duvet_twin, duvet_king,
    bath_towel, hand_towel, bath_mat, pillow_case,
    shampoo, soap, shower_gel, shower_cap, dental_kit,
    laundry_bag, laundry_list, dnd_sign, magic, shoe,
    sugar, tea, coffee, creamer, mineral
  } = req.body;

  const waktuSelesai = new Date().toTimeString().slice(0, 5);

  db.run(`
    INSERT OR REPLACE INTO laporan (
      tanggal, nomor_kamar, waktu_masuk, waktu_keluar,
      sheet_twin, sheet_king, duvet_twin, duvet_king,
      bath_towel, hand_towel, bath_mat, pillow_case,
      shampoo, soap, shower_gel, shower_cap, dental_kit,
      laundry_bag, laundry_list, dnd_sign, magic, shoe,
      sugar, tea, coffee, creamer, mineral, petugas
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    tanggal, kamar, waktu_masuk, waktuSelesai,
    sheet_twin || 0, sheet_king || 0, duvet_twin || 0, duvet_king || 0,
    bath_towel || 0, hand_towel || 0, bath_mat || 0, pillow_case || 0,
    shampoo || 0, soap || 0, shower_gel || 0, shower_cap || 0, dental_kit || 0,
    laundry_bag || 0, laundry_list || 0, dnd_sign || 0, magic || 0, shoe || 0,
    sugar || 0, tea || 0, coffee || 0, creamer || 0, mineral || 0,
    req.session.user.nama
  ], (err) => {
    if (err) {
      console.error("Simpan laporan error:", err.message);
      return res.redirect('/ra?pesan=gagal');
    }

    db.run(`UPDATE tugas SET selesai = 1 WHERE tanggal = ? AND kamar = ?`, [tanggal, kamar], (err) => {
      if (err) console.error("Update tugas error:", err.message);
      res.redirect('/ra?pesan=berhasil');
    });
  });
});

// ===================== HALAMAN ORDER TAKER =====================
app.get('/ot', (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'OT') return res.redirect('/');
  const hariIni = new Date().toISOString().split('T')[0];

  db.all(`SELECT nomor_kamar FROM kamar WHERE aktif = 1 ORDER BY nomor_kamar`, [], (err, daftarKamar) => {
    if (err) {
      console.error("Load kamar OT error:", err.message);
      return res.render('ot', { user: req.session.user, tanggal: hariIni, daftarKamar: [], daftarPermintaan: [], pesan: { tipe: 'error', teks: '❌ Gagal memuat data' } });
    }

    db.all(`SELECT * FROM permintaan_tamu WHERE tanggal = ? ORDER BY waktu_masuk DESC`, [hariIni], (err, daftarPermintaan) => {
      if (err) {
        console.error("Load permintaan error:", err.message);
        return res.render('ot', { user: req.session.user, tanggal: hariIni, daftarKamar, daftarPermintaan: [], pesan: { tipe: 'error', teks: '❌ Gagal memuat data' } });
      }
      res.render('ot', { user: req.session.user, tanggal: hariIni, daftarKamar, daftarPermintaan, pesan: res.locals.pesan });
    });
  });
});

app.post('/tambah-permintaan', (req, res) => {
  const { nomor_kamar, jenis_permintaan, keterangan } = req.body;
  db.run(`INSERT INTO permintaan_tamu (nomor_kamar, jenis_permintaan, keterangan, dibuat_oleh) VALUES (?, ?, ?, ?)`,
    [nomor_kamar, jenis_permintaan, keterangan || '', req.session.user.nama], (err) => {
      if (err) console.error("Tambah permintaan error:", err.message);
      res.redirect('/ot?pesan=berhasil');
    });
});

app.post('/selesai-permintaan', (req, res) => {
  const { id } = req.body;
  db.run(`UPDATE permintaan_tamu SET status = 'Selesai', waktu_selesai = TIME('now') WHERE id = ?`, [id], (err) => {
    if (err) console.error("Selesai permintaan error:", err.message);
    res.redirect('/ot?pesan=berhasil');
  });
});

// ===================== LOGOUT =====================
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ===================== JALANKAN SERVER =====================
app.listen(PORT, () => {
  console.log(`✅ Server berjalan di port ${PORT}`);
});
