const express = require('express');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { parse } = require('json2csv');
const PDFDocument = require('pdfkit');
const cron = require('node-cron'); // ✅ Tambahan untuk jadwal otomatis

const app = express();
const PORT = process.env.PORT || 8888;

// ======================================
// ✅ ZONA WAKTU PAKSA WIB (Asia/Jakarta)
// ======================================
process.env.TZ = 'Asia/Jakarta';

const getWaktuWIB = () => {
  const now = new Date();
  return now.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

const getWaktuWIBJamMenit = () => {
  const now = new Date();
  return now.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

const getTanggalWIB = () => {
  const now = new Date();
  return now.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).split('/').reverse().join('-');
};

// ======================================
// ✅ KONEKSI DATABASE & SEMUA TABEL
// ======================================
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error("❌ Koneksi DB gagal:", err.message);
  else console.log("✅ Terhubung ke SQLite");
});

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
    status_awal TEXT DEFAULT 'VD',
    selesai INTEGER DEFAULT 0,
    PRIMARY KEY (tanggal, kamar)
  )`);

  // Tabel Laporan Kebersihan
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
    tanggal TEXT,
    nomor_kamar TEXT,
    jenis_permintaan TEXT,
    keterangan TEXT,
    status TEXT DEFAULT 'Dipinjam Tamu',
    waktu_masuk TEXT,
    waktu_selesai TEXT,
    dibuat_oleh TEXT
  )`);
});

// ======================================
// ✅ FUNGSI: BUAT TUGAS OTOMATIS HARI INI
// ======================================
async function buatTugasHarianOtomatis() {
  const tanggal = getTanggalWIB();
  console.log(`🔄 Mengecek tugas untuk tanggal: ${tanggal}`);

  // Cek apakah tugas hari ini sudah ada
  db.get(`SELECT 1 FROM tugas WHERE tanggal = ? LIMIT 1`, [tanggal], (err, ada) => {
    if (err) return console.error("❌ Cek tugas gagal:", err.message);
    if (ada) return console.log(`✅ Tugas untuk ${tanggal} sudah tersedia`);

    // Jika belum ada, buat tugas baru untuk semua kamar aktif
    db.all(`SELECT nomor_kamar FROM kamar WHERE aktif = 1`, [], (err, daftarKamar) => {
      if (err || !daftarKamar.length) return console.error("❌ Tidak ada data kamar");

      const stmt = db.prepare(`INSERT OR IGNORE INTO tugas (tanggal, kamar, petugas, status_awal, selesai) VALUES (?, ?, '', 'VD', 0)`);
      daftarKamar.forEach(kamar => stmt.run(tanggal, kamar.nomor_kamar));
      stmt.finalize(() => console.log(`✅ Tugas otomatis dibuat untuk tanggal ${tanggal}`));
    });
  });
}

// ✅ Jalankan pengecekan setiap hari pukul 00:05 WIB
cron.schedule('5 0 * * *', () => {
  console.log("⏰ Menjalankan refresh tugas harian...");
  buatTugasHarianOtomatis();
}, {
  timezone: "Asia/Jakarta"
});

// Jalankan sekali saat server baru dinyalakan
buatTugasHarianOtomatis();

// ======================================
// ✅ KONFIGURASI APLIKASI
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
// ✅ HALAMAN LOGIN
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
    if (err) return res.render('login', { pesan: { tipe: 'error', teks: '❌ Kesalahan sistem' } });
    if (user && user.password === password) {
      req.session.user = { id: user.id, nama: user.nama, peran: user.peran };
      return res.redirect(user.peran === 'SPV' ? '/spv' : user.peran === 'RA' ? '/ra' : '/ot');
    }
    res.render('login', { pesan: { tipe: 'error', teks: '❌ Username atau Password salah' } });
  });
});

// ======================================
// ✅ HALAMAN SUPERVISOR
// ======================================
app.get('/spv', (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  const hariIni = getTanggalWIB();
  const cariTanggal = req.query.tanggal || hariIni;
  const cariKamar = req.query.kamar || '';

  db.all(`SELECT nomor_kamar, lantai, tipe_kamar FROM kamar WHERE aktif = 1 ORDER BY nomor_kamar`, [], (err, daftarKamar) => {
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
            daftarPermintaan: daftarPermintaan || [],
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
  const daftarStatus = Array.isArray(status_awal) ? status_awal : [status_awal || 'VD'];
  
  let selesai = 0;
  const total = daftarKamar.length;

  if (total === 0) return res.redirect('/spv?pesan=gagal');

  daftarKamar.forEach((k, idx) => {
    const status = daftarStatus[idx] || 'VD';
    db.run(`INSERT OR REPLACE INTO tugas (tanggal, kamar, petugas, status_awal, selesai) VALUES (?, ?, ?, ?, ?)`, 
      [tanggal, k, petugas, status, 0], 
      (err) => { if (++selesai === total) res.redirect('/spv?pesan=berhasil'); }
    );
  });
});

// ======================================
// ✅ HALAMAN RA + PERUBAHAN STATUS OTOMATIS
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
    res.render('ra', { 
      user: req.session.user, 
      tanggal: hariIni, 
      tugas: daftarTugas || [], 
      pesan: res.locals.pesan,
      waktuSekarang: getWaktuWIB()
    });
  });
});

