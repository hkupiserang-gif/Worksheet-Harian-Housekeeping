const express = require('express');
const { Pool } = require('pg');
const session = require('express-session');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8888;

// Koneksi Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(() => console.log("✅ Koneksi DB berhasil"))
  .catch(err => console.error("❌ Koneksi DB gagal:", err));

// Konfigurasi Aplikasi
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'hotel-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Rute Manifest
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// Pesan Notifikasi
app.use((req, res, next) => {
  if (req.query.pesan === 'berhasil') {
    res.locals.pesan = { tipe: 'sukses', teks: '✅ Laporan berhasil disimpan' };
  } else if (req.query.pesan === 'gagal') {
    res.locals.pesan = { tipe: 'error', teks: '❌ Gagal menyimpan data, coba lagi' };
  }
  next();
});

// Ambil Data Tugas & Laporan
async function ambilTugasRA(tanggal, namaPetugas) {
  const hasil = await pool.query(`
    SELECT t.*,
           l.waktu_masuk, l.waktu_keluar, l.linen, l.amenities, l.keterangan
    FROM tugas t
    LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
    WHERE t.tanggal = $1 AND t.petugas = $2
    ORDER BY t.kamar
  `, [tanggal, namaPetugas]);
  return hasil.rows;
}

// ================= RUTE UTAMA =================
app.get('/', (req, res) => {
  if (req.session.user) {
    if (req.session.user.peran === 'SPV') return res.redirect('/spv');
    if (req.session.user.peran === 'RA') return res.redirect('/ra');
    if (req.session.user.peran === 'OT') return res.redirect('/ot');
  }
  res.render('login', { pesan: null });
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hasil = await pool.query("SELECT * FROM pengguna WHERE username = $1", [username]);
    const pengguna = hasil.rows[0];
    if (pengguna && password === pengguna.sandi) {
      req.session.user = pengguna;
      if (pengguna.peran === 'SPV') return res.redirect('/spv');
      if (pengguna.peran === 'RA') return res.redirect('/ra');
      if (pengguna.peran === 'OT') return res.redirect('/ot');
    }
    res.render('login', { pesan: '❌ Username atau kata sandi salah!' });
  } catch (err) {
    console.error("Login error:", err);
    res.render('login', { pesan: '❌ Terjadi kesalahan sistem' });
  }
});

// ================= RUTE ROOM ATTENDANT =================
app.get('/ra', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'RA') return res.redirect('/');
  try {
    const hariIni = new Date().toISOString().split('T')[0];
    const tugas = await ambilTugasRA(hariIni, req.session.user.nama);
    res.render('ra', { user: req.session.user, tugas, pesan: res.locals.pesan || null });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// Simpan Laporan RA - DIPERBAIKI
app.post('/simpan-laporan', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'RA') return res.redirect('/');
  try {
    const {
      tanggal, kamar, waktu_masuk, waktu_keluar,
      sheet_double, sheet_single, duvet_double, duvet_single,
      bath_towel, hand_towel, bath_mat, pillow_case,
      tissue, hand_soap, shampoo, shower_gel, tooth_brush,
      sterilizer, shower_cap, slipper, laundry_bag, laundry_list,
      memo_pad, pencil, plastic_bin, tissue_box, coffee, sugar,
      tea, creamer, mineral_water, keterangan
    } = req.body;

    // Susun data linen
    const linenData = {
      sheet_double: Number(sheet_double) || 0,
      sheet_single: Number(sheet_single) || 0,
      duvet_double: Number(duvet_double) || 0,
      duvet_single: Number(duvet_single) || 0,
      bath_towel: Number(bath_towel) || 0,
      hand_towel: Number(hand_towel) || 0,
      bath_mat: Number(bath_mat) || 0,
      pillow_case: Number(pillow_case) || 0
    };

    // Susun data amenities
    const amenitiesData = {
      tissue: Number(tissue) || 0,
      hand_soap: Number(hand_soap) || 0,
      shampoo: Number(shampoo) || 0,
      shower_gel: Number(shower_gel) || 0,
      tooth_brush: Number(tooth_brush) || 0,
      sterilizer: Number(sterilizer) || 0,
      shower_cap: Number(shower_cap) || 0,
      slipper: Number(slipper) || 0,
      laundry_bag: Number(laundry_bag) || 0,
      laundry_list: Number(laundry_list) || 0,
      memo_pad: Number(memo_pad) || 0,
      pencil: Number(pencil) || 0,
      plastic_bin: Number(plastic_bin) || 0,
      tissue_box: Number(tissue_box) || 0,
      coffee: Number(coffee) || 0,
      sugar: Number(sugar) || 0,
      tea: Number(tea) || 0,
      creamer: Number(creamer) || 0,
      mineral_water: Number(mineral_water) || 0
    };

    // Simpan ke database
    await pool.query(`
      INSERT INTO laporan (
        tanggal, nomor_kamar, shift, status_kamar, waktu_masuk, waktu_keluar,
        linen, amenities, keterangan, petugas
      )
      VALUES ($1, $2, 'Morning', 'HK', $3, $4, $5, $6, $7, $8)
      ON CONFLICT (tanggal, nomor_kamar) DO UPDATE SET
        waktu_masuk = $3, waktu_keluar = $4, linen = $5, amenities = $6,
        keterangan = $7, petugas = $8
    `, [
      tanggal, kamar,
      waktu_masuk || null, waktu_keluar || null,
      JSON.stringify(linenData), JSON.stringify(amenitiesData),
      keterangan || '', req.session.user.nama
    ]);

    // Update status selesai jika ada waktu keluar
    if (waktu_keluar) {
      await pool.query("UPDATE tugas SET selesai = true WHERE tanggal = $1 AND kamar = $2", [tanggal, kamar]);
    }

    res.redirect('/ra?pesan=berhasil');
  } catch (err) {
    console.error("❌ Error simpan laporan:", err);
    res.redirect('/ra?pesan=gagal');
  }
});

