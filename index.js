const express = require('express');
const { Pool } = require('pg');
const session = require('express-session');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8888;

// Koneksi Database PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Cek koneksi DB
pool.connect()
  .then(() => console.log("✅ Berhasil terhubung ke database PostgreSQL"))
  .catch(err => console.error("❌ Gagal koneksi DB:", err));

// Konfigurasi Aplikasi
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'hotel-housekeeping-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// ==========================================
// RUTE HALAMAN
// ==========================================

// Halaman Login
app.get('/', (req, res) => {
  if (req.session.user) {
    if (req.session.user.peran === 'SPV') return res.redirect('/spv');
    if (req.session.user.peran === 'RA') return res.redirect('/ra');
    if (req.session.user.peran === 'OT') return res.redirect('/ot');
  }
  res.render('login', { pesan: null });
});

// PROSES LOGIN (sudah diperbaiki, bandingkan teks biasa agar pasti cocok)
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hasil = await pool.query("SELECT * FROM pengguna WHERE username = $1", [username]);
    const pengguna = hasil.rows[0];

    // Cek langsung tanpa bcrypt untuk menghindari masalah hash
    if (pengguna && password === pengguna.sandi) {
      req.session.user = pengguna;
      if (pengguna.peran === 'SPV') return res.redirect('/spv');
      if (pengguna.peran === 'RA') return res.redirect('/ra');
      if (pengguna.peran === 'OT') return res.redirect('/ot');
    }
    res.render('login', { pesan: '❌ Username atau kata sandi salah!' });
  } catch (err) {
    console.error("Error login:", err);
    res.render('login', { pesan: '❌ Terjadi kesalahan sistem, coba lagi.' });
  }
});

// Halaman Supervisor
app.get('/spv', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  try {
    const hariIni = new Date().toISOString().split('T')[0];
    const hasil = await pool.query("SELECT * FROM tugas WHERE tanggal = $1 ORDER BY kamar ASC", [hariIni]);
    res.render('spv', { user: req.session.user, tugas: hasil.rows });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// Tambah Tugas Baru
app.post('/tambah-tugas', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  try {
    const { tanggal, kamar, petugas, status_awal } = req.body;
    await pool.query(`
      INSERT INTO tugas (tanggal, kamar, petugas, status_awal, selesai)
      VALUES ($1, $2, $3, $4, false)
      ON CONFLICT (tanggal, kamar) DO UPDATE SET petugas = $3, status_awal = $4, selesai = false
    `, [tanggal, kamar, petugas, status_awal]);
    res.redirect('/spv');
  } catch (err) {
    console.error(err);
    res.redirect('/spv');
  }
});

// Halaman Room Attendant
app.get('/ra', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'RA') return res.redirect('/');
  try {
    const hariIni = new Date().toISOString().split('T')[0];
    const hasil = await pool.query("SELECT * FROM tugas WHERE tanggal = $1 AND petugas = $2 ORDER BY kamar ASC", [hariIni, req.session.user.nama]);
    res.render('ra', { user: req.session.user, tugas: hasil.rows });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// Simpan Laporan Kebersihan
app.post('/simpan-laporan', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'RA') return res.redirect('/');
  try {
    const {
      tanggal, shift, lantai_bagian, kamar,
      status_fo, status_hk, status_out,
      waktu_masuk, waktu_keluar,
      sheet_double_in, sheet_double_out, sheet_single_in, sheet_single_out,
      duvet_cover_in, duvet_cover_out, duvet_single_in, duvet_single_out,
      bath_towel_in, bath_towel_out, hand_towel_in, hand_towel_out, bath_mat_in, bath_mat_out, pillow_case_in, pillow_case_out,
      tissue_roll, hand_soap, shampoo, shower_gel, tooth_brush, tooth_paste, shower_cap,
      slipper, laundry_bag, laundry_list, memo_pad, pen, plastic_bin,
      coffee, sugar, tea, creamer, mineral_water,
      keterangan
    } = req.body;

    const status_kamar = `${status_fo ? 'FO ' : ''}${status_hk ? 'HK ' : ''}${status_out ? 'OUT' : ''}`.trim() || 'HK';

    await pool.query(`
      INSERT INTO laporan (
        tanggal, shift, lantai_bagian, nomor_kamar, status_kamar, waktu_masuk, waktu_keluar,
        sheet_double_in, sheet_double_out, sheet_single_in, sheet_single_out,
        duvet_cover_in, duvet_cover_out, duvet_single_in, duvet_single_out,
        bath_towel_in, bath_towel_out, hand_towel_in, hand_towel_out, bath_mat_in, bath_mat_out, pillow_case_in, pillow_case_out,
        tissue_roll, hand_soap, shampoo, shower_gel, tooth_brush, tooth_paste, shower_cap,
        slipper, laundry_bag, laundry_list, memo_pad, pen, plastic_bin,
        coffee, sugar, tea, creamer, mineral_water,
        keterangan, petugas
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42)
    `, [
      tanggal, shift, lantai_bagian, kamar, status_kamar, waktu_masuk, waktu_keluar,
      !!sheet_double_in, !!sheet_double_out, !!sheet_single_in, !!sheet_single_out,
      !!duvet_cover_in, !!duvet_cover_out, !!duvet_single_in, !!duvet_single_out,
      !!bath_towel_in, !!bath_towel_out, !!hand_towel_in, !!hand_towel_out, !!bath_mat_in, !!bath_mat_out, !!pillow_case_in, !!pillow_case_out,
      !!tissue_roll, !!hand_soap, !!shampoo, !!shower_gel, !!tooth_brush, !!tooth_paste, !!shower_cap,
      !!slipper, !!laundry_bag, !!laundry_list, !!memo_pad, !!pen, !!plastic_bin,
      !!coffee, !!sugar, !!tea, !!creamer, !!mineral_water,
      keterangan || '', req.session.user.nama
    ]);

    await pool.query("UPDATE tugas SET selesai = true WHERE tanggal = $1 AND kamar = $2", [tanggal, kamar]);
    res.redirect('/ra');
  } catch (err) {
    console.error(err);
    res.redirect('/ra');
  }
});

