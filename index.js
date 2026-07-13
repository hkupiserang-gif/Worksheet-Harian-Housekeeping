const express = require('express');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { parse } = require('json2csv');
const PDFDocument = require('pdfkit');
const cron = require('node-cron');
const ExcelJS = require('exceljs');

let axios;
try {
  axios = require('axios');
} catch (e) {
  console.log('⚠ axios belum terinstall, fitur logo dinonaktifkan. Jalankan: npm install axios');
}

const app = express();
const PORT = process.env.PORT || 8888;
process.env.TZ = 'Asia/Jakarta';

const getWaktuWIB = () => {
  const now = new Date();
  return now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
};
const getWaktuWIBJamMenit = () => {
  const now = new Date();
  return now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
};
const getTanggalWIB = () => {
  const now = new Date();
  return now.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
};

const HARGA_BARANG = {
  sheet_twin: 2750, sheet_king: 2950, duvet_twin: 4750, duvet_king: 6250,
  bath_towel: 2850, hand_towel: 1750, bath_mat: 2250, pillow_case: 1750,
  shower_cap: 600, dental_kit: 1450, laundry_bag: 1150, laundry_list: 150,
  dnd_sign: 0, magic: 0, shoe: 0, sugar: 155, tea: 471, coffee: 665, creamer: 212,
  mineral: 2146, tissue_facial: 9400, tissue_roll: 1443, cotton_bud: 460,
  slipper: 2500, comb: 750, shaving_kit: 2620, stirer: 1400, coster: 350,
  poly_bag_kecil: 19500, poly_bag_besar: 19500, pensil: 1200, note_pad: 500
};

const AMENITY_FIELDS = [
  'sheet_twin', 'sheet_king', 'duvet_twin', 'duvet_king',
  'bath_towel', 'hand_towel', 'bath_mat', 'pillow_case',
  'shower_cap', 'dental_kit', 'laundry_bag', 'laundry_list',
  'dnd_sign', 'magic', 'shoe', 'sugar', 'tea', 'coffee', 'creamer', 'mineral',
  'tissue_facial', 'tissue_roll', 'cotton_bud', 'slipper', 'comb',
  'shaving_kit', 'stirer', 'coster', 'poly_bag_kecil', 'poly_bag_besar',
  'pensil', 'note_pad'
];

const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'database.db') : './database.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ Koneksi DB gagal:", err.message);
  else console.log("✅ Terhubung ke SQLite di:", dbPath);
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS pengguna (id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT NOT NULL, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, peran TEXT NOT NULL, aktif BOOLEAN DEFAULT 1)`);
  db.get(`SELECT 1 FROM pengguna WHERE username = 'nizar'`, (err, row) => {
    if (!row) {
      db.run(`INSERT INTO pengguna (nama, username, password, peran) VALUES ('Aslan', 'aslan', '123', 'RA'),('Bila', 'bila', '123', 'RA'),('Indah', 'indah', '123', 'RA'),('Fika', 'fika', '123', 'RA'),('Azril', 'azril', '123', 'RA'),('Alwi', 'alwi', '123', 'RA'),('Revan', 'revan', '123', 'RA'),('Apri', 'apri', '123', 'RA'),('Nizar', 'nizar', '123', 'SPV'),('Kinan', 'kinan', '123', 'SPV'),('Ilhan', 'ilhan', '123', 'SPV'),('Alisa', 'alisa', '1234', 'OT')`);
    }
  });
  db.run(`CREATE TABLE IF NOT EXISTS kamar (nomor_kamar TEXT PRIMARY KEY, lantai TEXT NOT NULL, tipe_kamar TEXT NOT NULL, aktif BOOLEAN DEFAULT 1)`);
  db.get(`SELECT 1 FROM kamar WHERE nomor_kamar = '201'`, (err, row) => {
    if (!row) {
      const daftarKamar = [
        ['201','Lantai 2C','Deluxe'],['202','Lantai 2C','Deluxe'],['203','Lantai 2C','Deluxe'],['204','Lantai 2C','Deluxe'],['205','Lantai 2C','Deluxe'],['206','Lantai 2C','Deluxe'],['207','Lantai 2C','Deluxe'],['208','Lantai 2C','Deluxe'],['209','Lantai 2C','Deluxe'],['210','Lantai 2C','Deluxe'],['211','Lantai 2C','Deluxe'],['212','Lantai 2C','Deluxe'],['213','Lantai 2C','Deluxe'],['301','Lantai 3A','Junior Suite'],['302','Lantai 3A','Junior Suite'],['303','Lantai 3A','Deluxe'],['304','Lantai 3A','Deluxe'],['305','Lantai 3A','Deluxe'],['306','Lantai 3A','Deluxe'],['307','Lantai 3A','Deluxe'],['308','Lantai 3A','Deluxe'],['309','Lantai 3A','Deluxe'],['310','Lantai 3A','Deluxe'],['311','Lantai 3A','Deluxe'],['312','Lantai 3C','Deluxe'],['313','Lantai 3C','Deluxe'],['314','Lantai 3C','Deluxe'],['315','Lantai 3C','Deluxe'],['316','Lantai 3C','Deluxe'],['317','Lantai 3C','Deluxe'],['318','Lantai 3C','Deluxe'],['319','Lantai 3C','Deluxe'],['320','Lantai 3C','Deluxe'],['321','Lantai 3C','Deluxe'],['322','Lantai 3C','Deluxe'],['323','Lantai 3C','Deluxe'],['324','Lantai 3C','Deluxe'],['412','Lantai 4C','Deluxe'],['413','Lantai 4C','Deluxe'],['414','Lantai 4C','Deluxe'],['415','Lantai 4C','Deluxe'],['416','Lantai 4C','Deluxe'],['417','Lantai 4C','Deluxe'],['418','Lantai 4C','Deluxe'],['419','Lantai 4C','Deluxe'],['420','Lantai 4C','Deluxe'],['421','Lantai 4C','Deluxe'],['422','Lantai 4C','Deluxe'],['423','Lantai 4C','Deluxe'],['424','Lantai 4C','Deluxe'],['401','Lantai 4A','Junior Suite'],['402','Lantai 4A','Junior Suite'],['403','Lantai 4A','Premium Deluxe'],['404','Lantai 4A','Deluxe'],['405','Lantai 4A','Premium Deluxe'],['406','Lantai 4A','Deluxe'],['407','Lantai 4A','Premium Deluxe'],['408','Lantai 4A','Deluxe'],['409','Lantai 4A','Premium Deluxe'],['410','Lantai 4A','Deluxe'],['411','Lantai 4A','Premium Deluxe'],['501','Lantai 5A','Deluxe'],['502','Lantai 5A','Deluxe'],['503','Lantai 5A','Deluxe'],['504','Lantai 5A','Deluxe'],['505','Lantai 5A','Deluxe'],['506','Lantai 5A','Deluxe'],['507','Lantai 5A','Deluxe'],['508','Lantai 5C','Deluxe'],['509','Lantai 5C','Deluxe'],['510','Lantai 5C','Deluxe'],['511','Lantai 5C','Deluxe'],['512','Lantai 5C','Deluxe'],['513','Lantai 5C','Deluxe'],['514','Lantai 5C','Deluxe'],['515','Lantai 5C','Deluxe'],['516','Lantai 5C','Deluxe'],['517','Lantai 5C','Deluxe'],['518','Lantai 5C','Deluxe'],['519','Lantai 5C','Deluxe'],['520','Lantai 5C','Deluxe']
      ];
      daftarKamar.forEach(k => db.run(`INSERT OR IGNORE INTO kamar VALUES (?,?,?, 1)`, k));
    } else {
      db.run(`INSERT OR IGNORE INTO kamar (nomor_kamar, lantai, tipe_kamar, aktif) VALUES ('514', 'Lantai 5C', 'Deluxe', 1)`);
    }
  });
  db.run(`CREATE TABLE IF NOT EXISTS tugas (tanggal TEXT, kamar TEXT, petugas TEXT, status_awal TEXT DEFAULT 'VD', status_hk_in TEXT DEFAULT '', status_hk_out TEXT DEFAULT '', selesai INTEGER DEFAULT 0, sudah_dibagikan INTEGER DEFAULT 0, siap_dicek INTEGER DEFAULT 0, PRIMARY KEY (tanggal, kamar), FOREIGN KEY (kamar) REFERENCES kamar(nomor_kamar) ON DELETE CASCADE)`);
  db.run(`ALTER TABLE tugas ADD COLUMN sudah_dibagikan INTEGER DEFAULT 0`, () => {}); db.run(`ALTER TABLE tugas ADD COLUMN siap_dicek INTEGER DEFAULT 0`, () => {}); db.run(`ALTER TABLE tugas ADD COLUMN status_hk_in TEXT DEFAULT ''`, () => {}); db.run(`ALTER TABLE tugas ADD COLUMN status_hk_out TEXT DEFAULT ''`, () => {});
  db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='laporan'`, (err, row) => {
    if (!row) {
      const amenityCols = AMENITY_FIELDS.map(f => `${f} INTEGER DEFAULT 0`).join(',\n ');
      db.run(`CREATE TABLE laporan (tanggal TEXT, nomor_kamar TEXT, waktu_masuk TEXT, waktu_keluar TEXT, ${amenityCols}, petugas TEXT, PRIMARY KEY (tanggal, nomor_kamar), FOREIGN KEY (nomor_kamar) REFERENCES kamar(nomor_kamar) ON DELETE CASCADE)`);
    }
  });
  db.run(`CREATE TABLE IF NOT EXISTS permintaan_tamu (id INTEGER PRIMARY KEY AUTOINCREMENT, tanggal TEXT, nomor_kamar TEXT, jenis_permintaan TEXT, keterangan TEXT, status TEXT DEFAULT 'Dipinjam Tamu', waktu_masuk TEXT, waktu_selesai TEXT, dibuat_oleh TEXT, FOREIGN KEY (nomor_kamar) REFERENCES kamar(nomor_kamar) ON DELETE CASCADE)`);
  db.run(`CREATE TABLE IF NOT EXISTS daily_laundry (id INTEGER PRIMARY KEY AUTOINCREMENT, tanggal TEXT, petugas TEXT, sheet_twin INTEGER DEFAULT 0, sheet_king INTEGER DEFAULT 0, duvet_twin INTEGER DEFAULT 0, duvet_king INTEGER DEFAULT 0, pillow_case INTEGER DEFAULT 0, bath_towel INTEGER DEFAULT 0, hand_towel INTEGER DEFAULT 0, bath_mat INTEGER DEFAULT 0, inner_duvet_twin INTEGER DEFAULT 0, inner_duvet_king INTEGER DEFAULT 0, bed_pad_twin INTEGER DEFAULT 0, bed_pad_king INTEGER DEFAULT 0, pillow INTEGER DEFAULT 0, dibuat_oleh TEXT, waktu_input TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS store_request (id INTEGER PRIMARY KEY AUTOINCREMENT, tanggal TEXT, petugas TEXT, kategori TEXT, nama_barang TEXT, harga INTEGER DEFAULT 0, unit TEXT, jumlah INTEGER DEFAULT 0, total_harga INTEGER DEFAULT 0, status TEXT DEFAULT 'Pending', dibuat_oleh TEXT, waktu_input TEXT)`);
});

