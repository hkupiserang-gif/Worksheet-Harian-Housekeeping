const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Konfigurasi Database PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Konfigurasi Aplikasi
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'hotel-housekeeping-system-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 }
}));

// Rute Halaman Login
app.get('/', (req, res) => {
  if (req.session.user) {
    if (req.session.user.peran === 'SPV') return res.redirect('/spv');
    if (req.session.user.peran === 'RA') return res.redirect('/ra');
    if (req.session.user.peran === 'OT') return res.redirect('/ot');
  }
  res.render('login', { pesan: null });
});

// Proses Login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hasil = await pool.query("SELECT * FROM pengguna WHERE username = $1", [username]);
    const pengguna = hasil.rows[0];

    if (pengguna && await bcrypt.compare(password, pengguna.sandi)) {
      req.session.user = pengguna;
      if (pengguna.peran === 'SPV') return res.redirect('/spv');
      if (pengguna.peran === 'RA') return res.redirect('/ra');
      if (pengguna.peran === 'OT') return res.redirect('/ot');
    }
    res.render('login', { pesan: '❌ Username atau kata sandi salah!' });
  } catch (err) {
    console.error(err);
    res.render('login', { pesan: '❌ Terjadi kesalahan sistem, coba lagi nanti.' });
  }
});

// Rute Halaman Supervisor
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

// Rute Halaman Room Attendant
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

// Simpan Laporan Pekerjaan
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

    const status_kamar = `${status_fo?'FO ':''}${status_hk?'HK ':''}${status_out?'OUT':''}`.trim() || 'HK';

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

// Rute Halaman Order Taker
app.get('/ot', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'OT') return res.redirect('/');
  res.render('ot', { user: req.session.user });
});

