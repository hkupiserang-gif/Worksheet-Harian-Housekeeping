const express = require('express');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { parse } = require('json2csv');
const PDFDocument = require('pdfkit');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 8888;

// ======================================
// ✅ ZONA WAKTU PAKSA WIB
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
// ✅ DAFTAR HARGA BARANG
// ======================================
const HARGA_BARANG = {
  sheet_twin: 2750,
  sheet_king: 2950,
  duvet_twin: 4750,
  duvet_king: 6250,
  bath_towel: 2850,
  hand_towel: 1750,
  bath_mat: 2250,
  pillow_case: 1750,
  shower_cap: 600,
  dental_kit: 1450,
  laundry_bag: 1150,
  laundry_list: 150,
  dnd_sign: 0,
  magic: 0,
  shoe: 0,
  sugar: 155,
  tea: 471,
  coffee: 665,
  creamer: 212,
  mineral: 2146,
  tissue_facial: 9400,
  tissue_roll: 1443,
  cotton_bud: 460,
  slipper: 2500,
  comb: 750,
  shaving_kit: 2620,
  stirer: 1400,
  coster: 350,
  poly_bag_kecil: 19500,
  poly_bag_besar: 19500,
  pensil: 1200,
  note_pad: 500
};

// ======================================
// ✅ KONEKSI DATABASE (AMAN UNTUK RAILWAY)
// ======================================
const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH 
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'database.db')
  : './database.db';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ Koneksi DB gagal:", err.message);
  else console.log("✅ Terhubung ke SQLite di:", dbPath);
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
        ['324','Lantai 3C','Deluxe'],['412','Lantai 4C','Deluxe'],['413','Lantai 4C','Deluxe'],
        ['414','Lantai 4C','Deluxe'],['415','Lantai 4C','Deluxe'],['416','Lantai 4C','Deluxe'],
        ['417','Lantai 4C','Deluxe'],['418','Lantai 4C','Deluxe'],['419','Lantai 4C','Deluxe'],
        ['420','Lantai 4C','Deluxe'],['421','Lantai 4C','Deluxe'],['422','Lantai 4C','Deluxe'],
        ['423','Lantai 4C','Deluxe'],['424','Lantai 4C','Deluxe'],['401','Lantai 4A','Junior Suite'],['402','Lantai 4A','Junior Suite'],
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

  // ✅ Tabel Tugas + Kolom Notifikasi
  db.run(`CREATE TABLE IF NOT EXISTS tugas (
    tanggal TEXT,
    kamar TEXT,
    petugas TEXT,
    status_awal TEXT DEFAULT 'VD',
    selesai INTEGER DEFAULT 0,
    sudah_dibagikan INTEGER DEFAULT 0,
    siap_dicek INTEGER DEFAULT 0,
    PRIMARY KEY (tanggal, kamar)
  )`);

  // Tambah kolom jika belum ada
  db.run(`ALTER TABLE tugas ADD COLUMN sudah_dibagikan INTEGER DEFAULT 0`, () => {});
  db.run(`ALTER TABLE tugas ADD COLUMN siap_dicek INTEGER DEFAULT 0`, () => {});

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
    tissue_facial INTEGER DEFAULT 0,
    tissue_roll INTEGER DEFAULT 0,
    cotton_bud INTEGER DEFAULT 0,
    slipper INTEGER DEFAULT 0,
    comb INTEGER DEFAULT 0,
    shaving_kit INTEGER DEFAULT 0,
    stirer INTEGER DEFAULT 0,
    coster INTEGER DEFAULT 0,
    poly_bag_kecil INTEGER DEFAULT 0,
    poly_bag_besar INTEGER DEFAULT 0,
    pensil INTEGER DEFAULT 0,
    note_pad INTEGER DEFAULT 0,
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
// ✅ OTOMATIS GANTI HARI JAM 00:00
// ======================================
const buatTugasBaruHariIni = () => {
  const tanggalSekarang = getTanggalWIB();
  console.log(`⏳ Memeriksa tugas untuk: ${tanggalSekarang}`);

  db.get(`SELECT 1 FROM tugas WHERE tanggal = ? LIMIT 1`, [tanggalSekarang], (err, ada) => {
    if (!ada) {
      console.log(`📅 Membuat tugas baru: ${tanggalSekarang}`);
      db.all(`SELECT nomor_kamar FROM kamar WHERE aktif = 1`, [], (err, daftarKamar) => {
        if (err) return console.error("❌ Gagal ambil kamar:", err);
        daftarKamar.forEach(k => {
          db.run(`INSERT OR IGNORE INTO tugas 
            (tanggal, kamar, petugas, status_awal, selesai, sudah_dibagikan, siap_dicek)
            VALUES (?, ?, '', 'VD', 0, 0, 0)`, [tanggalSekarang, k.nomor_kamar]);
        });
      });
    }
  });
};

