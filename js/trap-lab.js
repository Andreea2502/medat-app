// === MedAT Trainer – Prüfungsfallen-Lab ===
// Trainiere typische Denkfehler, MC-Verwechslungen und Ablenkantworten.
// Aufrufen: TrapLab.open() von app.js / Navigation aus.

const TrapLab = (() => {

  // ──────────────────────────────────────────────────────────────────────────
  // ACCESS-LIMITS — Call-basierte Drosselung statt Themen-Sperrung
  // ──────────────────────────────────────────────────────────────────────────
  // - Free: ALLE Themen + Fallen frei zum Lesen. Quiz-Starts auf 5 (Lifetime)
  //   limitiert. Coach + PDF bleiben Premium-only.
  // - Paid (basic/pro/premium): unbegrenzte Quiz-Starts + Coach + PDF
  const FREE_QUIZ_STARTS = 5;
  const QUIZ_USED_KEY = 'medat_trap_quiz_used';
  const PDF_NOTES_KEY = 'medat_trap_pdf_notes'; // { [topicId]: [{ text, ts }] }

  // ─── Coach-Notes-Speicher (für „Ins PDF übernehmen") ────────────────────
  function _loadPdfNotes() {
    try { return JSON.parse(localStorage.getItem(PDF_NOTES_KEY) || '{}'); }
    catch (_) { return {}; }
  }
  function _savePdfNotes(notes) {
    try { localStorage.setItem(PDF_NOTES_KEY, JSON.stringify(notes)); } catch (_) {}
  }
  function addPdfNote(text) {
    if (!_currentTopic || !text) return;
    const notes = _loadPdfNotes();
    if (!notes[_currentTopic.id]) notes[_currentTopic.id] = [];
    notes[_currentTopic.id].push({ text: String(text).slice(0, 2000), ts: Date.now() });
    _savePdfNotes(notes);
    return notes[_currentTopic.id].length;
  }
  function getPdfNotes(topicId) {
    const notes = _loadPdfNotes();
    return notes[topicId] || [];
  }
  function clearPdfNotes(topicId) {
    const notes = _loadPdfNotes();
    if (topicId) delete notes[topicId];
    _savePdfNotes(notes);
  }
  function getCurrentTopicId() {
    return _currentTopic ? _currentTopic.id : null;
  }

  function _tier() {
    return (typeof Auth !== 'undefined' && Auth.licenseTier) || 'free';
  }
  function _isPaid() {
    // Admin hat immer Vollzugang
    if (typeof Admin !== 'undefined' && Admin.isAdmin && Admin.isAdmin()) return true;
    const t = _tier();
    return t === 'basic' || t === 'pro' || t === 'premium';
  }
  function _quizUsed() {
    try { return parseInt(localStorage.getItem(QUIZ_USED_KEY) || '0', 10) || 0; }
    catch (_) { return 0; }
  }
  function _quizRemaining() {
    if (_isPaid()) return Infinity;
    return Math.max(0, FREE_QUIZ_STARTS - _quizUsed());
  }
  function _consumeQuizStart() {
    if (_isPaid()) return;
    try { localStorage.setItem(QUIZ_USED_KEY, String(_quizUsed() + 1)); }
    catch (_) {}
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DATENMODELL: Themen mit Prüfungsfallen + MC-Quiz
  // ──────────────────────────────────────────────────────────────────────────
  const TOPICS = [
    // ===== BIOLOGIE ====================================================
    {
      id: 'mitochondrien',
      title: 'Mitochondrien',
      category: 'Biologie',
      icon: '🧬',
      theme: 'mint',
      description: 'Atmungskette, ATP, Matrix & typische Verwechslungen.',
      difficulty: 'mittel',
      estimatedTime: '10–15 Min.',
      traps: [
        {
          title: 'Atmungskette vs. Citratzyklus',
          whyDangerous: 'Beide Vorgänge finden im Mitochondrium statt – aber NICHT am selben Ort. Diese Verwechslung ist eine der häufigsten MC-Fallen.',
          wrongThinking: '„Beides läuft in der Matrix ab, da Mitochondrium = Matrix."',
          correctThinking: 'Citratzyklus → Matrix. Atmungskette → innere Mitochondrienmembran. Der Protonengradient wird zwischen Matrix und Intermembranraum aufgebaut.',
          memoryHint: 'Citrat = Cytoplasma der Matrix; Kette = Kettenglieder in der Membran.',
        },
        {
          title: 'Matrix vs. Intermembranraum',
          whyDangerous: 'Der Protonengradient läuft GENAU andersherum als viele denken.',
          wrongThinking: '„Protonen werden in die Matrix gepumpt."',
          correctThinking: 'Protonen werden AUS der Matrix in den Intermembranraum gepumpt. Über die ATP-Synthase fließen sie zurück in die Matrix.',
          memoryHint: 'Inter-membran-Raum = Speicher; Matrix = Verbraucher.',
        },
        {
          title: 'NADH vs. FADH₂',
          whyDangerous: 'Beide sind Elektronencarrier, aber sie liefern unterschiedlich viel ATP – das wird in MC-Aufgaben gerne verdreht.',
          wrongThinking: '„NADH und FADH₂ liefern gleich viel ATP."',
          correctThinking: 'NADH → ca. 2,5 ATP (frühere Einspeisung am Komplex I). FADH₂ → ca. 1,5 ATP (Einspeisung am Komplex II). FADH₂ überspringt einen Pumpvorgang.',
          memoryHint: 'NADH steigt bei Komplex I ein (3 Pumpen) → 2,5 ATP. FADH₂ erst bei Komplex II (2 Pumpen) → 1,5 ATP.',
        },
        {
          title: 'ATP-Synthase: Ort & Funktion',
          whyDangerous: 'Die ATP-Synthase wird oft mit „normalen Enzymen" verwechselt – aber sie ist eigentlich eine molekulare Turbine.',
          wrongThinking: '„ATP-Synthase verbraucht ATP, um Protonen zu pumpen."',
          correctThinking: 'ATP-Synthase NUTZT den Protonengradienten (Rückfluss in die Matrix), um aus ADP + Pi → ATP zu bauen. Sie pumpt nicht – sie erntet.',
          memoryHint: 'Synthase = Synthese = Aufbau (nicht Verbrauch).',
        },
        {
          title: 'Zellatmung vs. Gärung',
          whyDangerous: 'Beides liefert ATP, beides startet mit Glykolyse – aber die ATP-Ausbeute ist ein typischer Stolperstein.',
          wrongThinking: '„Gärung läuft im Mitochondrium ab, weil sie ATP liefert."',
          correctThinking: 'Gärung läuft AUSSCHLIESSLICH im Cytoplasma und ohne Sauerstoff. Nur 2 ATP pro Glucose (vs. ~30–32 ATP bei aerober Zellatmung).',
          memoryHint: 'Gärung = Cytoplasma-Notbetrieb ohne O₂.',
        },
        {
          title: 'Mitochondriale DNA — Vererbung',
          whyDangerous: 'Mitochondrien haben EIGENE DNA. Wer das übersieht, beantwortet Fragen zur mitochondrialen Vererbung falsch.',
          wrongThinking: '„Mitochondriale Krankheiten werden klassisch mendelsch vererbt."',
          correctThinking: 'mtDNA wird AUSSCHLIESSLICH maternal vererbt (über die Eizelle). Väter geben ihre Mitochondrien NICHT weiter. Erkrankte Mutter → alle Kinder betroffen; erkrankter Vater → keine Kinder.',
          memoryHint: 'mtDNA = "Mom-DNA" — nur über die Mutter.',
        },
        {
          title: 'Endosymbiontentheorie',
          whyDangerous: 'Mitochondrien sind keine "normalen" Organellen — sie stammen von verschluckten Bakterien ab.',
          wrongThinking: '„Mitochondrien haben dieselbe Membran-Struktur wie der Zellkern."',
          correctThinking: 'Doppelmembran ist hier KEIN Zufall: Die äußere stammt von der Wirtszelle, die innere vom ursprünglichen Bakterium. Daher haben Mitochondrien auch eigene Ribosomen (70S, bakterientypisch) und ringförmige DNA.',
          memoryHint: 'Innen = bakterienursprung; Außen = Wirtszelle.',
        },
        {
          title: 'Sauerstoff ≠ Energiequelle',
          whyDangerous: 'Im Alltag denkt man "Sauerstoff = Energie". Physiologisch falsch — und im Test eine Falle.',
          wrongThinking: '„O₂ liefert die Energie für die ATP-Synthese."',
          correctThinking: 'Glucose (bzw. Nährstoffe) liefert die Energie. O₂ ist NUR der finale Elektronen-Akzeptor am Ende der Atmungskette und wird zu H₂O reduziert. Ohne O₂ stockt die Kette – ATP-Synthese sinkt drastisch.',
          memoryHint: 'O₂ ist Müllabfuhr für Elektronen – nicht die Energie.',
        },
        {
          title: 'Komplex V vs. Komplex I–IV',
          whyDangerous: 'Die ATP-Synthase ist oft als "Komplex V" beschrieben. Wer das nicht weiß, verwechselt Funktionen.',
          wrongThinking: '„Komplex V pumpt Protonen wie I, III und IV."',
          correctThinking: 'Nur Komplexe I, III und IV pumpen Protonen aus der Matrix. Komplex V (ATP-Synthase) macht das GEGENTEIL: nutzt den Rückfluss zur ATP-Synthese. Komplex II überträgt nur Elektronen, pumpt KEINE Protonen.',
          memoryHint: 'Pumpen: I, III, IV. Erntet: V. Zwischendurch: II.',
        },
        {
          title: 'Mitochondrien & Apoptose',
          whyDangerous: 'Mitochondrien sind nicht nur Kraftwerke, sondern auch zentrale Schalter des programmierten Zelltods. Wer das übersieht, tappt in Pathologie-Fragen.',
          wrongThinking: '„Mitochondrien produzieren nur ATP, sonst nichts."',
          correctThinking: 'Mitochondrien setzen bei Stress Cytochrom c aus dem Intermembranraum frei → aktiviert Caspasen → Apoptose. Sie sind zentrale Regulatoren von Zellteilung und Tod.',
          memoryHint: 'Mitochondrium = Kraftwerk UND Selbstmord-Schalter.',
        },
      ],
      quiz: [
        {
          question: 'Wo findet die Atmungskette statt?',
          answers: ['A) In der Matrix', 'B) An der inneren Mitochondrienmembran', 'C) Im Cytoplasma', 'D) An der äußeren Mitochondrienmembran', 'E) Im Intermembranraum'],
          correctAnswer: 'B',
          explanation: 'Die Atmungskette sitzt an der INNEREN Mitochondrienmembran. Dort befinden sich die Komplexe I–IV und die ATP-Synthase.',
          trapExplanation: 'A ist die häufigste Falle: Viele verwechseln den Ort der Atmungskette mit dem Ort des Citratzyklus. Der Citratzyklus läuft in der Matrix, die Atmungskette an der Membran.',
        },
        {
          question: 'Wie viele ATP liefert ein NADH im Vergleich zu FADH₂ ungefähr?',
          answers: ['A) NADH ≈ 1,5 ATP, FADH₂ ≈ 2,5 ATP', 'B) Beide ≈ 2,5 ATP', 'C) NADH ≈ 2,5 ATP, FADH₂ ≈ 1,5 ATP', 'D) Beide ≈ 1,5 ATP', 'E) NADH ≈ 3,5 ATP, FADH₂ ≈ 2,5 ATP'],
          correctAnswer: 'C',
          explanation: 'NADH speist Elektronen am Komplex I ein → 3 Protonenpumpen werden durchlaufen → ≈ 2,5 ATP. FADH₂ speist erst am Komplex II ein → nur 2 Pumpen → ≈ 1,5 ATP.',
          trapExplanation: 'A ist die klassische Vertauschung. Wer sich nur „NADH und FADH₂ liefern ATP" merkt, ohne die unterschiedliche Einspeisstelle, tappt rein.',
        },
        {
          question: 'In welche Richtung pumpt die Atmungskette Protonen?',
          answers: ['A) Aus dem Intermembranraum in die Matrix', 'B) Aus dem Cytoplasma in die Matrix', 'C) Aus der Matrix in den Intermembranraum', 'D) Aus dem Cytoplasma in den Intermembranraum', 'E) Pumpt keine Protonen, nur Elektronen'],
          correctAnswer: 'C',
          explanation: 'Die Komplexe I, III und IV pumpen Protonen aus der Matrix in den Intermembranraum. Das erzeugt den Gradienten, den die ATP-Synthase nutzt.',
          trapExplanation: 'A ist die gespiegelte Falle: Wer den Rückfluss durch die ATP-Synthase mit dem Pumpvorgang verwechselt, wählt diese Antwort.',
        },
        {
          question: 'Wo läuft die Gärung ab?',
          answers: ['A) In der Mitochondrienmatrix', 'B) An der inneren Mitochondrienmembran', 'C) Im Zellkern', 'D) Im Cytoplasma', 'E) Im Endoplasmatischen Retikulum'],
          correctAnswer: 'D',
          explanation: 'Gärung läuft komplett im Cytoplasma ab und benötigt keinen Sauerstoff – Mitochondrien sind nicht beteiligt.',
          trapExplanation: 'A klingt verführerisch: „Energiegewinnung = Mitochondrium". Stimmt aber nur für die aerobe Zellatmung – die Gärung ist der anaerobe Notfallweg im Cytoplasma.',
        },
        {
          question: 'Welche Aussage zur ATP-Synthase ist KORREKT?',
          answers: ['A) Sie pumpt Protonen in den Intermembranraum.', 'B) Sie nutzt den Protonenrückfluss zur ATP-Synthese.', 'C) Sie spaltet ATP in ADP + Pi.', 'D) Sie ist Teil des Citratzyklus.', 'E) Sie sitzt in der äußeren Membran.'],
          correctAnswer: 'B',
          explanation: 'Die ATP-Synthase ist eine molekulare Turbine: Sie nutzt den Protonenrückstrom durch ihren Kanal, um aus ADP + Pi neues ATP zu bilden.',
          trapExplanation: 'C ist die "gespiegelte" Funktion (das ist eine ATPase, nicht Synthase). A vertauscht Synthase mit Komplex I, III oder IV.',
        },
        {
          question: 'Wie wird die mitochondriale DNA (mtDNA) vererbt?',
          answers: ['A) Klassisch mendelsch von beiden Eltern', 'B) Nur vom Vater (paternal)', 'C) Nur von der Mutter (maternal)', 'D) X-chromosomal', 'E) Y-chromosomal'],
          correctAnswer: 'C',
          explanation: 'mtDNA wird ausschließlich maternal vererbt — die Eizelle bringt fast alle Mitochondrien mit, väterliche Mitochondrien aus dem Spermium werden in der Regel zerstört.',
          trapExplanation: 'A wirkt logisch ("DNA → mendelsch"), übersieht aber, dass mtDNA gar nicht im Zellkern liegt. D/E mischen mit gonosomaler Vererbung.',
        },
        {
          question: 'Welcher Atmungsketten-Komplex pumpt KEINE Protonen?',
          answers: ['A) Komplex I', 'B) Komplex II', 'C) Komplex III', 'D) Komplex IV', 'E) Alle pumpen Protonen'],
          correctAnswer: 'B',
          explanation: 'Komplex II (Succinat-Dehydrogenase) überträgt Elektronen von FADH₂ auf Ubichinon, pumpt aber keine Protonen. Daher der geringere ATP-Ertrag von FADH₂.',
          trapExplanation: 'E ist die "Symmetrie-Falle": Wer denkt, alle Komplexe pumpen, übersieht den Unterschied zwischen NADH- und FADH₂-Einspeisung.',
        },
        {
          question: 'Welche Membran-Struktur eines Mitochondriums hat die GRÖSSTE Oberfläche?',
          answers: ['A) Äußere Mitochondrienmembran', 'B) Innere Mitochondrienmembran (mit Cristae)', 'C) Intermembranraum', 'D) Matrix', 'E) Beide Membranen sind gleich groß.'],
          correctAnswer: 'B',
          explanation: 'Die innere Membran ist stark zu Cristae aufgefaltet — das vergrößert die Oberfläche dramatisch und schafft Platz für viele ATP-Synthase-Komplexe.',
          trapExplanation: 'E ist die "Symmetrie-Falle" und A der Alltagsgedanke ("außen ist größer"). Beides ignoriert die Faltung der Innenmembran.',
        },
        {
          question: 'Welche Rolle hat O₂ in der Zellatmung?',
          answers: ['A) Liefert die Energie für ATP', 'B) Wird zu CO₂ oxidiert', 'C) Ist der finale Elektronen-Akzeptor und wird zu H₂O reduziert', 'D) Reaktiviert die ATP-Synthase', 'E) O₂ ist nicht beteiligt'],
          correctAnswer: 'C',
          explanation: 'O₂ nimmt am Ende der Atmungskette (Komplex IV) Elektronen + Protonen auf und wird zu H₂O. Damit erst kann die Kette laufen.',
          trapExplanation: 'A ist die populärste Falle: "Sauerstoff = Energie". Tatsächlich ist O₂ nur der Müll-Akzeptor – die Energie kommt aus der Glucose.',
        },
        {
          question: 'Welche Aussage zur Apoptose-Rolle der Mitochondrien ist KORREKT?',
          answers: ['A) Mitochondrien sind nicht an der Apoptose beteiligt.', 'B) Mitochondrien setzen Cytochrom c frei, das Caspasen aktiviert.', 'C) Mitochondrien stoppen die Apoptose.', 'D) Apoptose findet nur im Zellkern statt.', 'E) Mitochondrien produzieren Caspasen direkt.'],
          correctAnswer: 'B',
          explanation: 'Bei Zellstress wird Cytochrom c aus dem Intermembranraum freigesetzt. Es aktiviert über Apaf-1 die Caspase-Kaskade → kontrollierter Zelltod.',
          trapExplanation: 'A ist die "Kraftwerk-Tunnelblick"-Falle: Wer Mitochondrien nur als ATP-Lieferanten kennt, übersieht ihre Apoptose-Rolle.',
        },
      ],
      checklist: [
        'Citratzyklus → Matrix; Atmungskette → innere Membran.',
        'Protonen werden AUS der Matrix gepumpt – Rückfluss treibt ATP-Synthase.',
        'NADH ≈ 2,5 ATP, FADH₂ ≈ 1,5 ATP.',
        'Gärung läuft im Cytoplasma, ohne O₂, mit nur 2 ATP.',
        'ATP-Synthase erntet Energie – sie pumpt nicht.',
        'mtDNA wird ausschließlich maternal vererbt.',
        'O₂ ist Elektronen-Akzeptor, NICHT Energiequelle.',
        'Komplex II pumpt KEINE Protonen.',
      ],
    },

    {
      id: 'genetik',
      title: 'Genetik',
      category: 'Biologie',
      icon: '🧬',
      theme: 'mint',
      description: 'Dominanz, Erbgänge, Wahrscheinlichkeiten – inklusive klassischer Denkfehler.',
      difficulty: 'schwer',
      estimatedTime: '12–18 Min.',
      traps: [
        {
          title: 'Dominant ≠ häufig',
          whyDangerous: 'Im Alltag bedeutet „dominant" stark/häufig – in der Genetik aber nur „setzt sich im Phänotyp gegen das andere Allel durch".',
          wrongThinking: '„Dominante Allele kommen automatisch häufiger in der Bevölkerung vor."',
          correctThinking: 'Dominanz ist eine Eigenschaft des Vererbungsmusters, NICHT der Häufigkeit. Eine seltene Mutation kann dominant sein (z.B. Huntington).',
          memoryHint: 'Huntington ist dominant – aber selten.',
        },
        {
          title: 'Genotyp vs. Phänotyp',
          whyDangerous: 'MC-Fragen vermischen gerne, was man SIEHT (Phänotyp) und was im Erbgut STEHT (Genotyp).',
          wrongThinking: '„Wenn ein Kind das Merkmal zeigt, müssen beide Eltern dieses Allel haben."',
          correctThinking: 'Bei rezessiven Erbgängen können Eltern heterozygot (Anlageträger) sein und das Merkmal selbst NICHT zeigen. Phänotyp ≠ Genotyp.',
          memoryHint: 'Phäno = Foto (sichtbar); Geno = Gencode (versteckt).',
        },
        {
          title: 'Homozygot vs. Heterozygot',
          whyDangerous: 'Klingt nach „dasselbe Wort mit Vorsilbe", aber die Konsequenz im Punnett-Quadrat ist riesig.',
          wrongThinking: '„AA und Aa zeigen denselben Phänotyp, also sind sie genetisch identisch."',
          correctThinking: 'AA = reinerbig dominant – vererbt sicher A. Aa = mischerbig – kann A ODER a vererben. Phänotyp identisch, Vererbungsverhalten unterschiedlich.',
          memoryHint: 'Homo = gleich; Hetero = gemischt.',
        },
        {
          title: 'Autosomal vs. Gonosomal (X-chromosomal)',
          whyDangerous: 'Bei X-chromosomalen Erbgängen sind Männer und Frauen unterschiedlich betroffen – wer das übersieht, verrechnet sich.',
          wrongThinking: '„Männer und Frauen sind bei jedem Erbgang gleich wahrscheinlich betroffen."',
          correctThinking: 'X-chromosomal-rezessive Krankheiten (z.B. Bluterkrankheit) treffen Männer viel häufiger – sie haben nur EIN X. Frauen brauchen zwei betroffene X.',
          memoryHint: 'Männer haben kein „Backup-X" → X-rezessive Krankheiten schlagen sofort durch.',
        },
        {
          title: 'Wahrscheinlichkeiten falsch kombinieren',
          whyDangerous: 'Bei mehreren Kindern wird oft addiert statt multipliziert (oder umgekehrt).',
          wrongThinking: '„Wenn die Chance je Kind 1/4 beträgt, sind bei zwei Kindern 2/4 = 1/2 betroffen."',
          correctThinking: 'P(beide betroffen) = 1/4 · 1/4 = 1/16. Einzelereignisse werden MULTIPLIZIERT, nicht addiert.',
          memoryHint: '„UND" = mal; „ODER" = plus.',
        },
        {
          title: 'Penetranz vs. Expressivität',
          whyDangerous: 'Klingen ähnlich, beschreiben aber zwei verschiedene Konzepte. Im Test gerne vertauscht.',
          wrongThinking: '„Wenn jemand das Allel hat, zeigt sich das Merkmal IMMER und gleich stark."',
          correctThinking: 'Penetranz = Anteil der Genotyp-Träger, die das Merkmal überhaupt zeigen. Expressivität = wie stark das Merkmal ausgeprägt ist. Ein Allel kann unvollständig penetrant sein (manche zeigen, andere nicht).',
          memoryHint: 'Penetranz = OB; Expressivität = WIE STARK.',
        },
        {
          title: 'Kodominanz vs. Intermediär',
          whyDangerous: 'Beide widersprechen klassischer Dominanz, aber das Ergebnis ist verschieden.',
          wrongThinking: '„Bei beidem entsteht eine Mischung im Phänotyp."',
          correctThinking: 'Kodominant: beide Allele zeigen sich nebeneinander (z.B. Blutgruppe AB). Intermediär: Mischphänotyp (z.B. rote × weiße Blüte → rosa). AB-Mensch hat A UND B, nicht "AB-Mix".',
          memoryHint: 'Kodominanz: beide sichtbar nebeneinander. Intermediär: Mischfarbe.',
        },
        {
          title: 'Kopplungsgruppen vs. unabhängige Vererbung',
          whyDangerous: 'Mendels 3. Regel gilt nur, wenn Gene auf verschiedenen Chromosomen liegen.',
          wrongThinking: '„Alle Merkmale werden unabhängig voneinander vererbt."',
          correctThinking: 'Nur Gene auf VERSCHIEDENEN Chromosomen segregieren unabhängig. Gene auf demselben Chromosom (gekoppelt) werden tendenziell gemeinsam vererbt – außer es kommt zum Crossing-over.',
          memoryHint: 'Gleiches Chromosom = gekoppelt = nicht unabhängig.',
        },
        {
          title: 'Hardy-Weinberg falsch angewendet',
          whyDangerous: 'Die Formel p² + 2pq + q² = 1 wird gerne als Allgemeinrezept verwendet — gilt aber nur unter strikten Bedingungen.',
          wrongThinking: '„Hardy-Weinberg funktioniert immer, egal welche Population."',
          correctThinking: 'Hardy-Weinberg setzt voraus: keine Mutation, keine Selektion, große Population, keine Migration, zufällige Paarung. Bei Verstoß (z.B. Selektion auf rezessive Krankheit) gilt es nicht.',
          memoryHint: 'HW-Gleichgewicht ist ein IDEALMODELL — Realität verletzt es ständig.',
        },
        {
          title: 'Punktmutation vs. Frameshift',
          whyDangerous: 'Beide ändern die DNA, aber der Effekt auf das Protein ist sehr unterschiedlich.',
          wrongThinking: '„Jede Mutation an einer Base ändert die ganze Aminosäuresequenz."',
          correctThinking: 'Punktmutation (eine Base) ändert maximal EINE Aminosäure — kann sogar still (synonym) bleiben. Frameshift (Insertion/Deletion ≠ 3) verschiebt das gesamte Leseraster → komplett neue Sequenz ab dem Mutationsort.',
          memoryHint: 'Punkt = lokal; Frameshift = ab da alles anders.',
        },
      ],
      quiz: [
        {
          question: 'Zwei phänotypisch gesunde Eltern bekommen ein Kind mit einer autosomal-rezessiven Erbkrankheit. Welche Aussage ist zwingend RICHTIG?',
          answers: ['A) Beide Eltern sind krank.', 'B) Beide Eltern sind heterozygote Anlageträger.', 'C) Mindestens ein Elternteil ist homozygot.', 'D) Das Kind ist heterozygot.', 'E) Keine Aussage ist möglich.'],
          correctAnswer: 'B',
          explanation: 'Bei einem autosomal-rezessiven Erbgang muss das Kind aa sein. Die phänotypisch gesunden Eltern müssen jeweils ein „a" beisteuern – sind also Aa (heterozygot).',
          trapExplanation: 'A wirkt logisch ("krankes Kind = kranke Eltern"), übersieht aber, dass rezessive Allele bei Heterozygoten verborgen bleiben.',
        },
        {
          question: 'Aa × Aa – wie hoch ist die Wahrscheinlichkeit für ein homozygot rezessives Kind?',
          answers: ['A) 0 %', 'B) 25 %', 'C) 50 %', 'D) 75 %', 'E) 100 %'],
          correctAnswer: 'B',
          explanation: 'Punnett-Quadrat: AA, Aa, Aa, aa. Genau 1 von 4 = 25 % sind aa.',
          trapExplanation: 'C (50 %) ist die häufigste Falle: Wer „die Hälfte hat ein a" denkt, vergisst, dass für aa BEIDE Allele rezessiv sein müssen.',
        },
        {
          question: 'Warum sind Männer von X-chromosomal-rezessiven Erbkrankheiten häufiger betroffen als Frauen?',
          answers: ['A) Männer haben mehr Mutationen.', 'B) Männer haben nur ein X-Chromosom, daher fehlt das "gesunde" Backup-Allel.', 'C) Y-Chromosomen verstärken rezessive Effekte.', 'D) Frauen können das X-Chromosom inaktivieren.', 'E) Hormone unterdrücken bei Frauen die Symptome.'],
          correctAnswer: 'B',
          explanation: 'Männer (XY) sind hemizygot für X-gekoppelte Gene – ein einziges rezessives Allel reicht für den Phänotyp. Frauen brauchen zwei betroffene X.',
          trapExplanation: 'D klingt plausibel (X-Inaktivierung existiert), erklärt aber nicht die Häufigkeit – im Gegenteil, sie kann sogar Konduktorinnen leicht betreffen.',
        },
        {
          question: 'Welche Aussage über DOMINANTE Allele ist KORREKT?',
          answers: ['A) Sie kommen in der Bevölkerung immer häufiger vor als rezessive.', 'B) Sie setzen sich im Phänotyp gegenüber dem anderen Allel durch.', 'C) Sie sind immer "stärker" und gesünder.', 'D) Sie treten nur bei homozygoten Trägern auf.', 'E) Sie können nie krank machen.'],
          correctAnswer: 'B',
          explanation: 'Dominanz beschreibt das Vererbungsmuster: Das dominante Allel bestimmt allein den Phänotyp – unabhängig von Häufigkeit oder Pathogenität.',
          trapExplanation: 'A & C sind Alltagsmissverständnisse. Huntington (dominant) ist selten und krankhaft – Dominanz ist also kein Hinweis auf Häufigkeit oder Gesundheit.',
        },
        {
          question: 'Aa × Aa-Eltern bekommen ZWEI Kinder. Wie hoch ist die Wahrscheinlichkeit, dass BEIDE Kinder homozygot rezessiv (aa) sind?',
          answers: ['A) 1/2', 'B) 1/4', 'C) 1/8', 'D) 1/16', 'E) 2/4'],
          correctAnswer: 'D',
          explanation: 'Einzelwahrscheinlichkeit aa = 1/4. Für ZWEI unabhängige Kinder: 1/4 · 1/4 = 1/16.',
          trapExplanation: 'B (1/4) ist die Falle: Wer denkt "ist bei jedem Kind 1/4, also auch beim Paar 1/4", vergisst die Multiplikation bei UND-Ereignissen.',
        },
        {
          question: 'Welche Aussage zur AB0-Blutgruppe ist KORREKT?',
          answers: ['A) AB ist intermediär (Mischfarbe aus A und B)', 'B) AB ist kodominant — beide Antigene werden ausgeprägt', 'C) AB ist rezessiv', 'D) AB existiert nur bei homozygoten Trägern', 'E) AB-Antigene werden nur bei Männern ausgeprägt'],
          correctAnswer: 'B',
          explanation: 'AB ist klassisches Beispiel für Kodominanz: A-Antigene UND B-Antigene werden gleichzeitig auf den Erythrozyten ausgeprägt — nicht gemischt.',
          trapExplanation: 'A ist die häufigste Verwechslung mit dem intermediären Erbgang. Bei Blutgruppe AB sind beide Antigene nebeneinander vorhanden, NICHT zu einer "Mischform" verschmolzen.',
        },
        {
          question: 'Beschreibt unvollständige Penetranz:',
          answers: ['A) Wie stark ein Merkmal ausgeprägt ist', 'B) Den Anteil der Genotyp-Träger, die das Merkmal überhaupt zeigen', 'C) Die Häufigkeit eines Allels in der Bevölkerung', 'D) Die Wahrscheinlichkeit einer Mutation', 'E) Das Verhältnis dominant zu rezessiv'],
          correctAnswer: 'B',
          explanation: 'Penetranz beschreibt das OB: Wie viele Träger des Genotyps zeigen den Phänotyp überhaupt? Bei z.B. 80%iger Penetranz zeigen 20% der Träger das Merkmal NICHT.',
          trapExplanation: 'A beschreibt Expressivität (wie stark) — die häufigste Verwechslung. Penetranz und Expressivität sind verwandte, aber verschiedene Konzepte.',
        },
        {
          question: 'Welche Voraussetzung ist KEINE Bedingung des Hardy-Weinberg-Gleichgewichts?',
          answers: ['A) Keine Mutation', 'B) Keine Selektion', 'C) Große Population', 'D) Hohe Mutationsrate', 'E) Zufällige Paarung'],
          correctAnswer: 'D',
          explanation: 'Hohe Mutationsrate ist KEINE Voraussetzung — im Gegenteil, HW setzt KEINE bzw. vernachlässigbare Mutationen voraus.',
          trapExplanation: 'D wirkt wie eine sinnvolle "biologische" Voraussetzung. Tatsächlich ist HW ein IDEALMODELL ohne evolutive Kräfte.',
        },
        {
          question: 'Zwei Allele auf demselben Chromosom werden:',
          answers: ['A) Immer unabhängig vererbt', 'B) Tendenziell gemeinsam vererbt (Kopplung)', 'C) Niemals gemeinsam vererbt', 'D) Immer als Punnett-Rechnung berücksichtigt', 'E) Durch Crossing-over zwingend getrennt'],
          correctAnswer: 'B',
          explanation: 'Gene auf demselben Chromosom bilden eine Kopplungsgruppe und werden tendenziell gemeinsam vererbt. Crossing-over kann sie trennen, aber je näher beieinander, desto seltener.',
          trapExplanation: 'A ist die "Mendel-3-Falle": Wer Mendels Unabhängigkeitsregel ohne Bedingungen anwendet, übersieht die Kopplung. C und E sind absolute Aussagen, die nie stimmen.',
        },
        {
          question: 'Welche Mutation verschiebt das Leseraster und ändert ALLE folgenden Aminosäuren?',
          answers: ['A) Punktmutation (Austausch)', 'B) Stille Mutation (synonym)', 'C) Frameshift durch Insertion einer Base', 'D) Crossing-over', 'E) Translokation'],
          correctAnswer: 'C',
          explanation: 'Eine Insertion (oder Deletion) einer Base verschiebt das Leseraster ab dem Mutationsort. Ab dann werden völlig andere Aminosäuren codiert.',
          trapExplanation: 'A ändert maximal eine Aminosäure. B (synonym) ändert keine. Wer nicht zwischen Punktmutation und Frameshift unterscheidet, wählt häufig A.',
        },
      ],
      checklist: [
        'Dominant heißt: setzt sich im Phänotyp durch – nicht häufig.',
        'Heterozygote Anlageträger zeigen rezessive Krankheiten nicht.',
        'AA vererbt sicher A, Aa vererbt zu 50 % A und zu 50 % a.',
        'X-rezessive Krankheiten treffen Männer viel häufiger.',
        'Bei „UND"-Wahrscheinlichkeiten: multiplizieren.',
        'Penetranz = OB; Expressivität = WIE STARK.',
        'Kodominanz ≠ Intermediär (AB-Blutgruppe vs. rosa Blüte).',
        'Gene auf demselben Chromosom = gekoppelt → nicht unabhängig.',
        'Hardy-Weinberg ist ein Idealmodell ohne evolutive Kräfte.',
      ],
    },

    // ===== CHEMIE ======================================================
    {
      id: 'ph-wert',
      title: 'pH-Wert & Säuren/Basen',
      category: 'Chemie',
      icon: '⚗️',
      theme: 'blue',
      description: 'Logarithmus, Säurestärke, Neutralisation – klassische MC-Fallen.',
      difficulty: 'mittel',
      estimatedTime: '10–15 Min.',
      traps: [
        {
          title: 'pH-Skala ist LOGARITHMISCH',
          whyDangerous: 'Ein pH-Unterschied von 1 sieht klein aus – ist aber Faktor 10 in der H⁺-Konzentration.',
          wrongThinking: '„pH 4 ist nur ein bisschen saurer als pH 5."',
          correctThinking: 'pH 4 hat 10-fach höhere H⁺-Konzentration als pH 5. pH 3 vs. pH 5 = 100-fach.',
          memoryHint: 'Jeder pH-Schritt = ×10 in H⁺.',
        },
        {
          title: 'Starke vs. schwache Säuren',
          whyDangerous: '„Starke Säure" bedeutet nicht „hochkonzentriert" – beides wird gerne in einen Topf geworfen.',
          wrongThinking: '„Eine starke Säure hat immer einen niedrigeren pH als eine schwache."',
          correctThinking: 'Stärke = wie vollständig dissoziiert; Konzentration = wie viel pro Liter. Eine verdünnte starke Säure kann einen höheren pH haben als eine konzentrierte schwache.',
          memoryHint: 'Stark = dissoziiert; konzentriert = viel.',
        },
        {
          title: 'Konzentration vs. Säurestärke',
          whyDangerous: 'Klingt nach demselben – ist aber ein anderes Konzept.',
          wrongThinking: '„0,1 M HCl und 0,1 M Essigsäure haben denselben pH."',
          correctThinking: 'HCl dissoziiert vollständig → pH ≈ 1. Essigsäure dissoziiert nur teilweise (≈ 1 %) → pH ≈ 2,9. Gleiche Konzentration, anderer pH.',
          memoryHint: 'Nur dissoziierte H⁺ zählen für den pH.',
        },
        {
          title: 'Neutralisation: pH-Sprung',
          whyDangerous: 'Beim Mischen von Säure und Base wird der Endpunkt oft falsch eingeschätzt.',
          wrongThinking: '„Säure + Base ergibt immer pH 7."',
          correctThinking: 'Nur starke Säure + starke Base in EXAKT äquimolaren Mengen → pH 7. Starke Säure + schwache Base → sauer; schwache Säure + starke Base → basisch.',
          memoryHint: 'Wer „stärker" ist, bestimmt den End-pH.',
        },
        {
          title: 'pOH wird vergessen',
          whyDangerous: 'pH und pOH ergänzen sich, aber im Stress denkt man nur an pH.',
          wrongThinking: '„Bei einer basischen Lösung ist pH egal."',
          correctThinking: 'pH + pOH = 14 (bei 25 °C). Aus c(OH⁻) den pOH berechnen, dann pH = 14 – pOH.',
          memoryHint: '14 minus pOH = pH.',
        },
        {
          title: 'pKs vs. pKb verwechseln',
          whyDangerous: 'pKs und pKb beschreiben die Säure-/Base-Stärke logarithmisch. Wer sie verwechselt, vertauscht stark und schwach.',
          wrongThinking: '„Je größer der pKs, desto stärker die Säure."',
          correctThinking: 'Je KLEINER der pKs, desto stärker die Säure (pKs = –log Ks). Starke Säuren: pKs < 0. Schwache Säuren: pKs > 0. Analog für Basen: kleiner pKb = stärkere Base.',
          memoryHint: 'pK klein = stark. (Wie pH klein = sauer.)',
        },
        {
          title: 'Pufferlösung wird ignoriert',
          whyDangerous: 'Bei MC-Fragen zu Säuren wird gerne vergessen, dass Mischungen mit Salz puffern.',
          wrongThinking: '„Bei Zugabe von wenig Säure ändert sich der pH proportional."',
          correctThinking: 'In einer Pufferlösung (schwache Säure + ihr Salz, z.B. Essigsäure + Acetat) bleibt der pH bei kleinen Säurezugaben fast konstant. Henderson-Hasselbalch: pH = pKs + log([A⁻]/[HA]).',
          memoryHint: 'Puffer = Schwamm für H⁺/OH⁻.',
        },
        {
          title: 'Indikator-Umschlagpunkt ≠ Äquivalenzpunkt',
          whyDangerous: 'Titration-Fragen werden oft falsch beantwortet, wenn man Umschlag = Endpunkt setzt.',
          wrongThinking: '„Wenn der Indikator umschlägt, ist der pH genau 7."',
          correctThinking: 'Der Indikator-Umschlag soll möglichst NAHE am Äquivalenzpunkt sein. Bei starker Säure + starker Base: pH am Äquivalenzpunkt = 7. Bei schwacher Säure + starker Base: pH > 7 (basisch). Indikator muss zum Erwartungswert passen.',
          memoryHint: 'Indikator-Auswahl hängt vom End-pH ab.',
        },
        {
          title: 'Konjugierte Säure-Base-Paare',
          whyDangerous: 'Jede Säure HA hat eine konjugierte Base A⁻. Wer das übersieht, übersieht halbe MC-Fragen.',
          wrongThinking: '„H₂O ist neutral und hat keine konjugierte Form."',
          correctThinking: 'Wasser ist amphoter: H₂O ↔ H⁺ + OH⁻. Die konjugierte Säure von OH⁻ ist H₂O; die konjugierte Base von H₂O ist OH⁻. Jede Säure-Base-Reaktion ist ein Protonentausch.',
          memoryHint: 'Säure gibt H⁺ ab → wird zur Base. Base nimmt H⁺ auf → wird zur Säure.',
        },
        {
          title: 'Ionenprodukt Kw vergessen',
          whyDangerous: 'Kw = [H⁺]·[OH⁻] = 10⁻¹⁴ bei 25 °C. Wer das nicht kennt, kann keine Base-Konzentrationen berechnen.',
          wrongThinking: '„Wenn [H⁺] = 10⁻³ ist, ist [OH⁻] = 10⁻³."',
          correctThinking: '[H⁺]·[OH⁻] = 10⁻¹⁴ → wenn [H⁺] = 10⁻³, dann [OH⁻] = 10⁻¹⁴/10⁻³ = 10⁻¹¹. H⁺ und OH⁻ verhalten sich UMGEKEHRT proportional.',
          memoryHint: 'Säurer ↑ → weniger OH⁻ ↓. Produkt bleibt 10⁻¹⁴.',
        },
      ],
      quiz: [
        {
          question: 'Lösung A hat pH 3, Lösung B hat pH 5. Wie verhält sich [H⁺] in A zu [H⁺] in B?',
          answers: ['A) A hat 2-fache [H⁺]', 'B) A hat 10-fache [H⁺]', 'C) A hat 20-fache [H⁺]', 'D) A hat 100-fache [H⁺]', 'E) A hat 1000-fache [H⁺]'],
          correctAnswer: 'D',
          explanation: 'Pro pH-Stufe ändert sich [H⁺] um Faktor 10. Zwei Stufen Unterschied → 10² = 100-fach.',
          trapExplanation: 'A (2-fach) ist die Falle: Wer linear denkt ("pH-Unterschied = 2 → 2-fach"), übersieht den Logarithmus.',
        },
        {
          question: 'Welche der folgenden Aussagen ist KORREKT?',
          answers: ['A) Eine starke Säure hat immer einen niedrigeren pH als eine schwache.', 'B) 0,1 M HCl und 0,1 M Essigsäure haben denselben pH.', 'C) Eine verdünnte starke Säure kann einen höheren pH haben als eine konzentrierte schwache Säure.', 'D) "Stark" und "konzentriert" bedeuten dasselbe.', 'E) Schwache Säuren dissoziieren immer vollständig.'],
          correctAnswer: 'C',
          explanation: 'Säurestärke (Dissoziationsgrad) und Konzentration sind UNABHÄNGIG. Eine 0,001 M HCl (pH 3) ist schwächer sauer als 1 M Essigsäure (pH ≈ 2,4).',
          trapExplanation: 'A klingt logisch, ist aber falsch – Stärke ≠ Konzentration. Diese Falle taucht im MedAT regelmäßig auf.',
        },
        {
          question: 'Eine wässrige Lösung hat pOH = 4. Wie hoch ist der pH?',
          answers: ['A) 4', 'B) 7', 'C) 10', 'D) 14', 'E) Kann nicht bestimmt werden.'],
          correctAnswer: 'C',
          explanation: 'Bei 25 °C gilt: pH + pOH = 14. Also pH = 14 – 4 = 10. Die Lösung ist basisch.',
          trapExplanation: 'E (kann nicht bestimmt werden) ist die "Sicherheitsfalle" – viele wählen sie, wenn sie die Beziehung pH + pOH = 14 vergessen.',
        },
        {
          question: 'Was passiert beim Mischen einer schwachen Säure mit einer starken Base in äquimolaren Mengen?',
          answers: ['A) Der pH wird genau 7.', 'B) Der pH wird sauer (< 7).', 'C) Der pH wird basisch (> 7).', 'D) Es findet keine Reaktion statt.', 'E) Die Lösung wird neutralisiert auf pH 14.'],
          correctAnswer: 'C',
          explanation: 'Das entstehende Salz (z.B. Natriumacetat aus Essigsäure + NaOH) reagiert basisch, weil das Acetat-Ion mit Wasser reagiert und OH⁻ freisetzt.',
          trapExplanation: 'A (pH 7) ist die Falle aus der Schule – stimmt aber nur bei starke Säure + starke Base.',
        },
        {
          question: 'Welche Aussage zum pH-Wert ist KORREKT?',
          answers: ['A) pH < 7 = basisch.', 'B) pH = -log[OH⁻]', 'C) pH = -log[H⁺]', 'D) pH ist immer eine ganze Zahl.', 'E) pH-Werte unter 0 sind unmöglich.'],
          correctAnswer: 'C',
          explanation: 'Definition: pH = -log[H⁺] (genauer: pH = -log a(H⁺)). pH < 7 ist sauer, pH > 7 basisch.',
          trapExplanation: 'B vertauscht H⁺ und OH⁻. E ist falsch: konzentrierte starke Säuren können theoretisch pH < 0 erreichen.',
        },
        {
          question: 'Säure A hat pKs = 2, Säure B hat pKs = 5. Welche ist die stärkere Säure?',
          answers: ['A) Säure A', 'B) Säure B', 'C) Gleich stark', 'D) Kann nicht bestimmt werden', 'E) Hängt von der Konzentration ab'],
          correctAnswer: 'A',
          explanation: 'Je KLEINER der pKs, desto stärker die Säure (pKs = –log Ks). pKs 2 < 5 → Säure A ist stärker.',
          trapExplanation: 'B ist die intuitive aber falsche Antwort: Wer pKs wie eine "Stärke-Zahl" liest ("größer = stärker"), tappt rein.',
        },
        {
          question: 'Was passiert in einer Pufferlösung bei Zugabe von wenig HCl?',
          answers: ['A) Der pH sinkt drastisch', 'B) Der pH bleibt annähernd konstant', 'C) Der pH steigt', 'D) Die Pufferwirkung wird zerstört', 'E) Es entsteht ein Niederschlag'],
          correctAnswer: 'B',
          explanation: 'Eine Pufferlösung (z.B. Essigsäure + Acetat) kompensiert kleine Säurezugaben: Das Acetat fängt H⁺ ab → pH bleibt stabil.',
          trapExplanation: 'A ist die Falle ohne Pufferwissen — wer "Säure rein → pH runter" denkt, übersieht die Pufferwirkung.',
        },
        {
          question: 'Welche Aussage zur Titration von schwacher Säure mit starker Base ist KORREKT?',
          answers: ['A) Der pH am Äquivalenzpunkt = 7', 'B) Der pH am Äquivalenzpunkt > 7 (basisch)', 'C) Der pH am Äquivalenzpunkt < 7 (sauer)', 'D) Der Äquivalenzpunkt existiert nicht', 'E) Indikator-Umschlag ist immer bei pH 7'],
          correctAnswer: 'B',
          explanation: 'Das entstehende Salz reagiert basisch (z.B. Natriumacetat aus Essigsäure + NaOH) → Äquivalenzpunkt-pH > 7. Indikator muss entsprechend gewählt werden (z.B. Phenolphthalein).',
          trapExplanation: 'A ist die Schul-Standard-Falle: Wer "Säure + Base = pH 7" denkt, übersieht den Salz-Effekt.',
        },
        {
          question: 'Was ist die konjugierte Base von HCl?',
          answers: ['A) H⁺', 'B) OH⁻', 'C) Cl⁻', 'D) H₂O', 'E) HCl₂⁻'],
          correctAnswer: 'C',
          explanation: 'Konjugierte Base = die Säure minus ein Proton. HCl − H⁺ = Cl⁻. Die konjugierte Base ist also Cl⁻.',
          trapExplanation: 'A ist die Verwechslung mit dem abgespaltenen Proton selbst. B (OH⁻) ist die konjugierte Base von H₂O, nicht von HCl.',
        },
        {
          question: 'Bei [H⁺] = 10⁻⁴ mol/L beträgt [OH⁻] in reinem Wasser (25 °C):',
          answers: ['A) 10⁻⁴ mol/L', 'B) 10⁻⁷ mol/L', 'C) 10⁻¹⁰ mol/L', 'D) 10⁻¹⁴ mol/L', 'E) 10⁴ mol/L'],
          correctAnswer: 'C',
          explanation: 'Kw = [H⁺]·[OH⁻] = 10⁻¹⁴ → [OH⁻] = 10⁻¹⁴ / 10⁻⁴ = 10⁻¹⁰ mol/L.',
          trapExplanation: 'A ist die "Symmetrie-Falle": Wer denkt, [H⁺] und [OH⁻] seien immer gleich, übersieht das Ionenprodukt.',
        },
      ],
      checklist: [
        'pH-Skala ist logarithmisch: ΔpH 1 = Faktor 10 in [H⁺].',
        'Säurestärke ≠ Säurekonzentration.',
        'pH + pOH = 14 (bei 25 °C).',
        'Neutralisation liefert nur bei starke + starke Reaktanden pH 7.',
        'pH = -log[H⁺]; pOH = -log[OH⁻].',
        'pKs klein = starke Säure.',
        'Pufferlösung hält pH bei kleinen Säurezugaben konstant.',
        'Konjugierte Base = Säure minus H⁺.',
      ],
    },

    {
      id: 'konzentrationen',
      title: 'Konzentrationen & Einheiten',
      category: 'Chemie',
      icon: '⚗️',
      theme: 'blue',
      description: 'mol/L, g/L, %, ppm, Verdünnungen – typische Rechenfallen.',
      difficulty: 'mittel',
      estimatedTime: '8–12 Min.',
      traps: [
        {
          title: 'mol/L vs. g/L',
          whyDangerous: 'Zwei Lösungen mit gleicher g/L-Konzentration haben fast nie dieselbe Molarität.',
          wrongThinking: '„10 g/L Glucose und 10 g/L NaCl haben dieselbe Stoffmengenkonzentration."',
          correctThinking: 'mol = g / Molmasse. Glucose (180 g/mol) → 10/180 = 0,056 M. NaCl (58,5 g/mol) → 10/58,5 = 0,17 M. Faktor 3 Unterschied.',
          memoryHint: 'Erst durch die Molmasse teilen, DANN vergleichen.',
        },
        {
          title: 'Prozent: m/m, m/V, V/V',
          whyDangerous: '„% Lösung" ist mehrdeutig – ohne Suffix tappt man in eine MC-Falle.',
          wrongThinking: '„5 % Ethanol bedeutet 5 g Ethanol pro 100 g Lösung."',
          correctThinking: 'Bei Flüssigkeiten meint % in der Regel V/V (mL pro 100 mL). m/m, m/V und V/V geben unterschiedliche Werte. Immer auf Angabe achten.',
          memoryHint: 'Erstes Zeichen = was du misst (Masse/Volumen); zweites = wovon (Masse/Volumen).',
        },
        {
          title: 'ppm = winzig',
          whyDangerous: 'ppm und mg/L werden gerne verwechselt – aber sind nur in WASSER fast gleich.',
          wrongThinking: '„1 ppm = 1 mg/g"',
          correctThinking: '1 ppm = 1 mg/kg = 1 mg/L (nur in Wasser, weil ρ ≈ 1). NICHT 1 mg/g (das wäre 1000 ppm).',
          memoryHint: 'ppm = parts per MILLION → 10⁻⁶, nicht 10⁻³.',
        },
        {
          title: 'Verdünnungsformel falsch anwenden',
          whyDangerous: 'c₁·V₁ = c₂·V₂ klingt einfach – aber Vor- und Nach-Volumen werden verwechselt.',
          wrongThinking: '„Ich nehme 10 mL einer 1 M Lösung und füge 90 mL Wasser hinzu, also c₂ = c₁/10."',
          correctThinking: 'V₂ ist das ENDvolumen (10 + 90 = 100 mL). Wenn 10 mL einer 1 M Stammlösung auf 100 mL aufgefüllt werden, bleibt das richtig (Faktor 10). Wenn 90 mL hinzugefügt werden, ist V₂ = 100 mL.',
          memoryHint: 'V₂ = Endvolumen, NICHT zugefügtes Wasser.',
        },
        {
          title: 'Einheiten nicht umrechnen',
          whyDangerous: 'mL und L, mg und g, °C und K – ungleiche Einheiten ergeben falsche Antworten, die im MC oft genau als Distraktor angeboten werden.',
          wrongThinking: '„Konzentration = 0,5 g pro 50 mL = 0,5 g/50 mL = 0,01 g/L."',
          correctThinking: '0,5 g / 50 mL = 0,5 g / 0,05 L = 10 g/L. Erst Einheiten angleichen.',
          memoryHint: 'Bevor du teilst: alles in dieselbe Einheit.',
        },
        {
          title: 'Molarität (M) vs. Molalität (m)',
          whyDangerous: 'Klingt fast gleich, ist aber etwas grundsätzlich Verschiedenes — Volumen vs. Masse des Lösungsmittels.',
          wrongThinking: '„1 M Lösung = 1 mol pro kg Wasser."',
          correctThinking: 'Molarität M = mol pro Liter LÖSUNG. Molalität m = mol pro kg LÖSUNGSMITTEL. Bei verdünnten wässrigen Lösungen fast gleich, bei konzentrierten unterschiedlich.',
          memoryHint: 'M = Volumen-Liter; m = Massen-Kilogramm.',
        },
        {
          title: 'Avogadro-Zahl & Stoffmenge',
          whyDangerous: 'Stoffmenge (mol) wird mit Teilchenzahl verwechselt.',
          wrongThinking: '„1 mol = 1 Teilchen."',
          correctThinking: '1 mol = 6,022 × 10²³ Teilchen (Avogadro-Konstante NA). 1 mol Wasser = 6,022 × 10²³ H₂O-Moleküle = 18 g.',
          memoryHint: 'mol = Päckchen mit 6×10²³ Teilchen.',
        },
        {
          title: 'Mischungs-Regel falsch addieren',
          whyDangerous: 'Wenn man Lösungen mischt, addiert man die Volumina, aber nicht direkt die Konzentrationen.',
          wrongThinking: '„0,1 M + 0,2 M = 0,3 M Mischung."',
          correctThinking: 'Korrekt: c_neu = (c₁·V₁ + c₂·V₂) / (V₁ + V₂). Bei gleichen Volumina: c_neu = (c₁ + c₂) / 2 = 0,15 M.',
          memoryHint: 'Mischungs-Konzentration ist immer der GEWICHTETE Mittelwert.',
        },
        {
          title: 'Stöchiometrie: Verhältnis ≠ Masse',
          whyDangerous: 'Reaktionsgleichungen geben mol-Verhältnisse, nicht Massen.',
          wrongThinking: '„2 H₂ + O₂ → 2 H₂O: also 2 g Wasserstoff + 1 g Sauerstoff = 2 g Wasser."',
          correctThinking: 'Die Koeffizienten sind mol-Zahlen. 2 mol H₂ (4 g) + 1 mol O₂ (32 g) → 2 mol H₂O (36 g). Massen-Erhaltung: 4 + 32 = 36 ✓.',
          memoryHint: 'Koeffizient = mol, nicht Gramm.',
        },
        {
          title: 'Limitierender Reaktant übersehen',
          whyDangerous: 'In Stöchiometrie-Aufgaben hängt das Produktmaximum vom unterschüssigen Edukt ab — nicht vom Mittelwert.',
          wrongThinking: '„Bei 3 mol H₂ + 1 mol O₂ entstehen 3 mol H₂O."',
          correctThinking: 'Reaktion 2H₂ + O₂ → 2H₂O. Pro mol O₂ → 2 mol H₂O. Mit 1 mol O₂ (limitierender Reaktant) entstehen MAX 2 mol H₂O. 1 mol H₂ bleibt ungenutzt.',
          memoryHint: 'Produkt = limitierter Reaktant × Stöchiometrie-Verhältnis.',
        },
      ],
      quiz: [
        {
          question: 'Welche Lösung hat die HÖCHSTE Stoffmengenkonzentration (Molarität)?',
          answers: ['A) 10 g/L Glucose (M = 180 g/mol)', 'B) 10 g/L NaCl (M = 58,5 g/mol)', 'C) 10 g/L Saccharose (M = 342 g/mol)', 'D) 10 g/L Harnstoff (M = 60 g/mol)', 'E) Alle gleich – gleiche g/L.'],
          correctAnswer: 'D',
          explanation: 'Bei gleicher g/L hat die Substanz mit der KLEINSTEN Molmasse die höchste Molarität: 10/60 ≈ 0,167 M (Harnstoff) > 10/58,5 ≈ 0,171 M (NaCl ist hier knapp höher!). Korrekt: NaCl ist minimal höher – aber die typische Falle ist E.',
          trapExplanation: 'E („alle gleich") ist DIE Falle: Wer „gleiche g/L" mit „gleiche Konzentration" verwechselt, tappt rein. Molarität hängt immer von der Molmasse ab.',
        },
        {
          question: 'Was bedeutet 1 ppm in Wasser?',
          answers: ['A) 1 mg pro g Wasser', 'B) 1 mg pro L Wasser', 'C) 1 g pro L Wasser', 'D) 1 % pro L Wasser', 'E) 1 mol pro L Wasser'],
          correctAnswer: 'B',
          explanation: '1 ppm = 1 mg/kg, in Wasser (ρ ≈ 1 kg/L) also ≈ 1 mg/L. Das ist eine sehr kleine Menge.',
          trapExplanation: 'A (1 mg/g) ist die häufigste Falle – das wären 1000 ppm. ppm = parts per million → 10⁻⁶.',
        },
        {
          question: 'Du verdünnst 20 mL einer 0,5 M HCl auf 100 mL Endvolumen. Wie hoch ist die neue Konzentration?',
          answers: ['A) 0,025 M', 'B) 0,05 M', 'C) 0,1 M', 'D) 0,2 M', 'E) 0,5 M'],
          correctAnswer: 'C',
          explanation: 'c₁·V₁ = c₂·V₂ → 0,5 · 20 = c₂ · 100 → c₂ = 10/100 = 0,1 M.',
          trapExplanation: 'A (0,025 M) entsteht, wenn man V₂ als nur das zugefügte Wasser (80 mL) auf 20+80 statt 100 mL bezieht.',
        },
        {
          question: 'Wie viel Glucose musst du in Wasser auflösen, um 250 mL einer 0,2 M Lösung herzustellen? (M(Glucose) = 180 g/mol)',
          answers: ['A) 0,9 g', 'B) 9 g', 'C) 18 g', 'D) 36 g', 'E) 90 g'],
          correctAnswer: 'B',
          explanation: 'n = c·V = 0,2 mol/L · 0,25 L = 0,05 mol. m = n·M = 0,05 · 180 = 9 g.',
          trapExplanation: 'C (18 g) entsteht, wenn man V = 0,5 L statt 0,25 L verwendet. A (0,9 g) entsteht, wenn man Molarität mit 250 mg/mL multipliziert statt L.',
        },
        {
          question: 'Du hast 0,5 g Salz in 50 mL Wasser. Was ist die Massenkonzentration?',
          answers: ['A) 0,01 g/L', 'B) 0,1 g/L', 'C) 1 g/L', 'D) 10 g/L', 'E) 100 g/L'],
          correctAnswer: 'D',
          explanation: '0,5 g / 50 mL = 0,5 g / 0,05 L = 10 g/L. Wichtig: mL erst in L umrechnen.',
          trapExplanation: 'A (0,01 g/L) entsteht, wenn man g/mL berechnet und dann fälschlich „mit 1000 multipliziert" für die L-Umrechnung in die falsche Richtung.',
        },
        {
          question: 'Wie unterscheiden sich Molarität (M) und Molalität (m)?',
          answers: ['A) Beide sind identisch', 'B) M = mol pro Liter Lösung; m = mol pro kg Lösungsmittel', 'C) M = mol pro kg; m = mol pro Liter', 'D) M ist nur für Säuren definiert', 'E) m ist nur für Gase'],
          correctAnswer: 'B',
          explanation: 'Molarität M misst pro Volumen LÖSUNG (1 L), Molalität m pro Masse LÖSUNGSMITTEL (1 kg). Bei verdünnten wässrigen Lösungen fast gleich.',
          trapExplanation: 'A ist die typische Verwechslungs-Falle, weil beide Begriffe fast gleich klingen.',
        },
        {
          question: 'Wie viele Wassermoleküle sind in 9 g H₂O? (M(H₂O) = 18 g/mol; NA = 6,022·10²³)',
          answers: ['A) 6,022 × 10²³', 'B) 3,011 × 10²³', 'C) 1,5 × 10²³', 'D) 18 × 10²³', 'E) 9 × 10²³'],
          correctAnswer: 'B',
          explanation: '9 g / 18 g/mol = 0,5 mol → 0,5 · 6,022·10²³ = 3,011·10²³ Moleküle.',
          trapExplanation: 'A ist die "Standard-Avogadro-Antwort" – wer 9 g mit 1 mol verwechselt, wählt sie.',
        },
        {
          question: 'Du mischst 100 mL einer 0,1 M HCl mit 100 mL einer 0,3 M HCl. Welche Konzentration hat die Mischung?',
          answers: ['A) 0,1 M', 'B) 0,2 M', 'C) 0,3 M', 'D) 0,4 M', 'E) 0,6 M'],
          correctAnswer: 'B',
          explanation: 'c_neu = (0,1·100 + 0,3·100) / (100 + 100) = 40 / 200 = 0,2 M. Gewichteter Mittelwert bei gleichen Volumina = einfacher Mittelwert.',
          trapExplanation: 'D (0,4 M) ist die Falle: Wer Konzentrationen einfach addiert, vergisst, dass das Volumen auch wächst.',
        },
        {
          question: 'Wie viel Gramm Wasser entstehen bei vollständiger Reaktion von 4 g H₂ mit O₂? Reaktion: 2 H₂ + O₂ → 2 H₂O (M(H₂)=2, M(O₂)=32, M(H₂O)=18)',
          answers: ['A) 4 g', 'B) 18 g', 'C) 36 g', 'D) 72 g', 'E) 9 g'],
          correctAnswer: 'C',
          explanation: '4 g H₂ / 2 g·mol⁻¹ = 2 mol H₂ → 2 mol H₂O = 2·18 = 36 g.',
          trapExplanation: 'A (4 g) ist die "Masseninstinkt-Falle": Wer denkt "4 g rein, 4 g raus", ignoriert die Beteiligung des O₂.',
        },
        {
          question: 'Du gibst 3 mol H₂ + 1 mol O₂. Wie viel mol H₂O entstehen maximal? Reaktion: 2H₂ + O₂ → 2H₂O',
          answers: ['A) 1 mol', 'B) 2 mol', 'C) 3 mol', 'D) 4 mol', 'E) 6 mol'],
          correctAnswer: 'B',
          explanation: 'O₂ ist der limitierende Reaktant: 1 mol O₂ reagiert mit 2 mol H₂ zu 2 mol H₂O. 1 mol H₂ bleibt übrig.',
          trapExplanation: 'C (3 mol) ist die Falle: Wer denkt "ich habe 3 mol H₂, also 3 mol H₂O", ignoriert das stöchiometrische Verhältnis und den limitierenden Reaktanten.',
        },
      ],
      checklist: [
        'Molarität = g / Molmasse / Liter.',
        '1 ppm ≈ 1 mg/L (in Wasser) – nicht 1 mg/g.',
        'c₁·V₁ = c₂·V₂ mit V₂ als Endvolumen.',
        '% kann m/m, m/V oder V/V bedeuten.',
        'Immer Einheiten angleichen, bevor man rechnet.',
        'Molarität (M, Liter) ≠ Molalität (m, kg).',
        'Mischung: gewichteter Mittelwert, kein Addieren der Konzentrationen.',
        'Stöchiometrische Koeffizienten = mol, nicht Gramm.',
      ],
    },

    // ===== PHYSIK ======================================================
    {
      id: 'kraefte',
      title: 'Kräfte & Newton',
      category: 'Physik',
      icon: '⚙️',
      theme: 'coral',
      description: 'Masse vs. Gewicht, Kraft vs. Energie, Reibung – klassische Konzeptfallen.',
      difficulty: 'mittel',
      estimatedTime: '10–15 Min.',
      traps: [
        {
          title: 'Masse vs. Gewichtskraft',
          whyDangerous: 'Im Alltag „dasselbe", in der Physik zwei verschiedene Größen mit unterschiedlichen Einheiten.',
          wrongThinking: '„Mein Gewicht ist 70 kg."',
          correctThinking: 'Masse: 70 kg (überall gleich). Gewichtskraft: F = m·g ≈ 70 · 9,81 ≈ 687 N (auf Erde). Auf dem Mond hat man dieselbe Masse, aber 1/6 der Gewichtskraft.',
          memoryHint: 'Masse → kg; Kraft → N.',
        },
        {
          title: 'Kraft vs. Energie',
          whyDangerous: 'Beide klingen nach „Wirkung", sind aber unterschiedlich: Kraft (N) hat Richtung, Energie (J) ist skalar.',
          wrongThinking: '„Eine größere Kraft = mehr Energie."',
          correctThinking: 'W = F · s. Eine große Kraft, die nichts bewegt (z.B. Wand drücken), leistet KEINE Arbeit und liefert keine Energie. Energie braucht Kraft × Weg.',
          memoryHint: 'Kraft ohne Weg = keine Arbeit.',
        },
        {
          title: 'Beschleunigung ≠ Geschwindigkeit',
          whyDangerous: 'Ein Körper kann schnell sein und dabei NICHT beschleunigen – oder langsam und stark beschleunigen.',
          wrongThinking: '„Wenn ich schneller werde, beschleunige ich. Wenn ich langsamer werde, beschleunige ich nicht."',
          correctThinking: 'Beschleunigung = Änderung der Geschwindigkeit (auch Verlangsamung!). Bremsen IST Beschleunigung in negative Richtung.',
          memoryHint: 'a = Δv/Δt – jede Änderung zählt, egal ob schneller oder langsamer.',
        },
        {
          title: 'Newtons 3. Gesetz verwechseln',
          whyDangerous: '„Aktion = Reaktion" wird gerne mit Kräftegleichgewicht verwechselt.',
          wrongThinking: '„Wenn die Tischplatte mich nach oben drückt mit der gleichen Kraft wie ich nach unten, heben sich die Kräfte auf und ich falle nicht."',
          correctThinking: 'Actio/Reactio: zwei Kräfte zwischen ZWEI KÖRPERN. Sie wirken auf VERSCHIEDENE Körper. Im Kräftegleichgewicht (z.B. Buch auf Tisch) heben sich Kräfte AUF EINEM KÖRPER auf – das ist ein anderes Konzept.',
          memoryHint: 'Actio/Reactio = zwei Körper; Gleichgewicht = ein Körper.',
        },
        {
          title: 'Reibungskraft vergessen',
          whyDangerous: 'Im Idealfall existiert sie „nicht", in MC-Fragen aber meistens schon.',
          wrongThinking: '„Auf einer horizontalen Fläche braucht ein Körper keine Kraft, um sich gleichförmig zu bewegen."',
          correctThinking: 'Im REIBUNGSFREIEN Fall (Trägheitsprinzip) gilt das. In der Realität braucht man eine Kraft = Reibungskraft, um die Geschwindigkeit konstant zu halten.',
          memoryHint: 'Lies genau: „reibungsfrei" oder „mit Reibung"?',
        },
        {
          title: 'Impuls vs. Kraft',
          whyDangerous: 'Beide klingen nach "Wucht", sind aber physikalisch verschieden.',
          wrongThinking: '„Impuls = Kraft, nur ein anderes Wort."',
          correctThinking: 'Impuls p = m·v (Einheit kg·m/s) — ein Maß für Bewegungsmenge. Kraft F = dp/dt (Einheit N = kg·m/s²) — die Änderung des Impulses pro Zeit. Stoßgesetz: Δp = F·Δt.',
          memoryHint: 'Impuls = m·v (Speicher); Kraft = wie schnell sich Impuls ändert.',
        },
        {
          title: 'Federkraft & Hookesches Gesetz',
          whyDangerous: 'F = D·s wird gerne verwechselt mit Energie 1/2·D·s².',
          wrongThinking: '„Energie einer gespannten Feder = D·s."',
          correctThinking: 'F_Feder = D·s (Auslenkung mal Federkonstante). Aber Spann-Energie E = 1/2·D·s² (Dreiecksfläche unter der F-s-Kurve). Die Energie wächst quadratisch mit der Auslenkung.',
          memoryHint: 'Kraft = linear; Energie = quadratisch.',
        },
        {
          title: 'Schiefe Ebene: Komponenten verwechseln',
          whyDangerous: 'Bei einer schiefen Ebene wird die Gewichtskraft in Hangabtrieb (sin α) und Normalkraft (cos α) zerlegt — die Funktionen werden gerne vertauscht.',
          wrongThinking: '„Bei 0° hat man maximalen Hangabtrieb (cos 0° = 1)."',
          correctThinking: 'Bei 0° (flache Ebene): KEIN Hangabtrieb. sin 0° = 0. Hangabtrieb = m·g·sin α. Normalkraft = m·g·cos α. Bei 90° (senkrecht) ist Normalkraft 0, Hangabtrieb = volle Gewichtskraft.',
          memoryHint: 'Hang abwärts = SINUS (steiler → mehr).',
        },
        {
          title: 'Zentripetalkraft existiert wirklich',
          whyDangerous: 'Bei Kreisbewegung wird oft mit "Zentrifugalkraft" argumentiert — die ist aber nur eine Schein-/Trägheitskraft im rotierenden Bezugssystem.',
          wrongThinking: '„Bei Kreisbewegung wirkt eine nach AUSSEN gerichtete Zentrifugalkraft."',
          correctThinking: 'Im Inertialsystem wirkt eine ZENTRIPETALKRAFT nach INNEN (z.B. Seilspannung). Sie hält den Körper auf Kreisbahn (sonst flöge er tangential weg, Trägheitsprinzip). F_Z = m·v²/r.',
          memoryHint: 'Zentripetal = "zur Mitte hin"; Zentrifugal = nur gefühlt.',
        },
        {
          title: 'Drehmoment vs. Kraft',
          whyDangerous: 'Hebel-Aufgaben werden oft mit "größere Kraft = mehr Drehung" gelöst. Falsch ohne Hebelarm.',
          wrongThinking: '„Wer mehr Kraft aufbringt, dreht stärker."',
          correctThinking: 'Drehmoment M = F · r (Kraft mal Hebelarm). Eine kleine Kraft mit langem Hebel kann eine große Kraft mit kurzem Hebel übertreffen. Einheit: Nm.',
          memoryHint: 'Lang hebeln, wenig Kraft — Drehmoment zählt, nicht Kraft allein.',
        },
      ],
      quiz: [
        {
          question: 'Ein Astronaut hat auf der Erde eine Masse von 80 kg. Welche Aussage über ihn auf dem Mond (g ≈ 1,6 m/s²) ist KORREKT?',
          answers: ['A) Seine Masse beträgt etwa 13 kg.', 'B) Seine Gewichtskraft beträgt etwa 80 N.', 'C) Seine Masse bleibt 80 kg, seine Gewichtskraft beträgt ca. 128 N.', 'D) Seine Masse und Gewichtskraft halbieren sich.', 'E) Beides bleibt gleich.'],
          correctAnswer: 'C',
          explanation: 'Masse ist ortsunabhängig (80 kg). Gewichtskraft F = m·g = 80 · 1,6 = 128 N.',
          trapExplanation: 'A vertauscht Masse mit Gewichtskraft. E ignoriert, dass g auf dem Mond anders ist.',
        },
        {
          question: 'Eine Person drückt mit 200 N gegen eine Wand, die sich nicht bewegt. Welche Aussage ist KORREKT?',
          answers: ['A) Sie leistet 200 J Arbeit.', 'B) Sie leistet keine Arbeit, weil kein Weg zurückgelegt wird.', 'C) Sie leistet maximale Arbeit, da die Kraft sehr groß ist.', 'D) Sie leistet negative Arbeit.', 'E) Die Arbeit beträgt 200 W.'],
          correctAnswer: 'B',
          explanation: 'W = F · s · cos(α). Wenn s = 0, ist W = 0 – egal wie groß F ist.',
          trapExplanation: 'A wirkt logisch ("200 N = 200 J"), übersieht die Bedingung Kraft × WEG. E vertauscht Joule mit Watt (Einheit der Leistung).',
        },
        {
          question: 'Welche Aussage zur Beschleunigung ist KORREKT?',
          answers: ['A) Beschleunigung tritt nur beim Schnellerwerden auf.', 'B) Bremsen ist keine Beschleunigung.', 'C) Beschleunigung ist jede Änderung der Geschwindigkeit (Betrag oder Richtung).', 'D) Beschleunigung und Geschwindigkeit sind dasselbe.', 'E) Konstante Geschwindigkeit bedeutet konstante Beschleunigung.'],
          correctAnswer: 'C',
          explanation: 'Beschleunigung a = dv/dt – jede Änderung von v (Betrag ODER Richtung, z.B. Kreisbewegung) ist Beschleunigung.',
          trapExplanation: 'A & B sind Alltagsfallen. Bremsen ist negative Beschleunigung. Selbst gleichmäßige Kreisbewegung ist beschleunigt (Richtungsänderung).',
        },
        {
          question: 'Ein Buch liegt ruhend auf einem Tisch. Welche zwei Kräfte sind ein Actio/Reactio-Paar nach Newtons 3. Gesetz?',
          answers: ['A) Gewichtskraft des Buches und Normalkraft des Tisches auf das Buch.', 'B) Gewichtskraft des Buches und Anziehungskraft, mit der das Buch die Erde anzieht.', 'C) Normalkraft und Reibungskraft.', 'D) Masse und Gewichtskraft.', 'E) Trägheitskraft und Schwerkraft.'],
          correctAnswer: 'B',
          explanation: 'Actio/Reactio = ein Paar zwischen ZWEI Körpern. Die Erde zieht das Buch an, und das Buch zieht die Erde mit derselben Kraft an. Antwort A beschreibt das KRÄFTEGLEICHGEWICHT auf demselben Körper.',
          trapExplanation: 'A ist die klassische Falle: Beide Kräfte wirken AUF DAS BUCH – das ist kein Actio/Reactio-Paar, sondern Gleichgewicht.',
        },
        {
          question: 'Ein Auto fährt mit konstanter Geschwindigkeit auf einer geraden Straße. Welche Aussage stimmt?',
          answers: ['A) Es wirkt keinerlei Kraft auf das Auto.', 'B) Die Summe aller Kräfte ist null – Antriebskraft und Reibung sind gleich groß.', 'C) Die Antriebskraft ist größer als die Reibung.', 'D) Es muss eine Nettokraft in Fahrtrichtung wirken.', 'E) Die Beschleunigung ist konstant > 0.'],
          correctAnswer: 'B',
          explanation: 'Konstante Geschwindigkeit = keine Beschleunigung = Summe aller Kräfte = 0. Die Antriebskraft kompensiert exakt die Reibungskraft.',
          trapExplanation: 'A ist die "Vakuum-Idealisierungsfalle". In Wirklichkeit wirken Antrieb UND Reibung – sie heben sich auf.',
        },
        {
          question: 'Welche Einheit hat der Impuls?',
          answers: ['A) N (Newton)', 'B) J (Joule)', 'C) kg·m/s', 'D) W (Watt)', 'E) m/s²'],
          correctAnswer: 'C',
          explanation: 'p = m·v → Einheit: kg · m/s. Newton wäre Kraft (kg·m/s²), Joule die Energie (kg·m²/s²).',
          trapExplanation: 'A (Newton) ist die häufigste Falle, weil Impuls und Kraft umgangssprachlich vermischt werden.',
        },
        {
          question: 'Eine Feder mit D = 100 N/m wird um s = 0,2 m gedehnt. Welche Energie ist gespeichert?',
          answers: ['A) 20 J', 'B) 10 J', 'C) 4 J', 'D) 2 J', 'E) 0,5 J'],
          correctAnswer: 'D',
          explanation: 'E = 1/2 · D · s² = 0,5 · 100 · (0,2)² = 0,5 · 100 · 0,04 = 2 J.',
          trapExplanation: 'A (20 J) entsteht, wenn man Kraft (F = D·s = 20 N) statt Energie ausrechnet. C (4 J) vergisst den Faktor 1/2.',
        },
        {
          question: 'Ein Klotz liegt auf einer schiefen Ebene mit 30° Neigung. Wie ist der Hangabtrieb in Relation zur Gewichtskraft FG?',
          answers: ['A) FG · cos 30° ≈ 0,87·FG', 'B) FG · sin 30° = 0,5·FG', 'C) FG · tan 30° ≈ 0,58·FG', 'D) FG (volle Gewichtskraft)', 'E) 0 (kein Hangabtrieb auf schiefer Ebene)'],
          correctAnswer: 'B',
          explanation: 'Hangabtrieb = m·g·sin α. Für 30°: sin 30° = 0,5 → 0,5·FG.',
          trapExplanation: 'A (cos 30°) ist die häufigste Falle: Wer sin und cos verwechselt, vertauscht Hangabtrieb mit Normalkraft.',
        },
        {
          question: 'Welche Kraft hält einen Körper bei konstanter Kreisbewegung auf der Kreisbahn?',
          answers: ['A) Zentrifugalkraft (nach außen)', 'B) Zentripetalkraft (nach innen)', 'C) Gravitationskraft (nach unten)', 'D) Normalkraft', 'E) Es wirkt keine Kraft, weil v konstant ist'],
          correctAnswer: 'B',
          explanation: 'Die Zentripetalkraft (F_Z = m·v²/r) zeigt nach INNEN zum Mittelpunkt und hält den Körper auf der Kreisbahn. Ohne sie würde er tangential weg fliegen.',
          trapExplanation: 'A ist die populärste Falle: Im rotierenden Bezugssystem "fühlt" man eine Zentrifugalkraft, im physikalischen Inertialsystem existiert sie aber nicht.',
        },
        {
          question: 'An einem 1 m langen Hebel wird im Abstand 20 cm vom Drehpunkt eine Kraft von 50 N angesetzt. Wie groß ist das Drehmoment?',
          answers: ['A) 5 Nm', 'B) 10 Nm', 'C) 50 Nm', 'D) 100 Nm', 'E) 250 Nm'],
          correctAnswer: 'B',
          explanation: 'M = F · r = 50 N · 0,2 m = 10 Nm. WICHTIG: r in Meter, nicht cm.',
          trapExplanation: 'D (100 Nm) entsteht, wenn man die Hebellänge (1 m) statt des Hebelarms (0,2 m) nimmt. C (50 Nm) ignoriert den Hebelarm komplett.',
        },
      ],
      checklist: [
        'Masse (kg) ≠ Gewichtskraft (N).',
        'Arbeit braucht Kraft UND Weg in Kraftrichtung.',
        'Beschleunigung = jede Geschwindigkeitsänderung (auch Bremsen, auch Richtung).',
        'Actio/Reactio: zwei Körper – Gleichgewicht: ein Körper.',
        'Konstante v → ΣF = 0 (nicht F = 0!).',
        'Impuls (kg·m/s) ≠ Kraft (N). Δp = F·Δt.',
        'Feder-Energie quadratisch (E = 1/2·D·s²), Kraft linear (F = D·s).',
        'Hangabtrieb = sin α · FG; Normalkraft = cos α · FG.',
        'Zentripetalkraft (nach innen) hält Kreisbewegung — Zentrifugalkraft ist Scheinkraft.',
      ],
    },
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────────────────────────────────────
  let _currentTopic = null;
  let _quizState = null; // { idx, answers: [], score }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ──────────────────────────────────────────────────────────────────────────
  function open() {
    if (typeof App !== 'undefined' && App.showScreen) {
      App.showScreen('screen-trap-lab');
    }
    _renderTopicList();
  }

  function openTopic(id) {
    const topic = TOPICS.find(t => t.id === id);
    if (!topic) return;

    // Alle Themen sind für alle frei einsehbar — Paywall nur am Quiz/Coach/PDF
    _currentTopic = topic;
    _quizState = null;
    if (typeof App !== 'undefined' && App.showScreen) {
      App.showScreen('screen-trap-detail');
    }
    _renderTopicDetail();
  }

  function _showUpgradeModal() {
    // Reuse Wissens-Lab Upgrade-Modal wenn möglich, sonst zur Konto-Seite
    if (typeof App !== 'undefined' && typeof App.openToolsUpgradeModal === 'function') {
      App.openToolsUpgradeModal();
    } else if (typeof App !== 'undefined' && App.showScreen) {
      App.showScreen('screen-konto');
      if (typeof App.renderKonto === 'function') App.renderKonto();
    }
  }

  function back() {
    if (typeof App !== 'undefined' && App.showScreen) {
      App.showScreen('screen-trap-lab');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RENDERING
  // ──────────────────────────────────────────────────────────────────────────
  function _renderTopicList() {
    const el = document.getElementById('trap-lab-content');
    if (!el) return;

    const paid = _isPaid();
    const remaining = _quizRemaining();

    const totalTraps = TOPICS.reduce((s, t) => s + t.traps.length, 0);
    const totalQuiz = TOPICS.reduce((s, t) => s + t.quiz.length, 0);

    // Group by category for sub-titles
    const byCat = {};
    TOPICS.forEach(t => {
      if (!byCat[t.category]) byCat[t.category] = [];
      byCat[t.category].push(t);
    });

    let html = `
      <div class="trap-lab-hero fade-up">
        <div class="trap-lab-hero-bg"></div>
        <div class="trap-lab-hero-inner">
          <div class="trap-lab-hero-label">
            <span class="trap-lab-hero-dot"></span>
            MEDAT 2026 · DENKFEHLER-LAB
          </div>
          <h1 class="trap-lab-hero-title">Erkenne die Falle,<br>bevor sie dich erwischt.</h1>
          <p class="trap-lab-hero-sub">
            ${TOPICS.length} Themen · <b>${totalTraps} typische Fallen</b> · ${totalQuiz} MC-Fragen
          </p>
          <div class="trap-lab-hero-stats">
            <div class="trap-lab-stat">
              <div class="trap-lab-stat-num">${TOPICS.length}</div>
              <div class="trap-lab-stat-lbl">Themen</div>
            </div>
            <div class="trap-lab-stat">
              <div class="trap-lab-stat-num">${totalTraps}</div>
              <div class="trap-lab-stat-lbl">Fallen</div>
            </div>
            <div class="trap-lab-stat">
              <div class="trap-lab-stat-num">${totalQuiz}</div>
              <div class="trap-lab-stat-lbl">MC-Fragen</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Quiz-Counter für Free-User
    if (!paid) {
      const exhausted = remaining <= 0;
      html += `
        <div class="trap-quiz-counter fade-up ${exhausted ? 'is-exhausted' : ''}">
          <div class="trap-quiz-counter-icon">${exhausted ? '🔒' : '🎯'}</div>
          <div class="trap-quiz-counter-info">
            <div class="trap-quiz-counter-title">${exhausted
              ? 'Free-Quiz aufgebraucht'
              : `Noch <b>${remaining} von ${FREE_QUIZ_STARTS}</b> Free-Quiz übrig`}</div>
            <div class="trap-quiz-counter-desc">${exhausted
              ? 'Mit Vollzugang trainierst du unbegrenzt + Coach &amp; PDF.'
              : 'Themen + Fallen kannst du frei lesen. Quiz-Starts sind im Free-Plan begrenzt.'}</div>
          </div>
          <button class="trap-quiz-counter-btn" onclick="App.showScreen('screen-konto');App.renderKonto();">Upgrade</button>
        </div>
      `;
    }

    // Themen-Sektionen pro Fach
    Object.keys(byCat).forEach(cat => {
      html += `
        <div class="trap-section-head fade-up">
          <h2>${cat}</h2>
          <span class="trap-section-count">${byCat[cat].length} ${byCat[cat].length === 1 ? 'Thema' : 'Themen'}</span>
        </div>
        <div class="trap-topic-grid fade-up">
          ${byCat[cat].map(t => _renderTopicCard(t)).join('')}
        </div>
      `;
    });

    el.innerHTML = html;
  }

  function _renderTopicCard(t) {
    const theme = t.theme || 'mint';
    return `
      <button class="trap-topic-card trap-topic-card--${theme}" onclick="TrapLab.openTopic('${t.id}')">
        <div class="trap-topic-card-bg"></div>
        <div class="trap-topic-card-emoji">${t.icon || '🧪'}</div>
        <div class="trap-topic-card-body">
          <div class="trap-topic-card-title">${t.title}</div>
          <div class="trap-topic-card-desc">${t.description}</div>
        </div>
        <div class="trap-topic-card-meta">
          <div class="trap-topic-card-pill">
            <span class="trap-topic-pill-num">${t.traps.length}</span>
            <span class="trap-topic-pill-lbl">Fallen</span>
          </div>
          <div class="trap-topic-card-pill">
            <span class="trap-topic-pill-num">${t.quiz.length}</span>
            <span class="trap-topic-pill-lbl">MC</span>
          </div>
          <div class="trap-topic-card-time">${t.estimatedTime}</div>
        </div>
      </button>
    `;
  }

  function _iconFor(cat) {
    if (cat === 'Biologie') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4 c5 4 11 4 16 0"/><path d="M4 20 c5-4 11-4 16 0"/><line x1="6" y1="7" x2="6" y2="17"/><line x1="10" y1="9" x2="10" y2="15"/><line x1="14" y1="9" x2="14" y2="15"/><line x1="18" y1="7" x2="18" y2="17"/></svg>';
    if (cat === 'Chemie') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3 v6 l-5 9 a2 2 0 0 0 1.7 3 h12.6 a2 2 0 0 0 1.7 -3 l-5 -9 V 3"/><line x1="9" y1="3" x2="15" y2="3"/></svg>';
    if (cat === 'Physik') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="3" x2="12" y2="17"/><polyline points="6 11 12 17 18 11"/></svg>';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/></svg>';
  }

  // Helper: zieht aus einem langen Text die ersten X Worte als Kurzfassung
  function _shorten(text, maxChars = 70) {
    if (!text) return '';
    const s = String(text).trim();
    if (s.length <= maxChars) return s;
    // schneide am letzten Leerzeichen vor maxChars
    const cut = s.slice(0, maxChars);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 30 ? cut.slice(0, lastSpace) : cut) + '…';
  }

  function _renderTopicDetail() {
    const el = document.getElementById('trap-detail-content');
    if (!el || !_currentTopic) return;
    const t = _currentTopic;
    const paid = _isPaid();
    const remaining = _quizRemaining();
    const quizExhausted = !paid && remaining <= 0;
    const theme = t.theme || 'mint';

    const lockBtn = (label, action) => `
      <button class="trap-btn trap-btn-ghost" onclick="TrapLab._gateOrRun('${action}')" title="Vollzugang benötigt">
        🔒 ${label}
      </button>
    `;
    const coachBtn = paid
      ? `<button class="trap-btn trap-btn-ghost" onclick="TrapLab.askCoach()">🎓 Coach</button>`
      : lockBtn('Coach', 'coach');
    const coachNoteCount = getPdfNotes(t.id).length;
    const pdfBtnLabel = coachNoteCount > 0
      ? `📄 PDF <span class="trap-btn-badge">+${coachNoteCount}</span>`
      : `📄 PDF`;
    const pdfBtn = paid
      ? `<button class="trap-btn trap-btn-ghost" onclick="TrapLab.generatePDF()">${pdfBtnLabel}</button>`
      : lockBtn('PDF', 'pdf');

    const quizBtnLabel = paid
      ? '▶ Mini-Quiz starten'
      : (quizExhausted ? '🔒 Quiz freischalten' : `▶ Mini-Quiz starten (${remaining} frei übrig)`);

    // Wahl-Tab je nach State (aktuell statisch „Fallen")
    const activeTab = _detailTab || 'fallen';

    let html = `
      <div class="trap-detail-v2 fade-up">

        <!-- Kompakter Hero -->
        <div class="trap-detail-v2-hero trap-detail-v2-hero--${theme}">
          <div class="trap-detail-v2-hero-bg"></div>
          <div class="trap-detail-v2-hero-row">
            <span class="trap-detail-v2-cat">${t.category}</span>
            <span class="trap-detail-v2-meta">⏱ ${t.estimatedTime} · 📊 ${t.difficulty}</span>
          </div>
          <h2 class="trap-detail-v2-title">${t.icon || ''} ${t.title}</h2>
          <p class="trap-detail-v2-sub">${t.description}</p>
          <div class="trap-detail-v2-stats">
            <div class="trap-detail-v2-stat">
              <div class="trap-detail-v2-stat-num">${t.traps.length}</div>
              <div class="trap-detail-v2-stat-lbl">Fallen</div>
            </div>
            <div class="trap-detail-v2-stat">
              <div class="trap-detail-v2-stat-num">${t.quiz.length}</div>
              <div class="trap-detail-v2-stat-lbl">MC-Fragen</div>
            </div>
            <div class="trap-detail-v2-stat">
              <div class="trap-detail-v2-stat-num">${t.checklist.length}</div>
              <div class="trap-detail-v2-stat-lbl">Checkpoints</div>
            </div>
          </div>
        </div>

        <!-- Action-Bar (kompakt, sticky-fähig) -->
        <div class="trap-detail-v2-actionbar">
          <button class="trap-btn trap-btn-primary" onclick="TrapLab.startQuiz()">${quizBtnLabel}</button>
          ${coachBtn}
          ${pdfBtn}
        </div>

        <!-- Tab-Navigation -->
        <div class="trap-detail-v2-tabs">
          <button class="trap-detail-v2-tab ${activeTab === 'fallen' ? 'is-active' : ''}" onclick="TrapLab.switchTab('fallen')">🪤 Fallen</button>
          <button class="trap-detail-v2-tab ${activeTab === 'merksaetze' ? 'is-active' : ''}" onclick="TrapLab.switchTab('merksaetze')">💡 Merksätze</button>
          <button class="trap-detail-v2-tab ${activeTab === 'check' ? 'is-active' : ''}" onclick="TrapLab.switchTab('check')">✅ Checkliste</button>
        </div>

        <!-- Tab-Content -->
        <div class="trap-detail-v2-tabcontent">
          ${activeTab === 'fallen' ? _renderTabFallen(t, theme) : ''}
          ${activeTab === 'merksaetze' ? _renderTabMerksaetze(t) : ''}
          ${activeTab === 'check' ? _renderTabCheck(t) : ''}
        </div>

      </div>
    `;

    el.innerHTML = html;
  }

  let _detailTab = 'fallen';
  function switchTab(tab) {
    _detailTab = tab;
    _renderTopicDetail();
  }

  // ── TAB: Fallen — Card-Stack mit Split-Cards ────────────────────────────
  function _renderTabFallen(t, theme) {
    return `
      <div class="trap-cardstack">
        ${t.traps.map((tr, i) => `
          <button class="trap-card-v2 trap-card-v2--${theme}" onclick="TrapLab.openTrap(${i})">
            <div class="trap-card-v2-num">${String(i + 1).padStart(2, '0')}</div>
            <div class="trap-card-v2-title">${tr.title}</div>
            <div class="trap-card-v2-split">
              <div class="trap-card-v2-cell myth">
                <div class="trap-card-v2-lbl">Mythos</div>
                <div class="trap-card-v2-txt">${_shorten(tr.wrongThinking, 90)}</div>
              </div>
              <div class="trap-card-v2-cell truth">
                <div class="trap-card-v2-lbl">Realität</div>
                <div class="trap-card-v2-txt">${_shorten(tr.correctThinking, 90)}</div>
              </div>
            </div>
            <div class="trap-card-v2-merk">
              <span class="trap-card-v2-merk-icon">💡</span>
              <span>${tr.memoryHint}</span>
            </div>
            <div class="trap-card-v2-cta">
              <span>Volle Falle öffnen</span>
              <span class="trap-card-v2-arrow">→</span>
            </div>
          </button>
        `).join('')}
      </div>
    `;
  }

  // ── TAB: Merksätze — Sticky-Notes (Quickview) ──────────────────────────
  function _renderTabMerksaetze(t) {
    return `
      <div class="trap-merklist">
        ${t.traps.map((tr, i) => `
          <button class="trap-merk-sticky" onclick="TrapLab.openTrap(${i})">
            <div class="trap-merk-sticky-head">
              <span class="trap-merk-sticky-num">${String(i + 1).padStart(2, '0')}</span>
              <span class="trap-merk-sticky-title">${tr.title}</span>
            </div>
            <div class="trap-merk-sticky-text">💡 ${tr.memoryHint}</div>
          </button>
        `).join('')}
      </div>
    `;
  }

  // ── TAB: Checkliste ────────────────────────────────────────────────────
  function _renderTabCheck(t) {
    return `
      <div class="trap-checklist trap-checklist-v2">
        ${t.checklist.map((c, i) => `
          <label class="trap-checklist-item-v2">
            <input type="checkbox" class="trap-checklist-cb">
            <span class="trap-checklist-text">${c}</span>
          </label>
        `).join('')}
      </div>
      <div class="trap-cta-bottom">
        <button class="trap-btn trap-btn-primary trap-btn-wide" onclick="TrapLab.startQuiz()">▶ Mini-Quiz starten</button>
      </div>
    `;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FALLEN-MODAL — Wow-Effekt mit Stagger-Reveal
  // ──────────────────────────────────────────────────────────────────────────
  let _currentTrapIdx = null;

  function openTrap(idx) {
    if (!_currentTopic) return;
    if (idx < 0 || idx >= _currentTopic.traps.length) return;
    _currentTrapIdx = idx;
    _renderTrapModal();
  }

  function _renderTrapModal() {
    if (!_currentTopic || _currentTrapIdx === null) return;
    const t = _currentTopic;
    const tr = t.traps[_currentTrapIdx];
    const theme = t.theme || 'mint';
    const total = t.traps.length;
    const idx = _currentTrapIdx;
    const isLast = idx === total - 1;
    const isFirst = idx === 0;

    let overlay = document.getElementById('trap-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'trap-modal-overlay';
      overlay.className = 'trap-modal-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="trap-modal trap-modal--${theme}">
        <button class="trap-modal-close" onclick="TrapLab.closeTrap()" aria-label="Schließen">✕</button>

        <div class="trap-modal-header">
          <div class="trap-modal-bg"></div>
          <div class="trap-modal-progress">
            <span class="trap-modal-progress-current">${String(idx + 1).padStart(2, '0')}</span>
            <span class="trap-modal-progress-total">/${String(total).padStart(2, '0')}</span>
          </div>
          <div class="trap-modal-num" style="--reveal-delay:0ms">${String(idx + 1).padStart(2, '0')}</div>
          <h2 class="trap-modal-title" style="--reveal-delay:120ms">${tr.title}</h2>
          <div class="trap-modal-cat" style="--reveal-delay:200ms">${t.title} · ${t.category}</div>
        </div>

        <div class="trap-modal-body">
          <div class="trap-block trap-block--danger" style="--reveal-delay:340ms">
            <div class="trap-block-head">
              <div class="trap-block-icon">⚠️</div>
              <div class="trap-block-label">Warum diese Falle gefährlich ist</div>
            </div>
            <div class="trap-block-text">${tr.whyDangerous}</div>
          </div>

          <div class="trap-block trap-block--wrong" style="--reveal-delay:520ms">
            <div class="trap-block-head">
              <div class="trap-block-icon">✗</div>
              <div class="trap-block-label">Typischer Denkfehler</div>
            </div>
            <div class="trap-block-text trap-block-text--quote">${tr.wrongThinking}</div>
          </div>

          <div class="trap-block trap-block--correct" style="--reveal-delay:700ms">
            <div class="trap-block-head">
              <div class="trap-block-icon">✓</div>
              <div class="trap-block-label">So denkst du richtig</div>
            </div>
            <div class="trap-block-text">${tr.correctThinking}</div>
          </div>

          <div class="trap-block trap-block--hint" style="--reveal-delay:880ms">
            <div class="trap-block-head">
              <div class="trap-block-icon">💡</div>
              <div class="trap-block-label">Merksatz</div>
            </div>
            <div class="trap-block-text trap-block-text--memory">${tr.memoryHint}</div>
            <div class="trap-block-sparkle"></div>
          </div>
        </div>

        <div class="trap-modal-footer" style="--reveal-delay:1060ms">
          <button class="trap-modal-nav trap-modal-nav--prev" onclick="TrapLab.prevTrap()" ${isFirst ? 'disabled' : ''}>
            <span>←</span> Vorherige
          </button>
          <div class="trap-modal-dots">
            ${t.traps.map((_, i) => `<span class="trap-modal-dot ${i === idx ? 'is-active' : ''}"></span>`).join('')}
          </div>
          ${isLast
            ? `<button class="trap-modal-nav trap-modal-nav--done" onclick="TrapLab.closeTrap()">Verstanden ✓</button>`
            : `<button class="trap-modal-nav trap-modal-nav--next" onclick="TrapLab.nextTrap()">Nächste <span>→</span></button>`
          }
        </div>
      </div>
    `;

    // Trigger animation
    overlay.classList.remove('is-leaving');
    overlay.classList.add('is-active');
    document.body.style.overflow = 'hidden';

    // Close on backdrop click
    overlay.onclick = (e) => {
      if (e.target === overlay) closeTrap();
    };

    // ESC schließt
    if (!_escHandler) {
      _escHandler = (e) => {
        if (e.key === 'Escape') closeTrap();
        else if (e.key === 'ArrowRight' && !isLast) nextTrap();
        else if (e.key === 'ArrowLeft' && !isFirst) prevTrap();
      };
      document.addEventListener('keydown', _escHandler);
    }
  }
  let _escHandler = null;

  function nextTrap() {
    if (_currentTrapIdx === null || !_currentTopic) return;
    if (_currentTrapIdx < _currentTopic.traps.length - 1) {
      _currentTrapIdx++;
      _renderTrapModal();
    }
  }

  function prevTrap() {
    if (_currentTrapIdx === null) return;
    if (_currentTrapIdx > 0) {
      _currentTrapIdx--;
      _renderTrapModal();
    }
  }

  function closeTrap() {
    const overlay = document.getElementById('trap-modal-overlay');
    if (!overlay) return;
    overlay.classList.add('is-leaving');
    overlay.classList.remove('is-active');
    document.body.style.overflow = '';
    _currentTrapIdx = null;
    if (_escHandler) {
      document.removeEventListener('keydown', _escHandler);
      _escHandler = null;
    }
    setTimeout(() => {
      if (overlay && overlay.classList.contains('is-leaving')) overlay.innerHTML = '';
    }, 350);
  }

  // Gate-Helper: prüft Tier und öffnet Upgrade-Modal, sonst Aktion ausführen.
  function _gateOrRun(action) {
    if (!_isPaid()) {
      _showUpgradeModal();
      return;
    }
    if (action === 'coach') return askCoach();
    if (action === 'pdf') return generatePDF();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // QUIZ LOGIC
  // ──────────────────────────────────────────────────────────────────────────
  function startQuiz() {
    if (!_currentTopic) return;
    const paid = _isPaid();
    if (!paid) {
      if (_quizRemaining() <= 0) {
        _showUpgradeModal();
        return;
      }
      _consumeQuizStart();
    }
    _quizState = { idx: 0, answers: [], score: 0, total: _currentTopic.quiz.length };
    _renderQuiz();
  }

  function _renderQuiz() {
    const el = document.getElementById('trap-detail-content');
    if (!el || !_currentTopic || !_quizState) return;
    const q = _currentTopic.quiz[_quizState.idx];
    const total = _quizState.total || _currentTopic.quiz.length;
    const idx = _quizState.idx;

    el.innerHTML = `
      <div class="trap-quiz-wrap fade-up">
        <div class="trap-quiz-head">
          <button class="trap-quiz-back" onclick="TrapLab.cancelQuiz()">← Zurück zur Übersicht</button>
          <div class="trap-quiz-progress">
            <div class="trap-quiz-progress-text">Frage ${idx + 1} / ${total}</div>
            <div class="trap-quiz-progress-bar"><div class="trap-quiz-progress-fill" style="width:${((idx) / total) * 100}%"></div></div>
          </div>
        </div>

        <div class="trap-quiz-card">
          <div class="trap-quiz-topic">${_currentTopic.title} · Prüfungsfalle</div>
          <h2 class="trap-quiz-question">${q.question}</h2>
          <div class="trap-quiz-answers" id="trap-quiz-answers">
            ${q.answers.map((ans, i) => {
              const letter = String.fromCharCode(65 + i);
              return `<button class="trap-quiz-answer" data-letter="${letter}" onclick="TrapLab.submitAnswer('${letter}')">${ans}</button>`;
            }).join('')}
          </div>
          <div id="trap-quiz-feedback" class="trap-quiz-feedback"></div>
          <div id="trap-quiz-next-wrap" class="trap-quiz-next-wrap"></div>
        </div>
      </div>
    `;
  }

  function submitAnswer(letter) {
    if (!_quizState || !_currentTopic) return;
    if (_quizState.answers[_quizState.idx]) return; // schon beantwortet

    const q = _currentTopic.quiz[_quizState.idx];
    const isCorrect = q.correctAnswer === letter;
    _quizState.answers[_quizState.idx] = { picked: letter, correct: isCorrect };
    if (isCorrect) _quizState.score++;

    // Markierung
    document.querySelectorAll('.trap-quiz-answer').forEach(btn => {
      const l = btn.dataset.letter;
      btn.disabled = true;
      if (l === q.correctAnswer) btn.classList.add('is-correct');
      else if (l === letter) btn.classList.add('is-wrong');
      else btn.classList.add('is-dim');
    });

    // Feedback
    const fb = document.getElementById('trap-quiz-feedback');
    if (fb) {
      fb.innerHTML = `
        <div class="trap-quiz-fb ${isCorrect ? 'ok' : 'bad'}">
          <div class="trap-quiz-fb-head">${isCorrect ? '✅ Richtig!' : '❌ Falsch.'} <span>Richtige Antwort: <b>${q.correctAnswer}</b></span></div>
          <div class="trap-quiz-fb-block">
            <div class="trap-quiz-fb-label">Erklärung</div>
            <div>${q.explanation}</div>
          </div>
          <div class="trap-quiz-fb-block trap-quiz-fb-trap">
            <div class="trap-quiz-fb-label">🪤 Typische Falle</div>
            <div>${q.trapExplanation}</div>
          </div>
        </div>
      `;
    }

    const nextWrap = document.getElementById('trap-quiz-next-wrap');
    if (nextWrap) {
      const isLast = _quizState.idx === _currentTopic.quiz.length - 1;
      nextWrap.innerHTML = `
        <button class="trap-btn trap-btn-primary trap-btn-wide" onclick="TrapLab.nextQuestion()">${isLast ? 'Auswertung ansehen →' : 'Nächste Frage →'}</button>
      `;
    }
  }

  function nextQuestion() {
    if (!_quizState || !_currentTopic) return;
    const total = _quizState.total || _currentTopic.quiz.length;
    if (_quizState.idx < total - 1) {
      _quizState.idx++;
      _renderQuiz();
    } else {
      _renderQuizResult();
    }
  }

  function _renderQuizResult() {
    const el = document.getElementById('trap-detail-content');
    if (!el || !_currentTopic || !_quizState) return;

    const paid = _isPaid();
    const score = _quizState.score;
    const total = _quizState.total || _currentTopic.quiz.length;
    const pct = Math.round((score / total) * 100);
    let mood = 'Stark!';
    if (pct < 60) mood = 'Da steckt noch Potenzial.';
    else if (pct < 80) mood = 'Solide – jetzt die letzten Fallen knacken.';

    el.innerHTML = `
      <div class="trap-result-wrap fade-up">
        <div class="trap-result-hero">
          <div class="trap-result-emoji">${pct >= 80 ? '🎉' : pct >= 60 ? '💪' : '📚'}</div>
          <div class="trap-result-score">${score} / ${total}</div>
          <div class="trap-result-pct">${pct} % richtig</div>
          <div class="trap-result-mood">${mood}</div>
        </div>

        <div class="trap-section-title"><span class="trap-section-num">📝</span>Deine Antworten im Überblick</div>
        <div class="trap-result-list">
          ${_currentTopic.quiz.slice(0, total).map((q, i) => {
            const a = _quizState.answers[i] || { picked: '–', correct: false };
            return `
              <div class="trap-result-item ${a.correct ? 'ok' : 'bad'}">
                <div class="trap-result-q"><b>${i + 1}.</b> ${q.question}</div>
                <div class="trap-result-meta">Deine Antwort: <b>${a.picked}</b> · Richtig: <b>${q.correctAnswer}</b></div>
                <div class="trap-result-expl">${q.trapExplanation}</div>
              </div>
            `;
          }).join('')}
        </div>

        ${!paid ? `
          <div class="trap-quiz-counter" style="margin-top:1rem">
            <div class="trap-quiz-counter-icon">${_quizRemaining() <= 0 ? '🔒' : '🎯'}</div>
            <div class="trap-quiz-counter-info">
              <div class="trap-quiz-counter-title">${_quizRemaining() <= 0
                ? 'Free-Quiz aufgebraucht'
                : `Noch <b>${_quizRemaining()} von ${FREE_QUIZ_STARTS}</b> Free-Quiz übrig`}</div>
              <div class="trap-quiz-counter-desc">Mit Vollzugang trainierst du unbegrenzt &amp; nutzt Coach + PDF.</div>
            </div>
            <button class="trap-quiz-counter-btn" onclick="App.showScreen('screen-konto');App.renderKonto();">Upgrade</button>
          </div>
        ` : ''}

        <div class="trap-result-actions">
          <button class="trap-btn trap-btn-primary" onclick="TrapLab.startQuiz()">↻ Quiz wiederholen</button>
          ${paid
            ? `<button class="trap-btn trap-btn-ghost" onclick="TrapLab.askCoach()">🎓 Coach fragen</button>
               <button class="trap-btn trap-btn-ghost" onclick="TrapLab.generatePDF()">📄 PDF erstellen</button>`
            : `<button class="trap-btn trap-btn-ghost" onclick="TrapLab._gateOrRun('coach')">🔒 Coach</button>
               <button class="trap-btn trap-btn-ghost" onclick="TrapLab._gateOrRun('pdf')">🔒 PDF</button>`
          }
          <button class="trap-btn trap-btn-ghost" onclick="TrapLab._renderTopicDetailReset()">← Zur Themenübersicht</button>
        </div>
      </div>
    `;
  }

  function _renderTopicDetailReset() {
    _quizState = null;
    _renderTopicDetail();
  }

  function cancelQuiz() {
    _quizState = null;
    _renderTopicDetail();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // KI-COACH — nutzt bestehendes Tutor-System mit Prüfungsfallen-Modus
  // ──────────────────────────────────────────────────────────────────────────
  function askCoach() {
    if (!_currentTopic) return;
    if (!_isPaid()) { _showUpgradeModal(); return; }
    if (typeof Tutor === 'undefined') {
      alert('Tutor-System nicht verfügbar.');
      return;
    }

    // Pre-fill the topic with a trap-coach focus so the existing tutors
    // automatically slip into the right mode.
    const topicLine =
      `Prüfungsfallen zu „${_currentTopic.title}" (${_currentTopic.category}). ` +
      `Bitte erkläre mir typische MC-Denkfehler, Verwechslungen und Ablenkantworten – ` +
      `nicht den gesamten Stoff. Schwerpunkt: ${_currentTopic.traps.map(t => t.title).join('; ')}.`;

    if (typeof Tutor.openTrapCoach === 'function') {
      Tutor.openTrapCoach(_currentTopic, topicLine);
    } else {
      // Fallback: regulärer Free-Mode mit pre-fill
      Tutor.openFreeMode(topicLine);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PDF-EXPORT — nutzt jsPDF (bereits via CDN geladen)
  // ──────────────────────────────────────────────────────────────────────────
  async function generatePDF() {
    if (!_currentTopic) return;
    if (!_isPaid()) { _showUpgradeModal(); return; }
    if (!window.jspdf) {
      alert('PDF-Engine wird gerade geladen. Bitte gleich nochmal versuchen.');
      return;
    }

    // DejaVu-Schrift aus dem bestehenden PDFExport laden (Unicode-fähig)
    let useDejaVu = false;
    if (typeof PDFExport !== 'undefined' && PDFExport._loadFonts) {
      try {
        await PDFExport._loadFonts();
        if (PDFExport._fontCache) useDejaVu = true;
      } catch (_) { /* fallback to Helvetica */ }
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const t = _currentTopic;

    // Schrift registrieren
    const FONT = useDejaVu ? 'DejaVuSans' : 'helvetica';
    if (useDejaVu && typeof PDFExport !== 'undefined' && PDFExport._registerFonts) {
      PDFExport._registerFonts(pdf);
    }

    const PAGE_W = 210;
    const PAGE_H = 297;
    const M = 18;            // page margin
    const CW = PAGE_W - 2 * M; // content width = 174mm
    const PAD = 6;           // innerer Box-Padding (links/rechts)
    const TEXT_W = CW - 2 * PAD; // 162mm safe wrap width
    let y = M;

    // Farb-Palette aus dem App-Design
    const C = {
      dark:      [26, 26, 46],
      darkSoft:  [60, 60, 90],
      yellow:    [245, 197, 66],
      yellowDp:  [184, 134, 11],
      yellowBg:  [253, 243, 215],
      coralFg:   [194, 90, 53],
      coralBg:   [253, 232, 224],
      mintFg:    [45, 138, 84],
      mintBg:    [236, 253, 245],
      text:      [40, 40, 60],
      muted:     [120, 120, 130],
      border:    [220, 215, 200],
      paper:     [255, 255, 255],
      bg:        [250, 247, 240],
    };

    const setText = (c) => pdf.setTextColor(c[0], c[1], c[2]);
    const setFill = (c) => pdf.setFillColor(c[0], c[1], c[2]);
    const setDraw = (c) => pdf.setDrawColor(c[0], c[1], c[2]);
    const setFont = (weight) => pdf.setFont(FONT, weight);

    const ensure = (need) => {
      if (y + need > PAGE_H - M - 6) {
        pdf.addPage();
        y = M;
        return true;
      }
      return false;
    };

    const wrap = (text, w, fontSize) => {
      pdf.setFontSize(fontSize);
      return pdf.splitTextToSize(String(text || ''), w);
    };

    // Helper: kürzt einen String wenn er zu breit ist
    const truncate = (text, maxW, fontSize) => {
      pdf.setFontSize(fontSize);
      if (pdf.getTextWidth(text) <= maxW) return text;
      let s = String(text);
      while (s.length > 1 && pdf.getTextWidth(s + '…') > maxW) {
        s = s.slice(0, -1);
      }
      return s + '…';
    };

    // ── COVER / HEADER (auf jeder Seite via _drawPageHeader) ──
    const drawCoverHeader = () => {
      // Dunkler Balken
      setFill(C.dark);
      pdf.rect(0, 0, PAGE_W, 60, 'F');
      // Yellow Glow oben rechts (kleiner, weniger im Weg)
      setFill(C.yellow);
      pdf.setGState(new pdf.GState({ opacity: 0.15 }));
      pdf.circle(PAGE_W - 4, 6, 28, 'F');
      pdf.setGState(new pdf.GState({ opacity: 1 }));

      // Brand-Linie
      setText(C.yellow);
      setFont('bold');
      pdf.setFontSize(9);
      pdf.text('MEDAT TRAINER  ·  PRÜFUNGSFALLEN-LAB', M, 14);

      // Titel — wrappen auf CW (volle Breite minus Margins)
      setText([255, 255, 255]);
      setFont('bold');
      pdf.setFontSize(22);
      const titleLines = wrap(t.title, CW, 22);
      pdf.text(titleLines, M, 26);

      // Sub-Info — auf eine Zeile gekürzt falls zu lang
      setText([200, 200, 220]);
      setFont('normal');
      pdf.setFontSize(10);
      const sub = `${t.category}  ·  ${t.estimatedTime}  ·  ${t.difficulty}`;
      pdf.text(truncate(sub, CW, 10), M, 26 + titleLines.length * 8 + 4);

      // Meta-Pillen — mit Overflow-Check
      const pillY = 26 + titleLines.length * 8 + 10;
      const pills = [
        { txt: `${t.traps.length} Fallen`, bg: C.yellow, fg: C.dark },
        { txt: `${t.quiz.length} MC-Fragen`, bg: [255, 255, 255], fg: C.dark },
        { txt: 'Druckfertig', bg: C.mintFg, fg: [255, 255, 255] },
      ];
      let px = M;
      setFontSize: pdf.setFontSize(8);
      setFont('bold');
      pills.forEach(p => {
        const w = pdf.getTextWidth(p.txt) + 8;
        if (px + w > PAGE_W - M) return; // skip if wouldn't fit
        setFill(p.bg);
        pdf.roundedRect(px, pillY, w, 6, 3, 3, 'F');
        setText(p.fg);
        setFont('bold');
        pdf.setFontSize(8);
        pdf.text(p.txt, px + 4, pillY + 4);
        px += w + 4;
      });
    };

    const drawPageHeader = (title) => {
      setFill(C.dark);
      pdf.rect(0, 0, PAGE_W, 14, 'F');
      // Page-Title rechts zuerst messen — damit Brand-Text NICHT überlappt
      setFont('normal');
      pdf.setFontSize(9);
      const titleW = pdf.getTextWidth(title);
      setText([200, 200, 220]);
      pdf.text(title, PAGE_W - M, 9, { align: 'right' });
      // Brand-Text links — auf verbleibende Breite kürzen
      const brandMaxW = (PAGE_W - 2 * M) - titleW - 8;
      const brand = `PRÜFUNGSFALLEN-LAB  ·  ${t.title}`;
      setText(C.yellow);
      setFont('bold');
      pdf.setFontSize(9);
      pdf.text(truncate(brand, brandMaxW, 9), M, 9);
    };

    drawCoverHeader();
    y = 68;

    // ── INTRO-CARD ──
    setFill(C.yellowBg);
    setDraw(C.yellow);
    pdf.setLineWidth(0.4);
    const introLines = wrap('Diese Übersicht zeigt dir die typischen Denkfehler und MC-Fallen zu diesem Thema – nicht den gesamten Stoff. Lies, was verführerisch falsch klingt, präge dir die korrekte Denkweise ein, und prüfe dich mit dem Mini-Quiz auf der nächsten Seite.', TEXT_W, 10);
    const introH = introLines.length * 4.8 + 14;
    pdf.roundedRect(M, y, CW, introH, 3, 3, 'FD');
    setText(C.yellowDp);
    setFont('bold');
    pdf.setFontSize(9);
    pdf.text('SO NUTZT DU DIESES BLATT', M + PAD, y + 7);
    setText(C.text);
    setFont('normal');
    pdf.text(introLines, M + PAD, y + 12);
    y += introH + 10;

    // ── DIE FALLEN ──
    setFont('bold');
    pdf.setFontSize(14);
    setText(C.dark);
    pdf.text(`Die ${t.traps.length} typischen Prüfungsfallen`, M, y);
    setFill(C.yellow);
    pdf.rect(M, y + 1.5, 30, 1.2, 'F');
    y += 8;

    t.traps.forEach((tr, i) => {
      // Titel: Nummern-Chip nimmt 12mm, rechts 6mm Sicherheit
      const TITLE_X = M + 12;
      const TITLE_W = CW - 12 - PAD;
      const titleLines = wrap(tr.title, TITLE_W, 11);
      const titleBarH = Math.max(9, titleLines.length * 5 + 4);

      // Inhaltsblöcke: Padding links 8 (für Akzent-Streifen + Text), rechts PAD
      const BLOCK_TEXT_X = M + 8;
      const BLOCK_TEXT_W = CW - 8 - PAD; // 160mm

      const wdLines = wrap(tr.whyDangerous, BLOCK_TEXT_W, 10);
      const wtLines = wrap(tr.wrongThinking, BLOCK_TEXT_W, 10);
      const ctLines = wrap(tr.correctThinking, BLOCK_TEXT_W, 10);
      // Merksatz hat Lampen-Icon links → Text bei M+14
      const MERK_TEXT_X = M + 14;
      const MERK_TEXT_W = CW - 14 - PAD;
      const mtLines = wrap(tr.memoryHint, MERK_TEXT_W, 10);

      const LINE_H = 4.8;
      const wdH = wdLines.length * LINE_H + 11;
      const wtH = wtLines.length * LINE_H + 11;
      const ctH = ctLines.length * LINE_H + 11;
      const mtH = Math.max(14, mtLines.length * LINE_H + 11);
      const totalH = titleBarH + 2 + wdH + 2 + wtH + 2 + ctH + 2 + mtH + 8;

      if (y + totalH > PAGE_H - M - 12) {
        pdf.addPage();
        drawPageHeader(`Fallen ${i + 1}–${t.traps.length}`);
        y = 22;
      }

      // Titel-Leiste mit Nummern-Chip
      setFill(C.dark);
      pdf.roundedRect(M, y, CW, titleBarH, 2.5, 2.5, 'F');
      // Nummern-Chip
      setFill(C.yellow);
      pdf.roundedRect(M + 3, y + (titleBarH - 6) / 2, 6, 6, 1.5, 1.5, 'F');
      setText(C.dark);
      setFont('bold');
      pdf.setFontSize(9);
      pdf.text(String(i + 1), M + 6, y + titleBarH / 2 + 1.5, { align: 'center' });
      // Titel
      setText([255, 255, 255]);
      setFont('bold');
      pdf.setFontSize(11);
      pdf.text(titleLines, TITLE_X, y + titleBarH / 2 + (titleLines.length === 1 ? 1.5 : -1));
      y += titleBarH + 2;

      // 1) WARUM GEFÄHRLICH (gelb)
      setFill(C.yellowBg);
      pdf.roundedRect(M, y, CW, wdH, 2.5, 2.5, 'F');
      setFill(C.yellow);
      pdf.rect(M, y, 2, wdH, 'F');
      setText(C.yellowDp);
      setFont('bold');
      pdf.setFontSize(7.5);
      pdf.text('WARUM GEFÄHRLICH', BLOCK_TEXT_X, y + 5);
      setText(C.text);
      setFont('normal');
      pdf.setFontSize(10);
      pdf.text(wdLines, BLOCK_TEXT_X, y + 9.5);
      y += wdH + 2;

      // 2) TYPISCHER DENKFEHLER (coral)
      setFill(C.coralBg);
      pdf.roundedRect(M, y, CW, wtH, 2.5, 2.5, 'F');
      setFill(C.coralFg);
      pdf.rect(M, y, 2, wtH, 'F');
      setText(C.coralFg);
      setFont('bold');
      pdf.setFontSize(7.5);
      pdf.text('TYPISCHER DENKFEHLER', BLOCK_TEXT_X, y + 5);
      setText(C.text);
      setFont('italic');
      pdf.setFontSize(10);
      pdf.text(wtLines, BLOCK_TEXT_X, y + 9.5);
      y += wtH + 2;

      // 3) RICHTIGE DENKWEISE (mint)
      setFill(C.mintBg);
      pdf.roundedRect(M, y, CW, ctH, 2.5, 2.5, 'F');
      setFill(C.mintFg);
      pdf.rect(M, y, 2, ctH, 'F');
      setText(C.mintFg);
      setFont('bold');
      pdf.setFontSize(7.5);
      pdf.text('RICHTIGE DENKWEISE', BLOCK_TEXT_X, y + 5);
      setText(C.text);
      setFont('normal');
      pdf.setFontSize(10);
      pdf.text(ctLines, BLOCK_TEXT_X, y + 9.5);
      y += ctH + 2;

      // 4) MERKSATZ (yellow + Lampen-Icon)
      setFill(C.yellow);
      pdf.roundedRect(M, y, CW, mtH, 2.5, 2.5, 'F');
      // Lampen-Icon
      setFill(C.dark);
      pdf.circle(M + 6, y + 6, 2.8, 'F');
      setText(C.yellow);
      setFont('bold');
      pdf.setFontSize(8);
      pdf.text('!', M + 6, y + 7.4, { align: 'center' });
      // Label + Text
      setText(C.dark);
      setFont('bold');
      pdf.setFontSize(7.5);
      pdf.text('MERKSATZ', MERK_TEXT_X, y + 5);
      setFont('bold');
      pdf.setFontSize(10);
      pdf.text(mtLines, MERK_TEXT_X, y + 9.5);

      y += mtH + 8;
    });

    // ─────────────────────────────────────────────────────────────────────
    // SEITE 2+: MINI-QUIZ
    // ─────────────────────────────────────────────────────────────────────
    pdf.addPage();
    drawPageHeader('Mini-Quiz');
    y = 22;

    setFont('bold');
    pdf.setFontSize(16);
    setText(C.dark);
    pdf.text('Mini-Quiz', M, y);
    setFill(C.yellow);
    pdf.rect(M, y + 1.5, 30, 1.2, 'F');
    setText(C.muted);
    setFont('normal');
    pdf.setFontSize(9);
    const subQ = wrap('Markiere die richtige Antwort. Lösungen + Trap-Erklärungen ab Seite 3.', CW, 9);
    pdf.text(subQ, M, y + 8);
    y += 14;

    t.quiz.forEach((q, i) => {
      // Frage startet bei M+18 (nach Nummern-Chip), Sicherheit PAD am rechten Rand
      const Q_TEXT_X = M + 18;
      const Q_TEXT_W = CW - 18 - PAD; // 150mm
      const A_TEXT_X = M + 14;
      const A_TEXT_W = CW - 14 - PAD; // 154mm

      const qLines = wrap(q.question, Q_TEXT_W, 11);
      const ansLines = q.answers.map(a => wrap(a, A_TEXT_W, 10));
      const Q_LINE_H = 5.2;
      const A_LINE_H = 4.8;
      const ansTotal = ansLines.reduce((sum, l) => sum + l.length * A_LINE_H + 3, 0);
      const cardH = 7 + qLines.length * Q_LINE_H + 4 + ansTotal + 4;

      if (y + cardH + 4 > PAGE_H - M - 12) {
        pdf.addPage();
        drawPageHeader('Mini-Quiz (Fortsetzung)');
        y = 22;
      }

      // Frage-Card
      setFill(C.paper);
      setDraw(C.border);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(M, y, CW, cardH, 3, 3, 'FD');

      // Nummern-Chip
      setFill(C.dark);
      pdf.roundedRect(M + 5, y + 5, 8, 8, 2, 2, 'F');
      setText(C.yellow);
      setFont('bold');
      pdf.setFontSize(10);
      pdf.text(String(i + 1), M + 9, y + 10.5, { align: 'center' });

      // Frage
      setText(C.dark);
      setFont('bold');
      pdf.setFontSize(11);
      pdf.text(qLines, Q_TEXT_X, y + 9);
      let qY = y + 9 + qLines.length * Q_LINE_H + 4;

      // Antworten mit Bullets
      ansLines.forEach((al) => {
        setDraw(C.border);
        pdf.setLineWidth(0.5);
        pdf.circle(M + 9, qY - 1, 1.8, 'D');
        setText(C.text);
        setFont('normal');
        pdf.setFontSize(10);
        pdf.text(al, A_TEXT_X, qY);
        qY += al.length * A_LINE_H + 2;
      });

      y += cardH + 4;
    });

    // ─────────────────────────────────────────────────────────────────────
    // LÖSUNGEN
    // ─────────────────────────────────────────────────────────────────────
    pdf.addPage();
    drawPageHeader('Lösungen & Trap-Erklärungen');
    y = 22;

    setFont('bold');
    pdf.setFontSize(16);
    setText(C.dark);
    pdf.text('Lösungen & Trap-Erklärungen', M, y);
    setFill(C.yellow);
    pdf.rect(M, y + 1.5, 30, 1.2, 'F');
    y += 12;

    t.quiz.forEach((q, i) => {
      const BLOCK_TEXT_X = M + 8;
      const BLOCK_TEXT_W = CW - 8 - PAD;
      const LINE_H = 4.8;

      const expLines = wrap(q.explanation, BLOCK_TEXT_W, 10);
      const trapLines = wrap(q.trapExplanation, BLOCK_TEXT_W, 10);
      const expH = expLines.length * LINE_H + 11;
      const trapH = trapLines.length * LINE_H + 11;
      const totalH = 10 + expH + 2 + trapH + 8;

      if (y + totalH > PAGE_H - M - 12) {
        pdf.addPage();
        drawPageHeader('Lösungen (Fortsetzung)');
        y = 22;
      }

      // Header-Zeile: Nr. + Richtige Antwort
      setFill(C.mintFg);
      pdf.roundedRect(M, y, CW, 8, 2, 2, 'F');
      setText([255, 255, 255]);
      setFont('bold');
      pdf.setFontSize(10);
      const solHead = truncate(`Frage ${i + 1}   ·   Richtige Antwort: ${q.correctAnswer}`, CW - 8, 10);
      pdf.text(solHead, M + 4, y + 5.5);
      y += 10;

      // Erklärung
      setFill(C.mintBg);
      pdf.roundedRect(M, y, CW, expH, 2.5, 2.5, 'F');
      setFill(C.mintFg);
      pdf.rect(M, y, 2, expH, 'F');
      setText(C.mintFg);
      setFont('bold');
      pdf.setFontSize(7.5);
      pdf.text('ERKLÄRUNG', BLOCK_TEXT_X, y + 5);
      setText(C.text);
      setFont('normal');
      pdf.setFontSize(10);
      pdf.text(expLines, BLOCK_TEXT_X, y + 9.5);
      y += expH + 2;

      // Trap-Erklärung
      setFill(C.yellowBg);
      pdf.roundedRect(M, y, CW, trapH, 2.5, 2.5, 'F');
      setFill(C.yellow);
      pdf.rect(M, y, 2, trapH, 'F');
      setText(C.yellowDp);
      setFont('bold');
      pdf.setFontSize(7.5);
      pdf.text('TYPISCHE FALLE', BLOCK_TEXT_X, y + 5);
      setText(C.text);
      setFont('normal');
      pdf.setFontSize(10);
      pdf.text(trapLines, BLOCK_TEXT_X, y + 9.5);
      y += trapH + 8;
    });

    // ─────────────────────────────────────────────────────────────────────
    // COACH-NOTIZEN (falls vorhanden)
    // ─────────────────────────────────────────────────────────────────────
    const coachNotes = getPdfNotes(t.id);
    if (coachNotes.length > 0) {
      pdf.addPage();
      drawPageHeader('Vom Coach');
      y = 22;

      setFont('bold');
      pdf.setFontSize(16);
      setText(C.dark);
      pdf.text('Vom Prüfungsfallen-Coach', M, y);
      // Lavender Akzent-Linie
      setFill([109, 77, 194]);
      pdf.rect(M, y + 1.5, 30, 1.2, 'F');
      setText(C.muted);
      setFont('normal');
      pdf.setFontSize(9);
      const cNoteSub = wrap('Diese Antworten hast du im Coach-Chat als "Ins PDF übernehmen" markiert.', CW, 9);
      pdf.text(cNoteSub, M, y + 8);
      y += 8 + cNoteSub.length * 4.5 + 4;

      coachNotes.forEach((note, i) => {
        const NBOX_TEXT_X = M + 8;
        const NBOX_TEXT_W = CW - 8 - PAD;
        const noteLines = wrap(note.text, NBOX_TEXT_W, 10);
        const nH = noteLines.length * 4.8 + 12;

        if (y + nH > PAGE_H - M - 12) {
          pdf.addPage();
          drawPageHeader('Vom Coach (Fortsetzung)');
          y = 22;
        }

        // Lavender-Box mit linkem Akzent
        setFill([245, 240, 255]); // sehr helles Lavender
        pdf.roundedRect(M, y, CW, nH, 2.5, 2.5, 'F');
        setFill([109, 77, 194]);
        pdf.rect(M, y, 2, nH, 'F');
        setText([109, 77, 194]);
        setFont('bold');
        pdf.setFontSize(7.5);
        pdf.text(`COACH-NOTIZ ${i + 1}`, NBOX_TEXT_X, y + 5);
        setText(C.text);
        setFont('normal');
        pdf.setFontSize(10);
        pdf.text(noteLines, NBOX_TEXT_X, y + 9.5);
        y += nH + 3;
      });
      y += 4;
    }

    // ─────────────────────────────────────────────────────────────────────
    // CHECKLISTE + NOTIZEN
    // ─────────────────────────────────────────────────────────────────────
    if (y > PAGE_H - 90) {
      pdf.addPage();
      drawPageHeader('Checkliste & Notizen');
      y = 22;
    }

    setFont('bold');
    pdf.setFontSize(14);
    setText(C.dark);
    pdf.text('Checkliste vor dem Test', M, y);
    setFill(C.yellow);
    pdf.rect(M, y + 1.5, 30, 1.2, 'F');
    y += 9;

    t.checklist.forEach((c) => {
      const CL_TEXT_X = M + 9;
      const CL_TEXT_W = CW - 9 - PAD;
      const cl = wrap(c, CL_TEXT_W, 10);
      const cH = cl.length * 4.8 + 4;
      ensure(cH + 2);
      setDraw(C.border);
      pdf.setLineWidth(0.45);
      pdf.roundedRect(M + 1, y + 1, 5, 5, 1, 1, 'D');
      setText(C.text);
      setFont('normal');
      pdf.setFontSize(10);
      pdf.text(cl, CL_TEXT_X, y + 4.8);
      y += cH;
    });

    y += 6;
    if (ensure(50)) drawPageHeader('Notizen');
    setFont('bold');
    pdf.setFontSize(14);
    setText(C.dark);
    pdf.text('Deine Notizen', M, y);
    setFill(C.yellow);
    pdf.rect(M, y + 1.5, 30, 1.2, 'F');
    y += 6;
    setDraw([225, 220, 210]);
    pdf.setLineWidth(0.3);
    while (y + 7 < PAGE_H - M - 12) {
      y += 7;
      pdf.line(M, y, M + CW, y);
    }

    // ─────────────────────────────────────────────────────────────────────
    // FOOTER auf jeder Seite
    // ─────────────────────────────────────────────────────────────────────
    const pageCount = pdf.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      pdf.setPage(p);
      setFont('normal');
      pdf.setFontSize(8);
      setText(C.muted);
      const footL = `medat-trainer.app  ·  Prüfungsfallen-Lab`;
      const footR = `Seite ${p} / ${pageCount}`;
      pdf.text(footL, M, PAGE_H - 8);
      pdf.text(footR, PAGE_W - M, PAGE_H - 8, { align: 'right' });
    }

    const slug = (t.id || (t.title || 'thema').replace(/[^a-z0-9]+/gi, '-')).toLowerCase();
    pdf.save(`pruefungsfallen-${slug}.pdf`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INIT
  // ──────────────────────────────────────────────────────────────────────────
  function init() {
    // Wire back-button on detail screen
    document.getElementById('trap-detail-back')?.addEventListener('click', () => back());
  }

  return {
    init,
    open,
    openTopic,
    back,
    startQuiz,
    submitAnswer,
    nextQuestion,
    cancelQuiz,
    askCoach,
    generatePDF,
    openTrap,
    closeTrap,
    nextTrap,
    prevTrap,
    switchTab,
    addPdfNote,
    getPdfNotes,
    clearPdfNotes,
    getCurrentTopicId,
    _renderTopicDetailReset,
    _gateOrRun,
    _showUpgradeModal,
    TOPICS,
  };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => TrapLab.init());
} else {
  TrapLab.init();
}
