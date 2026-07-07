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

// Pesan notifikasi
app.use((req, res, next) => {
  if (req.query.pesan === 'berhasil') {
    res.locals.pesan = { tipe: 'sukses', teks: '✅ Tugas berhasil disimpan' };
  } else if (req.query.pesan === 'gagal') {
    res.locals.pesan = { tipe: 'error', teks: '❌ Gagal menyimpan data' };
  }
  next();
});

// Fungsi bantu ambil data kamar
async function ambilDataKamar(tanggal) {
  const semuaKamar = await pool.query("SELECT nomor, lantai, tipe_kamar FROM daftar_kamar ORDER BY nomor");
  const tugasHariIni = await pool.query("SELECT kamar, status_awal, petugas, selesai FROM tugas WHERE tanggal = $1", [tanggal]);

  return semuaKamar.rows.map(k => {
    const tugas = tugasHariIni.rows.find(t => t.kamar === k.nomor);
    return {
      nomor: k.nomor,
      lantai: k.lantai,
      tipe_kamar: k.tipe_kamar,
      status: tugas?.status_awal || null,
      petugas: tugas?.petugas || null,
      selesai: tugas?.selesai || false
    };
  });
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

// ================= RUTE SUPERVISOR =================
app.get('/spv', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  try {
    const hariIni = new Date().toISOString().split('T')[0];
    const daftarKamar = await ambilDataKamar(hariIni);
    res.render('spv', { 
      user: req.session.user, 
      daftarKamar: daftarKamar, 
      pesan: res.locals.pesan || null 
    });
  } catch (err) {
    console.error(err);
    res.render('spv', { user: req.session.user, daftarKamar: [], pesan: { tipe: 'error', teks: 'Gagal memuat data kamar' } });
  }
});

// Simpan tugas untuk banyak kamar sekaligus
app.post('/tambah-tugas-banyak', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  try {
    const { tanggal, petugas, ...dataLain } = req.body;
    const daftarKamar = req.body.kamar;

    if (!daftarKamar || (Array.isArray(daftarKamar) && daftarKamar.length === 0)) {
      const daftarKamar = await ambilDataKamar(tanggal);
      return res.render('spv', {
        user: req.session.user,
        daftarKamar: daftarKamar,
        pesan: { tipe: 'error', teks: '❌ Pilih minimal satu kamar terlebih dahulu' }
      });
    }

    const kamarList = Array.isArray(daftarKamar) ? daftarKamar : [daftarKamar];

    for (const nomorKamar of kamarList) {
      const status = dataLain[`status_${nomorKamar}`] || 'VCU';
      await pool.query(`
        INSERT INTO tugas (tanggal, kamar, petugas, status_awal, selesai)
        VALUES ($1, $2, $3, $4, false)
        ON CONFLICT (tanggal, kamar) DO UPDATE 
        SET petugas = $3, status_awal = $4, selesai = false
      `, [tanggal, nomorKamar, petugas, status]);
    }

    res.redirect('/spv?pesan=berhasil');
  } catch (err) {
    console.error("Error simpan tugas:", err);
    res.redirect('/spv?pesan=gagal');
  }
});