// Jalankan setiap jam 00:00 WIB
cron.schedule('0 0 * * *', buatTugasBaruHariIni, { timezone: "Asia/Jakarta" });
// Jalankan sekali saat server mulai
buatTugasBaruHariIni();

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
      // Ambil kamar yang BELUM dibagikan
      let queryBelum = `
        SELECT t.*, k.lantai, k.tipe_kamar,
               IFNULL(l.waktu_masuk, '-') AS waktu_masuk,
               IFNULL(l.waktu_keluar, '-') AS waktu_keluar
        FROM tugas t
        JOIN kamar k ON t.kamar = k.nomor_kamar
        LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
        WHERE t.tanggal = ? AND t.sudah_dibagikan = 0
      `;
      const paramBelum = [cariTanggal];
      if (cariKamar) { queryBelum += ` AND t.kamar = ?`; paramBelum.push(cariKamar); }
      queryBelum += ` ORDER BY t.kamar`;

      // Ambil kamar yang SUDAH dibagikan, dikelompokkan per RA
      let querySudah = `
        SELECT t.*, k.lantai, k.tipe_kamar,
               IFNULL(l.waktu_masuk, '-') AS waktu_masuk,
               IFNULL(l.waktu_keluar, '-') AS waktu_keluar
        FROM tugas t
        JOIN kamar k ON t.kamar = k.nomor_kamar
        LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
        WHERE t.tanggal = ? AND t.sudah_dibagikan = 1
      `;
      const paramSudah = [cariTanggal];
      if (cariKamar) { querySudah += ` AND t.kamar = ?`; paramSudah.push(cariKamar); }
      querySudah += ` ORDER BY t.petugas, t.kamar`;

      db.all(queryBelum, paramBelum, (err, daftarBelumDibagikan) => {
        db.all(querySudah, paramSudah, (err, daftarSudahDibagikan) => {
          // Kelompokkan per RA
          const perRA = {};
          daftarSudahDibagikan.forEach(tugas => {
            if (!perRA[tugas.petugas]) perRA[tugas.petugas] = [];
            perRA[tugas.petugas].push(tugas);
          });

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
              daftarBelumDibagikan,
              daftarSudahDibagikan: perRA,
              daftarPermintaan,
              pesan: res.locals.pesan
            });
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
    db.run(`INSERT OR REPLACE INTO tugas 
      (tanggal, kamar, petugas, status_awal, selesai, sudah_dibagikan, siap_dicek) 
      VALUES (?, ?, ?, ?, ?, 1, 0)`, 
      [tanggal, k, petugas, status, 0], 
      () => { if (++selesai === total) res.redirect('/spv?pesan=berhasil'); }
    );
  });
});