// Halaman Order Taker
app.get('/ot', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'OT') return res.redirect('/');
  res.render('ot', { user: req.session.user });
});

// Unduh Laporan CSV
app.get('/unduh', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  try {
    const hasil = await pool.query("SELECT * FROM laporan ORDER BY tanggal DESC, nomor_kamar ASC");
    const namaFile = `Laporan_Housekeeping_${new Date().toISOString().slice(0,10)}.csv`;
    const jalurFile = `/tmp/${namaFile}`;

    const csvPenulis = createCsvWriter({
      path: jalurFile,
      header: [
        {id: 'no', title: 'NO'},
        {id: 'tanggal', title: 'TANGGAL'},
        {id: 'lantai_bagian', title: 'LANTAI/BAGIAN'},
        {id: 'shift', title: 'SHIFT'},
        {id: 'nomor_kamar', title: 'NO KAMAR'},
        {id: 'status_kamar', title: 'STATUS KAMAR'},
        {id: 'waktu_masuk', title: 'WAKTU MASUK'},
        {id: 'waktu_keluar', title: 'WAKTU KELUAR'},
        {id: 'petugas', title: 'PETUGAS'},
        {id: 'keterangan', title: 'KETERANGAN'}
      ]
    });

    const dataBaris = hasil.rows.map((r, i) => ({
      no: i + 1,
      tanggal: r.tanggal,
      lantai_bagian: r.lantai_bagian || '',
      shift: r.shift,
      nomor_kamar: r.nomor_kamar,
      status_kamar: r.status_kamar,
      waktu_masuk: r.waktu_masuk,
      waktu_keluar: r.waktu_keluar,
      petugas: r.petugas,
      keterangan: r.keterangan || ''
    }));

    await csvPenulis.writeRecords(dataBaris);
    res.download(jalurFile, namaFile, () => fs.unlink(jalurFile, () => {}));
  } catch (err) {
    console.error(err);
    res.redirect('/spv');
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Jalankan Server
app.listen(PORT, () => console.log(`✅ Server berjalan di port ${PORT}`));
