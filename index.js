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

// Rute untuk file manifest PWA
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// Pesan notifikasi
app.use((req, res, next) => {
  if (req.query.pesan === 'berhasil') {
    res.locals.pesan = { tipe: 'sukses', teks: '✅ Laporan berhasil disimpan' };
  } else if (req.query.pesan === 'gagal') {
    res.locals.pesan = { tipe: 'error', teks: '❌ Gagal menyimpan data, periksa kembali isian' };
  }
  next();
});

// Fungsi bantu ambil data kamar beserta status pengerjaan
async function ambilDataKamar(tanggal) {
  const semuaKamar = await pool.query("SELECT nomor, lantai, tipe_kamar FROM daftar_kamar ORDER BY nomor");
  const tugasHariIni = await pool.query(`
    SELECT t.kamar, t.status_awal, t.petugas, t.selesai, 
           l.waktu_masuk, l.waktu_keluar, l.linen, l.amenities, l.keterangan
    FROM tugas t
    LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
    WHERE t.tanggal = $1
  `, [tanggal]);

  return semuaKamar.rows.map(k => {
    const tugas = tugasHariIni.rows.find(t => t.kamar === k.nomor);
    let statusProses = 'Belum Ada Tugas';
    if (tugas) {
      if (tugas.selesai) statusProses = '✅ Selesai';
      else if (tugas.waktu_masuk && !tugas.waktu_keluar) statusProses = '⏳ Sedang Dikerjakan';
      else if (tugas.petugas) statusProses = '📝 Belum Dimulai';
    }
    return {
      nomor: k.nomor,
      lantai: k.lantai,
      tipe_kamar: k.tipe_kamar,
      status: tugas?.status_awal || null,
      petugas: tugas?.petugas || '-',
      selesai: tugas?.selesai || false,
      waktuMasuk: tugas?.waktu_masuk || null,
      waktuKeluar: tugas?.waktu_keluar || null,
      linen: tugas?.linen || null,
      amenities: tugas?.amenities || null,
      keterangan: tugas?.keterangan || '',
      statusProses: statusProses
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
    const tugas = await pool.query(`
      SELECT t.*, l.waktu_masuk, l.waktu_keluar, l.linen, l.amenities, l.keterangan
      FROM tugas t
      LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
      WHERE t.tanggal = $1 AND t.petugas = $2
      ORDER BY t.kamar
    `, [hariIni, req.session.user.nama]);
    res.render('ra', { user: req.session.user, tugas: tugas.rows, pesan: res.locals.pesan || null });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// Simpan laporan RA DIPERBAIKI
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

    const shift = 'Morning';
    const status = 'HK';

    // Gabungkan data linen dan amenities menjadi JSON
    const linenData = {
      sheet_double: sheet_double || 0,
      sheet_single: sheet_single || 0,
      duvet_double: duvet_double || 0,
      duvet_single: duvet_single || 0,
      bath_towel: bath_towel || 0,
      hand_towel: hand_towel || 0,
      bath_mat: bath_mat || 0,
      pillow_case: pillow_case || 0
    };

    const amenitiesData = {
      tissue: tissue || 0,
      hand_soap: hand_soap || 0,
      shampoo: shampoo || 0,
      shower_gel: shower_gel || 0,
      tooth_brush: tooth_brush || 0,
      sterilizer: sterilizer || 0,
      shower_cap: shower_cap || 0,
      slipper: slipper || 0,
      laundry_bag: laundry_bag || 0,
      laundry_list: laundry_list || 0,
      memo_pad: memo_pad || 0,
      pencil: pencil || 0,
      plastic_bin: plastic_bin || 0,
      tissue_box: tissue_box || 0,
      coffee: coffee || 0,
      sugar: sugar || 0,
      tea: tea || 0,
      creamer: creamer || 0,
      mineral_water: mineral_water || 0
    };

    // Simpan ke database
    await pool.query(`
      INSERT INTO laporan (
        tanggal, nomor_kamar, shift, status_kamar, waktu_masuk, waktu_keluar,
        linen, amenities, keterangan, petugas
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (tanggal, nomor_kamar) DO UPDATE SET
        waktu_masuk = $5, waktu_keluar = $6, linen = $7, amenities = $8,
        keterangan = $9, petugas = $10
    `, [
      tanggal, kamar, shift, status,
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
    const hasil = await pool.query("SELECT tanggal, nomor_kamar, shift, status_kamar, waktu_masuk, waktu_keluar, linen, amenities, keterangan, petugas FROM laporan ORDER BY tanggal DESC");
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
        {id: 'linen', title: 'Linen Dipakai'},
        {id: 'amenities', title: 'Amenities Dipakai'},
        {id: 'keterangan', title: 'Keterangan'},
        {id: 'petugas', title: 'Petugas'}
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
