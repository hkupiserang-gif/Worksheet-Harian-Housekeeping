const express = require('express');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { parse } = require('json2csv');

const app = express();
const PORT = process.env.PORT || 8888;

// Koneksi Database
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error("❌ Koneksi database gagal:", err.message);
  else console.log("✅ Terhubung ke database SQLite");
});

// Buat Tabel Jika Belum Ada
db.serialize(() => {
  // Tabel Pengguna
  db.run(`CREATE TABLE IF NOT EXISTS pengguna (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    peran TEXT NOT NULL,
    aktif BOOLEAN DEFAULT 1
  )`);

  // Isi data pengguna awal
  db.get(`SELECT 1 FROM pengguna WHERE username = 'nizar'`, (err, row) => {
    if (!row) {
      db.run(`INSERT INTO pengguna (nama, username, password, peran) VALUES
        ('Aslan', 'aslan', '123', 'RA'),
        ('Bila', 'bila', '123', 'RA'),
        ('Indah', 'indah', '123', 'RA'),
        ('Fika', 'fika', '123', 'RA'),
        ('Azril', 'azril', '123', 'RA'),
        ('Alwi', 'alwi', '123', 'RA'),
        ('Revan', 'revan', '123', 'RA'),
        ('Apri', 'apri', '123', 'RA'),
        ('Nizar', 'nizar', '123', 'SPV'),
        ('Kinan', 'kinan', '123', 'SPV'),
        ('Ilhan', 'ilhan', '123', 'SPV'),
        ('Alisa', 'alisa', '1234', 'OT')`);
    }
  });

  // Tabel Kamar
  db.run(`CREATE TABLE IF NOT EXISTS kamar (
    nomor_kamar TEXT PRIMARY KEY,
    lantai TEXT NOT NULL,
    tipe_kamar TEXT NOT NULL,
    aktif BOOLEAN DEFAULT 1
  )`);

  db.get(`SELECT 1 FROM kamar WHERE nomor_kamar = '201'`, (err, row) => {
    if (!row) {
      const daftarKamar = [
        ['201','Lantai 2C','Deluxe'],['202','Lantai 2C','Deluxe'],['203','Lantai 2C','Deluxe'],
        ['204','Lantai 2C','Deluxe'],['205','Lantai 2C','Deluxe'],['206','Lantai 2C','Deluxe'],
        ['207','Lantai 2C','Deluxe'],['208','Lantai 2C','Deluxe'],['209','Lantai 2C','Deluxe'],
        ['210','Lantai 2C','Deluxe'],['211','Lantai 2C','Deluxe'],['212','Lantai 2C','Deluxe'],
        ['213','Lantai 2C','Deluxe'],['301','Lantai 3A','Junior Suite'],['302','Lantai 3A','Junior Suite'],
        ['303','Lantai 3A','Deluxe'],['304','Lantai 3A','Deluxe'],['305','Lantai 3A','Deluxe'],
        ['306','Lantai 3A','Deluxe'],['307','Lantai 3A','Deluxe'],['308','Lantai 3A','Deluxe'],
        ['309','Lantai 3A','Deluxe'],['310','Lantai 3A','Deluxe'],['311','Lantai 3A','Deluxe'],
        ['312','Lantai 3C','Deluxe'],['313','Lantai 3C','Deluxe'],['314','Lantai 3C','Deluxe'],
        ['315','Lantai 3C','Deluxe'],['316','Lantai 3C','Deluxe'],['317','Lantai 3C','Deluxe'],
        ['318','Lantai 3C','Deluxe'],['319','Lantai 3C','Deluxe'],['320','Lantai 3C','Deluxe'],
        ['321','Lantai 3C','Deluxe'],['322','Lantai 3C','Deluxe'],['323','Lantai 3C','Deluxe'],
        ['324','Lantai 3C','Deluxe'],['401','Lantai 4A','Junior Suite'],['402','Lantai 4A','Junior Suite'],
        ['403','Lantai 4A','Premium Deluxe'],['404','Lantai 4A','Deluxe'],['405','Lantai 4A','Premium Deluxe'],
        ['406','Lantai 4A','Deluxe'],['407','Lantai 4A','Premium Deluxe'],['408','Lantai 4A','Deluxe'],
        ['409','Lantai 4A','Premium Deluxe'],['410','Lantai 4A','Deluxe'],['411','Lantai 4A','Premium Deluxe'],
        ['501','Lantai 5A','Deluxe'],['502','Lantai 5A','Deluxe'],['503','Lantai 5A','Deluxe'],
        ['504','Lantai 5A','Deluxe'],['505','Lantai 5A','Deluxe'],['506','Lantai 5A','Deluxe'],
        ['507','Lantai 5A','Deluxe'],['508','Lantai 5C','Deluxe'],['509','Lantai 5C','Deluxe'],
        ['510','Lantai 5C','Deluxe'],['511','Lantai 5C','Deluxe'],['512','Lantai 5C','Deluxe'],
        ['513','Lantai 5C','Deluxe'],['514','Lantai 5C','Deluxe'],['515','Lantai 5C','Deluxe'],
        ['516','Lantai 5C','Deluxe'],['517','Lantai 5C','Deluxe'],['518','Lantai 5C','Deluxe'],
        ['519','Lantai 5C','Deluxe'],['520','Lantai 5C','Deluxe']
      ];
      daftarKamar.forEach(k => db.run(`INSERT OR IGNORE INTO kamar VALUES (?, ?, ?, 1)`, k));
    }
  });

  // Tabel Tugas
  db.run(`CREATE TABLE IF NOT EXISTS tugas (
    tanggal TEXT,
    kamar TEXT,
    petugas TEXT,
    status_awal TEXT,
    selesai INTEGER DEFAULT 0,
    PRIMARY KEY (tanggal, kamar)
  )`);

  // Tabel Laporan
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

  // Tabel Permintaan Tamu
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

// Konfigurasi Aplikasi
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'horison2026hotel',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 86400000 }
}));

