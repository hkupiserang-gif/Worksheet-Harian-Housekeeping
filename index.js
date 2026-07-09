// ==================================================
// SISTEM LAPORAN KAMAR - HORISON HOTEL
// File: index.js
// ==================================================

// --------------------------
// MODUL & KONFIGURASI AWAL
// --------------------------
const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const { PDFDocument } = require('pdfkit');
const ejs = require('ejs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --------------------------
// KONEKSI DATABASE
// --------------------------
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('❌ Gagal terhubung ke database:', err.message);
  } else {
    console.log('✅ Database terhubung dengan sukses');
  }
});

// --------------------------
// INISIALISASI TABEL DATABASE
// --------------------------
db.serialize(() => {
  // Tabel Pengguna
  db.run(`CREATE TABLE IF NOT EXISTS pengguna (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    hak_akses TEXT NOT NULL
  )`);

  // Tabel Kamar
  db.run(`CREATE TABLE IF NOT EXISTS kamar (
    nomor_kamar TEXT PRIMARY KEY,
    lantai TEXT NOT NULL,
    tipe TEXT
  )`);

  // Tabel Tugas
  db.run(`CREATE TABLE IF NOT EXISTS tugas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT NOT NULL,
    kamar TEXT NOT NULL,
    lantai TEXT NOT NULL,
    status_awal TEXT NOT NULL,
    petugas TEXT NOT NULL,
    waktu_masuk TEXT DEFAULT '-',
    waktu_keluar TEXT DEFAULT '-',
    selesai INTEGER DEFAULT 0,
    FOREIGN KEY (kamar) REFERENCES kamar(nomor_kamar)
  )`);

  // Tabel Laporan Kebersihan
  db.run(`CREATE TABLE IF NOT EXISTS laporan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT NOT NULL,
    nomor_kamar TEXT NOT NULL,
    waktu_masuk TEXT,
    waktu_keluar TEXT,
    -- Linen
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
    -- Amenitas
    hand_soap INTEGER DEFAULT 0,
    shampoo INTEGER DEFAULT 0,
    shower_gel INTEGER DEFAULT 0,
    tooth_brush INTEGER DEFAULT 0,
    sterer INTEGER DEFAULT 0,
    shower_cap INTEGER DEFAULT 0,
    slipper INTEGER DEFAULT 0,
    laundry_bag INTEGER DEFAULT 0,
    laundry_list INTEGER DEFAULT 0,
    memo_pad INTEGER DEFAULT 0,
    pencil INTEGER DEFAULT 0,
    plastic_bin INTEGER DEFAULT 0,
    tissue INTEGER DEFAULT 0,
    coffee INTEGER DEFAULT 0,
    sugar INTEGER DEFAULT 0,
    tea INTEGER DEFAULT 0,
    creamer INTEGER DEFAULT 0,
    mineral INTEGER DEFAULT 0
  )`);

  // Tabel Permintaan Tamu (Panel OT)
  db.run(`CREATE TABLE IF NOT EXISTS permintaan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT NOT NULL,
    nomor_kamar TEXT NOT NULL,
    jenis_permintaan TEXT NOT NULL,
    keterangan TEXT,
    waktu_masuk TEXT NOT NULL,
    waktu_selesai TEXT,
    status TEXT NOT NULL
  )`);

  // Tambah data awal jika belum ada
  db.get(`SELECT COUNT(*) AS jumlah FROM pengguna`, (err, row) => {
    if (row.jumlah === 0) {
      db.run(`INSERT INTO pengguna (nama, username, password, hak_akses)
              VALUES 
              ('Administrator', 'admin', '123456', 'admin'),
              ('Pengawas', 'spv', '123456', 'spv'),
              ('Order Taker', 'ot', '123456', 'ot'),
              ('Petugas Kamar', 'rb', '123456', 'rb')`);
      console.log('✅ Data pengguna awal ditambahkan');
    }
  });

  db.get(`SELECT COUNT(*) AS jumlah FROM kamar`, (err, row) => {
    if (row.jumlah === 0) {
      const daftarKamar = [];
      // Contoh data kamar
      for (let lantai = 1; lantai <= 5; lantai++) {
        for (let no = 1; no <= 10; no++) {
          const nomor = `${lantai}0${no}`;
          daftarKamar.push(`('${nomor}', 'Lantai ${lantai}', 'Standar')`);
        }
      }
      db.run(`INSERT INTO kamar (nomor_kamar, lantai, tipe) VALUES ${daftarKamar.join(',')}`);
      console.log('✅ Data kamar awal ditambahkan');
    }
  });
});