app.post('/mulai-kamar', (req, res) => {
  const waktuMasuk = getWaktuWIBJamMenit();
  db.run(`INSERT OR REPLACE INTO laporan (tanggal, nomor_kamar, waktu_masuk, petugas) VALUES (?, ?, ?, ?)`,
    [req.body.tanggal, req.body.kamar, waktuMasuk, req.session.user.nama], err => {
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
    db.get(`SELECT status_awal FROM tugas WHERE tanggal = ? AND kamar = ?`, [tanggal, kamar], (err, data) => {
      let statusBaru = data.status_awal;
      if (data.status_awal === 'VD' || data.status_awal === 'VCU') statusBaru = 'VC';
      else if (data.status_awal === 'OD') statusBaru = 'OC';

      db.run(`UPDATE tugas SET status_awal = ?, selesai = 1 WHERE tanggal = ? AND kamar = ?`,
        [statusBaru, tanggal, kamar], () => res.redirect('/ra?pesan=berhasil'));
    });
  });
});

// ======================================
// ✅ HALAMAN OT
// ======================================
app.get('/ot', (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'OT') return res.redirect('/');
  const hariIni = getTanggalWIB();
  
  db.all(`SELECT nomor_kamar, lantai, tipe_kamar FROM kamar WHERE aktif = 1 ORDER BY nomor_kamar`, [], (err, daftarKamar) => {
    db.all(`SELECT * FROM permintaan_tamu WHERE tanggal = ? ORDER BY waktu_masuk DESC, id DESC`, [hariIni], (err, daftarPermintaan) => {
      res.render('ot', {
        user: req.session.user,
        tanggal: hariIni,
        daftarKamar: daftarKamar,
        daftarPermintaan: daftarPermintaan || [],
        pesan: res.locals.pesan,
        waktuSekarang: getWaktuWIB(),
        waktuSingkat: getWaktuWIBJamMenit()
      });
    });
  });
});

app.post('/tambah-permintaan', (req, res) => {
  const { nomor_kamar, jenis_permintaan, keterangan } = req.body;
  const hariIni = getTanggalWIB();
  const waktuMasuk = getWaktuWIBJamMenit();

  if (!nomor_kamar || !jenis_permintaan) return res.redirect('/ot?pesan=gagal');

  db.run(`
    INSERT INTO permintaan_tamu 
      (tanggal, nomor_kamar, jenis_permintaan, keterangan, waktu_masuk, dibuat_oleh, status)
     VALUES (?, ?, ?, ?, ?, ?, 'Dipinjam Tamu')`,
    [hariIni, nomor_kamar, jenis_permintaan, keterangan || '', waktuMasuk, req.session.user.nama],
    err => err ? res.redirect('/ot?pesan=gagal') : res.redirect('/ot?pesan=berhasil')
  );
});

app.post('/ubah-status-permintaan', (req, res) => {
  const { id, status } = req.body;
  const waktuSelesai = status === 'Dikembalikan' ? getWaktuWIBJamMenit() : null;
  db.run(`UPDATE permintaan_tamu SET status = ?, waktu_selesai = ? WHERE id = ?`,
    [status, waktuSelesai, id], err => res.redirect('/ot?pesan=berhasil')
  );
});

app.post('/hapus-permintaan', (req, res) => {
  db.run(`DELETE FROM permintaan_tamu WHERE id = ?`, [req.body.id], err => res.redirect('/ot?pesan=berhasil'));
});

