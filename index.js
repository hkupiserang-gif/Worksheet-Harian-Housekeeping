const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

let sesi = {};

async function buatTabel() {
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
      waktu TIMESTAMP DEFAULT NOW()
    );
  `);
  const cek = await pool.query("SELECT * FROM pengguna WHERE username = 'admin'");
  if (cek.rows.length === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await pool.query("INSERT INTO pengguna (nama, username, sandi, peran) VALUES ($1,$2,$3,$4)", ['Supervisor', 'admin', hash, 'SPV']);
    const hash2 = await bcrypt.hash('ra123', 10);
    await pool.query("INSERT INTO pengguna (nama, username, sandi, peran) VALUES ($1,$2,$3,$4)", ['Petugas', 'ra', hash2, 'RA']);
  }
}
buatTabel();

app.get('/', (req, res) => res.render('login'));

app.post('/login', async (req, res) => {
  const { username, sandi } = req.body;
  const user = await pool.query("SELECT * FROM pengguna WHERE username = $1", [username]);
  if (user.rows.length > 0 && await bcrypt.compare(sandi, user.rows[0].sandi)) {
    sesi.user = user.rows[0];
    return sesi.user.peran === 'SPV' ? res.redirect('/spv') : res.redirect('/ra');
  }
  res.render('login', { pesan: 'Username atau sandi salah!' });
});

app.get('/ra', async (req, res) => {
  if (!sesi.user) return res.redirect('/');
  const hari = new Date().toISOString().split('T')[0];
  const tugas = await pool.query("SELECT * FROM tugas WHERE tanggal = $1 AND petugas = $2", [hari, sesi.user.nama]);
  res.render('ra', { user: sesi.user, tugas: tugas.rows });
});

app.post('/simpan', async (req, res) => {
  const { tanggal, kamar, status, masuk, keluar, keterangan } = req.body;
  await pool.query("INSERT INTO laporan (tanggal, kamar, status, jam_masuk, jam_keluar, keterangan, petugas) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [tanggal, kamar, status, masuk, keluar, keterangan, sesi.user.nama]);
  await pool.query("UPDATE tugas SET selesai = true WHERE tanggal = $1 AND kamar = $2", [tanggal, kamar]);
  res.redirect('/ra');
});

app.get('/spv', async (req, res) => {
  if (!sesi.user || sesi.user.peran !== 'SPV') return res.redirect('/');
  const tugas = await pool.query("SELECT * FROM tugas WHERE tanggal = CURRENT_DATE");
  res.render('spv', { tugas: tugas.rows });
});

app.post('/tambah-tugas', async (req, res) => {
  const { tanggal, kamar, petugas, status } = req.body;
  await pool.query("INSERT INTO tugas (tanggal, kamar, petugas, status_awal) VALUES ($1,$2,$3,$4)", [tanggal, kamar, petugas, status]);
  res.redirect('/spv');
});

app.get('/unduh', async (req, res) => {
  if (!sesi.user || sesi.user.peran !== 'SPV') return res.redirect('/');
  const data = await pool.query("SELECT * FROM laporan ORDER BY waktu DESC");
  const csv = createCsvWriter({
    path: '/tmp/laporan.csv',
    header: [
      {id: 'tanggal', title: 'Tanggal'},
      {id: 'kamar', title: 'Kamar'},
      {id: 'status', title: 'Status'},
      {id: 'jam_masuk', title: 'Jam Masuk'},
      {id: 'jam_keluar', title: 'Jam Keluar'},
      {id: 'keterangan', title: 'Keterangan'},
      {id: 'petugas', title: 'Petugas'}
    ]
  });
  await csv.writeRecords(data.rows);
  res.download('/tmp/laporan.csv', `laporan-${new Date().toISOString().slice(0,10)}.csv`);
});

app.listen(PORT, () => console.log('Jalan di port', PORT));
