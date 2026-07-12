const fs = require('fs');
const path = require('path');

// ============================================
// TAMBAHKAN DI ATAS app.listen / SETELAH IMPORT
// ============================================
const LOGO_PATH = path.join(__dirname, 'public', 'logo.png'); // Sesuaikan path logo

// ============================================
// GANTI SELURUH ENDPOINT /unduh-excel DENGAN KODE DI BAWAH
// ============================================

app.get('/unduh-excel', async (req, res) => {
  try {
    const tanggal = req.query.tanggal || getTanggalWIB();
    const raFilter = req.query.ra || null;

    console.log('📥 Download Excel request:', { tanggal, raFilter });

    // Ambil daftar RA yang punya tugas di tanggal ini
    const daftarRA = await new Promise((resolve, reject) => {
      let query = `
        SELECT DISTINCT petugas 
        FROM tugas 
        WHERE tanggal = ? AND petugas != '' AND sudah_dibagikan = 1 
      `;
      const params = [tanggal];
      if (raFilter) {
        query += ` AND petugas = ?`;
        params.push(raFilter);
      }
      query += ` ORDER BY petugas`;

      db.all(query, params, (err, rows) => {
        if (err) {
          console.error('❌ Error ambil daftar RA:', err.message);
          return reject(err);
        }
        console.log('📊 RA ditemukan:', rows.length, rows.map(r => r.petugas));
        resolve(rows.map(r => r.petugas));
      });
    });

    if (daftarRA.length === 0) {
      return res.send('❌ Tidak ada RA yang memiliki tugas untuk tanggal ini');
    }

    const workbook = new ExcelJS.Workbook();

    // Build SQL selects
    const bathRoomFields = [
      'sheet_twin', 'sheet_king', 'duvet_twin', 'duvet_king',
      'bath_towel', 'hand_towel', 'bath_mat', 'pillow_case'
    ];
    const bathRoomSelects = bathRoomFields.map(f => 'IFNULL(l.' + f + ', 0) AS ' + f + '_in').join(', ');

    const guestSuppliesFields = [
      'shower_cap', 'dental_kit', 'laundry_bag', 'laundry_list',
      'note_pad', 'pensil', 'tissue_facial', 'tissue_roll',
      'coffee', 'sugar', 'tea', 'creamer', 'mineral',
      'cotton_bud', 'slipper', 'shaving_kit',
      'stirer', 'coster', 'poly_bag_kecil', 'poly_bag_besar'
    ];
    const guestSuppliesSelects = guestSuppliesFields.map(f => 'IFNULL(l.' + f + ', 0) AS ' + f).join(', ');

    // Tambahkan logo jika ada
    let logoImageId = null;
    if (fs.existsSync(LOGO_PATH)) {
      const logoBuffer = fs.readFileSync(LOGO_PATH);
      logoImageId = workbook.addImage({
        buffer: logoBuffer,
        extension: 'png',
      });
    }

    // Proses setiap RA
    for (let i = 0; i < daftarRA.length; i++) {
      const ra = daftarRA[i];
      const sheet = workbook.addWorksheet(ra);

      // === SET COLUMN WIDTHS ===
      const colWidths = {
        'A': 4, 'B': 10, 'C': 6, 'D': 6, 'E': 6, 'F': 6, 'G': 6,
        'H': 6, 'I': 6, 'J': 6, 'K': 6, 'L': 6, 'M': 6, 'N': 6, 'O': 6,
        'P': 12, 'Q': 12, 'R': 12, 'S': 12, 'T': 12, 'U': 12, 'V': 12,
        'W': 12, 'X': 12, 'Y': 12, 'Z': 12, 'AA': 12, 'AB': 12, 'AC': 12,
        'AD': 12, 'AE': 12, 'AF': 12, 'AG': 12, 'AH': 12, 'AI': 12, 'AJ': 12
      };
      Object.keys(colWidths).forEach(col => {
        sheet.getColumn(col).width = colWidths[col];
      });

      // Set row heights
      sheet.getRow(1).height = 45; // Logo row
      sheet.getRow(2).height = 18;
      sheet.getRow(3).height = 18;
      sheet.getRow(4).height = 22;
      sheet.getRow(5).height = 22;
      sheet.getRow(6).height = 35;
      sheet.getRow(7).height = 35;

      // === LOGO (POJOK KIRI ATAS) ===
      if (logoImageId !== null) {
        sheet.addImage(logoImageId, {
          tl: { col: 0, row: 0 },
          ext: { width: 140, height: 50 },
          editAs: 'oneCell'
        });
      }

      // === ROW 1: TITLE ===
      sheet.getCell('C1').value = 'ROOMBOY CONTROL SHEET';
      sheet.getCell('C1').font = { bold: true, size: 14, name: 'Arial' };
      sheet.getCell('C1').alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.mergeCells('C1:AJ1');

      // === ROW 3: INFO HEADER ===
      sheet.getCell('A3').value = 'DATE:';
      sheet.getCell('A3').font = { bold: true, size: 10, name: 'Arial' };
      sheet.getCell('B3').value = tanggal;
      sheet.getCell('B3').font = { size: 10, name: 'Arial' };

      sheet.getCell('D3').value = 'SHIFT:';
      sheet.getCell('D3').font = { bold: true, size: 10, name: 'Arial' };
      sheet.getCell('E3').value = 'Morning';
      sheet.getCell('E3').font = { size: 10, name: 'Arial' };

      sheet.getCell('G3').value = 'FLOOR/SECTION:';
      sheet.getCell('G3').font = { bold: true, size: 10, name: 'Arial' };
      sheet.getCell('I3').font = { size: 10, name: 'Arial' };

      // === ROW 4-6: MAIN HEADERS ===
      // Merge utama
      sheet.mergeCells('A4:A6');   // NO
      sheet.mergeCells('B4:B6');   // NO OF ROOM
      sheet.mergeCells('C4:E5');   // ROOM STATUS
      sheet.mergeCells('F4:G5');   // TIME
      sheet.mergeCells('H4:O5');   // LINEN
      sheet.mergeCells('P4:AJ5');  // GUEST SUPPLIES & AMENITIES

      // NO
      sheet.getCell('A4').value = 'NO';
      sheet.getCell('A4').font = { bold: true, size: 9, name: 'Arial' };
      sheet.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
      sheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      setBorder(sheet.getCell('A4'));

      // NO OF ROOM
      sheet.getCell('B4').value = 'NO OF ROOM';
      sheet.getCell('B4').font = { bold: true, size: 9, name: 'Arial' };
      sheet.getCell('B4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
      sheet.getCell('B4').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      setBorder(sheet.getCell('B4'));

      // ROOM STATUS
      sheet.getCell('C4').value = 'ROOM STATUS';
      sheet.getCell('C4').font = { bold: true, size: 9, name: 'Arial' };
      sheet.getCell('C4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
      sheet.getCell('C4').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      setBorder(sheet.getCell('C4'));

      // TIME
      sheet.getCell('F4').value = 'TIME';
      sheet.getCell('F4').font = { bold: true, size: 9, name: 'Arial' };
      sheet.getCell('F4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
      sheet.getCell('F4').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      setBorder(sheet.getCell('F4'));

      // LINEN
      sheet.getCell('H4').value = 'LINEN';
      sheet.getCell('H4').font = { bold: true, size: 9, name: 'Arial' };
      sheet.getCell('H4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
      sheet.getCell('H4').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      setBorder(sheet.getCell('H4'));

      // GUEST SUPPLIES & AMENITIES
      sheet.getCell('P4').value = 'GUEST SUPPLIES & AMENITIES';
      sheet.getCell('P4').font = { bold: true, size: 9, name: 'Arial' };
      sheet.getCell('P4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
      sheet.getCell('P4').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      setBorder(sheet.getCell('P4'));

      // === ROW 6: SUB-HEADERS ===
      // ROOM STATUS sub
      sheet.getCell('C6').value = 'FO';
      sheet.getCell('D6').value = 'HK';
      sheet.getCell('E6').value = 'HK';
      ['C6', 'D6', 'E6'].forEach(ref => {
        const cell = sheet.getCell(ref);
        cell.font = { bold: true, size: 9, name: 'Arial' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        setBorder(cell);
      });

      // TIME sub
      sheet.getCell('F6').value = 'IN';
      sheet.getCell('G6').value = 'OUT';
      ['F6', 'G6'].forEach(ref => {
        const cell = sheet.getCell(ref);
        cell.font = { bold: true, size: 9, name: 'Arial' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        setBorder(cell);
      });

      // LINEN sub-headers
      const linenSub = [
        { col: 'H', text: 'SHEET\nDOUBLE' },
        { col: 'I', text: 'SHEET\nSINGLE' },
        { col: 'J', text: 'DUVET\nCOVER' },
        { col: 'K', text: 'DUVET\nSINGLE' },
        { col: 'L', text: 'BATH\nTOWEL' },
        { col: 'M', text: 'HAND\nTOWEL' },
        { col: 'N', text: 'BATH\nMAT' },
        { col: 'O', text: 'PILLOW\nCASE' }
      ];
      linenSub.forEach(h => {
        const cell = sheet.getCell(h.col + '6');
        cell.value = h.text;
        cell.font = { bold: true, size: 8, name: 'Arial' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        setBorder(cell);
      });

      // GUEST SUPPLIES sub-headers (merge)
      sheet.mergeCells('P6:Q6');  // BATH ROOM
      sheet.mergeCells('R6:V6');  // BED ROOM
      sheet.mergeCells('W6:AJ6'); // CONDIMEN

      sheet.getCell('P6').value = 'BATH ROOM';
      sheet.getCell('R6').value = 'BED ROOM';
      sheet.getCell('W6').value = 'CONDIMEN';

      ['P6', 'R6', 'W6'].forEach(cellRef => {
        const cell = sheet.getCell(cellRef);
        cell.font = { bold: true, size: 8, name: 'Arial' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        setBorder(cell);
      });

      // === ROW 7: IN/OUT LABELS & ITEM NAMES ===
      // IN/OUT labels for LINEN
      const inOutCols = ['H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
      inOutCols.forEach((col, idx) => {
        // IN label
        const cellIn = sheet.getCell(col + '7');
        cellIn.value = 'IN';
        cellIn.font = { bold: true, size: 8, name: 'Arial' };
        cellIn.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
        cellIn.alignment = { horizontal: 'center', vertical: 'middle' };
        setBorder(cellIn);

        // OUT label (di baris 7 juga, tapi nanti data di baris berikutnya)
        // Karena struktur 2 baris per kamar, kita taruh label IN di baris 7
        // Dan baris data IN di baris 8, OUT di baris 9
      });

      // GUEST SUPPLIES item names
      const row7Items = [
        { col: 'P', text: 'SHOWER CAP' },
        { col: 'Q', text: 'DENTAL KIT' },
        { col: 'R', text: 'LAUNDRY BAG' },
        { col: 'S', text: 'LAUNDRY LIST' },
        { col: 'T', text: 'MEMO PAD' },
        { col: 'U', text: 'PENCIL' },
        { col: 'V', text: 'GUEST COMMENT' },
        { col: 'W', text: 'TISSUE ROLL' },
        { col: 'X', text: 'HAND SOAP' },
        { col: 'Y', text: 'SHAMPOO' },
        { col: 'Z', text: 'SHOWER GEL' },
        { col: 'AA', text: 'TOOTH BRUSH' },
        { col: 'AB', text: 'STERER' },
        { col: 'AC', text: 'SLIPPER' },
        { col: 'AD', text: 'COFFEE' },
        { col: 'AE', text: 'SUGAR' },
        { col: 'AF', text: 'TEA' },
        { col: 'AG', text: 'CREAMER' },
        { col: 'AH', text: 'MINERAL WATER' },
        { col: 'AI', text: 'PLASTIC BIN' },
        { col: 'AJ', text: 'TISUE' }
      ];

      row7Items.forEach(item => {
        const cell = sheet.getCell(item.col + '7');
        cell.value = item.text;
        cell.font = { bold: true, size: 8, name: 'Arial' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        setBorder(cell);
      });

      // Apply borders to all header cells in row 4-7
      for (let row = 4; row <= 7; row++) {
        for (let colCode = 'A'.charCodeAt(0); colCode <= 'J'.charCodeAt(0); colCode++) {
          const cell = sheet.getCell(String.fromCharCode(colCode) + row);
          setBorder(cell);
        }
      }

      // Query data kamar untuk RA ini
      const dataRA = await new Promise((resolve, reject) => {
        const query = `
          SELECT t.petugas, t.kamar, 
                 t.status_awal AS status_fo,
                 t.status_hk_in,
                 t.status_hk_out,
                 t.selesai,
                 k.lantai,
                 IFNULL(l.waktu_masuk, '-') AS waktu_masuk,
                 IFNULL(l.waktu_keluar, '-') AS waktu_keluar,
                 ${bathRoomSelects},
                 ${guestSuppliesSelects}
          FROM tugas t
          JOIN kamar k ON t.kamar = k.nomor_kamar
          LEFT JOIN laporan l ON t.tanggal = l.tanggal AND t.kamar = l.nomor_kamar
          WHERE t.tanggal = ? AND t.petugas = ? AND t.sudah_dibagikan = 1
          ORDER BY t.kamar
        `;
        db.all(query, [tanggal, ra], (err, rows) => {
          if (err) {
            console.error('❌ Error query data RA ' + ra + ':', err.message);
            return reject(err);
          }
          console.log('📊 RA ' + ra + ': ' + rows.length + ' kamar');
          resolve(rows);
        });
      });

      if (dataRA.length === 0) continue;

      // Update lantai
      sheet.getCell('I3').value = (dataRA[0] && dataRA[0].lantai) ? dataRA[0].lantai : '-';

      // === DATA ROWS (mulai baris 8) ===
      let baris = 8;
      let no = 1;
      dataRA.forEach((data) => {
        const outBaris = baris + 1;
        sheet.getRow(baris).height = 18;
        sheet.getRow(outBaris).height = 18;

        // NO (merge 2 baris)
        sheet.getCell('A' + baris).value = no++;
        sheet.getCell('A' + baris).alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getCell('A' + baris).font = { size: 9, name: 'Arial' };
        setBorder(sheet.getCell('A' + baris));
        setBorder(sheet.getCell('A' + outBaris));
        sheet.mergeCells('A' + baris + ':A' + outBaris);

        // ROOM (merge 2 baris)
        sheet.getCell('B' + baris).value = data.kamar || '';
        sheet.getCell('B' + baris).alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getCell('B' + baris).font = { size: 9, name: 'Arial' };
        setBorder(sheet.getCell('B' + baris));
        setBorder(sheet.getCell('B' + outBaris));
        sheet.mergeCells('B' + baris + ':B' + outBaris);

        // FO (merge 2 baris)
        sheet.getCell('C' + baris).value = data.status_fo || '';
        sheet.getCell('C' + baris).alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getCell('C' + baris).font = { size: 9, name: 'Arial' };
        setBorder(sheet.getCell('C' + baris));
        setBorder(sheet.getCell('C' + outBaris));
        sheet.mergeCells('C' + baris + ':C' + outBaris);

        // HK IN (merge 2 baris)
        let statusHKin = data.status_hk_in || '';
        if (!statusHKin) {
          if (data.status_fo === 'VD' || data.status_fo === 'ED') statusHKin = 'VD';
          else if (data.status_fo === 'VCU') statusHKin = 'VCU';
          else if (data.status_fo === 'OD') statusHKin = 'OD';
        }
        sheet.getCell('D' + baris).value = statusHKin;
        sheet.getCell('D' + baris).alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getCell('D' + baris).font = { size: 9, name: 'Arial' };
        setBorder(sheet.getCell('D' + baris));
        setBorder(sheet.getCell('D' + outBaris));
        sheet.mergeCells('D' + baris + ':D' + outBaris);

        // HK OUT (merge 2 baris)
        let statusHKout = data.status_hk_out || '';
        if (!statusHKout && data.selesai === 1) {
          if (statusHKin === 'VD' || statusHKin === 'VCU' || data.status_fo === 'ED') statusHKout = 'VC';
          else if (statusHKin === 'OD') statusHKout = 'OC';
        }
        sheet.getCell('E' + baris).value = statusHKout;
        sheet.getCell('E' + baris).alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getCell('E' + baris).font = { size: 9, name: 'Arial' };
        setBorder(sheet.getCell('E' + baris));
        setBorder(sheet.getCell('E' + outBaris));
        sheet.mergeCells('E' + baris + ':E' + outBaris);

        // TIME IN (merge 2 baris)
        sheet.getCell('F' + baris).value = data.waktu_masuk !== '-' ? data.waktu_masuk : '';
        sheet.getCell('F' + baris).alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getCell('F' + baris).font = { size: 9, name: 'Arial' };
        setBorder(sheet.getCell('F' + baris));
        setBorder(sheet.getCell('F' + outBaris));
        sheet.mergeCells('F' + baris + ':F' + outBaris);

        // TIME OUT (merge 2 baris)
        sheet.getCell('G' + baris).value = data.waktu_keluar !== '-' ? data.waktu_keluar : '';
        sheet.getCell('G' + baris).alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getCell('G' + baris).font = { size: 9, name: 'Arial' };
        setBorder(sheet.getCell('G' + baris));
        setBorder(sheet.getCell('G' + outBaris));
        sheet.mergeCells('G' + baris + ':G' + outBaris);

        // === LINEN (IN = OUT, angka sama) ===
        const linenValues = [
          data.sheet_king_in || 0,   // H - SHEET DOUBLE
          data.sheet_twin_in || 0,   // I - SHEET SINGLE
          data.duvet_king_in || 0,   // J - DUVET COVER
          data.duvet_twin_in || 0,   // K - DUVET SINGLE
          data.bath_towel_in || 0,   // L - BATH TOWEL
          data.hand_towel_in || 0,   // M - HAND TOWEL
          data.bath_mat_in || 0,     // N - BATH MAT
          data.pillow_case_in || 0   // O - PILLOW CASE
        ];

        // IN row
        const linenCols = ['H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
        linenCols.forEach((col, idx) => {
          const cell = sheet.getCell(col + baris);
          cell.value = linenValues[idx];
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { size: 9, name: 'Arial' };
          setBorder(cell);
        });

        // OUT row
        linenCols.forEach((col, idx) => {
          const cell = sheet.getCell(col + outBaris);
          cell.value = linenValues[idx];
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { size: 9, name: 'Arial' };
          setBorder(cell);
        });

        // === GUEST SUPPLIES & AMENITIES (1 baris, merge ke OUT) ===
        const guestCells = [
          { col: 'P', val: data.shower_cap || 0 },
          { col: 'Q', val: data.dental_kit || 0 },
          { col: 'R', val: data.laundry_bag || 0 },
          { col: 'S', val: data.laundry_list || 0 },
          { col: 'T', val: data.note_pad || 0 },
          { col: 'U', val: data.pensil || 0 },
          { col: 'V', val: '' }, // GUEST COMMENT - tidak ada di DB
          { col: 'W', val: data.tissue_roll || 0 },
          { col: 'X', val: data.tissue_facial || 0 },
          { col: 'Y', val: data.cotton_bud || 0 },
          { col: 'Z', val: data.shower_cap || 0 }, // SHAMPOO -> mapping ke shower_cap (atau sesuaikan)
          { col: 'AA', val: data.dental_kit || 0 }, // TOOTH BRUSH -> mapping ke dental_kit
          { col: 'AB', val: data.stirer || 0 },
          { col: 'AC', val: data.slipper || 0 },
          { col: 'AD', val: data.coffee || 0 },
          { col: 'AE', val: data.sugar || 0 },
          { col: 'AF', val: data.tea || 0 },
          { col: 'AG', val: data.creamer || 0 },
          { col: 'AH', val: data.mineral || 0 },
          { col: 'AI', val: data.poly_bag_kecil || 0 },
          { col: 'AJ', val: data.tissue_facial || 0 }
        ];

        guestCells.forEach(g => {
          const cell = sheet.getCell(g.col + baris);
          cell.value = g.val;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { size: 9, name: 'Arial' };
          setBorder(cell);
          setBorder(sheet.getCell(g.col + outBaris));
          try {
            sheet.mergeCells(g.col + baris + ':' + g.col + outBaris);
          } catch(e) {}
        });

        baris += 2;
      });

      // === TOTAL SOILED ROW ===
      const totalRow = baris;
      sheet.getRow(totalRow).height = 20;
      sheet.getCell('A' + totalRow).value = 'TOTAL SOILED:';
      sheet.getCell('A' + totalRow).font = { bold: true, size: 10, name: 'Arial' };
      sheet.mergeCells('A' + totalRow + ':B' + totalRow);
      
      for (let colCode = 'A'.charCodeAt(0); colCode <= 'J'.charCodeAt(0); colCode++) {
        const cell = sheet.getCell(String.fromCharCode(colCode) + totalRow);
        setBorder(cell);
      }

      // Hitung total per kolom linen (H-O)
      const totalLinenCols = ['H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
      totalLinenCols.forEach(col => {
        let sum = 0;
        for (let r = 8; r < totalRow; r += 2) {
          const val = sheet.getCell(col + r).value;
          if (typeof val === 'number') sum += val;
        }
        sheet.getCell(col + totalRow).value = sum;
        sheet.getCell(col + totalRow).font = { bold: true, size: 9, name: 'Arial' };
        sheet.getCell(col + totalRow).alignment = { horizontal: 'center', vertical: 'middle' };
        setBorder(sheet.getCell(col + totalRow));
      });

      // === REMARKS ROW ===
      const remarksRow = totalRow + 1;
      sheet.getRow(remarksRow).height = 18;
      sheet.getCell('A' + remarksRow).value = 'REMARKS';
      sheet.getCell('A' + remarksRow).font = { bold: true, size: 10, name: 'Arial' };
      sheet.mergeCells('A' + remarksRow + ':AJ' + (remarksRow + 2));
      for (let colCode = 'A'.charCodeAt(0); colCode <= 'J'.charCodeAt(0); colCode++) {
        const cell = sheet.getCell(String.fromCharCode(colCode) + remarksRow);
        setBorder(cell);
      }
      // Fill empty borders for merged area
      for (let r = remarksRow; r <= remarksRow + 2; r++) {
        for (let c = 'A'.charCodeAt(0); c <= 'J'.charCodeAt(0); c++) {
          setBorder(sheet.getCell(String.fromCharCode(c) + r));
        }
      }

      // === LEGEND ROWS ===
      const legendStart = remarksRow + 3;
      const legends = [
        ['ED', 'EXPECTED DEPARTURE', 'VC', 'VACANT CLEAN', 'DND', 'DO NOT DISTURB'],
        ['EA', 'EXPECTING ARRIVAL', 'OD', 'OCCUPIED DIRTY', 'HU', 'HOUSE USE'],
        ['VD', 'VACANT DIRTY', 'OC', 'OCCUPIED CLEAN', 'OO', 'OUT OF ORDER'],
        ['VCU', 'VACAN CLEAN UNCHECK', 'ONL', 'OCCUPIED NO LUGAGE', 'SO', 'SLEEP OUT'],
        ['DU', 'DAY USE', 'DL', 'DOUBLE LOCK', '', '']
      ];

      legends.forEach((legend, idx) => {
        const row = legendStart + idx;
        sheet.getCell('C' + row).value = legend[0];
        sheet.getCell('C' + row).font = { bold: true, size: 9, name: 'Arial' };
        sheet.getCell('D' + row).value = legend[1];
        sheet.getCell('D' + row).font = { size: 9, name: 'Arial' };
        sheet.getCell('F' + row).value = legend[2];
        sheet.getCell('F' + row).font = { bold: true, size: 9, name: 'Arial' };
        sheet.getCell('G' + row).value = legend[3];
        sheet.getCell('G' + row).font = { size: 9, name: 'Arial' };
        sheet.getCell('I' + row).value = legend[4];
        sheet.getCell('I' + row).font = { bold: true, size: 9, name: 'Arial' };
        sheet.getCell('J' + row).value = legend[5];
        sheet.getCell('J' + row).font = { size: 9, name: 'Arial' };
      });

      // === PREPARED BY / CHECKED BY ===
      const signRow = legendStart + legends.length + 1;
      sheet.getCell('A' + signRow).value = 'PREPARED BY:';
      sheet.getCell('A' + signRow).font = { bold: true, size: 10, name: 'Arial' };
      sheet.getCell('H' + signRow).value = 'CHECKED BY';
      sheet.getCell('H' + signRow).font = { bold: true, size: 10, name: 'Arial' };
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Roomboy_Control_Sheet_' + tanggal + '.xlsx');
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('❌ Error membuat Excel:', err);
    console.error('❌ Stack:', err.stack);
    res.send('❌ Gagal membuat file Excel: ' + err.message);
  }
});

// Helper function untuk border
function setBorder(cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
  };
}