const buatTugasBaruHariIni = () => {
  const tanggalSekarang = getTanggalWIB();
  db.get(`SELECT 1 FROM tugas WHERE tanggal =? LIMIT 1`, [tanggalSekarang], (err, ada) => {
    if (!ada) {
      db.all(`SELECT nomor_kamar FROM kamar WHERE aktif = 1`, [], (err, daftarKamar) => {
        if (err) return;
        daftarKamar.forEach(k => { db.run(`INSERT OR IGNORE INTO tugas (tanggal, kamar, petugas, status_awal, status_hk_in, status_hk_out, selesai, sudah_dibagikan, siap_dicek) VALUES (?,?, '', 'VD', '', '', 0, 0, 0)`, [tanggalSekarang, k.nomor_kamar]); });
      });
    }
  });
};
cron.schedule('0 0 * * *', buatTugasBaruHariIni, { timezone: "Asia/Jakarta" }); buatTugasBaruHariIni();

app.set('view engine', 'ejs'); app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true })); app.use(express.json()); app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'horison2026hotel', resave: false, saveUninitialized: false, cookie: { maxAge: 86400000 } }));
app.use((req, res, next) => {
  res.locals.waktuSekarang = getWaktuWIB(); res.locals.waktuSekarangSingkat = getWaktuWIBJamMenit(); res.locals.tanggalSekarang = getTanggalWIB(); res.locals.pesan = null;
  if (req.query.pesan === 'berhasil') res.locals.pesan = { tipe: 'sukses', teks: '✅ Berhasil disimpan' };
  if (req.query.pesan === 'gagal') res.locals.pesan = { tipe: 'error', teks: '❌ Terjadi kesalahan' };
  next();
});

app.get('/', (req, res) => { if (req.session.user) { if (req.session.user.peran === 'SPV') return res.redirect('/spv'); if (req.session.user.peran === 'RA') return res.redirect('/ra'); if (req.session.user.peran === 'OT') return res.redirect('/ot'); } res.render('login', { pesan: res.locals.pesan }); });
app.post('/login', (req, res) => { const { username, password } = req.body; db.get(`SELECT * FROM pengguna WHERE username =? AND aktif = 1`, [username.trim()], (err, user) => { if (user && user.password === password) { req.session.user = { id: user.id, nama: user.nama, peran: user.peran }; return res.redirect(user.peran === 'SPV'? '/spv' : user.peran === 'RA'? '/ra' : '/ot'); } res.render('login', { pesan: { tipe: 'error', teks: '❌ Username atau Password salah' } }); }); });

