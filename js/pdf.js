// === MedAT Trainer – PDF-Export ===
// Generiert druckbare Übungsblätter + komplette Simulationen als PDF

const PDFExport = {

  // Font cache for DejaVu Sans (Unicode-capable)
  _fontCache: null,
  _fontLoading: false,

  async _loadFonts() {
    if (this._fontCache) return this._fontCache;
    if (this._fontLoading) {
      // Wait for other load to finish
      while (this._fontLoading) await new Promise(r => setTimeout(r, 100));
      return this._fontCache;
    }
    this._fontLoading = true;
    try {
      const [regularResp, boldResp] = await Promise.all([
        fetch('fonts/DejaVuSans.ttf'),
        fetch('fonts/DejaVuSans-Bold.ttf'),
      ]);
      if (!regularResp.ok || !boldResp.ok) throw new Error('Font-Dateien konnten nicht geladen werden (HTTP ' + regularResp.status + '/' + boldResp.status + ')');
      const [regularBuf, boldBuf] = await Promise.all([
        regularResp.arrayBuffer(),
        boldResp.arrayBuffer(),
      ]);
      // Convert to base64
      const toBase64 = (buf) => {
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
      };
      this._fontCache = {
        regular: toBase64(regularBuf),
        bold: toBase64(boldBuf),
      };
      return this._fontCache;
    } catch (e) {
      console.error('Font-Fehler:', e);
      // Return null instead of throwing - PDF will use built-in fonts
      this._fontCache = null;
      return null;
    } finally {
      this._fontLoading = false;
    }
  },

  _registerFonts(pdf) {
    if (!this._fontCache) return false;
    // Add DejaVu Sans to jsPDF
    pdf.addFileToVFS('DejaVuSans-Regular.ttf', this._fontCache.regular);
    pdf.addFont('DejaVuSans-Regular.ttf', 'DejaVuSans', 'normal');
    pdf.addFileToVFS('DejaVuSans-Bold.ttf', this._fontCache.bold);
    pdf.addFont('DejaVuSans-Bold.ttf', 'DejaVuSans', 'bold');
    // Use as italic fallback too (DejaVu Sans doesn't have a separate italic in our set)
    pdf.addFont('DejaVuSans-Regular.ttf', 'DejaVuSans', 'italic');
    pdf.setFont('DejaVuSans', 'normal');
    return true;
  },

  // ===== PDF Dialog =====
  openDialog() {
    if (!window.jspdf) {
      alert('PDF-Bibliothek wird noch geladen. Bitte versuche es in ein paar Sekunden erneut.');
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'pdf-overlay';
    overlay.className = 'pdf-overlay';

    // Build section checkboxes from CONFIG, grouped by block
    const blockIcons = { bms: 'flask', tv: 'bookRead', kff: 'brain', sek: 'heart' };
    let sectionCheckboxes = '';
    for (const [blockId, block] of Object.entries(CONFIG.TEST_BLOCKS)) {
      if (block.available === false) continue;
      const secEntries = blockId === 'kff' ? CONFIG.KFF_SECTION_ORDER.map(k => [k, block.sections[k]]) :
                         blockId === 'sek' ? (CONFIG.SEK_SECTION_ORDER || Object.keys(block.sections)).map(k => [k, block.sections[k]]) :
                         Object.entries(block.sections);
      let secItems = '';
      for (const [secKey, sec] of secEntries) {
        if (!sec || sec.available === false) continue;
        const value = `${blockId}__${secKey}`;
        const qCount = sec.questions || 0;
        const mins = sec.minutes || 0;
        // Note for special sections
        let note = '';
        if (sec.isMemorize) note = ' <span class="pdf-cb-note">(Einprägen)</span>';
        else if (sec.isRecall) note = ' <span class="pdf-cb-note">(Abruf)</span>';
        secItems += `
          <label class="pdf-cb-item" data-block="${blockId}" data-sec="${secKey}">
            <input type="checkbox" name="pdf-sections" value="${value}" checked>
            <span class="pdf-cb-label">${sec.label}${note}</span>
            <span class="pdf-cb-meta">${qCount}F · ${mins}min</span>
          </label>`;
      }
      sectionCheckboxes += `
        <div class="pdf-block-group">
          <div class="pdf-block-header" style="border-left: 3px solid ${block.color};">
            <label class="pdf-block-toggle">
              <input type="checkbox" class="pdf-block-cb" data-block="${blockId}" checked>
              <strong>${block.label}</strong>
              <span class="pdf-block-full">${block.fullLabel}</span>
            </label>
          </div>
          <div class="pdf-block-sections">${secItems}</div>
        </div>`;
    }

    overlay.innerHTML = `
      <div class="pdf-modal">
        <div class="pdf-modal-header">
          <h2>${ICONS.fileText} PDF erstellen</h2>
          <button class="pdf-close" id="pdf-close">&times;</button>
        </div>
        <div class="pdf-modal-body">
          <p class="pdf-desc">Wähle die Sektionen aus, die du in deinem PDF haben möchtest. Du kannst einzelne Bereiche oder eine komplette Simulation erstellen.</p>
          <div class="pdf-quick-btns">
            <button class="pdf-quick-btn" id="pdf-select-all">Alle auswählen</button>
            <button class="pdf-quick-btn" id="pdf-select-none">Alle abwählen</button>
          </div>
          <div class="pdf-sections-picker">${sectionCheckboxes}</div>
          <div class="pdf-field" style="margin-top: 12px;">
            <label for="pdf-difficulty">Schwierigkeit (für BMS/KFF)</label>
            <select id="pdf-difficulty">
              <option value="mixed">Gemischt</option>
              <option value="easy">Leicht</option>
              <option value="medium">Mittel</option>
              <option value="hard">Schwer</option>
            </select>
          </div>
          <div class="pdf-selection-summary" id="pdf-summary"></div>
        </div>
        <div class="pdf-modal-footer">
          <button class="btn-secondary" id="pdf-cancel">Abbrechen</button>
          <button class="btn-primary" id="pdf-generate">
            <span id="pdf-btn-text">PDF erstellen</span>
            <span id="pdf-btn-loading" class="hidden">Wird erstellt...</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));

    // Block-level toggle: check/uncheck all sections within a block
    overlay.querySelectorAll('.pdf-block-cb').forEach(bcb => {
      bcb.addEventListener('change', () => {
        const block = bcb.dataset.block;
        overlay.querySelectorAll(`.pdf-cb-item[data-block="${block}"] input`).forEach(cb => {
          cb.checked = bcb.checked;
        });
        this._updatePDFSummary();
      });
    });

    // Section checkbox change → update block toggle and summary
    overlay.querySelectorAll('input[name="pdf-sections"]').forEach(cb => {
      cb.addEventListener('change', () => {
        // Handle Allergieausweis dependency: recall needs memorize
        const val = cb.value;
        if (val === 'kff__allergieausweis_abruf' && cb.checked) {
          const memCb = overlay.querySelector('input[value="kff__allergieausweis_mem"]');
          if (memCb && !memCb.checked) memCb.checked = true;
        }
        if (val === 'kff__allergieausweis_mem' && !cb.checked) {
          const recCb = overlay.querySelector('input[value="kff__allergieausweis_abruf"]');
          if (recCb && recCb.checked) recCb.checked = false;
        }
        // Update block-level checkbox
        const item = cb.closest('.pdf-cb-item');
        const block = item?.dataset.block;
        if (block) {
          const allInBlock = overlay.querySelectorAll(`.pdf-cb-item[data-block="${block}"] input`);
          const checkedInBlock = [...allInBlock].filter(c => c.checked);
          const blockCb = overlay.querySelector(`.pdf-block-cb[data-block="${block}"]`);
          if (blockCb) {
            blockCb.checked = checkedInBlock.length === allInBlock.length;
            blockCb.indeterminate = checkedInBlock.length > 0 && checkedInBlock.length < allInBlock.length;
          }
        }
        this._updatePDFSummary();
      });
    });

    // Quick buttons
    document.getElementById('pdf-select-all').onclick = () => {
      overlay.querySelectorAll('input[name="pdf-sections"], .pdf-block-cb').forEach(cb => { cb.checked = true; cb.indeterminate = false; });
      this._updatePDFSummary();
    };
    document.getElementById('pdf-select-none').onclick = () => {
      overlay.querySelectorAll('input[name="pdf-sections"], .pdf-block-cb').forEach(cb => { cb.checked = false; cb.indeterminate = false; });
      this._updatePDFSummary();
    };

    // Bind events
    document.getElementById('pdf-close').onclick = () => this.closeDialog();
    document.getElementById('pdf-cancel').onclick = () => this.closeDialog();
    document.getElementById('pdf-generate').onclick = () => {
      const selected = [...overlay.querySelectorAll('input[name="pdf-sections"]:checked')].map(cb => cb.value);
      if (selected.length === 0) { alert('Bitte wähle mindestens eine Sektion aus.'); return; }
      this._selectedSections = selected;
      this.generateCustomPDF();
    };
    overlay.onclick = (e) => { if (e.target === overlay) this.closeDialog(); };

    // Initial summary
    this._updatePDFSummary();
  },

  _updatePDFSummary() {
    const overlay = document.getElementById('pdf-overlay');
    if (!overlay) return;
    const checked = [...overlay.querySelectorAll('input[name="pdf-sections"]:checked')];
    let totalQ = 0, totalMin = 0;
    for (const cb of checked) {
      const [blockId, secKey] = cb.value.split('__');
      const sec = CONFIG.TEST_BLOCKS[blockId]?.sections[secKey];
      if (sec) { totalQ += sec.questions || 0; totalMin += sec.minutes || 0; }
    }
    const summary = document.getElementById('pdf-summary');
    if (summary) {
      if (checked.length === 0) {
        summary.textContent = 'Keine Sektionen ausgewählt';
      } else {
        // Estimate page count (~3 questions per page for BMS, ~2 for KFF, rough estimate)
        const estPages = Math.max(1, Math.ceil(totalQ / 2.5) + checked.length);
        let creditNote = '';
        if (!Credits.isUnlimited()) {
          creditNote = ` · ca. ${estPages} Credits (1/Seite)`;
          if (Credits.remaining < estPages) {
            creditNote = ` · <span style="color:#ef4444">ca. ${estPages} Credits nötig (${Credits.remaining} übrig)</span>`;
          }
        }
        summary.innerHTML = `${checked.length} Sektion${checked.length !== 1 ? 'en' : ''} · ${totalQ} Fragen · ca. ${totalMin} Min${creditNote}`;
      }
    }
  },

  closeDialog() {
    const overlay = document.getElementById('pdf-overlay');
    if (overlay) {
      overlay.classList.remove('visible');
      setTimeout(() => overlay.remove(), 200);
    }
  },

  // =========================================================
  //  CUSTOM PDF — unified generator for any combination of sections
  // =========================================================
  async generateCustomPDF() {
    const selectedKeys = this._selectedSections || [];
    if (selectedKeys.length === 0) return;

    // Check simulation limit for free users (≥3 sections = counts as simulation)
    if (selectedKeys.length >= 3) {
      const allowed = await App.checkSimulationLimit();
      if (!allowed) {
        App.showSimulationLimitPaywall(document.querySelector('.pdf-dialog-content') || document.body);
        return;
      }
    }

    this._setLoading(true);
    this._showSimLoadingOverlay();
    let currentStep = 'Initialisierung';
    const progress = async (step, pct) => {
      currentStep = step;
      this._updateSimProgress(step, pct);
      await new Promise(r => setTimeout(r, 0));
    };

    try {
      const difficulty = document.getElementById('pdf-difficulty')?.value || 'mixed';
      const diffArg = difficulty === 'mixed' ? null : difficulty;

      // Parse selected sections into structured list
      const selectedParsed = selectedKeys.map(k => {
        const [blockId, secKey] = k.split('__');
        return { blockId, secKey, block: CONFIG.TEST_BLOCKS[blockId], section: CONFIG.TEST_BLOCKS[blockId]?.sections[secKey] };
      }).filter(s => s.block && s.section);

      const isFullSim = selectedParsed.length >= 10; // roughly all sections

      await progress('PDF-Dokument wird vorbereitet...', 3);
      const pdf = await this._createPDFDoc();
      const ctx = this._newContext(pdf);
      const allAnswerKeys = [];
      const allQuestionSets = [];
      const sections = [];

      // Title page
      await progress('Deckblatt wird gestaltet...', 5);
      if (isFullSim) {
        this._drawSimCoverPage(ctx);
        pdf.addPage();
        ctx.y = ctx.margin;
        this._drawInstructionsPage(ctx);
      } else {
        // Simple cover for partial selection
        const firstSec = selectedParsed[0];
        if (selectedParsed.length === 1) {
          this._drawSectionTitlePage(ctx, firstSec.section, firstSec.block, difficulty, firstSec.section.questions);
        } else {
          this._drawSimCoverPage(ctx);
        }
      }

      // Reserve TOC page (will be filled after all sections are rendered)
      const hasTOC = selectedParsed.length > 1;
      let tocPageNum = 0;
      if (hasTOC) {
        pdf.addPage();
        tocPageNum = pdf.getNumberOfPages();
        ctx.y = ctx.margin;
        // Leave blank — we'll fill it in after we know all page numbers
      }

      // Load questions for each selected section in proper order
      const orderedSections = [];
      for (const blockId of CONFIG.SIMULATION_ORDER) {
        const block = CONFIG.TEST_BLOCKS[blockId];
        if (!block) continue;
        const secOrder = blockId === 'kff' ? CONFIG.KFF_SECTION_ORDER :
                         blockId === 'sek' ? (CONFIG.SEK_SECTION_ORDER || Object.keys(block.sections)) :
                         Object.keys(block.sections);
        for (const secKey of secOrder) {
          if (selectedParsed.some(s => s.blockId === blockId && s.secKey === secKey)) {
            orderedSections.push({ blockId, secKey, block, section: block.sections[secKey] });
          }
        }
      }

      let loadPct = 10;
      const loadStep = 50 / Math.max(orderedSections.length, 1);

      for (const os of orderedSections) {
        const { blockId, secKey, block, section: sec } = os;
        loadPct += loadStep;
        await progress(`${sec.label} wird geladen...`, Math.round(loadPct));

        if (sec.isMemorize) {
          sections.push({ block, section: sec, secKey, isMemorize: true, cards: App.generateMemorizeCards(sec.questions || 8), dbType: 'memorize' });
        } else if (sec.isRecall) {
          const memSection = sections.find(s => s.isMemorize);
          if (memSection) {
            const recallQs = App.generateRecallQuestions(memSection.cards, sec.questions);
            sections.push({ block, section: sec, secKey, questions: recallQs, dbType: 'allergieausweis_frage' });
          }
        } else if (sec.dbType === 'figur' && typeof FigurenGenerator !== 'undefined') {
          sections.push({ block, section: sec, secKey, questions: [], dbType: 'figur', isFiguren: true });
        } else if (sec.isAIGenerated && blockId === 'tv') {
          // TV: load from pre_generated_tv
          try {
            const textCount = sec.textCount || 4;
            const { data: preTexts, error } = await Auth.supabase
              .from('pre_generated_tv').select('*').order('times_used', { ascending: true }).limit(textCount * 3);
            if (!error && preTexts && preTexts.length > 0) {
              const shuffled = preTexts.sort(() => Math.random() - 0.5).slice(0, textCount);
              const allTexts = shuffled.map(t => ({
                title: (t.text_content || '').substring(0, 80).split('.')[0] || 'Text',
                content: t.text_content,
                questions: typeof t.questions === 'string' ? JSON.parse(t.questions) : t.questions,
              }));
              if (allTexts.length > 0) {
                sections.push({ block, section: sec, secKey, tvTexts: allTexts, dbType: 'textverstaendnis', isTVSection: true });
                shuffled.forEach(t => { Auth.supabase.from('pre_generated_tv').update({ times_used: (t.times_used || 0) + 1 }).eq('id', t.id).then(() => {}); });
              }
            }
          } catch (e) { console.error(`[PDF] TV Fehler:`, e); }
        } else if (sec.isAIGenerated && blockId === 'sek') {
          // SEK: load from pre_generated_sek
          try {
            const { data: preQs, error } = await Auth.supabase
              .from('pre_generated_sek').select('*').eq('sek_type', sec.dbSubtype).order('times_used', { ascending: true }).limit(sec.questions * 3);
            if (!error && preQs && preQs.length > 0) {
              const shuffled = preQs.sort(() => Math.random() - 0.5).slice(0, sec.questions);
              const sekQs = shuffled.map((q, idx) => {
                const qData = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;
                return { id: `sek-${sec.dbSubtype}-${idx}`, type: sec.dbType, subtype: sec.dbSubtype, content: { scenario: qData.scenario || '', person: qData.person || '', question: qData.question, options: qData.options, correct: qData.correct, correct_ranking: qData.correct_ranking, explanation: qData.explanation || '' } };
              });
              sections.push({ block, section: sec, secKey, questions: sekQs, dbType: sec.dbType, isSEKSection: true, isRanking: sec.isRanking || false });
              shuffled.forEach(q => { Auth.supabase.from('pre_generated_sek').update({ times_used: (q.times_used || 0) + 1 }).eq('id', q.id).then(() => {}); });
            }
          } catch (e) { console.error(`[PDF] SEK ${sec.label} Fehler:`, e); }
        } else {
          // Standard DB questions (BMS, Zahlenfolge, Wortflüssigkeit, Implikation)
          try {
            const qs = await API.getQuestions(sec.dbType, diffArg, sec.questions, sec.dbSubtype);
            if (qs && qs.length > 0) {
              sections.push({ block, section: sec, secKey, questions: qs, dbType: sec.dbType });
            }
          } catch (e) { console.error(`[PDF] ${sec.label} Fehler:`, e); }
        }
      }

      if (sections.length === 0) {
        throw new Error('Keine Sektionen konnten geladen werden. Bitte prüfe deine Internetverbindung.');
      }

      // ===== RENDER EACH SECTION =====
      await progress('Fragen werden ins PDF geschrieben...', 65);
      let globalQNum = 0;
      const sectionPageMap = [];

      for (let si = 0; si < sections.length; si++) {
        const secData = sections[si];
        await progress(`${secData.section.label} wird gerendert...`, 65 + Math.round(20 * (si / sections.length)));
        pdf.addPage();
        ctx.y = ctx.margin;
        const sectionStartPage = pdf.getNumberOfPages();
        ctx.currentSection = secData.section.label;
        ctx.currentBlock = secData.block.label;
        ctx.currentBlockColor = secData.block.color;

        if (secData.isMemorize) {
          this._drawSectionHeader(ctx, secData.section, secData.block, true, secData.secKey);
          await this._drawMemorizeCards(ctx, secData.cards);
          allQuestionSets.push({ section: secData.section, block: secData.block, count: 0, isMemorize: true });
        } else if (secData.isTVSection) {
          this._drawSectionHeader(ctx, secData.section, secData.block, false, secData.secKey);
          ctx.y += 4;
          const startNum = globalQNum + 1;
          const tvAnswerKey = this._drawTVTexts(ctx, secData.tvTexts, startNum, secData.block.color);
          const tvCount = secData.tvTexts.reduce((sum, t) => sum + (t.questions ? t.questions.length : 0), 0);
          allAnswerKeys.push(...tvAnswerKey);
          const tvFlatQs = [];
          for (const txt of secData.tvTexts) { for (const tq of (txt.questions || [])) { tvFlatQs.push({ content: tq }); } }
          allQuestionSets.push({ section: secData.section, block: secData.block, count: tvCount, startNum, questions: tvFlatQs });
          globalQNum += tvCount;
        } else if (secData.isSEKSection) {
          this._drawSectionHeader(ctx, secData.section, secData.block, false, secData.secKey);
          ctx.y += 4;
          const startNum = globalQNum + 1;
          const sekAnswerKey = this._drawSEKQuestions(ctx, secData.questions, secData.isRanking, startNum, secData.block.color, secData.dbType);
          allAnswerKeys.push(...sekAnswerKey);
          allQuestionSets.push({ section: secData.section, block: secData.block, count: secData.questions.length, startNum, questions: secData.questions });
          globalQNum += secData.questions.length;
        } else if (secData.dbType === 'figur' && window.FigurenGenerator) {
          this._drawSectionHeader(ctx, secData.section, secData.block, false, secData.secKey);
          ctx.y += 4;
          const startNum = globalQNum + 1;
          const figCount = secData.section.questions || 15;
          const figResult = this._drawFigurenQuestions(ctx, figCount, startNum, secData.block.color);
          allAnswerKeys.push(...figResult.answerKey);
          if (!ctx._figurenData) ctx._figurenData = [];
          ctx._figurenData.push({ data: figResult.figurenData, blockColor: secData.block.color });
          allQuestionSets.push({ section: secData.section, block: secData.block, count: figCount, startNum });
          globalQNum += figCount;
        } else {
          this._drawSectionHeader(ctx, secData.section, secData.block, false, secData.secKey);
          ctx.y += 4;
          const startNum = globalQNum + 1;
          const answerKey = this._drawQuestions(ctx, secData.questions, secData.dbType, startNum, secData.block.color);
          allAnswerKeys.push(...answerKey);
          allQuestionSets.push({ section: secData.section, block: secData.block, count: secData.questions.length, startNum, questions: secData.questions });
          globalQNum += secData.questions.length;
        }

        sectionPageMap.push({
          label: `${secData.block.label} · ${secData.section.label}`,
          startPage: sectionStartPage,
          endPage: pdf.getNumberOfPages(),
          color: this._getBlockColor(secData.block),
        });
      }

      // ===== ANTWORTBOGEN =====
      if (allAnswerKeys.length > 0) {
        await progress('Antwortbogen wird erstellt...', 88);
        pdf.addPage();
        ctx.y = ctx.margin;
        this._drawAnswerSheet(ctx, allQuestionSets);
      }

      // ===== LÖSUNGSSCHLÜSSEL =====
      await progress('Lösungsschlüssel wird erstellt...', 90);
      pdf.addPage();
      ctx.y = ctx.margin;
      this._drawAnswerKey(ctx, allAnswerKeys);

      // ===== FIGUREN LÖSUNGEN =====
      if (ctx._figurenData && ctx._figurenData.length > 0) {
        await progress('Figuren-Lösungen werden gezeichnet...', 92);
        for (const fg of ctx._figurenData) {
          this._drawFigurenSolutions(ctx, fg.data, fg.blockColor);
        }
      }

      // ===== ERKLÄRUNGEN =====
      const allQuestionsNumbered = [];
      for (const qs of allQuestionSets) {
        if (!qs.questions || !qs.startNum) continue;
        for (let qi = 0; qi < qs.questions.length; qi++) {
          allQuestionsNumbered.push({ ...qs.questions[qi], _globalNum: qs.startNum + qi });
        }
      }
      this._drawExplanations(ctx, allQuestionsNumbered);

      // ===== TABLE OF CONTENTS =====
      if (hasTOC && tocPageNum > 0 && sectionPageMap.length > 0) {
        this._drawTableOfContents(ctx, tocPageNum, sectionPageMap, allQuestionSets);
      }

      // Footers
      const pdfTitle = selectedParsed.length === 1 ? selectedParsed[0].section.label : 'MedAT-H Simulation';
      this._addFootersToAllPages(ctx, pdfTitle, sectionPageMap);

      // ===== SAVE SIMULATION TO DATABASE =====
      if (sections.length >= 3) {
        await progress('Simulation wird gespeichert...', 96);
        try {
          if (Auth.isLoggedIn && Auth.supabase) {
            const simTitle = `MedAT Simulation ${new Date().toLocaleDateString('de-AT')}`;
            const blockStructure = allQuestionSets.map(set => ({
              label: set.section?.label || 'Unbekannt',
              blockLabel: set.block?.label || '',
              blockColor: set.block?.color || '#666',
              blockWeight: set.block?.weight || 0,
              startNum: set.startNum,
              count: set.count,
              dbType: set.section?.dbType || '',
              isMemorize: set.isMemorize || false,
              isRanking: set.section?.isRanking || false,
            }));
            await Auth.supabase.from('user_simulations').insert({
              user_id: Auth.currentUser.id,
              title: simTitle,
              answer_key: allAnswerKeys,
              block_structure: blockStructure,
              total_questions: allAnswerKeys.length,
              status: 'generated',
            });
            App._incrementSimulationCount();
          }
        } catch (saveErr) { console.warn('[PDF] Simulation speichern fehlgeschlagen:', saveErr); }
      }

      await progress('PDF wird gespeichert...', 100);
      await new Promise(r => setTimeout(r, 400));

      const isSingleSection = selectedParsed.length === 1;
      const fileName = isSingleSection
        ? `MedAT_${selectedParsed[0].section.label.replace(/\s+/g, '_')}.pdf`
        : `MedAT_Simulation_${new Date().toISOString().slice(0, 10)}.pdf`;
      const pdfCategory = isSingleSection ? selectedParsed[0].sectionKey : 'simulation';
      const pdfType = isSingleSection ? 'single' : 'multi';
      const totalQuestions = selectedParsed.reduce((s, p) => s + (p.questions?.length || 0), 0);
      await this._saveWithPrompt(pdf, fileName, pdfCategory, pdfType, totalQuestions);
      this._trackPdfCreated();
      this._hideSimLoadingOverlay();
      this.closeDialog();
    } catch (err) {
      console.error('[PDF] FEHLER bei Schritt "' + currentStep + '":', err);
      this._hideSimLoadingOverlay();
      alert('Fehler beim Erstellen:\n\nSchritt: ' + currentStep + '\nFehler: ' + err.message);
    } finally {
      this._setLoading(false);
      this._hideSimLoadingOverlay();
    }
  },

  // =========================================================
  //  SINGLE SECTION PDF (legacy — kept for compatibility)
  // =========================================================
  async generateSinglePDF() {
    this._setLoading(true);
    this._showSimLoadingOverlay();
    const progress = async (step, pct) => {
      this._updateSimProgress(step, pct);
      await new Promise(r => setTimeout(r, 0));
    };
    try {
      const sectionVal = document.getElementById('pdf-section').value;
      const [blockId, secKey] = sectionVal.split('__');
      const block = CONFIG.TEST_BLOCKS[blockId];
      const section = block.sections[secKey];
      const difficulty = document.getElementById('pdf-difficulty').value;
      const count = parseInt(document.getElementById('pdf-count').value);

      await progress(`${section.label} wird vorbereitet...`, 5);

      let questions = [];
      const isFiguren = section.dbType === 'figur' && window.FigurenGenerator;

      if (!isFiguren) {
        await progress('Fragen werden geladen...', 15);
        questions = await API.getQuestions(
          section.dbType,
          difficulty === 'mixed' ? null : difficulty,
          count,
          section.dbSubtype
        );

        if (!questions || questions.length === 0) {
          this._hideSimLoadingOverlay();
          alert('Keine Fragen für diese Auswahl gefunden.');
          return;
        }
      }

      await progress('PDF-Dokument wird erstellt...', 25);
      const pdf = await this._createPDFDoc();
      const ctx = this._newContext(pdf);

      // Title page
      await progress('Deckblatt wird gestaltet...', 30);
      this._drawSectionTitlePage(ctx, section, block, difficulty, isFiguren ? count : questions.length);

      // Questions
      pdf.addPage();
      ctx.y = ctx.margin;

      await progress('Fragen werden ins PDF geschrieben...', 40);
      let answerKey;
      let figurenData = null;
      if (section.dbType === 'figur' && window.FigurenGenerator) {
        const result = this._drawFigurenQuestions(ctx, count, 1, block.color);
        answerKey = result.answerKey;
        figurenData = result.figurenData;
      } else {
        answerKey = this._drawQuestions(ctx, questions, section.dbType, 1, block.color);
      }

      // Answer key
      await progress('Lösungsschlüssel wird erstellt...', 80);
      pdf.addPage();
      ctx.y = ctx.margin;
      this._drawAnswerKey(ctx, answerKey);

      // Figuren: solutions + tips
      if (figurenData) {
        await progress('Figuren-Lösungen werden gezeichnet...', 85);
        this._drawFigurenSolutions(ctx, figurenData, block.color);
      }

      // Explanations (skip for figuren)
      if (section.dbType !== 'figur') {
        await progress('Erklärungen werden hinzugefügt...', 88);
        this._drawExplanations(ctx, questions);
      }

      // Footers with sidebar
      await progress('Layout wird finalisiert...', 94);
      const singlePageMap = [{
        label: `${block.label} · ${section.label}`,
        startPage: 2,
        endPage: pdf.getNumberOfPages(),
        color: this._getBlockColor(block),
      }];
      this._addFootersToAllPages(ctx, section.label, singlePageMap);

      await progress('PDF wird gespeichert...', 100);
      await new Promise(r => setTimeout(r, 400));
      const diffLabels = { easy: 'Leicht', medium: 'Mittel', hard: 'Schwer', mixed: 'Gemischt' };
      const fileCount = isFiguren ? count : questions.length;
      const singleFileName = `MedAT_${section.label.replace(/\s+/g, '_')}_${diffLabels[difficulty] || difficulty}_${fileCount}F.pdf`;
      await this._saveWithPrompt(pdf, singleFileName, secKey, 'single', fileCount);
      this._trackPdfCreated();
      this._hideSimLoadingOverlay();
      this.closeDialog();
    } catch (err) {
      console.error('[PDF-SINGLE] FEHLER:', err);
      if (err.stack) console.error('[PDF-SINGLE] Stack:', err.stack);
      this._hideSimLoadingOverlay();
      alert('Fehler beim PDF-Erstellen:\n\n' + err.message + '\n\n(Drücke F12 und schaue in die Konsole für mehr Details)');
    } finally {
      this._setLoading(false);
    }
  },

  // =========================================================
  //  SIMULATION PDF (full MedAT-H style)
  // =========================================================
  async generateSimulationPDF(customTitle = null) {
    this._setLoading(true);
    this._showSimLoadingOverlay();
    let currentStep = 'Initialisierung';
    // Progress helper that yields to browser for UI updates
    const progress = async (step, pct) => {
      currentStep = step;
      this._updateSimProgress(step, pct);
      await new Promise(r => setTimeout(r, 0)); // yield to browser
    };
    try {
      console.log('[PDF-SIM] Starte Simulation PDF...');

      await progress('PDF-Dokument wird vorbereitet...', 3);
      console.log('[PDF-SIM] Schritt: ' + currentStep);
      const pdf = await this._createPDFDoc();
      const ctx = this._newContext(pdf);
      const allAnswerKeys = [];
      const allQuestionSets = [];

      // ===== DECKBLATT =====
      await progress('Deckblatt wird gestaltet...', 5);
      console.log('[PDF-SIM] Schritt: ' + currentStep);
      this._drawSimCoverPage(ctx);

      // ===== ANWEISUNGEN =====
      await progress('Anweisungen werden geschrieben...', 8);
      console.log('[PDF-SIM] Schritt: ' + currentStep);
      pdf.addPage();
      ctx.y = ctx.margin;
      this._drawInstructionsPage(ctx);

      // Reserve TOC page for full simulation
      pdf.addPage();
      const simTocPageNum = pdf.getNumberOfPages();
      ctx.y = ctx.margin;

      // ===== LOAD ALL QUESTIONS =====
      const sections = [];

      // BMS
      await progress('BMS-Fragen werden geladen...', 12);
      console.log('[PDF-SIM] Schritt: ' + currentStep);
      const bms = CONFIG.TEST_BLOCKS.bms;
      if (bms.available !== false) {
        for (const [secKey, sec] of Object.entries(bms.sections)) {
          if (sec.available === false) continue;
          try {
            console.log(`[PDF-SIM] Lade BMS/${sec.label}...`);
            const qs = await API.getQuestions(sec.dbType, null, sec.questions, sec.dbSubtype);
            console.log(`[PDF-SIM] BMS/${sec.label}: ${qs ? qs.length : 0} Fragen`);
            if (qs && qs.length > 0) {
              sections.push({ block: bms, section: sec, secKey, questions: qs, dbType: sec.dbType });
            }
          } catch (e) {
            console.error(`[PDF-SIM] BMS ${sec.label} FEHLER:`, e);
          }
        }
      }

      // TV - use pre-generated texts from DB (no API calls)
      await progress('TV-Texte werden geladen...', 20);
      console.log('[PDF-SIM] TV aus pre_generated_tv laden');
      const tv = CONFIG.TEST_BLOCKS.tv;
      if (tv && tv.available !== false) {
        for (const [secKey, sec] of Object.entries(tv.sections)) {
          if (sec.available === false) continue;
          if (sec.isAIGenerated) {
            try {
              const textCount = sec.textCount || 4;
              const questionsPerText = sec.questionsPerText || 3;
              // Load from pre_generated_tv table
              const { data: preTexts, error } = await Auth.supabase
                .from('pre_generated_tv')
                .select('*')
                .order('times_used', { ascending: true })
                .limit(textCount * 3);

              if (!error && preTexts && preTexts.length > 0) {
                // Shuffle and pick textCount
                const shuffled = preTexts.sort(() => Math.random() - 0.5).slice(0, textCount);
                const allTexts = shuffled.map(t => ({
                  title: (t.text_content || '').substring(0, 80).split('.')[0] || 'Text',
                  content: t.text_content,
                  questions: typeof t.questions === 'string' ? JSON.parse(t.questions) : t.questions,
                }));

                if (allTexts.length > 0) {
                  sections.push({ block: tv, section: sec, secKey, tvTexts: allTexts, dbType: 'textverstaendnis', isTVSection: true });
                  console.log(`[PDF-SIM] TV: ${allTexts.length} pre-generated Texte geladen`);
                  // Update usage counter
                  shuffled.forEach(t => {
                    Auth.supabase.from('pre_generated_tv').update({ times_used: (t.times_used || 0) + 1 }).eq('id', t.id).then(() => {});
                  });
                }
              } else {
                console.warn('[PDF-SIM] Keine vorgenierten TV-Texte gefunden');
              }
            } catch (e) {
              console.error('[PDF-SIM] TV-Texte Fehler:', e);
            }
          }
        }
      }

      // KFF (in correct order, skip memorize/recall as special)
      await progress('KFF-Fragen werden geladen...', 48);
      console.log('[PDF-SIM] Schritt: ' + currentStep);
      const kff = CONFIG.TEST_BLOCKS.kff;
      if (kff.available !== false) {
        for (const secKey of CONFIG.KFF_SECTION_ORDER) {
          const sec = kff.sections[secKey];
          if (!sec || sec.available === false) continue;

          if (sec.isMemorize) {
            // Generate memorize cards
            sections.push({ block: kff, section: sec, secKey, isMemorize: true, cards: App.generateMemorizeCards(8), dbType: 'memorize' });
          } else if (sec.isRecall) {
            // Generate recall questions from the memorize cards
            const memSection = sections.find(s => s.isMemorize);
            if (memSection) {
              const recallQs = App.generateRecallQuestions(memSection.cards, sec.questions);
              sections.push({ block: kff, section: sec, secKey, questions: recallQs, dbType: 'allergieausweis_frage' });
            }
          } else if (sec.dbType === 'figur' && typeof FigurenGenerator !== 'undefined') {
            // Figuren are generated client-side, no API call needed
            sections.push({ block: kff, section: sec, secKey, questions: [], dbType: 'figur', isFiguren: true });
            console.log('[PDF-SIM] Figuren zusammensetzen: wird client-seitig generiert');
          } else {
            try {
              const qs = await API.getQuestions(sec.dbType, null, sec.questions, sec.dbSubtype);
              if (qs && qs.length > 0) {
                sections.push({ block: kff, section: sec, secKey, questions: qs, dbType: sec.dbType });
              }
            } catch (e) {
              console.error(`KFF ${sec.label} konnte nicht geladen werden:`, e);
            }
          }
        }
      }

      // SEK - use pre-generated questions from DB (no API calls)
      await progress('SEK-Fragen werden geladen...', 55);
      currentStep = 'SEK-Fragen laden (DB)';
      console.log('[PDF-SIM] SEK aus pre_generated_sek laden');
      const sek = CONFIG.TEST_BLOCKS.sek;
      if (sek && sek.available !== false) {
        const sekOrder = CONFIG.SEK_SECTION_ORDER || Object.keys(sek.sections);
        for (const secKey of sekOrder) {
          const sec = sek.sections[secKey];
          if (!sec || sec.available === false) continue;
          if (sec.isAIGenerated) {
            try {
              currentStep = `SEK/${sec.label} laden (DB)`;
              console.log(`[PDF-SIM] Lade SEK/${sec.label} aus pre_generated_sek...`);
              const { data: preQs, error } = await Auth.supabase
                .from('pre_generated_sek')
                .select('*')
                .eq('sek_type', sec.dbSubtype)
                .order('times_used', { ascending: true })
                .limit(sec.questions * 3);

              if (!error && preQs && preQs.length > 0) {
                // Shuffle and pick
                const shuffled = preQs.sort(() => Math.random() - 0.5).slice(0, sec.questions);
                const sekQs = shuffled.map((q, idx) => {
                  const qData = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;
                  return {
                    id: `sek-${sec.dbSubtype}-${idx}`,
                    type: sec.dbType,
                    subtype: sec.dbSubtype,
                    content: {
                      scenario: qData.scenario || '',
                      person: qData.person || '',
                      question: qData.question,
                      options: qData.options,
                      correct: qData.correct,
                      correct_ranking: qData.correct_ranking,
                      explanation: qData.explanation || '',
                    }
                  };
                });
                sections.push({
                  block: sek, section: sec, secKey, questions: sekQs,
                  dbType: sec.dbType, isSEKSection: true, isRanking: sec.isRanking || false
                });
                console.log(`[PDF-SIM] SEK/${sec.label}: ${sekQs.length} pre-generated Fragen geladen`);
                // Update usage
                shuffled.forEach(q => {
                  Auth.supabase.from('pre_generated_sek').update({ times_used: (q.times_used || 0) + 1 }).eq('id', q.id).then(() => {});
                });
              } else {
                console.warn(`[PDF-SIM] SEK/${sec.label}: Keine vorgenierten Fragen gefunden`);
              }
            } catch (e) {
              console.error(`[PDF-SIM] SEK ${sec.label} FEHLER:`, e);
              // Don't throw - continue with other sections
            }
          }
        }
      }

      if (sections.length === 0) {
        throw new Error('Keine Sektionen konnten geladen werden. Bitte prüfe deine Internetverbindung.');
      }

      // ===== RENDER EACH SECTION =====
      await progress('Fragen werden ins PDF geschrieben...', 70);
      console.log(`[PDF-SIM] ${sections.length} Sektionen geladen, starte Rendering...`);
      let globalQNum = 0;
      const sectionPageMap = [];

      for (let si = 0; si < sections.length; si++) {
        const secData = sections[si];
        await progress(`${secData.section.label} wird gerendert...`, 70 + Math.round(18 * (si / sections.length)));
        currentStep = `Render: ${secData.section.label}`;
        pdf.addPage();
        ctx.y = ctx.margin;
        const sectionStartPage = pdf.getNumberOfPages();

        // Track current section for sidebar labels
        ctx.currentSection = secData.section.label;
        ctx.currentBlock = secData.block.label;
        ctx.currentBlockColor = secData.block.color;

        if (secData.isMemorize) {
          // Allergieausweis memorize cards
          this._drawSectionHeader(ctx, secData.section, secData.block, true, secData.secKey);
          await this._drawMemorizeCards(ctx, secData.cards);
          allQuestionSets.push({ section: secData.section, block: secData.block, count: 0, isMemorize: true });
        } else if (secData.isTVSection) {
          // Textverständnis: texts with embedded questions
          this._drawSectionHeader(ctx, secData.section, secData.block, false, secData.secKey);
          ctx.y += 4;
          const startNum = globalQNum + 1;
          const tvAnswerKey = this._drawTVTexts(ctx, secData.tvTexts, startNum, secData.block.color);
          const tvCount = secData.tvTexts.reduce((sum, t) => sum + (t.questions ? t.questions.length : 0), 0);
          allAnswerKeys.push(...tvAnswerKey);
          // Build flat question array for explanations
          const tvFlatQs = [];
          for (const txt of secData.tvTexts) {
            for (const tq of (txt.questions || [])) {
              tvFlatQs.push({ content: tq });
            }
          }
          allQuestionSets.push({ section: secData.section, block: secData.block, count: tvCount, startNum, questions: tvFlatQs });
          globalQNum += tvCount;
        } else if (secData.isSEKSection) {
          // SEK: AI-generated questions (EE/ER as MC, SE as ranking)
          this._drawSectionHeader(ctx, secData.section, secData.block, false, secData.secKey);
          ctx.y += 4;
          const startNum = globalQNum + 1;
          const sekAnswerKey = this._drawSEKQuestions(ctx, secData.questions, secData.isRanking, startNum, secData.block.color, secData.dbType);
          allAnswerKeys.push(...sekAnswerKey);
          allQuestionSets.push({ section: secData.section, block: secData.block, count: secData.questions.length, startNum, questions: secData.questions });
          globalQNum += secData.questions.length;
        } else if (secData.dbType === 'figur' && window.FigurenGenerator) {
          // Figuren zusammensetzen: generate client-side
          this._drawSectionHeader(ctx, secData.section, secData.block, false, secData.secKey);
          ctx.y += 4;
          const startNum = globalQNum + 1;
          const figCount = secData.section.questions || 15;
          const figResult = this._drawFigurenQuestions(ctx, figCount, startNum, secData.block.color);
          allAnswerKeys.push(...figResult.answerKey);
          // Store figuren data for solution rendering later
          if (!ctx._figurenData) ctx._figurenData = [];
          ctx._figurenData.push({ data: figResult.figurenData, blockColor: secData.block.color });
          allQuestionSets.push({ section: secData.section, block: secData.block, count: figCount, startNum });
          globalQNum += figCount;
        } else {
          // Questions section
          this._drawSectionHeader(ctx, secData.section, secData.block, false, secData.secKey);
          ctx.y += 4;
          const startNum = globalQNum + 1;
          const answerKey = this._drawQuestions(ctx, secData.questions, secData.dbType, startNum, secData.block.color);
          allAnswerKeys.push(...answerKey);
          allQuestionSets.push({ section: secData.section, block: secData.block, count: secData.questions.length, startNum, questions: secData.questions });
          globalQNum += secData.questions.length;
        }

        // Track page range for sidebar labels
        sectionPageMap.push({
          label: `${secData.block.label} · ${secData.section.label}`,
          startPage: sectionStartPage,
          endPage: pdf.getNumberOfPages(),
          color: this._getBlockColor(secData.block),
        });
      }

      // ===== ANTWORTBOGEN (after all questions, can span multiple pages) =====
      await progress('Antwortbogen wird erstellt...', 90);
      console.log('[PDF-SIM] Schritt: Antwortbogen');
      pdf.addPage();
      ctx.y = ctx.margin;
      this._drawAnswerSheet(ctx, allQuestionSets);

      // ===== LÖSUNGSSCHLÜSSEL =====
      await progress('Lösungsschlüssel wird erstellt...', 92);
      currentStep = 'Lösungsschlüssel';
      pdf.addPage();
      ctx.y = ctx.margin;
      this._drawAnswerKey(ctx, allAnswerKeys);

      // ===== FIGUREN LÖSUNGEN =====
      if (ctx._figurenData && ctx._figurenData.length > 0) {
        await progress('Figuren-Lösungen werden gezeichnet...', 94);
        for (const fg of ctx._figurenData) {
          this._drawFigurenSolutions(ctx, fg.data, fg.blockColor);
        }
      }

      // ===== ERKLÄRUNGEN =====
      // Build questions with correct global numbering from allQuestionSets
      const allQuestionsNumbered = [];
      for (const qs of allQuestionSets) {
        if (!qs.questions || !qs.startNum) continue;
        for (let qi = 0; qi < qs.questions.length; qi++) {
          allQuestionsNumbered.push({ ...qs.questions[qi], _globalNum: qs.startNum + qi });
        }
      }
      this._drawExplanations(ctx, allQuestionsNumbered);

      // ===== TABLE OF CONTENTS for full simulation =====
      if (simTocPageNum > 0 && sectionPageMap.length > 0) {
        this._drawTableOfContents(ctx, simTocPageNum, sectionPageMap, allQuestionSets);
      }

      // Footers with sidebar labels
      this._addFootersToAllPages(ctx, customTitle || 'MedAT-H Simulation', sectionPageMap);

      // ===== SAVE SIMULATION TO DATABASE =====
      await progress('Simulation wird in deinem Konto gespeichert...', 96);
      try {
        if (Auth.isLoggedIn && Auth.supabase) {
          const simTitle = customTitle || `MedAT-H Simulation ${new Date().toLocaleDateString('de-AT')}`;
          // Build block structure for scoring
          const blockStructure = allQuestionSets.map(set => ({
            label: set.section?.label || 'Unbekannt',
            blockLabel: set.block?.label || '',
            blockColor: set.block?.color || '#666',
            blockWeight: set.block?.weight || 0,
            startNum: set.startNum,
            count: set.count,
            dbType: set.section?.dbType || '',
            isMemorize: set.isMemorize || false,
            isRanking: set.section?.isRanking || false,
          }));

          const { error: simErr } = await Auth.supabase
            .from('user_simulations')
            .insert({
              user_id: Auth.currentUser.id,
              title: simTitle,
              answer_key: allAnswerKeys,
              block_structure: blockStructure,
              total_questions: allAnswerKeys.length,
              status: 'generated',
            });
          if (simErr) console.warn('[PDF-SIM] Simulation speichern fehlgeschlagen:', simErr);
          else console.log('[PDF-SIM] Simulation gespeichert!');
        }
      } catch (saveErr) {
        console.warn('[PDF-SIM] Simulation speichern fehlgeschlagen:', saveErr);
      }

      await progress('PDF wird gespeichert...', 100);
      // Small delay so user sees 100%
      await new Promise(r => setTimeout(r, 400));
      const simFileName = customTitle ? `MedAT_${customTitle.replace(/\\s+/g, '_')}.pdf` : `MedAT_Simulation_${new Date().toISOString().slice(0, 10)}.pdf`;
      await this._saveWithPrompt(pdf, simFileName, 'simulation', 'simulation', allAnswerKeys?.length || 0);
      this._trackPdfCreated();
      this._trackSimulationCompleted();
      this._hideSimLoadingOverlay();
      this.closeDialog();
    } catch (err) {
      console.error('[PDF-SIM] FEHLER bei Schritt "' + currentStep + '":', err);
      if (err.stack) console.error('[PDF-SIM] Stack:', err.stack);
      this._hideSimLoadingOverlay();
      alert('Fehler beim Erstellen der Simulation:\n\nSchritt: ' + currentStep + '\nFehler: ' + err.message + '\n\n(Drücke F12 und schaue in die Konsole für mehr Details)');
    } finally {
      this._setLoading(false);
      this._hideSimLoadingOverlay();
    }
  },

  // Alias for admin batch generation
  async generateAdminSimulationPDF(title) {
    return this.generateSimulationPDF(title);
  },

  // =========================================================
  //  PDF DRAWING HELPERS
  // =========================================================

  async _createPDFDoc() {
    // Load Unicode fonts - retry once if first attempt fails
    await this._loadFonts();
    if (!this._fontCache) {
      console.warn('Font-Laden fehlgeschlagen, versuche erneut...');
      this._fontLoading = false;
      this._fontCache = null;
      await this._loadFonts();
    }
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const fontsRegistered = this._registerFonts(pdf);
    if (!fontsRegistered) {
      // Font failed even after retry - this will cause Umlaut issues
      console.error('WARNUNG: DejaVu Sans konnte nicht geladen werden! Umlaute werden nicht korrekt dargestellt.');
      alert('Hinweis: Die Unicode-Schriftart konnte nicht geladen werden. Umlaute (ö, ä, ü) werden möglicherweise nicht korrekt angezeigt. Bitte lade die Seite neu und versuche es erneut.');
      pdf.setFont('helvetica', 'normal');
    }
    return pdf;
  },

  _newContext(pdf) {
    return {
      pdf,
      margin: 25,       // wider left margin for sidebar label
      marginRight: 15,
      pageW: 210,
      pageH: 297,
      contentW: 210 - 25 - 15,  // adjusted for asymmetric margins
      y: 25,
      currentSection: null,   // tracks which section we're in for sidebar
      currentBlock: null,
    };
  },

  // ===== ICON EMOJI MAP (for PDF headers since jsPDF can't render SVG) =====
  _sectionIcons: {
    biologie: '\u{1F9EC}',      // 🧬 → we use text "BIO" with color dot
    chemie: '\u{1F9EA}',
    physik: '\u{269B}',
    mathematik: '\u{1F4D0}',
    textverstaendnis: '\u{1F4D6}',
    figuren: '\u{1F9E9}',
    allergieausweis_mem: '\u{1F4CB}',
    zahlenfolge: '\u{0023}',
    wortfluessigkeit: '\u{1F524}',
    allergieausweis_abruf: '\u{2705}',
    implikation: '\u{1F9E0}',
    emotionen_erkennen: '\u{1F441}',
    emotionen_regulieren: '\u{1F60A}',
    soziales_entscheiden: '\u{1F465}',
  },

  // Text-based icon labels for PDF (since emoji may not render in DejaVu)
  _sectionIconLabels: {
    biologie:    { symbol: '\u25CF', label: 'BIO' },
    chemie:      { symbol: '\u25CF', label: 'CHE' },
    physik:      { symbol: '\u25CF', label: 'PHY' },
    mathematik:  { symbol: '\u25CF', label: 'MAT' },
    textverstaendnis: { symbol: '\u25CF', label: 'TV' },
    figuren:     { symbol: '\u25A0', label: 'FIG' },
    allergieausweis_mem: { symbol: '\u25CF', label: 'AA+' },
    zahlenfolge: { symbol: '\u25CF', label: 'ZF' },
    wortfluessigkeit:   { symbol: '\u25CF', label: 'WF' },
    allergieausweis_abruf: { symbol: '\u25CF', label: 'AA' },
    implikation: { symbol: '\u25CF', label: 'IMP' },
    emotionen_erkennen:   { symbol: '\u25CF', label: 'EE' },
    emotionen_regulieren: { symbol: '\u25CF', label: 'ER' },
    soziales_entscheiden: { symbol: '\u25CF', label: 'SE' },
  },

  // Block colors from CONFIG
  _getBlockColor(block) {
    if (!block || !block.color) return { r: 26, g: 26, b: 46 };
    return this._hexToRGB(block.color);
  },

  // ===== FUN LOADING OVERLAY with MedAT Tips =====
  _medatTips: [
    // Allgemeine MedAT-Tipps & Lernstrategien
    { icon: '⏱️', text: 'Zeitmanagement ist King: Markiere unsichere Fragen und komm am Ende zurück.' },
    { icon: '🎯', text: 'MedAT-Tipp: Bei Implikationen immer erst die Kontraposition prüfen — das spart Zeit!' },
    { icon: '💡', text: 'MedAT-Tipp: Bei den Allergieausweisen eine Geschichte erfinden — so merkst du dir die Daten viel besser!' },
    { icon: '📐', text: 'Figuren-Trick: Zähle die Ecken der Einzelteile — die Gesamtfigur hat weniger Ecken als die Summe.' },
    { icon: '🔄', text: 'MedAT-Tipp: Teile werden nur GEDREHT, nie gespiegelt. Das schließt viele Optionen aus!' },
    { icon: '🧪', text: 'Lern-Tipp: Enzyme enden auf „-ase" und Zucker auf „-ose" — klingt simpel, hilft aber enorm.' },
    { icon: '📖', text: 'TV-Strategie: Lies erst die Fragen, DANN den Text. So weißt du, worauf du achten musst.' },
    { icon: '😴', text: 'Der wichtigste MedAT-Tipp: Die Nacht davor gut schlafen > Last-Minute-Lernen.' },
    { icon: '✏️', text: 'MedAT-Tipp: Wortflüssigkeit trainierst du am besten mit Kreuzworträtseln und Scrabble.' },
    { icon: '📚', text: 'MedAT-Tipp: BMS macht 40% der Gesamtpunkte aus — die Naturwissenschaften sind der Schlüssel.' },
    { icon: '🧠', text: 'Tipp: Übe Figuren-Aufgaben immer mit Timer — so bereitest du dich auf den Zeitdruck vor!' },
    // Motivation & Auflockerung
    { icon: '☕', text: 'Dein PDF wird gerade zusammengebaut — lehn dich kurz zurück!' },
    { icon: '🧩', text: 'Figuren zusammensetzen ist wie Tetris — nur stressiger und ohne Musik.' },
    { icon: '🎲', text: 'Tipp: Raten hat eine 20% Chance bei 5 Optionen. Besser als 0% bei leer lassen!' },
    { icon: '🫁', text: 'Atme tief durch: 4 Sekunden ein, 7 halten, 8 aus. Hilft gegen Prüfungsangst!' },
    { icon: '🏆', text: 'Jede Übungsaufgabe bringt dich näher ans Ziel. Du schaffst das!' },
    { icon: '🍫', text: 'Dein Gehirn verbraucht ~20% deiner täglichen Energie — vergiss die Snacks nicht beim Lernen!' },
  ],

  _loadingState: null,

  _setLoading(loading) {
    const btnText = document.getElementById('pdf-btn-text');
    const btnLoad = document.getElementById('pdf-btn-loading');
    const btn = document.getElementById('pdf-generate');
    if (btnText) btnText.classList.toggle('hidden', loading);
    if (btnLoad) btnLoad.classList.toggle('hidden', !loading);
    if (btn) btn.disabled = loading;
  },

  _showSimLoadingOverlay() {
    // Remove existing
    this._hideSimLoadingOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'sim-loading-overlay';
    overlay.innerHTML = `
      <style>
        #sim-loading-overlay {
          position: fixed; inset: 0; z-index: 10001;
          background: rgba(26,26,46,0.88);
          display: flex; align-items: center; justify-content: center;
          animation: simFadeIn 0.3s ease;
        }
        @keyframes simFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .sim-loading-card {
          background: #fff; border-radius: 20px; padding: 36px 40px 28px;
          max-width: 520px; width: 90%; text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .sim-loading-title {
          font-size: 18px; font-weight: 700; color: #1a1a2e;
          margin-bottom: 6px;
        }
        .sim-loading-step {
          font-size: 13px; color: #888; margin-bottom: 18px;
          min-height: 18px; transition: all 0.3s;
        }
        .sim-loading-bar-wrap {
          background: #f0eef5; border-radius: 10px; height: 10px;
          overflow: hidden; margin-bottom: 16px;
        }
        .sim-loading-bar {
          height: 100%; border-radius: 10px; transition: width 0.5s ease;
          background: linear-gradient(90deg, #9b7fc4, #6db88a, #e0a820);
          background-size: 300% 100%;
          animation: simBarShimmer 2s ease infinite;
        }
        @keyframes simBarShimmer {
          0% { background-position: 0% 0; }
          50% { background-position: 100% 0; }
          100% { background-position: 0% 0; }
        }
        .sim-loading-timer {
          font-size: 28px; font-weight: 300; color: #9b7fc4;
          font-variant-numeric: tabular-nums; margin-bottom: 18px;
          letter-spacing: 2px;
        }
        .sim-loading-tip {
          background: #f8f6fc; border-radius: 12px; padding: 14px 18px;
          min-height: 56px; display: flex; align-items: center; gap: 12px;
          text-align: left; transition: all 0.5s ease;
        }
        .sim-loading-tip-icon { font-size: 28px; flex-shrink: 0; }
        .sim-loading-tip-text {
          font-size: 13px; color: #444; line-height: 1.5;
        }
        .sim-tip-fade { animation: simTipFade 0.5s ease; }
        @keyframes simTipFade {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .sim-loading-emoji-spin {
          font-size: 42px; margin-bottom: 12px;
          animation: simSpin 3s linear infinite;
          display: inline-block;
        }
        @keyframes simSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
      <div class="sim-loading-card">
        <div class="sim-loading-emoji-spin">⚙️</div>
        <div class="sim-loading-title">Dein PDF wird erstellt</div>
        <div class="sim-loading-step" id="sim-load-step">Initialisierung...</div>
        <div class="sim-loading-bar-wrap">
          <div class="sim-loading-bar" id="sim-load-bar" style="width: 2%"></div>
        </div>
        <div class="sim-loading-timer" id="sim-load-timer">00:00</div>
        <div style="font-size:12px;color:#999;margin-bottom:14px;">Dies kann bis zu 3 Minuten dauern</div>
        <div class="sim-loading-tip" id="sim-load-tip">
          <span class="sim-loading-tip-icon">📚</span>
          <span class="sim-loading-tip-text">Dein Testheft wird zusammengebaut...</span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Start timer
    const startTime = Date.now();
    const timerEl = document.getElementById('sim-load-timer');
    this._loadingState = {
      startTime,
      tipIdx: 0,
      timerInterval: setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const s = String(elapsed % 60).padStart(2, '0');
        if (timerEl) timerEl.textContent = `${m}:${s}`;
      }, 1000),
      tipInterval: setInterval(() => {
        this._rotateTip();
      }, 5000),
    };

    // Show first tip immediately
    setTimeout(() => this._rotateTip(), 500);
  },

  _rotateTip() {
    const tipEl = document.getElementById('sim-load-tip');
    if (!tipEl || !this._loadingState) return;

    const tips = this._medatTips;
    const idx = this._loadingState.tipIdx % tips.length;
    this._loadingState.tipIdx++;

    tipEl.classList.remove('sim-tip-fade');
    void tipEl.offsetWidth; // force reflow
    tipEl.innerHTML = `
      <span class="sim-loading-tip-icon">${tips[idx].icon}</span>
      <span class="sim-loading-tip-text">${tips[idx].text}</span>
    `;
    tipEl.classList.add('sim-tip-fade');
  },

  _updateSimProgress(step, percent) {
    const stepEl = document.getElementById('sim-load-step');
    const barEl = document.getElementById('sim-load-bar');
    if (stepEl) stepEl.textContent = step;
    if (barEl) barEl.style.width = Math.min(percent, 100) + '%';
  },

  _hideSimLoadingOverlay() {
    if (this._loadingState) {
      clearInterval(this._loadingState.timerInterval);
      clearInterval(this._loadingState.tipInterval);
      this._loadingState = null;
    }
    const el = document.getElementById('sim-loading-overlay');
    if (el) el.remove();
  },

  _checkPage(ctx, needed) {
    if (ctx.y + needed > ctx.pageH - 18) {
      ctx.pdf.addPage();
      ctx.y = ctx.margin;
      return true;
    }
    return false;
  },

  _drawLine(ctx, x1, yPos, x2) {
    ctx.pdf.setDrawColor(180);
    ctx.pdf.setLineWidth(0.3);
    ctx.pdf.line(x1, yPos, x2, yPos);
  },

  _clean(text) {
    if (!text) return '';
    return String(text)
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
      .replace(/<[^>]+>/g, '')
      // Remove emoji (jsPDF even with DejaVu can't render emoji codepoints)
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
      .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
      .replace(/\u200D/g, '')
      // Fix Unicode chars that cause jsPDF width-calculation bugs (wide spacing)
      // Subscript digits → regular digits
      .replace(/[\u2080]/g, '0').replace(/[\u2081]/g, '1').replace(/[\u2082]/g, '2')
      .replace(/[\u2083]/g, '3').replace(/[\u2084]/g, '4').replace(/[\u2085]/g, '5')
      .replace(/[\u2086]/g, '6').replace(/[\u2087]/g, '7').replace(/[\u2088]/g, '8')
      .replace(/[\u2089]/g, '9')
      // Superscript digits beyond Latin-1 (² and ³ are fine, they're Latin-1)
      .replace(/[\u2070]/g, '0').replace(/[\u00B9]/g, '1')
      .replace(/[\u2074]/g, '4').replace(/[\u2075]/g, '5').replace(/[\u2076]/g, '6')
      .replace(/[\u2077]/g, '7').replace(/[\u2078]/g, '8').replace(/[\u2079]/g, '9')
      .replace(/[\u207A]/g, '+').replace(/[\u207B]/g, '-').replace(/[\u207F]/g, 'n')
      // Math operators that cause width issues
      .replace(/\u2192/g, ' -> ')   // → arrow
      .replace(/\u2191/g, '^')      // ↑ up arrow
      .replace(/\u221A/g, 'sqrt')   // √
      .replace(/\u221E/g, 'inf')    // ∞
      .replace(/\u2248/g, '~')      // ≈
      .replace(/\u2260/g, '!=')     // ≠
      .replace(/\u2264/g, '<=')     // ≤
      .replace(/\u2265/g, '>=')     // ≥
      // Greek letters → Latin equivalents
      .replace(/\u03B1/g, 'alpha').replace(/\u03B2/g, 'beta').replace(/\u03B3/g, 'gamma')
      .replace(/\u03BB/g, 'lambda').replace(/\u03C0/g, 'pi').replace(/\u03C1/g, 'rho')
      .replace(/\u03BC/g, 'mu').replace(/\u03B4/g, 'delta').replace(/\u03B5/g, 'epsilon');
  },

  // ===== COVER PAGES =====

  _drawSimCoverPage(ctx) {
    const { pdf, pageW, pageH, margin, contentW } = ctx;

    // Blue header band
    pdf.setFillColor(26, 26, 46);
    pdf.rect(0, 0, pageW, 75, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(32);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.text('MedAT-H', pageW / 2, 32, { align: 'center' });

    pdf.setFontSize(14);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.text('Medizinischer Aufnahmetest — Humanmedizin', pageW / 2, 44, { align: 'center' });

    pdf.setFontSize(11);
    pdf.text('Übungssimulation', pageW / 2, 56, { align: 'center' });

    pdf.setFontSize(10);
    pdf.text(`Erstellt am ${new Date().toLocaleDateString('de-AT')}`, pageW / 2, 66, { align: 'center' });

    // Test overview box
    ctx.y = 90;
    pdf.setTextColor(30);
    pdf.setFillColor(240, 235, 225);
    pdf.roundedRect(margin, ctx.y, contentW, 80, 3, 3, 'F');

    ctx.y += 8;
    pdf.setFontSize(13);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.text('Testaufbau', margin + 8, ctx.y);
    ctx.y += 8;

    pdf.setFontSize(10);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(60);

    const rows = [
      ['Testteil', 'Aufgaben', 'Zeit', 'Gewichtung'],
      ['BMS – Basiskenntnistest', '94', '75 min', '40%'],
      ['TV – Textverständnis', '12', '35 min', '10%'],
      ['KFF – Zahlenfolgen', '10', '15 min', ''],
      ['KFF – Wortflüssigkeit', '15', '20 min', ''],
      ['KFF – Allergieausweise (Einprägen)', '8 Karten', '8 min', ''],
      ['KFF – Allergieausweise (Abruf)', '25', '15 min', ''],
      ['KFF – Implikationen', '10', '10 min', '40%'],
    ];

    // Header
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(30);
    const colX = [margin + 8, margin + 95, margin + 120, margin + 148];
    pdf.text(rows[0][0], colX[0], ctx.y);
    pdf.text(rows[0][1], colX[1], ctx.y);
    pdf.text(rows[0][2], colX[2], ctx.y);
    pdf.text(rows[0][3], colX[3], ctx.y);
    ctx.y += 2;
    this._drawLine(ctx, margin + 6, ctx.y, margin + contentW - 6);
    ctx.y += 5;

    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(60);
    for (let i = 1; i < rows.length; i++) {
      pdf.text(rows[i][0], colX[0], ctx.y);
      pdf.text(rows[i][1], colX[1], ctx.y);
      pdf.text(rows[i][2], colX[2], ctx.y);
      if (rows[i][3]) {
        pdf.setFont('DejaVuSans', 'bold');
        pdf.text(rows[i][3], colX[3], ctx.y);
        pdf.setFont('DejaVuSans', 'normal');
      }
      ctx.y += 5.5;
    }

    // Candidate info box
    ctx.y = 185;
    pdf.setDrawColor(180);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, ctx.y, contentW, 45);

    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text('Name: _____________________________________________', margin + 8, ctx.y + 12);
    pdf.text('Datum: ____________________________________________', margin + 8, ctx.y + 24);
    pdf.text('Startzeit: __________   Endzeit: __________', margin + 8, ctx.y + 36);

    // Bottom notice
    ctx.y = 250;
    pdf.setFontSize(9);
    pdf.setTextColor(120);
    const notice = 'Dieses Dokument ist ein Übungstool und kein offizielles MedAT-Testdokument. Die Struktur orientiert sich am echten Testformat.';
    const noticeLines = pdf.splitTextToSize(notice, contentW - 20);
    pdf.text(noticeLines, pageW / 2, ctx.y, { align: 'center' });
  },

  _drawSectionTitlePage(ctx, section, block, difficulty, count) {
    const { pdf, pageW } = ctx;
    const diffLabels = { easy: 'Leicht', medium: 'Mittel', hard: 'Schwer', mixed: 'Gemischt' };

    ctx.y = 50;
    pdf.setFontSize(26);
    pdf.setTextColor(26, 26, 46);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.text('MedAT Trainer', pageW / 2, ctx.y, { align: 'center' });

    ctx.y += 14;
    pdf.setFontSize(18);
    pdf.setTextColor(50);
    pdf.text(this._clean(section.label), pageW / 2, ctx.y, { align: 'center' });

    ctx.y += 10;
    pdf.setFontSize(11);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(120);
    pdf.text(`${block.label} · ${diffLabels[difficulty] || difficulty} · ${count} Fragen · ${section.minutes} Minuten`, pageW / 2, ctx.y, { align: 'center' });

    ctx.y += 7;
    pdf.text(`Erstellt am ${new Date().toLocaleDateString('de-AT')}`, pageW / 2, ctx.y, { align: 'center' });
  },

  _drawTableOfContents(ctx, tocPageNum, sectionPageMap, allQuestionSets) {
    const { pdf, margin, contentW, pageW } = ctx;

    // Go to the reserved TOC page
    pdf.setPage(tocPageNum);

    let y = margin;

    // Title
    pdf.setFontSize(18);
    pdf.setTextColor(26, 26, 46);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.text('Inhaltsverzeichnis', margin, y);
    y += 5;

    // Decorative line
    pdf.setDrawColor(245, 197, 66);
    pdf.setLineWidth(0.8);
    pdf.line(margin, y, margin + 50, y);
    y += 10;

    // Group sections by block
    const blockGroups = {};
    const blockOrder = [];
    for (const entry of sectionPageMap) {
      // Find matching question set for count
      const matchSet = allQuestionSets.find(qs =>
        entry.label.includes(qs.section?.label) || entry.label.includes(qs.block?.label)
      );
      const count = matchSet?.count || 0;

      // Extract block name (everything before " · ")
      const blockName = entry.label.split(' · ')[0] || entry.label;
      if (!blockGroups[blockName]) {
        blockGroups[blockName] = [];
        blockOrder.push(blockName);
      }
      blockGroups[blockName].push({ ...entry, questionCount: count });
    }

    for (const blockName of blockOrder) {
      const entries = blockGroups[blockName];
      const blockColor = entries[0]?.color || { r: 100, g: 100, b: 100 };

      // Block header with colored bar
      pdf.setFillColor(blockColor.r, blockColor.g, blockColor.b);
      pdf.roundedRect(margin, y - 3.5, contentW, 9, 2, 2, 'F');
      pdf.setFontSize(10);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text(blockName, margin + 4, y + 2.5);
      y += 11;

      // Section entries
      for (const entry of entries) {
        const sectionName = entry.label.split(' · ').slice(1).join(' · ') || entry.label;
        const pageText = `Seite ${entry.startPage}`;
        const countText = entry.questionCount > 0 ? `${entry.questionCount} Fragen` : '';

        // Section name
        pdf.setFontSize(9);
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setTextColor(60, 60, 80);
        pdf.text(sectionName, margin + 6, y);

        // Question count (centered)
        if (countText) {
          pdf.setFontSize(7.5);
          pdf.setTextColor(140, 140, 160);
          const countX = pageW / 2 + 10;
          pdf.text(countText, countX, y);
        }

        // Page number (right-aligned)
        pdf.setFontSize(9);
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setTextColor(blockColor.r, blockColor.g, blockColor.b);
        pdf.text(pageText, margin + contentW - 2, y, { align: 'right' });

        // Dotted leader line
        pdf.setDrawColor(200, 200, 210);
        pdf.setLineWidth(0.15);
        const nameWidth = pdf.getTextWidth(sectionName);
        const pageWidth = pdf.getTextWidth(pageText);
        const lineStart = margin + 6 + nameWidth + 3;
        const lineEnd = margin + contentW - pageWidth - 5;
        if (lineEnd > lineStart + 5) {
          for (let dx = lineStart; dx < lineEnd; dx += 2) {
            pdf.line(dx, y - 0.5, dx + 0.8, y - 0.5);
          }
        }

        y += 6;
      }

      y += 4; // spacing between blocks
    }

    // Additional entries: Antwortbogen, Lösungsschlüssel, Erklärungen
    y += 2;
    pdf.setDrawColor(200, 200, 210);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, margin + contentW, y);
    y += 6;

    const totalPages = pdf.getNumberOfPages();
    const appendixItems = [];

    // Find Antwortbogen, Lösungsschlüssel pages by checking sectionPageMap end
    // They come after all sections
    if (sectionPageMap.length > 0) {
      const lastSectionEnd = sectionPageMap[sectionPageMap.length - 1].endPage;
      if (lastSectionEnd < totalPages) {
        appendixItems.push({ label: 'Antwortbogen', page: lastSectionEnd + 1 });
        if (lastSectionEnd + 1 < totalPages) {
          appendixItems.push({ label: 'Lösungsschlüssel', page: lastSectionEnd + 2 });
        }
        if (lastSectionEnd + 2 < totalPages) {
          appendixItems.push({ label: 'Erklärungen', page: lastSectionEnd + 3 });
        }
      }
    }

    for (const item of appendixItems) {
      pdf.setFontSize(9);
      pdf.setFont('DejaVuSans', 'normal');
      pdf.setTextColor(100, 100, 120);
      pdf.text(item.label, margin + 6, y);

      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(100, 100, 120);
      pdf.text(`Seite ${item.page}`, margin + contentW - 2, y, { align: 'right' });

      const nameW = pdf.getTextWidth(item.label);
      const pageW2 = pdf.getTextWidth(`Seite ${item.page}`);
      const ls = margin + 6 + nameW + 3;
      const le = margin + contentW - pageW2 - 5;
      pdf.setDrawColor(200, 200, 210);
      pdf.setLineWidth(0.15);
      if (le > ls + 5) {
        for (let dx = ls; dx < le; dx += 2) {
          pdf.line(dx, y - 0.5, dx + 0.8, y - 0.5);
        }
      }
      y += 6;
    }

    // Total questions summary at bottom
    const totalQ = allQuestionSets.reduce((s, qs) => s + (qs.count || 0), 0);
    if (totalQ > 0) {
      y += 6;
      pdf.setFontSize(8);
      pdf.setFont('DejaVuSans', 'normal');
      pdf.setTextColor(140, 140, 160);
      pdf.text(`Gesamt: ${sectionPageMap.length} Untertests · ${totalQ} Fragen · ${totalPages} Seiten`, margin, y);
    }
  },

  _drawInstructionsPage(ctx) {
    const { pdf, margin, contentW } = ctx;

    pdf.setFontSize(18);
    pdf.setTextColor(26, 26, 46);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.text('Hinweise zur Bearbeitung', margin, ctx.y);
    ctx.y += 4;
    this._drawLine(ctx, margin, ctx.y, margin + contentW);
    ctx.y += 10;

    pdf.setFontSize(10);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(50);

    const instructions = [
      '1. Verwende einen Stift (kein Bleistift) zum Ankreuzen der Antworten auf dem Antwortbogen.',
      '2. Lies die Anweisungen zu Beginn jeder Sektion sorgfältig durch.',
      '3. Halte dich an die angegebenen Zeitlimits für jede Sektion. Verwende eine Stoppuhr oder einen Timer.',
      '4. Bei Multiple-Choice-Fragen ist immer genau eine Antwort richtig (A, B, C oder D).',
      '5. Bei Zahlenfolgen trägst du die fehlenden Zahlen direkt auf dem Antwortbogen ein.',
      '6. Textverständnis: Beantworte die Fragen ausschließlich anhand der Informationen im jeweiligen Text. Eigenes Hintergrundwissen darf nicht angewendet werden.',
      '7. Wortflüssigkeit: Bilde aus den durcheinander gewürfelten Buchstaben ein deutsches Substantiv und bestimme den Anfangsbuchstaben.',
      '8. Allergieausweis-Einprägephase: Du hast 8 Minuten Zeit, dir die 8 Karten einzuprägen. Danach werden die Karten eingesammelt (umdrehen) und du bearbeitest andere Aufgaben. Erst später folgen die Abruf-Fragen.',
      '9. Arbeite zügig, aber sorgfältig. Unbeantwortete Fragen werden als falsch gewertet.',
      '10. Der Lösungsschlüssel befindet sich am Ende des Dokuments. Nicht vorab ansehen!',
    ];

    for (const instr of instructions) {
      const lines = pdf.splitTextToSize(instr, contentW);
      pdf.text(lines, margin, ctx.y);
      ctx.y += lines.length * 5 + 3;
    }

    // Timing table
    ctx.y += 8;
    pdf.setFontSize(12);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(26, 26, 46);
    pdf.text('Zeitplan', margin, ctx.y);
    ctx.y += 3;
    this._drawLine(ctx, margin, ctx.y, margin + contentW);
    ctx.y += 6;

    pdf.setFontSize(10);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(50);

    const timeSlots = [
      ['Sektion', 'Zeitlimit'],
      ['BMS: Biologie (40 Fragen)', '30 min'],
      ['BMS: Chemie (24 Fragen)', '18 min'],
      ['BMS: Physik (18 Fragen)', '16 min'],
      ['BMS: Mathematik (12 Fragen)', '11 min'],
      ['PAUSE', '30 min'],
      ['TV: Textverständnis (12 Fragen)', '35 min'],
      ['PAUSE', '30 min'],
      ['KFF: Allergieausweise einprägen (8 Karten)', '8 min'],
      ['KFF: Zahlenfolgen (10 Fragen)', '15 min'],
      ['KFF: Wortflüssigkeit (15 Fragen)', '20 min'],
      ['KFF: Allergieausweise abrufen (25 Fragen)', '15 min'],
      ['KFF: Implikationen (10 Fragen)', '10 min'],
    ];

    for (let i = 0; i < timeSlots.length; i++) {
      if (i === 0) pdf.setFont('DejaVuSans', 'bold');
      else pdf.setFont('DejaVuSans', 'normal');

      if (timeSlots[i][0] === 'PAUSE') {
        pdf.setTextColor(230, 168, 23);
        pdf.setFont('DejaVuSans', 'bold');
      } else {
        pdf.setTextColor(50);
      }

      pdf.text(timeSlots[i][0], margin, ctx.y);
      pdf.text(timeSlots[i][1], margin + 130, ctx.y);
      ctx.y += 5.5;
    }
  },

  // ===== SECTION HEADERS =====

  _drawSectionHeader(ctx, section, block, isMemorize, secKey) {
    const { pdf, margin, contentW, pageW } = ctx;
    const blockColor = this._getBlockColor(block);

    // Section header band with block color accent
    pdf.setFillColor(26, 26, 46);
    pdf.rect(margin - 2, ctx.y - 2, contentW + 4, 18, 'F');

    // Color accent bar on left
    pdf.setFillColor(blockColor.r, blockColor.g, blockColor.b);
    pdf.rect(margin - 2, ctx.y - 2, 4, 18, 'F');

    // Icon badge (colored circle with abbreviation)
    const iconInfo = this._sectionIconLabels[secKey] || { symbol: '\u25CF', label: '?' };
    pdf.setFillColor(blockColor.r, blockColor.g, blockColor.b);
    pdf.circle(margin + 10, ctx.y + 7, 6, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7);
    pdf.setFont('DejaVuSans', 'bold');
    const iconLbl = iconInfo.label;
    pdf.text(iconLbl, margin + 10 - pdf.getTextWidth(iconLbl) / 2, ctx.y + 8.5);

    // Section title
    pdf.setTextColor(255);
    pdf.setFontSize(13);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.text(this._clean(section.label), margin + 20, ctx.y + 8.5);

    // Block label (e.g. "BMS", "KFF")
    pdf.setFontSize(8);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(200);
    pdf.text(block.label, margin + 20, ctx.y + 13.5);

    // Time and question count on right
    pdf.setFontSize(10);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(255);
    const timeText = `${section.minutes} Min${isMemorize ? '' : ` · ${section.questions} Aufg.`}`;
    pdf.text(timeText, margin + contentW - 2, ctx.y + 8.5, { align: 'right' });

    ctx.y += 24;

    // Section-specific instructions
    pdf.setTextColor(80);
    pdf.setFontSize(9);
    pdf.setFont('DejaVuSans', 'italic');

    let instr = '';
    const dbType = section.dbType;
    if (isMemorize) {
      instr = 'Präge dir die folgenden 8 Allergieausweise ein. Du hast 8 Minuten Zeit. Merke dir alle Details: Name, Geburtstag, Medikamente, Blutgruppe, Allergien, Ausweisnummer, Land und das zugehörige Bild.';
    } else if (dbType === 'zahlenfolge') {
      instr = 'Ergänze die fehlenden Zahlen in der Folge. Trage deine Antworten auf dem Antwortbogen ein.';
    } else if (dbType === 'implikation') {
      instr = 'Lies die beiden Prämissen und wähle die logisch korrekte Schlussfolgerung.';
    } else if (dbType === 'wortflüssigkeit' || dbType === 'wortfluessigkeit') {
      instr = 'Bilde aus den Buchstaben ein sinnvolles deutsches Substantiv und bestimme den Anfangsbuchstaben. Wähle den richtigen Buchstaben aus den Antwortmöglichkeiten.';
    } else if (dbType === 'textverstaendnis') {
      instr = 'Lies den Text aufmerksam durch und beantworte die Fragen ausschließlich anhand der Informationen im Text.';
    } else if (dbType === 'bms') {
      instr = 'Wähle die richtige Antwort für jede Frage.';
    } else if (dbType === 'allergieausweis_frage') {
      instr = 'Beantworte die Fragen zu den Allergieausweisen, die du dir zuvor eingeprägt hast.';
    } else if (dbType === 'figur') {
      instr = 'Setze die Einzelteile zu einer vollständigen Figur zusammen. Bestimme, welche der fünf Antwortmöglichkeiten (A–E) der fertigen Figur entspricht.';
    } else if (dbType === 'sek_ee') {
      instr = 'Lies die Situationsbeschreibung und entscheide für jede Emotion, ob sie in dieser Situation eher wahrscheinlich oder eher unwahrscheinlich ist. Orientiere dich dabei nur an den Informationen im Text.';
    } else if (dbType === 'sek_er') {
      instr = 'Lies die beschriebene Situation und wähle die beste Strategie, um die beschriebene Emotion zu regulieren.';
    } else if (dbType === 'sek_se') {
      instr = 'Lies die Situationsbeschreibung und ordne die fünf Überlegungen A) bis E) der Wichtigkeit nach (1 = wichtigste, 5 = am wenigsten wichtig). Versetze dich in die Entscheidungssituation der Person.';
    }

    if (instr) {
      const instrLines = pdf.splitTextToSize(instr, contentW);
      pdf.text(instrLines, margin, ctx.y);
      ctx.y += instrLines.length * 4.5 + 4;
    }

    pdf.setFont('DejaVuSans', 'normal');
  },

  // ===== MEMORIZE CARDS =====

  async _drawMemorizeCards(ctx, cards) {
    const { pdf, margin, contentW } = ctx;

    const cardW = contentW;
    const cardH = 105; // Much taller — 2 cards per page
    const photoW = 38;
    const photoH = 48;
    const dataW = cardW - photoW - 20; // left side width for data

    // Preload all card photos as base64 for embedding in PDF
    const photoDataCache = {};
    for (const card of cards) {
      if (card.photoFile) {
        try {
          const imgData = await this._loadImageAsBase64(`assets/allergieausweise/photos/${card.photoFile}`);
          if (imgData) photoDataCache[card.photoFile] = imgData;
        } catch (e) {
          console.warn('Could not load photo for PDF:', card.photoFile, e);
        }
      }
    }

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      this._checkPage(ctx, cardH + 8);

      const cardX = margin;
      const cardY = ctx.y;

      // === Card background with subtle gradient effect ===
      // Outer border
      pdf.setDrawColor(26, 26, 46);
      pdf.setLineWidth(1.0);
      pdf.roundedRect(cardX, cardY, cardW, cardH, 3, 3, 'S');

      // Header band (dark blue)
      pdf.setFillColor(26, 26, 46);
      pdf.roundedRect(cardX, cardY, cardW, 11, 3, 3, 'F');
      // Cover bottom rounding of header
      pdf.rect(cardX, cardY + 6, cardW, 5, 'F');

      // Red cross symbol (medical)
      pdf.setFillColor(220, 38, 38);
      const crossX = cardX + 5;
      const crossY = cardY + 2.5;
      pdf.rect(crossX, crossY, 6, 6, 'F');
      pdf.setFillColor(255, 255, 255);
      pdf.rect(crossX + 2.2, crossY + 0.8, 1.6, 4.4, 'F'); // vertical bar
      pdf.rect(crossX + 0.8, crossY + 2.2, 4.4, 1.6, 'F'); // horizontal bar

      // Header text
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.text('ALLERGIEAUSWEIS', cardX + 14, cardY + 7.5);

      // No card number — MedAT doesn't show numbers on Allergieausweise

      // === Photo on the right (real image or fallback placeholder) ===
      const photoX = cardX + cardW - photoW - 8;
      const photoY = cardY + 18;

      if (card.photoFile && photoDataCache[card.photoFile]) {
        // Draw actual photo in grayscale
        try {
          pdf.addImage(photoDataCache[card.photoFile], 'PNG', photoX, photoY, photoW, photoH);
          // Border around photo
          pdf.setDrawColor(180, 180, 180);
          pdf.setLineWidth(0.3);
          pdf.rect(photoX, photoY, photoW, photoH, 'S');
        } catch (e) {
          console.warn('Failed to add image to PDF:', e);
          this._drawPhotoPlaceholder(pdf, photoX, photoY, photoW, photoH, card.photoId);
        }
      } else {
        this._drawPhotoPlaceholder(pdf, photoX, photoY, photoW, photoH, card.photoId);
      }

      // No photo caption — keep cards clean
      pdf.setFont('DejaVuSans', 'normal');

      // === Data fields on the left ===
      const dataX = cardX + 8;
      let fieldY = cardY + 18;
      const lineH = 8;
      const labelW = 34;

      pdf.setFontSize(10);
      pdf.setTextColor(30);

      const fields = [
        ['Name', card.name],
        ['Geburtstag', card.birthday],
        ['Medikamente', card.medications],
        ['Blutgruppe', card.bloodGroup],
        ['Allergien', card.allergies],
        ['Ausweisnr.', card.idNumber],
        ['Land', card.country],
      ];

      for (const [label, value] of fields) {
        // Label (bold, gray)
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setTextColor(80);
        pdf.setFontSize(9);
        pdf.text(label + ':', dataX, fieldY);

        // Value (normal, black)
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setTextColor(20);
        pdf.setFontSize(10);
        const maxValW = dataW - labelW - 4;
        const valLines = pdf.splitTextToSize(value, maxValW);
        pdf.text(valLines[0] || '', dataX + labelW, fieldY);
        if (valLines.length > 1) {
          pdf.text(valLines[1], dataX + labelW, fieldY + 5);
          fieldY += 5;
        }
        fieldY += lineH;
      }

      // Subtle bottom line
      pdf.setDrawColor(200);
      pdf.setLineWidth(0.2);
      pdf.line(cardX + 4, cardY + cardH - 3, cardX + cardW - 4, cardY + cardH - 3);

      ctx.y += cardH + 6;
    }
  },

  _drawPhotoPlaceholder(pdf, photoX, photoY, photoW, photoH, label) {
    pdf.setFillColor(240, 235, 225);
    pdf.setDrawColor(200, 190, 175);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(photoX, photoY, photoW, photoH, 1.5, 1.5, 'FD');

    // Silhouette icon (simple head + shoulders)
    pdf.setFillColor(200, 195, 185);
    const silCenterX = photoX + photoW / 2;
    const silCenterY = photoY + photoH / 2 - 2;
    pdf.circle(silCenterX, silCenterY - 4, 5, 'F');
    pdf.ellipse(silCenterX, silCenterY + 7, 9, 6, 'F');
  },

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
          // Draw in grayscale
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

  // ===== TEXTVERSTÄNDNIS =====

  _drawTVTexts(ctx, texts, startNum, blockColor) {
    const { pdf, margin, contentW } = ctx;
    const answerKey = [];
    let qNum = startNum || 1;

    for (let ti = 0; ti < texts.length; ti++) {
      const txt = texts[ti];

      // New page for each text (except first, already on fresh page)
      if (ti > 0) {
        pdf.addPage();
        ctx.y = ctx.margin;
      }

      // Text header — full title, wrapped if needed
      pdf.setFontSize(11);
      pdf.setFont('DejaVuSans', 'bold');
      const tvTitle = `Text ${ti + 1}: ${this._clean(txt.title || '')}`;
      const tvTitleMaxW = contentW - 4;
      const tvTitleLines = pdf.splitTextToSize(tvTitle, tvTitleMaxW);
      const tvHeaderH = Math.max(10, tvTitleLines.length * 6 + 4);
      pdf.setFillColor(109, 184, 138); // Mint
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
      const textContent = this._clean(txt.content || '');
      const textLines = pdf.splitTextToSize(textContent, contentW);

      // Draw text body with left border
      const textStartY = ctx.y;
      for (let li = 0; li < textLines.length; li++) {
        this._checkPage(ctx, 6);
        pdf.text(textLines[li], margin + 3, ctx.y);
        ctx.y += 4.5;
      }
      ctx.y += 6;

      // Questions for this text
      pdf.setFontSize(10);
      pdf.setTextColor(26, 26, 46);
      pdf.setFont('DejaVuSans', 'bold');
      this._checkPage(ctx, 8);
      pdf.text(`Fragen zu Text ${ti + 1}`, margin, ctx.y);
      ctx.y += 2;
      this._drawLine(ctx, margin, ctx.y, margin + contentW);
      ctx.y += 5;

      for (const tq of (txt.questions || [])) {
        // Estimate total space needed: question header + question text lines + all option lines
        pdf.setFontSize(10);
        const estQLines = pdf.splitTextToSize(this._clean(tq.question || ''), contentW);
        let estOptLines = 0;
        for (const opt of (tq.options || [])) {
          estOptLines += pdf.splitTextToSize(this._clean(opt), contentW - 16).length;
        }
        const estSpace = 12 + estQLines.length * 5 + estOptLines * 5 + (tq.options || []).length * 2 + 8;
        this._checkPage(ctx, Math.min(estSpace, 120));

        // Question number
        pdf.setFontSize(10);
        pdf.setTextColor(26, 26, 46);
        pdf.setFont('DejaVuSans', 'bold');
        pdf.text(`Frage ${qNum}`, margin, ctx.y);
        ctx.y += 2;
        this._drawLine(ctx, margin, ctx.y, margin + contentW);
        ctx.y += 5;

        // Question text (bold)
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setTextColor(30);
        const qLines = pdf.splitTextToSize(this._clean(tq.question || ''), contentW);
        pdf.text(qLines, margin, ctx.y);
        ctx.y += qLines.length * 5 + 3;
        pdf.setFont('DejaVuSans', 'normal');

        // Options (shuffle to avoid answer position bias)
        const opts = tq.options || [];
        const { shuffledOpts: tvShuffled, correctLetter: tvCorrect } = this._shuffleOptionsWithAnswer(opts, tq);
        this._renderPDFOptions(ctx, tvShuffled, blockColor);

        answerKey.push({ nr: qNum, answer: tvCorrect });

        ctx.y += 4;
        qNum++;
      }
    }

    return answerKey;
  },

  // ===== QUESTIONS =====

  _drawQuestions(ctx, questions, dbType, startNum, blockColor) {
    const { pdf, margin, contentW } = ctx;
    const answerKey = [];

    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const data = q.content;
      const qNum = (startNum || 1) + qi;

      let spaceNeeded = 25;
      if (dbType === 'zahlenfolge') spaceNeeded = 45; // Space above for scratch work + sequence + answer
      else if (dbType === 'implikation') spaceNeeded = 40;
      else if (dbType === 'wortfluessigkeit' || dbType === 'wortflüssigkeit') spaceNeeded = 60; // Anagram + letter count + 5 options
      else spaceNeeded = 25 + ((data.options || data.answer_options || []).length * 6);

      this._checkPage(ctx, spaceNeeded);

      // Question number
      pdf.setFontSize(10);
      pdf.setTextColor(26, 26, 46);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.text(`Frage ${qNum}`, margin, ctx.y);

      if (q.subtype && dbType !== 'zahlenfolge') {
        const subtypeLabels = {
          biologie: 'Biologie', chemie: 'Chemie', physik: 'Physik', mathematik: 'Mathematik',
          ablesen: 'Ablesen', kreuzallergie: 'Kreuzallergie', notfall: 'Notfall', abruf: 'Abruf'
        };
        pdf.setFontSize(8);
        pdf.setTextColor(140);
        pdf.setFont('DejaVuSans', 'normal');
        pdf.text(subtypeLabels[q.subtype] || q.subtype, margin + 24, ctx.y);
      }

      ctx.y += 2;
      this._drawLine(ctx, margin, ctx.y, margin + contentW);
      ctx.y += 5;

      pdf.setFont('DejaVuSans', 'normal');
      pdf.setTextColor(30);

      if (dbType === 'zahlenfolge' && data.sequence) {
        // Empty space above for scratch calculations
        ctx.y += 12;

        pdf.setFontSize(11);
        // Draw each number with hand-drawn arrows between them
        let seqX = margin;
        for (let si = 0; si < data.sequence.length; si++) {
          const val = data.sequence[si] === null ? '___' : String(data.sequence[si]);
          pdf.setFont('DejaVuSans', data.sequence[si] === null ? 'bold' : 'normal');
          if (data.sequence[si] === null) {
            pdf.setTextColor(155, 127, 196); // Lavender for blanks
          } else {
            pdf.setTextColor(30);
          }
          pdf.text(val, seqX, ctx.y);
          seqX += pdf.getTextWidth(val) + 2;

          // Draw arrow between numbers (not after last)
          if (si < data.sequence.length - 1) {
            const arrowY = ctx.y - 1.5;
            pdf.setDrawColor(150);
            pdf.setLineWidth(0.4);
            pdf.line(seqX, arrowY, seqX + 5, arrowY); // shaft
            pdf.line(seqX + 4, arrowY - 1.2, seqX + 5, arrowY); // upper head
            pdf.line(seqX + 4, arrowY + 1.2, seqX + 5, arrowY); // lower head
            seqX += 8;
          }

          // Wrap to next line if needed
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

      } else if (dbType === 'implikation' && data.premise1) {
        pdf.setFontSize(10);
        pdf.setFont('DejaVuSans', 'bold');
        pdf.text('P1:', margin, ctx.y);
        pdf.setFont('DejaVuSans', 'normal');
        const p1Lines = pdf.splitTextToSize(this._clean(data.premise1), contentW - 10);
        pdf.text(p1Lines, margin + 10, ctx.y);
        ctx.y += p1Lines.length * 5 + 2;

        pdf.setFont('DejaVuSans', 'bold');
        pdf.text('P2:', margin, ctx.y);
        pdf.setFont('DejaVuSans', 'normal');
        const p2Lines = pdf.splitTextToSize(this._clean(data.premise2), contentW - 10);
        pdf.text(p2Lines, margin + 10, ctx.y);
        ctx.y += p2Lines.length * 5 + 4;

        const opts = data.answer_options || data.options || [];
        const { shuffledOpts, correctLetter } = this._shuffleOptionsWithAnswer(opts, data);
        this._renderPDFOptions(ctx, shuffledOpts, blockColor);
        answerKey.push({ nr: qNum, answer: correctLetter });

      } else if ((dbType === 'wortflüssigkeit' || dbType === 'wortfluessigkeit') && data.word) {
        // Anagram display: scramble the word, show as spaced letters
        const word = (data.word || '').toUpperCase();
        const anagram = this._scrambleWord(word);

        // Dynamically size anagram letters to fit within page width
        const anagramLen = anagram.length;
        const anagramFontSize = anagramLen > 11 ? 11 : 14;
        const anagramSpacing = anagramLen > 11 ? ' ' : '  ';
        pdf.setFontSize(anagramFontSize);
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setTextColor(155, 127, 196); // Lavender
        const letterStr = anagram.split('').join(anagramSpacing);
        // Ensure it fits within content width
        const letterWidth = pdf.getTextWidth(letterStr);
        if (letterWidth > contentW) {
          pdf.setFontSize(Math.floor(anagramFontSize * contentW / letterWidth));
        }
        pdf.text(letterStr, margin, ctx.y);
        ctx.y += 3;

        pdf.setFontSize(8);
        pdf.setTextColor(120);
        pdf.setFont('DejaVuSans', 'normal');
        pdf.text(`(${word.length} Buchstaben)`, margin, ctx.y + 3);
        ctx.y += 8;

        // Generate letter options like the frontend
        const firstLetter = word.charAt(0);
        const keineCorrect = Math.random() < 0.2;
        const allLetters = 'ABCDEFGHIJKLMNOPRSTUVWZ'.split('');
        const wrongLetters = allLetters.filter(l => l !== firstLetter);
        // Shuffle wrong letters
        for (let wi = wrongLetters.length - 1; wi > 0; wi--) {
          const wj = Math.floor(Math.random() * (wi + 1));
          [wrongLetters[wi], wrongLetters[wj]] = [wrongLetters[wj], wrongLetters[wi]];
        }

        let letterOpts;
        let correctAnswer;
        if (keineCorrect) {
          letterOpts = wrongLetters.slice(0, 4);
          correctAnswer = 'E'; // "Keine..." is option E
        } else {
          letterOpts = [firstLetter, ...wrongLetters.slice(0, 3)];
          // Shuffle
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
        this._renderPDFOptions(ctx, letterOpts, blockColor);

        // Reset font explicitly after WF bold usage
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setTextColor(30);
        answerKey.push({ nr: qNum, answer: `${correctAnswer} (${word})` });

      } else {
        // BMS / Allergieausweis / Generic MC
        pdf.setFontSize(10);
        pdf.setFont('DejaVuSans', 'bold');
        const qLines = pdf.splitTextToSize(this._clean(data.question || ''), contentW);
        pdf.text(qLines, margin, ctx.y);
        ctx.y += qLines.length * 5 + 3;
        pdf.setFont('DejaVuSans', 'normal');

        const opts = data.answer_options || data.options || [];
        const { shuffledOpts, correctLetter } = this._shuffleOptionsWithAnswer(opts, data);
        this._renderPDFOptions(ctx, shuffledOpts, blockColor);
        answerKey.push({ nr: qNum, answer: correctLetter });
      }

      ctx.y += 4;
    }

    return answerKey;
  },

  _renderPDFOptions(ctx, options, blockColor) {
    const { pdf, margin, contentW } = ctx;
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    pdf.setFontSize(10);

    // Use block color for option labels, fallback to dark blue
    const color = blockColor ? this._hexToRGB(blockColor) : { r: 26, g: 26, b: 46 };

    for (let i = 0; i < options.length && i < labels.length; i++) {
      const optText = this._clean(options[i]);
      const optLines = pdf.splitTextToSize(optText, contentW - 16);

      // Ensure option fits on page
      this._checkPage(ctx, optLines.length * 5 + 4);

      // Colored circle with letter
      pdf.setFillColor(color.r, color.g, color.b);
      pdf.circle(margin + 3, ctx.y - 1.2, 2.8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setFontSize(8);
      pdf.text(labels[i], margin + 3 - pdf.getTextWidth(labels[i]) / 2, ctx.y - 0.2);

      // Option text
      pdf.setFont('DejaVuSans', 'normal');
      pdf.setTextColor(30);
      pdf.setFontSize(10);
      pdf.text(optLines, margin + 10, ctx.y);
      ctx.y += optLines.length * 5 + 2;
    }
  },

  // Shuffle options and return { shuffledOpts, correctLetter }
  // "Keine der Antwortmöglichkeiten ist richtig" ALWAYS stays as last option (E) — MedAT-konform
  _shuffleOptionsWithAnswer(opts, data) {
    if (!opts || opts.length === 0) return { shuffledOpts: opts, correctLetter: '?' };

    // Determine original correct index
    let origCorrectIdx = -1;
    if (typeof data.correct === 'number') {
      origCorrectIdx = data.correct;
    } else if (typeof data.correct_answer === 'string') {
      origCorrectIdx = data.correct_answer.toLowerCase().charCodeAt(0) - 97;
    } else if (data.category && opts) {
      origCorrectIdx = opts.indexOf(data.category);
    }

    if (origCorrectIdx < 0 || origCorrectIdx >= opts.length) {
      return { shuffledOpts: opts, correctLetter: '?' };
    }

    const correctValue = opts[origCorrectIdx];

    // Separate "Keine der Antwortmöglichkeiten" — always stays as last option (E)
    const keineIdx = opts.findIndex(o => typeof o === 'string' && o.startsWith('Keine der Antwortmöglichkeiten'));
    let keineOpt = null;
    const shuffleable = [...opts];
    if (keineIdx >= 0) {
      keineOpt = shuffleable.splice(keineIdx, 1)[0];
    }

    // Fisher-Yates shuffle only the non-"Keine" options
    for (let i = shuffleable.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffleable[i], shuffleable[j]] = [shuffleable[j], shuffleable[i]];
    }

    // Re-append "Keine" at the end (always E)
    const shuffled = keineOpt ? [...shuffleable, keineOpt] : shuffleable;

    const newIdx = shuffled.indexOf(correctValue);
    return { shuffledOpts: shuffled, correctLetter: String.fromCharCode(65 + newIdx) };
  },

  _getCorrectLetter(data) {
    let idx = -1;
    if (typeof data.correct === 'number') {
      idx = data.correct;
    } else if (typeof data.correct_answer === 'string') {
      idx = data.correct_answer.toLowerCase().charCodeAt(0) - 97;
    } else if (data.category && data.options) {
      idx = data.options.indexOf(data.category);
    }
    return idx >= 0 ? String.fromCharCode(65 + idx) : '?';
  },

  // ===== ANSWER SHEET (bubble sheet style) =====

  _drawAnswerSheet(ctx, questionSets) {
    const { pdf, margin, contentW, pageW } = ctx;

    pdf.setFontSize(18);
    pdf.setTextColor(26, 26, 46);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.text('Antwortbogen', pageW / 2, ctx.y, { align: 'center' });
    ctx.y += 4;
    this._drawLine(ctx, margin, ctx.y, margin + contentW);
    ctx.y += 6;

    pdf.setFontSize(9);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(100);
    pdf.text('Markiere deine Antwort durch Ankreuzen des entsprechenden Kästchens.', margin, ctx.y);
    ctx.y += 8;

    for (const set of questionSets) {
      if (set.isMemorize || set.count === 0) continue;

      this._checkPage(ctx, 15);

      // Section label with color accent
      const blockColor = set.block ? set.block.color : '#1e3a8a';
      const rgb = this._hexToRGB(blockColor);
      pdf.setFillColor(rgb.r, rgb.g, rgb.b);
      pdf.rect(margin, ctx.y - 3, 2, 5, 'F');
      pdf.setFontSize(10);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(26, 26, 46);
      pdf.text(this._clean(set.section.label), margin + 5, ctx.y);
      ctx.y += 6;

      const isZahlenfolge = set.section.dbType === 'zahlenfolge';
      const isRanking = set.section.isRanking;
      const isWF = set.section.dbType === 'wortfluessigkeit' || set.section.dbType === 'wortflüssigkeit';
      const isSEK = set.section.dbType && set.section.dbType.startsWith('sek_');

      if (isZahlenfolge) {
        // Zahlenfolge: write-in fields instead of bubbles
        const cols = 3;
        const colWidth = contentW / cols;
        pdf.setFontSize(8);
        for (let i = 0; i < set.count; i++) {
          const col = i % cols;
          const x = margin + col * colWidth;
          if (col === 0 && i > 0) ctx.y += 10;
          if (col === 0) this._checkPage(ctx, 12);
          const qNum = set.startNum + i;
          pdf.setFont('DejaVuSans', 'bold');
          pdf.setTextColor(60);
          pdf.text(`${qNum}.`, x, ctx.y);
          // Write-in box
          pdf.setDrawColor(150);
          pdf.setLineWidth(0.3);
          pdf.rect(x + 8, ctx.y - 3.5, 25, 5, 'S');
        }
      } else if (isRanking) {
        // Ranking: 5 slots per question (1-5)
        const cols = 2;
        const colWidth = contentW / cols;
        pdf.setFontSize(8);
        for (let i = 0; i < set.count; i++) {
          const col = i % cols;
          const x = margin + col * colWidth;
          if (col === 0 && i > 0) ctx.y += 10;
          if (col === 0) this._checkPage(ctx, 12);
          const qNum = set.startNum + i;
          pdf.setFont('DejaVuSans', 'bold');
          pdf.setTextColor(60);
          pdf.text(`${qNum}.`, x, ctx.y);
          pdf.setFont('DejaVuSans', 'normal');
          const labels = ['A', 'B', 'C', 'D', 'E'];
          for (let b = 0; b < 5; b++) {
            const bx = x + 10 + b * 14;
            pdf.setTextColor(100);
            pdf.text(labels[b] + ':', bx, ctx.y);
            pdf.setDrawColor(150);
            pdf.setLineWidth(0.3);
            pdf.rect(bx + 4, ctx.y - 3.5, 6, 5, 'S');
          }
        }
      } else {
        // Standard MC boxes — always 5 options (A-E) for MedAT-konform (E = "Keine...")
        const bubbleCount = 5;
        const cols = 5;
        const colWidth = contentW / cols;
        const boxSize = 3.5; // square box size
        const boxGap = 5.2; // gap between boxes
        pdf.setFontSize(8);
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setTextColor(60);

        for (let i = 0; i < set.count; i++) {
          const col = i % cols;
          const x = margin + col * colWidth;
          if (col === 0 && i > 0) ctx.y += 7;
          if (col === 0) this._checkPage(ctx, 9);
          const qNum = set.startNum + i;

          pdf.setFont('DejaVuSans', 'bold');
          pdf.text(`${qNum}.`, x, ctx.y);
          pdf.setFont('DejaVuSans', 'normal');
          for (let b = 0; b < bubbleCount; b++) {
            const bx = x + 8 + b * boxGap;
            const by = ctx.y - 3.2;
            pdf.setDrawColor(150);
            pdf.setLineWidth(0.3);
            pdf.rect(bx, by, boxSize, boxSize, 'S');
            pdf.setFontSize(6.5);
            pdf.text(String.fromCharCode(65 + b), bx + 0.7, ctx.y - 0.2);
            pdf.setFontSize(8);
          }
        }
      }

      ctx.y += 12;
    }
  },

  _hexToRGB(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 26, g: 26, b: 46 };
  },

  // ===== ANSWER KEY =====

  _drawAnswerKey(ctx, answerKey) {
    const { pdf, margin, contentW, pageW } = ctx;

    // Always start on a new page for the Lösungsschlüssel
    pdf.addPage();
    ctx.y = 20;

    pdf.setFontSize(18);
    pdf.setTextColor(26, 26, 46);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.text('Lösungsschlüssel', pageW / 2, ctx.y, { align: 'center' });
    ctx.y += 4;
    this._drawLine(ctx, margin + 30, ctx.y, pageW - margin - 30);
    ctx.y += 8;

    // Render row by row across columns (not column-first) for proper pagination
    const akCols = 4;
    const akColWidth = contentW / akCols;
    const rowHeight = 5;
    const fontSize = 8;

    pdf.setFont('DejaVuSans', 'normal');
    pdf.setFontSize(fontSize);
    pdf.setTextColor(50);

    const rowCount = Math.ceil(answerKey.length / akCols);

    for (let row = 0; row < rowCount; row++) {
      this._checkPage(ctx, rowHeight + 2);

      for (let col = 0; col < akCols; col++) {
        const idx = row * akCols + col;
        if (idx >= answerKey.length) break;

        const ax = margin + col * akColWidth;

        pdf.setFont('DejaVuSans', 'bold');
        pdf.setFontSize(fontSize);
        pdf.setTextColor(50);
        pdf.text(`${answerKey[idx].nr}.`, ax, ctx.y);
        pdf.setFont('DejaVuSans', 'normal');
        let ansStr = this._clean(answerKey[idx].answer);
        const maxAnsW = akColWidth - 12;
        while (pdf.getTextWidth(ansStr) > maxAnsW && ansStr.length > 3) {
          ansStr = ansStr.slice(0, -2) + '…';
        }
        pdf.text(ansStr || '?', ax + 10, ctx.y);
      }

      ctx.y += rowHeight;
    }

    ctx.y += 8;
  },

  // ===== EXPLANATIONS =====

  _drawExplanations(ctx, questions) {
    const { pdf, margin, contentW } = ctx;

    this._checkPage(ctx, 15);
    pdf.setFontSize(14);
    pdf.setTextColor(26, 26, 46);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.text('Erklärungen', margin, ctx.y);
    ctx.y += 2;
    this._drawLine(ctx, margin, ctx.y, margin + contentW);
    ctx.y += 6;

    pdf.setFont('DejaVuSans', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(60);

    for (let i = 0; i < questions.length; i++) {
      const data = questions[i].content;
      const explanation = data.explanation || data.pattern_description || '';
      if (!explanation) continue;

      // For Implikationen: draw Euler circles
      const isImplikation = data.premise1 && data.premise2;
      const neededH = isImplikation ? 55 : 12;
      this._checkPage(ctx, neededH);

      const qDisplayNum = questions[i]._globalNum || (i + 1);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.text(`${qDisplayNum}.`, margin, ctx.y);
      pdf.setFont('DejaVuSans', 'normal');

      if (isImplikation) {
        // Draw Euler circles for visual explanation
        this._drawEulerDiagram(ctx, data.premise1, data.premise2);
      }

      const expLines = pdf.splitTextToSize(this._clean(explanation), contentW - 12);
      for (let el = 0; el < expLines.length; el++) {
        this._checkPage(ctx, 5);
        pdf.text(expLines[el], margin + 8, ctx.y);
        ctx.y += 4.5;
      }
      ctx.y += 3;
    }
  },

  /**
   * Draw Euler/Venn diagram for Implikationen explanations.
   * Parses premises like "Alle A sind B", "Einige A sind B", "Kein A ist B"
   * and draws appropriate circle relationships.
   */
  _drawEulerDiagram(ctx, premise1, premise2) {
    const { pdf, margin, contentW } = ctx;
    const diagramW = 80;
    const diagramH = 40;
    const centerX = margin + contentW / 2;
    const centerY = ctx.y + diagramH / 2;

    // Parse terms from premises
    const parseTerms = (p) => {
      const m = p.match(/(?:Alle|Einige|Kein[e]?)\s+(.+?)\s+(?:sind|ist|können|haben|kann)\s+(.+?)[\.\,]?\s*$/i);
      if (m) return { subject: m[1].trim(), predicate: m[2].trim() };
      return null;
    };

    const t1 = parseTerms(premise1);
    const t2 = parseTerms(premise2);
    if (!t1 || !t2) { ctx.y += 5; return; }

    // Determine relationship types
    const isAll = (p) => /^Alle\b/i.test(p);
    const isEinige = (p) => /^Einige\b/i.test(p);
    const isKein = (p) => /^Kein/i.test(p);

    // Collect unique terms (up to 3)
    const terms = [];
    const addTerm = (t) => { if (!terms.includes(t)) terms.push(t); };
    addTerm(t1.subject); addTerm(t1.predicate);
    addTerm(t2.subject); addTerm(t2.predicate);

    // Circle colors
    const colors = [
      { r: 59, g: 130, b: 246, a: 0.15 },  // Blue
      { r: 239, g: 68, b: 68, a: 0.15 },    // Red
      { r: 34, g: 197, b: 94, a: 0.15 },     // Green
    ];

    const radius = terms.length <= 2 ? 16 : 14;

    // Position circles based on relationships
    const positions = [];
    if (terms.length === 2) {
      if (isAll(premise1)) {
        // "Alle A sind B" → A inside B
        positions.push({ x: centerX, y: centerY, r: radius * 0.65 });
        positions.push({ x: centerX, y: centerY, r: radius });
      } else if (isKein(premise1)) {
        // "Kein A ist B" → A and B separate
        positions.push({ x: centerX - radius * 1.1, y: centerY, r: radius * 0.8 });
        positions.push({ x: centerX + radius * 1.1, y: centerY, r: radius * 0.8 });
      } else {
        // "Einige A sind B" → A and B overlap
        positions.push({ x: centerX - radius * 0.5, y: centerY, r: radius * 0.8 });
        positions.push({ x: centerX + radius * 0.5, y: centerY, r: radius * 0.8 });
      }
    } else {
      // 3 terms: typically A⊂B, and B relates to C
      if (isAll(premise1) && isAll(premise2)) {
        // A ⊂ B ⊂ C (nested)
        positions.push({ x: centerX, y: centerY, r: radius * 0.5 });
        positions.push({ x: centerX, y: centerY, r: radius * 0.75 });
        positions.push({ x: centerX, y: centerY, r: radius });
      } else if (isAll(premise1) && isEinige(premise2)) {
        // A ⊂ B, B ∩ C
        positions.push({ x: centerX - radius * 0.3, y: centerY, r: radius * 0.5 });
        positions.push({ x: centerX - radius * 0.1, y: centerY, r: radius * 0.8 });
        positions.push({ x: centerX + radius * 0.8, y: centerY, r: radius * 0.7 });
      } else if (isAll(premise1) && isKein(premise2)) {
        // A ⊂ B, B ∩ C = ∅
        positions.push({ x: centerX - radius * 0.3, y: centerY, r: radius * 0.5 });
        positions.push({ x: centerX - radius * 0.1, y: centerY, r: radius * 0.8 });
        positions.push({ x: centerX + radius * 1.2, y: centerY, r: radius * 0.7 });
      } else {
        // Default: overlapping circles
        const angle = (2 * Math.PI) / terms.length;
        for (let i = 0; i < terms.length; i++) {
          positions.push({
            x: centerX + Math.cos(angle * i - Math.PI / 2) * radius * 0.5,
            y: centerY + Math.sin(angle * i - Math.PI / 2) * radius * 0.5,
            r: radius * 0.7,
          });
        }
      }
    }

    // Draw circles
    for (let i = 0; i < Math.min(terms.length, positions.length); i++) {
      const p = positions[i];
      const c = colors[i % colors.length];
      // Fill with transparency effect (light fill)
      pdf.setFillColor(
        Math.round(255 - (255 - c.r) * c.a),
        Math.round(255 - (255 - c.g) * c.a),
        Math.round(255 - (255 - c.b) * c.a)
      );
      pdf.setDrawColor(c.r, c.g, c.b);
      pdf.setLineWidth(0.5);
      pdf.circle(p.x, p.y, p.r, 'FD');
    }

    // Draw labels
    pdf.setFontSize(7);
    pdf.setFont('DejaVuSans', 'bold');
    for (let i = 0; i < Math.min(terms.length, positions.length); i++) {
      const p = positions[i];
      const c = colors[i % colors.length];
      pdf.setTextColor(c.r, c.g, c.b);
      // Truncate long term names
      let label = terms[i];
      if (label.length > 15) label = label.substring(0, 13) + '…';
      const tw = pdf.getTextWidth(label);
      // Place label: for nested circles, offset vertically
      let ly = p.y + (i === 0 ? -1 : (i === 1 ? 1 : 3));
      if (terms.length <= 2 && isAll(premise1) && i === 0) ly = p.y - 1;
      pdf.text(label, p.x - tw / 2, ly);
    }

    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(60);
    ctx.y += diagramH + 4;
  },

  // ===== SEK QUESTIONS =====

  _drawSEKQuestions(ctx, questions, isRanking, startNum, blockColor, sekType) {
    const { pdf, margin, contentW } = ctx;
    const answerKey = [];
    const labels = ['A', 'B', 'C', 'D', 'E'];

    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const data = q.content;
      const qNum = (startNum || 1) + qi;
      const opts = data.options || [];
      const isEE = sekType === 'sek_ee' || data.emotions || data._isEE;

      const spaceNeeded = 30 + opts.length * 8;
      this._checkPage(ctx, spaceNeeded);

      // Question number
      pdf.setFontSize(10);
      pdf.setTextColor(200, 100, 70); // Coral for SEK
      pdf.setFont('DejaVuSans', 'bold');
      pdf.text(`Aufgabe ${qNum}`, margin, ctx.y);
      ctx.y += 2;
      this._drawLine(ctx, margin, ctx.y, margin + contentW);
      ctx.y += 5;

      // Scenario box
      if (data.scenario) {
        pdf.setDrawColor(200, 120, 95);
        pdf.setFillColor(253, 232, 224);
        pdf.setLineWidth(0.4);
        const scenarioText = this._clean(data.scenario);
        const scenarioLines = pdf.splitTextToSize(scenarioText, contentW - 14);
        const boxH = scenarioLines.length * 4.5 + 8;
        pdf.roundedRect(margin, ctx.y, contentW, boxH, 2, 2, 'FD');
        pdf.setFontSize(9);
        pdf.setTextColor(30);
        pdf.setFont('DejaVuSans', 'normal');
        for (let sl = 0; sl < scenarioLines.length; sl++) {
          pdf.text(scenarioLines[sl], margin + 5, ctx.y + 6 + sl * 4.5);
        }
        ctx.y += boxH + 6;
      }

      // Question text (bold)
      pdf.setFontSize(10);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(30);
      const qText = isEE
        ? this._clean(data.question || `Wie fühlt sich die Person in dieser Situation?`)
        : this._clean(data.question || '');
      const qLines = pdf.splitTextToSize(qText, contentW);
      pdf.text(qLines, margin, ctx.y);
      ctx.y += qLines.length * 5 + 3;

      if (isEE) {
        // EE: Emotions table (wahrscheinlich / unwahrscheinlich)
        const emotions = data.emotions || opts;
        const tableW = contentW;
        const col1W = tableW * 0.5; // emotion text
        const col2W = tableW * 0.25; // eher wahrscheinlich
        const col3W = tableW * 0.25; // eher unwahrscheinlich
        const rowH = 7;

        // Table header
        pdf.setFillColor(240, 240, 240);
        pdf.rect(margin, ctx.y - 3.5, tableW, rowH, 'F');
        pdf.setDrawColor(180);
        pdf.setLineWidth(0.3);
        pdf.rect(margin, ctx.y - 3.5, tableW, rowH, 'S');
        pdf.setFontSize(8);
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setTextColor(60);
        pdf.text('', margin + 4, ctx.y);
        pdf.text('eher wahrscheinlich', margin + col1W + col2W / 2, ctx.y, { align: 'center' });
        pdf.text('eher unwahrscheinlich', margin + col1W + col2W + col3W / 2, ctx.y, { align: 'center' });
        ctx.y += rowH;

        // Table rows
        for (let ei = 0; ei < emotions.length && ei < 5; ei++) {
          const emotionText = typeof emotions[ei] === 'string' ? emotions[ei] : (emotions[ei].text || emotions[ei].label || '');
          pdf.setFillColor(ei % 2 === 0 ? 255 : 248, ei % 2 === 0 ? 255 : 248, ei % 2 === 0 ? 255 : 248);
          pdf.rect(margin, ctx.y - 3.5, tableW, rowH, 'F');
          pdf.setDrawColor(200);
          pdf.rect(margin, ctx.y - 3.5, tableW, rowH, 'S');
          // Vertical dividers
          pdf.line(margin + col1W, ctx.y - 3.5, margin + col1W, ctx.y - 3.5 + rowH);
          pdf.line(margin + col1W + col2W, ctx.y - 3.5, margin + col1W + col2W, ctx.y - 3.5 + rowH);

          // Emotion label
          pdf.setFont('DejaVuSans', 'normal');
          pdf.setTextColor(30);
          pdf.setFontSize(9);
          pdf.text(`${this._clean(emotionText)} (${labels[ei]})`, margin + 4, ctx.y);

          // Empty checkboxes
          const cbSize = 3.5;
          const cb1X = margin + col1W + col2W / 2 - cbSize / 2;
          const cb2X = margin + col1W + col2W + col3W / 2 - cbSize / 2;
          pdf.setDrawColor(150);
          pdf.rect(cb1X, ctx.y - 2.5, cbSize, cbSize, 'S');
          pdf.rect(cb2X, ctx.y - 2.5, cbSize, cbSize, 'S');

          ctx.y += rowH;
        }
        ctx.y += 2;

        // Answer key for EE
        const correctEmotions = data.correct_emotions || [];
        if (correctEmotions.length > 0) {
          const eeAnswer = correctEmotions.map((isW, i) => `${labels[i]}=${isW ? 'W' : 'U'}`).join(', ');
          answerKey.push({ nr: qNum, answer: eeAnswer });
        } else {
          // Fallback: use original MC correct
          const correctIdx = typeof data.correct === 'number' ? data.correct : -1;
          answerKey.push({ nr: qNum, answer: correctIdx >= 0 ? labels[correctIdx] : '?' });
        }

      } else if (isRanking) {
        // SE Ranking: show Überlegungen with ranking slots
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setTextColor(30);
        for (let i = 0; i < opts.length && i < 5; i++) {
          this._checkPage(ctx, 8);
          // Ranking slot box
          pdf.setDrawColor(150);
          pdf.setLineWidth(0.3);
          pdf.rect(margin, ctx.y - 3.5, 8, 5.5, 'S');
          pdf.setFontSize(8);
          pdf.setTextColor(150);
          pdf.text('___', margin + 1.5, ctx.y);
          // Option label + text
          pdf.setFontSize(10);
          pdf.setTextColor(30);
          pdf.setFont('DejaVuSans', 'bold');
          pdf.text(`${labels[i]})`, margin + 11, ctx.y);
          pdf.setFont('DejaVuSans', 'normal');
          const optLines = pdf.splitTextToSize(this._clean(opts[i]), contentW - 22);
          pdf.text(optLines, margin + 19, ctx.y);
          ctx.y += optLines.length * 5 + 2;
        }

        // Answer key: correct ranking as string
        const ranking = data.correct_ranking || [];
        const rankStr = ranking.map((r, i) => `${labels[i]}=${r + 1}`).join(', ');
        answerKey.push({ nr: qNum, answer: rankStr });
      } else {
        // MC: shuffle and render options (ER)
        const { shuffledOpts, correctLetter } = this._shuffleOptionsWithAnswer(opts, data);
        this._renderPDFOptions(ctx, shuffledOpts, blockColor);
        answerKey.push({ nr: qNum, answer: correctLetter });
      }

      ctx.y += 4;
    }

    return answerKey;
  },

  // ===== FIGUREN ZUSAMMENSETZEN (generated client-side) =====

  _drawFigurenQuestions(ctx, count, startNum, blockColor) {
    const { pdf, margin, contentW } = ctx;
    const answerKey = [];
    const figurenData = []; // Store generated data for solution rendering
    const labels = ['A', 'B', 'C', 'D', 'E'];
    const color = blockColor ? this._hexToRGB(blockColor) : { r: 155, g: 127, b: 196 };

    const baseSeed = Date.now();
    for (let qi = 0; qi < count; qi++) {
      const qNum = (startNum || 1) + qi;
      const seed = baseSeed + qi * 7919; // unique prime-spaced seed per question
      const difficulty = qi < 5 ? 'easy' : qi < 10 ? 'medium' : 'hard';
      const data = FigurenGenerator.generate(difficulty, seed); // (difficulty, seed) — correct order
      figurenData.push({ qNum, data });

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
      pdf.text(`Figuren zusammensetzen · ${data.numPieces} Teile`, margin + 24, ctx.y);
      ctx.y += 2;
      this._drawLine(ctx, margin, ctx.y, margin + contentW);
      ctx.y += 5;

      // Render pieces as SVG → canvas → image (simplified: draw polygons directly in PDF)
      const piecesY = ctx.y;
      const pieceSize = 22;
      const piecesPerRow = Math.min(data.pieces.length, 6);
      const totalPiecesW = piecesPerRow * (pieceSize + 4);
      const piecesStartX = margin + (contentW - totalPiecesW) / 2;

      // Draw label
      pdf.setFontSize(8);
      pdf.setTextColor(100);
      pdf.text('Einzelteile:', margin, ctx.y + 3);
      ctx.y += 7;

      // Draw each piece as PDF polygon
      for (let pi = 0; pi < data.pieces.length; pi++) {
        const piece = data.pieces[pi];
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
      const pieceRows = Math.ceil(data.pieces.length / piecesPerRow);
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
      for (let oi = 0; oi < data.options.length && oi < 4; oi++) {
        const opt = data.options[oi];
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

      // Option E = "Keine der Antworten ist richtig"
      const eOx = optsStartX + 4 * (optSize + optGap);
      pdf.setFillColor(245, 245, 245);
      pdf.setDrawColor(180);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(eOx, ctx.y, optSize, optSize, 1.5, 1.5, 'FD');
      // Draw X or "Keine" text
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

      const correctLetter = labels[data.correct];
      console.log(`[PDF-FIG] Frage ${qNum}: correct=${data.correct} (${correctLetter}), pieces=${data.numPieces}`);
      answerKey.push({ nr: qNum, answer: correctLetter });
      ctx.y += 4;
    }

    return { answerKey, figurenData };
  },

  // ===== FIGUREN LÖSUNGEN + TIPPS =====

  _drawFigurenSolutions(ctx, figurenData, blockColor) {
    const { pdf, margin, contentW } = ctx;
    const labels = ['A', 'B', 'C', 'D', 'E'];
    const color = blockColor ? this._hexToRGB(blockColor) : { r: 155, g: 127, b: 196 };

    // Piece colors for the assembly diagram
    const pieceColors = [
      { r: 123, g: 191, b: 222 }, // blue
      { r: 168, g: 216, b: 168 }, // green
      { r: 245, g: 194, b: 141 }, // orange
      { r: 212, g: 165, b: 212 }, // purple
      { r: 242, g: 163, b: 163 }, // red
      { r: 179, g: 217, b: 242 }, // light blue
      { r: 201, g: 232, b: 179 }, // light green
      { r: 255, g: 214, b: 153 }, // light orange
    ];

    // Title
    pdf.addPage();
    ctx.y = ctx.margin;

    pdf.setFontSize(14);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(color.r, color.g, color.b);
    pdf.text('Figuren zusammensetzen \u2014 L\u00f6sungen', pdf.internal.pageSize.getWidth() / 2, ctx.y, { align: 'center' });
    ctx.y += 4;
    pdf.setFontSize(8);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(120);
    pdf.text('Farbig markierte Teile zeigen, wie die Figur zusammengesetzt wird.', pdf.internal.pageSize.getWidth() / 2, ctx.y, { align: 'center' });
    ctx.y += 8;

    // Draw solutions in a grid: 3 per row
    const solSize = 38; // size of each solution box
    const colGap = 8;
    const rowGap = 14;
    const cols = 3;
    const colW = (contentW - (cols - 1) * colGap) / cols;
    const cellCenterOffset = (colW - solSize) / 2;

    for (let i = 0; i < figurenData.length; i++) {
      const { qNum, data } = figurenData[i];
      const col = i % cols;
      const correctLetter = labels[data.correct];

      // Check if we need a new page (each row needs ~solSize + labels + gap)
      if (col === 0) {
        this._checkPage(ctx, solSize + 28);
      }

      const cellX = margin + col * (colW + colGap);
      const boxX = cellX + cellCenterOffset;
      const boxY = ctx.y;

      // Question number + correct answer header
      pdf.setFontSize(8);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(color.r, color.g, color.b);
      pdf.text(`Frage ${qNum}`, cellX, boxY);
      pdf.setFont('DejaVuSans', 'normal');
      pdf.setTextColor(80);
      pdf.text(`\u2192 ${correctLetter}`, cellX + pdf.getTextWidth(`Frage ${qNum}  `), boxY);

      const drawY = boxY + 3;

      // Background box
      pdf.setFillColor(252, 250, 245);
      pdf.setDrawColor(220);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(boxX, drawY, solSize, solSize, 2, 2, 'FD');

      // Draw each original piece in its own color, assembled in position
      if (data.originalPieces && data.originalPieces.length > 0) {
        // Calculate global bounding box of all pieces
        let gMinX = Infinity, gMinY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity;
        for (const piece of data.originalPieces) {
          for (const [x, y] of piece) {
            gMinX = Math.min(gMinX, x); gMinY = Math.min(gMinY, y);
            gMaxX = Math.max(gMaxX, x); gMaxY = Math.max(gMaxY, y);
          }
        }
        const gW = gMaxX - gMinX || 1;
        const gH = gMaxY - gMinY || 1;
        const padding = 4;
        const drawArea = solSize - padding * 2;
        const scale = Math.min(drawArea / gW, drawArea / gH) * 0.88;
        const offsetX = boxX + padding + (drawArea - gW * scale) / 2;
        const offsetY = drawY + padding + (drawArea - gH * scale) / 2;

        // Draw each piece
        data.originalPieces.forEach((piece, idx) => {
          if (!piece || piece.length < 3) return;
          const pc = pieceColors[idx % pieceColors.length];

          const scaledPoints = piece.map(([x, y]) => [
            offsetX + (x - gMinX) * scale,
            offsetY + (y - gMinY) * scale,
          ]);

          // Fill with piece color
          pdf.setFillColor(pc.r, pc.g, pc.b);
          pdf.setDrawColor(
            Math.max(0, pc.r - 60),
            Math.max(0, pc.g - 60),
            Math.max(0, pc.b - 60)
          );
          pdf.setLineWidth(0.4);

          const startX = scaledPoints[0][0];
          const startY = scaledPoints[0][1];
          const lineSegments = [];
          for (let si = 1; si < scaledPoints.length; si++) {
            lineSegments.push([
              scaledPoints[si][0] - scaledPoints[si - 1][0],
              scaledPoints[si][1] - scaledPoints[si - 1][1]
            ]);
          }
          lineSegments.push([
            startX - scaledPoints[scaledPoints.length - 1][0],
            startY - scaledPoints[scaledPoints.length - 1][1]
          ]);
          pdf.lines(lineSegments, startX, startY, [1, 1], 'FD', true);
        });

        // Draw outline of complete shape on top
        if (data.correctShape && data.correctShape.length >= 3) {
          const outlinePoints = data.correctShape.map(([x, y]) => [
            offsetX + (x - gMinX) * scale,
            offsetY + (y - gMinY) * scale,
          ]);
          // Recalculate for correctShape which may have different coordinates
          let csMinX = Infinity, csMinY = Infinity, csMaxX = -Infinity, csMaxY = -Infinity;
          for (const [x, y] of data.correctShape) {
            csMinX = Math.min(csMinX, x); csMinY = Math.min(csMinY, y);
            csMaxX = Math.max(csMaxX, x); csMaxY = Math.max(csMaxY, y);
          }
          const csW = csMaxX - csMinX || 1, csH = csMaxY - csMinY || 1;
          const csScale = Math.min(drawArea / csW, drawArea / csH) * 0.88;
          const csOffX = boxX + padding + (drawArea - csW * csScale) / 2;
          const csOffY = drawY + padding + (drawArea - csH * csScale) / 2;
          const csScaled = data.correctShape.map(([x, y]) => [
            csOffX + (x - csMinX) * csScale,
            csOffY + (y - csMinY) * csScale,
          ]);

          pdf.setDrawColor(color.r, color.g, color.b);
          pdf.setLineWidth(0.8);
          const csStartX = csScaled[0][0];
          const csStartY = csScaled[0][1];
          const csSegs = [];
          for (let si = 1; si < csScaled.length; si++) {
            csSegs.push([
              csScaled[si][0] - csScaled[si - 1][0],
              csScaled[si][1] - csScaled[si - 1][1]
            ]);
          }
          csSegs.push([csStartX - csScaled[csScaled.length - 1][0], csStartY - csScaled[csScaled.length - 1][1]]);
          pdf.lines(csSegs, csStartX, csStartY, [1, 1], 'S', true);
        }
      }

      // Move y after each complete row
      if (col === cols - 1 || i === figurenData.length - 1) {
        ctx.y += solSize + rowGap;
      }
    }

    // ===== STRATEGY TIPS =====
    ctx.y += 4;
    this._checkPage(ctx, 60);

    pdf.setFontSize(11);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(color.r, color.g, color.b);
    pdf.text('Tipps: Figuren zusammensetzen', margin, ctx.y);
    ctx.y += 2;
    this._drawLine(ctx, margin, ctx.y, margin + contentW);
    ctx.y += 5;

    const tips = [
      { icon: '\uD83D\uDD0D', title: 'Umriss zuerst', text: 'Schau dir zuerst die \u00e4u\u00dfere Form jedes Teils an. Welche Gesamtform k\u00f6nnten sie bilden? Ecken und gerade Kanten geben dir Hinweise.' },
      { icon: '\uD83E\uDDE9', title: 'Gro\u00dfe Teile zuerst', text: 'Beginne mit den gr\u00f6\u00dften St\u00fccken \u2014 sie schr\u00e4nken die M\u00f6glichkeiten am meisten ein und helfen dir, die Grundform zu erkennen.' },
      { icon: '\uD83D\uDD04', title: 'Drehung beachten', text: 'Teile d\u00fcrfen gedreht, aber NIEMALS gespiegelt werden! Dreh die Teile im Kopf, bis die Kanten zusammenpassen.' },
      { icon: '\uD83D\uDCCF', title: 'Fl\u00e4che vergleichen', text: 'Sch\u00e4tze die Gesamtfl\u00e4che aller Teile und vergleiche mit den Antwortoptionen \u2014 zu gro\u00dfe oder zu kleine Figuren fallen sofort weg.' },
      { icon: '\u274C', title: 'Ausschlussverfahren', text: 'Eliminiere zuerst die Antworten, die offensichtlich nicht passen. Oft kannst du 2-3 Optionen sofort ausschlie\u00dfen.' },
      { icon: '\uD83E\uDDE0', title: 'Kanten z\u00e4hlen', text: 'Z\u00e4hle die geraden Au\u00dfenkanten aller Teile. Die Gesamtfigur hat weniger Au\u00dfenkanten, weil innere Schnittkanten verschwinden.' },
      { icon: '\u23F1\uFE0F', title: 'Zeitmanagement', text: 'Du hast ca. 80 Sekunden pro Aufgabe. Wenn du nach 60 Sekunden keine L\u00f6sung hast, w\u00e4hle die wahrscheinlichste Option.' },
      { icon: '\uD83C\uDD74\uFE0F', title: 'Option E nicht vergessen', text: 'Pr\u00fcfe immer, ob keine der Figuren A\u2013D wirklich passt. Manchmal ist \u201eKeine richtig\u201c die korrekte Antwort!' },
    ];

    for (const tip of tips) {
      this._checkPage(ctx, 14);

      pdf.setFontSize(8);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(60);
      const titleStr = `${tip.icon}  ${tip.title}`;
      pdf.text(titleStr, margin, ctx.y);
      ctx.y += 4;

      pdf.setFont('DejaVuSans', 'normal');
      pdf.setTextColor(100);
      pdf.setFontSize(7.5);
      const lines = pdf.splitTextToSize(tip.text, contentW - 4);
      pdf.text(lines, margin + 2, ctx.y);
      ctx.y += lines.length * 3.5 + 3;
    }
  },

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

    // Fill + outline using jsPDF lines() method — NO triangle fan = NO visible seam lines
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

      // Draw filled polygon with outline in one call — no seam artifacts!
      pdf.lines(lineSegments, startX, startY, [1, 1], 'FD', true);
    }
  },

  // ===== FOOTERS =====

  _scrambleWord(word) {
    const arr = word.split('');
    let scrambled;
    let attempts = 0;
    do {
      scrambled = [...arr];
      for (let i = scrambled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
      }
      attempts++;
    } while (scrambled.join('') === word && attempts < 20);
    return scrambled.join('');
  },

  _addFootersToAllPages(ctx, label, sectionPageMap) {
    const { pdf, pageW, pageH } = ctx;
    const totalPages = pdf.getNumberOfPages();

    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);

      // Bottom footer
      pdf.setFontSize(7.5);
      pdf.setTextColor(160);
      pdf.setFont('DejaVuSans', 'normal');
      pdf.text(`MedAT Trainer  |  ${label}  |  Seite ${p} / ${totalPages}`, pageW / 2, pageH - 7, { align: 'center' });

      // Sidebar label (vertical text on the LEFT side)
      if (sectionPageMap) {
        // Find which section this page belongs to
        let sideLabel = '';
        let sideColor = { r: 160, g: 160, b: 160 };
        for (const entry of sectionPageMap) {
          if (p >= entry.startPage && p <= entry.endPage) {
            sideLabel = entry.label;
            sideColor = entry.color;
            break;
          }
        }
        if (sideLabel) {
          // Draw vertical colored bar on left edge
          pdf.setFillColor(sideColor.r, sideColor.g, sideColor.b);
          pdf.rect(0, 0, 3, pageH, 'F');

          // Draw vertical text
          pdf.setFontSize(9);
          pdf.setFont('DejaVuSans', 'bold');
          pdf.setTextColor(sideColor.r, sideColor.g, sideColor.b);
          // Rotate text 90 degrees for sidebar
          const textY = pageH / 2;
          pdf.saveGraphicsState();
          // jsPDF text rotation: use angle parameter
          pdf.text(sideLabel, 8, textY, { angle: 90 });
          pdf.restoreGraphicsState();
        }
      }
    }
  },

  // --- Activity tracking helpers ---
  async _trackPdfCreated() {
    try {
      if (!Auth.isLoggedIn || !Auth.userProfile?.user_id) return;
      await Auth.supabase.rpc('increment_counter', { uid: Auth.userProfile.user_id, col: 'pdfs_created' }).catch(() => {
        // Fallback: direct update
        Auth.supabase.from('user_profiles').update({ pdfs_created: (Auth.userProfile.pdfs_created || 0) + 1 }).eq('user_id', Auth.userProfile.user_id);
      });
    } catch(e) { console.warn('PDF tracking failed:', e); }
  },

  async _trackSimulationCompleted() {
    try {
      if (!Auth.isLoggedIn || !Auth.userProfile?.user_id) return;
      await Auth.supabase.rpc('increment_counter', { uid: Auth.userProfile.user_id, col: 'simulations_completed' }).catch(() => {
        Auth.supabase.from('user_profiles').update({ simulations_completed: (Auth.userProfile.simulations_completed || 0) + 1 }).eq('user_id', Auth.userProfile.user_id);
      });
    } catch(e) { console.warn('Simulation tracking failed:', e); }
  },

  // ===== PDF CLOUD STORAGE =====
  // Category mapping for folder structure
  _categoryMap: {
    biologie: 'BMS – Biologie',
    chemie: 'BMS – Chemie',
    physik: 'BMS – Physik',
    mathematik: 'BMS – Mathematik',
    textverstaendnis: 'TV – Textverständnis',
    figuren: 'KFF – Figuren',
    allergieausweis_mem: 'KFF – Allergieausweise',
    allergieausweis_abruf: 'KFF – Allergieausweise',
    zahlenfolge: 'KFF – Zahlenfolgen',
    wortfluessigkeit: 'KFF – Wortflüssigkeit',
    implikation: 'KFF – Implikationen',
    emotionen_erkennen: 'SEK – Emotionen erkennen',
    emotionen_regulieren: 'SEK – Emotionen regulieren',
    soziales_entscheiden: 'SEK – Soziales Entscheiden',
    simulation: 'Simulationen',
  },

  _FREE_PDF_LIMIT: 10,

  /**
   * Save PDF — first ask to save in app, then download
   * Also deducts credits for PDF pages.
   */
  async _saveWithPrompt(pdf, fileName, category, pdfType, questionCount) {
    const pageCount = pdf.getNumberOfPages();

    // Credit check for PDF generation
    if (!Credits.isUnlimited()) {
      if (!Credits.hasEnough(pageCount)) {
        if (Credits.remaining <= 0) {
          Credits.showPaywall();
          return;
        }
      }
      // Deduct credits for PDF pages
      await Credits.use(pageCount, 'pdf_page', `${fileName} (${pageCount} Seiten)`);
    }

    // Get blob before showing prompt
    const blob = pdf.output('blob');

    // Only offer cloud save if logged in
    if (!Auth.isLoggedIn) {
      pdf.save(fileName);
      return;
    }

    // Check cloud storage limit for free users
    const isPremium = Credits.isUnlimited();
    let cloudLimitReached = false;
    if (!isPremium) {
      const { count, error } = await Auth.supabase
        .from('user_pdfs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', Auth.currentUser.id);
      if (!error && count >= this._FREE_PDF_LIMIT) cloudLimitReached = true;
    }

    // Show save prompt — download happens AFTER user decides
    this._showSavePrompt(blob, pdf, fileName, category, pdfType, questionCount, cloudLimitReached);
  },

  _showSavePrompt(blob, pdfObj, fileName, category, pdfType, questionCount, limitReached) {
    // Remove any existing prompt
    document.getElementById('pdf-save-prompt')?.remove();

    const categoryLabel = this._categoryMap[category] || category;

    const prompt = document.createElement('div');
    prompt.id = 'pdf-save-prompt';
    prompt.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:10001;background:#fff;border-top:2px solid var(--yellow);box-shadow:0 -4px 24px rgba(0,0,0,0.15);padding:1.25rem;animation:slideUp .3s ease';

    const _dismissPrompt = () => {
      prompt.remove();
    };

    if (limitReached) {
      prompt.innerHTML = `
        <div style="max-width:480px;margin:0 auto;text-align:center">
          <div style="font-size:1.5rem;margin-bottom:0.5rem">📁</div>
          <div style="font-weight:700;font-size:0.95rem;color:var(--text);margin-bottom:0.4rem">PDF-Speicher voll</div>
          <div style="font-size:0.82rem;color:var(--text-muted);line-height:1.5;margin-bottom:1rem">
            Du hast bereits ${this._FREE_PDF_LIMIT} PDFs in der App gespeichert.<br>
            Mit <strong style="color:var(--yellow)">Premium</strong> kannst du unbegrenzt speichern!
          </div>
          <div style="display:flex;gap:0.6rem;justify-content:center">
            <button id="pdf-save-upgrade" style="background:var(--yellow);color:var(--dark);border:none;border-radius:10px;padding:0.6rem 1.2rem;font-weight:700;font-size:0.85rem;cursor:pointer">Upgraden</button>
            <button id="pdf-save-dismiss" style="background:var(--bg);color:var(--text-muted);border:none;border-radius:10px;padding:0.6rem 1.2rem;font-size:0.85rem;cursor:pointer">Schließen</button>
          </div>
        </div>
      `;
      document.body.appendChild(prompt);
      document.getElementById('pdf-save-upgrade').onclick = () => { _dismissPrompt(); App.showScreen('screen-konto'); };
      document.getElementById('pdf-save-dismiss').onclick = _dismissPrompt;
      // Still download
      pdfObj.save(fileName);
    } else {
      prompt.innerHTML = `
        <div style="max-width:480px;margin:0 auto">
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.8rem">
            <div style="font-size:1.5rem">📁</div>
            <div>
              <div style="font-weight:700;font-size:0.95rem;color:var(--text)">PDF in „Meine PDFs" speichern?</div>
              <div style="font-size:0.8rem;color:var(--text-muted)">Ordner: ${categoryLabel}</div>
            </div>
          </div>
          <div style="display:flex;gap:0.6rem">
            <button id="pdf-save-yes" style="flex:1;background:var(--yellow);color:var(--dark);border:none;border-radius:10px;padding:0.65rem;font-weight:700;font-size:0.88rem;cursor:pointer">Ja, speichern</button>
            <button id="pdf-save-no" style="flex:1;background:var(--bg);color:var(--text-muted);border:none;border-radius:10px;padding:0.65rem;font-size:0.88rem;cursor:pointer">Nur herunterladen</button>
          </div>
        </div>
      `;
      document.body.appendChild(prompt);

      document.getElementById('pdf-save-yes').onclick = async () => {
        const btn = document.getElementById('pdf-save-yes');
        if (!btn) return;
        btn.textContent = 'Wird gespeichert...';
        btn.style.opacity = '0.6';
        btn.style.pointerEvents = 'none';
        try {
          console.log('[PDF] Starting upload:', { fileName, category, pdfType, blobSize: blob?.size });
          await this._uploadPdf(blob, fileName, category, pdfType, questionCount);
          console.log('[PDF] Upload successful');
          prompt.innerHTML = `
            <div style="max-width:480px;margin:0 auto;text-align:center;padding:0.5rem 0">
              <span style="font-size:1.2rem">✅</span>
              <span style="font-weight:600;font-size:0.9rem;color:var(--text);margin-left:0.4rem">PDF gespeichert!</span>
              <span style="font-size:0.82rem;color:var(--text-muted);margin-left:0.3rem">Findest du unter „Meine PDFs"</span>
            </div>
          `;
          // Download after saving
          pdfObj.save(fileName);
          setTimeout(_dismissPrompt, 2500);
        } catch (e) {
          console.error('[PDF] Upload error:', e);
          if (btn) {
            btn.textContent = 'Fehler — erneut versuchen?';
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
          }
          App.showToast('PDF-Speichern fehlgeschlagen: ' + (e?.message || 'Unbekannter Fehler'));
          // Still download even if cloud save fails
          pdfObj.save(fileName);
        }
      };
      document.getElementById('pdf-save-no').onclick = () => {
        _dismissPrompt();
        // Just download without cloud save
        pdfObj.save(fileName);
      };
    }

    // Auto-dismiss after 30s
    setTimeout(() => { if (document.getElementById('pdf-save-prompt')) { _dismissPrompt(); } }, 30000);
  },

  async _uploadPdf(blob, fileName, category, pdfType, questionCount) {
    const uid = Auth.currentUser.id;
    const timestamp = Date.now();
    const storagePath = `${uid}/${category}/${timestamp}_${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await Auth.supabase.storage
      .from('user-pdfs')
      .upload(storagePath, blob, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Save metadata
    const { error: metaError } = await Auth.supabase
      .from('user_pdfs')
      .insert({
        user_id: uid,
        file_name: fileName,
        storage_path: storagePath,
        category: category,
        file_size_bytes: blob.size,
        pdf_type: pdfType,
        question_count: questionCount,
      });

    if (metaError) {
      console.error('PDF metadata error:', metaError);
      // Try to clean up uploaded file
      await Auth.supabase.storage.from('user-pdfs').remove([storagePath]);
      throw metaError;
    }
  },

  // ===== MEINE PDFs SCREEN =====
  async openMyPdfs() {
    if (!Auth.isLoggedIn) {
      App.showToast('Bitte melde dich an, um deine PDFs zu sehen.');
      return;
    }

    // Fetch user's PDFs
    const { data: pdfs, error } = await Auth.supabase
      .from('user_pdfs')
      .select('*')
      .eq('user_id', Auth.currentUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('PDF fetch error:', error);
      App.showToast('Fehler beim Laden der PDFs.');
      return;
    }

    // Check limits
    const isPremium = Auth.userProfile?.license_tier && Auth.userProfile.license_tier !== 'free';
    const pdfCount = pdfs?.length || 0;

    // Group by category
    const grouped = {};
    (pdfs || []).forEach(pdf => {
      const catLabel = this._categoryMap[pdf.category] || pdf.category;
      if (!grouped[catLabel]) grouped[catLabel] = [];
      grouped[catLabel].push(pdf);
    });

    // Sort categories by block order
    const catOrder = ['BMS', 'TV', 'KFF', 'SEK', 'Simulationen'];
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      const aBlock = catOrder.findIndex(c => a.startsWith(c));
      const bBlock = catOrder.findIndex(c => b.startsWith(c));
      return (aBlock === -1 ? 99 : aBlock) - (bBlock === -1 ? 99 : bBlock);
    });

    // Build screen
    let overlay = document.getElementById('my-pdfs-overlay');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'my-pdfs-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:var(--bg);overflow-y:auto;animation:fadeIn .3s ease';

    const blockColors = {
      'BMS': '#e0a820', 'TV': '#6db88a', 'KFF': '#9b7fc4', 'SEK': '#e0734a', 'Simulationen': '#1a1a2e'
    };

    let foldersHTML = '';
    if (sortedKeys.length === 0) {
      foldersHTML = `
        <div style="text-align:center;padding:3rem 1rem">
          <div style="font-size:3rem;margin-bottom:1rem">📭</div>
          <div style="font-weight:700;font-size:1.05rem;color:var(--text);margin-bottom:0.5rem">Noch keine PDFs gespeichert</div>
          <div style="font-size:0.85rem;color:var(--text-muted);line-height:1.6">
            Erstelle ein PDF über den PDF-Simulator und<br>speichere es in der App!
          </div>
        </div>
      `;
    } else {
      sortedKeys.forEach(catLabel => {
        const catPdfs = grouped[catLabel];
        const blockPrefix = catLabel.split(' – ')[0];
        const color = blockColors[blockPrefix] || '#888';
        const totalSize = catPdfs.reduce((s, p) => s + (p.file_size_bytes || 0), 0);
        const sizeStr = totalSize > 1048576
          ? (totalSize / 1048576).toFixed(1) + ' MB'
          : Math.round(totalSize / 1024) + ' KB';

        foldersHTML += `
          <div class="pdf-folder" style="background:var(--surface);border-radius:14px;margin-bottom:0.75rem;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.04)">
            <div onclick="this.parentElement.classList.toggle('open')" style="display:flex;align-items:center;gap:0.75rem;padding:0.9rem 1rem;cursor:pointer">
              <div style="width:36px;height:36px;border-radius:10px;background:${color}15;display:flex;align-items:center;justify-content:center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="${color}" stroke="none"><path d="M2 7.5V19a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-6.5l-2-2.5H4A2 2 0 002 7z"/></svg>
              </div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:0.88rem;color:var(--text)">${catLabel}</div>
                <div style="font-size:0.75rem;color:var(--text-muted)">${catPdfs.length} PDF${catPdfs.length !== 1 ? 's' : ''} · ${sizeStr}</div>
              </div>
              <svg class="pdf-folder-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" style="transition:transform .2s"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="pdf-folder-content" style="display:none;padding:0 0.75rem 0.75rem;border-top:1px solid var(--bg)">
              ${catPdfs.map(p => `
                <div style="display:flex;align-items:center;gap:0.6rem;padding:0.6rem 0.35rem;border-bottom:1px solid var(--bg)" data-pdf-id="${p.id}" data-storage-path="${p.storage_path}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:0.82rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.file_name}</div>
                    <div style="font-size:0.72rem;color:var(--text-muted)">${new Date(p.created_at).toLocaleDateString('de-AT', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}${p.question_count ? ' · ' + p.question_count + ' Fragen' : ''}</div>
                  </div>
                  <button onclick="PDFExport._downloadSavedPdf('${p.storage_path}','${p.file_name.replace(/'/g, "\\'")}')" style="background:none;border:none;padding:0.3rem;cursor:pointer" title="Herunterladen">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                  <button onclick="PDFExport._deleteSavedPdf('${p.id}','${p.storage_path}')" style="background:none;border:none;padding:0.3rem;cursor:pointer" title="Löschen">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0392b" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      });
    }

    const limitHTML = !isPremium ? `
      <div style="background:rgba(245,197,66,0.1);border:1px solid rgba(245,197,66,0.25);border-radius:10px;padding:0.7rem 0.9rem;margin-bottom:1rem;display:flex;align-items:center;gap:0.6rem">
        <div style="font-size:0.82rem;color:var(--text-muted);flex:1">
          <strong style="color:var(--text)">${pdfCount}/${this._FREE_PDF_LIMIT}</strong> PDFs gespeichert
          ${pdfCount >= this._FREE_PDF_LIMIT ? ' — <strong style="color:#c0392b">Limit erreicht!</strong>' : ''}
        </div>
        <button onclick="document.getElementById('my-pdfs-overlay').remove();App.showScreen('screen-konto')" style="background:var(--yellow);color:var(--dark);border:none;border-radius:8px;padding:0.35rem 0.8rem;font-weight:700;font-size:0.78rem;cursor:pointer;white-space:nowrap">Premium</button>
      </div>
    ` : '';

    overlay.innerHTML = `
      <div style="max-width:520px;margin:0 auto;padding:1.5rem 1.25rem 3rem">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
          <h2 style="font-size:1.15rem;font-weight:800;color:var(--text);margin:0">Meine PDFs</h2>
          <button onclick="document.getElementById('my-pdfs-overlay').remove()" style="background:var(--surface);border:none;width:36px;height:36px;border-radius:50%;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-muted);box-shadow:0 1px 4px rgba(0,0,0,0.08)">✕</button>
        </div>
        ${limitHTML}
        ${foldersHTML}
      </div>
    `;

    document.body.appendChild(overlay);

    // Add folder toggle CSS
    const style = document.createElement('style');
    style.textContent = `
      .pdf-folder.open .pdf-folder-content { display:block !important; }
      .pdf-folder.open .pdf-folder-chevron { transform:rotate(180deg); }
    `;
    overlay.prepend(style);
  },

  async _downloadSavedPdf(storagePath, fileName) {
    try {
      const { data, error } = await Auth.supabase.storage
        .from('user-pdfs')
        .download(storagePath);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF download error:', e);
      App.showToast('Fehler beim Herunterladen.');
    }
  },

  async _deleteSavedPdf(id, storagePath) {
    if (!confirm('PDF wirklich löschen?')) return;
    try {
      // Delete from storage
      await Auth.supabase.storage.from('user-pdfs').remove([storagePath]);
      // Delete metadata
      await Auth.supabase.from('user_pdfs').delete().eq('id', id);
      // Remove from DOM
      const el = document.querySelector(`[data-pdf-id="${id}"]`);
      if (el) el.remove();
      App.showToast('PDF gelöscht');
    } catch (e) {
      console.error('PDF delete error:', e);
      App.showToast('Fehler beim Löschen.');
    }
  },


  // =======================================================================
  // ===== ADMIN: Kompletter Fragenexport als PDF – MODERN DESIGN v3 ======
  // =======================================================================

  // --- SVG Icon Pre-Rendering System ---
  // Converts Lucide SVG icons from ICONS object to PNG data URLs for PDF embedding
  async _preRenderPDFIcons(neededKeys, size, color) {
    const rendered = {};
    const pxSize = size * 4; // high-res for crisp PDF rendering
    for (const key of neededKeys) {
      let svg = ICONS[key];
      if (!svg || !svg.startsWith('<svg')) continue;
      // Replace template vars and set color
      svg = svg.replace(/SIZE/g, pxSize).replace(/SW/g, '2');
      svg = svg.replace(/currentColor/g, color);
      // Fix viewBox width/height to match pxSize
      svg = svg.replace(/width="\d+"/, `width="${pxSize}"`).replace(/height="\d+"/, `height="${pxSize}"`);
      try {
        rendered[key] = await this._svgToPng(svg, pxSize);
      } catch (e) { console.warn('Icon render failed:', key, e); }
    }
    return rendered;
  },

  _svgToPng(svgStr, pxSize) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = pxSize;
        canvas.height = pxSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, pxSize, pxSize);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG render failed')); };
      img.src = url;
    });
  },

  // Map topic/section names to ICONS keys
  _topicToIconKey(topic, block) {
    const map = {
      // BMS subjects
      'Biologie': 'dna', 'Chemie': 'testTube', 'Physik': 'atom', 'Mathematik': 'ruler',
      // BMS biology topics → ALL use dna (consistent per subject)
      'Zellbiologie': 'dna', 'Genetik & Molekularbiologie': 'dna', 'Humangenetik': 'dna',
      'Methoden der Gentechnik': 'dna', 'Herz-Kreislauf-System': 'dna',
      'Nervensystem': 'dna', 'Immunsystem': 'dna', 'Atmungssystem': 'dna',
      'Bewegungsapparat': 'dna', 'Fortpflanzung & Entwicklung': 'dna',
      'Hormonsystem': 'dna', 'Niere & Harnwege': 'dna', 'Verdauungssystem': 'dna',
      'Gewebe & Histologie': 'dna', 'Stoffwechsel': 'dna', 'Ökologie & Evolution': 'dna',
      // Chemistry topics → testTube
      'Atombau & PSE': 'testTube', 'Chemische Bindung': 'testTube', 'Chemisches Gleichgewicht': 'testTube',
      'Elemente & Verbindungen': 'testTube', 'Gasgesetze & Aggregatzustände': 'testTube',
      'Naturstoffe': 'testTube', 'Organische Chemie': 'testTube',
      'Redox & Elektrochemie': 'testTube', 'Säure-Base': 'testTube',
      'Stöchiometrie & Reaktionen': 'testTube',
      // Physics → atom
      'Mechanik': 'atom', 'Thermodynamik': 'atom', 'Elektrizität & Magnetismus': 'atom',
      'Optik': 'atom', 'Wellen & Akustik': 'atom', 'Atomphysik & Radioaktivität': 'atom',
      // Math → ruler
      'Algebra & Gleichungen': 'ruler', 'Funktionen & Analysis': 'ruler',
      'Geometrie & Trigonometrie': 'ruler', 'Statistik & Wahrscheinlichkeit': 'ruler',
      'Prozent- & Zinsrechnung': 'ruler', 'Einheiten & Umrechnung': 'ruler',
      // KFF
      'Zahlenfolgen': 'hash', 'Wortflüssigkeit': 'textLines', 'Implikationen erkennen': 'brainCog',
      // TV
      'Textverständnis': 'bookRead',
      // SEK
      'Emotionen erkennen': 'eye', 'Emotionen regulieren': 'smile', 'Soziales Entscheiden': 'users',
    };
    if (map[topic]) return map[topic];
    // Fallback by block
    const blockIcons = { bms: 'flask', tv: 'bookRead', kff: 'brain', sek: 'heart' };
    return blockIcons[block] || 'flask';
  },

  // Place a pre-rendered icon in the PDF
  _placeIcon(pdf, iconDataUrl, x, y, sizeMM) {
    if (!iconDataUrl) return;
    try {
      pdf.addImage(iconDataUrl, 'PNG', x, y, sizeMM, sizeMM);
    } catch (e) { /* silently skip if icon fails */ }
  },

  // Block color definitions matching app
  _adminBlockColors: {
    bms: { rgb: [224, 168, 32], hex: '#e0a820', dark: [180, 134, 25], light: [253, 245, 224] },
    tv:  { rgb: [109, 184, 138], hex: '#6db88a', dark: [74, 158, 110], light: [232, 246, 237] },
    kff: { rgb: [155, 127, 196], hex: '#9b7fc4', dark: [122, 95, 176], light: [240, 235, 248] },
    sek: { rgb: [224, 115, 74],  hex: '#e0734a', dark: [200, 100, 64], light: [253, 238, 232] },
  },

  _adminSubjectColors: {
    biologie:    { rgb: [22, 163, 74],  dark: [18, 130, 59] },
    chemie:      { rgb: [220, 38, 38],  dark: [180, 30, 30] },
    physik:      { rgb: [37, 99, 235],  dark: [30, 80, 190] },
    mathematik:  { rgb: [147, 51, 234], dark: [120, 40, 190] },
  },

  openAdminExportDialog() {
    if (!Admin.isAdmin()) return;
    if (!window.jspdf) { alert('PDF-Bibliothek wird noch geladen...'); return; }

    const overlay = document.createElement('div');
    overlay.id = 'admin-pdf-overlay';
    overlay.className = 'pdf-overlay';

    const subjectLabels = { biologie: 'Biologie', chemie: 'Chemie', physik: 'Physik', mathematik: 'Mathematik' };
    const subjectColors = { biologie: '#16a34a', chemie: '#dc2626', physik: '#2563eb', mathematik: '#9333ea' };

    let bmsHTML = '';
    for (const [subject, topics] of Object.entries(CONFIG.BMS_TOPICS)) {
      const color = subjectColors[subject] || '#666';
      let topicItems = topics.map(t =>
        `<label class="apdf-topic-item">
          <input type="checkbox" name="apdf-item" value="bms::${subject}::${t}" checked>
          <span>${t}</span>
        </label>`
      ).join('');
      bmsHTML += `
        <div class="apdf-subject-group">
          <div class="apdf-subject-header" style="border-left:4px solid ${color};">
            <label class="apdf-subject-toggle">
              <input type="checkbox" class="apdf-group-cb" data-group="bms-${subject}" checked>
              <strong>${subjectLabels[subject]}</strong>
              <span class="apdf-topic-count">${topics.length} Themen</span>
            </label>
          </div>
          <div class="apdf-topic-list" data-group="bms-${subject}">${topicItems}</div>
        </div>`;
    }

    const kffSections = [
      { key: 'zahlenfolge', label: 'Zahlenfolgen' },
      { key: 'wortfluessigkeit', label: 'Wortflüssigkeit' },
      { key: 'implikation', label: 'Implikationen erkennen' },
    ];
    let kffHTML = kffSections.map(s =>
      `<label class="apdf-topic-item" style="width:100%">
        <input type="checkbox" name="apdf-item" value="kff::${s.key}" checked>
        <span>${s.label}</span>
      </label>`
    ).join('');

    const tvHTML = `<label class="apdf-topic-item" style="width:100%">
      <input type="checkbox" name="apdf-item" value="tv::textverstaendnis" checked>
      <span>Textverständnis (Texte + Fragen)</span>
    </label>`;

    const sekSections = [
      { key: 'erkennen', label: 'Emotionen erkennen' },
      { key: 'regulieren', label: 'Emotionen regulieren' },
      { key: 'entscheiden', label: 'Soziales Entscheiden' },
    ];
    let sekHTML = sekSections.map(s =>
      `<label class="apdf-topic-item" style="width:100%">
        <input type="checkbox" name="apdf-item" value="sek::${s.key}" checked>
        <span>${s.label}</span>
      </label>`
    ).join('');

    const bc = this._adminBlockColors;
    overlay.innerHTML = `
      <div class="pdf-modal" style="max-width:540px">
        <div class="pdf-modal-header" style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);color:#fff">
          <h2 style="display:flex;align-items:center;gap:8px">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Admin: Fragen-PDF Export
          </h2>
          <button class="pdf-close" id="apdf-close" style="color:#fff">&times;</button>
        </div>
        <div class="pdf-modal-body" style="max-height:420px;overflow-y:auto">
          <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:12px">
            Wähle Testteile, Fächer und Themen. Export mit modernem Design, Inhaltsverzeichnis und Lösungsschlüssel.
          </p>
          <div class="apdf-quick-btns">
            <button class="pdf-quick-btn" id="apdf-all">Alle auswählen</button>
            <button class="pdf-quick-btn" id="apdf-none">Alle abwählen</button>
          </div>
          <div class="apdf-topics-picker">
            <div class="apdf-block-header" style="background:${bc.bms.hex};color:#fff;padding:6px 10px;font-weight:700;font-size:0.85rem">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                <input type="checkbox" class="apdf-block-cb" data-block="bms" checked style="accent-color:${bc.bms.hex}">
                BMS — Basiskenntnistest
              </label>
            </div>
            ${bmsHTML}
            <div class="apdf-block-header" style="background:${bc.kff.hex};color:#fff;padding:6px 10px;font-weight:700;font-size:0.85rem;margin-top:2px">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                <input type="checkbox" class="apdf-block-cb" data-block="kff" checked style="accent-color:${bc.kff.hex}">
                KFF — Kognitive Fähigkeiten und Fertigkeiten
              </label>
            </div>
            <div class="apdf-topic-list" data-group="kff" style="padding:0.4rem 0.85rem 0.5rem 1.6rem">${kffHTML}</div>
            <div class="apdf-block-header" style="background:${bc.tv.hex};color:#fff;padding:6px 10px;font-weight:700;font-size:0.85rem;margin-top:2px">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                <input type="checkbox" class="apdf-block-cb" data-block="tv" checked style="accent-color:${bc.tv.hex}">
                TV — Textverständnis
              </label>
            </div>
            <div class="apdf-topic-list" data-group="tv" style="padding:0.4rem 0.85rem 0.5rem 1.6rem">${tvHTML}</div>
            <div class="apdf-block-header" style="background:${bc.sek.hex};color:#fff;padding:6px 10px;font-weight:700;font-size:0.85rem;margin-top:2px">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                <input type="checkbox" class="apdf-block-cb" data-block="sek" checked style="accent-color:${bc.sek.hex}">
                SEK — Sozial-emotionale Kompetenzen
              </label>
            </div>
            <div class="apdf-topic-list" data-group="sek" style="padding:0.4rem 0.85rem 0.5rem 1.6rem">${sekHTML}</div>
          </div>
          <div style="margin-top:12px">
            <label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;cursor:pointer">
              <input type="checkbox" id="apdf-include-explanations" checked>
              Erklärungen einbeziehen
            </label>
          </div>
          <div id="apdf-summary" style="margin-top:8px;font-size:0.85rem;color:var(--text-muted);font-weight:600;text-align:center"></div>
        </div>
        <div class="pdf-modal-footer">
          <button class="btn-secondary" id="apdf-cancel">Abbrechen</button>
          <button class="btn-primary" id="apdf-generate" style="background:linear-gradient(135deg,#1a1a2e,#6d28d9)">
            <span id="apdf-btn-text">PDF generieren</span>
            <span id="apdf-btn-loading" class="hidden">Wird erstellt...</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));

    // Block-level toggle
    overlay.querySelectorAll('.apdf-block-cb').forEach(bcb => {
      bcb.addEventListener('change', () => {
        const block = bcb.dataset.block;
        overlay.querySelectorAll('input[name="apdf-item"]').forEach(cb => {
          if (cb.value.startsWith(block + '::')) cb.checked = bcb.checked;
        });
        overlay.querySelectorAll('.apdf-group-cb').forEach(gcb => {
          if (gcb.dataset.group.startsWith(block + '-')) { gcb.checked = bcb.checked; gcb.indeterminate = false; }
        });
        this._updateAdminExportSummary();
      });
    });

    overlay.querySelectorAll('.apdf-group-cb').forEach(gcb => {
      gcb.addEventListener('change', () => {
        const group = gcb.dataset.group;
        overlay.querySelectorAll(`.apdf-topic-list[data-group="${group}"] input[name="apdf-item"]`).forEach(cb => cb.checked = gcb.checked);
        this._updateAdminBlockCb(overlay, group.split('-')[0]);
        this._updateAdminExportSummary();
      });
    });

    overlay.querySelectorAll('input[name="apdf-item"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const parts = cb.value.split('::');
        const block = parts[0];
        if (block === 'bms') {
          const group = `bms-${parts[1]}`;
          const all = overlay.querySelectorAll(`.apdf-topic-list[data-group="${group}"] input[name="apdf-item"]`);
          const checked = [...all].filter(c => c.checked);
          const gcb = overlay.querySelector(`.apdf-group-cb[data-group="${group}"]`);
          if (gcb) { gcb.checked = checked.length === all.length; gcb.indeterminate = checked.length > 0 && checked.length < all.length; }
        }
        this._updateAdminBlockCb(overlay, block);
        this._updateAdminExportSummary();
      });
    });

    document.getElementById('apdf-all').onclick = () => {
      overlay.querySelectorAll('input[name="apdf-item"], .apdf-group-cb, .apdf-block-cb').forEach(cb => { cb.checked = true; cb.indeterminate = false; });
      this._updateAdminExportSummary();
    };
    document.getElementById('apdf-none').onclick = () => {
      overlay.querySelectorAll('input[name="apdf-item"], .apdf-group-cb, .apdf-block-cb').forEach(cb => { cb.checked = false; cb.indeterminate = false; });
      this._updateAdminExportSummary();
    };

    const close = () => { overlay.classList.remove('visible'); setTimeout(() => overlay.remove(), 300); };
    document.getElementById('apdf-close').onclick = close;
    document.getElementById('apdf-cancel').onclick = close;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    document.getElementById('apdf-generate').onclick = async () => {
      const selected = [...overlay.querySelectorAll('input[name="apdf-item"]:checked')].map(c => c.value);
      if (!selected.length) { alert('Bitte mindestens einen Bereich auswählen.'); return; }
      const includeExplanations = document.getElementById('apdf-include-explanations').checked;
      close();
      await this._generateAdminExportPDF(selected, includeExplanations);
    };

    this._updateAdminExportSummary();
  },

  _updateAdminBlockCb(overlay, block) {
    const allInBlock = [...overlay.querySelectorAll('input[name="apdf-item"]')].filter(cb => cb.value.startsWith(block + '::'));
    const checkedInBlock = allInBlock.filter(c => c.checked);
    const bcb = overlay.querySelector(`.apdf-block-cb[data-block="${block}"]`);
    if (bcb) { bcb.checked = checkedInBlock.length === allInBlock.length; bcb.indeterminate = checkedInBlock.length > 0 && checkedInBlock.length < allInBlock.length; }
  },

  _updateAdminExportSummary() {
    const checked = document.querySelectorAll('#admin-pdf-overlay input[name="apdf-item"]:checked');
    const blocks = new Set([...checked].map(c => c.value.split('::')[0]));
    const blockLabels = { bms: 'BMS', kff: 'KFF', tv: 'TV', sek: 'SEK' };
    const parts = [...blocks].map(b => blockLabels[b] || b);
    const el = document.getElementById('apdf-summary');
    if (el) el.textContent = `${checked.length} Bereiche ausgewählt` + (parts.length ? ` (${parts.join(', ')})` : '');
  },

  // ===================== MAIN PDF GENERATION =====================

  async _generateAdminExportPDF(selectedItems, includeExplanations) {
    const progressOverlay = document.createElement('div');
    progressOverlay.className = 'pdf-overlay visible';
    progressOverlay.innerHTML = `
      <div class="pdf-modal" style="max-width:380px;text-align:center;padding:30px">
        <h3 style="margin-bottom:12px">Fragen-PDF wird erstellt...</h3>
        <div style="background:#eee;height:8px;border-radius:4px;overflow:hidden;margin-bottom:12px">
          <div id="apdf-progress-bar" style="background:linear-gradient(90deg,#9b7fc4,#6d28d9);height:100%;width:0%;transition:width 0.3s;border-radius:4px"></div>
        </div>
        <div id="apdf-progress-text" style="font-size:0.85rem;color:#666">Fragen werden geladen...</div>
      </div>`;
    document.body.appendChild(progressOverlay);

    const setProgress = (pct, text) => {
      const bar = document.getElementById('apdf-progress-bar');
      const txt = document.getElementById('apdf-progress-text');
      if (bar) bar.style.width = pct + '%';
      if (txt) txt.textContent = text;
    };

    try {
      // Parse selections
      const bmsTopics = {};
      const kffTypes = [];
      let hasTv = false;
      const sekTypes = [];

      for (const item of selectedItems) {
        const parts = item.split('::');
        if (parts[0] === 'bms') {
          if (!bmsTopics[parts[1]]) bmsTopics[parts[1]] = [];
          bmsTopics[parts[1]].push(parts[2]);
        } else if (parts[0] === 'kff') {
          kffTypes.push(parts[1]);
        } else if (parts[0] === 'tv') {
          hasTv = true;
        } else if (parts[0] === 'sek') {
          sekTypes.push(parts[1]);
        }
      }

      setProgress(3, 'Icons werden vorbereitet...');

      // --- PRE-RENDER LUCIDE SVG ICONS as PNGs ---
      const iconKeys = new Set(['flask', 'bookRead', 'brain', 'heart', 'dna', 'testTube', 'atom', 'ruler', 'hash', 'textLines', 'brainCog', 'eye', 'smile', 'users']);
      // White icons for dark backgrounds (chapter headers)
      const whiteIcons = await this._preRenderPDFIcons([...iconKeys], 48, '#ffffff');
      // Dark icons for light backgrounds (TOC, answer key) — render per block color
      const coloredIcons = {};
      const bc = this._adminBlockColors;
      const sc = this._adminSubjectColors;
      for (const [block, bConf] of Object.entries(bc)) {
        coloredIcons[block] = await this._preRenderPDFIcons([...iconKeys], 48, bConf.hex);
      }
      for (const [subj, sConf] of Object.entries(sc)) {
        const hex = '#' + sConf.rgb.map(v => v.toString(16).padStart(2, '0')).join('');
        coloredIcons[subj] = await this._preRenderPDFIcons([...iconKeys], 48, hex);
      }

      setProgress(5, 'Fragen werden aus der Datenbank geladen...');

      // === LOAD DATA ===
      const chapters = [];
      let totalQ = 0;
      const subjectLabels = { biologie: 'Biologie', chemie: 'Chemie', physik: 'Physik', mathematik: 'Mathematik' };

      // BMS questions
      for (const [subject, topics] of Object.entries(bmsTopics)) {
        for (const topic of topics) {
          const { data, error } = await Auth.supabase
            .from('questions').select('*')
            .eq('type', 'bms').eq('subtype', subject).eq('topic', topic)
            .order('created_at', { ascending: true });
          if (error || !data || data.length === 0) continue;
          const sColor = sc[subject] || { rgb: [100, 100, 100], dark: [80, 80, 80] };
          chapters.push({
            block: 'bms', blockLabel: 'BMS', subject, subjectLabel: subjectLabels[subject] || subject,
            label: topic, color: sColor.rgb, blockColor: bc.bms.rgb,
            questions: data, questionType: 'mcq',
          });
          totalQ += data.length;
        }
      }

      // KFF questions
      for (const kffType of kffTypes) {
        const { data, error } = await Auth.supabase
          .from('questions').select('*')
          .eq('type', kffType)
          .order('created_at', { ascending: true });
        if (error || !data || data.length === 0) continue;
        const labels = { zahlenfolge: 'Zahlenfolgen', wortfluessigkeit: 'Wortflüssigkeit', implikation: 'Implikationen erkennen' };
        chapters.push({
          block: 'kff', blockLabel: 'KFF', subject: null, subjectLabel: 'Kognitive Fähigkeiten',
          label: labels[kffType] || kffType, color: bc.kff.rgb, blockColor: bc.kff.rgb,
          questions: data, questionType: kffType,
        });
        totalQ += data.length;
      }

      // TV texts
      if (hasTv) {
        const { data, error } = await Auth.supabase
          .from('pre_generated_tv').select('*')
          .order('created_at', { ascending: true });
        if (!error && data && data.length > 0) {
          chapters.push({
            block: 'tv', blockLabel: 'TV', subject: null, subjectLabel: 'Textverständnis',
            label: 'Textverständnis', color: bc.tv.rgb, blockColor: bc.tv.rgb,
            questions: data, questionType: 'tv',
          });
          totalQ += data.length;
        }
      }

      // SEK questions
      for (const sekType of sekTypes) {
        const { data, error } = await Auth.supabase
          .from('pre_generated_sek').select('*')
          .eq('sek_type', sekType)
          .order('created_at', { ascending: true });
        if (error || !data || data.length === 0) continue;
        const labels = { erkennen: 'Emotionen erkennen', regulieren: 'Emotionen regulieren', entscheiden: 'Soziales Entscheiden' };
        chapters.push({
          block: 'sek', blockLabel: 'SEK', subject: null, subjectLabel: 'Sozial-emotionale Kompetenzen',
          label: labels[sekType] || sekType, color: bc.sek.rgb, blockColor: bc.sek.rgb,
          questions: data, questionType: 'sek',
        });
        totalQ += data.length;
      }

      if (totalQ === 0) {
        progressOverlay.remove();
        alert('Keine Fragen gefunden für die ausgewählten Bereiche.');
        return;
      }

      setProgress(20, `${totalQ} Fragen geladen. PDF wird erstellt...`);

      // === CREATE PDF ===
      const pdf = await this._createPDFDoc();
      const ctx = this._newContext(pdf);
      // Store icons on ctx for easy access
      ctx.whiteIcons = whiteIcons;
      ctx.coloredIcons = coloredIcons;

      // --- 1. COVER PAGE ---
      this._drawAdminCoverPage(ctx, chapters, totalQ, includeExplanations);

      // --- 2. Reserve TOC pages ---
      pdf.addPage();
      const tocPageStart = pdf.getNumberOfPages();
      ctx.y = ctx.margin;
      const tocPagesNeeded = Math.ceil(chapters.length / 18);
      for (let tp = 1; tp < tocPagesNeeded; tp++) pdf.addPage();

      setProgress(25, 'Deckblatt und Inhaltsverzeichnis vorbereitet...');

      // --- 3. RENDER CHAPTERS ---
      const tocEntries = [];
      const answerKeys = [];
      let chapterNum = 0;
      let pct = 25;
      const pctStep = 50 / Math.max(chapters.length, 1);
      const chapterTitlePages = [];

      for (const chapter of chapters) {
        chapterNum++;
        pct += pctStep;
        setProgress(Math.round(pct), `${chapter.blockLabel}: ${chapter.label} (${chapter.questions.length} Fragen)...`);
        await new Promise(r => setTimeout(r, 10));

        pdf.addPage();
        ctx.y = ctx.margin;
        const chapterStartPage = pdf.getNumberOfPages();
        chapterTitlePages.push(chapterStartPage);
        tocEntries.push({
          ...chapter, pageNum: chapterStartPage,
          questionCount: chapter.questions.length, chapterNum,
          answerPageNum: 0,
        });

        this._drawAdminChapterTitle(ctx, chapterNum, chapter);

        pdf.addPage();
        ctx.y = ctx.margin;
        const topicAnswers = [];

        if (chapter.questionType === 'tv') {
          this._renderTVQuestions(ctx, chapter, chapterNum, topicAnswers);
        } else if (chapter.questionType === 'sek') {
          this._renderSEKQuestions(ctx, chapter, chapterNum, topicAnswers);
        } else if (chapter.questionType === 'zahlenfolge') {
          this._renderZahlenfolgenQuestions(ctx, chapter, chapterNum, topicAnswers);
        } else if (chapter.questionType === 'wortfluessigkeit') {
          this._renderWortfluessigkeitQuestions(ctx, chapter, chapterNum, topicAnswers);
        } else if (chapter.questionType === 'implikation') {
          this._renderImplikationQuestions(ctx, chapter, chapterNum, topicAnswers);
        } else {
          this._renderMCQQuestions(ctx, chapter, chapterNum, topicAnswers);
        }

        answerKeys.push({ ...chapter, answers: topicAnswers, chapterNum });
      }

      // --- 4. ANSWER KEY ---
      setProgress(80, 'Lösungsschlüssel wird erstellt...');
      const answerPageMap = {};

      for (let aki = 0; aki < answerKeys.length; aki++) {
        const ak = answerKeys[aki];
        pdf.addPage();
        ctx.y = ctx.margin;
        const answerPage = pdf.getNumberOfPages();
        answerPageMap[ak.chapterNum] = answerPage;
        tocEntries[aki].answerPageNum = answerPage;
        this._drawAdminAnswerChapter(ctx, ak, includeExplanations);
      }

      // --- 5. FILL IN TOC ---
      setProgress(90, 'Inhaltsverzeichnis wird erstellt...');
      this._drawAdminTOC(ctx, tocPageStart, tocEntries);

      // --- 6. BACKFILL answer page links on chapter title pages ---
      for (let i = 0; i < tocEntries.length; i++) {
        const entry = tocEntries[i];
        const titlePage = chapterTitlePages[i];
        pdf.setPage(titlePage);
        const linkY = 82;
        pdf.setFontSize(9);
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setTextColor(entry.color[0], entry.color[1], entry.color[2]);
        pdf.text(`Lösungen  →  Seite ${entry.answerPageNum}`, ctx.pageW / 2, linkY, { align: 'center' });
        pdf.link(ctx.pageW / 2 - 25, linkY - 4, 50, 7, { pageNumber: entry.answerPageNum });
      }

      // --- 7. PAGE NUMBERS ---
      setProgress(95, 'Seitenzahlen werden eingefügt...');
      const totalPages = pdf.getNumberOfPages();
      for (let p = 2; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setDrawColor(220, 220, 230);
        pdf.setLineWidth(0.3);
        pdf.line(ctx.margin, ctx.pageH - 12, ctx.pageW - ctx.marginRight, ctx.pageH - 12);
        pdf.setFontSize(7.5);
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setTextColor(140);
        pdf.text(`Seite ${p} von ${totalPages}`, ctx.pageW / 2, ctx.pageH - 7, { align: 'center' });
        pdf.setFontSize(6.5);
        pdf.setTextColor(180);
        pdf.text('MedAT Trainer', ctx.margin, ctx.pageH - 7);
        pdf.text('medat-trainer.vercel.app', ctx.pageW - ctx.marginRight, ctx.pageH - 7, { align: 'right' });
      }

      // === SAVE ===
      setProgress(100, 'PDF wird heruntergeladen...');
      await new Promise(r => setTimeout(r, 300));

      const blocks = [...new Set(chapters.map(c => c.blockLabel))].join('_');
      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`MedAT_Fragen_${blocks}_${dateStr}.pdf`);

      progressOverlay.remove();
      App.showToast(`PDF mit ${totalQ} Fragen erstellt!`);

    } catch (e) {
      console.error('Admin PDF export error:', e);
      progressOverlay.remove();
      alert('Fehler beim PDF-Export: ' + e.message);
    }
  },

  // ===================== COVER PAGE =====================
  _drawAdminCoverPage(ctx, chapters, totalQ, includeExplanations) {
    const { pdf, pageW, pageH, margin, contentW } = ctx;
    const bc = this._adminBlockColors;

    // Dark gradient header
    pdf.setFillColor(20, 18, 36);
    pdf.rect(0, 0, pageW, 110, 'F');
    pdf.setFillColor(35, 25, 60);
    pdf.rect(0, 50, pageW, 60, 'F');

    // Geometric accent shapes
    pdf.setFillColor(50, 40, 80);
    pdf.circle(30, 20, 25, 'F');
    pdf.circle(180, 90, 18, 'F');
    pdf.setFillColor(60, 45, 95);
    pdf.circle(170, 15, 12, 'F');
    pdf.circle(45, 85, 10, 'F');

    // Gold accent bar
    pdf.setFillColor(bc.bms.rgb[0], bc.bms.rgb[1], bc.bms.rgb[2]);
    pdf.rect(0, 108, pageW, 2.5, 'F');

    // Title
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(34);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.text('MedAT Trainer', pageW / 2, 38, { align: 'center' });

    pdf.setFontSize(15);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(200, 195, 220);
    pdf.text('Fragensammlung', pageW / 2, 54, { align: 'center' });

    // Block tags
    const blocks = [...new Set(chapters.map(c => c.block))];
    const tagY = 72;
    const tagW = 38;
    const totalTagW = blocks.length * tagW + (blocks.length - 1) * 4;
    let tagX = (pageW - totalTagW) / 2;
    for (const block of blocks) {
      const bColor = bc[block] || bc.bms;
      pdf.setFillColor(bColor.rgb[0], bColor.rgb[1], bColor.rgb[2]);
      pdf.roundedRect(tagX, tagY - 4.5, tagW, 10, 2, 2, 'F');
      pdf.setFontSize(8);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(255);
      const blockName = { bms: 'BMS', kff: 'KFF', tv: 'TV', sek: 'SEK' }[block] || block;
      pdf.text(blockName, tagX + tagW / 2, tagY + 2, { align: 'center' });
      tagX += tagW + 4;
    }

    // Stats
    pdf.setFontSize(10);
    pdf.setTextColor(180, 175, 200);
    pdf.text(`${totalQ} Fragen  ·  ${chapters.length} Kapitel  ·  ${includeExplanations ? 'Mit Erklärungen' : 'Ohne Erklärungen'}`, pageW / 2, 92, { align: 'center' });

    // Block summary cards
    ctx.y = 125;
    const cardW = (contentW - 6) / 2;
    let cardIdx = 0;
    const blockSummary = {};
    for (const ch of chapters) {
      if (!blockSummary[ch.block]) blockSummary[ch.block] = { label: ch.blockLabel, count: 0, chapters: 0, block: ch.block };
      blockSummary[ch.block].count += ch.questions.length;
      blockSummary[ch.block].chapters++;
    }

    for (const [block, info] of Object.entries(blockSummary)) {
      const bColor = bc[block] || bc.bms;
      const col = cardIdx % 2;
      const cx = margin + col * (cardW + 6);
      if (col === 0 && cardIdx > 0) ctx.y += 30;

      // Card with shadow
      pdf.setFillColor(245, 244, 250);
      pdf.roundedRect(cx + 0.5, ctx.y + 0.5, cardW, 26, 2, 2, 'F');
      pdf.setFillColor(252, 251, 255);
      pdf.roundedRect(cx, ctx.y, cardW, 26, 2, 2, 'F');
      pdf.setFillColor(bColor.rgb[0], bColor.rgb[1], bColor.rgb[2]);
      pdf.roundedRect(cx, ctx.y, 3.5, 26, 1.5, 1.5, 'F');

      // Block icon
      const blockIconKey = { bms: 'flask', kff: 'brain', tv: 'bookRead', sek: 'heart' }[block] || 'flask';
      const iconSet = ctx.coloredIcons[block];
      if (iconSet && iconSet[blockIconKey]) {
        this._placeIcon(pdf, iconSet[blockIconKey], cx + cardW - 16, ctx.y + 5, 8);
      }

      const fullNames = { bms: 'Basiskenntnistest', kff: 'Kognitive Fähigkeiten', tv: 'Textverständnis', sek: 'Sozial-emotionale Kompetenzen' };
      pdf.setFontSize(10);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(bColor.rgb[0], bColor.rgb[1], bColor.rgb[2]);
      pdf.text(info.label, cx + 8, ctx.y + 10);

      pdf.setFontSize(7.5);
      pdf.setFont('DejaVuSans', 'normal');
      pdf.setTextColor(130);
      pdf.text(fullNames[block] || '', cx + 8, ctx.y + 16);
      pdf.text(`${info.chapters} Kapitel  ·  ${info.count} Fragen`, cx + 8, ctx.y + 22);

      cardIdx++;
    }
    if (cardIdx > 0) ctx.y += 30;

    // Footer
    ctx.y = Math.max(ctx.y + 15, 220);
    pdf.setDrawColor(220, 215, 230);
    pdf.setLineWidth(0.3);
    pdf.line(margin + 30, ctx.y, pageW - margin - 30, ctx.y);
    ctx.y += 12;

    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.text(`Erstellt am ${new Date().toLocaleDateString('de-AT', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageW / 2, ctx.y, { align: 'center' });
    ctx.y += 10;
    pdf.setFontSize(8.5);
    pdf.setTextColor(160);
    pdf.text('Dieses Dokument ist vertraulich und nur für internen Gebrauch bestimmt.', pageW / 2, ctx.y, { align: 'center' });

    pdf.setFontSize(8);
    pdf.setTextColor(180);
    pdf.text('MedAT Trainer  ·  medat-trainer.vercel.app', pageW / 2, pageH - 15, { align: 'center' });
  },

  // ===================== TABLE OF CONTENTS =====================
  _drawAdminTOC(ctx, tocPageStart, tocEntries) {
    const { pdf, pageW, pageH, margin, contentW } = ctx;
    const bc = this._adminBlockColors;
    pdf.setPage(tocPageStart);
    let tocY = margin;

    pdf.setFontSize(20);
    pdf.setTextColor(30, 25, 50);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.text('Inhaltsverzeichnis', margin, tocY);
    tocY += 3;
    const accentColors = [bc.bms.rgb, bc.kff.rgb, bc.tv.rgb, bc.sek.rgb];
    for (let i = 0; i < accentColors.length; i++) {
      pdf.setFillColor(accentColors[i][0], accentColors[i][1], accentColors[i][2]);
      pdf.rect(margin + i * 15, tocY, 15, 1.5, 'F');
    }
    tocY += 10;

    let lastBlock = '';
    const blockFullLabels = {
      bms: 'BMS — Basiskenntnistest',
      kff: 'KFF — Kognitive Fähigkeiten und Fertigkeiten',
      tv: 'TV — Textverständnis',
      sek: 'SEK — Sozial-emotionale Kompetenzen'
    };

    for (const entry of tocEntries) {
      if (tocY > pageH - 30) {
        const nextPageNum = pdf.internal.getCurrentPageInfo().pageNumber + 1;
        if (nextPageNum <= pdf.getNumberOfPages()) pdf.setPage(nextPageNum);
        else pdf.addPage();
        tocY = margin;
      }

      if (entry.block !== lastBlock) {
        lastBlock = entry.block;
        tocY += 4;
        const bColor = bc[entry.block] || bc.bms;
        pdf.setFillColor(bColor.light[0], bColor.light[1], bColor.light[2]);
        pdf.roundedRect(margin, tocY - 5, contentW, 11, 2, 2, 'F');
        pdf.setFillColor(bColor.rgb[0], bColor.rgb[1], bColor.rgb[2]);
        pdf.roundedRect(margin, tocY - 5, 3, 11, 1.5, 1.5, 'F');

        // Block icon in header
        const blockIconKey = { bms: 'flask', kff: 'brain', tv: 'bookRead', sek: 'heart' }[entry.block] || 'flask';
        const iconSet = ctx.coloredIcons[entry.block];
        if (iconSet && iconSet[blockIconKey]) {
          this._placeIcon(pdf, iconSet[blockIconKey], margin + 5, tocY - 4.5, 6);
        }

        pdf.setFontSize(9.5);
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setTextColor(bColor.dark[0], bColor.dark[1], bColor.dark[2]);
        pdf.text(blockFullLabels[entry.block] || entry.blockLabel, margin + 13, tocY + 1.5);
        tocY += 12;
      }

      // Topic icon (smaller, colored by subject)
      const iconKey = this._topicToIconKey(entry.label, entry.block);
      const iconColorSet = entry.subject ? ctx.coloredIcons[entry.subject] : ctx.coloredIcons[entry.block];
      if (iconColorSet && iconColorSet[iconKey]) {
        this._placeIcon(pdf, iconColorSet[iconKey], margin + 5, tocY - 3.5, 5);
      }

      // Topic name
      pdf.setFontSize(9);
      pdf.setFont('DejaVuSans', 'normal');
      pdf.setTextColor(50, 50, 70);
      pdf.text(entry.label, margin + 13, tocY + 1);

      // Question count
      pdf.setFontSize(7);
      pdf.setTextColor(150);
      pdf.text(`${entry.questionCount} Fragen`, margin + contentW * 0.52, tocY + 1);

      // Dot leader
      pdf.setFontSize(6);
      pdf.setTextColor(200);
      let dotX = margin + contentW * 0.62;
      const dotEnd = margin + contentW - 48;
      while (dotX < dotEnd) { pdf.text('.', dotX, tocY + 1); dotX += 2; }

      // Page number (right-aligned, clear column)
      pdf.setFontSize(8.5);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(entry.color[0], entry.color[1], entry.color[2]);
      pdf.text(`S. ${entry.pageNum}`, margin + contentW - 22, tocY + 1, { align: 'right' });

      // Answer page number (right-aligned, separate column)
      pdf.setFontSize(7);
      pdf.setFont('DejaVuSans', 'normal');
      pdf.setTextColor(140);
      pdf.text(`Lsg. ${entry.answerPageNum}`, margin + contentW, tocY + 1, { align: 'right' });

      pdf.link(margin, tocY - 4, contentW - 22, 8, { pageNumber: entry.pageNum });
      pdf.link(margin + contentW - 22, tocY - 4, 22, 8, { pageNumber: entry.answerPageNum });

      tocY += 9;
    }

    // Footer
    tocY += 6;
    pdf.setDrawColor(200, 195, 215);
    pdf.setLineWidth(0.3);
    pdf.line(margin, tocY, margin + contentW, tocY);
    tocY += 8;
    pdf.setFontSize(10);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(40, 35, 60);
    pdf.text('Lösungsschlüssel & Erklärungen', margin + 5, tocY);
    const firstAnswerPage = tocEntries[0]?.answerPageNum || 1;
    pdf.setFontSize(8.5);
    pdf.setTextColor(bc.kff.rgb[0], bc.kff.rgb[1], bc.kff.rgb[2]);
    pdf.text(`ab Seite ${firstAnswerPage}`, margin + contentW - 2, tocY, { align: 'right' });
    pdf.link(margin, tocY - 4, contentW, 8, { pageNumber: firstAnswerPage });
  },

  // ===================== CHAPTER TITLE PAGE =====================
  _drawAdminChapterTitle(ctx, chapterNum, chapter) {
    const { pdf, pageW, pageH, margin, contentW } = ctx;
    const c = chapter.color;

    // Colored header
    pdf.setFillColor(c[0], c[1], c[2]);
    pdf.rect(0, 0, pageW, 55, 'F');
    const dr = Math.max(0, c[0] - 30), dg = Math.max(0, c[1] - 30), db = Math.max(0, c[2] - 30);
    pdf.setFillColor(dr, dg, db);
    pdf.rect(0, 40, pageW, 15, 'F');

    // Geometric accents
    const lr = Math.min(255, c[0] + 30), lg = Math.min(255, c[1] + 30), lb = Math.min(255, c[2] + 30);
    pdf.setFillColor(lr, lg, lb);
    pdf.circle(pageW - 25, 15, 20, 'F');
    pdf.circle(25, 45, 12, 'F');

    // Chapter label
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.text(`Kapitel ${chapterNum}  ·  ${chapter.subjectLabel}`, pageW / 2, 15, { align: 'center' });

    // Large Lucide icon (white, centered)
    const iconKey = this._topicToIconKey(chapter.label, chapter.block);
    if (ctx.whiteIcons[iconKey]) {
      this._placeIcon(pdf, ctx.whiteIcons[iconKey], pageW / 2 - 6, 20, 12);
    }

    // White bottom accent
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 55, pageW, 2, 'F');

    // Topic name
    ctx.y = 68;
    pdf.setFontSize(22);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(c[0], c[1], c[2]);
    pdf.text(chapter.label, pageW / 2, ctx.y, { align: 'center' });

    ctx.y += 8;
    pdf.setFontSize(11);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(120);
    pdf.text(`${chapter.questions.length} Fragen`, pageW / 2, ctx.y, { align: 'center' });

    // Answer link placeholder at y=82 — filled in backfill step
    ctx.y = 90;
  },

  // ===================== QUESTION RENDERERS =====================

  // Shared: draw question number badge
  _drawQNumBadge(ctx, qNum, color) {
    const { pdf, margin } = ctx;
    pdf.setFillColor(color[0], color[1], color[2]);
    pdf.circle(margin + 4, ctx.y - 1.2, 3, 'F');
    pdf.setFontSize(6.5);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(255);
    const numStr = qNum.includes('.') ? qNum.split('.').pop() : qNum;
    pdf.text(numStr, margin + 4, ctx.y, { align: 'center' });
  },

  // Shared: draw option (normal weight)
  _drawOption(ctx, optLabel, optText, color, indent) {
    const { pdf, margin, contentW } = ctx;
    this._checkPage(ctx, 6);
    pdf.setDrawColor(color[0], color[1], color[2]);
    pdf.setLineWidth(0.35);
    pdf.circle(margin + indent, ctx.y - 1, 2, 'S');
    pdf.setFontSize(7.5);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(color[0], color[1], color[2]);
    pdf.text(optLabel, margin + indent, ctx.y, { align: 'center' });
    // Option text: NORMAL weight
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(60, 60, 70);
    pdf.setFontSize(9);
    const optLines = pdf.splitTextToSize(this._clean(optText), contentW - indent - 8);
    pdf.text(optLines, margin + indent + 5, ctx.y);
    ctx.y += optLines.length * 4.2 + 1.5;
  },

  _drawQSeparator(ctx) {
    const { pdf, margin, contentW } = ctx;
    pdf.setDrawColor(230, 228, 240);
    pdf.setLineWidth(0.15);
    pdf.line(margin + 10, ctx.y, margin + contentW - 10, ctx.y);
    ctx.y += 4;
  },

  // --- MCQ Questions (BMS) --- QUESTIONS ARE BOLD
  _renderMCQQuestions(ctx, chapter, chapterNum, answers) {
    const { pdf, margin, contentW } = ctx;
    const c = chapter.color;
    const optLabels = ['A', 'B', 'C', 'D', 'E'];

    for (let qi = 0; qi < chapter.questions.length; qi++) {
      const q = chapter.questions[qi];
      const data = q.content || {};
      const qNum = `${chapterNum}.${qi + 1}`;
      const questionLines = pdf.splitTextToSize(this._clean(data.question || ''), contentW - 14);
      const optionCount = (data.options || []).length;
      const spaceNeeded = 12 + (questionLines.length * 4.5) + (optionCount * 6) + 5;
      this._checkPage(ctx, spaceNeeded);

      this._drawQNumBadge(ctx, qNum, c);

      // Question text: BOLD
      pdf.setFontSize(9.5);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(30, 30, 40);
      pdf.text(questionLines, margin + 10, ctx.y);
      ctx.y += questionLines.length * 4.5 + 3;

      // Options: normal weight (handled by _drawOption)
      const options = data.options || [];
      for (let oi = 0; oi < options.length; oi++) {
        this._drawOption(ctx, optLabels[oi], options[oi] || '', c, 13);
      }
      ctx.y += 2;
      this._drawQSeparator(ctx);
      answers.push({ nr: qNum, correct: optLabels[data.correct] || '?', explanation: data.explanation || '' });
    }
  },

  // --- Zahlenfolgen ---
  _renderZahlenfolgenQuestions(ctx, chapter, chapterNum, answers) {
    const { pdf, margin, contentW } = ctx;
    const c = chapter.color;

    for (let qi = 0; qi < chapter.questions.length; qi++) {
      const q = chapter.questions[qi];
      const data = q.content || {};
      const qNum = `${chapterNum}.${qi + 1}`;
      this._checkPage(ctx, 22);

      this._drawQNumBadge(ctx, qNum, c);
      ctx.y += 5;

      // Sequence: bold
      pdf.setFontSize(11);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(40, 35, 55);
      const seq = data.sequence || [];
      const seqStr = seq.map(n => n === null ? '?' : String(n)).join('   ');
      const seqLines = pdf.splitTextToSize(seqStr, contentW - 12);
      pdf.text(seqLines, margin + 10, ctx.y);
      ctx.y += seqLines.length * 5.5 + 4;

      this._drawQSeparator(ctx);
      answers.push({ nr: qNum, correct: (data.solution || []).join(', ') || '?', explanation: data.explanation || '' });
    }
  },

  // --- Wortflüssigkeit ---
  _renderWortfluessigkeitQuestions(ctx, chapter, chapterNum, answers) {
    const { pdf, margin, contentW } = ctx;
    const c = chapter.color;
    const optLabels = ['A', 'B', 'C', 'D', 'E'];

    for (let qi = 0; qi < chapter.questions.length; qi++) {
      const q = chapter.questions[qi];
      const data = q.content || {};
      const qNum = `${chapterNum}.${qi + 1}`;
      this._checkPage(ctx, 28);

      this._drawQNumBadge(ctx, qNum, c);

      // Anagram: bold
      pdf.setFontSize(13);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(c[0], c[1], c[2]);
      const anagram = data.anagram || data.scrambled || '';
      pdf.text(anagram, margin + 12, ctx.y);
      if (data.letter_count) {
        pdf.setFontSize(7.5);
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setTextColor(140);
        pdf.text(`(${data.letter_count} Buchstaben)`, margin + 12 + pdf.getTextWidth(anagram + '  '), ctx.y);
      }
      ctx.y += 7;

      const opts = data.options || [];
      for (let oi = 0; oi < opts.length; oi++) {
        this._drawOption(ctx, optLabels[oi], opts[oi] || '', c, 13);
      }
      ctx.y += 2;
      this._drawQSeparator(ctx);
      answers.push({ nr: qNum, correct: optLabels[data.correct] || '?', explanation: data.explanation || '' });
    }
  },

  // --- Implikationen ---
  _renderImplikationQuestions(ctx, chapter, chapterNum, answers) {
    const { pdf, margin, contentW } = ctx;
    const c = chapter.color;
    const optLabels = ['A', 'B', 'C', 'D', 'E'];

    for (let qi = 0; qi < chapter.questions.length; qi++) {
      const q = chapter.questions[qi];
      const data = q.content || {};
      const qNum = `${chapterNum}.${qi + 1}`;
      this._checkPage(ctx, 38);

      this._drawQNumBadge(ctx, qNum, c);
      ctx.y += 5;

      // Premises in styled boxes
      const premiseIndent = margin + 6;
      if (data.premise1) {
        const p1Lines = pdf.splitTextToSize(this._clean(data.premise1), contentW - 22);
        const p1H = p1Lines.length * 4.2 + 4;
        pdf.setFillColor(248, 246, 252);
        pdf.roundedRect(premiseIndent, ctx.y - 3.5, contentW - 8, p1H, 1.5, 1.5, 'F');
        pdf.setFillColor(c[0], c[1], c[2]);
        pdf.roundedRect(premiseIndent, ctx.y - 3.5, 2, p1H, 1, 1, 'F');

        pdf.setFontSize(7.5);
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setTextColor(c[0], c[1], c[2]);
        pdf.text('P1', premiseIndent + 5, ctx.y);
        // Premise text: bold
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(40);
        pdf.text(p1Lines, premiseIndent + 14, ctx.y);
        ctx.y += p1H + 2;
      }
      if (data.premise2) {
        const p2Lines = pdf.splitTextToSize(this._clean(data.premise2), contentW - 22);
        const p2H = p2Lines.length * 4.2 + 4;
        pdf.setFillColor(248, 246, 252);
        pdf.roundedRect(premiseIndent, ctx.y - 3.5, contentW - 8, p2H, 1.5, 1.5, 'F');
        pdf.setFillColor(c[0], c[1], c[2]);
        pdf.roundedRect(premiseIndent, ctx.y - 3.5, 2, p2H, 1, 1, 'F');

        pdf.setFontSize(7.5);
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setTextColor(c[0], c[1], c[2]);
        pdf.text('P2', premiseIndent + 5, ctx.y);
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(40);
        pdf.text(p2Lines, premiseIndent + 14, ctx.y);
        ctx.y += p2H + 2;
      }
      ctx.y += 2;

      // Question label: bold
      pdf.setFontSize(8);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(100);
      pdf.text('Welche Schlussfolgerung ist korrekt?', margin + 10, ctx.y);
      ctx.y += 5;

      // Options: normal
      const opts = data.options || data.conclusions || data.answer_options || [];
      for (let oi = 0; oi < opts.length; oi++) {
        const optText = typeof opts[oi] === 'string' ? opts[oi] : (opts[oi]?.text || '');
        this._drawOption(ctx, optLabels[oi], optText, c, 13);
      }
      ctx.y += 2;
      this._drawQSeparator(ctx);
      // Handle both letter and index correct answers
      const correctRaw = data.correct_answer || data.correct;
      let correctLabel;
      if (typeof correctRaw === 'string' && correctRaw.length === 1) {
        correctLabel = correctRaw.toUpperCase();
      } else {
        correctLabel = optLabels[parseInt(correctRaw) || 0] || '?';
      }
      answers.push({ nr: qNum, correct: correctLabel, explanation: data.explanation || '' });
    }
  },

  // --- TV Questions ---
  _renderTVQuestions(ctx, chapter, chapterNum, answers) {
    const { pdf, margin, contentW } = ctx;
    const c = chapter.color;
    const optLabels = ['A', 'B', 'C', 'D', 'E'];

    for (let ti = 0; ti < chapter.questions.length; ti++) {
      const text = chapter.questions[ti];
      this._checkPage(ctx, 30);

      // Text title: bold
      pdf.setFontSize(11);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(c[0], c[1], c[2]);
      pdf.text(`Text ${ti + 1}: ${this._clean(text.title || 'Ohne Titel')}`, margin + 4, ctx.y);
      ctx.y += 6;

      // Text content in light bg: normal
      pdf.setFont('DejaVuSans', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(40);
      const textLines = pdf.splitTextToSize(this._clean(text.content || ''), contentW - 4);

      const textH = textLines.length * 3.8 + 4;
      pdf.setFillColor(250, 249, 252);
      pdf.roundedRect(margin, ctx.y - 2, contentW, Math.min(textH, 120), 2, 2, 'F');
      pdf.setDrawColor(230, 228, 240);
      pdf.setLineWidth(0.2);
      pdf.roundedRect(margin, ctx.y - 2, contentW, Math.min(textH, 120), 2, 2, 'S');

      for (const line of textLines) {
        this._checkPage(ctx, 5);
        pdf.setFontSize(8.5);
        pdf.setTextColor(40);
        pdf.setFont('DejaVuSans', 'normal');
        pdf.text(line, margin + 3, ctx.y);
        ctx.y += 3.8;
      }
      ctx.y += 5;

      const qs = text.questions || [];
      for (let qi = 0; qi < qs.length; qi++) {
        const q = qs[qi];
        const qNum = `${chapterNum}.${ti + 1}.${qi + 1}`;
        this._checkPage(ctx, 25);

        this._drawQNumBadge(ctx, String(qi + 1), c);

        // Question text: BOLD
        pdf.setFontSize(9.5);
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setTextColor(30);
        const qLines = pdf.splitTextToSize(this._clean(q.question || ''), contentW - 14);
        pdf.text(qLines, margin + 10, ctx.y);
        ctx.y += qLines.length * 4.5 + 2;

        // Options: normal
        const opts = q.options || q.answer_options || [];
        for (let oi = 0; oi < opts.length; oi++) {
          this._drawOption(ctx, optLabels[oi], opts[oi] || '', c, 13);
        }
        ctx.y += 2;
        answers.push({ nr: qNum, correct: optLabels[q.correct_answer ?? q.correct ?? 0] || '?', explanation: q.explanation || '' });
      }
      ctx.y += 3;
      pdf.setDrawColor(c[0], c[1], c[2]);
      pdf.setLineWidth(0.5);
      pdf.line(margin + 20, ctx.y, margin + contentW - 20, ctx.y);
      ctx.y += 6;
    }
  },

  // --- SEK Questions ---
  _renderSEKQuestions(ctx, chapter, chapterNum, answers) {
    const { pdf, margin, contentW } = ctx;
    const c = chapter.color;
    const optLabels = ['A', 'B', 'C', 'D', 'E'];

    for (let qi = 0; qi < chapter.questions.length; qi++) {
      const q = chapter.questions[qi];
      const qNum = `${chapterNum}.${qi + 1}`;
      this._checkPage(ctx, 32);

      this._drawQNumBadge(ctx, qNum, c);

      // Scenario: BOLD
      pdf.setFontSize(9.5);
      pdf.setFont('DejaVuSans', 'bold');
      pdf.setTextColor(30);
      const scenario = this._clean(q.scenario || q.content?.question || q.question || '');
      const qLines = pdf.splitTextToSize(scenario, contentW - 14);
      pdf.text(qLines, margin + 10, ctx.y);
      ctx.y += qLines.length * 4.5 + 3;

      // Options: normal
      const opts = q.options || q.content?.options || q.answer_options || [];
      for (let oi = 0; oi < opts.length; oi++) {
        const optText = typeof opts[oi] === 'string' ? opts[oi] : (opts[oi]?.text || opts[oi]?.label || '');
        this._drawOption(ctx, optLabels[oi], optText, c, 13);
      }
      ctx.y += 2;
      this._drawQSeparator(ctx);

      const correct = q.correct_answer ?? q.content?.correct ?? q.correct ?? 0;
      answers.push({ nr: qNum, correct: optLabels[correct] || '?', explanation: q.explanation || q.content?.explanation || '' });
    }
  },

  // ===================== ANSWER KEY (Card-based) =====================
  _drawAdminAnswerChapter(ctx, ak, includeExplanations) {
    const { pdf, pageW, pageH, margin, contentW } = ctx;
    const c = ak.color;

    // Chapter answer header with icon
    pdf.setFillColor(c[0], c[1], c[2]);
    pdf.roundedRect(margin, ctx.y - 2, contentW, 12, 2, 2, 'F');
    pdf.setFillColor(Math.max(0, c[0] - 40), Math.max(0, c[1] - 40), Math.max(0, c[2] - 40));
    pdf.roundedRect(margin, ctx.y + 7.5, contentW, 2.5, 0, 0, 'F');

    // Icon in header
    const iconKey = this._topicToIconKey(ak.label, ak.block);
    if (ctx.whiteIcons[iconKey]) {
      this._placeIcon(pdf, ctx.whiteIcons[iconKey], margin + 3, ctx.y - 1, 6);
    }

    pdf.setFontSize(10);
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setTextColor(255);
    pdf.text(`Kapitel ${ak.chapterNum}: ${ak.label}`, margin + 12, ctx.y + 5);
    ctx.y += 16;

    for (const a of ak.answers) {
      const hasExplanation = includeExplanations && a.explanation;

      if (hasExplanation) {
        const explLines = pdf.splitTextToSize(this._clean(a.explanation), contentW - 26);
        const cardH = Math.max(explLines.length * 3.8 + 10, 14);
        this._checkPage(ctx, cardH + 2);

        pdf.setFillColor(250, 249, 254);
        pdf.roundedRect(margin, ctx.y - 3, contentW, cardH, 2, 2, 'F');
        pdf.setFillColor(c[0], c[1], c[2]);
        pdf.roundedRect(margin, ctx.y - 3, 2.5, cardH, 1, 1, 'F');

        // Answer badge
        pdf.setFillColor(c[0], c[1], c[2]);
        pdf.circle(margin + 8, ctx.y + 1, 3.5, 'F');
        pdf.setFontSize(8);
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setTextColor(255);
        pdf.text(a.correct, margin + 8, ctx.y + 2.2, { align: 'center' });

        pdf.setFontSize(8);
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setTextColor(c[0], c[1], c[2]);
        pdf.text(a.nr, margin + 14, ctx.y + 2);

        pdf.setFontSize(7.8);
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setTextColor(70, 68, 85);
        pdf.text(explLines, margin + 14, ctx.y + 6);
        ctx.y += cardH + 1.5;
      } else {
        this._checkPage(ctx, 6);
        pdf.setFillColor(c[0], c[1], c[2]);
        pdf.circle(margin + 5, ctx.y, 2.5, 'F');
        pdf.setFontSize(7);
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setTextColor(255);
        pdf.text(a.correct, margin + 5, ctx.y + 1, { align: 'center' });
        pdf.setFontSize(8);
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setTextColor(80);
        pdf.text(a.nr, margin + 10, ctx.y + 1);
        ctx.y += 5.5;
      }
    }
    ctx.y += 4;
  },

};