app.use((req, res, next) => {
  res.locals.pesan = null;
  if (req.query.pesan === 'berhasil') res.locals.pesan = { tipe: 'sukses', teks: '✅ Berhasil disimpan' };
  if (req.query.pesan === 'gagal') res.locals.pesan = { tipe: 'error', teks: '❌ Terjadi kesalahan' };
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

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM pengguna WHERE username = ? AND aktif = 1`, [username.trim()], (err, user) => {
    if (user && user.password === password) {
      req.session.user = { id: user.id, nama: user.nama, peran: user.peran };
      if (user.peran === 'SPV') return res.redirect('/spv');
      if (user.peran === 'RA') return res.redirect('/ra');
      if (user.peran === 'OT') return res.redirect('/ot');
    }
    res.render('login', { pesan: { tipe: 'error', teks: '❌ Username atau Password salah' } });
  });
});

// Halaman Supervisor
app.get('/spv', (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  const hariIni = new Date().toISOString().split('T')[0];
  const cariTanggal = req.query.tanggal || hariIni;
  const cariKamar = req.query.kamar || '';

  db.all(`SELECT * FROM kamar WHERE aktif = 1 ORDER BY nomor_kamar`, [], (err, daftarKamar) => {
    db.all(`SELECT nama FROM pengguna WHERE peran = 'RA' AND aktif = 1 ORDER BY nama`, [], (err, daftarRA) => {
      let query = `
        SELECT t.*, k.lantai, k.tipe_kamar,
               l.waktu_masuk, l.waktu_keluar
        FROM tugas t
        JOIN kamar k ON t.kamar = k.nomor_kamar
        LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
        WHERE t.tanggal = ?
      `;
      const param = [cariTanggal];
      if (cariKamar) { query += ` AND t.kamar = ?`; param.push(cariKamar); }
      query += ` ORDER BY t.kamar`;

      db.all(query, param, (err, daftarTugas) => {
        const kamarSudahAda = daftarTugas.filter(x => x.tanggal === hariIni).map(x => x.kamar);

        db.all(`SELECT * FROM permintaan_tamu WHERE tanggal = ? ORDER BY waktu_masuk DESC`, [cariTanggal], (err, daftarPermintaan) => {
          const kamarPerLantai = {};
          daftarKamar.forEach(k => {
            if (!kamarPerLantai[k.lantai]) kamarPerLantai[k.lantai] = [];
            kamarPerLantai[k.lantai].push(k);
          });

          res.render('spv', {
            user: req.session.user,
            tanggal: hariIni,
            cariTanggal,
            cariKamar,
            kamarPerLantai,
            daftarRA,
            daftarTugas,
            daftarPermintaan,
            kamarSudahAda,
            pesan: res.locals.pesan
          });
        });
      });
    });
  });
});

app.post('/tambah-tugas', (req, res) => {
  const { tanggal, petugas, kamar } = req.body;
  const daftarKamar = Array.isArray(kamar) ? kamar : [kamar];
  let prosesSelesai = 0;

  daftarKamar.forEach(k => {
    const status = req.body[`status_${k}`] || 'VD';
    db.run(`INSERT OR REPLACE INTO tugas (tanggal, kamar, petugas, status_awal, selesai) VALUES (?, ?, ?, ?, 0)`,
      [tanggal, k, petugas, status], () => {
        if (++prosesSelesai === daftarKamar.length) res.redirect('/spv?pesan=berhasil');
      });
  });
});

// Halaman RA
app.get('/ra', (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'RA') return res.redirect('/');
  const hariIni = new Date().toISOString().split('T')[0];

  db.all(`
    SELECT t.*,
           l.waktu_masuk, l.waktu_keluar,
           l.sheet_twin, l.sheet_king, l.duvet_twin, l.duvet_king,
           l.bath_towel, l.hand_towel, l.bath_mat, l.pillow_case,
           l.shampoo, l.soap, l.shower_gel, l.shower_cap, l.dental_kit,
           l.laundry_bag, l.laundry_list, l.dnd_sign,
           l.magic, l.shoe, l.sugar, l.tea, l.coffee, l.creamer, l.mineral
    FROM tugas t
    LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
    WHERE t.tanggal = ? AND t.petugas = ?
    ORDER BY t.kamar
  `, [hariIni, req.session.user.nama], (err, daftarTugas) => {
    res.render('ra', {
      user: req.session.user,
      tanggal: hariIni,
      tugas: daftarTugas,
      pesan: res.locals.pesan
    });
  });
});

// Mulai Kerja → Catat Jam Masuk
app.post('/mulai-kamar', (req, res) => {
  const waktuMasuk = new Date().toTimeString().slice(0, 5);
  db.run(`
    INSERT OR REPLACE INTO laporan (tanggal, nomor_kamar, waktu_masuk, petugas)
    VALUES (?, ?, ?, ?)
  `, [req.body.tanggal, req.body.kamar, waktuMasuk, req.session.user.nama], (err) => {
    if (err) console.error("Error mulai kerja:", err);
    res.redirect('/ra?pesan=berhasil');
  });
});

// Selesai Kerja → Simpan Semua Data
app.post('/selesai-kamar', (req, res) => {
  const {
    tanggal, kamar, waktu_masuk,
    sheet_twin, sheet_king, duvet_twin, duvet_king,
    bath_towel, hand_towel, bath_mat, pillow_case,
    shampoo, soap, shower_gel, shower_cap, dental_kit,
    laundry_bag, laundry_list, dnd_sign,
    magic, shoe, sugar, tea, coffee, creamer, mineral
  } = req.body;

  const waktuKeluar = new Date().toTimeString().slice(0, 5);

  db.run(`
    INSERT OR REPLACE INTO laporan (
      tanggal, nomor_kamar, waktu_masuk, waktu_keluar,
      sheet_twin, sheet_king, duvet_twin, duvet_king,
      bath_towel, hand_towel, bath_mat, pillow_case,
      shampoo, soap, shower_gel, shower_cap, dental_kit,
      laundry_bag, laundry_list, dnd_sign,
      magic, shoe, sugar, tea, coffee, creamer, mineral, petugas
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    tanggal, kamar, waktu_masuk, waktuKeluar,
    sheet_twin || 0, sheet_king || 0, duvet_twin || 0, duvet_king || 0,
    bath_towel || 0, hand_towel || 0, bath_mat || 0, pillow_case || 0,
    shampoo || 0, soap || 0, shower_gel || 0, shower_cap || 0, dental_kit || 0,
    laundry_bag || 0, laundry_list || 0, dnd_sign || 0,
    magic || 0, shoe || 0, sugar || 0, tea || 0, coffee || 0, creamer || 0, mineral || 0,
    req.session.user.nama
  ], (err) => {
    if (err) return console.error("Error simpan laporan:", err);
    db.run(`UPDATE tugas SET selesai = 1 WHERE tanggal = ? AND kamar = ?`, [tanggal, kamar], () => {
      res.redirect('/ra?pesan=berhasil');
    });
  });
});

