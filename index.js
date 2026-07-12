const express = require('express');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { parse } = require('json2csv');
const PDFDocument = require('pdfkit');
const cron = require('node-cron');
const ExcelJS = require('exceljs');

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

  // HAPUS tabel laporan lama dan buat ulang dengan struktur baru
  db.run(`DROP TABLE IF EXISTS laporan`, () => {
    const amenityCols = AMENITY_FIELDS.map(f => `${f} INTEGER DEFAULT 0`).join(',\n      ');
    db.run(`CREATE TABLE IF NOT EXISTS laporan (
      tanggal TEXT,
      nomor_kamar TEXT,
      waktu_masuk TEXT,
      waktu_keluar TEXT,
      ${amenityCols},
      petugas TEXT,
      PRIMARY KEY (tanggal, nomor_kamar),
      FOREIGN KEY (nomor_kamar) REFERENCES kamar(nomor_kamar) ON DELETE CASCADE
    )`);
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

    dataKamar.forEach((row, idx) => {
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text(`Kamar: ${row.kamar} | Lantai: ${row.lantai} | Petugas: ${row.petugas || '-'}`, 20, y);
      doc.text(`FO: ${row.status_awal || '-'} | HK IN: ${row.status_hk_in || '-'} | HK OUT: ${row.status_hk_out || '-'} | Masuk: ${row.waktu_masuk} | Keluar: ${row.waktu_keluar}`, 20, y + 15);
      y += 30;
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
        doc.text('Belum ada laporan pemakaian barang', 25, y);
        y += 12;
      }

      doc.font('Helvetica-Bold').fontSize(10);
      doc.text(`Total Biaya Kamar: Rp ${biayaKamar.toLocaleString('id-ID')}`, 25, y);
      totalBiaya += biayaKamar;
      y += 20;

      if (y > 520) { doc.addPage(); y = 30; }
    });

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text(`TOTAL KESELURUHAN: Rp ${totalBiaya.toLocaleString('id-ID')}`, 20, y);
    doc.end();
  });
});