// ======================================
// ✅ HALAMAN RA
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
           IFNULL(l.mineral, 0) AS mineral,
           IFNULL(l.tissue_facial, 0) AS tissue_facial,
           IFNULL(l.tissue_roll, 0) AS tissue_roll,
           IFNULL(l.cotton_bud, 0) AS cotton_bud,
           IFNULL(l.slipper, 0) AS slipper,
           IFNULL(l.comb, 0) AS comb,
           IFNULL(l.shaving_kit, 0) AS shaving_kit,
           IFNULL(l.stirer, 0) AS stirer,
           IFNULL(l.coster, 0) AS coster,
           IFNULL(l.poly_bag_kecil, 0) AS poly_bag_kecil,
           IFNULL(l.poly_bag_besar, 0) AS poly_bag_besar,
           IFNULL(l.pensil, 0) AS pensil,
           IFNULL(l.note_pad, 0) AS note_pad
    FROM tugas t
    LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
    WHERE t.tanggal = ? AND t.petugas = ? AND t.sudah_dibagikan = 1 ORDER BY t.kamar
  `, [hariIni, req.session.user.nama], (err, daftarTugas) => {
    res.render('ra', { 
      user: req.session.user, 
      tanggal: hariIni, 
      tugas: daftarTugas, 
      pesan: res.locals.pesan,
      waktuSekarang: getWaktuWIB()
    });
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
    magic, shoe, sugar, tea, coffee, creamer, mineral,
    tissue_facial, tissue_roll, cotton_bud, slipper, comb,
    shaving_kit, stirer, coster, poly_bag_kecil, poly_bag_besar,
    pensil, note_pad } = req.body;
  const waktuKeluar = getWaktuWIBJamMenit();

  db.run(`
    INSERT OR REPLACE INTO laporan (
      tanggal, nomor_kamar, waktu_masuk, waktu_keluar,
      sheet_twin, sheet_king, duvet_twin, duvet_king,
      bath_towel, hand_towel, bath_mat, pillow_case,
      shampoo, soap, shower_gel, shower_cap, dental_kit,
      laundry_bag, laundry_list, dnd_sign,
      magic, shoe, sugar, tea, coffee, creamer, mineral,
      tissue_facial, tissue_roll, cotton_bud, slipper, comb,
      shaving_kit, stirer, coster, poly_bag_kecil, poly_bag_besar,
      pensil, note_pad, petugas
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    tanggal, kamar, waktu_masuk, waktuKeluar,
    sheet_twin||0, sheet_king||0, duvet_twin||0, duvet_king||0,
    bath_towel||0, hand_towel||0, bath_mat||0, pillow_case||0,
    shampoo||0, soap||0, shower_gel||0, shower_cap||0, dental_kit||0,
    laundry_bag||0, laundry_list||0, dnd_sign||0,
    magic||0, shoe||0, sugar||0, tea||0, coffee||0, creamer||0, mineral||0,
    tissue_facial||0, tissue_roll||0, cotton_bud||0, slipper||0, comb||0,
    shaving_kit||0, stirer||0, coster||0, poly_bag_kecil||0, poly_bag_besar||0,
    pensil||0, note_pad||0,
    req.session.user.nama
  ], err => {
    if (err) return console.error(err);

    db.get(`SELECT status_awal FROM tugas WHERE tanggal = ? AND kamar = ?`, [tanggal, kamar], (err, data) => {
      if (err) return console.error(err);
      let statusBaru = data.status_awal;

      if (data.status_awal === 'VD' || data.status_awal === 'VCU') statusBaru = 'VC';
      else if (data.status_awal === 'OD') statusBaru = 'OC';

      db.run(`UPDATE tugas SET status_awal = ?, selesai = 1, siap_dicek = 1 WHERE tanggal = ? AND kamar = ?`,
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
    if (err) return res.redirect('/?pesan=gagal');
    db.all(`SELECT * FROM permintaan_tamu WHERE tanggal = ? ORDER BY waktu_masuk DESC, id DESC`, [hariIni], (err, daftarPermintaan) => {
      if (err) return res.redirect('/?pesan=gagal');
      res.render('ot', {
        user: req.session.user,
        tanggal: hariIni,
        daftarKamar: daftarKamar,
        daftarPermintaan: daftarPermintaan,
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

  db.run(`INSERT INTO permintaan_tamu 
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
    [status, waktuSelesai, id],
    err => err ? res.redirect('/ot?pesan=gagal') : res.redirect('/ot?pesan=berhasil')
  );
});

app.post('/hapus-permintaan', (req, res) => {
  db.run(`DELETE FROM permintaan_tamu WHERE id = ?`, [req.body.id], err => 
    err ? res.redirect('/ot?pesan=gagal') : res.redirect('/ot?pesan=berhasil')
  );
});

app.get('/unduh-pdf-ot', (req, res) => {
  const tanggal = req.query.tanggal || getTanggalWIB();
  db.all(`SELECT nomor_kamar, jenis_permintaan, keterangan, status, waktu_masuk, waktu_selesai, dibuat_oleh
     FROM permintaan_tamu WHERE tanggal = ? ORDER BY waktu_masuk DESC`,
    [tanggal], (err, data) => {
      if (err || !data || data.length === 0) return res.send('❌ Tidak ada data');
      const doc = new PDFDocument({ margin: 25, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Loan_Item_Today_${tanggal}.pdf`);
      doc.pipe(res);

      doc.fontSize(18).font('Helvetica-Bold').text('HORISON HOTEL & CONVENTION', { align: 'center' });
      doc.fontSize(14).text('Loan Item Today', { align: 'center', underline: true });
      doc.moveDown(1);
      doc.fontSize(11).text(`Tanggal: ${tanggal} | Dibuat: ${getWaktuWIB()} WIB`);
      doc.moveDown(1);

      doc.fontSize(10).font('Helvetica-Bold');
      let y = doc.y;
      doc.text('No', 25, y, { width: 30 });
      doc.text('Kamar', 55, y, { width: 50 });
      doc.text('Permintaan', 110, y, { width: 180 });
      doc.text('Masuk', 295, y, { width: 50 });
      doc.text('Status', 350, y, { width: 70 });
      doc.text('Selesai', 430, y, { width: 50 });

      y += 15; doc.moveTo(25, y).lineTo(520, y).stroke(); y += 8;
      doc.fontSize(10).font('Helvetica');
      data.forEach((row, i) => {
        if (y > 720) { doc.addPage(); y = 40; }
        doc.text(String(i+1), 25, y);
        doc.text(row.nomor_kamar, 55, y);
        doc.text(`${row.jenis_permintaan}${row.keterangan ? ` (${row.keterangan})` : ''}`, 110, y, { width: 170 });
        doc.text(row.waktu_masuk, 295, y);
        doc.text(row.status, 350, y);
        doc.text(row.waktu_selesai || '-', 430, y);
        y += 18;
      });
      doc.end();
    }
  );
});

// ======================================
// ✅ LAPORAN PDF SPV (DIPERBAIKI + RINCIAN + HARGA)
// ======================================
app.get('/unduh-pdf', (req, res) => {
  const tanggal = req.query.tanggal || getTanggalWIB();
  const ra = req.query.ra || null;

  let query = `
    SELECT t.*, k.lantai, k.tipe_kamar,
           IFNULL(l.waktu_masuk, '-') AS waktu_masuk,
           IFNULL(l.waktu_keluar, '-') AS waktu_keluar,
           l.*
    FROM tugas t
    JOIN kamar k ON t.kamar = k.nomor_kamar
    LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
    WHERE t.tanggal = ?
  `;
  const param = [tanggal];
  if (ra) { query += ` AND t.petugas = ?`; param.push(ra); }
  query += ` ORDER BY t.petugas, t.kamar`;

  db.all(query, param, (err, dataKamar) => {
    if (err || !dataKamar || dataKamar.length === 0) return res.send('❌ Tidak ada data');

    const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=LAPORAN_${ra ? 'RA_' + ra : 'KEBERSIHAN'}_${tanggal}.pdf`);
    doc.pipe(res);

    const judul = ra ? `Worksheet Room Attendant: ${ra}` : 'LAPORAN KONTROL KEBERSIHAN';
    doc.font('Helvetica-Bold').fontSize(18).text('HORISON HOTEL & CONVENTION', { align: 'center' });
    doc.fontSize(14).text(judul, { align: 'center', underline: true });
    doc.moveDown(1);
    doc.font('Helvetica').fontSize(11);
    doc.text(`Tanggal: ${tanggal} | Dibuat: ${getWaktuWIB()} WIB`);
    doc.moveDown(1);

    let totalBiaya = 0;
    let y = doc.y;

    dataKamar.forEach((row, idx) => {
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text(`Kamar: ${row.kamar} | Lantai: ${row.lantai} | Petugas: ${row.petugas || '-'}`, 20, y);
      y += 15;
      doc.font('Helvetica').fontSize(9);

      let biayaKamar = 0;
      const barangTerpakai = [];
      Object.keys(HARGA_BARANG).forEach(nama => {
        const jumlah = row[nama] || 0;
        if (jumlah > 0) {
          const sub = jumlah * HARGA_BARANG[nama];
          biayaKamar += sub;
          barangTerpakai.push(`${nama.replace('_', ' ')}: ${jumlah} x Rp ${HARGA_BARANG[nama].toLocaleString('id-ID')} = Rp ${sub.toLocaleString('id-ID')}`);
        }
      });

      if (barangTerpakai.length > 0) {
        barangTerpakai.forEach(item => {
          doc.text(item, 25, y);
          y += 12;
        });
      } else {
        doc.text('Tidak ada barang yang diambil', 25, y);
        y += 12;
      }

      doc.text(`Total Biaya Kamar: Rp ${biayaKamar.toLocaleString('id-ID')}`, 25, y, { bold: true });
      totalBiaya += biayaKamar;
      y += 20;

      if (y > 520) { doc.addPage(); y = 30; }
    });

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text(`TOTAL KESELURUHAN: Rp ${totalBiaya.toLocaleString('id-ID')}`, 20, y);
    doc.end();
  });
});

app.get('/unduh-excel', (req, res) => {
  const tanggal = req.query.tanggal || getTanggalWIB();
  const ra = req.query.ra || null;

  let query = `
    SELECT
      t.tanggal AS "Tanggal",
      t.kamar AS "No Kamar",
      k.lantai AS "Lantai",
      t.petugas AS "Nama Petugas",
      t.status_awal AS "Status Kamar",
      IFNULL(l.waktu_masuk, '-') AS "Jam Masuk",
      IFNULL(l.waktu_keluar, '-') AS "Jam Keluar"
  `;
  Object.keys(HARGA_BARANG).forEach(nama => {
    query += `, IFNULL(l.${nama}, 0) AS "${nama.replace('_', ' ')}"`;
  });
  query += `
    FROM tugas t
    JOIN kamar k ON t.kamar = k.nomor_kamar
    LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
    WHERE t.tanggal = ?
  `;
  const param = [tanggal];
  if (ra) { query += ` AND t.petugas = ?`; param.push(ra); }
  query += ` ORDER BY t.petugas, t.kamar`;

  db.all(query, param, (err, data) => {
    if (err || !data.length) return res.send('❌ Tidak ada data');
    const csv = parse(data, { delimiter: ';', quote: '"' });
    res.setHeader('Content-Disposition', `attachment; filename="Laporan_${ra ? 'RA_' + ra + '_' : ''}${tanggal}.csv"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send('\uFEFF' + csv);
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// ======================================
// ✅ JALANKAN SERVER
// ======================================
app.listen(PORT, () => console.log(`✅ Server berjalan di port ${PORT}`));