app.get('/unduh-pdf-ot', (req, res) => {
  const tanggal = req.query.tanggal || getTanggalWIB();
  db.all(`SELECT nomor_kamar, jenis_permintaan, keterangan, status, waktu_masuk, waktu_selesai, dibuat_oleh FROM permintaan_tamu WHERE tanggal = ? ORDER BY waktu_masuk DESC`, [tanggal], (err, data) => {
    if (!data || data.length === 0) return res.send('❌ Tidak ada data');

    const doc = new PDFDocument({ margin: 25, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=LAPORAN_PERMINTAAN_TAMU_${tanggal}.pdf`);
    doc.pipe(res);

    doc.fontSize(18).font('Helvetica-Bold').text('HORISON HOTEL & CONVENTION', { align: 'center' });
    doc.fontSize(14).text('LAPORAN PERMINTAAN TAMU', { align: 'center', underline: true });
    doc.moveDown(1);
    doc.fontSize(11).text(`Tanggal: ${tanggal}`);
    doc.text(`Dibuat Pada: ${getWaktuWIB()} WIB`);
    doc.moveDown(1);

    let y = doc.y;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('No', 25, y, { width: 30 });
    doc.text('Kamar', 55, y, { width: 50 });
    doc.text('Permintaan', 110, y, { width: 180 });
    doc.text('Masuk', 295, y, { width: 50 });
    doc.text('Status', 350, y, { width: 80 });
    doc.text('Selesai', 430, y, { width: 50 });

    y += 18;
    doc.moveTo(25, y).lineTo(520, y).stroke();
    y += 8;

    doc.font('Helvetica').fontSize(10);
    data.forEach((row, i) => {
      if (y > 720) { doc.addPage(); y = 40; }
      doc.text(String(i + 1), 25, y, { width: 30 });
      doc.text(row.nomor_kamar, 55, y, { width: 50 });
      doc.text(`${row.jenis_permintaan}${row.keterangan ? ` (${row.keterangan})` : ''}`, 110, y, { width: 180 });
      doc.text(row.waktu_masuk, 295, y, { width: 50 });
      doc.text(row.status, 350, y, { width: 80 });
      doc.text(row.waktu_selesai || '-', 430, y, { width: 50 });
      y += 18;
    });

    doc.end();
  });
});

app.get('/unduh-pdf', (req, res) => {
  const tanggal = req.query.tanggal || getTanggalWIB();
  db.all(`
    SELECT t.kamar, t.petugas, t.status_awal, k.lantai, k.tipe_kamar,
           IFNULL(l.waktu_masuk, '-') AS waktu_masuk, IFNULL(l.waktu_keluar, '-') AS waktu_keluar
    FROM tugas t JOIN kamar k ON t.kamar = k.nomor_kamar
    LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
    WHERE t.tanggal = ? ORDER BY t.kamar
  `, [tanggal], (err, dataKamar) => {
    if (!dataKamar || dataKamar.length === 0) return res.send('❌ Tidak ada data');

    const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=LAPORAN_HARIAN_${tanggal}.pdf`);
    doc.pipe(res);

    doc.font('Helvetica-Bold').fontSize(18).text('HORISON HOTEL & CONVENTION', { align: 'center' });
    doc.fontSize(14).text('LAPORAN KONTROL KEBERSIHAN', { align: 'center', underline: true });
    doc.moveDown(1);
    doc.font('Helvetica').fontSize(11).text(`Tanggal: ${tanggal} | Dibuat: ${getWaktuWIB()} WIB`);
    doc.moveDown(1);

    let y = doc.y;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('No', 20, y, { width: 25, align: 'center' });
    doc.text('Kamar', 45, y, { width: 40, align: 'center' });
    doc.text('Lantai', 85, y, { width: 55, align: 'center' });
    doc.text('Status', 140, y, { width: 40, align: 'center' });
    doc.text('Petugas', 180, y, { width: 80, align: 'center' });
    doc.text('Masuk', 260, y, { width: 50, align: 'center' });
    doc.text('Keluar', 310, y, { width: 55, align: 'center' });
    doc.text('Status Kerja', 365, y, { width: 70, align: 'center' });

    y += 18;
    doc.moveTo(20, y).lineTo(570, y).stroke();
    y += 8;

    doc.font('Helvetica').fontSize(9);
    dataKamar.forEach((row, i) => {
      if (y > 520) { doc.addPage(); y = 30; }
      const statusKerja = row.waktu_keluar !== '-' ? 'Selesai' : 'Belum';
      doc.text(String(i + 1), 20, y, { width: 25, align: 'center' });
      doc.text(row.kamar, 45, y, { width: 40, align: 'center' });
      doc.text(row.lantai, 85, y, { width: 55, align: 'center' });
      doc.text(row.status_awal, 140, y, { width: 40, align: 'center' });
      doc.text(row.petugas || '-', 180, y, { width: 80, align: 'left' });
      doc.text(row.waktu_masuk, 260, y, { width: 50, align: 'center' });
      doc.text(row.waktu_keluar, 310, y, { width: 55, align: 'center' });
      doc.text(statusKerja, 365, y, { width: 70, align: 'center' });
      y += 14;
    });

    doc.end();
  });
});

app.get('/unduh-excel', (req, res) => {
  const tanggal = req.query.tanggal || getTanggalWIB();
  db.all(`
    SELECT t.tanggal AS "Tanggal", t.kamar AS "No Kamar", k.lantai AS "Lantai",
           t.petugas AS "Petugas", t.status_awal AS "Status",
           IFNULL(l.waktu_masuk, '-') AS "Jam Masuk", IFNULL(l.waktu_keluar, '-') AS "Jam Keluar",
           CASE WHEN t.selesai=1 THEN 'Selesai' ELSE 'Belum' END AS "Status Kerja"
    FROM tugas t JOIN kamar k ON t.kamar = k.nomor_kamar
    LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
    WHERE t.tanggal = ? ORDER BY t.kamar
  `, [tanggal], (err, data) => {
    if (!data || data.length === 0) return res.send('❌ Tidak ada data');
    const csv = parse(data, { delimiter: ';', quote: '"' });
    res.setHeader('Content-Disposition', `attachment; filename=Laporan_${tanggal}.csv`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send('\uFEFF' + csv);
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ======================================
// ✅ JALANKAN SERVER
// ======================================
app.listen(PORT, () => console.log(`✅ Server berjalan di port ${PORT}`));