// --------------------------
// FUNGSI BANTUAN
// --------------------------
function getTanggalWIB() {
  const d = new Date();
  return new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })).toISOString().split('T')[0];
}

function getWaktuWIB() {
  const d = new Date();
  const jkt = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  return String(jkt.getHours()).padStart(2, '0') + ':' + String(jkt.getMinutes()).padStart(2, '0');
}

// --------------------------
// KONFIGURASI MIDDLEWARE
// --------------------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'rahasia-hotel-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 } // Sesi berlaku 8 jam
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Fungsi cek login
function cekLogin(req, res, next) {
  if (req.session && req.session.pengguna) {
    req.user = req.session.pengguna;
    return next();
  }
  res.redirect('/login');
}

// --------------------------
// RUTE UTAMA
// --------------------------
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Halaman Login
app.get('/login', (req, res) => {
  res.render('login', { pesan: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM pengguna WHERE username = ? AND password = ?`, [username, password], (err, pengguna) => {
    if (err || !pengguna) {
      return res.render('login', { pesan: '❌ Username atau password salah!' });
    }
    req.session.pengguna = pengguna;
    // Arahkan sesuai hak akses
    if (pengguna.hak_akses === 'admin') return res.redirect('/spv');
    if (pengguna.hak_akses === 'spv') return res.redirect('/spv');
    if (pengguna.hak_akses === 'ot') return res.redirect('/ot');
    if (pengguna.hak_akses === 'rb') return res.redirect('/rb');
    res.redirect('/');
  });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// --------------------------
// RUTE PANEL SUPERVISOR
// --------------------------
app.get('/spv', cekLogin, (req, res) => {
  if (req.user.hak_akses !== 'spv' && req.user.hak_akses !== 'admin') {
    return res.send('❌ Akses ditolak!');
  }
  const tanggal = getTanggalWIB();
  const waktuSekarang = getWaktuWIB();

  db.all(`SELECT DISTINCT petugas FROM tugas WHERE tanggal = ?`, [tanggal], (err, daftarPetugas) => {
    db.all(`SELECT * FROM tugas WHERE tanggal = ? ORDER BY kamar`, [tanggal], (err, daftarTugas) => {
      res.render('spv', {
        user: req.user,
        tanggal,
        waktuSekarang,
        daftarPetugas,
        daftarTugas,
        pesan: null
      });
    });
  });
});

// --------------------------
// RUTE PANEL ROOMBOY
// --------------------------
app.get('/rb', cekLogin, (req, res) => {
  if (req.user.hak_akses !== 'rb' && req.user.hak_akses !== 'admin') {
    return res.send('❌ Akses ditolak!');
  }
  const tanggal = getTanggalWIB();
  const waktuSekarang = getWaktuWIB();

  db.all(`SELECT t.*, k.lantai FROM tugas t JOIN kamar k ON t.kamar = k.nomor_kamar WHERE t.tanggal = ? AND t.petugas = ?`,
    [tanggal, req.user.nama], (err, daftarTugas) => {
      res.render('ra', {
        user: req.user,
        tanggal,
        waktuSekarang,
        daftarTugas,
        pesan: null
      });
    });
});

// --------------------------
// ✅ RUTE PANEL ORDER TAKER (PERBAIKAN LENGKAP)
// --------------------------
app.get('/ot', cekLogin, (req, res) => {
  if (req.user.hak_akses !== 'ot' && req.user.hak_akses !== 'admin') {
    return res.send('❌ Akses ditolak! Halaman ini hanya untuk Order Taker atau Admin.');
  }

  const tanggal = getTanggalWIB();
  const waktuSekarang = getWaktuWIB();
  let pesan = null;

  if (req.query.pesan === 'sukses') pesan = { tipe: 'sukses', teks: '✅ Data permintaan berhasil disimpan!' };
  if (req.query.pesan === 'hapus') pesan = { tipe: 'sukses', teks: '✅ Data berhasil dihapus!' };
  if (req.query.pesan === 'error') pesan = { tipe: 'error', teks: '❌ Terjadi kesalahan saat memproses data!' };

  // Ambil daftar kamar
  db.all(`SELECT nomor_kamar, lantai FROM kamar ORDER BY nomor_kamar`, (err, daftarKamar) => {
    if (err) {
      console.error('Error ambil kamar:', err);
      return res.render('ot', {
        user: req.user, tanggal, waktuSekarang, daftarKamar: [], daftarPermintaan: [], pesan: { tipe: 'error', teks: '❌ Gagal memuat daftar kamar' }
      });
    }

    // Ambil daftar permintaan hari ini
    db.all(`SELECT * FROM permintaan WHERE tanggal = ? ORDER BY waktu_masuk DESC`, [tanggal], (err, daftarPermintaan) => {
      if (err) {
        console.error('Error ambil permintaan:', err);
        return res.render('ot', {
          user: req.user, tanggal, waktuSekarang, daftarKamar, daftarPermintaan: [], pesan: { tipe: 'error', teks: '❌ Gagal memuat data permintaan' }
        });
      }

      res.render('ot', { user: req.user, tanggal, waktuSekarang, daftarKamar, daftarPermintaan, pesan });
    });
  });
});

// Proses Tambah Permintaan
app.post('/tambah-permintaan', cekLogin, (req, res) => {
  const { nomor_kamar, jenis_permintaan, keterangan } = req.body;
  const tanggal = getTanggalWIB();
  const waktu_masuk = getWaktuWIB();
  const status = 'Dipinjam Tamu';

  db.run(`INSERT INTO permintaan (tanggal, nomor_kamar, jenis_permintaan, keterangan, waktu_masuk, status)
          VALUES (?, ?, ?, ?, ?, ?)`,
    [tanggal, nomor_kamar, jenis_permintaan, keterangan || '', waktu_masuk, status],
    (err) => {
      if (err) {
        console.error('Error simpan permintaan:', err);
        return res.redirect('/ot?pesan=error');
      }
      res.redirect('/ot?pesan=sukses');
    }
  );
});

// Proses Ubah Status
app.post('/ubah-status-permintaan', cekLogin, (req, res) => {
  const { id, status } = req.body;
  const waktu_selesai = getWaktuWIB();

  db.run(`UPDATE permintaan SET status = ?, waktu_selesai = ? WHERE id = ?`,
    [status, waktu_selesai, id],
    (err) => {
      if (err) console.error('Error ubah status:', err);
      res.redirect('/ot');
    }
  );
});

// Proses Hapus Data
app.post('/hapus-permintaan', cekLogin, (req, res) => {
  const { id } = req.body;
  db.run(`DELETE FROM permintaan WHERE id = ?`, [id], (err) => {
    if (err) console.error('Error hapus data:', err);
    res.redirect('/ot?pesan=hapus');
  });
});

// --------------------------
// ✅ LAPORAN PDF PERMINTAAN OT
// --------------------------
app.get('/unduh-pdf-ot', cekLogin, (req, res) => {
  const tanggal = req.query.tanggal || getTanggalWIB();

  db.all(`SELECT * FROM permintaan WHERE tanggal = ? ORDER BY waktu_masuk DESC`, [tanggal], (err, data) => {
    if (err || !data || data.length === 0) {
      return res.send('❌ Tidak ada data permintaan untuk tanggal ini!');
    }

    const doc = new PDFDocument({ margin: 15, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="LAPORAN_PERMINTAAN_TAMU_${tanggal}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(14).font('Helvetica-Bold').text('HORISON HOTEL & CONVENTION', { align: 'center' });
    doc.fontSize(12).text('LAPORAN PERMINTAAN TAMU', { align: 'center' }).moveDown(0.8);
    doc.fontSize(9).font('Helvetica')
      .text(`Tanggal: ${tanggal}`, 20)
      .text(`Dibuat Jam: ${getWaktuWIB()} WIB`, doc.page.width - 220, doc.y);
    doc.moveDown(1);

    // Definisi kolom
    const colDef = [
      { w: 25, label: 'No' },
      { w: 45, label: 'Kamar' },
      { w: 90, label: 'Permintaan' },
      { w: 110, label: 'Keterangan' },
      { w: 55, label: 'Jam Masuk' },
      { w: 65, label: 'Status' },
      { w: 55, label: 'Jam Selesai' }
    ];

    const startX = 15;
    let currentX = startX;
    let y = doc.y;
    const rowHeight = 22;

    // Gambar Header Tabel
    doc.font('Helvetica-Bold').fontSize(8);
    colDef.forEach(col => {
      doc.rect(currentX, y, col.w, rowHeight).stroke();
      doc.text(col.label, currentX + 3, y + 7, { width: col.w - 6, align: 'center' });
      currentX += col.w;
    });
    y += rowHeight;

    // Isi Data
    doc.font('Helvetica').fontSize(8);
    data.forEach((item, idx) => {
      currentX = startX;
      const values = [
        idx + 1,
        item.nomor_kamar,
        item.jenis_permintaan,
        item.keterangan || '-',
        item.waktu_masuk,
        item.status,
        item.waktu_selesai || '-'
      ];

      colDef.forEach((col, i) => {
        doc.rect(currentX, y, col.w, rowHeight).stroke();
        doc.text(values[i], currentX + 3, y + 7, { width: col.w - 6, align: 'center' });
        currentX += col.w;
      });

      y += rowHeight;
      if (y > doc.page.height - 30) {
        doc.addPage({ layout: 'landscape' });
        y = 20;
      }
    });

    // Tanda Tangan
    doc.moveDown(2);
    doc.fontSize(9)
      .text('Dibuat oleh: Order Taker', 20, y)
      .text('Diketahui oleh: ________________________', doc.page.width - 270, y);

    doc.end();
  });
});

// --------------------------
// ✅ LAPORAN PDF ROOMBOY (SUDAH DIPERBAIKI RAPI)
// --------------------------
app.get('/unduh-pdf-petugas', cekLogin, (req, res) => {
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

    const doc = new PDFDocument({ margin: 12, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ROOMBOY_CONTROL_${petugas.replace(/\s+/g, '_')}_${tanggal}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(14).font('Helvetica-Bold').text('HORISON HOTEL & CONVENTION', { align: 'center' });
    doc.fontSize(12).text('ROOMBOY CONTROL SHEET', { align: 'center' }).moveDown(0.6);
    doc.fontSize(9).font('Helvetica')
      .text(`Nama Petugas : ${petugas}`, 20)
      .text(`Tanggal      : ${tanggal}`, 20, doc.y + 12)
      .text(`Jumlah Kamar : ${data.length}`, 20, doc.y + 12)
      .text(`Dibuat Pada  : ${getWaktuWIB()} WIB`, doc.page.width - 220, doc.y - 24);
    doc.moveDown(1);

    // Definisi Kolom
    const colDef = [
      { w: 22, label: 'No' },
      { w: 35, label: 'Kamar' },
      { w: 45, label: 'Lantai' },
      { w: 38, label: 'Status' },
      { w: 38, label: 'Jam Masuk' },
      { w: 38, label: 'Jam Keluar' },
      { w: 25, label: 'SD IN' },
      { w: 25, label: 'SD OUT' },
      { w: 25, label: 'SS IN' },
      { w: 25, label: 'SS OUT' },
      { w: 25, label: 'DC IN' },
      { w: 25, label: 'DC OUT' },
      { w: 25, label: 'DS IN' },
      { w: 25, label: 'DS OUT' },
      { w: 25, label: 'BT IN' },
      { w: 25, label: 'BT OUT' },
      { w: 25, label: 'HT IN' },
      { w: 25, label: 'HT OUT' },
      { w: 25, label: 'BM IN' },
      { w: 25, label: 'BM OUT' },
      { w: 25, label: 'PC IN' },
      { w: 25, label: 'PC OUT' },
      { w: 25, label: 'Soap' },
      { w: 25, label: 'Shampoo' },
      { w: 25, label: 'Sh Gel' },
      { w: 25, label: 'Tooth' },
      { w: 25, label: 'Steril' },
      { w: 25, label: 'Sh Cap' },
      { w: 25, label: 'Slipper' },
      { w: 28, label: 'Laun Bag' },
      { w: 28, label: 'Laun List' },
      { w: 28, label: 'Memo' },
      { w: 28, label: 'Pencil' },
      { w: 28, label: 'Plas Bin' },
      { w: 28, label: 'Tissue' },
      { w: 28, label: 'Coffee' },
      { w: 28, label: 'Sugar' },
      { w: 28, label: 'Tea' },
      { w: 28, label: 'Creamer' },
      { w: 32, label: 'Mineral' },
      { w: 40, label: 'Status' }
    ];

    const startX = 12;
    let currentX = startX;
    let y = doc.y;
    const rowHeight = 20;

    // Header Tabel
    doc.font('Helvetica-Bold').fontSize(7);
    colDef.forEach(col => {
      doc.rect(currentX, y, col.w, rowHeight).stroke();
      doc.text(col.label, currentX + 2, y + 6, { width: col.w - 4, align: 'center' });
      currentX += col.w;
    });
    y += rowHeight;

    // Isi Data
    doc.font('Helvetica').fontSize(8);
    data.forEach((row, idx) => {
      currentX = startX;
      const values = [
        idx + 1,
        row.kamar,
        row.lantai.replace('Lantai ', ''),
        row.status_awal,
        row.waktu_masuk,
        row.waktu_keluar,
        row.sdi, row.sdo, row.ssi, row.sso,
        row.dci, row.dco, row.dsi, row.dso,
        row.bti, row.bto, row.hti, row.hto,
        row.bmi, row.bmo, row.pci, row.pco,
        row.hs, row.sh, row.sg, row.tb, row.st, row.sc, row.sl,
        row.lb, row.ll, row.mp, row.pc, row.pb, row.ti,
        row.cf, row.su, row.te, row.cr, row.mw,
        row.waktu_keluar !== '-' ? 'Selesai' : 'Belum'
      ];

      colDef.forEach((col, i) => {
        doc.rect(currentX, y, col.w, rowHeight).stroke();
        doc.text(values[i]?.toString() || '0', currentX + 2, y + 6, { width: col.w - 4, align: 'center' });
        currentX += col.w;
      });

      y += rowHeight;
      if (y > doc.page.height - 30) {
        doc.addPage({ layout: 'landscape' });
        y = 20;
      }
    });

    // Tanda Tangan
    doc.moveDown(2);
    doc.fontSize(9)
      .text(`Prepared by: ${petugas}`, 20, y)
      .text(`Checked by: ________________________`, doc.page.width - 260, y);

    doc.end();
  });
});

// --------------------------
// JALANKAN SERVER
// --------------------------
app.listen(PORT, () => {
  console.log(`✅ Server berjalan di port ${PORT}`);
});