// Unduh Laporan Excel
app.get('/unduh', async (req, res) => {
  if (!req.session.user || req.session.user.peran !== 'SPV') return res.redirect('/');
  try {
    const hasil = await pool.query("SELECT * FROM laporan ORDER BY tanggal DESC, nomor_kamar ASC");
    const namaFile = `Laporan_Control_Sheet_${new Date().toISOString().slice(0,10)}.csv`;
    const jalurFile = `/tmp/${namaFile}`;

    const csvPenulis = createCsvWriter({
      path: jalurFile,
      header: [
        {id: 'no', title: 'NO'},
        {id: 'tanggal', title: 'DATE'},
        {id: 'lantai_bagian', title: 'FLOOR/SECTION'},
        {id: 'shift', title: 'SHIFT'},
        {id: 'nomor_kamar', title: 'NO OF ROOM'},
        {id: 'fo', title: 'FO'},
        {id: 'hk', title: 'HK'},
        {id: 'out', title: 'OUT'},
        {id: 'waktu_masuk', title: 'TIME IN'},
        {id: 'waktu_keluar', title: 'TIME OUT'},
        {id: 'sheet_double_in', title: 'SHEET DOUBLE IN'},
        {id: 'sheet_double_out', title: 'SHEET DOUBLE OUT'},
        {id: 'sheet_single_in', title: 'SHEET SINGLE IN'},
        {id: 'sheet_single_out', title: 'SHEET SINGLE OUT'},
        {id: 'duvet_cover_in', title: 'DUVET COVER IN'},
        {id: 'duvet_cover_out', title: 'DUVET COVER OUT'},
        {id: 'duvet_single_in', title: 'DUVET SINGLE IN'},
        {id: 'duvet_single_out', title: 'DUVET SINGLE OUT'},
        {id: 'bath_towel_in', title: 'BATH TOWEL IN'},
        {id: 'bath_towel_out', title: 'BATH TOWEL OUT'},
        {id: 'hand_towel_in', title: 'HAND TOWEL IN'},
        {id: 'hand_towel_out', title: 'HAND TOWEL OUT'},
        {id: 'bath_mat_in', title: 'BATH MAT IN'},
        {id: 'bath_mat_out', title: 'BATH MAT OUT'},
        {id: 'pillow_case_in', title: 'PILLOW CASE IN'},
        {id: 'pillow_case_out', title: 'PILLOW CASE OUT'},
        {id: 'tissue_roll', title: 'TISSUE ROLL'},
        {id: 'hand_soap', title: 'HAND SOAP'},
        {id: 'shampoo', title: 'SHAMPOO'},
        {id: 'shower_gel', title: 'SHOWER GEL'},
        {id: 'tooth_brush', title: 'TOOTH BRUSH'},
        {id: 'tooth_paste', title: 'TOOTH PASTE'},
        {id: 'shower_cap', title: 'SHOWER CAP'},
        {id: 'slipper', title: 'SLIPPER'},
        {id: 'laundry_bag', title: 'LAUNDRY BAG'},
        {id: 'laundry_list', title: 'LAUNDRY LIST'},
        {id: 'memo_pad', title: 'MEMO PAD'},
        {id: 'pen', title: 'PEN'},
        {id: 'plastic_bin', title: 'PLASTIC BIN'},
        {id: 'coffee', title: 'COFFEE'},
        {id: 'sugar', title: 'SUGAR'},
        {id: 'tea', title: 'TEA'},
        {id: 'creamer', title: 'CREAMER'},
        {id: 'mineral_water', title: 'MINERAL WATER'},
        {id: 'keterangan', title: 'REMARKS'},
        {id: 'petugas', title: 'ROOM ATTENDANT'}
      ]
    });

    const dataBaris = hasil.rows.map((r, i) => ({
      no: i + 1,
      tanggal: r.tanggal,
      lantai_bagian: r.lantai_bagian || '',
      shift: r.shift,
      nomor_kamar: r.nomor_kamar,
      fo: r.status_kamar.includes('FO') ? '✔' : '',
      hk: r.status_kamar.includes('HK') ? '✔' : '',
      out: r.status_kamar.includes('OUT') ? '✔' : '',
      waktu_masuk: r.waktu_masuk,
      waktu_keluar: r.waktu_keluar,
      sheet_double_in: r.sheet_double_in ? '✔' : '',
      sheet_double_out: r.sheet_double_out ? '✔' : '',
      sheet_single_in: r.sheet_single_in ? '✔' : '',
      sheet_single_out: r.sheet_single_out ? '✔' : '',
      duvet_cover_in: r.duvet_cover_in ? '✔' : '',
      duvet_cover_out: r.duvet_cover_out ? '✔' : '',
      duvet_single_in: r.duvet_single_in ? '✔' : '',
      duvet_single_out: r.duvet_single_out ? '✔' : '',
      bath_towel_in: r.bath_towel_in ? '✔' : '',
      bath_towel_out: r.bath_towel_out ? '✔' : '',
      hand_towel_in: r.hand_towel_in ? '✔' : '',
      hand_towel_out: r.hand_towel_out ? '✔' : '',
      bath_mat_in: r.bath_mat_in ? '✔' : '',
      bath_mat_out: r.bath_mat_out ? '✔' : '',
      pillow_case_in: r.pillow_case_in ? '✔' : '',
      pillow_case_out: r.pillow_case_out ? '✔' : '',
      tissue_roll: r.tissue_roll ? '✔' : '',
      hand_soap: r.hand_soap ? '✔' : '',
      shampoo: r.shampoo ? '✔' : '',
      shower_gel: r.shower_gel ? '✔' : '',
      tooth_brush: r.tooth_brush ? '✔' : '',
      tooth_paste: r.tooth_paste ? '✔' : '',
      shower_cap: r.shower_cap ? '✔' : '',
      slipper: r.slipper ? '✔' : '',
      laundry_bag: r.laundry_bag ? '✔' : '',
      laundry_list: r.laundry_list ? '✔' : '',
      memo_pad: r.memo_pad ? '✔' : '',
      pen: r.pen ? '✔' : '',
      plastic_bin: r.plastic_bin ? '✔' : '',
      coffee: r.coffee ? '✔' : '',
      sugar: r.sugar ? '✔' : '',
      tea: r.tea ? '✔' : '',
      creamer: r.creamer ? '✔' : '',
      mineral_water: r.mineral_water ? '✔' : '',
      keterangan: r.keterangan || '',
      petugas: r.petugas
    }));

    await csvPenulis.writeRecords(dataBaris);
    res.download(jalurFile, namaFile, (err) => {
      if (err) console.error(err);
      fs.unlink(jalurFile, () => {});
    });
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
app.listen(PORT, () => {
  console.log(`Server berjalan pada port ${PORT}`);
});
