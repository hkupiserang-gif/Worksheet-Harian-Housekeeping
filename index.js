const express = require('express');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const PDFDocument = require('pdfkit');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 8888;

// Zona Waktu Indonesia Barat
process.env.TZ = 'Asia/Jakarta';

// Fungsi bantuan waktu
const getWaktuWIB = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
const getTanggalWIB = () => new Date().toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');

// Koneksi Database
const db = new sqlite3.Database('./database.db', err => {
  if (err) console.error('❌ Koneksi DB gagal:', err.message);
  else console.log('✅ Terhubung ke database SQLite');
});

// Buat tabel jika belum ada
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

  // Isi data awal pengguna
  db.get(`SELECT 1 FROM pengguna WHERE username = 'nizar'`, (err, row) => {
    if (!row) {
      db.run(`INSERT INTO pengguna (nama, username, password, peran) VALUES
        ('Aslan', 'aslan', '123', 'RA'),
        ('Bila', 'bila', '123', 'RA'),
        ('Indah', 'indah', '123', 'RA'),
        ('Fika', 'fika', '123', 'RA'),
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
      const kamarList = [
        ['201','Lantai 2C','Deluxe'],['202','Lantai 2C','Deluxe'],['203','Lantai 2C','Deluxe'],
        ['204','Lantai 2C','Deluxe'],['205','Lantai 2C','Deluxe'],['206','Lantai 2C','Deluxe'],
        ['207','Lantai 2C','Deluxe'],['208','Lantai 2C','Deluxe'],['209','Lantai 2C','Deluxe'],
        ['210','Lantai 2C','Deluxe'],['211','Lantai 2C','Deluxe'],['212','Lantai 2C','Deluxe'],
        ['213','Lantai 2C','Deluxe'],['301','Lantai 3A','Suite'],['302','Lantai 3A','Suite'],
        ['303','Lantai 3A','Deluxe'],['304','Lantai 3A','Deluxe'],['305','Lantai 3A','Deluxe'],
        ['306','Lantai 3A','Deluxe'],['307','Lantai 3A','Deluxe'],['308','Lantai 3A','Deluxe'],
        ['309','Lantai 3A','Deluxe'],['310','Lantai 3A','Deluxe'],['311','Lantai 3A','Deluxe'],
        ['312','Lantai 3C','Deluxe'],['313','Lantai 3C','Deluxe'],['314','Lantai 3C','Deluxe'],
        ['315','Lantai 3C','Deluxe'],['316','Lantai 3C','Deluxe'],['317','Lantai 3C','Deluxe'],
        ['318','Lantai 3C','Deluxe'],['319','Lantai 3C','Deluxe'],['320','Lantai 3C','Deluxe'],
        ['321','Lantai 3C','Deluxe'],['322','Lantai 3C','Deluxe'],['323','Lantai 3C','Deluxe'],
        ['324','Lantai 3C','Deluxe'],['401','Lantai 4A','Suite'],['402','Lantai 4A','Suite'],
        ['403','Lantai 4A','Premium'],['404','Lantai 4A','Deluxe'],['405','Lantai 4A','Premium'],
        ['406','Lantai 4A','Deluxe'],['407','Lantai 4A','Premium'],['408','Lantai 4A','Deluxe'],
        ['409','Lantai 4A','Premium'],['410','Lantai 4A','Deluxe'],['411','Lantai 4A','Premium'],
        ['501','Lantai 5A','Deluxe'],['502','Lantai 5A','Deluxe'],['503','Lantai 5A','Deluxe'],
        ['504','Lantai 5A','Deluxe'],['505','Lantai 5A','Deluxe'],['506','Lantai 5A','Deluxe'],
        ['507','Lantai 5A','Deluxe'],['508','Lantai 5C','Deluxe'],['509','Lantai 5C','Deluxe'],
        ['510','Lantai 5C','Deluxe'],['511','Lantai 5C','Deluxe'],['512','Lantai 5C','Deluxe'],
        ['513','Lantai 5C','Deluxe'],['514','Lantai 5C','Deluxe'],['515','Lantai 5C','Deluxe'],
        ['516','Lantai 5C','Deluxe'],['517','Lantai 5C','Deluxe'],['518','Lantai 5C','Deluxe'],
        ['519','Lantai 5C','Deluxe'],['520','Lantai 5C','Deluxe']
      ];
      const stmt = db.prepare(`INSERT OR IGNORE INTO kamar VALUES (?, ?, ?, 1)`);
      kamarList.forEach(k => stmt.run(k));
      stmt.finalize();
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

  // Tabel Laporan Kebersihan (sesuai daftar barang lengkap + IN/OUT)
  db.run(`CREATE TABLE IF NOT EXISTS laporan (
    tanggal TEXT,
    nomor_kamar TEXT,
    waktu_masuk TEXT,
    waktu_keluar TEXT,
    -- LINEN IN/OUT
    sheet_double_in INTEGER DEFAULT 0,
    sheet_double_out INTEGER DEFAULT 0,
    sheet_single_in INTEGER DEFAULT 0,
    sheet_single_out INTEGER DEFAULT 0,
    duvet_cover_in INTEGER DEFAULT 0,
    duvet_cover_out INTEGER DEFAULT 0,
    duvet_single_in INTEGER DEFAULT 0,
    duvet_single_out INTEGER DEFAULT 0,
    bath_towel_in INTEGER DEFAULT 0,
    bath_towel_out INTEGER DEFAULT 0,
    hand_towel_in INTEGER DEFAULT 0,
    hand_towel_out INTEGER DEFAULT 0,
    bath_mat_in INTEGER DEFAULT 0,
    bath_mat_out INTEGER DEFAULT 0,
    pillow_case_in INTEGER DEFAULT 0,
    pillow_case_out INTEGER DEFAULT 0,
    -- BATH ROOM
    hand_soap INTEGER DEFAULT 0,
    shampoo INTEGER DEFAULT 0,
    shower_gel INTEGER DEFAULT 0,
    tooth_brush INTEGER DEFAULT 0,
    sterer INTEGER DEFAULT 0,
    shower_cap INTEGER DEFAULT 0,
    slipper INTEGER DEFAULT 0,
    -- BED ROOM
    laundry_bag INTEGER DEFAULT 0,
    laundry_list INTEGER DEFAULT 0,
    memo_pad INTEGER DEFAULT 0,
    pencil INTEGER DEFAULT 0,
    plastic_bin INTEGER DEFAULT 0,
    tissue INTEGER DEFAULT 0,
    -- CONDIMEN
    coffee INTEGER DEFAULT 0,
    sugar INTEGER DEFAULT 0,
    tea INTEGER DEFAULT 0,
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

// Reset otomatis setiap jam 00:00 WIB
cron.schedule('0 0 * * *', () => {
  const kemarin = new Date();
  kemarin.setDate(kemarin.getDate() - 1);
  const tgl = kemarin.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
  db.run(`DELETE FROM tugas WHERE tanggal = ?`, [tgl]);
  db.run(`DELETE FROM laporan WHERE tanggal = ?`, [tgl]);
  db.run(`DELETE FROM permintaan_tamu WHERE tanggal = ?`, [tgl]);
  console.log(`✅ Data tanggal ${tgl} berhasil direset`);
});

// Konfigurasi Aplikasi
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'hotel_horison_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Middleware variabel global
app.use((req, res, next) => {
  res.locals.waktuSekarang = getWaktuWIB();
  res.locals.tanggalSekarang = getTanggalWIB();
  res.locals.pesan = null;
  next();
});

// ==================== HALAMAN LOGIN ====================
app.get('/', (req, res) => {
  if (req.session.user) {
    if (req.session.user.peran === 'SPV') return res.redirect('/spv');
    if (req.session.user.peran === 'RA') return res.redirect('/ra');
    if (req.session.user.peran === 'OT') return res.redirect('/ot');
  }
  res.render('login');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM pengguna WHERE username = ? AND password = ? AND aktif = 1`, [username, password], (err, user) => {
    if (user) {
      req.session.user = { id: user.id, nama: user.nama, peran: user.peran };
      return res.redirect(user.peran === 'SPV' ? '/spv' : user.peran === 'RA' ? '/ra' : '/ot');
    }
    res.render('login', { pesan: { tipe: 'danger', teks: 'Username atau password salah!' } });
  });
});

// ==================== HALAMAN SUPERVISOR ====================
app.get('/spv', (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  const tgl = req.query.tanggal || getTanggalWIB();
  const cariKamar = req.query.kamar || '';
  const filterPetugas = req.query.petugas || '';

  db.all(`SELECT nomor_kamar, lantai, tipe_kamar FROM kamar WHERE aktif = 1 ORDER BY nomor_kamar`, [], (err, kamar) => {
    db.all(`SELECT nama FROM pengguna WHERE peran = 'RA' AND aktif = 1 ORDER BY nama`, [], (err, daftarRA) => {
      let query = `
        SELECT t.*, k.lantai,
          IFNULL(l.waktu_masuk, '-') AS waktu_masuk,
          IFNULL(l.waktu_keluar, '-') AS waktu_keluar
        FROM tugas t
        JOIN kamar k ON t.kamar = k.nomor_kamar
        LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
        WHERE t.tanggal = ?
      `;
      const param = [tgl];
      if (cariKamar) { query += ` AND t.kamar = ?`; param.push(cariKamar); }
      if (filterPetugas) { query += ` AND t.petugas = ?`; param.push(filterPetugas); }
      query += ` ORDER BY t.kamar`;

      db.all(query, param, (err, daftarTugas) => {
        const kamarPerLantai = {};
        kamar.forEach(k => {
          if (!kamarPerLantai[k.lantai]) kamarPerLantai[k.lantai] = [];
          kamarPerLantai[k.lantai].push({
            ...k,
            sudahAda: daftarTugas.some(t => t.kamar === k.nomor_kamar)
          });
        });

        db.all(`SELECT * FROM permintaan_tamu WHERE tanggal = ? ORDER BY waktu_masuk DESC`, [tgl], (err, daftarPermintaan) => {
          res.render('spv', {
            user: req.session.user,
            cariTanggal: tgl,
            cariKamar,
            filterPetugas,
            daftarRA,
            kamarPerLantai,
            daftarTugas,
            daftarPermintaan
          });
        });
      });
    });
  });
});

app.post('/tambah-tugas', (req, res) => {
  const { tanggal, petugas, kamar, status_awal } = req.body;
  const daftarKamar = Array.isArray(kamar) ? kamar : [kamar];
  const status = status_awal || 'VD';

  const stmt = db.prepare(`INSERT OR REPLACE INTO tugas (tanggal, kamar, petugas, status_awal, selesai) VALUES (?, ?, ?, ?, 0)`);
  daftarKamar.forEach(k => stmt.run([tanggal, k, petugas, status]));
  stmt.finalize(err => {
    res.redirect(`/spv?tanggal=${tanggal}`);
  });
});

// ==================== HALAMAN ROOM ATTENDANT ====================
app.get('/ra', (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'RA') return res.redirect('/');
  const tgl = getTanggalWIB();
  db.all(`
    SELECT t.*,
      IFNULL(l.waktu_masuk, '-') AS waktu_masuk,
      IFNULL(l.waktu_keluar, '-') AS waktu_keluar,
      IFNULL(l.sheet_double_in, 0) AS sheet_double_in,
      IFNULL(l.sheet_double_out, 0) AS sheet_double_out,
      IFNULL(l.sheet_single_in, 0) AS sheet_single_in,
      IFNULL(l.sheet_single_out, 0) AS sheet_single_out,
      IFNULL(l.duvet_cover_in, 0) AS duvet_cover_in,
      IFNULL(l.duvet_cover_out, 0) AS duvet_cover_out,
      IFNULL(l.duvet_single_in, 0) AS duvet_single_in,
      IFNULL(l.duvet_single_out, 0) AS duvet_single_out,
      IFNULL(l.bath_towel_in, 0) AS bath_towel_in,
      IFNULL(l.bath_towel_out, 0) AS bath_towel_out,
      IFNULL(l.hand_towel_in, 0) AS hand_towel_in,
      IFNULL(l.hand_towel_out, 0) AS hand_towel_out,
      IFNULL(l.bath_mat_in, 0) AS bath_mat_in,
      IFNULL(l.bath_mat_out, 0) AS bath_mat_out,
      IFNULL(l.pillow_case_in, 0) AS pillow_case_in,
      IFNULL(l.pillow_case_out, 0) AS pillow_case_out,
      IFNULL(l.hand_soap, 0) AS hand_soap,
      IFNULL(l.shampoo, 0) AS shampoo,
      IFNULL(l.shower_gel, 0) AS shower_gel,
      IFNULL(l.tooth_brush, 0) AS tooth_brush,
      IFNULL(l.sterer, 0) AS sterer,
      IFNULL(l.shower_cap, 0) AS shower_cap,
      IFNULL(l.slipper, 0) AS slipper,
      IFNULL(l.laundry_bag, 0) AS laundry_bag,
      IFNULL(l.laundry_list, 0) AS laundry_list,
      IFNULL(l.memo_pad, 0) AS memo_pad,
      IFNULL(l.pencil, 0) AS pencil,
      IFNULL(l.plastic_bin, 0) AS plastic_bin,
      IFNULL(l.tissue, 0) AS tissue,
      IFNULL(l.coffee, 0) AS coffee,
      IFNULL(l.sugar, 0) AS sugar,
      IFNULL(l.tea, 0) AS tea,
      IFNULL(l.creamer, 0) AS creamer,
      IFNULL(l.mineral, 0) AS mineral
    FROM tugas t
    LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
    WHERE t.tanggal = ? AND t.petugas = ?
    ORDER BY t.kamar
  `, [tgl, req.session.user.nama], (err, tugas) => {
    res.render('ra', { user: req.session.user, tanggal: tgl, tugas });
  });
});

app.post('/mulai-kamar', (req, res) => {
  const { tanggal, kamar } = req.body;
  const jam = getWaktuWIB();
  db.run(`INSERT OR IGNORE INTO laporan (tanggal, nomor_kamar, waktu_masuk, petugas) VALUES (?, ?, ?, ?)`,
    [tanggal, kamar, jam, req.session.user.nama], err => {
      res.redirect('/ra');
    });
});

app.post('/selesai-kamar', (req, res) => {
  const { tanggal, kamar, waktu_masuk,
    sheet_double_in, sheet_double_out, sheet_single_in, sheet_single_out,
    duvet_cover_in, duvet_cover_out, duvet_single_in, duvet_single_out,
    bath_towel_in, bath_towel_out, hand_towel_in, hand_towel_out,
    bath_mat_in, bath_mat_out, pillow_case_in, pillow_case_out,
    hand_soap, shampoo, shower_gel, tooth_brush, sterer, shower_cap, slipper,
    laundry_bag, laundry_list, memo_pad, pencil, plastic_bin, tissue,
    coffee, sugar, tea, creamer, mineral
  } = req.body;

  const jamKeluar = getWaktuWIB();

  db.run(`
    INSERT OR REPLACE INTO laporan (
      tanggal, nomor_kamar, waktu_masuk, waktu_keluar,
      sheet_double_in, sheet_double_out, sheet_single_in, sheet_single_out,
      duvet_cover_in, duvet_cover_out, duvet_single_in, duvet_single_out,
      bath_towel_in, bath_towel_out, hand_towel_in, hand_towel_out,
      bath_mat_in, bath_mat_out, pillow_case_in, pillow_case_out,
      hand_soap, shampoo, shower_gel, tooth_brush, sterer, shower_cap, slipper,
      laundry_bag, laundry_list, memo_pad, pencil, plastic_bin, tissue,
      coffee, sugar, tea, creamer, mineral, petugas
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    tanggal, kamar, waktu_masuk, jamKeluar,
    sheet_double_in||0, sheet_double_out||0, sheet_single_in||0, sheet_single_out||0,
    duvet_cover_in||0, duvet_cover_out||0, duvet_single_in||0, duvet_single_out||0,
    bath_towel_in||0, bath_towel_out||0, hand_towel_in||0, hand_towel_out||0,
    bath_mat_in||0, bath_mat_out||0, pillow_case_in||0, pillow_case_out||0,
    hand_soap||0, shampoo||0, shower_gel||0, tooth_brush||0, sterer||0, shower_cap||0, slipper||0,
    laundry_bag||0, laundry_list||0, memo_pad||0, pencil||0, plastic_bin||0, tissue||0,
    coffee||0, sugar||0, tea||0, creamer||0, mineral||0, req.session.user.nama
  ], err => {
    db.run(`UPDATE tugas SET selesai = 1, status_awal = CASE WHEN status_awal = 'VD' THEN 'VC' WHEN status_awal = 'OD' THEN 'OC' ELSE status_awal END WHERE tanggal = ? AND kamar = ?`,
      [tanggal, kamar], () => res.redirect('/ra'));
  });
});

// ==================== LAPORAN PDF ====================
app.get('/unduh-pdf-petugas', (req, res) => {
  const tanggal = req.query.tanggal || getTanggalWIB();
  const petugas = req.query.petugas || '';

  if (!petugas) return res.send('❌ Pilih nama petugas terlebih dahulu!');

  db.all(`
    SELECT 
      t.kamar, t.status_awal, k.lantai,
      IFNULL(l.waktu_masuk, '-') AS waktu_masuk,
      IFNULL(l.waktu_keluar, '-') AS waktu_keluar,
      -- LINEN
      IFNULL(l.sheet_double_in,0) sdi, IFNULL(l.sheet_double_out,0) sdo,
      IFNULL(l.sheet_single_in,0) ssi, IFNULL(l.sheet_single_out,0) sso,
      IFNULL(l.duvet_cover_in,0) dci, IFNULL(l.duvet_cover_out,0) dco,
      IFNULL(l.duvet_single_in,0) dsi, IFNULL(l.duvet_single_out,0) dso,
      IFNULL(l.bath_towel_in,0) bti, IFNULL(l.bath_towel_out,0) bto,
      IFNULL(l.hand_towel_in,0) hti, IFNULL(l.hand_towel_out,0) hto,
      IFNULL(l.bath_mat_in,0) bmi, IFNULL(l.bath_mat_out,0) bmo,
      IFNULL(l.pillow_case_in,0) pci, IFNULL(l.pillow_case_out,0) pco,
      -- AMENITIES
      IFNULL(l.hand_soap,0) hs, IFNULL(l.shampoo,0) sh, IFNULL(l.shower_gel,0) sg,
      IFNULL(l.tooth_brush,0) tb, IFNULL(l.sterer,0) st, IFNULL(l.shower_cap,0) sc,
      IFNULL(l.slipper,0) sl, IFNULL(l.laundry_bag,0) lb, IFNULL(l.laundry_list,0) ll,
      IFNULL(l.memo_pad,0) mp, IFNULL(l.pencil,0) pc, IFNULL(l.plastic_bin,0) pb,
      IFNULL(l.tissue,0) ti, IFNULL(l.coffee,0) cf, IFNULL(l.sugar,0) su,
      IFNULL(l.tea,0) te, IFNULL(l.creamer,0) cr, IFNULL(l.mineral,0) mw
    FROM tugas t
    JOIN kamar k ON t.kamar = k.nomor_kamar
    LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
    WHERE t.tanggal = ? AND t.petugas = ? ORDER BY t.kamar
  `, [tanggal, petugas], (err, data) => {
    if (!data || data.length === 0) return res.send('❌ Tidak ada data untuk dibuat laporan!');

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ROOMBOY_CONTROL_${petugas.replace(/\s+/g, '_')}_${tanggal}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(14).font('Helvetica-Bold').text('HORISON HOTEL & CONVENTION', { align: 'center' });
    doc.fontSize(12).text('ROOMBOY CONTROL SHEET', { align: 'center' }).moveDown(1);
    doc.fontSize(10).font('Helvetica')
      .text(`Nama Petugas: ${petugas}`)
      .text(`Tanggal: ${tanggal}`)
      .text(`Jumlah Kamar: ${data.length}`).moveDown(1);

    // Tabel Header
    const startY = doc.y;
    doc.font('Helvetica-Bold').fontSize(8);
    doc.text('No', 30, startY);
    doc.text('Kamar', 55, startY);
    doc.text('Lantai', 90, startY);
    doc.text('Status', 125, startY);
    doc.text('Jam Masuk', 160, startY);
    doc.text('Jam Keluar', 205, startY);
    doc.text('LINEN\nIN / OUT', 250, startY);
    doc.text('GUEST SUPPLIES & AMENITIES', 420, startY);
    doc.text('Status', 620, startY);
    doc.moveTo(30, startY + 22).lineTo(680, startY + 22).stroke();
    let y = startY + 30;

    // Isi Data per Kamar
    data.forEach((row, idx) => {
      const sts = row.waktu_keluar !== '-' ? 'Selesai' : 'Belum';
      doc.font('Helvetica').fontSize(8);
      doc.text(idx + 1, 30, y);
      doc.text(row.kamar, 55, y);
      doc.text(row.lantai.replace('Lantai ', ''), 90, y);
      doc.text(row.status_awal, 125, y);
      doc.text(row.waktu_masuk, 160, y);
      doc.text(row.waktu_keluar, 205, y);

      // LINEN
      doc.text(`Sheet Double: ${row.sdi} / ${row.sdo}`, 250, y);
      doc.text(`Sheet Single: ${row.ssi} / ${row.sso}`, 250, y + 11);
      doc.text(`Duvet Cover: ${row.dci} / ${row.dco}`, 250, y + 22);
      doc.text(`Duvet Single: ${row.dsi} / ${row.dso}`, 250, y + 33);
      doc.text(`Bath Towel: ${row.bti} / ${row.bto}`, 250, y + 44);
      doc.text(`Hand Towel: ${row.hti} / ${row.hto}`, 250, y + 55);
      doc.text(`Bath Mat: ${row.bmi} / ${row.bmo}`, 250, y + 66);
      doc.text(`Pillow Case: ${row.pci} / ${row.pco}`, 250, y + 77);

      // AMENITIES
      doc.text(`Hand Soap: ${row.hs}`, 420, y);
      doc.text(`Shampoo: ${row.sh}`, 420, y + 11);
      doc.text(`Shower Gel: ${row.sg}`, 420, y + 22);
      doc.text(`Tooth Brush: ${row.tb}`, 420, y + 33);
      doc.text(`Sterer: ${row.st}`, 420, y + 44);
      doc.text(`Shower Cap: ${row.sc}`, 420, y + 55);
      doc.text(`Slipper: ${row.sl}`, 420, y + 66);
      doc.text(`Laundry Bag: ${row.lb}`, 420, y + 77);
      doc.text(`Laundry List: ${row.ll}`, 420, y + 88);
      doc.text(`Memo Pad: ${row.mp}`, 420, y + 99);
      doc.text(`Pencil: ${row.pc}`, 420, y + 110);
      doc.text(`Plastic Bin: ${row.pb}`, 420, y + 121);
      doc.text(`Tissue: ${row.ti}`, 420, y + 132);
      doc.text(`Coffee: ${row.cf}`, 420, y + 143);
      doc.text(`Sugar: ${row.su}`, 420, y + 154);
      doc.text(`Tea: ${row.te}`, 420, y + 165);
      doc.text(`Creamer: ${row.cr}`, 420, y + 176);
      doc.text(`Mineral Water: ${row.mw}`, 420, y + 187);

      doc.text(sts, 620, y + 90);
      y += 210;
      doc.moveTo(30, y).lineTo(680, y).stroke();
      y += 10;
      if (y > 750) { doc.addPage(); y = 50; }
    });

    // Tanda Tangan
    doc.moveDown(2);
    doc.fontSize(9)
      .text(`Prepared by: ${petugas}`, 30, y)
      .text(`Dibuat pada: ${getWaktuWIB()} WIB`, 30, y + 15)
      .text('Checked by: ________________________', 450, y);
    doc.end();
  });
});

app.get('/unduh-pdf-permintaan', (req, res) => {
  const tanggal = req.query.tanggal || getTanggalWIB();
  db.all(`SELECT * FROM permintaan_tamu WHERE tanggal = ? ORDER BY waktu_masuk DESC`, [tanggal], (err, data) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="LAPORAN_PERMINTAAN_TAMU_${tanggal}.pdf"`);
    doc.pipe(res);

    doc.fontSize(14).font('Helvetica-Bold').text('HORISON HOTEL & CONVENTION', { align: 'center' });
    doc.fontSize(12).text('LAPORAN PERMINTAAN TAMU', { align: 'center' }).moveDown(1);
    doc.fontSize(10).text(`Tanggal: ${tanggal}`).moveDown(1);

    let y = doc.y;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('No', 30, y); doc.text('Kamar', 60, y); doc.text('Permintaan', 110, y);
    doc.text('Waktu Masuk', 220, y); doc.text('Waktu Selesai', 300, y); doc.text('Status', 390, y);
    doc.moveTo(30, y + 20).lineTo(550, y + 20).stroke(); y += 25;

    doc.font('Helvetica').fontSize(9);
    data.forEach((row, i) => {
      doc.text(i + 1, 30, y);
      doc.text(row.nomor_kamar, 60, y);
      doc.text(`${row.jenis_permintaan} ${row.keterangan || ''}`, 110, y, { width: 100 });
      doc.text(row.waktu_masuk, 220, y);
      doc.text(row.waktu_selesai || '-', 300, y);
      doc.text(row.status, 390, y);
      y += 20;
      if (y > 750) { doc.addPage(); y = 50; }
    });
    doc.end();
  });
});

// ==================== HALAMAN OT ====================
app.get('/ot', (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'OT') return res.redirect('/');
  const tgl = getTanggalWIB();
  db.all(`
    SELECT t.*, k.lantai,
      IFNULL(l.waktu_masuk, '-') AS waktu_masuk,
      IFNULL(l.waktu_keluar, '-') AS waktu_keluar
    FROM tugas t
    JOIN kamar k ON t.kamar = k.nomor_kamar
    LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
    WHERE t.tanggal = ? ORDER BY t.kamar
  `, [tgl], (err, tugas) => {
    db.all(`SELECT * FROM permintaan_tamu WHERE tanggal = ? ORDER BY waktu_masuk DESC`, [tgl], (err, permintaan) => {
      res.render('ot', { user: req.session.user, tanggal: tgl, tugas, permintaan });
    });
  });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Jalankan Server
app.listen(PORT, () => console.log(`✅ Server berjalan di port ${PORT}`));