app.get('/spv', (req, res) => {
  if (!req.session.user || req.session.user.peran!== 'SPV') return res.redirect('/');
  const hariIni = getTanggalWIB(); const cariTanggal = req.query.tanggal || hariIni; const cariKamar = req.query.kamar || '';
  db.all(`SELECT nomor_kamar, lantai, tipe_kamar FROM kamar WHERE aktif = 1 ORDER BY nomor_kamar`, [], (err, daftarKamar) => {
    db.all(`SELECT nama FROM pengguna WHERE peran = 'RA' AND aktif = 1 ORDER BY nama`, [], (err, daftarRA) => {
      let querySudah = `SELECT t.*, k.lantai, k.tipe_kamar, IFNULL(l.waktu_masuk, '-') AS waktu_masuk, IFNULL(l.waktu_keluar, '-') AS waktu_keluar FROM tugas t JOIN kamar k ON t.kamar = k.nomor_kamar LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar WHERE t.tanggal =? AND (t.sudah_dibagikan = 1 OR t.sudah_dibagikan IS NULL OR t.sudah_dibagikan = 0)`;
      const paramSudah = [cariTanggal]; if (cariKamar) { querySudah += ` AND t.kamar =?`; paramSudah.push(cariKamar); } querySudah += ` ORDER BY t.petugas, t.kamar`;
      db.all(querySudah, paramSudah, (err, daftarSudahDibagikan) => {
        const perRA = {}; daftarSudahDibagikan.forEach(tugas => { if (tugas.petugas && tugas.petugas!== '') { if (!perRA[tugas.petugas]) perRA[tugas.petugas] = []; perRA[tugas.petugas].push(tugas); } });
        db.all(`SELECT * FROM permintaan_tamu WHERE tanggal =? ORDER BY waktu_masuk DESC`, [cariTanggal], (err, daftarPermintaan) => {
          const kamarPerLantai = {}; daftarKamar.forEach(k => { if (!kamarPerLantai[k.lantai]) kamarPerLantai[k.lantai] = []; kamarPerLantai[k.lantai].push(k); });
          res.render('spv', { user: req.session.user, tanggal: hariIni, cariTanggal, cariKamar, kamarPerLantai, daftarRA, daftarSudahDibagikan: perRA, daftarPermintaan, pesan: res.locals.pesan, daftarStatus: [{kode:'VD', nama:'Vacant Dirty'},{kode:'VCU', nama:'Vacant Clean Unchecked'},{kode:'OD', nama:'Occupied Dirty'},{kode:'ED', nama:'Expected Departure'}] });
        });
      });
    });
  });
});
app.post('/tambah-tugas', (req, res) => {
  const { tanggal, petugas, kamar, status_awal } = req.body; const daftarKamar = Array.isArray(kamar)? kamar : [kamar]; const daftarStatus = Array.isArray(status_awal)? status_awal : [status_awal || 'VD']; let selesai = 0; const total = daftarKamar.length; if (total === 0) return res.redirect('/spv?pesan=gagal');
  db.all(`SELECT nomor_kamar FROM kamar WHERE nomor_kamar IN (${daftarKamar.map(() => '?').join(',')})`, daftarKamar, (err, hasil) => {
    if (hasil.length!== daftarKamar.length) return res.redirect('/spv?pesan=gagal&teks=Ada kamar yang tidak terdaftar');
    daftarKamar.forEach((k, idx) => { const status = daftarStatus[idx] || 'VD'; db.run(`INSERT OR REPLACE INTO tugas (tanggal, kamar, petugas, status_awal, status_hk_in, status_hk_out, selesai, sudah_dibagikan, siap_dicek) VALUES (?,?,?,?, '', '', 0, 1, 0)`, [tanggal, k, petugas, status], () => { if (++selesai === total) res.redirect('/spv?pesan=berhasil'); }); });
  });
});
app.get('/ra', (req, res) => {
  if (!req.session.user || req.session.user.peran!== 'RA') return res.redirect('/'); const hariIni = getTanggalWIB();
  const amenitySelects = AMENITY_FIELDS.map(f => `IFNULL(l.${f}, 0) AS ${f}`).join(',\n ');
  db.all(`SELECT t.*, IFNULL(l.waktu_masuk, '-') AS waktu_masuk, IFNULL(l.waktu_keluar, '-') AS waktu_keluar, ${amenitySelects} FROM tugas t JOIN kamar k ON t.kamar = k.nomor_kamar LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar WHERE t.tanggal =? AND t.petugas =? AND t.sudah_dibagikan = 1 ORDER BY t.kamar`, [hariIni, req.session.user.nama], (err, daftarTugas) => {
    res.render('ra', { user: req.session.user, tanggal: hariIni, tugas: daftarTugas, pesan: res.locals.pesan, waktuSekarang: getWaktuWIB() });
  });
});
app.post('/mulai-kamar', (req, res) => {
  const waktuMasuk = getWaktuWIBJamMenit(); const { tanggal, kamar } = req.body;
  db.get(`SELECT status_awal FROM tugas WHERE tanggal =? AND kamar =?`, [tanggal, kamar], (err, data) => {
    if (err ||!data) return res.redirect('/ra?pesan=gagal');
    let hkIn = ''; if (data.status_awal === 'VD' || data.status_awal === 'ED') hkIn = 'VD'; else if (data.status_awal === 'VCU') hkIn = 'VCU'; else if (data.status_awal === 'OD') hkIn = 'OD';
    db.get(`SELECT 1 FROM laporan WHERE tanggal =? AND nomor_kamar =?`, [tanggal, kamar], (err, row) => {
      const petugas = req.session.user.nama;
      if (row) { db.run(`UPDATE laporan SET waktu_masuk =?, petugas =? WHERE tanggal =? AND nomor_kamar =?`, [waktuMasuk, petugas, tanggal, kamar], err => { if (err) { console.error(err); return res.redirect('/ra?pesan=gagal'); } db.run(`UPDATE tugas SET status_hk_in =? WHERE tanggal =? AND kamar =?`, [hkIn, tanggal, kamar], () => res.redirect('/ra?pesan=berhasil')); }); }
      else { db.run(`INSERT INTO laporan (tanggal, nomor_kamar, waktu_masuk, petugas) VALUES (?,?,?,?)`, [tanggal, kamar, waktuMasuk, petugas], err => { if (err) { console.error(err); return res.redirect('/ra?pesan=gagal'); } db.run(`UPDATE tugas SET status_hk_in =? WHERE tanggal =? AND kamar =?`, [hkIn, tanggal, kamar], () => res.redirect('/ra?pesan=berhasil')); }); }
    });
  });
});
app.post('/selesai-kamar', (req, res) => {
  const waktuKeluar = getWaktuWIBJamMenit(); const { tanggal, kamar, waktu_masuk } = req.body; const petugas = req.session.user.nama;
  const baseFields = ['tanggal', 'nomor_kamar', 'waktu_masuk', 'waktu_keluar']; const baseValues = [tanggal, kamar, waktu_masuk, waktuKeluar];
  const amenityValues = AMENITY_FIELDS.map(field => { const val = req.body[field]; return (val!== undefined && val!== '' &&!isNaN(val))? parseInt(val) : 0; });
  const allFields = [...baseFields,...AMENITY_FIELDS, 'petugas']; const allValues = [...baseValues,...amenityValues, petugas]; const placeholders = allFields.map(() => '?').join(',');
  const sql = `INSERT OR REPLACE INTO laporan (${allFields.join(',')}) VALUES (${placeholders})`;
  db.run(sql, allValues, function(err) {
    if (err) { console.error('❌ Error INSERT laporan:', err.message); return res.redirect('/ra?pesan=gagal'); }
    db.get(`SELECT status_awal, status_hk_in FROM tugas WHERE tanggal =? AND kamar =?`, [tanggal, kamar], (err, data) => {
      if (err ||!data) return res.redirect('/ra?pesan=gagal');
      let statusHKout = ''; if (data.status_hk_in === 'VD' || data.status_hk_in === 'VCU' || data.status_awal === 'ED') statusHKout = 'VC'; else if (data.status_hk_in === 'OD') statusHKout = 'OC';
      db.run(`UPDATE tugas SET status_hk_out =?, selesai = 1, siap_dicek = 1 WHERE tanggal =? AND kamar =?`, [statusHKout, tanggal, kamar], () => res.redirect('/ra?pesan=berhasil'));
    });
  });
});

