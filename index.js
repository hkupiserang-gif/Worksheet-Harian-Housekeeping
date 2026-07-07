// Simpan laporan baru
app.post('/simpan-laporan', async (req, res) => {
  if (!sesi.user) return res.redirect('/');
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

    const status = `${status_fo?'FO ':''}${status_hk?'HK ':''}${status_out?'OUT':''}`.trim();

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
      tanggal, shift, lantai_bagian, kamar, status, waktu_masuk, waktu_keluar,
      !!sheet_double_in, !!sheet_double_out, !!sheet_single_in, !!sheet_single_out,
      !!duvet_cover_in, !!duvet_cover_out, !!duvet_single_in, !!duvet_single_out,
      !!bath_towel_in, !!bath_towel_out, !!hand_towel_in, !!hand_towel_out, !!bath_mat_in, !!bath_mat_out, !!pillow_case_in, !!pillow_case_out,
      !!tissue_roll, !!hand_soap, !!shampoo, !!shower_gel, !!tooth_brush, !!tooth_paste, !!shower_cap,
      !!slipper, !!laundry_bag, !!laundry_list, !!memo_pad, !!pen, !!plastic_bin,
      !!coffee, !!sugar, !!tea, !!creamer, !!mineral_water,
      keterangan || '', sesi.user.nama
    ]);

    await pool.query("UPDATE tugas SET selesai = true WHERE tanggal = $1 AND kamar = $2", [tanggal, kamar]);
    res.redirect('/ra');
  } catch (err) {
    console.error(err);
    res.redirect('/ra');
  }
});

// Unduh Excel sesuai format perusahaan
app.get('/unduh', async (req, res) => {
  if (!sesi.user || sesi.user.peran !== 'SPV') return res.redirect('/');
  try {
    const data = await pool.query("SELECT * FROM laporan ORDER BY tanggal DESC, nomor_kamar ASC");

    const csv = createCsvWriter({
      path: `/tmp/roomboy_control_${Date.now()}.csv`,
      header: [
        {id: 'no', title: 'NO'},
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
        {id: 'keterangan', title: 'REMARKS'}
      ]
    });

    // Ubah nilai true/false jadi ✔ atau kosong agar rapi di Excel
    const baris = data.rows.map((r, i) => ({
      no: i+1,
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
      keterangan: r.keterangan
    }));

    await csv.writeRecords(baris);
    res.download(`/tmp/roomboy_control_${new Date().toISOString().slice(0,10)}.csv`);

  } catch (err) {
    console.error(err);
    res.redirect('/spv');
  }
});
