const express = require('express');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const PDFDocument = require('pdfkit');
const cron = require('node-cron');
const ExcelJS = require('exceljs');

let axios;
try { axios = require('axios'); } catch (e) {
  console.log('axios belum terinstall, fitur logo dinonaktifkan');
}

const app = express();
const PORT = process.env.PORT || 8888;
process.env.TZ = 'Asia/Jakarta';

const getWaktuWIB = () => {
  return new Date().toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
};

const getWaktuWIBJamMenit = () => {
  return new Date().toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false
  });
};

const getTanggalWIB = () => {
  return new Date().toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit'
  }).split('/').reverse().join('-');
};

const HARGA_BARANG = {
  sheet_twin: 2750, sheet_king: 2950, duvet_twin: 4750, duvet_king: 6250,
  bath_towel: 2850, hand_towel: 1750, bath_mat: 2250, pillow_case: 1750,
  shower_cap: 600, dental_kit: 1450, laundry_bag: 1150, laundry_list: 150,
  dnd_sign: 0, magic: 0, shoe: 0, sugar: 155, tea: 471, coffee: 665,
  creamer: 212, mineral: 2146, tissue_facial: 9400, tissue_roll: 1443,
  cotton_bud: 460, slipper: 2500, comb: 750, shaving_kit: 2620,
  stirer: 1400, coster: 350, poly_bag_kecil: 19500, poly_bag_besar: 19500,
  pensil: 1200, note_pad: 500
};

const AMENITY_FIELDS = [
  'sheet_twin','sheet_king','duvet_twin','duvet_king','bath_towel','hand_towel','bath_mat','pillow_case',
  'shower_cap','dental_kit','laundry_bag','laundry_list','dnd_sign','magic','shoe','sugar','tea','coffee',
  'creamer','mineral','tissue_facial','tissue_roll','cotton_bud','slipper','comb','shaving_kit','stirer',
  'coster','poly_bag_kecil','poly_bag_besar','pensil','note_pad'
];