// Unduh Laporan
app.get('/unduh-excel', (req, res) => {
  const tanggal = req.query.tanggal || new Date().toISOString().split('T')[0];
  db.all(`
    SELECT t.tanggal, t.kamar AS no_kamar, k.lantai, k.tipe_kamar, t.petugas, t.status_awal,
           l.waktu_masuk, l.waktu_keluar,
           l.sheet_twin, l.sheet_king, l.duvet_twin, l.duvet_king,
           l.bath_towel, l.hand_towel, l.bath_mat, l.pillow_case,
           l.shampoo, l.soap, l.shower_gel, l.shower_cap, l.dental_kit,
           l.laundry_bag, l.laundry_list, l.dnd_sign,
           l.magic, l.shoe, l.sugar, l.tea, l.coffee, l.creamer, l.mineral,
           CASE WHEN t.selesai = 1 THEN 'Selesai' ELSE 'Belum Selesai' END AS status_selesai
    FROM tugas t
    JOIN kamar k ON t.kamar = k.nomor_kamar
    LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
    WHERE t.tanggal = ?
    ORDER BY t.kamar
  `, [tanggal], (err, data) => {
    if (err) return res.send('Gagal memuat data');
    try {
      const fields = [
        'tanggal', 'no_kamar', 'lantai', 'tipe_kamar', 'petugas', 'status_awal',
        'waktu_masuk', 'waktu_keluar',
        'sheet_twin', 'sheet_king', 'duvet_twin', 'duvet_king',
        'bath_towel', 'hand_towel', 'bath_mat', 'pillow_case',
        'shampoo', 'soap', 'shower_gel', 'shower_cap', 'dental_kit',
        'laundry_bag', 'laundry_list', 'dnd_sign',
        'magic', 'shoe', 'sugar', 'tea', 'coffee', 'creamer', 'mineral',
        'status_selesai'
      ];
      const csv = parse(data, { fields });
      res.setHeader('Content-Disposition', `attachment; filename="Laporan_Kebersihan_${tanggal}.csv"`);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.send('\uFEFF' + csv);
    } catch (err) {
      res.send('Gagal membuat file: ' + err.message);
    }
  });
});

