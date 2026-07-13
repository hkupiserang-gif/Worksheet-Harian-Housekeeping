const express = require('express');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { parse } = require('json2csv');
const PDFDocument = require('pdfkit');
const cron = require('node-cron');
const ExcelJS = require('exceljs');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8888;

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

// Daftar field amenitas untuk query dinamis
const AMENITY_FIELDS = [
  'sheet_twin', 'sheet_king', 'duvet_twin', 'duvet_king',
  'bath_towel', 'hand_towel', 'bath_mat', 'pillow_case',
  'shower_cap', 'dental_kit',
  'laundry_bag', 'laundry_list',
  'dnd_sign',
  'magic', 'shoe', 'sugar', 'tea', 'coffee', 'creamer', 'mineral',
  'tissue_facial', 'tissue_roll',
  'cotton_bud',
  'slipper',
  'comb',
  'shaving_kit',
  'stirer',
  'coster',
  'poly_bag_kecil', 'poly_bag_besar',
  'pensil', 'note_pad'
];

const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH 
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'database.db')
  : './database.db';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ Koneksi DB gagal:", err.message);
  else console.log("✅ Terhubung ke SQLite di:", dbPath);
});

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
        ['324','Lantai 3C','Deluxe'],['412','Lantai 4C','Deluxe'],['413','Lantai 4C','Deluxe'],
        ['414','Lantai 4C','Deluxe'],['415','Lantai 4C','Deluxe'],['416','Lantai 4C','Deluxe'],
        ['417','Lantai 4C','Deluxe'],['418','Lantai 4C','Deluxe'],['419','Lantai 4C','Deluxe'],
        ['420','Lantai 4C','Deluxe'],['421','Lantai 4C','Deluxe'],['422','Lantai 4C','Deluxe'],
        ['423','Lantai 4C','Deluxe'],['424','Lantai 4C','Deluxe'],['401','Lantai 4A','Junior Suite'],
        ['402','Lantai 4A','Junior Suite'],['403','Lantai 4A','Premium Deluxe'],['404','Lantai 4A','Deluxe'],['405','Lantai 4A','Premium Deluxe'],
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
    } else {
      db.run(`INSERT OR IGNORE INTO kamar (nomor_kamar, lantai, tipe_kamar, aktif) VALUES ('514', 'Lantai 5C', 'Deluxe', 1)`);
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS tugas (
    tanggal TEXT,
    kamar TEXT,
    petugas TEXT,
    status_awal TEXT DEFAULT 'VD',
    status_hk_in TEXT DEFAULT '',
    status_hk_out TEXT DEFAULT '',
    selesai INTEGER DEFAULT 0,
    sudah_dibagikan INTEGER DEFAULT 0,
    siap_dicek INTEGER DEFAULT 0,
    PRIMARY KEY (tanggal, kamar),
    FOREIGN KEY (kamar) REFERENCES kamar(nomor_kamar) ON DELETE CASCADE
  )`);

  db.run(`ALTER TABLE tugas ADD COLUMN sudah_dibagikan INTEGER DEFAULT 0`, () => {});
  db.run(`ALTER TABLE tugas ADD COLUMN siap_dicek INTEGER DEFAULT 0`, () => {});
  db.run(`ALTER TABLE tugas ADD COLUMN status_hk_in TEXT DEFAULT ''`, () => {});
  db.run(`ALTER TABLE tugas ADD COLUMN status_hk_out TEXT DEFAULT ''`, () => {});

  // ✅ FIX: Data laporan aman, tidak terhapus saat restart server
  db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='laporan'`, (err, row) => {
    if (!row) {
      const amenityCols = AMENITY_FIELDS.map(f => `${f} INTEGER DEFAULT 0`).join(',\n      ');
      db.run(`CREATE TABLE laporan (
        tanggal TEXT,
        nomor_kamar TEXT,
        waktu_masuk TEXT,
        waktu_keluar TEXT,
        ${amenityCols},
        petugas TEXT,
        PRIMARY KEY (tanggal, nomor_kamar),
        FOREIGN KEY (nomor_kamar) REFERENCES kamar(nomor_kamar) ON DELETE CASCADE
      )`);
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS permintaan_tamu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT,
    nomor_kamar TEXT,
    jenis_permintaan TEXT,
    keterangan TEXT,
    status TEXT DEFAULT 'Dipinjam Tamu',
    waktu_masuk TEXT,
    waktu_selesai TEXT,
    dibuat_oleh TEXT,
    FOREIGN KEY (nomor_kamar) REFERENCES kamar(nomor_kamar) ON DELETE CASCADE
  )`);
});

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
            (tanggal, kamar, petugas, status_awal, status_hk_in, status_hk_out, selesai, sudah_dibagikan, siap_dicek)
            VALUES (?, ?, '', 'VD', '', '', 0, 0, 0)`, [tanggalSekarang, k.nomor_kamar]);
        });
      });
    }
  });
};