const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH 
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'database.db')
  : './database.db';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("Koneksi DB gagal:", err.message);
  else console.log("Terhubung ke SQLite di:", dbPath);
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS pengguna (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT NOT NULL, username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, peran TEXT NOT NULL, aktif BOOLEAN DEFAULT 1)`);

  db.get(`SELECT 1 FROM pengguna WHERE username = 'nizar'`, (err, row) => {
    if (!row) {
      db.run(`INSERT INTO pengguna (nama, username, password, peran) VALUES
        ('Aslan','aslan','123','RA'),('Bila','bila','123','RA'),('Indah','indah','123','RA'),
        ('Fika','fika','123','RA'),('Azril','azril','123','RA'),('Alwi','alwi','123','RA'),
        ('Revan','revan','123','RA'),('Apri','apri','123','RA'),('Nizar','nizar','123','SPV'),
        ('Kinan','kinan','123','SPV'),('Ilhan','ilhan','123','SPV'),('Alisa','alisa','1234','OT')`);
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS kamar (
    nomor_kamar TEXT PRIMARY KEY, lantai TEXT NOT NULL, tipe_kamar TEXT NOT NULL, aktif BOOLEAN DEFAULT 1)`);

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
        ['402','Lantai 4A','Junior Suite'],['403','Lantai 4A','Premium Deluxe'],['404','Lantai 4A','Deluxe'],
        ['405','Lantai 4A','Premium Deluxe'],['406','Lantai 4A','Deluxe'],['407','Lantai 4A','Premium Deluxe'],
        ['408','Lantai 4A','Deluxe'],['409','Lantai 4A','Premium Deluxe'],['410','Lantai 4A','Deluxe'],
        ['411','Lantai 4A','Premium Deluxe'],['501','Lantai 5A','Deluxe'],['502','Lantai 5A','Deluxe'],
        ['503','Lantai 5A','Deluxe'],['504','Lantai 5A','Deluxe'],['505','Lantai 5A','Deluxe'],
        ['506','Lantai 5A','Deluxe'],['507','Lantai 5A','Deluxe'],['508','Lantai 5C','Deluxe'],
        ['509','Lantai 5C','Deluxe'],['510','Lantai 5C','Deluxe'],['511','Lantai 5C','Deluxe'],
        ['512','Lantai 5C','Deluxe'],['513','Lantai 5C','Deluxe'],['514','Lantai 5C','Deluxe'],
        ['515','Lantai 5C','Deluxe'],['516','Lantai 5C','Deluxe'],['517','Lantai 5C','Deluxe'],
        ['518','Lantai 5C','Deluxe'],['519','Lantai 5C','Deluxe'],['520','Lantai 5C','Deluxe']
      ];
      daftarKamar.forEach(k => db.run(`INSERT OR IGNORE INTO kamar VALUES (?, ?, ?, 1)`, k));
    } else {
      db.run(`INSERT OR IGNORE INTO kamar (nomor_kamar, lantai, tipe_kamar, aktif) VALUES ('514', 'Lantai 5C', 'Deluxe', 1)`);
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS tugas (
    tanggal TEXT, kamar TEXT, petugas TEXT, status_awal TEXT DEFAULT 'VD',
    status_hk_in TEXT DEFAULT '', status_hk_out TEXT DEFAULT '', selesai INTEGER DEFAULT 0,
    sudah_dibagikan INTEGER DEFAULT 0, siap_dicek INTEGER DEFAULT 0,
    PRIMARY KEY (tanggal, kamar), FOREIGN KEY (kamar) REFERENCES kamar(nomor_kamar) ON DELETE CASCADE)`);

  db.run(`ALTER TABLE tugas ADD COLUMN sudah_dibagikan INTEGER DEFAULT 0`, () => {});
  db.run(`ALTER TABLE tugas ADD COLUMN siap_dicek INTEGER DEFAULT 0`, () => {});
  db.run(`ALTER TABLE tugas ADD COLUMN status_hk_in TEXT DEFAULT ''`, () => {});
  db.run(`ALTER TABLE tugas ADD COLUMN status_hk_out TEXT DEFAULT ''`, () => {});

  db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='laporan'`, (err, row) => {
    if (!row) {
      const amenityCols = AMENITY_FIELDS.map(f => `${f} INTEGER DEFAULT 0`).join(',');
      db.run(`CREATE TABLE laporan (tanggal TEXT, nomor_kamar TEXT, waktu_masuk TEXT, waktu_keluar TEXT, ${amenityCols}, petugas TEXT, PRIMARY KEY (tanggal, nomor_kamar), FOREIGN KEY (nomor_kamar) REFERENCES kamar(nomor_kamar) ON DELETE CASCADE)`);
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS permintaan_tamu (
    id INTEGER PRIMARY KEY AUTOINCREMENT, tanggal TEXT, nomor_kamar TEXT, jenis_permintaan TEXT,
    keterangan TEXT, status TEXT DEFAULT 'Dipinjam Tamu', waktu_masuk TEXT, waktu_selesai TEXT,
    dibuat_oleh TEXT, FOREIGN KEY (nomor_kamar) REFERENCES kamar(nomor_kamar) ON DELETE CASCADE)`);

  // === TABEL DAILY LAUNDRY (FORMAT BARU) ===
  db.run(`CREATE TABLE IF NOT EXISTS daily_laundry (
    id INTEGER PRIMARY KEY AUTOINCREMENT, tanggal TEXT, petugas TEXT, nama_item TEXT, kategori TEXT,
    harga INTEGER DEFAULT 0, unit TEXT, qty INTEGER DEFAULT 0, total_harga INTEGER DEFAULT 0,
    dibuat_oleh TEXT, waktu_input TEXT)`);

  // === TABEL LINEN F&B (BARU) ===
  db.run(`CREATE TABLE IF NOT EXISTS fnb_linen (
    id INTEGER PRIMARY KEY AUTOINCREMENT, tanggal TEXT, petugas TEXT, nama_item TEXT, kategori TEXT,
    harga INTEGER DEFAULT 0, unit TEXT, qty INTEGER DEFAULT 0, total_harga INTEGER DEFAULT 0,
    dibuat_oleh TEXT, waktu_input TEXT)`);

  // === TABEL STORE REQUEST (FORMAT BARU) ===
  db.run(`CREATE TABLE IF NOT EXISTS store_request (
    id INTEGER PRIMARY KEY AUTOINCREMENT, tanggal TEXT, petugas TEXT, kategori TEXT, nama_barang TEXT,
    harga INTEGER DEFAULT 0, unit TEXT, jumlah INTEGER DEFAULT 0, total_harga INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Pending', dibuat_oleh TEXT, waktu_input TEXT)`);
});

const buatTugasBaruHariIni = () => {
  const tanggalSekarang = getTanggalWIB();
  db.get(`SELECT 1 FROM tugas WHERE tanggal = ? LIMIT 1`, [tanggalSekarang], (err, ada) => {
    if (!ada) {
      db.all(`SELECT nomor_kamar FROM kamar WHERE aktif = 1`, [], (err, daftarKamar) => {
        if (err) return console.error("Gagal ambil kamar:", err);
        daftarKamar.forEach(k => {
          db.run(`INSERT OR IGNORE INTO tugas (tanggal, kamar, petugas, status_awal, status_hk_in, status_hk_out, selesai, sudah_dibagikan, siap_dicek) VALUES (?, ?, '', 'VD', '', '', 0, 0, 0)`, [tanggalSekarang, k.nomor_kamar]);
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
app.use(session({ secret: 'horison2026hotel', resave: false, saveUninitialized: false, cookie: { maxAge: 86400000 } }));

app.use((req, res, next) => {
  res.locals.waktuSekarang = getWaktuWIB();
  res.locals.waktuSekarangSingkat = getWaktuWIBJamMenit();
  res.locals.tanggalSekarang = getTanggalWIB();
  res.locals.pesan = null;
  if (req.query.pesan === 'berhasil') res.locals.pesan = { tipe: 'sukses', teks: 'Berhasil disimpan' };
  if (req.query.pesan === 'gagal') res.locals.pesan = { tipe: 'error', teks: 'Terjadi kesalahan' };
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
    res.render('login', { pesan: { tipe: 'error', teks: 'Username atau Password salah' } });
  });
});

app.get('/spv', (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  const hariIni = getTanggalWIB();
  const cariTanggal = req.query.tanggal || hariIni;
  const cariKamar = req.query.kamar || '';

  db.all(`SELECT nomor_kamar, lantai, tipe_kamar FROM kamar WHERE aktif = 1 ORDER BY nomor_kamar`, [], (err, daftarKamar) => {
    db.all(`SELECT nama FROM pengguna WHERE peran = 'RA' AND aktif = 1 ORDER BY nama`, [], (err, daftarRA) => {
      let querySudah = `SELECT t.*, k.lantai, k.tipe_kamar, IFNULL(l.waktu_masuk, '-') AS waktu_masuk, IFNULL(l.waktu_keluar, '-') AS waktu_keluar FROM tugas t JOIN kamar k ON t.kamar = k.nomor_kamar LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar WHERE t.tanggal = ?`;
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
          daftarKamar.forEach(k => { if (!kamarPerLantai[k.lantai]) kamarPerLantai[k.lantai] = []; kamarPerLantai[k.lantai].push(k); });
          res.render('spv', { user: req.session.user, tanggal: hariIni, cariTanggal, cariKamar, kamarPerLantai, daftarRA, daftarSudahDibagikan: perRA, daftarPermintaan, pesan: res.locals.pesan, daftarStatus: [{kode:'VD', nama:'Vacant Dirty'},{kode:'VCU', nama:'Vacant Clean Unchecked'},{kode:'OD', nama:'Occupied Dirty'},{kode:'ED', nama:'Expected Departure'}] });
        });
      });
    });
  });
});

app.post('/tambah-tugas', (req, res) => {
  const { tanggal, petugas, kamar, status_awal } = req.body;
  const daftarKamar = Array.isArray(kamar) ? kamar : [kamar];
  const daftarStatus = Array.isArray(status_awal) ? status_awal : [status_awal || 'VD'];
  let selesai = 0; const total = daftarKamar.length;
  if (total === 0) return res.redirect('/spv?pesan=gagal');
  const tempatkanTugas = () => {
    daftarKamar.forEach((k, idx) => {
      const status = daftarStatus[idx] || 'VD';
      db.run(`INSERT OR REPLACE INTO tugas (tanggal, kamar, petugas, status_awal, status_hk_in, status_hk_out, selesai, sudah_dibagikan, siap_dicek) VALUES (?, ?, ?, ?, '', '', 0, 1, 0)`, [tanggal, k, petugas, status], () => { if (++selesai === total) res.redirect('/spv?pesan=berhasil'); });
    });
  };
  db.all(`SELECT nomor_kamar FROM kamar WHERE nomor_kamar IN (${daftarKamar.map(() => '?').join(',')})`, daftarKamar, (err, hasil) => {
    if (hasil.length !== daftarKamar.length) return res.redirect('/spv?pesan=gagal&teks=Ada kamar yang tidak terdaftar');
    tempatkanTugas();
  });
});

app.get('/ra', (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'RA') return res.redirect('/');
  const hariIni = getTanggalWIB();
  const amenitySelects = AMENITY_FIELDS.map(f => `IFNULL(l.${f}, 0) AS ${f}`).join(', ');
  db.all(`SELECT t.*, IFNULL(l.waktu_masuk, '-') AS waktu_masuk, IFNULL(l.waktu_keluar, '-') AS waktu_keluar, ${amenitySelects} FROM tugas t JOIN kamar k ON t.kamar = k.nomor_kamar LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar WHERE t.tanggal = ? AND t.petugas = ? AND t.sudah_dibagikan = 1 ORDER BY t.kamar`, [hariIni, req.session.user.nama], (err, daftarTugas) => {
    res.render('ra', { user: req.session.user, tanggal: hariIni, tugas: daftarTugas, pesan: res.locals.pesan, waktuSekarang: getWaktuWIB() });
  });
});

app.post('/mulai-kamar', (req, res) => {
  const waktuMasuk = getWaktuWIBJamMenit();
  const { tanggal, kamar } = req.body;
  db.get(`SELECT status_awal FROM tugas WHERE tanggal = ? AND kamar = ?`, [tanggal, kamar], (err, data) => {
    if (err || !data) return res.redirect('/ra?pesan=gagal');
    let hkIn = '';
    if (data.status_awal === 'VD' || data.status_awal === 'ED') hkIn = 'VD';
    else if (data.status_awal === 'VCU') hkIn = 'VCU';
    else if (data.status_awal === 'OD') hkIn = 'OD';
    db.get(`SELECT 1 FROM laporan WHERE tanggal = ? AND nomor_kamar = ?`, [tanggal, kamar], (err, row) => {
      const petugas = req.session.user.nama;
      if (row) {
        db.run(`UPDATE laporan SET waktu_masuk = ?, petugas = ? WHERE tanggal = ? AND nomor_kamar = ?`, [waktuMasuk, petugas, tanggal, kamar], err => {
          if (err) return res.redirect('/ra?pesan=gagal');
          db.run(`UPDATE tugas SET status_hk_in = ? WHERE tanggal = ? AND kamar = ?`, [hkIn, tanggal, kamar], err => res.redirect('/ra?pesan=berhasil'));
        });
      } else {
        db.run(`INSERT INTO laporan (tanggal, nomor_kamar, waktu_masuk, petugas) VALUES (?, ?, ?, ?)`, [tanggal, kamar, waktuMasuk, petugas], err => {
          if (err) return res.redirect('/ra?pesan=gagal');
          db.run(`UPDATE tugas SET status_hk_in = ? WHERE tanggal = ? AND kamar = ?`, [hkIn, tanggal, kamar], err => res.redirect('/ra?pesan=berhasil'));
        });
      }
    });
  });
});

app.post('/selesai-kamar', (req, res) => {
  const waktuKeluar = getWaktuWIBJamMenit();
  const { tanggal, kamar, waktu_masuk } = req.body;
  const petugas = req.session.user.nama;
  const baseFields = ['tanggal','nomor_kamar','waktu_masuk','waktu_keluar'];
  const baseValues = [tanggal, kamar, waktu_masuk, waktuKeluar];
  const amenityValues = AMENITY_FIELDS.map(field => { const val = req.body[field]; return (val !== undefined && val !== '' && !isNaN(val)) ? parseInt(val) : 0; });
  const allFields = [...baseFields, ...AMENITY_FIELDS, 'petugas'];
  const allValues = [...baseValues, ...amenityValues, petugas];
  const placeholders = allFields.map(() => '?').join(',');
  const sql = `INSERT OR REPLACE INTO laporan (${allFields.join(',')}) VALUES (${placeholders})`;
  db.run(sql, allValues, function(err) {
    if (err) { console.error('Error INSERT laporan:', err.message); return res.redirect('/ra?pesan=gagal'); }
    db.get(`SELECT status_awal, status_hk_in FROM tugas WHERE tanggal = ? AND kamar = ?`, [tanggal, kamar], (err, data) => {
      if (err || !data) return res.redirect('/ra?pesan=gagal');
      let statusHKout = '';
      if (data.status_hk_in === 'VD' || data.status_hk_in === 'VCU' || data.status_awal === 'ED') statusHKout = 'VC';
      else if (data.status_hk_in === 'OD') statusHKout = 'OC';
      db.run(`UPDATE tugas SET status_hk_out = ?, selesai = 1, siap_dicek = 1 WHERE tanggal = ? AND kamar = ?`, [statusHKout, tanggal, kamar], function(err) {
        if (err) return res.redirect('/ra?pesan=gagal');
        res.redirect('/ra?pesan=berhasil');
      });
    });
  });
});

// =====================================================
// OT ROUTES
// =====================================================
app.get('/ot', (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'OT') return res.redirect('/');
  const hariIni = getTanggalWIB();
  db.all(`SELECT nomor_kamar, lantai, tipe_kamar FROM kamar WHERE aktif = 1 ORDER BY nomor_kamar`, [], (err, daftarKamar) => {
    if (err) return res.redirect('/?pesan=gagal');
    db.all(`SELECT * FROM permintaan_tamu WHERE tanggal = ? ORDER BY waktu_masuk DESC, id DESC`, [hariIni], (err, daftarPermintaan) => {
      if (err) return res.redirect('/?pesan=gagal');
      db.all(`SELECT * FROM daily_laundry WHERE tanggal = ? ORDER BY waktu_input DESC`, [hariIni], (err, daftarLaundry) => {
        if (err) return res.redirect('/?pesan=gagal');
        db.all(`SELECT * FROM fnb_linen WHERE tanggal = ? ORDER BY waktu_input DESC`, [hariIni], (err, daftarFnb) => {
          if (err) return res.redirect('/?pesan=gagal');
          db.all(`SELECT * FROM store_request WHERE tanggal = ? ORDER BY waktu_input DESC`, [hariIni], (err, daftarStore) => {
            if (err) return res.redirect('/?pesan=gagal');
            res.render('ot', {
              user: req.session.user, tanggal: hariIni, daftarKamar, daftarPermintaan,
              daftarLaundry: daftarLaundry || [], daftarFnb: daftarFnb || [], daftarStore: daftarStore || [],
              pesan: res.locals.pesan, waktuSekarang: getWaktuWIB(), waktuSingkat: getWaktuWIBJamMenit()
            });
          });
        });
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
    db.run(`INSERT INTO permintaan_tamu (tanggal, nomor_kamar, jenis_permintaan, keterangan, waktu_masuk, dibuat_oleh, status) VALUES (?, ?, ?, ?, ?, ?, 'Dipinjam Tamu')`, [hariIni, nomor_kamar, jenis_permintaan, keterangan || '', waktuMasuk, req.session.user.nama], err => err ? res.redirect('/ot?pesan=gagal') : res.redirect('/ot?pesan=berhasil'));
  });
});

app.post('/ubah-status-permintaan', (req, res) => {
  const { id, status } = req.body;
  const waktuSelesai = status === 'Dikembalikan' ? getWaktuWIBJamMenit() : null;
  db.run(`UPDATE permintaan_tamu SET status = ?, waktu_selesai = ? WHERE id = ?`, [status, waktuSelesai, id], err => err ? res.redirect('/ot?pesan=gagal') : res.redirect('/ot?pesan=berhasil'));
});

app.post('/hapus-permintaan', (req, res) => {
  db.run(`DELETE FROM permintaan_tamu WHERE id = ?`, [req.body.id], err => err ? res.redirect('/ot?pesan=gagal') : res.redirect('/ot?pesan=berhasil'));
});

// =====================================================
// DAILY LAUNDRY (FORMAT BARU)
// =====================================================
app.post('/tambah-laundry', (req, res) => {
  const hariIni = getTanggalWIB();
  const waktuInput = getWaktuWIBJamMenit();
  const { petugas, items } = req.body;

  console.log('DEBUG tambah-laundry body:', JSON.stringify(req.body, null, 2));

  if (!petugas || !items) {
    console.log('Missing petugas or items');
    return res.redirect('/ot?pesan=gagal');
  }

  // Convert items to array (Express parses items[1][nama] into { '1': { nama: '...' } })
  const itemsArray = Object.values(items);
  console.log('Items array:', JSON.stringify(itemsArray, null, 2));

  const validItems = itemsArray.filter(item => item && item.nama && item.nama !== '' && parseInt(item.qty) > 0);
  console.log('Valid items:', validItems.length);

  if (validItems.length === 0) {
    console.log('No valid items found');
    return res.redirect('/ot?pesan=gagal');
  }

  let completed = 0;
  const total = validItems.length;

  validItems.forEach(item => {
    const qty = parseInt(item.qty) || 0;
    const harga = parseInt(item.harga) || 0;
    const totalHarga = qty * harga;
    const unit = item.unit || 'Pcs';

    console.log('Inserting:', { nama: item.nama, qty, harga, unit, totalHarga });

    db.run(`INSERT INTO daily_laundry (tanggal, petugas, nama_item, kategori, harga, unit, qty, total_harga, dibuat_oleh, waktu_input) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [hariIni, petugas, item.nama, '', harga, unit, qty, totalHarga, req.session.user.nama, waktuInput],
      err => { 
        if (err) console.error('Error insert laundry:', err.message); 
        if (++completed === total) {
          console.log('All laundry items inserted successfully');
          res.redirect('/ot?pesan=berhasil');
        }
      });
  });
});

app.post('/hapus-laundry', (req, res) => {
  db.run(`DELETE FROM daily_laundry WHERE id = ?`, [req.body.id], err => err ? res.redirect('/ot?pesan=gagal') : res.redirect('/ot?pesan=berhasil'));
});

// =====================================================
// LINEN F&B (BARU)
// =====================================================
app.post('/tambah-fnb', (req, res) => {
  const hariIni = getTanggalWIB();
  const waktuInput = getWaktuWIBJamMenit();
  const { petugas_fnb, items_fnb } = req.body;

  console.log('DEBUG tambah-fnb body:', JSON.stringify(req.body, null, 2));

  if (!petugas_fnb || !items_fnb) {
    console.log('Missing petugas_fnb or items_fnb');
    return res.redirect('/ot?pesan=gagal');
  }

  const itemsArray = Object.values(items_fnb);
  console.log('F&B items array:', JSON.stringify(itemsArray, null, 2));

  const validItems = itemsArray.filter(item => item && item.nama && item.nama !== '' && parseInt(item.qty) > 0);
  console.log('Valid F&B items:', validItems.length);

  if (validItems.length === 0) {
    console.log('No valid F&B items found');
    return res.redirect('/ot?pesan=gagal');
  }

  let completed = 0;
  const total = validItems.length;

  validItems.forEach(item => {
    const qty = parseInt(item.qty) || 0;
    const harga = parseInt(item.harga) || 0;
    const totalHarga = qty * harga;
    const unit = item.unit || 'Pcs';

    console.log('Inserting F&B:', { nama: item.nama, qty, harga, unit, totalHarga });

    db.run(`INSERT INTO fnb_linen (tanggal, petugas, nama_item, kategori, harga, unit, qty, total_harga, dibuat_oleh, waktu_input) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [hariIni, petugas_fnb, item.nama, '', harga, unit, qty, totalHarga, req.session.user.nama, waktuInput],
      err => { 
        if (err) console.error('Error insert F&B:', err.message); 
        if (++completed === total) {
          console.log('All F&B items inserted successfully');
          res.redirect('/ot?pesan=berhasil');
        }
      });
  });
});

app.post('/hapus-fnb', (req, res) => {
  db.run(`DELETE FROM fnb_linen WHERE id = ?`, [req.body.id], err => err ? res.redirect('/ot?pesan=gagal') : res.redirect('/ot?pesan=berhasil'));
});

// =====================================================
// STORE REQUEST (FORMAT BARU)
// =====================================================
app.post('/tambah-store-request', (req, res) => {
  const hariIni = getTanggalWIB();
  const waktuInput = getWaktuWIBJamMenit();
  const { petugas_store, items_store } = req.body;

  console.log('DEBUG tambah-store body:', JSON.stringify(req.body, null, 2));

  if (!petugas_store || !items_store) {
    console.log('Missing petugas_store or items_store');
    return res.redirect('/ot?pesan=gagal');
  }

  const itemsArray = Object.values(items_store);
  console.log('Store items array:', JSON.stringify(itemsArray, null, 2));

  const validItems = itemsArray.filter(item => item && item.nama && item.nama !== '' && parseInt(item.qty) > 0);
  console.log('Valid store items:', validItems.length);

  if (validItems.length === 0) {
    console.log('No valid store items found');
    return res.redirect('/ot?pesan=gagal');
  }

  let completed = 0;
  const total = validItems.length;

  validItems.forEach(item => {
    const qty = parseInt(item.qty) || 0;
    const harga = parseInt(item.harga) || 0;
    const totalHarga = qty * harga;
    const unit = item.unit || 'Pcs';

    console.log('Inserting store:', { nama: item.nama, qty, harga, unit, totalHarga });

    db.run(`INSERT INTO store_request (tanggal, petugas, kategori, nama_barang, harga, unit, jumlah, total_harga, status, dibuat_oleh, waktu_input) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [hariIni, petugas_store, '', item.nama, harga, unit, qty, totalHarga, 'Pending', req.session.user.nama, waktuInput],
      err => { 
        if (err) console.error('Error insert store:', err.message); 
        if (++completed === total) {
          console.log('All store items inserted successfully');
          res.redirect('/ot?pesan=berhasil');
        }
      });
  });
});

app.post('/ubah-status-store', (req, res) => {
  const { id, status } = req.body;
  db.run(`UPDATE store_request SET status = ? WHERE id = ?`, [status, id], err => err ? res.redirect('/ot?pesan=gagal') : res.redirect('/ot?pesan=berhasil'));
});

app.post('/hapus-store-request', (req, res) => {
  db.run(`DELETE FROM store_request WHERE id = ?`, [req.body.id], err => err ? res.redirect('/ot?pesan=gagal') : res.redirect('/ot?pesan=berhasil'));
});

// =====================================================
// PDF GENERATORS
// =====================================================
app.get('/unduh-pdf-ot', (req, res) => {
  const tanggal = req.query.tanggal || getTanggalWIB();
  db.all(`SELECT nomor_kamar, jenis_permintaan, keterangan, status, waktu_masuk, waktu_selesai, dibuat_oleh FROM permintaan_tamu WHERE tanggal = ? ORDER BY waktu_masuk DESC`, [tanggal], (err, data) => {
    if (err || !data || data.length === 0) return res.send('Tidak ada data');
    const doc = new PDFDocument({ margin: 25, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Loan_Item_Today_${tanggal}.pdf`);
    doc.pipe(res);
    doc.fontSize(18).font('Helvetica-Bold').text('HORISON HOTEL & CONVENTION', { align: 'center' });
    doc.fontSize(14).text('Loan Item Today', { align: 'center', underline: true });
    doc.moveDown(1); doc.fontSize(11).text(`Tanggal: ${tanggal} | Dibuat: ${getWaktuWIB()} WIB`); doc.moveDown(1);
    doc.fontSize(10).font('Helvetica-Bold'); let y = doc.y;
    doc.text('No', 25, y, { width: 30 }); doc.text('Kamar', 55, y, { width: 50 });
    doc.text('Permintaan', 110, y, { width: 180 }); doc.text('Masuk', 295, y, { width: 50 });
    doc.text('Status', 350, y, { width: 70 }); doc.text('Selesai', 430, y, { width: 50 });
    y += 15; doc.moveTo(25, y).lineTo(520, y).stroke(); y += 8;
    doc.fontSize(10).font('Helvetica');
    data.forEach((row, i) => {
      if (y > 720) { doc.addPage(); y = 40; }
      doc.text(String(i+1), 25, y); doc.text(row.nomor_kamar, 55, y);
      doc.text(`${row.jenis_permintaan}${row.keterangan ? ` (${row.keterangan})` : ''}`, 110, y, { width: 170 });
      doc.text(row.waktu_masuk, 295, y); doc.text(row.status, 350, y); doc.text(row.waktu_selesai || '-', 430, y);
      y += 18;
    }); doc.end();
  });
});

app.get('/unduh-pdf-laundry', (req, res) => {
  const tanggal = req.query.tanggal || getTanggalWIB();
  db.all(`SELECT * FROM daily_laundry WHERE tanggal = ? ORDER BY waktu_input DESC`, [tanggal], (err, data) => {
    if (err || !data || data.length === 0) return res.send('Tidak ada data laundry');
    const doc = new PDFDocument({ margin: 25, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Daily_Laundry_${tanggal}.pdf`);
    doc.pipe(res);
    doc.fontSize(18).font('Helvetica-Bold').text('HORISON HOTEL & CONVENTION', { align: 'center' });
    doc.fontSize(14).text('Daily Laundry Report', { align: 'center', underline: true });
    doc.moveDown(1); doc.fontSize(11).text(`Tanggal: ${tanggal} | Dibuat: ${getWaktuWIB()} WIB`); doc.moveDown(1);
    const headers = ['No','Petugas','Item','QTY','Harga/Pcs','Total']; const colWidths = [30,100,180,50,80,80];
    let x = 25, y = doc.y;
    doc.fontSize(9).font('Helvetica-Bold');
    headers.forEach((h, i) => { doc.text(h, x, y, { width: colWidths[i], align: 'center' }); x += colWidths[i]; });
    y += 15; doc.moveTo(25, y).lineTo(520, y).stroke(); y += 5;
    doc.fontSize(9).font('Helvetica'); let grandTotal = 0;
    data.forEach((row, i) => {
      if (y > 720) { doc.addPage(); y = 40; } x = 25;
      const total = (row.qty || 0) * (row.harga || 0); grandTotal += total;
      const values = [String(i+1), row.petugas || '-', row.nama_item || '-', row.qty || 0, `Rp ${(row.harga || 0).toLocaleString('id-ID')}`, `Rp ${total.toLocaleString('id-ID')}`];
      values.forEach((v, idx) => { doc.text(String(v), x, y, { width: colWidths[idx], align: idx === 2 ? 'left' : 'center' }); x += colWidths[idx]; });
      y += 14;
    });
    y += 10; doc.fontSize(11).font('Helvetica-Bold'); doc.text(`GRAND TOTAL: Rp ${grandTotal.toLocaleString('id-ID')}`, 25, y); doc.end();
  });
});

app.get('/unduh-pdf-fnb', (req, res) => {
  const tanggal = req.query.tanggal || getTanggalWIB();
  db.all(`SELECT * FROM fnb_linen WHERE tanggal = ? ORDER BY waktu_input DESC`, [tanggal], (err, data) => {
    if (err || !data || data.length === 0) return res.send('Tidak ada data Linen F&B');
    const doc = new PDFDocument({ margin: 25, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Linen_FnB_${tanggal}.pdf`);
    doc.pipe(res);
    doc.fontSize(18).font('Helvetica-Bold').text('HORISON HOTEL & CONVENTION', { align: 'center' });
    doc.fontSize(14).text('Linen F&B Report', { align: 'center', underline: true });
    doc.moveDown(1); doc.fontSize(11).text(`Tanggal: ${tanggal} | Dibuat: ${getWaktuWIB()} WIB`); doc.moveDown(1);
    const headers = ['No','Petugas','Item','QTY','Harga/Pcs','Total']; const colWidths = [30,100,180,50,80,80];
    let x = 25, y = doc.y;
    doc.fontSize(9).font('Helvetica-Bold');
    headers.forEach((h, i) => { doc.text(h, x, y, { width: colWidths[i], align: 'center' }); x += colWidths[i]; });
    y += 15; doc.moveTo(25, y).lineTo(520, y).stroke(); y += 5;
    doc.fontSize(9).font('Helvetica'); let grandTotal = 0;
    data.forEach((row, i) => {
      if (y > 720) { doc.addPage(); y = 40; } x = 25;
      const total = (row.qty || 0) * (row.harga || 0); grandTotal += total;
      const values = [String(i+1), row.petugas || '-', row.nama_item || '-', row.qty || 0, `Rp ${(row.harga || 0).toLocaleString('id-ID')}`, `Rp ${total.toLocaleString('id-ID')}`];
      values.forEach((v, idx) => { doc.text(String(v), x, y, { width: colWidths[idx], align: idx === 2 ? 'left' : 'center' }); x += colWidths[idx]; });
      y += 14;
    });
    y += 10; doc.fontSize(11).font('Helvetica-Bold'); doc.text(`GRAND TOTAL: Rp ${grandTotal.toLocaleString('id-ID')}`, 25, y); doc.end();
  });
});

app.get('/unduh-pdf-store', (req, res) => {
  const tanggal = req.query.tanggal || getTanggalWIB();
  db.all(`SELECT * FROM store_request WHERE tanggal = ? ORDER BY kategori, nama_barang`, [tanggal], (err, data) => {
    if (err || !data || data.length === 0) return res.send('Tidak ada data store request');
    const doc = new PDFDocument({ margin: 25, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Store_Request_${tanggal}.pdf`);
    doc.pipe(res);
    doc.fontSize(18).font('Helvetica-Bold').text('HORISON HOTEL & CONVENTION', { align: 'center' });
    doc.fontSize(14).text('Store Request Report', { align: 'center', underline: true });
    doc.moveDown(1); doc.fontSize(11).text(`Tanggal: ${tanggal} | Dibuat: ${getWaktuWIB()} WIB`); doc.moveDown(1);
    doc.fontSize(10).font('Helvetica-Bold'); let y = doc.y;
    doc.text('No', 25, y, { width: 30 }); doc.text('Kategori', 55, y, { width: 100 });
    doc.text('Barang', 160, y, { width: 150 }); doc.text('Harga', 315, y, { width: 70 });
    doc.text('Jumlah', 390, y, { width: 50 }); doc.text('Total', 445, y, { width: 70 }); doc.text('Status', 520, y, { width: 70 });
    y += 15; doc.moveTo(25, y).lineTo(590, y).stroke(); y += 8;
    doc.fontSize(10).font('Helvetica'); let grandTotal = 0;
    data.forEach((row, i) => {
      if (y > 720) { doc.addPage(); y = 40; }
      const total = (row.jumlah || 0) * (row.harga || 0); grandTotal += total;
      doc.text(String(i+1), 25, y); doc.text(row.kategori || '-', 55, y, { width: 100 });
      doc.text(row.nama_barang || '-', 160, y, { width: 150 }); doc.text(`Rp ${(row.harga || 0).toLocaleString('id-ID')}`, 315, y, { width: 70 });
      doc.text(String(row.jumlah || 0), 390, y, { width: 50 }); doc.text(`Rp ${total.toLocaleString('id-ID')}`, 445, y, { width: 70 }); doc.text(row.status || 'Pending', 520, y, { width: 70 });
      y += 18;
    });
    y += 10; doc.fontSize(11).font('Helvetica-Bold'); doc.text(`GRAND TOTAL: Rp ${grandTotal.toLocaleString('id-ID')}`, 25, y); doc.end();
  });
});

app.get('/unduh-pdf', (req, res) => {
  const tanggal = req.query.tanggal || getTanggalWIB();
  const ra = req.query.ra || null;
  let query = `SELECT t.*, k.lantai, k.tipe_kamar, IFNULL(l.waktu_masuk, '-') AS waktu_masuk, IFNULL(l.waktu_keluar, '-') AS waktu_keluar, l.* FROM tugas t JOIN kamar k ON t.kamar = k.nomor_kamar LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar WHERE t.tanggal = ? AND t.sudah_dibagikan = 1`;
  const param = [tanggal];
  if (ra) { query += ` AND t.petugas = ?`; param.push(ra); }
  query += ` ORDER BY t.petugas, t.kamar`;
  db.all(query, param, (err, dataKamar) => {
    if (err || !dataKamar || dataKamar.length === 0) return res.send('Tidak ada data kamar yang sudah dibagikan');
    const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Daily_RA_Report_${ra ? ra + '_' : ''}${tanggal}.pdf`);
    doc.pipe(res);
    const judul = ra ? `Daily Room Attendant Report - ${ra}` : 'Daily Room Attendant Report';
    doc.font('Helvetica-Bold').fontSize(18).text('HORISON HOTEL & CONVENTION', { align: 'center' });
    doc.fontSize(14).text(judul, { align: 'center', underline: true }); doc.moveDown(1);
    doc.font('Helvetica').fontSize(11).text(`Tanggal: ${tanggal} | Dibuat: ${getWaktuWIB()} WIB`); doc.moveDown(1);
    let totalBiaya = 0, y = doc.y;
    const PAGE_BOTTOM = 520, HEADER_HEIGHT = 35, ITEM_HEIGHT = 14, TOTAL_HEIGHT = 20, SPACING = 15;
    const checkPageBreak = (neededSpace) => { if (y + neededSpace > PAGE_BOTTOM) { doc.addPage(); y = 30; return true; } return false; };
    dataKamar.forEach((row, idx) => {
      let biayaKamar = 0; const barangTerpakai = [];
      Object.keys(HARGA_BARANG).forEach(nama => {
        const jumlah = row[nama] || 0;
        if (jumlah > 0) { const sub = jumlah * HARGA_BARANG[nama]; biayaKamar += sub; barangTerpakai.push({ nama: nama.replace(/_/g, ' '), jumlah, harga: HARGA_BARANG[nama], sub }); }
      });
      const contentHeight = barangTerpakai.length > 0 ? (barangTerpakai.length * ITEM_HEIGHT) + TOTAL_HEIGHT : ITEM_HEIGHT + TOTAL_HEIGHT;
      const totalNeeded = HEADER_HEIGHT + contentHeight + SPACING;
      checkPageBreak(totalNeeded);
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text(`Kamar: ${row.kamar} | Lantai: ${row.lantai} | Petugas: ${row.petugas || '-'}`, 20, y);
      doc.text(`FO: ${row.status_awal || '-'} | HK IN: ${row.status_hk_in || '-'} | HK OUT: ${row.status_hk_out || '-'} | Masuk: ${row.waktu_masuk} | Keluar: ${row.waktu_keluar}`, 20, y + 15); y += HEADER_HEIGHT;
      doc.font('Helvetica').fontSize(9);
      if (barangTerpakai.length > 0) {
        barangTerpakai.forEach(item => {
          if (y + ITEM_HEIGHT > PAGE_BOTTOM) { doc.addPage(); y = 30; doc.font('Helvetica-Bold').fontSize(9).text(`(Lanjutan Kamar ${row.kamar})`, 20, y); y += 15; doc.font('Helvetica').fontSize(9); }
          doc.text(`${item.nama}: ${item.jumlah} x Rp ${item.harga.toLocaleString('id-ID')} = Rp ${item.sub.toLocaleString('id-ID')}`, 25, y); y += ITEM_HEIGHT;
        });
      } else {
        if (y + ITEM_HEIGHT > PAGE_BOTTOM) { doc.addPage(); y = 30; doc.font('Helvetica-Bold').fontSize(9).text(`(Lanjutan Kamar ${row.kamar})`, 20, y); y += 15; doc.font('Helvetica').fontSize(9); }
        doc.text('Belum ada laporan pemakaian barang', 25, y); y += ITEM_HEIGHT;
      }
      if (y + TOTAL_HEIGHT > PAGE_BOTTOM) { doc.addPage(); y = 30; doc.font('Helvetica-Bold').fontSize(9).text(`(Lanjutan Kamar ${row.kamar})`, 20, y); y += 15; }
      doc.font('Helvetica-Bold').fontSize(10); doc.text(`Total Biaya Kamar: Rp ${biayaKamar.toLocaleString('id-ID')}`, 25, y); totalBiaya += biayaKamar; y += TOTAL_HEIGHT + SPACING;
    });
    if (y + 30 > PAGE_BOTTOM) { doc.addPage(); y = 30; }
    doc.font('Helvetica-Bold').fontSize(12); doc.text(`TOTAL KESELURUHAN: Rp ${totalBiaya.toLocaleString('id-ID')}`, 20, y); doc.end();
  });
});


// =====================================================
// EXCEL GENERATORS
// =====================================================
app.get('/unduh-excel', async (req, res) => {
  try {
    const tanggal = req.query.tanggal || getTanggalWIB();
    const raFilter = req.query.ra || null;
    console.log('Download Excel request:', { tanggal, raFilter });

    const daftarRA = await new Promise((resolve, reject) => {
      let query = `SELECT DISTINCT petugas FROM tugas WHERE tanggal = ? AND petugas != '' AND sudah_dibagikan = 1`;
      const params = [tanggal];
      if (raFilter) { query += ` AND petugas = ?`; params.push(raFilter); }
      query += ` ORDER BY petugas`;
      db.all(query, params, (err, rows) => {
        if (err) { console.error('Error ambil daftar RA:', err.message); return reject(err); }
        resolve(rows.map(r => r.petugas));
      });
    });

    if (daftarRA.length === 0) return res.send('Tidak ada RA yang memiliki tugas untuk tanggal ini');

    const workbook = new ExcelJS.Workbook();
    const linenFields = ['sheet_king','sheet_twin','duvet_king','duvet_twin','bath_towel','hand_towel','bath_mat','pillow_case'];
    const linenSelects = linenFields.map(f => 'IFNULL(l.' + f + ', 0) AS ' + f).join(', ');
    const guestFields = ['shower_cap','dental_kit','laundry_bag','laundry_list','note_pad','pensil','tissue_roll','tissue_facial','cotton_bud','slipper','comb','stirer','coffee','sugar','tea','creamer','mineral','poly_bag_kecil','poly_bag_besar'];
    const guestSelects = guestFields.map(f => 'IFNULL(l.' + f + ', 0) AS ' + f).join(', ');

    for (let i = 0; i < daftarRA.length; i++) {
      const ra = daftarRA[i];
      const sheet = workbook.addWorksheet(ra);
      sheet.getRow(1).height = 18.75; sheet.getRow(6).height = 33.75; sheet.getRow(7).height = 24;
      const colList = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','AA','AB','AC','AD','AE','AF','AG','AH','AI','AJ','AK','AL','AM','AN','AO','AP','AQ','AR'];
      colList.forEach(col => { sheet.getColumn(col).width = 4.0; });
      const allBorder = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
      const subHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };

      const LOGO_URL = 'https://www.image2url.com/r2/default/images/1783906749722-699e9760-3deb-4dfc-97e3-8026e5fbac63.jpeg';
      if (axios) {
        try {
          const logoResponse = await axios.get(LOGO_URL, { responseType: 'arraybuffer', timeout: 10000 });
          const logoBuffer = Buffer.from(logoResponse.data, 'binary');
          const imageId = workbook.addImage({ buffer: logoBuffer, extension: 'jpeg' });
          sheet.addImage(imageId, { tl: { col: 40, row: 0 }, br: { col: 44, row: 3 } });
        } catch (e) { console.log('Logo tidak terpasang:', e.message); }
      }

      sheet.getCell('A1').value = 'ROOMBOY CONTROL SHEET';
      sheet.getCell('A1').font = { name: 'Calibri', bold: true, size: 14 };
      sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'center' };
      sheet.mergeCells('A1:AR1');

      sheet.getCell('A3').value = 'DATE:'; sheet.getCell('A3').font = { name: 'Calibri', bold: true, size: 11 };
      sheet.getCell('B3').value = tanggal; sheet.getCell('B3').font = { name: 'Calibri', size: 11 };
      sheet.getCell('D3').value = 'SHIFT:'; sheet.getCell('D3').font = { name: 'Calibri', bold: true, size: 11 };
      sheet.getCell('E3').value = 'Morning'; sheet.getCell('E3').font = { name: 'Calibri', size: 11 };
      sheet.getCell('I3').value = 'FLOOR/SECTION:'; sheet.getCell('I3').font = { name: 'Calibri', bold: true, size: 11 };

      const r4Headers = [{ col: 'A', text: 'NO' },{ col: 'B', text: 'NO OF ROOM' },{ col: 'C', text: 'ROOM STATUS' },{ col: 'F', text: 'TIME' },{ col: 'H', text: 'LINEN' },{ col: 'X', text: 'GUEST SUPPLIES & AMENITIES' }];
      r4Headers.forEach(h => {
        const cell = sheet.getCell(h.col + '4'); cell.value = h.text;
        cell.font = { name: 'Calibri', bold: true, size: 9 }; cell.fill = headerFill;
        cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true }; cell.border = allBorder;
      });
      sheet.mergeCells('A4:A6'); sheet.mergeCells('B4:B6'); sheet.mergeCells('C4:E5'); sheet.mergeCells('F4:G5'); sheet.mergeCells('H4:W5'); sheet.mergeCells('X4:AR5');

      ['C','D','E','F','G'].forEach(col => { const cell = sheet.getCell(col + '6'); cell.font = { name: 'Calibri', size: 11 }; cell.border = allBorder; });
      sheet.getCell('C6').value = 'FO'; sheet.getCell('D6').value = 'HK'; sheet.getCell('E6').value = 'HK';
      sheet.getCell('F6').value = 'IN'; sheet.getCell('G6').value = 'OUT';

      const linenSubHeaders = [{ col: 'H', text: 'SHEET\nDOUBLE', merge: 'H6:I6' },{ col: 'J', text: 'SHEET\nSINGLE', merge: 'J6:K6' },{ col: 'L', text: 'DUVET\nCOVER', merge: 'L6:M6' },{ col: 'N', text: 'DUVET\nSINGLE', merge: 'N6:O6' },{ col: 'P', text: 'BATH\nTOWEL', merge: 'P6:Q6' },{ col: 'R', text: 'HAND\nTOWEL', merge: 'R6:S6' },{ col: 'T', text: 'BATH\nMAT', merge: 'T6:U6' },{ col: 'V', text: 'PILLOW\nCASE', merge: 'V6:W6' }];
      linenSubHeaders.forEach(h => {
        const cell = sheet.getCell(h.col + '6'); cell.value = h.text;
        cell.font = { name: 'Calibri', bold: true, size: 8 }; cell.fill = headerFill;
        cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true }; cell.border = allBorder;
        if (h.merge) sheet.mergeCells(h.merge);
      });

      const guestSubHeaders = [{ col: 'X', text: 'BATH ROOM', merge: 'X6:Y6' },{ col: 'Z', text: 'BED ROOM', merge: 'Z6:AD6' },{ col: 'AE', text: 'CONDIMEN', merge: 'AE6:AR6' }];
      guestSubHeaders.forEach(h => {
        const cell = sheet.getCell(h.col + '6'); cell.value = h.text;
        cell.font = { name: 'Calibri', bold: true, size: 8 }; cell.fill = headerFill;
        cell.alignment = { horizontal: 'center', vertical: 'center' }; cell.border = allBorder;
        if (h.merge) sheet.mergeCells(h.merge);
      });

      const linenInOut = ['H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W'];
      linenInOut.forEach((col, idx) => {
        const cell = sheet.getCell(col + '7'); cell.value = idx % 2 === 0 ? 'IN' : 'OUT';
        cell.font = { name: 'Calibri', size: 8 }; cell.alignment = { horizontal: 'center', vertical: 'center' }; cell.border = allBorder;
      });

      const guestItems = [{ col: 'X', text: 'SHOWER CAP' },{ col: 'Y', text: 'DENTAL KIT' },{ col: 'Z', text: 'LAUNDRY BAG' },{ col: 'AA', text: 'LAUNDRY LIST' },{ col: 'AB', text: 'MEMO PAD' },{ col: 'AC', text: 'PENCIL' },{ col: 'AD', text: 'GUEST COMMENT' },{ col: 'AE', text: 'TISSUE ROLL' },{ col: 'AF', text: 'HAND SOAP' },{ col: 'AG', text: 'SHAMPOO' },{ col: 'AH', text: 'SHOWER GEL' },{ col: 'AI', text: 'TOOTH BRUSH' },{ col: 'AJ', text: 'STERER' },{ col: 'AK', text: 'SLIPPER' },{ col: 'AL', text: 'COFFEE' },{ col: 'AM', text: 'SUGAR' },{ col: 'AN', text: 'TEA' },{ col: 'AO', text: 'CREAMER' },{ col: 'AP', text: 'MINERAL WATER' },{ col: 'AQ', text: 'PLASTIC BIN' },{ col: 'AR', text: 'TISUE' }];
      guestItems.forEach(item => {
        const cell = sheet.getCell(item.col + '7'); cell.value = item.text;
        cell.font = { name: 'Calibri', bold: true, size: 8 }; cell.fill = subHeaderFill;
        cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true }; cell.border = allBorder;
      });

      for (let row = 4; row <= 7; row++) {
        colList.forEach(col => { const cell = sheet.getCell(col + row); if (!cell.border || !cell.border.top) cell.border = allBorder; });
      }

      const dataRA = await new Promise((resolve, reject) => {
        const query = `SELECT t.petugas, t.kamar, t.status_awal AS status_fo, t.status_hk_in, t.status_hk_out, t.selesai, k.lantai, IFNULL(l.waktu_masuk, '-') AS waktu_masuk, IFNULL(l.waktu_keluar, '-') AS waktu_keluar, ${linenSelects}, ${guestSelects} FROM tugas t JOIN kamar k ON t.kamar = k.nomor_kamar LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar WHERE t.tanggal = ? AND t.petugas = ? AND t.sudah_dibagikan = 1 ORDER BY t.kamar`;
        db.all(query, [tanggal, ra], (err, rows) => { if (err) return reject(err); resolve(rows); });
      });

      sheet.getCell('L3').value = (dataRA[0] && dataRA[0].lantai) ? dataRA[0].lantai : '-';
      sheet.getCell('L3').font = { name: 'Calibri', size: 11 };

      let baris = 8, no = 1, maxDataRow = 35;
      dataRA.forEach((data) => {
        if (baris > maxDataRow) return;
        const dataFont = { name: 'Calibri', size: 11 };
        sheet.getCell('A' + baris).value = no++; sheet.getCell('A' + baris).font = dataFont; sheet.getCell('A' + baris).alignment = { horizontal: 'center', vertical: 'center' }; sheet.getCell('A' + baris).border = allBorder;
        sheet.getCell('B' + baris).value = data.kamar || ''; sheet.getCell('B' + baris).font = dataFont; sheet.getCell('B' + baris).alignment = { horizontal: 'center', vertical: 'center' }; sheet.getCell('B' + baris).border = allBorder;
        sheet.getCell('C' + baris).value = data.status_fo || ''; sheet.getCell('C' + baris).font = dataFont; sheet.getCell('C' + baris).alignment = { horizontal: 'center', vertical: 'center' }; sheet.getCell('C' + baris).border = allBorder;
        let statusHKin = data.status_hk_in || ''; if (!statusHKin) { if (data.status_fo === 'VD' || data.status_fo === 'ED') statusHKin = 'VD'; else if (data.status_fo === 'VCU') statusHKin = 'VCU'; else if (data.status_fo === 'OD') statusHKin = 'OD'; }
        sheet.getCell('D' + baris).value = statusHKin; sheet.getCell('D' + baris).font = dataFont; sheet.getCell('D' + baris).alignment = { horizontal: 'center', vertical: 'center' }; sheet.getCell('D' + baris).border = allBorder;
        let statusHKout = data.status_hk_out || ''; if (!statusHKout && data.selesai === 1) { if (statusHKin === 'VD' || statusHKin === 'VCU' || data.status_fo === 'ED') statusHKout = 'VC'; else if (statusHKin === 'OD') statusHKout = 'OC'; }
        sheet.getCell('E' + baris).value = statusHKout; sheet.getCell('E' + baris).font = dataFont; sheet.getCell('E' + baris).alignment = { horizontal: 'center', vertical: 'center' }; sheet.getCell('E' + baris).border = allBorder;
        sheet.getCell('F' + baris).value = data.waktu_masuk !== '-' ? data.waktu_masuk : ''; sheet.getCell('F' + baris).font = dataFont; sheet.getCell('F' + baris).alignment = { horizontal: 'center', vertical: 'center' }; sheet.getCell('F' + baris).border = allBorder;
        sheet.getCell('G' + baris).value = data.waktu_keluar !== '-' ? data.waktu_keluar : ''; sheet.getCell('G' + baris).font = dataFont; sheet.getCell('G' + baris).alignment = { horizontal: 'center', vertical: 'center' }; sheet.getCell('G' + baris).border = allBorder;

        const linenValues = [{ db: 'sheet_king', inCol: 'H', outCol: 'I' },{ db: 'sheet_twin', inCol: 'J', outCol: 'K' },{ db: 'duvet_king', inCol: 'L', outCol: 'M' },{ db: 'duvet_twin', inCol: 'N', outCol: 'O' },{ db: 'bath_towel', inCol: 'P', outCol: 'Q' },{ db: 'hand_towel', inCol: 'R', outCol: 'S' },{ db: 'bath_mat', inCol: 'T', outCol: 'U' },{ db: 'pillow_case', inCol: 'V', outCol: 'W' }];
        linenValues.forEach(item => {
          const val = data[item.db] || 0;
          const inCell = sheet.getCell(item.inCol + baris); inCell.value = val; inCell.font = dataFont; inCell.alignment = { horizontal: 'center', vertical: 'center' }; inCell.border = allBorder;
          const outCell = sheet.getCell(item.outCol + baris); outCell.value = val; outCell.font = dataFont; outCell.alignment = { horizontal: 'center', vertical: 'center' }; outCell.border = allBorder;
        });

        const guestValues = [{ col: 'X', db: 'shower_cap' },{ col: 'Y', db: 'dental_kit' },{ col: 'Z', db: 'laundry_bag' },{ col: 'AA', db: 'laundry_list' },{ col: 'AB', db: 'note_pad' },{ col: 'AC', db: 'pensil' },{ col: 'AD', db: '' },{ col: 'AE', db: 'tissue_roll' },{ col: 'AF', db: 'tissue_facial' },{ col: 'AG', db: 'cotton_bud' },{ col: 'AH', db: 'slipper' },{ col: 'AI', db: 'comb' },{ col: 'AJ', db: 'stirer' },{ col: 'AK', db: 'slipper' },{ col: 'AL', db: 'coffee' },{ col: 'AM', db: 'sugar' },{ col: 'AN', db: 'tea' },{ col: 'AO', db: 'creamer' },{ col: 'AP', db: 'mineral' },{ col: 'AQ', db: 'poly_bag_kecil' },{ col: 'AR', db: 'tissue_facial' }];
        guestValues.forEach(g => {
          const cell = sheet.getCell(g.col + baris); if (g.db) cell.value = data[g.db] || 0; else cell.value = '';
          cell.font = dataFont; cell.alignment = { horizontal: 'center', vertical: 'center' }; cell.border = allBorder;
        });
        baris++;
      });

      while (baris <= maxDataRow) {
        colList.forEach(col => { const cell = sheet.getCell(col + baris); cell.border = allBorder; });
        sheet.getCell('A' + baris).value = no++; sheet.getCell('A' + baris).font = { name: 'Calibri', size: 11 }; sheet.getCell('A' + baris).alignment = { horizontal: 'center', vertical: 'center' };
        baris++;
      }

      const totalRow = 36;
      sheet.getCell('A' + totalRow).value = 'TOTAL SOILED:'; sheet.getCell('A' + totalRow).font = { name: 'Calibri', bold: true, size: 11 }; sheet.mergeCells('A' + totalRow + ':G' + totalRow);
      const sumCols = ['H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W'];
      sumCols.forEach(col => { const cell = sheet.getCell(col + totalRow); cell.value = { formula: `SUM(${col}8:${col}35)` }; cell.font = { name: 'Calibri', size: 11 }; cell.alignment = { horizontal: 'center', vertical: 'center' }; cell.border = allBorder; });
      colList.slice(0, 7).forEach(col => { const cell = sheet.getCell(col + totalRow); cell.border = allBorder; });

      const remarksRow = 37;
      sheet.getCell('A' + remarksRow).value = 'REMARKS'; sheet.getCell('A' + remarksRow).font = { name: 'Calibri', bold: true, size: 11 };
      sheet.mergeCells('A' + remarksRow + ':B' + (remarksRow + 2)); sheet.mergeCells('C' + remarksRow + ':AR' + (remarksRow + 2));
      colList.forEach(col => { for (let r = remarksRow; r <= remarksRow + 2; r++) { const cell = sheet.getCell(col + r); cell.border = allBorder; } });

      const legendStart = remarksRow + 3;
      const legends = [['ED','EXPECTED DEPARTURE','VC','VACANT CLEAN','DND','DO NOT DISTURB'],['EA','EXPECTING ARRIVAL','OD','OCCUPIED DIRTY','HU','HOUSE USE'],['VD','VACANT DIRTY','OC','OCCUPIED CLEAN','OO','OUT OF ORDER'],['VCU','VACAN CLEAN UNCHECK','ONL','OCCUPIED NO LUGAGE','SO','SLEEP OUT'],['DU','DAY USE','DL','DOUBLE LOCK','','']];
      legends.forEach((legend, idx) => {
        const row = legendStart + idx;
        sheet.getCell('C' + row).value = legend[0]; sheet.getCell('C' + row).font = { name: 'Calibri', bold: true, size: 11 };
        sheet.getCell('D' + row).value = legend[1]; sheet.getCell('D' + row).font = { name: 'Calibri', size: 11 };
        sheet.getCell('F' + row).value = legend[2]; sheet.getCell('F' + row).font = { name: 'Calibri', bold: true, size: 11 };
        sheet.getCell('G' + row).value = legend[3]; sheet.getCell('G' + row).font = { name: 'Calibri', size: 11 };
        sheet.getCell('I' + row).value = legend[4]; sheet.getCell('I' + row).font = { name: 'Calibri', bold: true, size: 11 };
        sheet.getCell('J' + row).value = legend[5]; sheet.getCell('J' + row).font = { name: 'Calibri', size: 11 };
      });

      const signRow = legendStart + legends.length + 1;
      sheet.getCell('C' + signRow).value = 'PREPARED BY:'; sheet.getCell('C' + signRow).font = { name: 'Calibri', bold: true, size: 11 };
      sheet.getCell('X' + signRow).value = 'CHECKED BY'; sheet.getCell('X' + signRow).font = { name: 'Calibri', bold: true, size: 11 };
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Roomboy_Control_Sheet_' + tanggal + '.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error membuat Excel:', err);
    res.send('Gagal membuat file Excel: ' + err.message);
  }
});

app.get('/unduh-excel-laundry', async (req, res) => {
  try {
    const tanggal = req.query.tanggal || getTanggalWIB();
    const data = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM daily_laundry WHERE tanggal = ? ORDER BY waktu_input DESC`, [tanggal], (err, rows) => { if (err) return reject(err); resolve(rows); });
    });
    if (data.length === 0) return res.send('Tidak ada data laundry');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Daily Laundry');
    sheet.getCell('A1').value = 'DAILY LAUNDRY REPORT'; sheet.getCell('A1').font = { name: 'Calibri', bold: true, size: 14 }; sheet.mergeCells('A1:F1');
    sheet.getCell('A2').value = `Tanggal: ${tanggal}`; sheet.getCell('A2').font = { name: 'Calibri', size: 11 };
    const headers = ['No','Petugas','Item','QTY','Harga/Pcs','Total']; const allBorder = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }; const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    headers.forEach((h, i) => { const col = String.fromCharCode(65 + i); const cell = sheet.getCell(col + '4'); cell.value = h; cell.font = { name: 'Calibri', bold: true, size: 9 }; cell.fill = headerFill; cell.alignment = { horizontal: 'center', vertical: 'center' }; cell.border = allBorder; sheet.getColumn(col).width = 15; });
    sheet.getColumn('B').width = 20; sheet.getColumn('C').width = 25;
    let grandTotal = 0;
    data.forEach((row, i) => {
      const r = i + 5;
      const total = (row.qty || 0) * (row.harga || 0); grandTotal += total;
      const values = [i + 1, row.petugas || '', row.nama_item || '-', row.qty || 0, row.harga || 0, total];
      values.forEach((v, idx) => { const col = String.fromCharCode(65 + idx); const cell = sheet.getCell(col + r); cell.value = v; cell.font = { name: 'Calibri', size: 11 }; cell.alignment = { horizontal: 'center', vertical: 'center' }; cell.border = allBorder; });
    });
    const totalRow = data.length + 5;
    sheet.getCell('A' + totalRow).value = 'GRAND TOTAL:'; sheet.getCell('A' + totalRow).font = { name: 'Calibri', bold: true, size: 11 };
    sheet.mergeCells('A' + totalRow + ':E' + totalRow);
    sheet.getCell('F' + totalRow).value = grandTotal; sheet.getCell('F' + totalRow).font = { name: 'Calibri', bold: true, size: 11 };
    sheet.getCell('F' + totalRow).alignment = { horizontal: 'center', vertical: 'center' };
    ['A','B','C','D','E','F'].forEach(col => { sheet.getCell(col + totalRow).border = allBorder; });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Daily_Laundry_${tanggal}.xlsx`);
    await workbook.xlsx.write(res); res.end();
  } catch (err) { console.error('Error:', err); res.send('Gagal membuat Excel: ' + err.message); }
});

app.get('/unduh-excel-fnb', async (req, res) => {
  try {
    const tanggal = req.query.tanggal || getTanggalWIB();
    const data = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM fnb_linen WHERE tanggal = ? ORDER BY waktu_input DESC`, [tanggal], (err, rows) => { if (err) return reject(err); resolve(rows); });
    });
    if (data.length === 0) return res.send('Tidak ada data Linen F&B');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Linen F&B');
    sheet.getCell('A1').value = 'LINEN F&B REPORT'; sheet.getCell('A1').font = { name: 'Calibri', bold: true, size: 14 }; sheet.mergeCells('A1:F1');
    sheet.getCell('A2').value = `Tanggal: ${tanggal}`; sheet.getCell('A2').font = { name: 'Calibri', size: 11 };
    const headers = ['No','Petugas','Item','QTY','Harga/Pcs','Total']; const allBorder = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }; const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    headers.forEach((h, i) => { const col = String.fromCharCode(65 + i); const cell = sheet.getCell(col + '4'); cell.value = h; cell.font = { name: 'Calibri', bold: true, size: 9 }; cell.fill = headerFill; cell.alignment = { horizontal: 'center', vertical: 'center' }; cell.border = allBorder; sheet.getColumn(col).width = 15; });
    sheet.getColumn('B').width = 20; sheet.getColumn('C').width = 25;
    let grandTotal = 0;
    data.forEach((row, i) => {
      const r = i + 5;
      const total = (row.qty || 0) * (row.harga || 0); grandTotal += total;
      const values = [i + 1, row.petugas || '', row.nama_item || '-', row.qty || 0, row.harga || 0, total];
      values.forEach((v, idx) => { const col = String.fromCharCode(65 + idx); const cell = sheet.getCell(col + r); cell.value = v; cell.font = { name: 'Calibri', size: 11 }; cell.alignment = { horizontal: 'center', vertical: 'center' }; cell.border = allBorder; });
    });
    const totalRow = data.length + 5;
    sheet.getCell('A' + totalRow).value = 'GRAND TOTAL:'; sheet.getCell('A' + totalRow).font = { name: 'Calibri', bold: true, size: 11 };
    sheet.mergeCells('A' + totalRow + ':E' + totalRow);
    sheet.getCell('F' + totalRow).value = grandTotal; sheet.getCell('F' + totalRow).font = { name: 'Calibri', bold: true, size: 11 };
    sheet.getCell('F' + totalRow).alignment = { horizontal: 'center', vertical: 'center' };
    ['A','B','C','D','E','F'].forEach(col => { sheet.getCell(col + totalRow).border = allBorder; });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Linen_FnB_${tanggal}.xlsx`);
    await workbook.xlsx.write(res); res.end();
  } catch (err) { console.error('Error:', err); res.send('Gagal membuat Excel: ' + err.message); }
});

app.get('/unduh-excel-store', async (req, res) => {
  try {
    const tanggal = req.query.tanggal || getTanggalWIB();
    const data = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM store_request WHERE tanggal = ? ORDER BY kategori, nama_barang`, [tanggal], (err, rows) => { if (err) return reject(err); resolve(rows); });
    });
    if (data.length === 0) return res.send('Tidak ada data store request');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Store Request');
    sheet.getCell('A1').value = 'STORE REQUEST HOUSEKEEPING'; sheet.getCell('A1').font = { name: 'Calibri', bold: true, size: 14 }; sheet.mergeCells('A1:H1');
    sheet.getCell('A2').value = `Tanggal: ${tanggal}`; sheet.getCell('A2').font = { name: 'Calibri', size: 11 };
    const headers = ['No','Kategori','Nama Barang','Harga','Unit','Jumlah','Total Harga','Status']; const allBorder = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }; const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    headers.forEach((h, i) => { const col = String.fromCharCode(65 + i); const cell = sheet.getCell(col + '4'); cell.value = h; cell.font = { name: 'Calibri', bold: true, size: 9 }; cell.fill = headerFill; cell.alignment = { horizontal: 'center', vertical: 'center' }; cell.border = allBorder; });
    sheet.getColumn('A').width = 6; sheet.getColumn('B').width = 20; sheet.getColumn('C').width = 30; sheet.getColumn('D').width = 15; sheet.getColumn('E').width = 10; sheet.getColumn('F').width = 10; sheet.getColumn('G').width = 15; sheet.getColumn('H').width = 12;
    data.forEach((row, i) => {
      const r = i + 5;
      const values = [i + 1, row.kategori || '', row.nama_barang || '', row.harga || 0, row.unit || '', row.jumlah || 0, row.total_harga || 0, row.status || 'Pending'];
      values.forEach((v, idx) => { const col = String.fromCharCode(65 + idx); const cell = sheet.getCell(col + r); cell.value = v; cell.font = { name: 'Calibri', size: 11 }; cell.alignment = { horizontal: 'center', vertical: 'center' }; cell.border = allBorder; });
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Store_Request_${tanggal}.xlsx`);
    await workbook.xlsx.write(res); res.end();
  } catch (err) { console.error('Error:', err); res.send('Gagal membuat Excel: ' + err.message); }
});

// =====================================================
// CLEANUP ROUTE - Hapus data lama yang corrupt
// =====================================================
app.get('/cleanup-old-data', (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'OT') return res.redirect('/');

  let deletedLaundry = 0, deletedStore = 0;

  db.run(`DELETE FROM daily_laundry WHERE nama_item IS NULL OR nama_item = '' OR qty = 0`, function(err) {
    if (!err) deletedLaundry = this.changes;
    db.run(`DELETE FROM store_request WHERE nama_barang IS NULL OR nama_barang = '' OR jumlah = 0`, function(err) {
      if (!err) deletedStore = this.changes;
      res.send(`
        <h2>✅ Cleanup Selesai</h2>
        <p>Data laundry dihapus: ${deletedLaundry} baris</p>
        <p>Data store dihapus: ${deletedStore} baris</p>
        <p><a href="/ot">Kembali ke Panel OT</a></p>
      `);
    });
  });
});

app.get('/logout', (req, res) => { req.session.destroy(() => { res.redirect('/'); }); });
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