// === OT FIX: daftarFnb ditambahkan ===
app.get('/ot', (req, res) => {
  if (!req.session.user || req.session.user.peran!== 'OT') return res.redirect('/');
  const hariIni = getTanggalWIB();
  db.all(`SELECT nomor_kamar, lantai, tipe_kamar FROM kamar WHERE aktif = 1 ORDER BY nomor_kamar`, [], (err, daftarKamar) => {
    if (err) { console.error(err); return res.redirect('/?pesan=gagal'); }
    db.all(`SELECT * FROM permintaan_tamu WHERE tanggal =? ORDER BY waktu_masuk DESC, id DESC`, [hariIni], (err, daftarPermintaan) => {
      if (err) { console.error(err); return res.redirect('/?pesan=gagal'); }
      db.all(`SELECT * FROM daily_laundry WHERE tanggal =? ORDER BY waktu_input DESC`, [hariIni], (err, daftarLaundry) => {
        if (err) { console.error(err); return res.redirect('/?pesan=gagal'); }
        db.all(`SELECT * FROM store_request WHERE tanggal =? ORDER BY waktu_input DESC`, [hariIni], (err, daftarStore) => {
          if (err) { console.error(err); return res.redirect('/?pesan=gagal'); }
          const daftarFnb = []; // FIX untuk ot.ejs line 399
          res.render('ot', {
            user: req.session.user, tanggal: hariIni, daftarKamar, daftarPermintaan,
            daftarLaundry: daftarLaundry || [], daftarStore: daftarStore || [], daftarFnb,
            pesan: res.locals.pesan, waktuSekarang: getWaktuWIB(), waktuSingkat: getWaktuWIBJamMenit()
          });
        });
      });
    });
  });
});

app.post('/tambah-permintaan', (req, res) => {
  const { nomor_kamar, jenis_permintaan, keterangan } = req.body; const hariIni = getTanggalWIB(); const waktuMasuk = getWaktuWIBJamMenit();
  if (!nomor_kamar ||!jenis_permintaan) { console.error('tambah-permintaan kosong', req.body); return res.redirect('/ot?pesan=gagal'); }
  db.get(`SELECT 1 FROM kamar WHERE nomor_kamar =?`, [nomor_kamar], (err, ada) => {
    if (err ||!ada) { console.error('kamar tidak valid', nomor_kamar); return res.redirect('/ot?pesan=gagal'); }
    db.run(`INSERT INTO permintaan_tamu (tanggal, nomor_kamar, jenis_permintaan, keterangan, waktu_masuk, dibuat_oleh, status) VALUES (?,?,?,?,?,?, 'Dipinjam Tamu')`, [hariIni, nomor_kamar, jenis_permintaan, keterangan || '', waktuMasuk, req.session.user.nama], err => { if(err){ console.error('INSERT permintaan_tamu', err.message); return res.redirect('/ot?pesan=gagal'); } res.redirect('/ot?pesan=berhasil'); });
  });
});
app.post('/ubah-status-permintaan', (req, res) => { const { id, status } = req.body; const waktuSelesai = status === 'Dikembalikan'? getWaktuWIBJamMenit() : null; db.run(`UPDATE permintaan_tamu SET status =?, waktu_selesai =? WHERE id =?`, [status, waktuSelesai, id], err => err? res.redirect('/ot?pesan=gagal') : res.redirect('/ot?pesan=berhasil')); });
app.post('/hapus-permintaan', (req, res) => { db.run(`DELETE FROM permintaan_tamu WHERE id =?`, [req.body.id], err => err? res.redirect('/ot?pesan=gagal') : res.redirect('/ot?pesan=berhasil')); });

// DAILY LAUNDRY - FIX 17 placeholder
app.post('/tambah-laundry', (req, res) => {
  const hariIni = getTanggalWIB(); const waktuInput = getWaktuWIBJamMenit();
  const { petugas, sheet_twin, sheet_king, duvet_twin, duvet_king, pillow_case, bath_towel, hand_towel, bath_mat, inner_duvet_twin, inner_duvet_king, bed_pad_twin, bed_pad_king, pillow } = req.body;
  const sql = `INSERT INTO daily_laundry (tanggal, petugas, sheet_twin, sheet_king, duvet_twin, duvet_king, pillow_case, bath_towel, hand_towel, bath_mat, inner_duvet_twin, inner_duvet_king, bed_pad_twin, bed_pad_king, pillow, dibuat_oleh, waktu_input) VALUES (?,?,?,?,?,?,?,?,?)`;
  const params = [hariIni, petugas || '', parseInt(sheet_twin)||0, parseInt(sheet_king)||0, parseInt(duvet_twin)||0, parseInt(duvet_king)||0, parseInt(pillow_case)||0, parseInt(bath_towel)||0, parseInt(hand_towel)||0, parseInt(bath_mat)||0, parseInt(inner_duvet_twin)||0, parseInt(inner_duvet_king)||0, parseInt(bed_pad_twin)||0, parseInt(bed_pad_king)||0, parseInt(pillow)||0, req.session.user.nama, waktuInput];
  db.run(sql, params, err => { if(err){ console.error('INSERT daily_laundry', err.message); return res.redirect('/ot?pesan=gagal'); } res.redirect('/ot?pesan=berhasil'); });
});
app.post('/hapus-laundry', (req, res) => { db.run(`DELETE FROM daily_laundry WHERE id =?`, [req.body.id], err => err? res.redirect('/ot?pesan=gagal') : res.redirect('/ot?pesan=berhasil')); });