// --- RUTE LAINNYA ---
app.get('/spv', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  try {
    const hariIni = new Date().toISOString().split('T')[0];
    const hasil = await pool.query(`
      SELECT t.*, l.waktu_masuk, l.waktu_keluar, l.linen, l.amenities
      FROM tugas t
      LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
      WHERE t.tanggal = $1
      ORDER BY t.kamar
    `, [hariIni]);
    res.render('spv', { user: req.session.user, daftarKamar: hasil.rows, pesan: res.locals.pesan || null });
  } catch (err) {
    console.error(err);
    res.render('spv', { user: req.session.user, daftarKamar: [], pesan: { tipe: 'error', teks: 'Gagal memuat data' } });
  }
});

app.post('/tambah-tugas-banyak', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  try {
    const { tanggal, petugas, kamar, ...lain } = req.body;
    if (!kamar) return res.redirect('/spv?pesan=gagal');
    const daftar = Array.isArray(kamar) ? kamar : [kamar];
    for (const k of daftar) {
      const status = lain[`status_${k}`] || 'VCU';
      await pool.query(`
        INSERT INTO tugas (tanggal, kamar, petugas, status_awal, selesai)
        VALUES ($1, $2, $3, $4, false)
        ON CONFLICT (tanggal, kamar) DO UPDATE
        SET petugas = $3, status_awal = $4, selesai = false
      `, [tanggal, k, petugas, status]);
    }
    res.redirect('/spv?pesan=berhasil');
  } catch (err) {
    console.error(err);
    res.redirect('/spv?pesan=gagal');
  }
});

app.get('/ot', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'OT') return res.redirect('/');
  try {
    const hasil = await pool.query("SELECT * FROM request_tamu WHERE petugas = $1 ORDER BY tanggal DESC, jam DESC", [req.session.user.nama]);
    res.render('ot', { user: req.session.user, daftarRequest: hasil.rows, pesan: null });
  } catch (err) {
    console.error(err);
    res.render('ot', { user: req.session.user, daftarRequest: [], pesan: { tipe: 'error', teks: 'Gagal memuat data' } });
  }
});

app.post('/simpan-request', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'OT') return res.redirect('/');
  try {
    const { tanggal, jam, nomor_kamar, barang, status } = req.body;
    await pool.query(`INSERT INTO request_tamu (tanggal, jam, nomor_kamar, barang, status, petugas) VALUES ($1,$2,$3,$4,$5,$6)`,
      [tanggal, jam, nomor_kamar, barang, status, req.session.user.nama]);
    res.redirect('/ot?pesan=berhasil');
  } catch (err) {
    console.error(err);
    res.redirect('/ot?pesan=gagal');
  }
});

app.get('/ubah-status/:id', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'OT') return res.redirect('/');
  try {
    await pool.query("UPDATE request_tamu SET status = 'Sudah Dikembalikan' WHERE id = $1 AND petugas = $2", [req.params.id, req.session.user.nama]);
    res.redirect('/ot');
  } catch (err) {
    console.error(err);
    res.redirect('/ot');
  }
});

app.get('/unduh', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  try {
    const hasil = await pool.query("SELECT * FROM laporan ORDER BY tanggal DESC");
    const namaFile = `Laporan_HK_${new Date().toISOString().slice(0,10)}.csv`;
    const jalur = `/tmp/${namaFile}`;
    const csv = createCsvWriter({
      path: jalur,
      header: [
        {id:'tanggal', title:'Tanggal'}, {id:'nomor_kamar', title:'Kamar'},
        {id:'shift', title:'Shift'}, {id:'status_kamar', title:'Status'},
        {id:'waktu_masuk', title:'Waktu Masuk'}, {id:'waktu_keluar', title:'Waktu Keluar'},
        {id:'linen', title:'Linen'}, {id:'amenities', title:'Amenities'},
        {id:'keterangan', title:'Keterangan'}, {id:'petugas', title:'Petugas'}
      ]
    });
    await csv.writeRecords(hasil.rows);
    res.download(jalur, namaFile, () => fs.unlink(jalur, () => {}));
  } catch (err) {
    console.error(err);
    res.redirect('/spv');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.listen(PORT, () => console.log(`✅ Server berjalan di port ${PORT}`));