app.get('/unduh-excel', async (req, res) => {
  try {
    const tanggal = req.query.tanggal || getTanggalWIB();
    const ra = req.query.ra || null;

    const daftarTugas = await new Promise((resolve, reject) => {
      let query = `
        SELECT t.petugas, t.kamar, 
               t.status_awal AS status_fo,
               t.status_hk_in,
               t.status_hk_out,
               t.selesai,
               k.lantai,
               IFNULL(l.waktu_masuk, '-') AS waktu_masuk,
               IFNULL(l.waktu_keluar, '-') AS waktu_keluar,
               IFNULL(l.sheet_twin, 0) AS sheet_twin_in,
               IFNULL(l.sheet_king, 0) AS sheet_king_in,
               IFNULL(l.duvet_twin, 0) AS duvet_twin_in,
               IFNULL(l.duvet_king, 0) AS duvet_king_in,
               IFNULL(l.bath_towel, 0) AS bath_towel_in,
               IFNULL(l.hand_towel, 0) AS hand_towel_in,
               IFNULL(l.bath_mat, 0) AS bath_mat_in,
               IFNULL(l.pillow_case, 0) AS pillow_case_in,
               IFNULL(l.shower_cap, 0) AS shower_cap_in,
               IFNULL(l.dental_kit, 0) AS dental_kit_in,
               IFNULL(l.laundry_bag, 0) AS laundry_bag_in,
               IFNULL(l.laundry_list, 0) AS laundry_list_in,
               IFNULL(l.tissue_facial, 0) AS tissue_facial_in,
               IFNULL(l.tissue_roll, 0) AS tissue_roll_in,
               IFNULL(l.cotton_bud, 0) AS cotton_bud_in,
               IFNULL(l.slipper, 0) AS slipper_in,
               IFNULL(l.comb, 0) AS comb_in,
               IFNULL(l.shaving_kit, 0) AS shaving_kit_in,
               IFNULL(l.stirer, 0) AS stirer_in,
               IFNULL(l.poly_bag_kecil, 0) AS poly_bag_kecil_in,
               IFNULL(l.poly_bag_besar, 0) AS poly_bag_besar_in,
               IFNULL(l.pensil, 0) AS pensil_in,
               IFNULL(l.note_pad, 0) AS note_pad_in
        FROM tugas t
        JOIN kamar k ON t.kamar = k.nomor_kamar
        LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
        WHERE t.tanggal = ? 
          AND (t.sudah_dibagikan = 1 OR t.sudah_dibagikan IS NULL OR t.sudah_dibagikan = 0)
      `;
      const param = [tanggal];
      if (ra) { query += ` AND t.petugas = ?`; param.push(ra); }
      query += ` ORDER BY t.petugas, t.kamar`;

      db.all(query, param, (err, rows) => err ? reject(err) : resolve(rows));
    });

    const dataValid = daftarTugas.filter(item => item.petugas && item.petugas !== '');

    if (!dataValid || dataValid.length === 0) {
      return res.send('❌ Tidak ada data untuk tanggal ini');
    }

    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, 'templates', 'excel', 'roomboy_control_template.xlsx');
    await workbook.xlsx.readFile(templatePath);
    const sheet = workbook.worksheets[0];

    sheet.getCell('B4').value = dataValid[0].petugas || '-';
    sheet.getCell('J4').value = tanggal;
    sheet.getCell('S4').value = 'Morning';
    sheet.getCell('AG4').value = dataValid[0].lantai || '-';

    let baris = 9;
    dataValid.forEach((data) => {
      sheet.getCell(`B${baris}`).value = data.kamar;
      sheet.getCell(`C${baris}`).value = data.status_fo || '';

      let statusHKin = data.status_hk_in || '';
      if (!statusHKin) {
        if (data.status_fo === 'VD' || data.status_fo === 'ED') statusHKin = 'VD';
        else if (data.status_fo === 'VCU') statusHKin = 'VCU';
        else if (data.status_fo === 'OD') statusHKin = 'OD';
      }
      sheet.getCell(`D${baris}`).value = statusHKin;

      let statusHKout = data.status_hk_out || '';
      if (!statusHKout && data.selesai === 1) {
        if (statusHKin === 'VD' || statusHKin === 'VCU' || data.status_fo === 'ED') statusHKout = 'VC';
        else if (statusHKin === 'OD') statusHKout = 'OC';
      }
      sheet.getCell(`E${baris}`).value = statusHKout;

      sheet.getCell(`F${baris}`).value = data.waktu_masuk !== '-' ? data.waktu_masuk : '';
      sheet.getCell(`G${baris}`).value = data.waktu_keluar !== '-' ? data.waktu_keluar : '';

      sheet.getCell(`H${baris}`).value = data.sheet_twin_in;
      sheet.getCell(`I${baris}`).value = data.sheet_twin_in;
      sheet.getCell(`J${baris}`).value = data.sheet_king_in;
      sheet.getCell(`K${baris}`).value = data.sheet_king_in;
      sheet.getCell(`L${baris}`).value = data.duvet_twin_in;
      sheet.getCell(`M${baris}`).value = data.duvet_twin_in;
      sheet.getCell(`N${baris}`).value = data.duvet_king_in;
      sheet.getCell(`O${baris}`).value = data.duvet_king_in;
      sheet.getCell(`P${baris}`).value = data.bath_towel_in;
      sheet.getCell(`Q${baris}`).value = data.bath_towel_in;
      sheet.getCell(`R${baris}`).value = data.hand_towel_in;
      sheet.getCell(`S${baris}`).value = data.hand_towel_in;
      sheet.getCell(`T${baris}`).value = data.bath_mat_in;
      sheet.getCell(`U${baris}`).value = data.bath_mat_in;
      sheet.getCell(`V${baris}`).value = data.pillow_case_in;
      sheet.getCell(`W${baris}`).value = data.pillow_case_in;

      // === BATH ROOM (pasangan IN / OUT) ===
      sheet.getCell(`H${baris}`).value = data.sheet_twin_in;
      sheet.getCell(`I${baris}`).value = data.sheet_twin_in;
      sheet.getCell(`J${baris}`).value = data.sheet_king_in;
      sheet.getCell(`K${baris}`).value = data.sheet_king_in;
      sheet.getCell(`L${baris}`).value = data.duvet_twin_in;
      sheet.getCell(`M${baris}`).value = data.duvet_twin_in;
      sheet.getCell(`N${baris}`).value = data.duvet_king_in;
      sheet.getCell(`O${baris}`).value = data.duvet_king_in;
      sheet.getCell(`P${baris}`).value = data.bath_towel_in;
      sheet.getCell(`Q${baris}`).value = data.bath_towel_in;
      sheet.getCell(`R${baris}`).value = data.hand_towel_in;
      sheet.getCell(`S${baris}`).value = data.hand_towel_in;
      sheet.getCell(`T${baris}`).value = data.bath_mat_in;
      sheet.getCell(`U${baris}`).value = data.bath_mat_in;
      sheet.getCell(`V${baris}`).value = data.pillow_case_in;
      sheet.getCell(`W${baris}`).value = data.pillow_case_in;

      // === GUEST SUPPLIES & AMENITIES (hanya 1 kolom per item, tanpa IN/OUT) ===
      // Sesuaikan huruf kolom dengan template Excel kamu
      sheet.getCell(`AD${baris}`).value = data.shower_cap;
      sheet.getCell(`AE${baris}`).value = data.dental_kit;
      sheet.getCell(`AF${baris}`).value = data.laundry_bag;
      sheet.getCell(`AG${baris}`).value = data.laundry_list;
      sheet.getCell(`AH${baris}`).value = data.note_pad;
      sheet.getCell(`AI${baris}`).value = data.pensil;
      // AJ = GUEST COMMENT (tidak ada di DB, biarkan kosong atau isi manual)
      sheet.getCell(`AJ${baris}`).value = ''; 
      sheet.getCell(`AL${baris}`).value = data.tissue_facial;
      sheet.getCell(`AM${baris}`).value = data.tissue_roll;
      sheet.getCell(`AN${baris}`).value = data.coffee;
      sheet.getCell(`AO${baris}`).value = data.sugar;
      sheet.getCell(`AP${baris}`).value = data.tea;
      sheet.getCell(`AQ${baris}`).value = data.creamer;
      sheet.getCell(`AR${baris}`).value = data.mineral;
      sheet.getCell(`AS${baris}`).value = data.cotton_bud;
      sheet.getCell(`AT${baris}`).value = data.slipper;
      sheet.getCell(`AU${baris}`).value = data.comb;
      sheet.getCell(`AV${baris}`).value = data.shaving_kit;
      sheet.getCell(`AW${baris}`).value = data.stirer;
      sheet.getCell(`AX${baris}`).value = data.coster;
      sheet.getCell(`AY${baris}`).value = data.poly_bag_kecil;
      sheet.getCell(`AZ${baris}`).value = data.poly_bag_besar;

      baris++;
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Roomboy_Control_Sheet_${ra ? ra + '_' : ''}${tanggal}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('❌ Error membuat Excel:', err);
    res.send(`❌ Gagal membuat file Excel: ${err.message}`);
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.listen(PORT, () => console.log(`✅ Server berjalan di port ${PORT}`));