// ================= RUTE ROOM ATTENDANT =================
app.get('/ra', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'RA') return res.redirect('/');
  try {
    const hariIni = new Date().toISOString().split('T')[0];
    const tugas = await pool.query("SELECT * FROM tugas WHERE tanggal = $1 AND petugas = $2", [hariIni, req.session.user.nama]);
    res.render('ra', { user: req.session.user, tugas: tugas.rows, pesan: res.locals.pesan || null });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// Simpan laporan RA (sudah disesuaikan tanpa lantai & status pilihan)
app.post('/simpan-laporan', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'RA') return res.redirect('/');
  try {
    const { tanggal, kamar, shift, waktu_masuk, waktu_keluar, keterangan } = req.body;
    const status = 'HK'; // Status tetap default

    await pool.query(`
      INSERT INTO laporan (tanggal, nomor_kamar, shift, status_kamar, waktu_masuk, waktu_keluar, keterangan, petugas)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [tanggal, kamar, shift, status, waktu_masuk || null, waktu_keluar || null, keterangan || '', req.session.user.nama]);

    await pool.query("UPDATE tugas SET selesai = true WHERE tanggal = $1 AND kamar = $2", [tanggal, kamar]);

    res.redirect('/ra?pesan=berhasil');
  } catch (err) {
    console.error("Error simpan laporan RA:", err);
    res.redirect('/ra?pesan=gagal');
  }
});

// ================= RUTE ORDER TAKER =================
app.get('/ot', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'OT') return res.redirect('/');
  try {
    const daftarRequest = await pool.query(
      "SELECT * FROM request_tamu WHERE petugas = $1 ORDER BY tanggal DESC, jam DESC",
      [req.session.user.nama]
    );
    res.render('ot', { user: req.session.user, daftarRequest: daftarRequest.rows, pesan: null });
  } catch (err) {
    console.error(err);
    res.render('ot', { user: req.session.user, daftarRequest: [], pesan: { tipe: 'error', teks: 'Gagal memuat data' } });
  }
});

app.post('/simpan-request', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'OT') return res.redirect('/');
  try {
    const { tanggal, jam, nomor_kamar, barang, status } = req.body;
    await pool.query(
      `INSERT INTO request_tamu (tanggal, jam, nomor_kamar, barang, status, petugas)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tanggal, jam, nomor_kamar, barang, status, req.session.user.nama]
    );
    const daftarRequest = await pool.query("SELECT * FROM request_tamu WHERE petugas = $1 ORDER BY tanggal DESC, jam DESC", [req.session.user.nama]);
    res.render('ot', {
      user: req.session.user,
      daftarRequest: daftarRequest.rows,
      pesan: { tipe: 'sukses', teks: '✅ Catatan berhasil disimpan' }
    });
  } catch (err) {
    console.error(err);
    res.render('ot', {
      user: req.session.user,
      daftarRequest: [],
      pesan: { tipe: 'error', teks: '❌ Gagal menyimpan catatan' }
    });
  }
});

app.get('/ubah-status/:id', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'OT') return res.redirect('/');
  try {
    const id = req.params.id;
    await pool.query(
      "UPDATE request_tamu SET status = 'Sudah Dikembalikan' WHERE id = $1 AND petugas = $2",
      [id, req.session.user.nama]
    );
    res.redirect('/ot');
  } catch (err) {
    console.error(err);
    res.redirect('/ot');
  }
});

// ================= RUTE UNDUH LAPORAN =================
app.get('/unduh', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  try {
    const hasil = await pool.query("SELECT tanggal, nomor_kamar, shift, status_kamar, waktu_masuk, waktu_keluar, keterangan, petugas FROM laporan ORDER BY tanggal DESC");
    const namaFile = `Laporan_HK_${new Date().toISOString().slice(0,10)}.csv`;
    const jalur = `/tmp/${namaFile}`;

    const csv = createCsvWriter({
      path: jalur,
      header: [
        {id: 'tanggal', title: 'Tanggal'},
        {id: 'nomor_kamar', title: 'No Kamar'},
        {id: 'shift', title: 'Shift'},
        {id: 'status_kamar', title: 'Status'},
        {id: 'waktu_masuk', title: 'Waktu Masuk'},
        {id: 'waktu_keluar', title: 'Waktu Keluar'},
        {id: 'petugas', title: 'Petugas'},
        {id: 'keterangan', title: 'Keterangan'}
      ]
    });

    await csv.writeRecords(hasil.rows);
    res.download(jalur, namaFile, () => fs.unlink(jalur, () => {}));
  } catch (err) {
    console.error(err);
    res.redirect('/spv');
  }
});

// ================= RUTE LOGOUT =================
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Jalankan Server
app.listen(PORT, () => console.log(`✅ Server berjalan di port ${PORT}`));