app.post('/tambah-store-request', (req, res) => {
  const hariIni = getTanggalWIB(); const waktuInput = getWaktuWIBJamMenit(); const { kategori, nama_barang, harga, unit, jumlah } = req.body; const total = (parseInt(harga)||0)*(parseInt(jumlah)||0);
  db.run(`INSERT INTO store_request (tanggal, petugas, kategori, nama_barang, harga, unit, jumlah, total_harga, status, dibuat_oleh, waktu_input) VALUES (?,?,?,?,?,?,?)`, [hariIni, req.session.user.nama, kategori||'', nama_barang||'', parseInt(harga)||0, unit||'', parseInt(jumlah)||0, total, 'Pending', req.session.user.nama, waktuInput], err => { if(err){ console.error('INSERT store_request', err.message); return res.redirect('/ot?pesan=gagal'); } res.redirect('/ot?pesan=berhasil'); });
});
app.post('/ubah-status-store', (req, res) => { const { id, status } = req.body; db.run(`UPDATE store_request SET status =? WHERE id =?`, [status, id], err => err? res.redirect('/ot?pesan=gagal') : res.redirect('/ot?pesan=berhasil')); });
app.post('/hapus-store-request', (req, res) => { db.run(`DELETE FROM store_request WHERE id =?`, [req.body.id], err => err? res.redirect('/ot?pesan=gagal') : res.redirect('/ot?pesan=berhasil')); });

// === SEMUA FITUR PDF & EXCEL KEMBALI (TIDAK DIPOTONG) ===
app.get('/unduh-pdf-ot', (req, res) => {
  const tanggal = req.query.tanggal || getTanggalWIB();
  db.all(`SELECT nomor_kamar, jenis_permintaan, keterangan, status, waktu_masuk, waktu_selesai, dibuat_oleh FROM permintaan_tamu WHERE tanggal =? ORDER BY waktu_masuk DESC`, [tanggal], (err, data) => {
    if (err ||!data || data.length === 0) return res.send('❌ Tidak ada data');
    const doc = new PDFDocument({ margin: 25, size: 'A4' }); res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename=Loan_Item_Today_${tanggal}.pdf`); doc.pipe(res);
    doc.fontSize(18).font('Helvetica-Bold').text('HORISON HOTEL & CONVENTION', { align: 'center' }); doc.fontSize(14).text('Loan Item Today', { align: 'center', underline: true }); doc.moveDown(1); doc.fontSize(11).text(`Tanggal: ${tanggal} | Dibuat: ${getWaktuWIB()} WIB`); doc.moveDown(1);
    doc.fontSize(10).font('Helvetica-Bold'); let y = doc.y; doc.text('No', 25, y, { width: 30 }); doc.text('Kamar', 55, y, { width: 50 }); doc.text('Permintaan', 110, y, { width: 180 }); doc.text('Masuk', 295, y, { width: 50 }); doc.text('Status', 350, y, { width: 70 }); doc.text('Selesai', 430, y, { width: 50 });
    y += 15; doc.moveTo(25, y).lineTo(520, y).stroke(); y += 8; doc.fontSize(10).font('Helvetica');
    data.forEach((row, i) => { if (y > 720) { doc.addPage(); y = 40; } doc.text(String(i+1), 25, y); doc.text(row.nomor_kamar, 55, y); doc.text(`${row.jenis_permintaan}${row.keterangan? ` (${row.keterangan})` : ''}`, 110, y, { width: 170 }); doc.text(row.waktu_masuk, 295, y); doc.text(row.status, 350, y); doc.text(row.waktu_selesai || '-', 430, y); y += 18; }); doc.end();
  });
});
app.get('/unduh-pdf-laundry', (req, res) => {
  const tanggal = req.query.tanggal || getTanggalWIB();
  db.all(`SELECT * FROM daily_laundry WHERE tanggal =? ORDER BY waktu_input DESC`, [tanggal], (err, data) => {
    if (err ||!data || data.length === 0) return res.send('❌ Tidak ada data laundry');
    const doc = new PDFDocument({ margin: 25, size: 'A4', layout: 'landscape' }); res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename=Daily_Laundry_${tanggal}.pdf`); doc.pipe(res);
    doc.fontSize(18).font('Helvetica-Bold').text('HORISON HOTEL & CONVENTION', { align: 'center' }); doc.fontSize(14).text('Daily Laundry Report', { align: 'center', underline: true }); doc.moveDown(1); doc.fontSize(11).text(`Tanggal: ${tanggal} | Dibuat: ${getWaktuWIB()} WIB`); doc.moveDown(1);
    const headers = ['No', 'Petugas', 'S.Twin', 'S.King', 'D.Twin', 'D.King', 'P.Case', 'B.Towel', 'H.Towel', 'B.Mat', 'I.D.Twin', 'I.D.King', 'B.P.Twin', 'B.P.King', 'Pillow']; const colWidths = [30, 80, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45]; let x = 25; let y = doc.y;
    doc.fontSize(9).font('Helvetica-Bold'); headers.forEach((h, i) => { doc.text(h, x, y, { width: colWidths[i], align: 'center' }); x += colWidths[i]; }); y += 15; doc.moveTo(25, y).lineTo(760, y).stroke(); y += 5; doc.fontSize(9).font('Helvetica');
    data.forEach((row, i) => { if (y > 520) { doc.addPage(); y = 40; } x = 25; const values = [String(i+1), row.petugas || '-', row.sheet_twin||0, row.sheet_king||0, row.duvet_twin||0, row.duvet_king||0, row.pillow_case||0, row.bath_towel||0, row.hand_towel||0, row.bath_mat||0, row.inner_duvet_twin||0, row.inner_duvet_king||0, row.bed_pad_twin||0, row.bed_pad_king||0, row.pillow||0]; values.forEach((v, idx) => { doc.text(String(v), x, y, { width: colWidths[idx], align: 'center' }); x += colWidths[idx]; }); y += 14; }); doc.end();
  });
});
app.get('/unduh-pdf-store', (req, res) => {
  const tanggal = req.query.tanggal || getTanggalWIB();
  db.all(`SELECT * FROM store_request WHERE tanggal =? ORDER BY kategori, nama_barang`, [tanggal], (err, data) => {
    if (err ||!data || data.length === 0) return res.send('❌ Tidak ada data store request');
    const doc = new PDFDocument({ margin: 25, size: 'A4' }); res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename=Store_Request_${tanggal}.pdf`); doc.pipe(res);
    doc.fontSize(18).font('Helvetica-Bold').text('HORISON HOTEL & CONVENTION', { align: 'center' }); doc.fontSize(14).text('Store Request Report', { align: 'center', underline: true }); doc.moveDown(1); doc.fontSize(11).text(`Tanggal: ${tanggal} | Dibuat: ${getWaktuWIB()} WIB`); doc.moveDown(1);
    doc.fontSize(10).font('Helvetica-Bold'); let y = doc.y; doc.text('No', 25, y, { width: 30 }); doc.text('Kategori', 55, y, { width: 100 }); doc.text('Barang', 160, y, { width: 150 }); doc.text('Harga', 315, y, { width: 70 }); doc.text('Jumlah', 390, y, { width: 50 }); doc.text('Total', 445, y, { width: 70 }); doc.text('Status', 520, y, { width: 70 });
    y += 15; doc.moveTo(25, y).lineTo(590, y).stroke(); y += 8; doc.fontSize(10).font('Helvetica');
    data.forEach((row, i) => { if (y > 720) { doc.addPage(); y = 40; } doc.text(String(i+1), 25, y); doc.text(row.kategori||'-', 55, y, { width: 100 }); doc.text(row.nama_barang||'-', 160, y, { width: 150 }); doc.text(`Rp ${(row.harga||0).toLocaleString('id-ID')}`, 315, y, { width: 70 }); doc.text(String(row.jumlah||0), 390, y, { width: 50 }); doc.text(`Rp ${(row.total_harga||0).toLocaleString('id-ID')}`, 445, y, { width: 70 }); doc.text(row.status||'Pending', 520, y, { width: 70 }); y += 18; }); doc.end();
  });
});
app.get('/unduh-pdf', (req, res) => {
  const tanggal = req.query.tanggal || getTanggalWIB(); const ra = req.query.ra || null;
  let query = `SELECT t.*, k.lantai, k.tipe_kamar, IFNULL(l.waktu_masuk, '-') AS waktu_masuk, IFNULL(l.waktu_keluar, '-') AS waktu_keluar, l.* FROM tugas t JOIN kamar k ON t.kamar = k.nomor_kamar LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar WHERE t.tanggal =? AND t.sudah_dibagikan = 1`; const param = [tanggal]; if (ra) { query += ` AND t.petugas =?`; param.push(ra); } query += ` ORDER BY t.petugas, t.kamar`;
  db.all(query, param, (err, dataKamar) => {
    if (err ||!dataKamar || dataKamar.length === 0) return res.send('❌ Tidak ada data kamar yang sudah dibagikan');
    const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' }); res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename=Daily_RA_Report_${ra? ra + '_' : ''}${tanggal}.pdf`); doc.pipe(res);
    const judul = ra? `Daily Room Attendant Report - ${ra}` : 'Daily Room Attendant Report'; doc.font('Helvetica-Bold').fontSize(18).text('HORISON HOTEL & CONVENTION', { align: 'center' }); doc.fontSize(14).text(judul, { align: 'center', underline: true }); doc.moveDown(1); doc.font('Helvetica').fontSize(11); doc.text(`Tanggal: ${tanggal} | Dibuat: ${getWaktuWIB()} WIB`); doc.moveDown(1);
    let totalBiaya = 0; let y = doc.y;
    dataKamar.forEach((row) => {
      let biayaKamar = 0; const barangTerpakai = []; Object.keys(HARGA_BARANG).forEach(nama => { const jumlah = row[nama] || 0; if (jumlah > 0) { const sub = jumlah * HARGA_BARANG[nama]; biayaKamar += sub; barangTerpakai.push({ nama: nama.replace(/_/g, ' '), jumlah, harga: HARGA_BARANG[nama], sub }); } });
      doc.font('Helvetica-Bold').fontSize(10); doc.text(`Kamar: ${row.kamar} | Lantai: ${row.lantai} | Petugas: ${row.petugas || '-'}`, 20, y); doc.text(`FO: ${row.status_awal || '-'} | HK IN: ${row.status_hk_in || '-'} | HK OUT: ${row.status_hk_out || '-'} | Masuk: ${row.waktu_masuk} | Keluar: ${row.waktu_keluar}`, 20, y + 15); y += 35;
      doc.font('Helvetica').fontSize(9); if (barangTerpakai.length > 0) { barangTerpakai.forEach(item => { if (y > 520) { doc.addPage(); y = 30; } doc.text(`${item.nama}: ${item.jumlah} x Rp ${item.harga.toLocaleString('id-ID')} = Rp ${item.sub.toLocaleString('id-ID')}`, 25, y); y += 14; }); } else { doc.text('Belum ada laporan pemakaian barang', 25, y); y += 14; }
      doc.font('Helvetica-Bold').fontSize(10); doc.text(`Total Biaya Kamar: Rp ${biayaKamar.toLocaleString('id-ID')}`, 25, y); totalBiaya += biayaKamar; y += 35;
    });
    doc.font('Helvetica-Bold').fontSize(12); doc.text(`TOTAL KESELURUHAN: Rp ${totalBiaya.toLocaleString('id-ID')}`, 20, y); doc.end();
  });
});

