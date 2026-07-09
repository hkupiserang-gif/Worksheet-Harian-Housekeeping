const express = require('express');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { parse } = require('json2csv');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 8888;

// ======================================
// ✅ FUNGSI WAKTU WIB 100% AKURAT (Asia/Jakarta)
// ======================================
const getWaktuWIB = () => {
  const now = new Date();
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(now);
};

const getWaktuWIBJamMenit = () => {
  const now = new Date();
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now);
};

const getTanggalWIB = () => {
  const now = new Date();
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now).split('/').reverse().join('-');
};

// ======================================
// Koneksi Database
// ======================================
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error("❌ Koneksi DB gagal:", err.message);
  else console.log("✅ Terhubung ke SQLite");
});

// ======================================
// Buat & Isi Tabel
// ======================================
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS pengguna (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    peran TEXT NOT NULL,
    aktif BOOLEAN DEFAULT 1
  )`);

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

  db.run(`CREATE TABLE IF NOT EXISTS tugas (
    tanggal TEXT,
    kamar TEXT,
    petugas TEXT,
    status_awal TEXT,
    selesai INTEGER DEFAULT 0,
    PRIMARY KEY (tanggal, kamar)
  )`);

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

// ======================================
// Konfigurasi Aplikasi
// ======================================
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
  res.locals.waktuSekarang = getWaktuWIB();
  res.locals.waktuSekarangSingkat = getWaktuWIBJamMenit();
  res.locals.tanggalSekarang = getTanggalWIB();
  res.locals.pesan = null;
  if (req.query.pesan === 'berhasil') res.locals.pesan = { tipe: 'sukses', teks: '✅ Berhasil disimpan' };
  if (req.query.pesan === 'gagal') res.locals.pesan = { tipe: 'error', teks: '❌ Terjadi kesalahan' };
  next();
});

// ======================================
// Halaman Login
// ======================================
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
      return res.redirect(user.peran === 'SPV' ? '/spv' : user.peran === 'RA' ? '/ra' : '/ot');
    }
    res.render('login', { pesan: { tipe: 'error', teks: '❌ Username atau Password salah' } });
  });
});

// ======================================
// Halaman Supervisor
// ======================================
app.get('/spv', (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  const hariIni = getTanggalWIB();
  const cariTanggal = req.query.tanggal || hariIni;
  const cariKamar = req.query.kamar || '';

  db.all(`SELECT * FROM kamar WHERE aktif = 1 ORDER BY nomor_kamar`, [], (err, daftarKamar) => {
    db.all(`SELECT nama FROM pengguna WHERE peran = 'RA' AND aktif = 1 ORDER BY nama`, [], (err, daftarRA) => {
      let query = `
        SELECT t.*, k.lantai, k.tipe_kamar,
               IFNULL(l.waktu_masuk, '-') AS waktu_masuk,
               IFNULL(l.waktu_keluar, '-') AS waktu_keluar
        FROM tugas t
        JOIN kamar k ON t.kamar = k.nomor_kamar
        LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
        WHERE t.tanggal = ?
      `;
      const param = [cariTanggal];
      if (cariKamar) { query += ` AND t.kamar = ?`; param.push(cariKamar); }
      query += ` ORDER BY t.kamar`;

      db.all(query, param, (err, daftarTugas) => {
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
            pesan: res.locals.pesan
          });
        });
      });
    });
  });
});

app.post('/tambah-tugas', (req, res) => {
  const { tanggal, petugas, kamar, status_awal } = req.body;
  const daftarKamar = Array.isArray(kamar) ? kamar : [kamar];
  const daftarStatus = Array.isArray(status_awal) ? status_awal : [status_awal];
  
  let selesai = 0;
  const total = daftarKamar.length;

  if (total === 0) return res.redirect('/spv?pesan=gagal');

  daftarKamar.forEach((k, idx) => {
    const status = daftarStatus[idx] || 'VD';
    db.run(`INSERT OR REPLACE INTO tugas VALUES (?, ?, ?, ?, 0)`, 
      [tanggal, k, petugas, status], 
      () => {
        if (++selesai === total) res.redirect('/spv?pesan=berhasil');
      }
    );
  });
});

// ======================================
// Halaman Room Attendant
// ======================================
app.get('/ra', (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'RA') return res.redirect('/');
  const hariIni = getTanggalWIB();
  db.all(`
    SELECT t.*,
           IFNULL(l.waktu_masuk, '-') AS waktu_masuk,
           IFNULL(l.waktu_keluar, '-') AS waktu_keluar,
           IFNULL(l.sheet_twin, 0) AS sheet_twin,
           IFNULL(l.sheet_king, 0) AS sheet_king,
           IFNULL(l.duvet_twin, 0) AS duvet_twin,
           IFNULL(l.duvet_king, 0) AS duvet_king,
           IFNULL(l.bath_towel, 0) AS bath_towel,
           IFNULL(l.hand_towel, 0) AS hand_towel,
           IFNULL(l.bath_mat, 0) AS bath_mat,
           IFNULL(l.pillow_case, 0) AS pillow_case,
           IFNULL(l.shampoo, 0) AS shampoo,
           IFNULL(l.soap, 0) AS soap,
           IFNULL(l.shower_gel, 0) AS shower_gel,
           IFNULL(l.shower_cap, 0) AS shower_cap,
           IFNULL(l.dental_kit, 0) AS dental_kit,
           IFNULL(l.laundry_bag, 0) AS laundry_bag,
           IFNULL(l.laundry_list, 0) AS laundry_list,
           IFNULL(l.dnd_sign, 0) AS dnd_sign,
           IFNULL(l.magic, 0) AS magic,
           IFNULL(l.shoe, 0) AS shoe,
           IFNULL(l.sugar, 0) AS sugar,
           IFNULL(l.tea, 0) AS tea,
           IFNULL(l.coffee, 0) AS coffee,
           IFNULL(l.creamer, 0) AS creamer,
           IFNULL(l.mineral, 0) AS mineral
    FROM tugas t
    LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
    WHERE t.tanggal = ? AND t.petugas = ? ORDER BY t.kamar
  `, [hariIni, req.session.user.nama], (err, daftarTugas) => {
    res.render('ra', { user: req.session.user, tanggal: hariIni, tugas: daftarTugas, pesan: res.locals.pesan });
  });
});

app.post('/mulai-kamar', (req, res) => {
  const waktuMasuk = getWaktuWIBJamMenit();
  db.run(`INSERT OR REPLACE INTO laporan (tanggal, nomor_kamar, waktu_masuk, petugas) VALUES (?, ?, ?, ?)`,
    [req.body.tanggal, req.body.kamar, waktuMasuk, req.session.user.nama], err => {
      if (err) console.error(err);
      res.redirect('/ra?pesan=berhasil');
    });
});

app.post('/selesai-kamar', (req, res) => {
  const { tanggal, kamar, waktu_masuk,
    sheet_twin, sheet_king, duvet_twin, duvet_king,
    bath_towel, hand_towel, bath_mat, pillow_case,
    shampoo, soap, shower_gel, shower_cap, dental_kit,
    laundry_bag, laundry_list, dnd_sign,
    magic, shoe, sugar, tea, coffee, creamer, mineral } = req.body;
  const waktuKeluar = getWaktuWIBJamMenit();

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
    sheet_twin||0, sheet_king||0, duvet_twin||0, duvet_king||0,
    bath_towel||0, hand_towel||0, bath_mat||0, pillow_case||0,
    shampoo||0, soap||0, shower_gel||0, shower_cap||0, dental_kit||0,
    laundry_bag||0, laundry_list||0, dnd_sign||0,
    magic||0, shoe||0, sugar||0, tea||0, coffee||0, creamer||0, mineral||0,
    req.session.user.nama
  ], err => {
    if (err) return console.error(err);
    db.run(`UPDATE tugas SET selesai = 1 WHERE tanggal = ? AND kamar = ?`, [tanggal, kamar], () => {
      res.redirect('/ra?pesan=berhasil');
    });
  });
});

// ======================================
// Halaman OT
// ======================================
app.get('/ot', (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'OT') return res.redirect('/');
  const hariIni = getTanggalWIB();
  db.all(`SELECT * FROM kamar ORDER BY nomor_kamar`, [], (err, daftarKamar) => {
    db.all(`SELECT * FROM permintaan_tamu WHERE tanggal = ? ORDER BY waktu_masuk DESC`, [hariIni], (err, daftar) => {
      res.render('ot', { user: req.session.user, tanggal: hariIni, daftarKamar, daftarPermintaan: daftar, pesan: res.locals.pesan });
    });
  });
});

app.post('/tambah-permintaan', (req, res) => {
  db.run(`INSERT INTO permintaan_tamu (nomor_kamar, jenis_permintaan, keterangan, dibuat_oleh) VALUES (?, ?, ?, ?)`,
    [req.body.nomor_kamar, req.body.jenis_permintaan, req.body.keterangan || '', req.session.user.nama], () => res.redirect('/ot?pesan=berhasil'));
});

app.post('/selesai-permintaan', (req, res) => {
  db.run(`UPDATE permintaan_tamu SET status = 'Selesai', waktu_selesai = ? WHERE id = ?`, 
    [getWaktuWIBJamMenit(), req.body.id], () => res.redirect('/ot?pesan=berhasil'));
});

// ======================================
// Unduh Excel
// ======================================
app.get('/unduh-excel', (req, res) => {
  const tanggal = req.query.tanggal || getTanggalWIB();
  db.all(`
    SELECT
      t.tanggal AS "Tanggal",
      t.kamar AS "No Kamar",
      k.lantai AS "Lantai",
      k.tipe_kamar AS "Tipe Kamar",
      t.petugas AS "Nama Petugas",
      t.status_awal AS "Status Kamar",
      IFNULL(l.waktu_masuk, '-') AS "Jam Masuk",
      IFNULL(l.waktu_keluar, '-') AS "Jam Keluar",
      IFNULL(l.sheet_twin, 0) AS "Sheet Twin",
      IFNULL(l.sheet_king, 0) AS "Sheet King",
      IFNULL(l.duvet_twin, 0) AS "Duvet Twin",
      IFNULL(l.duvet_king, 0) AS "Duvet King",
      IFNULL(l.bath_towel, 0) AS "Bath Towel",
      IFNULL(l.hand_towel, 0) AS "Hand Towel",
      IFNULL(l.bath_mat, 0) AS "Bath Mat",
      IFNULL(l.pillow_case, 0) AS "Pillow Case",
      IFNULL(l.shampoo, 0) AS "Shampoo",
      IFNULL(l.soap, 0) AS "Soap",
      IFNULL(l.shower_gel, 0) AS "Shower Gel",
      IFNULL(l.shower_cap, 0) AS "Shower Cap",
      IFNULL(l.dental_kit, 0) AS "Dental Kit",
      IFNULL(l.laundry_bag, 0) AS "Laundry Bag",
      IFNULL(l.laundry_list, 0) AS "Laundry List",
      IFNULL(l.dnd_sign, 0) AS "DND Sign",
      IFNULL(l.magic, 0) AS "Magic",
      IFNULL(l.shoe, 0) AS "Shoe Shiner",
      IFNULL(l.sugar, 0) AS "Sugar",
      IFNULL(l.tea, 0) AS "Tea",
      IFNULL(l.coffee, 0) AS "Coffee",
      IFNULL(l.creamer, 0) AS "Creamer",
      IFNULL(l.mineral, 0) AS "Air Mineral",
      CASE WHEN t.selesai = 1 THEN 'Selesai' ELSE 'Belum Selesai' END AS "Status Pekerjaan"
    FROM tugas t
    JOIN kamar k ON t.kamar = k.nomor_kamar
    LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
    WHERE t.tanggal = ? ORDER BY t.kamar
  `, [tanggal], (err, data) => {
    if (err) return res.send('❌ Gagal memuat data');
    if (data.length === 0) return res.send('❌ Tidak ada data untuk diunduh');
    const fields = Object.keys(data[0]);
    try {
      const csv = parse(data, { fields, delimiter: ';', quote: '"' });
      res.setHeader('Content-Disposition', `attachment; filename="Laporan_Kebersihan_${tanggal}.csv"`);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.send('\uFEFF' + csv);
    } catch (err) {
      res.send('❌ Gagal membuat Excel: ' + err.message);
    }
  });
});

// ======================================
// ✅ UNDUH PDF SESUAI FORMAT ROOMBOY CONTROL SHEET
// ======================================
app.get('/unduh-pdf', (req, res) => {
  const tanggal = req.query.tanggal || getTanggalWIB();
  db.all(`
    SELECT t.kamar, t.petugas, t.status_awal, k.lantai,
           IFNULL(l.waktu_masuk, '-') AS waktu_masuk,
           IFNULL(l.waktu_keluar, '-') AS waktu_keluar,
           l.sheet_twin, l.sheet_king, l.duvet_twin, l.duvet_king,
           l.bath_towel, l.hand_towel, l.bath_mat, l.pillow_case,
           l.shampoo, l.soap, l.shower_gel, l.shower_cap, l.dental_kit,
           l.sugar, l.tea, l.coffee, l.creamer, l.mineral
    FROM tugas t
    JOIN kamar k ON t.kamar = k.nomor_kamar
    LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
    WHERE t.tanggal = ? ORDER BY t.kamar
  `, [tanggal], (err, data) => {
    if (err) return res.send('❌ Gagal membuat PDF');
    if (data.length === 0) return res.send('❌ Tidak ada data untuk diunduh');
    
    const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ROOMBOY_CONTROL_SHEET_${tanggal}.pdf"`);
    doc.pipe(res);

    // Header Utama
    doc.fontSize(18).font('Helvetica-Bold').text('HORISON', { align: 'center' });
    doc.fontSize(14).text('HOTEL & CONVENTION', { align: 'center' });
    doc.fontSize(16).font('Helvetica-Bold').text('ROOMBOY CONTROL SHEET', { align: 'center', underline: true });
    doc.moveDown(1);

    // Info Lembar
    doc.fontSize(10).font('Helvetica').text(`SHIFT: Morning    |    FLOOR/SECTION: ${data[0]?.lantai || 'All Floors'}    |    DATE: ${tanggal}`, { align: 'left' });
    doc.moveDown(1);

    // Judul Kolom
    doc.fontSize(9).font('Helvetica-Bold');
    let y = doc.y;
    doc.text('NO', 20, y, { width: 25, align: 'center' });
    doc.text('ROOM', 45, y, { width: 35, align: 'center' });
    doc.text('STATUS', 80, y, { width: 40, align: 'center' });
    doc.text('TIME IN', 120, y, { width: 35, align: 'center' });
    doc.text('TIME OUT', 155, y, { width: 35, align: 'center' });
    doc.text('SHEET\nTWIN', 190, y, { width: 30, align: 'center' });
    doc.text('SHEET\nKING', 220, y, { width: 30, align: 'center' });
    doc.text('DUVET\nTWIN', 250, y, { width: 30, align: 'center' });
    doc.text('DUVET\nKING', 280, y, { width: 30, align: 'center' });
    doc.text('BATH\nTOWEL', 310, y, { width: 30, align: 'center' });
    doc.text('HAND\nTOWEL', 340, y, { width: 30, align: 'center' });
    doc.text('BATH\nMAT', 370, y, { width: 30, align: 'center' });
    doc.text('PILLOW\nCASE', 400, y, { width: 30, align: 'center' });
    doc.text('SHAMPOO', 430, y, { width: 35, align: 'center' });
    doc.text('SOAP', 465, y, { width: 25, align: 'center' });
    doc.text('SHOWER\nGEL', 490, y, { width: 25, align: 'center' });
    doc.text('SHOWER\nCAP', 515, y, { width: 25, align: 'center' });
    doc.text('DENTAL\nKIT', 540, y, { width: 30, align: 'center' });
    doc.text('SUGAR', 570, y, { width: 30, align: 'center' });
    doc.text('TEA', 600, y, { width: 25, align: 'center' });
    doc.text('COFFEE', 625, y, { width: 35, align: 'center' });
    doc.text('CREAMER', 660, y, { width: 35, align: 'center' });
    doc.text('MINERAL\nWATER', 695, y, { width: 35, align: 'center' });

    y += 25;
    doc.moveTo(20, y).lineTo(730, y).stroke();
    y += 8;

    // Isi Data
    doc.fontSize(9).font('Helvetica');
    data.forEach((row, idx) => {
      if (y > 520) { doc.addPage(); y = 40; }
      doc.text(String(idx + 1), 20, y, { width: 25, align: 'center' });
      doc.text(row.kamar, 45, y, { width: 35, align: 'center' });
      doc.text(row.status_awal, 80, y, { width: 40, align: 'center' });
      doc.text(row.waktu_masuk, 120, y, { width: 35, align: 'center' });
      doc.text(row.waktu_keluar, 155, y, { width: 35, align: 'center' });
      doc.text(String(row.sheet_twin || 0), 190, y, { width: 30, align: 'center' });
      doc.text(String(row.sheet_king || 0), 220, y, { width: 30, align: 'center' });
      doc.text(String(row.duvet_twin || 0), 250, y, { width: 30, align: 'center' });
      doc.text(String(row.duvet_king || 0), 280, y, { width: 30, align: 'center' });
      doc.text(String(row.bath_towel || 0), 310, y, { width: 30, align: 'center' });
      doc.text(String(row.hand_towel || 0), 340, y, { width: 30, align: 'center' });
      doc.text(String(row.bath_mat || 0), 370, y, { width: 30, align: 'center' });
      doc.text(String(row.pillow_case || 0), 400, y, { width: 30, align: 'center' });
      doc.text(String(row.shampoo || 0), 430, y, { width: 35, align: 'center' });
      doc.text(String(row.soap || 0), 465, y, { width: 25, align: 'center' });
      doc.text(String(row.shower_gel || 0), 490, y, { width: 25, align: 'center' });
      doc.text(String(row.shower_cap || 0), 515, y, { width: 25, align: 'center' });
      doc.text(String(row.dental_kit || 0), 540, y, { width: 30, align: 'center' });
      doc.text(String(row.sugar || 0), 570, y, { width: 30, align: 'center' });
      doc.text(String(row.tea || 0), 600, y, { width: 25, align: 'center' });
      doc.text(String(row.coffee || 0), 625, y, { width: 35, align: 'center' });
      doc.text(String(row.creamer || 0), 660, y, { width: 35, align: 'center' });
      doc.text(String(row.mineral || 0), 695, y, { width: 35, align: 'center' });
      y += 15;
    });

    // Keterangan Status & Tanda Tangan
    y += 15;
    doc.fontSize(8);
    doc.text('KETERANGAN STATUS:', 20, y);
    y += 12;
    doc.text('VD = Vacant Dirty   |   VC = Vacant Clean   |   OD = Occupied Dirty   |   OC = Occupied Clean   |   VCU = Vacant Clean Unchecked', 20, y);
    y += 12;
    doc.text('OOO = Out of Order   |   OM = House Use   |   DND = Do Not Disturb   |   ED = Expected Departure   |   EA = Expected Arrival', 20, y);
    y += 20;
    doc.text('PREPARED BY: ________________________        CHECKED BY: ________________________', 20, y);

    doc.end();
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.listen(PORT, () => console.log(`✅ Server berjalan di port ${PORT}`));