// Halaman OT
app.get('/ot', (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'OT') return res.redirect('/');
  const hariIni = new Date().toISOString().split('T')[0];

  db.all(`SELECT * FROM kamar ORDER BY nomor_kamar`, [], (err, daftarKamar) => {
    db.all(`SELECT * FROM permintaan_tamu WHERE tanggal = ? ORDER BY waktu_masuk DESC`, [hariIni], (err, daftarPermintaan) => {
      res.render('ot', {
        user: req.session.user,
        tanggal: hariIni,
        daftarKamar,
        daftarPermintaan,
        pesan: res.locals.pesan
      });
    });
  });
});

app.post('/tambah-permintaan', (req, res) => {
  db.run(`INSERT INTO permintaan_tamu (nomor_kamar, jenis_permintaan, keterangan, dibuat_oleh)
    VALUES (?, ?, ?, ?)`,
    [req.body.nomor_kamar, req.body.jenis_permintaan, req.body.keterangan || '', req.session.user.nama],
    () => res.redirect('/ot?pesan=berhasil')
  );
});

app.post('/selesai-permintaan', (req, res) => {
  db.run(`UPDATE permintaan_tamu SET status = 'Selesai', waktu_selesai = TIME('now') WHERE id = ?`,
    [req.body.id], () => res.redirect('/ot?pesan=berhasil')
  );
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// Jalankan Server
app.listen(PORT, () => {
  console.log(`✅ Server berjalan di port ${PORT}`);
});
