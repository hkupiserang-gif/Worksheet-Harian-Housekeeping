const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Konfigurasi koneksi database (sudah pas untuk Railway)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Cek koneksi database
pool.connect((err, client, done) => {
  if (err) {
    console.error('❌ Gagal terhubung ke database:', err.message);
  } else {
    console.log('✅ Berhasil terhubung ke database PostgreSQL');
    done();
  }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Penyimpanan sesi sederhana
let sesi = {};

// Buat tabel dan data awal
async function buatTabel() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pengguna (
        id SERIAL PRIMARY KEY,
        nama TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        sandi TEXT NOT NULL,
        peran TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tugas (
        id SERIAL PRIMARY KEY,
        tanggal DATE NOT NULL,
        kamar TEXT NOT NULL,
        petugas TEXT NOT NULL,
        status_awal TEXT NOT NULL,
        selesai BOOLEAN DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS laporan (
        id SERIAL PRIMARY KEY,
        tanggal DATE NOT NULL,
        kamar TEXT NOT NULL,
        status TEXT NOT NULL,
        jam_masuk TEXT,
        jam_keluar TEXT,
        keterangan TEXT,
        petugas TEXT NOT NULL,
        waktu TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Masukkan akun awal jika belum ada
    const cekAdmin = await pool.query("SELECT * FROM pengguna WHERE username = 'admin'");
    if (cekAdmin.rows.length === 0) {
      const hashAdmin = await bcrypt.hash('admin123', 10);
      await pool.query(
        "INSERT INTO pengguna (nama, username, sandi, peran) VALUES ($1, $2, $3, $4)",
        ['Supervisor', 'admin', hashAdmin, 'SPV']
      );
      console.log('✅ Akun admin berhasil dibuat');
    }

    const cekRA = await pool.query("SELECT * FROM pengguna WHERE username = 'ra'");
    if (cekRA.rows.length === 0) {
      const hashRA = await bcrypt.hash('ra123', 10);
      await pool.query(
        "INSERT INTO pengguna (nama, username, sandi, peran) VALUES ($1, $2, $3, $4)",
        ['Petugas Kamar', 'ra', hashRA, 'RA']
      );
      console.log('✅ Akun petugas berhasil dibuat');
    }

    console.log('✅ Semua tabel siap digunakan');
  } catch (err) {
    console.error('❌ Kesalahan saat membuat tabel:', err.message);
  }
}

// Jalankan fungsi pembuatan tabel
buatTabel();

// Halaman Login
app.get('/', (req, res) => res.render('login', { pesan: null }));

app.post('/login', async (req, res) => {
  try {
    const { username, sandi } = req.body;
    const hasil = await pool.query("SELECT * FROM pengguna WHERE username = $1", [username]);

    if (hasil.rows.length === 0) {
      return res.render('login', { pesan: 'Username tidak ditemukan' });
    }

    const cocok = await bcrypt.compare(sandi, hasil.rows[0].sandi);
    if (!cocok) {
      return res.render('login', { pesan: 'Kata sandi salah' });
    }

    sesi.user = hasil.rows[0];
    return sesi.user.peran === 'SPV' ? res.redirect('/spv') : res.redirect('/ra');
  } catch (err) {
    console.error('❌ Kesalahan login:', err.message);
    return res.render('login', { pesan: 'Terjadi kesalahan, coba lagi' });
  }
});

// Halaman Petugas Kamar
app.get('/ra', async (req, res) => {
  if (!sesi.user) return res.redirect('/');
  try {
    const hariIni = new Date().toISOString().split('T')[0];
    const hasilTugas = await pool.query(
      "SELECT * FROM tugas WHERE tanggal = $1 AND petugas = $2 ORDER BY kamar",
      [hariIni, sesi.user.nama]
    );
    res.render('ra', { user: sesi.user, tugas: hasilTugas.rows });
  } catch (err) {
    console.error('❌ Kesalahan memuat halaman RA:', err.message);
    res.redirect('/');
  }
});

app.post('/simpan', async (req, res) => {
  if (!sesi.user) return res.redirect('/');
  try {
    const { tanggal, kamar, status, masuk, keluar, keterangan } = req.body;
    await pool.query(
      `INSERT INTO laporan (tanggal, kamar, status, jam_masuk, jam_keluar, keterangan, petugas)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tanggal, kamar, status, masuk, keluar, keterangan || '', sesi.user.nama]
    );
    await pool.query(
      "UPDATE tugas SET selesai = true WHERE tanggal = $1 AND kamar = $2 AND petugas = $3",
      [tanggal, kamar, sesi.user.nama]
    );
    res.redirect('/ra');
  } catch (err) {
    console.error('❌ Kesalahan menyimpan laporan:', err.message);
    res.redirect('/ra');
  }
});

// Halaman Supervisor
app.get('/spv', async (req, res) => {
  if (!sesi.user || sesi.user.peran !== 'SPV') return res.redirect('/');
  try {
    const hariIni = new Date().toISOString().split('T')[0];
    const hasilTugas = await pool.query(
      "SELECT * FROM tugas WHERE tanggal = $1 ORDER BY kamar",
      [hariIni]
    );
    res.render('spv', { tugas: hasilTugas.rows });
  } catch (err) {
    console.error('❌ Kesalahan memuat halaman SPV:', err.message);
    res.redirect('/');
  }
});

app.post('/tambah-tugas', async (req, res) => {
  if (!sesi.user || sesi.user.peran !== 'SPV') return res.redirect('/');
  try {
    const { tanggal, kamar, petugas, status } = req.body;
    await pool.query(
      "INSERT INTO tugas (tanggal, kamar, petugas, status_awal) VALUES ($1, $2, $3, $4)",
      [tanggal, kamar, petugas, status]
    );
    res.redirect('/spv');
  } catch (err) {
    console.error('❌ Kesalahan menambah tugas:', err.message);
    res.redirect('/spv');
  }
});

// Unduh laporan ke CSV
app.get('/unduh', async (req, res) => {
  if (!sesi.user || sesi.user.peran !== 'SPV') return res.redirect('/');
  try {
    const hasilLaporan = await pool.query("SELECT * FROM laporan ORDER BY waktu DESC");
    const csvPath = `/tmp/laporan-${Date.now()}.csv`;

    const csvTulis = createCsvWriter({
      path: csvPath,
      header: [
        { id: 'tanggal', title: 'Tanggal' },
        { id: 'kamar', title: 'Nomor Kamar' },
        { id: 'status', title: 'Status Kamar' },
        { id: 'jam_masuk', title: 'Jam Mulai' },
        { id: 'jam_keluar', title: 'Jam Selesai' },
        { id: 'keterangan', title: 'Keterangan' },
        { id: 'petugas', title: 'Nama Petugas' },
        { id: 'waktu', title: 'Waktu Input' }
      ]
    });

    await csvTulis.writeRecords(hasilLaporan.rows);
    res.download(csvPath, `laporan-kamar-${new Date().toISOString().slice(0, 10)}.csv`);
  } catch (err) {
    console.error('❌ Kesalahan mengunduh laporan:', err.message);
    res.redirect('/spv');
  }
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port: ${PORT}`);
});