cron.schedule('0 0 * * *', buatTugasBaruHariIni, { timezone: "Asia/Jakarta" });
buatTugasBaruHariIni();

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

app.get('/spv', (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  const hariIni = getTanggalWIB();
  const cariTanggal = req.query.tanggal || hariIni;
  const cariKamar = req.query.kamar || '';

  db.all(`SELECT nomor_kamar, lantai, tipe_kamar FROM kamar WHERE aktif = 1 ORDER BY nomor_kamar`, [], (err, daftarKamar) => {
    db.all(`SELECT nama FROM pengguna WHERE peran = 'RA' AND aktif = 1 ORDER BY nama`, [], (err, daftarRA) => {

      let querySudah = `
        SELECT t.*, k.lantai, k.tipe_kamar,
               IFNULL(l.waktu_masuk, '-') AS waktu_masuk,
               IFNULL(l.waktu_keluar, '-') AS waktu_keluar
        FROM tugas t
        JOIN kamar k ON t.kamar = k.nomor_kamar
        LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
        WHERE t.tanggal = ? 
          AND (t.sudah_dibagikan = 1 OR t.sudah_dibagikan IS NULL OR t.sudah_dibagikan = 0)
      `;
      const paramSudah = [cariTanggal];
      if (cariKamar) { querySudah += ` AND t.kamar = ?`; paramSudah.push(cariKamar); }
      querySudah += ` ORDER BY t.petugas, t.kamar`;

      db.all(querySudah, paramSudah, (err, daftarSudahDibagikan) => {
        const perRA = {};
        daftarSudahDibagikan.forEach(tugas => {
          if (tugas.petugas && tugas.petugas !== '') {
            if (!perRA[tugas.petugas]) perRA[tugas.petugas] = [];
            perRA[tugas.petugas].push(tugas);
          }
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
            daftarSudahDibagikan: perRA,
            daftarPermintaan,
            pesan: res.locals.pesan,
            daftarStatus: [
              {kode:'VD', nama:'Vacant Dirty'},
              {kode:'VCU', nama:'Vacant Clean Unchecked'},
              {kode:'OD', nama:'Occupied Dirty'},
              {kode:'ED', nama:'Expected Departure'}
            ]
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

  const tempatkanTugas = () => {
    daftarKamar.forEach((k, idx) => {
      const status = daftarStatus[idx] || 'VD';
      db.run(`INSERT OR REPLACE INTO tugas 
        (tanggal, kamar, petugas, status_awal, status_hk_in, status_hk_out, selesai, sudah_dibagikan, siap_dicek) 
        VALUES (?, ?, ?, ?, '', '', 0, 1, 0)`, 
        [tanggal, k, petugas, status], 
        () => { if (++selesai === total) res.redirect('/spv?pesan=berhasil'); }
      );
    });
  };

  db.all(`SELECT nomor_kamar FROM kamar WHERE nomor_kamar IN (${daftarKamar.map(() => '?').join(',')})`, daftarKamar, (err, hasil) => {
    if (hasil.length !== daftarKamar.length) {
      return res.redirect('/spv?pesan=gagal&teks=Ada kamar yang tidak terdaftar');
    }
    tempatkanTugas();
  });
});

app.get('/ra', (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'RA') return res.redirect('/');
  const hariIni = getTanggalWIB();

  // Build amenity select columns dynamically
  const amenitySelects = AMENITY_FIELDS.map(f => `IFNULL(l.${f}, 0) AS ${f}`).join(',\n           ');

  db.all(`
    SELECT t.*,
           IFNULL(l.waktu_masuk, '-') AS waktu_masuk,
           IFNULL(l.waktu_keluar, '-') AS waktu_keluar,
           ${amenitySelects}
    FROM tugas t
    JOIN kamar k ON t.kamar = k.nomor_kamar
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
  const { tanggal, kamar } = req.body;

  db.get(`SELECT status_awal FROM tugas WHERE tanggal = ? AND kamar = ?`, [tanggal, kamar], (err, data) => {
    if (err) {
      console.error('❌ Error SELECT tugas:', err.message);
      return res.redirect('/ra?pesan=gagal');
    }
    if (!data) {
      console.error('❌ Tugas tidak ditemukan:', tanggal, kamar);
      return res.redirect('/ra?pesan=gagal');
    }

    let hkIn = '';
    if (data.status_awal === 'VD' || data.status_awal === 'ED') hkIn = 'VD';
    else if (data.status_awal === 'VCU') hkIn = 'VCU';
    else if (data.status_awal === 'OD') hkIn = 'OD';

    // Cek apakah laporan sudah ada, jika ya UPDATE saja, jika tidak INSERT
    db.get(`SELECT 1 FROM laporan WHERE tanggal = ? AND nomor_kamar = ?`, [tanggal, kamar], (err, row) => {
      if (err) {
        console.error('❌ Error cek laporan:', err.message);
        return res.redirect('/ra?pesan=gagal');
      }

      const petugas = req.session.user.nama;

      if (row) {
        // Update waktu_masuk dan petugas saja, jangan hapus data amenitas yang sudah ada
        db.run(`UPDATE laporan SET waktu_masuk = ?, petugas = ? WHERE tanggal = ? AND nomor_kamar = ?`,
          [waktuMasuk, petugas, tanggal, kamar], err => {
            if (err) {
              console.error('❌ Error UPDATE laporan:', err.message);
              return res.redirect('/ra?pesan=gagal');
            }
            db.run(`UPDATE tugas SET status_hk_in = ? WHERE tanggal = ? AND kamar = ?`,
              [hkIn, tanggal, kamar], err => {
                if (err) console.error(err);
                res.redirect('/ra?pesan=berhasil');
              });
          });
      } else {
        // Insert baru dengan hanya 4 kolom
        db.run(`INSERT INTO laporan (tanggal, nomor_kamar, waktu_masuk, petugas) VALUES (?, ?, ?, ?)`,
          [tanggal, kamar, waktuMasuk, petugas], err => {
            if (err) {
              console.error('❌ Error INSERT laporan:', err.message);
              return res.redirect('/ra?pesan=gagal');
            }
            db.run(`UPDATE tugas SET status_hk_in = ? WHERE tanggal = ? AND kamar = ?`,
              [hkIn, tanggal, kamar], err => {
                if (err) console.error(err);
                res.redirect('/ra?pesan=berhasil');
              });
          });
      }
    });
  });
});

app.post('/selesai-kamar', (req, res) => {
  const waktuKeluar = getWaktuWIBJamMenit();
  const { tanggal, kamar, waktu_masuk } = req.body;
  const petugas = req.session.user.nama;

  // Build query dinamis untuk menghindari mismatch jumlah kolom dan params
  const baseFields = ['tanggal', 'nomor_kamar', 'waktu_masuk', 'waktu_keluar'];
  const baseValues = [tanggal, kamar, waktu_masuk, waktuKeluar];

  // Ambil nilai amenitas dari req.body, default 0 jika tidak ada
  const amenityValues = AMENITY_FIELDS.map(field => {
    const val = req.body[field];
    return (val !== undefined && val !== '' && !isNaN(val)) ? parseInt(val) : 0;
  });

  const allFields = [...baseFields, ...AMENITY_FIELDS, 'petugas'];
  const allValues = [...baseValues, ...amenityValues, petugas];
  const placeholders = allFields.map(() => '?').join(',');

  const sql = `INSERT OR REPLACE INTO laporan (${allFields.join(',')}) VALUES (${placeholders})`;

  console.log('📥 Submit selesai-kamar:', { tanggal, kamar, waktu_masuk, waktuKeluar });
  console.log('📊 Jumlah kolom:', allFields.length);
  console.log('📊 Jumlah params:', allValues.length);
  console.log('📊 SQL:', sql);
  console.log('📊 Params:', allValues);

  db.run(sql, allValues, function(err) {
    if (err) {
      console.error('❌ Error INSERT laporan:', err.message);
      return res.redirect('/ra?pesan=gagal');
    }

    console.log('✅ Laporan tersimpan, rows affected:', this.changes);

    db.get(`SELECT status_awal, status_hk_in FROM tugas WHERE tanggal = ? AND kamar = ?`, [tanggal, kamar], (err, data) => {
      if (err) {
        console.error('❌ Error SELECT tugas:', err.message);
        return res.redirect('/ra?pesan=gagal');
      }

      if (!data) {
        console.error('❌ Data tugas tidak ditemukan:', tanggal, kamar);
        return res.redirect('/ra?pesan=gagal');
      }

      let statusHKout = '';
      if (data.status_hk_in === 'VD' || data.status_hk_in === 'VCU' || data.status_awal === 'ED') {
        statusHKout = 'VC';
      } else if (data.status_hk_in === 'OD') {
        statusHKout = 'OC';
      }

      console.log('📝 Update status_hk_out:', statusHKout, 'untuk kamar', kamar);

      db.run(`UPDATE tugas 
              SET status_hk_out = ?, selesai = 1, siap_dicek = 1 
              WHERE tanggal = ? AND kamar = ?`,
        [statusHKout, tanggal, kamar], 
        function(err) {
          if (err) {
            console.error('❌ Error UPDATE tugas:', err.message);
            return res.redirect('/ra?pesan=gagal');
          }
          console.log('✅ Tugas selesai diupdate, rows:', this.changes);
          res.redirect('/ra?pesan=berhasil');
        }
      );
    });
  });
});

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

  db.get(`SELECT 1 FROM kamar WHERE nomor_kamar = ?`, [nomor_kamar], (err, ada) => {
    if (!ada) return res.redirect('/ot?pesan=gagal&teks=Kamar tidak terdaftar');
    db.run(`INSERT INTO permintaan_tamu 
      (tanggal, nomor_kamar, jenis_permintaan, keterangan, waktu_masuk, dibuat_oleh, status)
      VALUES (?, ?, ?, ?, ?, ?, 'Dipinjam Tamu')`,
      [hariIni, nomor_kamar, jenis_permintaan, keterangan || '', waktuMasuk, req.session.user.nama],
      err => err ? res.redirect('/ot?pesan=gagal') : res.redirect('/ot?pesan=berhasil')
    );
  });
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
    WHERE t.tanggal = ? AND t.sudah_dibagikan = 1
  `;
  const param = [tanggal];
  if (ra) { query += ` AND t.petugas = ?`; param.push(ra); }
  query += ` ORDER BY t.petugas, t.kamar`;

  db.all(query, param, (err, dataKamar) => {
    if (err || !dataKamar || dataKamar.length === 0) return res.send('❌ Tidak ada data kamar yang sudah dibagikan');

    const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Daily_RA_Report_${ra ? ra + '_' : ''}${tanggal}.pdf`);
    doc.pipe(res);

    const judul = ra ? `Daily Room Attendant Report - ${ra}` : 'Daily Room Attendant Report';
    doc.font('Helvetica-Bold').fontSize(18).text('HORISON HOTEL & CONVENTION', { align: 'center' });
    doc.fontSize(14).text(judul, { align: 'center', underline: true });
    doc.moveDown(1);
    doc.font('Helvetica').fontSize(11);
    doc.text(`Tanggal: ${tanggal} | Dibuat: ${getWaktuWIB()} WIB`);
    doc.moveDown(1);

    let totalBiaya = 0;
    let y = doc.y;
    const PAGE_BOTTOM = 520;
    const HEADER_HEIGHT = 35;
    const ITEM_HEIGHT = 14;
    const TOTAL_HEIGHT = 20;
    const SPACING = 15;

    const checkPageBreak = (neededSpace) => {
      if (y + neededSpace > PAGE_BOTTOM) {
        doc.addPage();
        y = 30;
        return true;
      }
      return false;
    };

    dataKamar.forEach((row, idx) => {
      let biayaKamar = 0;
      const barangTerpakai = [];
      Object.keys(HARGA_BARANG).forEach(nama => {
        const jumlah = row[nama] || 0;
        if (jumlah > 0) {
          const sub = jumlah * HARGA_BARANG[nama];
          biayaKamar += sub;
          barangTerpakai.push({
            nama: nama.replace(/_/g, ' '),
            jumlah,
            harga: HARGA_BARANG[nama],
            sub
          });
        }
      });

      const contentHeight = barangTerpakai.length > 0 
        ? (barangTerpakai.length * ITEM_HEIGHT) + TOTAL_HEIGHT 
        : ITEM_HEIGHT + TOTAL_HEIGHT;
      const totalNeeded = HEADER_HEIGHT + contentHeight + SPACING;

      checkPageBreak(totalNeeded);

      doc.font('Helvetica-Bold').fontSize(10);
      doc.text(`Kamar: ${row.kamar} | Lantai: ${row.lantai} | Petugas: ${row.petugas || '-'}`, 20, y);
      doc.text(`FO: ${row.status_awal || '-'} | HK IN: ${row.status_hk_in || '-'} | HK OUT: ${row.status_hk_out || '-'} | Masuk: ${row.waktu_masuk} | Keluar: ${row.waktu_keluar}`, 20, y + 15);
      y += HEADER_HEIGHT;

      doc.font('Helvetica').fontSize(9);
      if (barangTerpakai.length > 0) {
        barangTerpakai.forEach(item => {
          if (y + ITEM_HEIGHT > PAGE_BOTTOM) {
            doc.addPage();
            y = 30;
            doc.font('Helvetica-Bold').fontSize(9).text(`(Lanjutan Kamar ${row.kamar})`, 20, y);
            y += 15;
            doc.font('Helvetica').fontSize(9);
          }
          doc.text(`${item.nama}: ${item.jumlah} x Rp ${item.harga.toLocaleString('id-ID')} = Rp ${item.sub.toLocaleString('id-ID')}`, 25, y);
          y += ITEM_HEIGHT;
        });
      } else {
        if (y + ITEM_HEIGHT > PAGE_BOTTOM) {
          doc.addPage();
          y = 30;
          doc.font('Helvetica-Bold').fontSize(9).text(`(Lanjutan Kamar ${row.kamar})`, 20, y);
          y += 15;
          doc.font('Helvetica').fontSize(9);
        }
        doc.text('Belum ada laporan pemakaian barang', 25, y);
        y += ITEM_HEIGHT;
      }

      if (y + TOTAL_HEIGHT > PAGE_BOTTOM) {
        doc.addPage();
        y = 30;
        doc.font('Helvetica-Bold').fontSize(9).text(`(Lanjutan Kamar ${row.kamar})`, 20, y);
        y += 15;
      }
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text(`Total Biaya Kamar: Rp ${biayaKamar.toLocaleString('id-ID')}`, 25, y);
      totalBiaya += biayaKamar;
      y += TOTAL_HEIGHT + SPACING;
    });

    if (y + 30 > PAGE_BOTTOM) {
      doc.addPage();
      y = 30;
    }
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text(`TOTAL KESELURUHAN: Rp ${totalBiaya.toLocaleString('id-ID')}`, 20, y);
    doc.end();
  });
});

app.get('/unduh-excel', async (req, res) => {
  try {
    const tanggal = req.query.tanggal || getTanggalWIB();
    const raFilter = req.query.ra || null;

    console.log('📥 Download Excel request:', { tanggal, raFilter });

    // Ambil daftar RA yang punya tugas di tanggal ini
    const daftarRA = await new Promise((resolve, reject) => {
      let query = `
        SELECT DISTINCT petugas 
        FROM tugas 
        WHERE tanggal = ? AND petugas != '' AND sudah_dibagikan = 1 
      `;
      const params = [tanggal];
      if (raFilter) {
        query += ` AND petugas = ?`;
        params.push(raFilter);
      }
      query += ` ORDER BY petugas`;

      db.all(query, params, (err, rows) => {
        if (err) {
          console.error('❌ Error ambil daftar RA:', err.message);
          return reject(err);
        }
        console.log('📊 RA ditemukan:', rows.length, rows.map(r => r.petugas));
        resolve(rows.map(r => r.petugas));
      });
    });

    if (daftarRA.length === 0) {
      return res.send('❌ Tidak ada RA yang memiliki tugas untuk tanggal ini');
    }

    const workbook = new ExcelJS.Workbook();

    // Build SQL selects
    const bathRoomFields = [
      'sheet_twin', 'sheet_king', 'duvet_twin', 'duvet_king',
      'bath_towel', 'hand_towel', 'bath_mat', 'pillow_case'
    ];
    const bathRoomSelects = bathRoomFields.map(f => 'IFNULL(l.' + f + ', 0) AS ' + f + '_in').join(', ');

    const guestSuppliesFields = [
      'shower_cap', 'dental_kit', 'laundry_bag', 'laundry_list',
      'note_pad', 'pensil', 'tissue_facial', 'tissue_roll',
      'coffee', 'sugar', 'tea', 'creamer', 'mineral',
      'cotton_bud', 'slipper', 'comb', 'shaving_kit',
      'stirer', 'coster', 'poly_bag_kecil', 'poly_bag_besar'
    ];
    const guestSuppliesSelects = guestSuppliesFields.map(f => 'IFNULL(l.' + f + ', 0) AS ' + f).join(', ');

    // Proses setiap RA
    for (let i = 0; i < daftarRA.length; i++) {
      const ra = daftarRA[i];

      // Buat sheet baru dengan nama RA
      const sheet = workbook.addWorksheet(ra);

      // === SET COLUMN WIDTHS ===
      const colWidths = {
        'A': 4, 'B': 10, 'C': 6, 'D': 6, 'E': 6, 'F': 6, 'G': 6,
        'H': 8, 'I': 8, 'J': 8, 'K': 8, 'L': 8, 'M': 8, 'N': 8, 'O': 8,
        'P': 12, 'Q': 12, 'R': 12, 'S': 12, 'T': 12, 'U': 12, 'V': 12,
        'W': 12, 'X': 12, 'Y': 12, 'Z': 12, 'AA': 12, 'AB': 12, 'AC': 12,
        'AD': 12, 'AE': 12, 'AF': 12, 'AG': 12, 'AH': 12, 'AI': 12, 'AJ': 12
      };
      Object.keys(colWidths).forEach(col => {
        sheet.getColumn(col).width = colWidths[col];
      });

      // === LOGO HOTEL (POJOK KIRI ATAS) ===
      // ⬇️ GANTI URL INI DENGAN LINK IMGUR ANDA YANG BENAR
      const LOGO_URL = 'https://imgur.com/F3uMFwH';
      try {
        const logoResponse = await axios.get(LOGO_URL, { responseType: 'arraybuffer', timeout: 5000 });
        const logoBuffer = Buffer.from(logoResponse.data, 'binary');
        const imageId = workbook.addImage({
          buffer: logoBuffer,
          extension: 'png',
        });
        // Logo di pojok kiri atas (A1:B3)
        sheet.addImage(imageId, {
          tl: { col: 0, row: 0 },
          br: { col: 2, row: 3 }
        });
      } catch (e) {
        console.log('⚠️ Logo tidak terpasang:', e.message);
      }

      // === ROW 1: TITLE ===
      sheet.getCell('C1').value = 'ROOMBOY CONTROL SHEET';
      sheet.getCell('C1').font = { bold: true, size: 14 };
      sheet.getCell('C1').alignment = { horizontal: 'center' };
      sheet.mergeCells('C1:AJ1');

      // === ROW 2: EMPTY ===

      // === ROW 3: INFO HEADER ===
      sheet.getCell('A3').value = 'DATE:';
      sheet.getCell('A3').font = { bold: true };
      sheet.getCell('B3').value = tanggal;

      sheet.getCell('D3').value = 'SHIFT:';
      sheet.getCell('D3').font = { bold: true };
      sheet.getCell('E3').value = 'Morning';

      sheet.getCell('G3').value = 'FLOOR/SECTION:';
      sheet.getCell('G3').font = { bold: true };

      // === ROW 4: MAIN HEADER ===
      const row4Headers = [
        { col: 'A', text: 'NO' },
        { col: 'B', text: 'NO OF ROOM' },
        { col: 'C', text: 'ROOM STATUS' },
        { col: 'F', text: 'TIME' },
        { col: 'H', text: 'LINEN' },
        { col: 'P', text: 'GUEST SUPPLIES & AMENITIES' }
      ];

      row4Headers.forEach(h => {
        const cell = sheet.getCell(h.col + '4');
        cell.value = h.text;
        cell.font = { bold: true, size: 9 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });

      // Merge row 4
      sheet.mergeCells('A4:A6');
      sheet.mergeCells('B4:B6');
      sheet.mergeCells('C4:E5');
      sheet.mergeCells('F4:G5');
      sheet.mergeCells('H4:O5');
      sheet.mergeCells('P4:AJ5');

      // === ROW 5: SUB-HEADERS ===
      // ROOM STATUS sub-headers
      sheet.getCell('C6').value = 'FO';
      sheet.getCell('D6').value = 'HK';
      sheet.getCell('E6').value = 'HK';

      // TIME sub-headers
      sheet.getCell('F6').value = 'IN';
      sheet.getCell('G6').value = 'OUT';

      // LINEN sub-headers - tanpa IN/OUT label
      const linenSub = [
        { col: 'H', text: 'SHEET\nDOUBLE' },
        { col: 'I', text: 'SHEET\nSINGLE' },
        { col: 'J', text: 'DUVET\nCOVER' },
        { col: 'K', text: 'DUVET\nSINGLE' },
        { col: 'L', text: 'BATH\nTOWEL' },
        { col: 'M', text: 'HAND\nTOWEL' },
        { col: 'N', text: 'BATH\nMAT' },
        { col: 'O', text: 'PILLOW\nCASE' }
      ];
      linenSub.forEach(h => {
        const cell = sheet.getCell(h.col + '6');
        cell.value = h.text;
        cell.font = { bold: true, size: 8 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });

      // GUEST SUPPLIES sub-headers
      sheet.mergeCells('P6:Q6');  // BATH ROOM
      sheet.mergeCells('R6:V6');  // BED ROOM
      sheet.mergeCells('W6:AJ6'); // CONDIMEN

      sheet.getCell('P6').value = 'BATH ROOM';
      sheet.getCell('R6').value = 'BED ROOM';
      sheet.getCell('W6').value = 'CONDIMEN';

      ['P6', 'R6', 'W6'].forEach(cellRef => {
        const cell = sheet.getCell(cellRef);
        cell.font = { bold: true, size: 8 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });

      // === ROW 7: ITEM NAMES ===
      const row7Items = [
        { col: 'P', text: 'SHOWER CAP' },
        { col: 'Q', text: 'DENTAL KIT' },
        { col: 'R', text: 'LAUNDRY BAG' },
        { col: 'S', text: 'LAUNDRY LIST' },
        { col: 'T', text: 'MEMO PAD' },
        { col: 'U', text: 'PENCIL' },
        { col: 'V', text: 'GUEST COMMENT' },
        { col: 'W', text: 'TISSUE ROLL' },
        { col: 'X', text: 'HAND SOAP' },
        { col: 'Y', text: 'SHAMPOO' },
        { col: 'Z', text: 'SHOWER GEL' },
        { col: 'AA', text: 'TOOTH BRUSH' },
        { col: 'AB', text: 'STERER' },
        { col: 'AC', text: 'SLIPPER' },
        { col: 'AD', text: 'COFFEE' },
        { col: 'AE', text: 'SUGAR' },
        { col: 'AF', text: 'TEA' },
        { col: 'AG', text: 'CREAMER' },
        { col: 'AH', text: 'MINERAL WATER' },
        { col: 'AI', text: 'PLASTIC BIN' },
        { col: 'AJ', text: 'TISUE' }
      ];

      row7Items.forEach(item => {
        const cell = sheet.getCell(item.col + '7');
        cell.value = item.text;
        cell.font = { bold: true, size: 9 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });

      // Apply borders to all header cells in row 4-7
      for (let row = 4; row <= 7; row++) {
        for (let colCode = 'A'.charCodeAt(0); colCode <= 'J'.charCodeAt(0); colCode++) {
          const cell = sheet.getCell(String.fromCharCode(colCode) + row);
          if (!cell.border || !cell.border.top) {
            cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
          }
        }
      }

      // Query data kamar untuk RA ini
      const dataRA = await new Promise((resolve, reject) => {
        const query = `
          SELECT t.petugas, t.kamar, 
                 t.status_awal AS status_fo,
                 t.status_hk_in,
                 t.status_hk_out,
                 t.selesai,
                 k.lantai,
                 IFNULL(l.waktu_masuk, '-') AS waktu_masuk,
                 IFNULL(l.waktu_keluar, '-') AS waktu_keluar,
                 ${bathRoomSelects},
                 ${guestSuppliesSelects}
          FROM tugas t
          JOIN kamar k ON t.kamar = k.nomor_kamar
          LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
          WHERE t.tanggal = ? AND t.petugas = ? AND t.sudah_dibagikan = 1
          ORDER BY t.kamar
        `;
        db.all(query, [tanggal, ra], (err, rows) => {
          if (err) {
            console.error('❌ Error query data RA ' + ra + ':', err.message);
            return reject(err);
          }
          console.log('📊 RA ' + ra + ': ' + rows.length + ' kamar');
          resolve(rows);
        });
      });

      if (dataRA.length === 0) continue;

      // Update lantai
      sheet.getCell('I3').value = (dataRA[0] && dataRA[0].lantai) ? dataRA[0].lantai : '-';

      // === DATA ROWS (mulai baris 8) - 1 BARIS PER KAMAR ===
      let baris = 8;
      let no = 1;
      dataRA.forEach((data) => {
        // NO
        sheet.getCell('A' + baris).value = no++;
        sheet.getCell('A' + baris).alignment = { horizontal: 'center' };
        sheet.getCell('A' + baris).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

        // ROOM
        sheet.getCell('B' + baris).value = data.kamar || '';
        sheet.getCell('B' + baris).alignment = { horizontal: 'center' };
        sheet.getCell('B' + baris).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

        // FO
        sheet.getCell('C' + baris).value = data.status_fo || '';
        sheet.getCell('C' + baris).alignment = { horizontal: 'center' };
        sheet.getCell('C' + baris).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

        // HK IN
        let statusHKin = data.status_hk_in || '';
        if (!statusHKin) {
          if (data.status_fo === 'VD' || data.status_fo === 'ED') statusHKin = 'VD';
          else if (data.status_fo === 'VCU') statusHKin = 'VCU';
          else if (data.status_fo === 'OD') statusHKin = 'OD';
        }
        sheet.getCell('D' + baris).value = statusHKin;
        sheet.getCell('D' + baris).alignment = { horizontal: 'center' };
        sheet.getCell('D' + baris).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

        // HK OUT
        let statusHKout = data.status_hk_out || '';
        if (!statusHKout && data.selesai === 1) {
          if (statusHKin === 'VD' || statusHKin === 'VCU' || data.status_fo === 'ED') statusHKout = 'VC';
          else if (statusHKin === 'OD') statusHKout = 'OC';
        }
        sheet.getCell('E' + baris).value = statusHKout;
        sheet.getCell('E' + baris).alignment = { horizontal: 'center' };
        sheet.getCell('E' + baris).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

        // TIME IN / TIME OUT
        sheet.getCell('F' + baris).value = data.waktu_masuk !== '-' ? data.waktu_masuk : '';
        sheet.getCell('F' + baris).alignment = { horizontal: 'center' };
        sheet.getCell('F' + baris).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        sheet.getCell('G' + baris).value = data.waktu_keluar !== '-' ? data.waktu_keluar : '';
        sheet.getCell('G' + baris).alignment = { horizontal: 'center' };
        sheet.getCell('G' + baris).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

        // === LINEN (1 baris saja, angka = IN = OUT) ===
        const linenValues = [
          data.sheet_twin_in || 0,
          data.sheet_king_in || 0,
          data.duvet_twin_in || 0,
          data.duvet_king_in || 0,
          data.bath_towel_in || 0,
          data.hand_towel_in || 0,
          data.bath_mat_in || 0,
          data.pillow_case_in || 0
        ];

        const linenCols = ['H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
        linenCols.forEach((col, idx) => {
          const cell = sheet.getCell(col + baris);
          cell.value = linenValues[idx];
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        });

        // === GUEST SUPPLIES & AMENITIES ===
        const guestCells = [
          { col: 'P', val: data.shower_cap || 0 },
          { col: 'Q', val: data.dental_kit || 0 },
          { col: 'R', val: data.laundry_bag || 0 },
          { col: 'S', val: data.laundry_list || 0 },
          { col: 'T', val: data.note_pad || 0 },
          { col: 'U', val: data.pensil || 0 },
          { col: 'V', val: '' },
          { col: 'W', val: data.tissue_roll || 0 },
          { col: 'X', val: data.tissue_facial || 0 },
          { col: 'Y', val: data.cotton_bud || 0 },
          { col: 'Z', val: data.shower_cap || 0 },
          { col: 'AA', val: data.dental_kit || 0 },
          { col: 'AB', val: data.stirer || 0 },
          { col: 'AC', val: data.slipper || 0 },
          { col: 'AD', val: data.coffee || 0 },
          { col: 'AE', val: data.sugar || 0 },
          { col: 'AF', val: data.tea || 0 },
          { col: 'AG', val: data.creamer || 0 },
          { col: 'AH', val: data.mineral || 0 },
          { col: 'AI', val: data.poly_bag_kecil || 0 },
          { col: 'AJ', val: data.tissue_facial || 0 }
        ];

        guestCells.forEach(g => {
          const cell = sheet.getCell(g.col + baris);
          cell.value = g.val;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        });

        baris++;
      });

      // === TOTAL SOILED ROW ===
      const totalRow = baris + 1;
      sheet.getCell('A' + totalRow).value = 'TOTAL SOILED:';
      sheet.getCell('A' + totalRow).font = { bold: true };
      sheet.mergeCells('A' + totalRow + ':B' + totalRow);
      for (let colCode = 'A'.charCodeAt(0); colCode <= 'J'.charCodeAt(0); colCode++) {
        sheet.getCell(String.fromCharCode(colCode) + totalRow).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      }

      // === REMARKS ROW ===
      const remarksRow = totalRow + 1;
      sheet.getCell('A' + remarksRow).value = 'REMARKS';
      sheet.getCell('A' + remarksRow).font = { bold: true };
      sheet.mergeCells('A' + remarksRow + ':AJ' + (remarksRow + 2));
      for (let colCode = 'A'.charCodeAt(0); colCode <= 'J'.charCodeAt(0); colCode++) {
        sheet.getCell(String.fromCharCode(colCode) + remarksRow).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      }

      // === LEGEND ROWS ===
      const legendStart = remarksRow + 3;
      const legends = [
        ['ED', 'EXPECTED DEPARTURE', 'VC', 'VACANT CLEAN', 'DND', 'DO NOT DISTURB'],
        ['EA', 'EXPECTING ARRIVAL', 'OD', 'OCCUPIED DIRTY', 'HU', 'HOUSE USE'],
        ['VD', 'VACANT DIRTY', 'OC', 'OCCUPIED CLEAN', 'OO', 'OUT OF ORDER'],
        ['VCU', 'VACAN CLEAN UNCHECK', 'ONL', 'OCCUPIED NO LUGAGE', 'SO', 'SLEEP OUT'],
        ['DU', 'DAY USE', 'DL', 'DOUBLE LOCK', '', '']
      ];

      legends.forEach((legend, idx) => {
        const row = legendStart + idx;
        sheet.getCell('C' + row).value = legend[0];
        sheet.getCell('C' + row).font = { bold: true };
        sheet.getCell('D' + row).value = legend[1];
        sheet.getCell('F' + row).value = legend[2];
        sheet.getCell('F' + row).font = { bold: true };
        sheet.getCell('G' + row).value = legend[3];
        sheet.getCell('I' + row).value = legend[4];
        sheet.getCell('I' + row).font = { bold: true };
        sheet.getCell('J' + row).value = legend[5];
      });

      // === PREPARED BY / CHECKED BY ===
      const signRow = legendStart + legends.length + 1;
      sheet.getCell('A' + signRow).value = 'PREPARED BY:';
      sheet.getCell('A' + signRow).font = { bold: true };
      sheet.getCell('H' + signRow).value = 'CHECKED BY';
      sheet.getCell('H' + signRow).font = { bold: true };
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Roomboy_Control_Sheet_' + tanggal + '.xlsx');
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('❌ Error membuat Excel:', err);
    console.error('❌ Stack:', err.stack);
    res.send('❌ Gagal membuat file Excel: ' + err.message);
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.listen(PORT, () => console.log(`✅ Server berjalan di port ${PORT}`));
