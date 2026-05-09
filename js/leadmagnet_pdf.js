// === Lead Magnet PDF Generator ===
// Generiert 3 komplette MedAT-Simulationen als PDF aus der leadmagnet_questions Tabelle
// Design angelehnt an das BMS Master Cover (Dark Navy + Gold)

const LeadMagnetPDF = {

  // ===== DESIGN TOKENS (Cover-inspired) =====
  colors: {
    navy:       [26, 26, 46],
    gold:       [245, 197, 66],
    goldDark:   [212, 160, 23],
    white:      [255, 255, 255],
    offWhite:   [245, 240, 232],
    textDark:   [30, 30, 30],
    textMuted:  [100, 100, 110],
    textLight:  [160, 160, 170],
    mint:       [200, 230, 208],
    mintDark:   [109, 184, 138],
    coral:      [245, 166, 142],
    coralDark:  [224, 115, 74],
    lavender:   [228, 218, 240],
    lavenderDark: [155, 127, 196],
    border:     [200, 200, 210],
  },

  // Block color mapping for sections
  blockColors: {
    bms:  { rgb: [245, 197, 66],  hex: '#f5c542', label: 'BMS' },
    tv:   { rgb: [109, 184, 138], hex: '#6db88a', label: 'TV' },
    kff:  { rgb: [155, 127, 196], hex: '#9b7fc4', label: 'KFF' },
    sek:  { rgb: [224, 115, 74],  hex: '#e0734a', label: 'SEK' },
  },

  // Section order and config for each simulation
  // Official MedAT-H 2026 structure:
  // 1. BMS (94, 75 min)
  // 2. TV (12 total, 35 min)
  // 3. Figuren (15, 20 min)
  // 4. GM Lernphase (8, 8 min)
  // 5. Zahlenfolgen (10, 15 min)
  // 6. Wortflüssigkeit (15, 20 min)
  // 7. GM Prüfphase (25, 15 min)
  // 8. Implikationen (10, 10 min)
  // 9. Emotionen regulieren (12, 18 min) ← NEW
  // 10. Emotionen erkennen (14, 21 min)
  // 11. Soziales Entscheiden (14, 21 min)
  sectionConfig: [
    { key: 'bms',                      block: 'bms', label: 'Basiskenntnistest Medizinische Studien',  type: 'bms',                   subtype: null, excludeSubtypes: ['Figuren zusammensetzen', 'Merkfähigkeit'], count: 94, minutes: 75, icon: 'BMS' },
    { key: 'tv',                       block: 'tv',  label: 'Textverständnis',                        type: 'tv',                    subtype: 'Textverständnis',    count: 4,  minutes: 35, icon: 'TV', isTV: true },
    { key: 'figuren',                  block: 'kff', label: 'Figuren zusammensetzen',                 type: 'figuren_client',        subtype: null, count: 15, minutes: 20, icon: 'FIG', clientGenerated: true },
    { key: 'merkfaehigkeit_lernphase', block: 'kff', label: 'Merkfähigkeit - Lernphase (Allergieausweise)', type: 'merkfaehigkeit_client', subtype: null, count: 8, minutes: 8, icon: 'ML', clientGenerated: true, isMerkLern: true },
    { key: 'zahlenfolge',              block: 'kff', label: 'Zahlenfolgen',                           type: 'zahlenfolge',           subtype: 'Zahlenfolgen',       count: 10, minutes: 15, icon: 'ZF' },
    { key: 'wortfluessigkeit',         block: 'kff', label: 'Wortflüssigkeit',                       type: 'wortfluessigkeit',      subtype: 'Wortflüssigkeit',    count: 15, minutes: 20, icon: 'WF' },
    { key: 'merkfaehigkeit_pruefphase',block: 'kff', label: 'Merkfähigkeit - Prüfphase (Allergieausweise)', type: 'merkfaehigkeit_client', subtype: null, count: 25, minutes: 15, icon: 'MP', clientGenerated: true, isMerkPruef: true },
    { key: 'implikation',              block: 'kff', label: 'Implikationen erkennen',                 type: 'implikation',           subtype: 'Implikationen',      count: 10, minutes: 10, icon: 'IMP' },
    { key: 'emotionen_regulieren',     block: 'sek', label: 'Emotionen regulieren',                  type: 'sek',                   subtype: 'emotionen_regulieren', count: 12, minutes: 18, icon: 'ER' },
    { key: 'emotionen_erkennen',       block: 'sek', label: 'Emotionen erkennen',                    type: 'sek',                   subtype: 'emotionen_erkennen', count: 14, minutes: 21, icon: 'EE' },
    { key: 'soziales_entscheiden',     block: 'sek', label: 'Soziales Entscheiden',                  type: 'sek',                   subtype: 'soziales_entscheiden', count: 14, minutes: 21, icon: 'SE' },
  ],

  // ===== MAIN ENTRY: Generate all 3 simulation PDFs =====
  async generateAll() {
    const results = [];
    for (let sim = 1; sim <= 3; sim++) {
      try {
        console.log(`[LeadMagnet] Generating Simulation ${sim}...`);
        const pdfBlob = await this.generateSimulation(sim);
        results.push({ sim, blob: pdfBlob, success: true });
        console.log(`[LeadMagnet] Simulation ${sim} done!`);
      } catch (err) {
        console.error(`[LeadMagnet] Simulation ${sim} FEHLER:`, err);
        results.push({ sim, error: err.message, success: false });
      }
    }
    return results;
  },

  // ===== Generate a single simulation PDF =====
  async generateSimulation(simNr) {
    // Load fonts (reuse PDFExport if available)
    let fontCache = null;
    if (window.PDFExport && PDFExport._fontCache) {
      fontCache = PDFExport._fontCache;
    } else if (window.PDFExport) {
      fontCache = await PDFExport._loadFonts();
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });

    // Register fonts
    if (fontCache) {
      pdf.addFileToVFS('DejaVuSans-Regular.ttf', fontCache.regular);
      pdf.addFont('DejaVuSans-Regular.ttf', 'DejaVuSans', 'normal');
      pdf.addFileToVFS('DejaVuSans-Bold.ttf', fontCache.bold);
      pdf.addFont('DejaVuSans-Bold.ttf', 'DejaVuSans', 'bold');
      pdf.addFont('DejaVuSans-Regular.ttf', 'DejaVuSans', 'italic');
      pdf.setFont('DejaVuSans', 'normal');
    }

    const ctx = {
      pdf, margin: 25, marginRight: 15, pageW: 210, pageH: 297,
      contentW: 210 - 25 - 15, y: 25,
    };

    // ===== COVER PAGE =====
    this._drawCoverPage(ctx, simNr);

    // ===== LOAD ALL QUESTIONS =====
    const allSections = [];
    for (const secConf of this.sectionConfig) {
      let data = null;

      if (secConf.clientGenerated) {
        // Generate client-side (no DB query)
        if (secConf.key === 'figuren') {
          data = this._generateFigurenClientData(secConf.count);
        } else if (secConf.key === 'merkfaehigkeit_lernphase') {
          // Learning phase: 8 cards only
          data = this._generateMerkfaehigkeitClientData(secConf.count, 'lernphase');
        } else if (secConf.key === 'merkfaehigkeit_pruefphase') {
          // Test phase: 25 questions only (shared cards from lernphase)
          data = this._generateMerkfaehigkeitClientData(secConf.count, 'pruefphase');
        }
      } else {
        // Load from database
        let query = Auth.supabase
          .from('leadmagnet_questions')
          .select('*')
          .eq('simulation_nr', simNr)
          .eq('type', secConf.type);

        if (secConf.subtype) {
          query = query.eq('subtype', secConf.subtype);
        }

        // Exclude certain subtypes (e.g., BMS should not include Figuren/Merkfähigkeit)
        if (secConf.excludeSubtypes && secConf.excludeSubtypes.length > 0) {
          for (const exSub of secConf.excludeSubtypes) {
            query = query.neq('subtype', exSub);
          }
        }

        const { data: dbData, error } = await query;
        if (error) { console.error(`[LeadMagnet] Error loading ${secConf.key}:`, error); continue; }
        if (!dbData || dbData.length === 0) { console.warn(`[LeadMagnet] No questions for ${secConf.key} sim ${simNr}`); continue; }
        data = dbData;
      }

      if (data && data.length > 0) {
        allSections.push({ ...secConf, questions: data });
      }
    }

    // ===== TABLE OF CONTENTS =====
    pdf.addPage();
    const tocPageNum = pdf.getNumberOfPages();
    ctx.y = ctx.margin;
    // Leave blank — fill after rendering

    // ===== RENDER SECTIONS =====
    const allAnswerKeys = [];
    const allQuestionSets = [];
    const sectionPageMap = [];
    let globalQNum = 0;

    for (const secData of allSections) {
      pdf.addPage();
      ctx.y = ctx.margin;
      const sectionStartPage = pdf.getNumberOfPages();
      const blockInfo = this.blockColors[secData.block];

      // Section header
      this._drawSectionHeader(ctx, secData, blockInfo);
      ctx.y += 4;

      const startNum = globalQNum + 1;
      let answerKey = [];

      if (secData.isTV) {
        answerKey = this._drawTVQuestions(ctx, secData.questions, startNum, blockInfo.rgb);
      } else if (secData.type === 'sek') {
        if (secData.subtype === 'emotionen_regulieren') {
          answerKey = this._drawERQuestions(ctx, secData.questions, startNum, blockInfo.rgb);
        } else if (secData.subtype === 'emotionen_erkennen') {
          answerKey = this._drawEEQuestions(ctx, secData.questions, startNum, blockInfo.rgb);
        } else if (secData.subtype === 'soziales_entscheiden') {
          answerKey = this._drawSEQuestions(ctx, secData.questions, startNum, blockInfo.rgb);
        } else {
          answerKey = this._drawSEKQuestions(ctx, secData.questions, startNum, blockInfo.rgb);
        }
      } else if (secData.key === 'figuren') {
        answerKey = this._drawFigurenQuestions(ctx, secData.questions, startNum, blockInfo.rgb);
      } else if (secData.key === 'merkfaehigkeit_lernphase') {
        answerKey = await this._drawMerkfaehigkeitLernphaseQuestions(ctx, secData.questions, startNum, blockInfo.rgb);
      } else if (secData.key === 'merkfaehigkeit_pruefphase') {
        answerKey = this._drawMerkfaehigkeitPruefphaseQuestions(ctx, secData.questions, startNum, blockInfo.rgb);
      } else {
        answerKey = this._drawQuestions(ctx, secData.questions, secData.type, startNum, blockInfo.rgb);
      }

      allAnswerKeys.push(...answerKey);
      allQuestionSets.push({ section: secData, count: answerKey.length, startNum });
      globalQNum += answerKey.length;

      sectionPageMap.push({
        label: `${blockInfo.label} - ${secData.label}`,
        startPage: sectionStartPage,
        endPage: pdf.getNumberOfPages(),
        color: blockInfo.rgb,
      });
    }

    // ===== ANSWER SHEET =====
    pdf.addPage();
    ctx.y = ctx.margin;
    this._drawAnswerSheet(ctx, allQuestionSets);

    // ===== ANSWER KEY =====
    this._drawAnswerKey(ctx, allAnswerKeys);

    // ===== EXPLANATIONS =====
    this._drawExplanations(ctx, allSections, allQuestionSets);

    // ===== FILL IN TOC =====
    this._drawTableOfContents(ctx, tocPageNum, sectionPageMap, allQuestionSets);

    // ===== FOOTERS =====
    this._addFooters(ctx, `MedAT Simulation ${simNr}`, sectionPageMap);

    // Return as blob
    const blob = pdf.output('blob');
    // Also trigger download
    pdf.save(`MedAT_Gratissimulation_${simNr}.pdf`);
    return blob;
  },

  // ===== CLIENT-SIDE DATA GENERATION =====

  _generateFigurenClientData(count) {
    const data = [];
    const baseSeed = Date.now();
    for (let i = 0; i < count; i++) {
      const difficulty = i < 5 ? 'easy' : i < 10 ? 'medium' : 'hard';
      const seed = baseSeed + i * 7919;
      const figurenData = FigurenGenerator.generate(difficulty, seed);
      data.push({
        id: `figur_${i}`,
        qNum: i + 1,
        content: figurenData,
      });
    }
    return data;
  },

  _generateMerkfaehigkeitClientData(totalCount, phase = 'both') {
    // Split structure:
    // - Lernphase: 8 memorization cards only
    // - Prüfphase: 25 recall questions only
    // - Both: 8 cards + 25 questions
    const data = [];

    // Generate 8 unique Allergieausweis cards for memorization (used in both phases)
    const cards = this._generateAllergieausweisCards(8);

    // Add memorization phase if requested
    if (phase === 'lernphase' || phase === 'both') {
      for (let i = 0; i < cards.length; i++) {
        data.push({
          id: `memo_card_${i}`,
          phase: 'memorization',
          cardIndex: i,
          content: cards[i],
        });
      }
    }

    // Generate 25 recall questions (official: Prüfphase has 25 Aufgaben)
    const recallQuestions = this._generateAllergieausweisRecallQuestions(cards, totalCount || 25);

    // Add recall phase if requested
    if (phase === 'pruefphase' || phase === 'both') {
      for (let i = 0; i < recallQuestions.length; i++) {
        data.push({
          id: `recall_q_${i}`,
          phase: 'recall',
          questionIndex: i,
          content: recallQuestions[i],
        });
      }
    }

    return data;
  },

  _generateAllergieausweisCards(count) {
    const firstNames = ['Anna', 'Benjamin', 'Clara', 'Daniel', 'Emma', 'Friedrich', 'Gisela', 'Hans', 'Iris', 'Jakob'];
    const lastNames = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann'];
    const medications = ['Ja', 'Nein'];
    const bloodGroups = ['A', 'B', 'AB', '0'];
    const allergyLists = [
      'Penicillin, Pollen',
      'Latex',
      'Nüsse, Krebstiere',
      'Aspirin',
      'Keine bekannt',
      'Iodhaltig',
      'Sulfonamide',
      'Paracetamol',
    ];
    const countries = ['AT', 'DE', 'CH', 'LI'];

    // Select random photos from the app's photo pool
    let photoPool = [];
    if (typeof ALLERGIE_PHOTO_LIST !== 'undefined') {
      photoPool = [...ALLERGIE_PHOTO_LIST];
      // Shuffle
      for (let i = photoPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [photoPool[i], photoPool[j]] = [photoPool[j], photoPool[i]];
      }
    }

    const cards = [];
    for (let i = 0; i < count; i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[(i + Math.floor(i / firstNames.length)) % lastNames.length];
      const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
      const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
      const idNum = String(10000 + Math.floor(Math.random() * 90000));

      cards.push({
        name: `${firstName} ${lastName}`,
        birthday: `${day}.${month}`,
        medications: medications[Math.floor(Math.random() * medications.length)],
        bloodGroup: bloodGroups[Math.floor(Math.random() * bloodGroups.length)],
        allergies: allergyLists[i % allergyLists.length],
        idNumber: idNum,
        country: countries[Math.floor(Math.random() * countries.length)],
        photoFile: photoPool.length > 0 ? photoPool[i % photoPool.length] : null,
      });
    }
    return cards;
  },

  // Load image as base64 for embedding in PDF (grayscale)
  _loadImageAsBase64(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctxCanvas = canvas.getContext('2d');
          ctxCanvas.filter = 'grayscale(100%)';
          ctxCanvas.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        } catch (e) {
          console.warn('Canvas toDataURL failed:', e);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  },

  _generateAllergieausweisRecallQuestions(cards, count) {
    const questions = [];
    const questionTypes = [
      'blood_group',     // "Welche Blutgruppe hatte X?"
      'person_by_blood', // "Welche Person hatte Blutgruppe Y?"
      'medications',     // "Welche Person nimmt Medikamente ein?"
      'no_medications',  // "Welche Person nimmt KEINE Medikamente ein?"
      'allergy',         // "Welche Allergie hatte X?"
      'id_number',       // "Welche Ausweisnummer hatte X?"
    ];

    for (let i = 0; i < count; i++) {
      const typeIdx = i % questionTypes.length;
      const qType = questionTypes[typeIdx];
      const cardIdx = i % cards.length;
      const card = cards[cardIdx];

      let question = '';
      let correctAnswer = '';
      let wrongAnswers = [];

      switch (qType) {
        case 'blood_group':
          question = `Welche Blutgruppe hatte ${card.name}?`;
          correctAnswer = card.bloodGroup;
          wrongAnswers = ['A', 'B', 'AB', '0'].filter(bg => bg !== card.bloodGroup);
          break;
        case 'person_by_blood':
          question = `Welche Person hatte Blutgruppe ${card.bloodGroup}?`;
          correctAnswer = card.name;
          wrongAnswers = cards.filter((c, idx) => idx !== cardIdx).slice(0, 3).map(c => c.name);
          break;
        case 'medications':
          const medPerson = cards.find(c => c.medications === 'Ja') || card;
          question = `Welche Person nimmt Medikamente ein?`;
          correctAnswer = medPerson.name;
          wrongAnswers = cards.filter((c, idx) => c.medications !== 'Ja').slice(0, 3).map(c => c.name);
          break;
        case 'no_medications':
          const noMedPerson = cards.find(c => c.medications === 'Nein') || card;
          question = `Welche Person nimmt KEINE Medikamente ein?`;
          correctAnswer = noMedPerson.name;
          wrongAnswers = cards.filter((c, idx) => c.medications === 'Ja').slice(0, 3).map(c => c.name);
          break;
        case 'allergy':
          question = `Welche Allergie war bei ${card.name} notiert?`;
          correctAnswer = card.allergies.split(',')[0].trim();
          wrongAnswers = cards.filter((c, idx) => idx !== cardIdx).map(c => c.allergies.split(',')[0].trim()).slice(0, 3);
          break;
        case 'id_number':
          question = `Welche Ausweisnummer hatte ${card.name}?`;
          correctAnswer = card.idNumber;
          wrongAnswers = cards.filter((c, idx) => idx !== cardIdx).map(c => c.idNumber).slice(0, 3);
          break;
      }

      // Create 5 options (A-D correct/wrong, E = "Keine der Antwortmöglichkeiten ist richtig")
      const allWrong = wrongAnswers.slice(0, 3);
      while (allWrong.length < 3) {
        allWrong.push(`Falsche Option ${allWrong.length + 1}`);
      }

      const correctIdx = Math.floor(Math.random() * 4);
      const options = [];
      let optIdx = 0;
      for (let j = 0; j < 4; j++) {
        options.push(j === correctIdx ? correctAnswer : allWrong[optIdx++]);
      }
      options.push('Keine der Antwortmöglichkeiten ist richtig');

      questions.push({
        question: question,
        options: options,
        correct: correctIdx,
      });
    }

    return questions;
  },

  // ===== COVER PAGE — BMS Master style =====
  _drawCoverPage(ctx, simNr) {
    const { pdf, pageW, pageH, margin, contentW } = ctx;
    const C = this.colors;

    // White background for print-friendliness
    pdf.setFillColor(...C.white);
    pdf.rect(0, 0, pageW, pageH, 'F');

    // Thin gold accent bar on left
    pdf.setFillColor(...C.gold);
    pdf.rect(0, 0, 6, pageH, 'F');

    // === Top section: centered title block ===
    const centerX = pageW / 2;

    // "GRATIS" badge - centered
    pdf.setFillColor(...C.gold);
    pdf.roundedRect(centerX - 28, 28, 56, 14, 3, 3, 'F');
    pdf.setFontSize(15);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(...C.white);
    pdf.setCharSpace(0);
    pdf.text('GRATIS', centerX, 38, { align: 'center' });

    // "MedAT" - large, centered
    pdf.setFontSize(52);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(...C.navy);
    pdf.setCharSpace(0);
    pdf.text('MedAT', centerX, 68, { align: 'center' });

    // Gold line separator
    pdf.setDrawColor(...C.gold);
    pdf.setLineWidth(1.5);
    pdf.line(30, 74, pageW - 30, 74);

    // "SIMULATION" + number - centered
    pdf.setFontSize(28);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(...C.navy);
    pdf.setCharSpace(0);
    pdf.text(`SIMULATION ${simNr}`, centerX, 90, { align: 'center' });

    // Subtitle
    pdf.setFontSize(12);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(100, 100, 110);
    pdf.setCharSpace(0);
    pdf.text('Medizinischer Aufnahmetest \u2013 Humanmedizin 2026', centerX, 102, { align: 'center' });

    // === Content summary box ===
    const boxX = 25;
    const boxY = 118;
    const boxW = pageW - 50;
    const items = [
      '94 BMS-Fragen (Biologie, Chemie, Physik, Mathe)',
      '12 Textverständnis-Aufgaben (4 Texte)',
      '15 Figuren zusammensetzen',
      '8 Merkfähigkeit Lernphase (Allergieausweise)',
      '10 Zahlenfolgen + 15 Wortflüssigkeit',
      '25 Merkfähigkeit Prüfphase (Allergieausweise)',
      '10 Implikationen erkennen',
      '12 Emotionen regulieren + 14 Emotionen erkennen',
      '14 Soziales Entscheiden',
    ];
    const boxH = items.length * 11 + 14;

    pdf.setFillColor(250, 248, 243);
    pdf.setDrawColor(...C.gold);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(boxX, boxY, boxW, boxH, 4, 4, 'FD');

    pdf.setFontSize(10);
    let itemY = boxY + 14;
    for (const item of items) {
      // Gold checkmark circle
      pdf.setFillColor(...C.gold);
      pdf.circle(boxX + 10, itemY - 1.2, 2.5, 'F');
      pdf.setFontSize(8);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(...C.white);
      pdf.setCharSpace(0);
      pdf.text('\u2713', boxX + 10 - pdf.getTextWidth('\u2713') / 2, itemY);

      // Item text
      pdf.setFontSize(10);
      pdf.setFont('DejaVuSans', 'normal');
      pdf.setTextColor(...C.navy);
      pdf.setCharSpace(0);
      pdf.text(item, boxX + 18, itemY);
      itemY += 11;
    }

    // === Bottom gold bar (thinner, lighter) ===
    pdf.setFillColor(...C.gold);
    pdf.rect(0, pageH - 24, pageW, 24, 'F');

    pdf.setFontSize(14);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(...C.white);
    pdf.setCharSpace(0);
    pdf.text('Vorbereitung auf den MedAT 2026', centerX, pageH - 11, { align: 'center' });

    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    pdf.setCharSpace(0);
    pdf.text('Dieses Dokument ist urheberrechtlich geschützt.', centerX, pageH - 4, { align: 'center' });
  },

  // ===== TABLE OF CONTENTS =====
  _drawTableOfContents(ctx, tocPageNum, sectionPageMap, questionSets) {
    const { pdf, margin, contentW, pageW } = ctx;
    const C = this.colors;

    pdf.setPage(tocPageNum);
    let y = margin;

    // Header
    pdf.setFillColor(...C.navy);
    pdf.rect(0, 0, pageW, 20, 'F');
    pdf.setFontSize(14);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(...C.white);
    pdf.text('Inhaltsverzeichnis', pageW / 2, 14, { align: 'center' });

    y = 30;

    // Gold decorative line
    pdf.setDrawColor(...C.gold);
    pdf.setLineWidth(1);
    pdf.line(margin, y, margin + 50, y);
    y += 10;

    // Group by block
    const blockGroups = {};
    const blockOrder = [];
    for (const entry of sectionPageMap) {
      const blockName = entry.label.split(' - ')[0] || entry.label;
      if (!blockGroups[blockName]) {
        blockGroups[blockName] = [];
        blockOrder.push(blockName);
      }
      const matchSet = questionSets.find(qs => entry.label.includes(qs.section?.label));
      blockGroups[blockName].push({ ...entry, questionCount: matchSet?.count || 0 });
    }

    for (const blockName of blockOrder) {
      const entries = blockGroups[blockName];
      const color = entries[0]?.color || C.navy;

      // Block header
      pdf.setFillColor(...color);
      pdf.roundedRect(margin, y - 3.5, contentW, 9, 2, 2, 'F');
      pdf.setFontSize(10);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(...C.white);
      pdf.text(blockName, margin + 4, y + 2.5);
      y += 11;

      for (const entry of entries) {
        const sectionName = entry.label.split(' - ').slice(1).join(' - ') || entry.label;

        pdf.setFontSize(9);
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setTextColor(60, 60, 80);

        // Section name with internal link
        const sectionNameWidth = pdf.getTextWidth(sectionName);
        pdf.setCharSpace(0);
        pdf.textWithLink(sectionName, margin + 6, y, { pageNumber: entry.startPage });

        if (entry.questionCount > 0) {
          pdf.setFontSize(7.5);
          pdf.setTextColor(140, 140, 160);
          pdf.setCharSpace(0);
          pdf.text(`${entry.questionCount} Fragen`, pageW / 2 + 10, y);
        }

        pdf.setFontSize(9);
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setTextColor(...color);
        pdf.setCharSpace(0);
        const pageNumText = `Seite ${entry.startPage}`;
        pdf.textWithLink(pageNumText, margin + contentW - 2 - pdf.getTextWidth(pageNumText), y, { pageNumber: entry.startPage });

        y += 7;
      }
      y += 3;
    }

    // Bottom info
    y += 10;
    pdf.setFontSize(9);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(...C.textMuted);
    const infoLines = [
      'Am Ende findest du: Antwortbogen, Lösungsschlüssel und Erklärungen.',
      'Tipp: Drucke den Antwortbogen separat aus, um realistisch zu üben!',
    ];
    for (const line of infoLines) {
      pdf.text(line, margin, y);
      y += 5;
    }
  },

  // ===== SECTION HEADER =====
  _drawSectionHeader(ctx, secData, blockInfo) {
    const { pdf, margin, contentW } = ctx;
    const C = this.colors;

    // Dark navy header band
    pdf.setFillColor(...C.navy);
    pdf.rect(margin - 2, ctx.y - 2, contentW + 4, 18, 'F');

    // Gold accent bar on left
    pdf.setFillColor(...blockInfo.rgb);
    pdf.rect(margin - 2, ctx.y - 2, 4, 18, 'F');

    // Icon badge
    pdf.setFillColor(...blockInfo.rgb);
    pdf.circle(margin + 10, ctx.y + 7, 6, 'F');
    pdf.setTextColor(...C.white);
    pdf.setFontSize(7);
    pdf.setFont('DejaVuSans', 'bold');
    const iconLbl = secData.icon;
    pdf.text(iconLbl, margin + 10 - pdf.getTextWidth(iconLbl) / 2, ctx.y + 8.5);

    // Title
    pdf.setTextColor(255);
    pdf.setFontSize(13);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.text(secData.label, margin + 20, ctx.y + 8.5);

    // Block label
    pdf.setFontSize(8);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(200);
    pdf.text(blockInfo.label, margin + 20, ctx.y + 13.5);

    // Time + count (use count from config for clientGenerated, else use questions.length)
    const questionCount = secData.clientGenerated ? secData.count : secData.questions.length;
    pdf.setFontSize(10);
    pdf.setTextColor(255);
    pdf.text(`${secData.minutes} Min - ${questionCount} Aufg.`, margin + contentW - 2, ctx.y + 8.5, { align: 'right' });

    ctx.y += 24;

    // Section instructions
    const instrMap = {
      bms: 'Wähle die richtige Antwort für jede Frage. Nur eine Antwort ist korrekt.',
      zahlenfolge: 'Ergänze die fehlenden Zahlen in der Folge. Trage deine Antworten auf dem Antwortbogen ein.',
      wortfluessigkeit: 'Bilde aus den Buchstaben ein sinnvolles deutsches Substantiv und bestimme den Anfangsbuchstaben.',
      implikation: 'Lies die beiden Prämissen und wähle die logisch korrekte Schlussfolgerung.',
      tv: 'Lies den Text aufmerksam durch und beantworte die Fragen ausschließlich anhand der Informationen im Text.',
      sek: 'Lies die Situationsbeschreibung und wähle die angemessenste Reaktion.',
      figuren_client: 'Setze die Einzelteile gedanklich zusammen. Welche Figur entsteht? Nur Rotation, keine Spiegelung!',
      merkfaehigkeit_client: 'Präge dir die Informationen ein. Später musst du Fragen beantworten.',
    };

    let instrKey = secData.type;
    if (secData.key === 'figuren') instrKey = 'figuren_client';
    if (secData.key === 'merkfaehigkeit') instrKey = 'merkfaehigkeit_client';
    if (secData.isTV) instrKey = 'tv';

    const instr = instrMap[instrKey] || '';
    if (instr) {
      pdf.setTextColor(80);
      pdf.setFontSize(9);
      pdf.setFont('DejaVuSans', 'italic');
      const instrLines = pdf.splitTextToSize(instr, contentW);
      pdf.text(instrLines, margin, ctx.y);
      ctx.y += instrLines.length * 4.5 + 4;
    }

    pdf.setFont('DejaVuSans', 'normal');
  },

  // ===== DRAW FIGUREN QUESTIONS (CLIENT-GENERATED) =====
  _drawFigurenQuestions(ctx, figurenQuestions, startNum, blockColor) {
    const { pdf, margin, contentW } = ctx;
    const answerKey = [];
    const labels = ['A', 'B', 'C', 'D', 'E'];
    const color = blockColor ? this._hexToRGB(blockColor) : { r: 155, g: 127, b: 196 };

    for (let qi = 0; qi < figurenQuestions.length; qi++) {
      const qData = figurenQuestions[qi].content;
      const qNum = (startNum || 1) + qi;

      // Need ~110mm for a full figuren question (pieces + 5 options)
      this._checkPage(ctx, 110);

      // Question number header
      pdf.setFontSize(10);
      pdf.setTextColor(color.r, color.g, color.b);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.text(`Frage ${qNum}`, margin, ctx.y);
      pdf.setFontSize(8);
      pdf.setTextColor(140);
      pdf.setFont('DejaVuSans', 'normal');
      pdf.text(`Figuren zusammensetzen · ${qData.numPieces} Teile`, margin + 24, ctx.y);
      ctx.y += 2;
      this._drawLine(ctx, margin, ctx.y, margin + contentW);
      ctx.y += 5;

      // Render pieces as PDF polygons
      const piecesY = ctx.y;
      const pieceSize = 22;
      const piecesPerRow = Math.min(qData.pieces.length, 6);
      const totalPiecesW = piecesPerRow * (pieceSize + 4);
      const piecesStartX = margin + (contentW - totalPiecesW) / 2;

      // Draw label
      pdf.setFontSize(8);
      pdf.setTextColor(100);
      pdf.text('Einzelteile:', margin, ctx.y + 3);
      ctx.y += 7;

      // Draw each piece as PDF polygon
      for (let pi = 0; pi < qData.pieces.length; pi++) {
        const piece = qData.pieces[pi];
        const col = pi % piecesPerRow;
        const row = Math.floor(pi / piecesPerRow);
        const px = piecesStartX + col * (pieceSize + 4);
        const py = ctx.y + row * (pieceSize + 4);

        // Background box
        pdf.setFillColor(248, 245, 240);
        pdf.setDrawColor(220);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(px, py, pieceSize, pieceSize, 1, 1, 'FD');

        // Scale piece to fit in box
        this._drawPDFPolygon(pdf, piece, px, py, pieceSize, color);
      }
      const pieceRows = Math.ceil(qData.pieces.length / piecesPerRow);
      ctx.y += pieceRows * (pieceSize + 4) + 4;

      // Draw 5 options (A-E) in a row
      pdf.setFontSize(8);
      pdf.setTextColor(100);
      pdf.text('Welche Figur entsteht?', margin, ctx.y + 3);
      ctx.y += 7;

      const optSize = 26;
      const optGap = 6;
      const totalOptsW = 5 * optSize + 4 * optGap;
      const optsStartX = margin + (contentW - totalOptsW) / 2;

      // Draw options A–D as polygons
      for (let oi = 0; oi < qData.options.length && oi < 4; oi++) {
        const opt = qData.options[oi];
        const ox = optsStartX + oi * (optSize + optGap);

        // Option box
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(180);
        pdf.setLineWidth(0.4);
        pdf.roundedRect(ox, ctx.y, optSize, optSize, 1.5, 1.5, 'FD');

        // Draw polygon
        this._drawPDFPolygon(pdf, opt, ox, ctx.y, optSize, { r: 60, g: 60, b: 60 });

        // Label below
        pdf.setFillColor(color.r, color.g, color.b);
        pdf.circle(ox + optSize / 2, ctx.y + optSize + 5, 2.8, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setFontSize(8);
        const lbl = labels[oi];
        pdf.text(lbl, ox + optSize / 2 - pdf.getTextWidth(lbl) / 2, ctx.y + optSize + 6);
      }

      // Option E = "Keine davon"
      const eOx = optsStartX + 4 * (optSize + optGap);
      pdf.setFillColor(245, 245, 245);
      pdf.setDrawColor(180);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(eOx, ctx.y, optSize, optSize, 1.5, 1.5, 'FD');
      // Draw "Keine davon" text
      pdf.setFontSize(7);
      pdf.setFont('DejaVuSans', 'normal');
      pdf.setTextColor(120);
      const keineText = 'Keine';
      pdf.text(keineText, eOx + optSize / 2 - pdf.getTextWidth(keineText) / 2, ctx.y + optSize / 2 - 1);
      const keineText2 = 'davon';
      pdf.text(keineText2, eOx + optSize / 2 - pdf.getTextWidth(keineText2) / 2, ctx.y + optSize / 2 + 3);
      // E label below
      pdf.setFillColor(color.r, color.g, color.b);
      pdf.circle(eOx + optSize / 2, ctx.y + optSize + 5, 2.8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setFontSize(8);
      pdf.text('E', eOx + optSize / 2 - pdf.getTextWidth('E') / 2, ctx.y + optSize + 6);

      ctx.y += optSize + 12;

      pdf.setFont('DejaVuSans', 'normal');
      pdf.setTextColor(30);

      const correctLetter = labels[qData.correct];
      console.log(`[PDF-FIG] Frage ${qNum}: correct=${qData.correct} (${correctLetter}), pieces=${qData.numPieces}`);
      answerKey.push({ nr: qNum, answer: correctLetter });
      ctx.y += 4;
    }

    return answerKey;
  },

  // ===== DRAW MERKFÄHIGKEIT QUESTIONS (CLIENT-GENERATED) =====
  _drawMerkfaehigkeitQuestions(ctx, merkfaehigkeitData, startNum, blockColor) {
    const { pdf, margin, contentW } = ctx;
    const answerKey = [];
    const C = this.colors;

    // Separate into memorization cards and recall questions
    const memoCards = merkfaehigkeitData.filter(item => item.phase === 'memorization');
    const recallQuestions = merkfaehigkeitData.filter(item => item.phase === 'recall');

    // ===== MEMORIZATION PHASE =====
    pdf.setFontSize(12);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(...blockColor);
    pdf.text('Phase 1: Einprägung', margin, ctx.y);
    ctx.y += 2;
    this._drawLine(ctx, margin, ctx.y, margin + contentW);
    ctx.y += 6;

    pdf.setFontSize(9);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(80);
    pdf.text('Merke dir die folgenden Allergieausweise. Du erhältst später Fragen dazu.', margin, ctx.y);
    ctx.y += 6;

    // Draw each card
    for (const cardData of memoCards) {
      const card = cardData.content;
      this._checkPage(ctx, 60);

      // Card background
      const cardW = contentW;
      const cardH = 50;
      pdf.setDrawColor(26, 26, 46);
      pdf.setLineWidth(0.8);
      pdf.roundedRect(margin, ctx.y, cardW, cardH, 2, 2, 'S');

      // Header with red cross
      pdf.setFillColor(26, 26, 46);
      pdf.roundedRect(margin, ctx.y, cardW, 10, 2, 2, 'F');
      pdf.rect(margin, ctx.y + 6, cardW, 4, 'F');

      // Red cross
      pdf.setFillColor(220, 38, 38);
      const crossX = margin + 4;
      const crossY = ctx.y + 1;
      pdf.rect(crossX, crossY, 4, 4, 'F');
      pdf.setFillColor(255, 255, 255);
      pdf.rect(crossX + 1.2, crossY + 0.5, 1, 3, 'F');
      pdf.rect(crossX + 0.3, crossY + 1.5, 3.4, 0.8, 'F');

      // Card title
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.text('ALLERGIEAUSWEIS', margin + 12, ctx.y + 6.5);

      // Data fields (2 columns)
      const dataX = margin + 4;
      const col2X = margin + contentW / 2 + 2;
      let fieldY = ctx.y + 14;
      const lineH = 6.5;
      const labelW = 30;

      pdf.setFontSize(8);
      pdf.setTextColor(30);

      const fields = [
        ['Name:', card.name],
        ['Geb.tag:', card.birthday],
        ['Medik.:', card.medications],
        ['Blutgruppe:', card.bloodGroup],
      ];

      for (let fi = 0; fi < fields.length; fi++) {
        const x = fi < 2 ? dataX : col2X;
        if (fi === 2) fieldY = ctx.y + 14;

        pdf.setFont('DejaVuSans', 'bold');
        pdf.setTextColor(80);
        pdf.setFontSize(7.5);
        pdf.text(fields[fi][0], x, fieldY);
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setTextColor(20);
        pdf.setFontSize(8);
        pdf.text(fields[fi][1], x + labelW, fieldY);
        fieldY += lineH;
      }

      // Allergies and ID on next line
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(80);
      pdf.text('Allergien:', dataX, fieldY);
      pdf.setFont('DejaVuSans', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(20);
      const allergyLines = pdf.splitTextToSize(card.allergies, contentW / 2 - 6);
      pdf.text(allergyLines[0] || '', dataX + labelW, fieldY);

      pdf.setFont('DejaVuSans', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(80);
      pdf.text('Ausweis-Nr.:', col2X, fieldY);
      pdf.setFont('DejaVuSans', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(20);
      pdf.text(card.idNumber, col2X + labelW, fieldY);

      ctx.y += cardH + 4;
    }

    ctx.y += 8;

    // ===== RECALL PHASE =====
    pdf.setFontSize(12);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(...blockColor);
    pdf.text('Phase 2: Abfrage', margin, ctx.y);
    ctx.y += 2;
    this._drawLine(ctx, margin, ctx.y, margin + contentW);
    ctx.y += 6;

    pdf.setFontSize(9);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(80);
    pdf.text('Beantworte die Fragen zu den Allergieausweisen.', margin, ctx.y);
    ctx.y += 6;

    // Draw recall questions as standard MC
    for (let qi = 0; qi < recallQuestions.length; qi++) {
      const qData = recallQuestions[qi].content;
      const qNum = (startNum || 1) + memoCards.length + qi;

      const spaceNeeded = 25 + ((qData.options || []).length * 6);
      this._checkPage(ctx, spaceNeeded);

      // Question number
      pdf.setFontSize(10);
      pdf.setTextColor(...blockColor);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.text(`Frage ${qNum}`, margin, ctx.y);
      ctx.y += 2;
      this._drawLine(ctx, margin, ctx.y, margin + contentW);
      ctx.y += 5;

      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(30);
      const qLines = pdf.splitTextToSize(qData.question, contentW);
      for (const line of qLines) {
        this._checkPage(ctx, 6);
        pdf.text(line, margin, ctx.y);
        ctx.y += 5;
      }
      ctx.y += 3;

      // Options
      const { shuffledOpts, correctLetter } = this._shuffleOptions(qData.options, qData.correct);
      this._renderOptions(ctx, shuffledOpts, blockColor);
      answerKey.push({ nr: qNum, answer: correctLetter });
      ctx.y += 4;
    }

    return answerKey;
  },

  // ===== MERKFÄHIGKEIT LERNPHASE (8 cards only) =====
  async _drawMerkfaehigkeitLernphaseQuestions(ctx, merkfaehigkeitData, startNum, blockColor) {
    const { pdf, margin, contentW } = ctx;
    const answerKey = [];
    const C = this.colors;

    // Extract memorization cards only
    const memoCards = merkfaehigkeitData.filter(item => item.phase === 'memorization');

    // Preload photos
    const photoCache = {};
    for (const cardData of memoCards) {
      const card = cardData.content;
      if (card.photoFile) {
        try {
          const imgData = await this._loadImageAsBase64(`assets/allergieausweise/photos/${card.photoFile}`);
          if (imgData) photoCache[card.photoFile] = imgData;
        } catch (e) { console.warn('Photo load failed:', card.photoFile, e); }
      }
    }

    // ===== MEMORIZATION PHASE ONLY =====
    pdf.setFontSize(12);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setCharSpace(0);
    pdf.setTextColor(...blockColor);
    pdf.text('Merkfähigkeit - Lernphase', margin, ctx.y);
    ctx.y += 2;
    this._drawLine(ctx, margin, ctx.y, margin + contentW);
    ctx.y += 6;

    pdf.setFontSize(9);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(80);
    pdf.setCharSpace(0);
    pdf.text('Merke dir die folgenden Allergieausweise. Du erhältst später Fragen dazu.', margin, ctx.y);
    ctx.y += 6;

    // Draw each card (2 per row for compact layout)
    const photoW = 18;
    const photoH = 22;
    const cardW = contentW;
    const cardH = 55;

    for (const cardData of memoCards) {
      const card = cardData.content;
      this._checkPage(ctx, cardH + 6);

      // Card border
      pdf.setDrawColor(26, 26, 46);
      pdf.setLineWidth(0.8);
      pdf.roundedRect(margin, ctx.y, cardW, cardH, 2, 2, 'S');

      // Header band
      pdf.setFillColor(26, 26, 46);
      pdf.roundedRect(margin, ctx.y, cardW, 10, 2, 2, 'F');
      pdf.rect(margin, ctx.y + 6, cardW, 4, 'F');

      // Red cross
      pdf.setFillColor(220, 38, 38);
      const crossX = margin + 4;
      const crossY = ctx.y + 1;
      pdf.rect(crossX, crossY, 5, 5, 'F');
      pdf.setFillColor(255, 255, 255);
      pdf.rect(crossX + 1.5, crossY + 0.6, 1.2, 3.8, 'F');
      pdf.rect(crossX + 0.5, crossY + 1.8, 4, 1.2, 'F');

      // Card title
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setCharSpace(0);
      pdf.text('ALLERGIEAUSWEIS', margin + 12, ctx.y + 6.5);

      // Photo on the right
      const photoX = margin + cardW - photoW - 6;
      const photoY = ctx.y + 14;
      if (card.photoFile && photoCache[card.photoFile]) {
        try {
          pdf.addImage(photoCache[card.photoFile], 'PNG', photoX, photoY, photoW, photoH);
          pdf.setDrawColor(180, 180, 180);
          pdf.setLineWidth(0.3);
          pdf.rect(photoX, photoY, photoW, photoH, 'S');
        } catch (e) {
          this._drawPhotoPlaceholder(pdf, photoX, photoY, photoW, photoH);
        }
      } else {
        this._drawPhotoPlaceholder(pdf, photoX, photoY, photoW, photoH);
      }

      // Data fields — left side only (right has photo)
      const dataX = margin + 4;
      const dataW = cardW - photoW - 18;
      let fieldY = ctx.y + 15;
      const lineH = 6;
      const labelW = 28;

      pdf.setFontSize(8);
      pdf.setCharSpace(0);

      const fields = [
        ['Name:', card.name],
        ['Geb.tag:', card.birthday],
        ['Medik.:', card.medications],
        ['Blutgruppe:', card.bloodGroup],
        ['Allergien:', card.allergies],
        ['Ausweis-Nr.:', card.idNumber],
        ['Land:', card.country],
      ];

      for (const [label, value] of fields) {
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setTextColor(80);
        pdf.setFontSize(7.5);
        pdf.setCharSpace(0);
        pdf.text(label, dataX, fieldY);
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setTextColor(20);
        pdf.setFontSize(8);
        pdf.setCharSpace(0);
        const valLines = pdf.splitTextToSize(value || '', dataW - labelW);
        pdf.text(valLines[0] || '', dataX + labelW, fieldY);
        fieldY += lineH;
      }

      ctx.y += cardH + 4;
    }

    return answerKey;
  },

  _drawPhotoPlaceholder(pdf, x, y, w, h) {
    pdf.setFillColor(230, 230, 230);
    pdf.rect(x, y, w, h, 'F');
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.rect(x, y, w, h, 'S');
    pdf.setFontSize(6);
    pdf.setTextColor(150);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.text('Foto', x + w / 2, y + h / 2, { align: 'center' });
  },

  // ===== MERKFÄHIGKEIT PRÜFPHASE (25 questions only) =====
  _drawMerkfaehigkeitPruefphaseQuestions(ctx, merkfaehigkeitData, startNum, blockColor) {
    const { pdf, margin, contentW } = ctx;
    const answerKey = [];
    const C = this.colors;

    // Extract recall questions only
    const recallQuestions = merkfaehigkeitData.filter(item => item.phase === 'recall');

    // ===== RECALL PHASE ONLY =====
    pdf.setFontSize(12);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(...blockColor);
    pdf.text('Merkfähigkeit - Prüfphase', margin, ctx.y);
    ctx.y += 2;
    this._drawLine(ctx, margin, ctx.y, margin + contentW);
    ctx.y += 6;

    pdf.setFontSize(9);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(80);
    pdf.text('Beantworte die Fragen zu den Allergieausweisen aus der Lernphase.', margin, ctx.y);
    ctx.y += 6;

    // Draw recall questions as standard MC
    for (let qi = 0; qi < recallQuestions.length; qi++) {
      const qData = recallQuestions[qi].content;
      const qNum = (startNum || 1) + qi;

      const spaceNeeded = 25 + ((qData.options || []).length * 6);
      this._checkPage(ctx, spaceNeeded);

      // Reset spacing before rendering
      pdf.setCharSpace(0);

      // Question number
      pdf.setFontSize(10);
      pdf.setTextColor(...blockColor);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.text(`Frage ${qNum}`, margin, ctx.y);
      ctx.y += 2;
      this._drawLine(ctx, margin, ctx.y, margin + contentW);
      ctx.y += 5;

      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(30);
      const qLines = pdf.splitTextToSize(qData.question, contentW);
      for (const line of qLines) {
        this._checkPage(ctx, 6);
        pdf.text(line, margin, ctx.y);
        ctx.y += 5;
      }
      ctx.y += 3;

      // Options
      const { shuffledOpts, correctLetter } = this._shuffleOptions(qData.options, qData.correct);
      this._renderOptions(ctx, shuffledOpts, blockColor);
      answerKey.push({ nr: qNum, answer: correctLetter });
      ctx.y += 4;
    }

    return answerKey;
  },

  // ===== DRAW STANDARD MC QUESTIONS =====
  _drawQuestions(ctx, questions, dbType, startNum, blockColor) {
    const { pdf, margin, contentW } = ctx;
    const answerKey = [];

    // Reset character spacing to prevent rendering issues with bold fonts
    pdf.setCharSpace(0);

    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const data = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;
      const qNum = (startNum || 1) + qi;

      let spaceNeeded = 25;
      if (dbType === 'zahlenfolge') spaceNeeded = 45;
      else if (dbType === 'implikation') spaceNeeded = 40;
      else if (dbType === 'wortfluessigkeit') spaceNeeded = 60;
      else if (data.is_kombination && Array.isArray(data.statements)) spaceNeeded = 40 + data.statements.length * 7 + ((data.options || []).length * 6);
      else spaceNeeded = 25 + ((data.options || []).length * 6);

      this._checkPage(ctx, spaceNeeded);

      // Reset spacing before rendering
      pdf.setCharSpace(0);

      // Question number
      pdf.setFontSize(10);
      pdf.setTextColor(...this.colors.navy);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.text(`Frage ${qNum}`, margin, ctx.y);

      // Topic tag
      if (q.topic) {
        pdf.setFontSize(8);
        pdf.setTextColor(140);
        pdf.setFont('DejaVuSans', 'normal');
        pdf.text(q.topic, margin + pdf.getTextWidth(`Frage ${qNum}  `) + 2, ctx.y);
      }

      ctx.y += 2;
      this._drawLine(ctx, margin, ctx.y, margin + contentW);
      ctx.y += 5;

      pdf.setFont('DejaVuSans', 'normal');
      pdf.setTextColor(30);

      if (dbType === 'zahlenfolge' && data.sequence) {
        this._drawZahlenfolge(ctx, data, qNum, answerKey);
      } else if (dbType === 'implikation' && data.premise1 && data.premise2) {
        this._drawImplikation(ctx, data, qNum, blockColor, answerKey);
      } else if (dbType === 'wortfluessigkeit' && data.word) {
        this._drawWortfluessigkeit(ctx, data, qNum, blockColor, answerKey);
      } else {
        // BMS / Generic MC (incl. Kombinationsaufgaben)
        pdf.setFontSize(10);
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setCharSpace(0);
        const qLines = pdf.splitTextToSize(data.question || '', contentW);
        for (const line of qLines) {
          this._checkPage(ctx, 6);
          pdf.text(line, margin, ctx.y);
          ctx.y += 5;
        }
        ctx.y += 3;
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setCharSpace(0);

        // === Kombinationsaufgaben: render 4 numbered statements ===
        if (data.is_kombination && Array.isArray(data.statements) && data.statements.length > 0) {
          // Light background box for statements
          const stmtStartY = ctx.y - 1;
          let stmtLines = [];
          for (const stmt of data.statements) {
            const lines = pdf.splitTextToSize(stmt, contentW - 12);
            stmtLines.push(...lines);
          }
          const stmtBoxH = stmtLines.length * 5.5 + 6;
          this._checkPage(ctx, stmtBoxH + 40);

          pdf.setFillColor(245, 243, 238);
          pdf.setDrawColor(...this.colors.border);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(margin, ctx.y - 2, contentW, stmtBoxH, 2, 2, 'FD');

          pdf.setFontSize(9.5);
          pdf.setTextColor(30);
          pdf.setFont('DejaVuSans', 'normal');
          pdf.setCharSpace(0);
          ctx.y += 3;
          for (const stmt of data.statements) {
            const sLines = pdf.splitTextToSize(stmt, contentW - 12);
            for (const sl of sLines) {
              this._checkPage(ctx, 6);
              pdf.text(sl, margin + 6, ctx.y);
              ctx.y += 5.5;
            }
          }
          ctx.y += 4;
        }

        const opts = data.options || [];
        if (opts.length > 0) {
          if (data.is_kombination) {
            // Don't shuffle Kombinationsaufgaben — order matters
            this._renderOptions(ctx, opts, blockColor);
            answerKey.push({ nr: qNum, answer: String.fromCharCode(65 + (data.correct || 0)) });
          } else {
            const { shuffledOpts, correctLetter } = this._shuffleOptions(opts, data.correct);
            this._renderOptions(ctx, shuffledOpts, blockColor);
            answerKey.push({ nr: qNum, answer: correctLetter });
          }
        }
      }

      ctx.y += 4;
    }

    return answerKey;
  },

  // ===== ZAHLENFOLGE =====
  _drawZahlenfolge(ctx, data, qNum, answerKey) {
    const { pdf, margin, contentW } = ctx;
    ctx.y += 12;

    pdf.setFontSize(11);
    let seqX = margin;
    for (let si = 0; si < data.sequence.length; si++) {
      const val = data.sequence[si] === null ? '___' : String(data.sequence[si]);
      pdf.setFont('DejaVuSans', data.sequence[si] === null ? 'bold' : 'normal');
      if (data.sequence[si] === null) {
        pdf.setTextColor(...this.colors.lavenderDark);
      } else {
        pdf.setTextColor(30);
      }
      pdf.text(val, seqX, ctx.y);
      seqX += pdf.getTextWidth(val) + 2;

      if (si < data.sequence.length - 1) {
        const arrowY = ctx.y - 1.5;
        pdf.setDrawColor(150);
        pdf.setLineWidth(0.4);
        pdf.line(seqX, arrowY, seqX + 5, arrowY);
        pdf.line(seqX + 4, arrowY - 1.2, seqX + 5, arrowY);
        pdf.line(seqX + 4, arrowY + 1.2, seqX + 5, arrowY);
        seqX += 8;
      }

      if (seqX > margin + contentW - 20 && si < data.sequence.length - 1) {
        ctx.y += 7;
        seqX = margin + 10;
      }
    }
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(30);
    ctx.y += 7;

    const blanks = data.sequence.filter(n => n === null).length;
    pdf.setFontSize(9);
    pdf.setTextColor(100);
    pdf.text(`Antwort (${blanks} Zahl${blanks > 1 ? 'en' : ''}): `, margin, ctx.y);
    for (let b = 0; b < blanks; b++) {
      const bx = margin + 38 + b * 25;
      this._drawLine(ctx, bx, ctx.y + 1, bx + 18);
    }
    ctx.y += 8;
    answerKey.push({ nr: qNum, answer: data.solution ? data.solution.join(', ') : '?' });
  },

  // ===== IMPLIKATION =====
  _drawImplikation(ctx, data, qNum, blockColor, answerKey) {
    const { pdf, margin, contentW } = ctx;

    pdf.setFontSize(10);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.text('P1:', margin, ctx.y);
    pdf.setFont('DejaVuSans', 'normal');
    const p1Lines = pdf.splitTextToSize(data.premise1, contentW - 10);
    for (const line of p1Lines) {
      this._checkPage(ctx, 6);
      pdf.text(line, margin + 10, ctx.y);
      ctx.y += 5;
    }
    ctx.y += 2;

    pdf.setFont('DejaVuSans', 'bold');
    pdf.text('P2:', margin, ctx.y);
    pdf.setFont('DejaVuSans', 'normal');
    const p2Lines = pdf.splitTextToSize(data.premise2, contentW - 10);
    for (const line of p2Lines) {
      this._checkPage(ctx, 6);
      pdf.text(line, margin + 10, ctx.y);
      ctx.y += 5;
    }
    ctx.y += 4;

    const opts = data.options || [];
    const { shuffledOpts, correctLetter } = this._shuffleOptions(opts, data.correct);
    this._renderOptions(ctx, shuffledOpts, blockColor);
    answerKey.push({ nr: qNum, answer: correctLetter });
  },

  // ===== WORTFLÜSSIGKEIT =====
  _drawWortfluessigkeit(ctx, data, qNum, blockColor, answerKey) {
    const { pdf, margin, contentW } = ctx;

    const word = (data.word || '').toUpperCase();
    const anagram = this._scrambleWord(word);

    const anagramLen = anagram.length;
    const fontSize = anagramLen > 11 ? 11 : 14;
    const spacing = anagramLen > 11 ? ' ' : '  ';
    pdf.setFontSize(fontSize);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(...this.colors.lavenderDark);
    const letterStr = anagram.split('').join(spacing);
    const letterWidth = pdf.getTextWidth(letterStr);
    if (letterWidth > contentW) {
      pdf.setFontSize(Math.floor(fontSize * contentW / letterWidth));
    }
    pdf.text(letterStr, margin, ctx.y);
    ctx.y += 3;

    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.text(`(${word.length} Buchstaben)`, margin, ctx.y + 3);
    ctx.y += 8;

    // Generate letter options
    const firstLetter = word.charAt(0);
    const keineCorrect = Math.random() < 0.2;
    const allLetters = 'ABCDEFGHIJKLMNOPRSTUVWZ'.split('');
    const wrongLetters = allLetters.filter(l => l !== firstLetter);
    for (let wi = wrongLetters.length - 1; wi > 0; wi--) {
      const wj = Math.floor(Math.random() * (wi + 1));
      [wrongLetters[wi], wrongLetters[wj]] = [wrongLetters[wj], wrongLetters[wi]];
    }

    let letterOpts, correctAnswer;
    if (keineCorrect) {
      letterOpts = wrongLetters.slice(0, 4);
      correctAnswer = 'E';
    } else {
      letterOpts = [firstLetter, ...wrongLetters.slice(0, 3)];
      for (let si = letterOpts.length - 1; si > 0; si--) {
        const sj = Math.floor(Math.random() * (si + 1));
        [letterOpts[si], letterOpts[sj]] = [letterOpts[sj], letterOpts[si]];
      }
      const correctIdx = letterOpts.indexOf(firstLetter);
      correctAnswer = String.fromCharCode(65 + correctIdx);
    }
    letterOpts.push('Keine der Antwortmöglichkeiten ist richtig');

    pdf.setFontSize(10);
    pdf.setTextColor(30);
    this._renderOptions(ctx, letterOpts, blockColor);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(30);
    answerKey.push({ nr: qNum, answer: `${correctAnswer} (${word})` });
  },

  // ===== TV QUESTIONS =====
  _drawTVQuestions(ctx, questions, startNum, blockColor) {
    const { pdf, margin, contentW } = ctx;
    const answerKey = [];

    // Reset character spacing
    pdf.setCharSpace(0);

    let qNum = startNum;

    for (let ti = 0; ti < questions.length; ti++) {
      const q = questions[ti];
      const data = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;

      if (ti > 0) {
        pdf.addPage();
        ctx.y = ctx.margin;
      }

      // Reset spacing
      pdf.setCharSpace(0);

      // Text header
      pdf.setFontSize(11);
      pdf.setFont('DejaVuSans', 'bold');
      const tvTitle = `Text ${ti + 1}: ${data.title || ''}`;
      const tvTitleLines = pdf.splitTextToSize(tvTitle, contentW - 4);
      const tvHeaderH = Math.max(10, tvTitleLines.length * 6 + 4);
      pdf.setFillColor(...this.colors.mintDark);
      pdf.rect(margin - 2, ctx.y - 2, contentW + 4, tvHeaderH, 'F');
      pdf.setTextColor(255);
      for (let tli = 0; tli < tvTitleLines.length; tli++) {
        pdf.text(tvTitleLines[tli], margin + 4, ctx.y + 5 + tli * 6);
      }
      ctx.y += tvHeaderH + 4;

      // Text body
      pdf.setTextColor(30);
      pdf.setFontSize(10);
      pdf.setFont('DejaVuSans', 'normal');
      const textContent = data.text_content || '';
      const textLines = pdf.splitTextToSize(textContent, contentW);
      for (const line of textLines) {
        this._checkPage(ctx, 6);
        pdf.text(line, margin + 3, ctx.y);
        ctx.y += 4.5;
      }
      ctx.y += 6;

      // Questions for this text
      pdf.setFontSize(10);
      pdf.setTextColor(...this.colors.navy);
      pdf.setFont('DejaVuSans', 'bold');
      this._checkPage(ctx, 8);
      pdf.text(`Fragen zu Text ${ti + 1}`, margin, ctx.y);
      ctx.y += 2;
      this._drawLine(ctx, margin, ctx.y, margin + contentW);
      ctx.y += 5;

      for (const tq of (data.questions || [])) {
        const estSpace = 12 + 5 * 3 + (tq.options || []).length * 7 + 8;
        this._checkPage(ctx, Math.min(estSpace, 120));

        pdf.setFontSize(10);
        pdf.setTextColor(...this.colors.navy);
        pdf.setFont('DejaVuSans', 'bold');
        pdf.text(`Frage ${qNum}`, margin, ctx.y);
        ctx.y += 2;
        this._drawLine(ctx, margin, ctx.y, margin + contentW);
        ctx.y += 5;

        pdf.setFont('DejaVuSans', 'bold');
        pdf.setTextColor(30);
        pdf.setCharSpace(0);
        const qLines = pdf.splitTextToSize(tq.question || '', contentW);
        for (const line of qLines) {
          this._checkPage(ctx, 6);
          pdf.text(line, margin, ctx.y);
          ctx.y += 5;
        }
        ctx.y += 3;
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setCharSpace(0);

        // === Kombinationsaufgaben statements for TV ===
        if (Array.isArray(tq.statements) && tq.statements.length > 0) {
          let stmtLines = [];
          for (const stmt of tq.statements) {
            stmtLines.push(...pdf.splitTextToSize(stmt, contentW - 12));
          }
          const stmtBoxH = stmtLines.length * 5.5 + 6;
          this._checkPage(ctx, stmtBoxH + 40);

          pdf.setFillColor(245, 243, 238);
          pdf.setDrawColor(...this.colors.border);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(margin, ctx.y - 2, contentW, stmtBoxH, 2, 2, 'FD');

          pdf.setFontSize(9.5);
          pdf.setTextColor(30);
          pdf.setFont('DejaVuSans', 'normal');
          pdf.setCharSpace(0);
          ctx.y += 3;
          for (const stmt of tq.statements) {
            const sLines = pdf.splitTextToSize(stmt, contentW - 12);
            for (const sl of sLines) {
              this._checkPage(ctx, 6);
              pdf.text(sl, margin + 6, ctx.y);
              ctx.y += 5.5;
            }
          }
          ctx.y += 4;
        }

        const opts = tq.options || [];
        // Don't shuffle Kombinationsaufgaben
        this._renderOptions(ctx, opts, blockColor);
        answerKey.push({ nr: qNum, answer: String.fromCharCode(65 + (tq.correct || 0)) });
        ctx.y += 4;
        qNum++;
      }
    }

    return answerKey;
  },

  // ===== SEK QUESTIONS (Generic fallback) =====
  _drawSEKQuestions(ctx, questions, startNum, blockColor) {
    const { pdf, margin, contentW } = ctx;
    const answerKey = [];
    const C = this.colors;

    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const data = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;
      const qNum = (startNum || 1) + qi;
      const opts = data.options || [];

      const spaceNeeded = 30 + opts.length * 8;
      this._checkPage(ctx, spaceNeeded);

      // Question number (coral for SEK)
      pdf.setFontSize(10);
      pdf.setTextColor(...C.coralDark);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.text(`Aufgabe ${qNum}`, margin, ctx.y);
      ctx.y += 2;
      this._drawLine(ctx, margin, ctx.y, margin + contentW);
      ctx.y += 5;

      // Reset spacing before bold text
      pdf.setCharSpace(0);

      // Question text (bold)
      pdf.setFontSize(10);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(30);
      const qText = data.question || '';
      const qLines = pdf.splitTextToSize(qText, contentW);
      for (const line of qLines) {
        this._checkPage(ctx, 6);
        pdf.text(line, margin, ctx.y);
        ctx.y += 5;
      }
      ctx.y += 3;

      // Options as standard MC
      const { shuffledOpts, correctLetter } = this._shuffleOptions(opts, data.correct);
      this._renderOptions(ctx, shuffledOpts, blockColor);
      answerKey.push({ nr: qNum, answer: correctLetter });

      ctx.y += 4;
    }

    return answerKey;
  },

  // ===== EMOTIONEN REGULIEREN (ER) QUESTIONS =====
  _drawERQuestions(ctx, questions, startNum, blockColor) {
    const { pdf, margin, contentW } = ctx;
    const answerKey = [];
    const C = this.colors;

    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const data = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;
      const qNum = (startNum || 1) + qi;
      const opts = data.options || [];

      this._checkPage(ctx, 40 + opts.length * 8);

      // Question number
      pdf.setFontSize(10);
      pdf.setTextColor(...C.coralDark);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.text(`Aufgabe ${qNum}`, margin, ctx.y);
      ctx.y += 2;
      this._drawLine(ctx, margin, ctx.y, margin + contentW);
      ctx.y += 5;

      // Scenario text (bold)
      pdf.setFontSize(10);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(30);
      const qText = data.question || data.scenario || '';
      const qLines = pdf.splitTextToSize(qText, contentW);
      for (const line of qLines) {
        this._checkPage(ctx, 6);
        pdf.text(line, margin, ctx.y);
        ctx.y += 5;
      }
      ctx.y += 3;

      // Render 4 options with checkbox style
      const { shuffledOpts, correctLetter } = this._shuffleOptions(opts, data.correct);
      this._renderOptions(ctx, shuffledOpts, blockColor);
      answerKey.push({ nr: qNum, answer: correctLetter });

      ctx.y += 4;
    }

    return answerKey;
  },

  // ===== EMOTIONEN ERKENNEN (EE) QUESTIONS =====
  _drawEEQuestions(ctx, questions, startNum, blockColor) {
    const { pdf, margin, contentW } = ctx;
    const answerKey = [];
    const C = this.colors;

    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const data = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;
      const qNum = (startNum || 1) + qi;

      this._checkPage(ctx, 50);

      // Question number
      pdf.setFontSize(10);
      pdf.setTextColor(...C.coralDark);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.text(`Aufgabe ${qNum}`, margin, ctx.y);
      ctx.y += 2;
      this._drawLine(ctx, margin, ctx.y, margin + contentW);
      ctx.y += 5;

      // Scenario text (bold)
      pdf.setFontSize(10);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(30);
      const qText = data.question || data.scenario || '';
      const qLines = pdf.splitTextToSize(qText, contentW);
      for (const line of qLines) {
        this._checkPage(ctx, 6);
        pdf.text(line, margin, ctx.y);
        ctx.y += 5;
      }
      ctx.y += 3;

      // Table: 5 emotions × 2 columns (wahrscheinlich/unwahrscheinlich)
      // For simplicity in PDF, render as checkbox grid
      const emotions = data.emotions || ['Freude', 'Trauer', 'Wut', 'Angst', 'Überraschung'];

      // Header row
      pdf.setFontSize(8);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(60);
      const colW = contentW / 3;
      pdf.text('Emotion', margin, ctx.y);
      pdf.text('Wahrscheinlich', margin + colW, ctx.y);
      pdf.text('Unwahrscheinlich', margin + colW * 2, ctx.y);
      ctx.y += 5;

      // Emotion rows with checkboxes
      pdf.setFontSize(9);
      pdf.setFont('DejaVuSans', 'normal');
      for (const emotion of emotions) {
        this._checkPage(ctx, 6);
        pdf.setTextColor(30);
        pdf.text(emotion, margin, ctx.y);

        // Draw checkboxes
        pdf.setDrawColor(100);
        pdf.setLineWidth(0.3);
        const checkBoxSize = 4;
        pdf.rect(margin + colW - 6, ctx.y - 3, checkBoxSize, checkBoxSize, 'S');
        pdf.rect(margin + colW * 2 - 6, ctx.y - 3, checkBoxSize, checkBoxSize, 'S');

        ctx.y += 5;
      }

      ctx.y += 3;

      // Store answer as first emotion (this is simplified)
      const correctAnswer = data.correct || 'A';
      answerKey.push({ nr: qNum, answer: correctAnswer });
    }

    return answerKey;
  },

  // ===== SOZIALES ENTSCHEIDEN (SE) QUESTIONS =====
  _drawSEQuestions(ctx, questions, startNum, blockColor) {
    const { pdf, margin, contentW } = ctx;
    const answerKey = [];
    const C = this.colors;

    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const data = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;
      const qNum = (startNum || 1) + qi;

      this._checkPage(ctx, 55);

      // Question number
      pdf.setFontSize(10);
      pdf.setTextColor(...C.coralDark);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.text(`Aufgabe ${qNum}`, margin, ctx.y);
      ctx.y += 2;
      this._drawLine(ctx, margin, ctx.y, margin + contentW);
      ctx.y += 5;

      // Scenario text (bold)
      pdf.setFontSize(10);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(30);
      const qText = data.question || data.scenario || '';
      const qLines = pdf.splitTextToSize(qText, contentW);
      for (const line of qLines) {
        this._checkPage(ctx, 6);
        pdf.text(line, margin, ctx.y);
        ctx.y += 5;
      }
      ctx.y += 4;

      // 5 considerations with ranking boxes (1-5)
      const considerations = data.considerations || [
        'Erste Überlegung',
        'Zweite Überlegung',
        'Dritte Überlegung',
        'Vierte Überlegung',
        'Fünfte Überlegung'
      ];

      pdf.setFontSize(8);
      pdf.setFont('DejaVuSans', 'normal');
      pdf.setTextColor(60);
      pdf.text('Wichtigkeit (1 = niedrig, 5 = hoch):', margin, ctx.y);
      ctx.y += 4;

      for (let i = 0; i < considerations.length; i++) {
        this._checkPage(ctx, 6);
        pdf.setFontSize(9);
        pdf.setTextColor(30);
        pdf.text(considerations[i], margin, ctx.y);

        // Draw ranking boxes 1-5
        pdf.setDrawColor(100);
        pdf.setLineWidth(0.3);
        const boxW = 5;
        const boxSpace = 6;
        for (let r = 1; r <= 5; r++) {
          pdf.rect(margin + colW * 2.3 + (r - 1) * boxSpace, ctx.y - 3.5, boxW, boxW, 'S');
          // Label the box lightly
          if (i === 0) {
            pdf.setFontSize(7);
            pdf.setTextColor(150);
            pdf.text(String(r), margin + colW * 2.3 + (r - 1) * boxSpace + 0.8, ctx.y - 2.5);
          }
        }

        ctx.y += 5;
      }

      ctx.y += 3;

      // Store simplified answer
      const correctAnswer = data.correct || 'A';
      answerKey.push({ nr: qNum, answer: correctAnswer });
    }

    return answerKey;
  },

  // ===== ANSWER SHEET =====
  _drawAnswerSheet(ctx, questionSets) {
    const { pdf, margin, contentW, pageW } = ctx;
    const C = this.colors;

    // Title with gold accent
    pdf.setFillColor(...C.navy);
    pdf.rect(0, ctx.y - 8, pageW, 16, 'F');
    pdf.setFontSize(16);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(...C.gold);
    pdf.text('Antwortbogen', pageW / 2, ctx.y + 2, { align: 'center' });
    ctx.y += 14;

    pdf.setFontSize(9);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(...C.textMuted);
    pdf.text('Markiere deine Antwort durch Ankreuzen des entsprechenden Kästchens.', margin, ctx.y);
    ctx.y += 8;

    for (const set of questionSets) {
      if (!set.count || set.count === 0) continue;
      this._checkPage(ctx, 15);

      const blockInfo = this.blockColors[set.section.block];
      const rgb = blockInfo ? blockInfo.rgb : C.navy;

      pdf.setFillColor(...rgb);
      pdf.rect(margin, ctx.y - 3, 2, 5, 'F');
      pdf.setFontSize(10);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(...C.navy);
      pdf.text(set.section.label, margin + 5, ctx.y);
      ctx.y += 6;

      const isZF = set.section.type === 'zahlenfolge';

      if (isZF) {
        const cols = 3;
        const colWidth = contentW / cols;
        pdf.setFontSize(8);
        for (let i = 0; i < set.count; i++) {
          const col = i % cols;
          const x = margin + col * colWidth;
          if (col === 0 && i > 0) ctx.y += 10;
          if (col === 0) this._checkPage(ctx, 12);
          pdf.setFont('DejaVuSans', 'bold');
          pdf.setTextColor(60);
          pdf.text(`${set.startNum + i}.`, x, ctx.y);
          pdf.setDrawColor(150);
          pdf.setLineWidth(0.3);
          pdf.rect(x + 8, ctx.y - 3.5, 25, 5, 'S');
        }
      } else {
        // Standard MC boxes
        const cols = 5;
        const colWidth = contentW / cols;
        const boxSize = 3.5;
        pdf.setFontSize(8);
        pdf.setFont('DejaVuSans', 'normal');

        for (let i = 0; i < set.count; i++) {
          const col = i % cols;
          const x = margin + col * colWidth;
          if (col === 0 && i > 0) ctx.y += 7;
          if (col === 0) this._checkPage(ctx, 9);
          const qn = set.startNum + i;

          pdf.setFont('DejaVuSans', 'bold');
          pdf.setTextColor(60);
          pdf.text(`${qn}.`, x, ctx.y);
          pdf.setFont('DejaVuSans', 'normal');
          pdf.setDrawColor(150);
          pdf.setLineWidth(0.3);
          const labels = ['A', 'B', 'C', 'D', 'E'];
          for (let b = 0; b < 5; b++) {
            const bx = x + 8 + b * 5.2;
            pdf.rect(bx, ctx.y - 3.5, boxSize, boxSize, 'S');
            pdf.setFontSize(6);
            pdf.setTextColor(180);
            pdf.text(labels[b], bx + boxSize / 2 - pdf.getTextWidth(labels[b]) / 2, ctx.y - 1.5);
            pdf.setFontSize(8);
          }
        }
      }

      ctx.y += 10;
    }
  },

  // ===== ANSWER KEY =====
  _drawAnswerKey(ctx, answerKey) {
    const { pdf, margin, contentW, pageW } = ctx;
    const C = this.colors;

    pdf.addPage();
    ctx.y = 20;

    // Title with gold accent
    pdf.setFillColor(...C.navy);
    pdf.rect(0, 0, pageW, 28, 'F');
    pdf.setFontSize(18);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(...C.gold);
    pdf.text('Lösungsschlüssel', pageW / 2, 18, { align: 'center' });

    ctx.y = 36;

    const akCols = 4;
    const akColWidth = contentW / akCols;
    const rowHeight = 5;
    pdf.setFontSize(8);

    const rowCount = Math.ceil(answerKey.length / akCols);
    for (let row = 0; row < rowCount; row++) {
      this._checkPage(ctx, rowHeight + 2);

      for (let col = 0; col < akCols; col++) {
        const idx = row * akCols + col;
        if (idx >= answerKey.length) break;

        const ax = margin + col * akColWidth;
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setTextColor(50);
        pdf.text(`${answerKey[idx].nr}.`, ax, ctx.y);
        pdf.setFont('DejaVuSans', 'normal');
        let ansStr = String(answerKey[idx].answer);
        const maxW = akColWidth - 12;
        while (pdf.getTextWidth(ansStr) > maxW && ansStr.length > 3) {
          ansStr = ansStr.slice(0, -2) + '...';
        }
        pdf.text(ansStr || '?', ax + 10, ctx.y);
      }
      ctx.y += rowHeight;
    }
    ctx.y += 8;
  },

  // ===== EXPLANATIONS =====
  _drawExplanations(ctx, allSections, questionSets) {
    const { pdf, margin, contentW, pageW } = ctx;
    const C = this.colors;

    pdf.addPage();
    ctx.y = 20;

    // Title
    pdf.setFillColor(...C.navy);
    pdf.rect(0, 0, pageW, 28, 'F');
    pdf.setFontSize(18);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(...C.gold);
    pdf.text('Erklärungen', pageW / 2, 18, { align: 'center' });
    ctx.y = 36;

    // Rebuild question numbering using questionSets
    let qNum = 0;
    for (const secData of allSections) {
      for (const q of secData.questions) {
        const data = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;

        // TV texts have sub-questions
        if (secData.isTV && data.questions) {
          for (const tq of data.questions) {
            qNum++;
            const explanation = tq.explanation || '';
            if (!explanation) continue;

            this._checkPage(ctx, 15);
            pdf.setFont('DejaVuSans', 'bold');
            pdf.setFontSize(9);
            pdf.setTextColor(50);
            pdf.text(`${qNum}.`, margin, ctx.y);
            pdf.setFont('DejaVuSans', 'normal');
            pdf.setTextColor(60);

            const expLines = pdf.splitTextToSize(explanation, contentW - 12);
            for (const line of expLines) {
              this._checkPage(ctx, 5);
              pdf.text(line, margin + 8, ctx.y);
              ctx.y += 4.5;
            }
            ctx.y += 3;
          }
          continue;
        }

        // Regular question
        qNum++;
        const explanation = data.explanation || data.pattern_description || '';
        if (!explanation) continue;

        this._checkPage(ctx, 12);
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(50);
        pdf.text(`${qNum}.`, margin, ctx.y);
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setTextColor(60);

        const expLines = pdf.splitTextToSize(explanation, contentW - 12);
        for (const line of expLines) {
          this._checkPage(ctx, 5);
          pdf.text(line, margin + 8, ctx.y);
          ctx.y += 4.5;
        }
        ctx.y += 3;
      }
    }
  },

  // ===== FOOTERS =====
  _addFooters(ctx, label, sectionPageMap) {
    const { pdf, pageW, pageH } = ctx;
    const C = this.colors;
    const totalPages = pdf.getNumberOfPages();

    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);

      // Bottom footer
      pdf.setFontSize(7.5);
      pdf.setTextColor(...C.textLight);
      pdf.setFont('DejaVuSans', 'normal');
      pdf.text(`${label} | Seite ${p} / ${totalPages}`, pageW / 2, pageH - 8, { align: 'center' });

      // Sidebar
      if (sectionPageMap && p > 2) { // Skip cover and TOC
        let sideLabel = '';
        let sideColor = C.textLight;
        for (const entry of sectionPageMap) {
          if (p >= entry.startPage && p <= entry.endPage) {
            sideLabel = entry.label;
            sideColor = entry.color;
            break;
          }
        }
        if (sideLabel) {
          pdf.setFillColor(...sideColor);
          pdf.rect(0, 0, 3, pageH, 'F');

          pdf.setFontSize(9);
          pdf.setFont('DejaVuSans', 'bold');
          pdf.setTextColor(...sideColor);
          pdf.text(sideLabel, 8, pageH / 2, { angle: 90 });
        }
      }
    }
  },

  // ===== HELPER: Render MC options =====
  _renderOptions(ctx, options, blockColor) {
    const { pdf, margin, contentW } = ctx;
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    pdf.setFontSize(10);
    pdf.setCharSpace(0);

    const color = blockColor || this.colors.navy;

    for (let i = 0; i < options.length && i < labels.length; i++) {
      const optText = String(options[i]);
      const optLines = pdf.splitTextToSize(optText, contentW - 16);
      this._checkPage(ctx, optLines.length * 5 + 4);

      // Colored circle with letter
      pdf.setFillColor(...color);
      pdf.circle(margin + 3, ctx.y - 1.2, 2.8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setFontSize(8);
      pdf.text(labels[i], margin + 3 - pdf.getTextWidth(labels[i]) / 2, ctx.y - 0.2);

      // Option text
      pdf.setFont('DejaVuSans', 'normal');
      pdf.setTextColor(30);
      pdf.setFontSize(10);
      for (const line of optLines) {
        this._checkPage(ctx, 6);
        pdf.text(line, margin + 10, ctx.y);
        ctx.y += 5;
      }
      ctx.y += 2;
    }
  },

  // ===== HELPER: Shuffle options =====
  _shuffleOptions(opts, correctIdx) {
    if (!opts || opts.length === 0) return { shuffledOpts: opts, correctLetter: '?' };

    const origIdx = typeof correctIdx === 'number' ? correctIdx : -1;
    if (origIdx < 0 || origIdx >= opts.length) return { shuffledOpts: opts, correctLetter: '?' };

    const correctValue = opts[origIdx];

    // Separate "Keine der..." option
    const keineIdx = opts.findIndex(o => typeof o === 'string' && o.toLowerCase().startsWith('keine der'));
    let keineOpt = null;
    const shuffleable = [...opts];
    if (keineIdx >= 0) {
      keineOpt = shuffleable.splice(keineIdx, 1)[0];
    }

    // Fisher-Yates
    for (let i = shuffleable.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffleable[i], shuffleable[j]] = [shuffleable[j], shuffleable[i]];
    }

    const shuffled = keineOpt ? [...shuffleable, keineOpt] : shuffleable;
    const newIdx = shuffled.indexOf(correctValue);
    return { shuffledOpts: shuffled, correctLetter: String.fromCharCode(65 + newIdx) };
  },

  // ===== HELPER: Page break check =====
  _checkPage(ctx, needed) {
    if (ctx.y + needed > ctx.pageH - 18) {
      ctx.pdf.addPage();
      ctx.y = ctx.margin;
      ctx.pdf.setCharSpace(0);
      return true;
    }
    ctx.pdf.setCharSpace(0);
    return false;
  },

  // ===== HELPER: Draw line =====
  _drawLine(ctx, x1, yPos, x2) {
    ctx.pdf.setDrawColor(180);
    ctx.pdf.setLineWidth(0.3);
    ctx.pdf.line(x1, yPos, x2, yPos);
  },

  // ===== HELPER: Draw PDF Polygon =====
  _drawPDFPolygon(pdf, points, boxX, boxY, boxSize, color) {
    if (!points || points.length < 3) return;

    // Calculate bounding box of points
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of points) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    // Generous padding to prevent overflow outside bounding box
    const padding = 3;
    const drawSize = boxSize - padding * 2;
    const scale = Math.min(drawSize / rangeX, drawSize / rangeY) * 0.92; // 92% to ensure no overflow
    const offsetX = boxX + padding + (drawSize - rangeX * scale) / 2;
    const offsetY = boxY + padding + (drawSize - rangeY * scale) / 2;

    // Scale points to box coordinates
    const scaledPoints = points.map(([x, y]) => [
      offsetX + (x - minX) * scale,
      offsetY + (y - minY) * scale,
    ]);

    // Fill + outline using jsPDF lines() method
    const fillR = Math.round(color.r * 0.3 + 255 * 0.7);
    const fillG = Math.round(color.g * 0.3 + 255 * 0.7);
    const fillB = Math.round(color.b * 0.3 + 255 * 0.7);

    if (scaledPoints.length >= 3) {
      pdf.setFillColor(fillR, fillG, fillB);
      pdf.setDrawColor(color.r, color.g, color.b);
      pdf.setLineWidth(0.5);

      // Build line segments relative to the first point
      const startX = scaledPoints[0][0];
      const startY = scaledPoints[0][1];
      const lineSegments = [];
      for (let i = 1; i < scaledPoints.length; i++) {
        lineSegments.push([
          scaledPoints[i][0] - scaledPoints[i - 1][0],
          scaledPoints[i][1] - scaledPoints[i - 1][1]
        ]);
      }
      // Close the path back to start
      lineSegments.push([
        startX - scaledPoints[scaledPoints.length - 1][0],
        startY - scaledPoints[scaledPoints.length - 1][1]
      ]);

      // Draw filled polygon with outline in one call
      pdf.lines(lineSegments, startX, startY, [1, 1], 'FD', true);
    }
  },

  // ===== HELPER: Hex to RGB =====
  _hexToRGB(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 100, g: 100, b: 100 };
  },

  // ===== HELPER: Scramble word =====
  _scrambleWord(word) {
    const arr = word.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    // Ensure it's different from original
    if (arr.join('') === word && arr.length > 1) {
      [arr[0], arr[1]] = [arr[1], arr[0]];
    }
    return arr.join('');
  },
};

// Make globally available
window.LeadMagnetPDF = LeadMagnetPDF;