// Excel routes tetap full seperti code lama kamu (Roomboy Control Sheet, Laundry, Store)
app.get('/unduh-excel', async (req, res) => {
  try {
    const tanggal = req.query.tanggal || getTanggalWIB(); const raFilter = req.query.ra || null;
    const daftarRA = await new Promise((resolve, reject) => { let query = `SELECT DISTINCT petugas FROM tugas WHERE tanggal =? AND petugas!= '' AND sudah_dibagikan = 1 `; const params = [tanggal]; if (raFilter) { query += ` AND petugas =?`; params.push(raFilter); } query += ` ORDER BY petugas`; db.all(query, params, (err, rows) => { if (err) return reject(err); resolve(rows.map(r => r.petugas)); }); });
    if (daftarRA.length === 0) return res.send('❌ Tidak ada RA yang memiliki tugas untuk tanggal ini');
    const workbook = new ExcelJS.Workbook();
    const linenFields = ['sheet_king','sheet_twin','duvet_king','duvet_twin','bath_towel','hand_towel','bath_mat','pillow_case']; const linenSelects = linenFields.map(f=>'IFNULL(l.'+f+',0) AS '+f).join(', ');
    const guestFields = ['shower_cap','dental_kit','laundry_bag','laundry_list','note_pad','pensil','tissue_roll','tissue_facial','cotton_bud','slipper','comb','stirer','coffee','sugar','tea','creamer','mineral','poly_bag_kecil','poly_bag_besar']; const guestSelects = guestFields.map(f=>'IFNULL(l.'+f+',0) AS '+f).join(', ');
    for (let i=0;i<daftarRA.length;i++){ const ra=daftarRA[i]; const sheet=workbook.addWorksheet(ra); sheet.getRow(1).height=18.75; sheet.getRow(6).height=33.75; sheet.getRow(7).height=24; const colList=['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','AA','AB','AC','AD','AE','AF','AG','AH','AI','AJ','AK','AL','AM','AN','AO','AP','AQ','AR']; colList.forEach(col=>{sheet.getColumn(col).width=4.0;}); const allBorder={top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}}; const headerFill={type:'pattern',pattern:'solid',fgColor:{argb:'FFD9E1F2'}}; const subHeaderFill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE2EFDA'}};
      const LOGO_URL='https://www.image2url.com/r2/default/images/1783906749722-699e9760-3deb-4dfc-97e3-8026e5fbac63.jpeg'; if(axios){ try{ const r=await axios.get(LOGO_URL,{responseType:'arraybuffer',timeout:10000}); const b=Buffer.from(r.data,'binary'); const id=workbook.addImage({buffer:b,extension:'jpeg'}); sheet.addImage(id,{tl:{col:40,row:0},br:{col:44,row:3}});}catch(e){} }
      sheet.getCell('A1').value='ROOMBOY CONTROL SHEET'; sheet.getCell('A1').font={name:'Calibri',bold:true,size:14}; sheet.getCell('A1').alignment={horizontal:'center',vertical:'center'}; sheet.mergeCells('A1:AR1');
      sheet.getCell('A3').value='DATE:'; sheet.getCell('A3').font={name:'Calibri',bold:true,size:11}; sheet.getCell('B3').value=tanggal; sheet.getCell('D3').value='SHIFT:'; sheet.getCell('E3').value='Morning'; sheet.getCell('I3').value='FLOOR/SECTION:';
      const r4=[{col:'A',text:'NO'},{col:'B',text:'NO OF ROOM'},{col:'C',text:'ROOM STATUS'},{col:'F',text:'TIME'},{col:'H',text:'LINEN'},{col:'X',text:'GUEST SUPPLIES & AMENITIES'}]; r4.forEach(h=>{const c=sheet.getCell(h.col+'4'); c.value=h.text; c.font={name:'Calibri',bold:true,size:9}; c.fill=headerFill; c.alignment={horizontal:'center',vertical:'center',wrapText:true}; c.border=allBorder;}); sheet.mergeCells('A4:A6'); sheet.mergeCells('B4:B6'); sheet.mergeCells('C4:E5'); sheet.mergeCells('F4:G5'); sheet.mergeCells('H4:W5'); sheet.mergeCells('X4:AR5');
      ['C','D','E','F','G'].forEach(col=>{sheet.getCell(col+'6').border=allBorder;}); sheet.getCell('C6').value='FO'; sheet.getCell('D6').value='HK'; sheet.getCell('E6').value='HK'; sheet.getCell('F6').value='IN'; sheet.getCell('G6').value='OUT';
      const linenSub=[{col:'H',text:'SHEET\nDOUBLE',m:'H6:I6'},{col:'J',text:'SHEET\nSINGLE',m:'J6:K6'},{col:'L',text:'DUVET\nCOVER',m:'L6:M6'},{col:'N',text:'DUVET\nSINGLE',m:'N6:O6'},{col:'P',text:'BATH\nTOWEL',m:'P6:Q6'},{col:'R',text:'HAND\nTOWEL',m:'R6:S6'},{col:'T',text:'BATH\nMAT',m:'T6:U6'},{col:'V',text:'PILLOW\nCASE',m:'V6:W6'}]; linenSub.forEach(h=>{const c=sheet.getCell(h.col+'6'); c.value=h.text; c.font={name:'Calibri',bold:true,size:8}; c.fill=headerFill; c.alignment={horizontal:'center',vertical:'center',wrapText:true}; c.border=allBorder; sheet.mergeCells(h.m);});
      const guestSub=[{col:'X',text:'BATH ROOM',m:'X6:Y6'},{col:'Z',text:'BED ROOM',m:'Z6:AD6'},{col:'AE',text:'CONDIMEN',m:'AE6:AR6'}]; guestSub.forEach(h=>{const c=sheet.getCell(h.col+'6'); c.value=h.text; c.font={name:'Calibri',bold:true,size:8}; c.fill=headerFill; c.alignment={horizontal:'center',vertical:'center'}; c.border=allBorder; sheet.mergeCells(h.m);});
      const inOut=[{c:'H',t:'IN'},{c:'I',t:'OUT'},{c:'J',t:'IN'},{c:'K',t:'OUT'},{c:'L',t:'IN'},{c:'M',t:'OUT'},{c:'N',t:'IN'},{c:'O',t:'OUT'},{c:'P',t:'IN'},{c:'Q',t:'OUT'},{c:'R',t:'IN'},{c:'S',t:'OUT'},{c:'T',t:'IN'},{c:'U',t:'OUT'},{c:'V',t:'IN'},{c:'W',t:'OUT'}]; inOut.forEach(h=>{const ce=sheet.getCell(h.c+'7'); ce.value=h.t; ce.font={name:'Calibri',size:8}; ce.alignment={horizontal:'center',vertical:'center'}; ce.border=allBorder;});
      const items=[{c:'X',t:'SHOWER CAP'},{c:'Y',t:'DENTAL KIT'},{c:'Z',t:'LAUNDRY BAG'},{c:'AA',t:'LAUNDRY LIST'},{c:'AB',t:'MEMO PAD'},{c:'AC',t:'PENCIL'},{c:'AD',t:'GUEST COMMENT'},{c:'AE',t:'TISSUE ROLL'},{c:'AF',t:'HAND SOAP'},{c:'AG',t:'SHAMPOO'},{c:'AH',t:'SHOWER GEL'},{c:'AI',t:'TOOTH BRUSH'},{c:'AJ',t:'STERER'},{c:'AK',t:'SLIPPER'},{c:'AL',t:'COFFEE'},{c:'AM',t:'SUGAR'},{c:'AN',t:'TEA'},{c:'AO',t:'CREAMER'},{c:'AP',t:'MINERAL WATER'},{c:'AQ',t:'PLASTIC BIN'},{c:'AR',t:'TISUE'}]; items.forEach(it=>{const ce=sheet.getCell(it.c+'7'); ce.value=it.t; ce.font={name:'Calibri',bold:true,size:8}; ce.fill=subHeaderFill; ce.alignment={horizontal:'center',vertical:'center',wrapText:true}; ce.border=allBorder;});
      for(let r=4;r<=7;r++){colList.forEach(col=>{const ce=sheet.getCell(col+r); if(!ce.border) ce.border=allBorder;});}
      const dataRA=await new Promise((res,rej)=>{const q=`SELECT t.petugas,t.kamar,t.status_awal AS status_fo,t.status_hk_in,t.status_hk_out,t.selesai,k.lantai,IFNULL(l.waktu_masuk,'-') AS waktu_masuk,IFNULL(l.waktu_keluar,'-') AS waktu_keluar,${linenSelects},${guestSelects} FROM tugas t JOIN kamar k ON t.kamar=k.nomor_kamar LEFT JOIN laporan l ON t.tanggal=l.tanggal AND t.kamar=l.nomor_kamar WHERE t.tanggal=? AND t.petugas=? AND t.sudah_dibagikan=1 ORDER BY t.kamar`; db.all(q,[tanggal,ra],(e,rows)=>{if(e) rej(e); else res(rows);});});
      sheet.getCell('L3').value=(dataRA[0]&&dataRA[0].lantai)?dataRA[0].lantai:'-';
      let baris=8; let no=1; const max=35;
      dataRA.forEach(d=>{ if(baris>max) return; const f={name:'Calibri',size:11}; sheet.getCell('A'+baris).value=no++; sheet.getCell('B'+baris).value=d.kamar||''; sheet.getCell('C'+baris).value=d.status_fo||''; let hkin=d.status_hk_in||''; if(!hkin){ if(d.status_fo==='VD'||d.status_fo==='ED') hkin='VD'; else if(d.status_fo==='VCU') hkin='VCU'; else if(d.status_fo==='OD') hkin='OD'; } sheet.getCell('D'+baris).value=hkin; let hkout=d.status_hk_out||''; if(!hkout&&d.selesai===1){ if(hkin==='VD'||hkin==='VCU'||d.status_fo==='ED') hkout='VC'; else if(hkin==='OD') hkout='OC'; } sheet.getCell('E'+baris).value=hkout; sheet.getCell('F'+baris).value=d.waktu_masuk!=='-'?d.waktu_masuk:''; sheet.getCell('G'+baris).value=d.waktu_keluar!=='-'?d.waktu_keluar:'';
        const lv=[{db:'sheet_king',ic:'H',oc:'I'},{db:'sheet_twin',ic:'J',oc:'K'},{db:'duvet_king',ic:'L',oc:'M'},{db:'duvet_twin',ic:'N',oc:'O'},{db:'bath_towel',ic:'P',oc:'Q'},{db:'hand_towel',ic:'R',oc:'S'},{db:'bath_mat',ic:'T',oc:'U'},{db:'pillow_case',ic:'V',oc:'W'}]; lv.forEach(it=>{const v=d[it.db]||0; sheet.getCell(it.ic+baris).value=v; sheet.getCell(it.oc+baris).value=v;});
        const gv=[{c:'X',db:'shower_cap'},{c:'Y',db:'dental_kit'},{c:'Z',db:'laundry_bag'},{c:'AA',db:'laundry_list'},{c:'AB',db:'note_pad'},{c:'AC',db:'pensil'},{c:'AD',db:''},{c:'AE',db:'tissue_roll'},{c:'AF',db:'tissue_facial'},{c:'AG',db:'cotton_bud'},{c:'AH',db:'slipper'},{c:'AI',db:'comb'},{c:'AJ',db:'stirer'},{c:'AK',db:'slipper'},{c:'AL',db:'coffee'},{c:'AM',db:'sugar'},{c:'AN',db:'tea'},{c:'AO',db:'creamer'},{c:'AP',db:'mineral'},{c:'AQ',db:'poly_bag_kecil'},{c:'AR',db:'tissue_facial'}]; gv.forEach(g=>{const ce=sheet.getCell(g.c+baris); ce.value=g.db? (d[g.db]||0):'';}); for(let cc=0;cc<colList.length;cc++){const ce=sheet.getCell(colList[cc]+baris); ce.font=f; ce.alignment={horizontal:'center',vertical:'center'}; ce.border=allBorder;} baris++; });
      while(baris<=max){colList.forEach(col=>{sheet.getCell(col+baris).border=allBorder;}); sheet.getCell('A'+baris).value=no++; baris++; }
      const tr=36; sheet.getCell('A'+tr).value='TOTAL SOILED:'; sheet.mergeCells('A'+tr+':G'+tr); ['H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W'].forEach(col=>{sheet.getCell(col+tr).value={formula:`SUM(${col}8:${col}35)`}; sheet.getCell(col+tr).border=allBorder;});
      const rr=37; sheet.getCell('A'+rr).value='REMARKS'; sheet.mergeCells('A'+rr+':B'+(rr+2)); sheet.mergeCells('C'+rr+':AR'+(rr+2)); colList.forEach(col=>{for(let r=rr;r<=rr+2;r++){sheet.getCell(col+r).border=allBorder;}});
    }
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('Content-Disposition',`attachment; filename=Roomboy_Control_Sheet_${tanggal}.xlsx`); await workbook.xlsx.write(res); res.end();
  }catch(err){ console.error(err); res.send('❌ Gagal membuat Excel: '+err.message); }
});
app.get('/unduh-excel-laundry', async (req,res)=>{ try{ const tanggal=req.query.tanggal||getTanggalWIB(); const data=await new Promise((re,rj)=>{db.all(`SELECT * FROM daily_laundry WHERE tanggal=? ORDER BY waktu_input DESC`,[tanggal],(e,r)=>{if(e)rj(e);else re(r);});}); if(data.length===0) return res.send('❌ Tidak ada data laundry'); const wb=new ExcelJS.Workbook(); const sh=wb.addWorksheet('Daily Laundry'); sh.getCell('A1').value='DAILY LAUNDRY REPORT'; sh.mergeCells('A1:O1'); sh.getCell('A2').value=`Tanggal: ${tanggal}`; const headers=['No','Petugas','Sheet Twin','Sheet King','Duvet Twin','Duvet King','Pillow Case','Bath Towel','Hand Towel','Bath Mat','Inner Duvet Twin','Inner Duvet King','Bed Pad Twin','Bed Pad King','Pillow']; const b={top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}}; const hf={type:'pattern',pattern:'solid',fgColor:{argb:'FFD9E1F2'}}; headers.forEach((h,i)=>{const col=String.fromCharCode(65+i); const ce=sh.getCell(col+'4'); ce.value=h; ce.font={name:'Calibri',bold:true,size:9}; ce.fill=hf; ce.alignment={horizontal:'center',vertical:'center'}; ce.border=b;}); data.forEach((row,i)=>{const r=i+5; const vals=[i+1,row.petugas||'',row.sheet_twin||0,row.sheet_king||0,row.duvet_twin||0,row.duvet_king||0,row.pillow_case||0,row.bath_towel||0,row.hand_towel||0,row.bath_mat||0,row.inner_duvet_twin||0,row.inner_duvet_king||0,row.bed_pad_twin||0,row.bed_pad_king||0,row.pillow||0]; vals.forEach((v,idx)=>{const col=String.fromCharCode(65+idx); const ce=sh.getCell(col+r); ce.value=v; ce.border=b; ce.alignment={horizontal:'center'};});}); res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('Content-Disposition',`attachment; filename=Daily_Laundry_${tanggal}.xlsx`); await wb.xlsx.write(res); res.end(); }catch(e){res.send('❌ '+e.message);} });
app.get('/unduh-excel-store', async (req,res)=>{ try{ const tanggal=req.query.tanggal||getTanggalWIB(); const data=await new Promise((re,rj)=>{db.all(`SELECT * FROM store_request WHERE tanggal=? ORDER BY kategori,nama_barang`,[tanggal],(e,r)=>{if(e)rj(e);else re(r);});}); if(data.length===0) return res.send('❌ Tidak ada data'); const wb=new ExcelJS.Workbook(); const sh=wb.addWorksheet('Store Request'); sh.getCell('A1').value='STORE REQUEST HOUSEKEEPING'; sh.mergeCells('A1:H1'); sh.getCell('A2').value=`Tanggal: ${tanggal}`; const headers=['No','Kategori','Nama Barang','Harga','Unit','Jumlah','Total Harga','Status']; const b={top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}}; const hf={type:'pattern',pattern:'solid',fgColor:{argb:'FFD9E1F2'}}; headers.forEach((h,i)=>{const col=String.fromCharCode(65+i); const ce=sh.getCell(col+'4'); ce.value=h; ce.font={bold:true}; ce.fill=hf; ce.border=b;}); data.forEach((row,i)=>{const r=i+5; const vals=[i+1,row.kategori||'',row.nama_barang||'',row.harga||0,row.unit||'',row.jumlah||0,row.total_harga||0,row.status||'Pending']; vals.forEach((v,idx)=>{const col=String.fromCharCode(65+idx); const ce=sh.getCell(col+r); ce.value=v; ce.border=b;});}); res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('Content-Disposition',`attachment; filename=Store_Request_${tanggal}.xlsx`); await wb.xlsx.write(res); res.end(); }catch(e){res.send('❌ '+e.message);} });

app.get('/logout', (req, res) => { req.session.destroy(() => { res.redirect('/'); }); });
app.listen(PORT, () => console.log(`✅ Server berjalan di port ${PORT}`));
