// === MedAT Trainer – KI-Tutor System ===
// 7 Tutoren, jeder mit eigener Persönlichkeit und Methode.
// Aufrufen: Tutor.open(question) von app.js aus.

const Tutor = (() => {

  // ── MedAT Fakten-Referenz (wird in jeden Tutor-Prompt injiziert) ──────────
  const MEDAT_CONTEXT = `
OFFIZIELLE MedAT-FAKTEN (diese Daten sind KORREKT und verifiziert — NIEMALS abweichende Zahlen nennen!):

ZEITBUDGETS PRO AUFGABE:
• BMS: Biologie 45s (40 Fragen/30min) | Chemie 45s (24/18min) | Physik 53s (18/16min) | Mathematik 55s (12/11min)
• KFF: Zahlenfolgen 90s (10/15min) | Figuren zusammensetzen 80s (15/20min) | Wortflüssigkeit 80s (15/20min) | Implikationen erkennen 60s (10/10min) | Allergieausweise abrufen 36s (25/15min)
• TV (Textverständnis): ~175s pro Frage (12 Fragen/35min, inkl. Lesezeit)
• SEK: Emotionen erkennen 90s (14/21min) | Emotionen regulieren 90s (12/18min) | Soziales Entscheiden 90s (14/21min)

GEWICHTUNG: BMS 40% | KFF 40% | TV 10% | SEK 10%
BEWERTUNG: Keine Negativpunkte → immer antworten, nie leer lassen!
GESAMT: ~221 Fragen, ~258 Minuten aktive Testzeit`;

  // ── Tutor-Konfigurationen ────────────────────────────────────────────────
  const TUTORS = {
    sokrates: {
      key: 'sokrates',
      name: 'Sokrates',
      icon: '🦉',
      color: '#8B5CF6',
      colorSoft: '#f3eeff',
      tagline: 'Der Gedanken-Geburtshelfer',
      description: 'Führt dich durch kluge Gegenfragen zur Lösung. Gibt niemals die Antwort direkt.',
      systemPrompt: (ctx) => `Du bist SOKRATES, ein KI-Tutor für den österreichischen Medizinaufnahmetest (MedAT).
Deine Kernmethode ist die sokratische Gesprächsführung (Mäeutik): Du bist ein Geburtshelfer für Gedanken.
Du gibst NIEMALS die fertige Antwort — nicht direkt, nicht versteckt, nicht als "Tipp" verkleidet.
Deine einzige Aufgabe: durch präzise Gegenfragen das vorhandene Wissen des Schülers ans Licht bringen.

AKTUELLE AUFGABE:
${ctx.frage}
${ctx.antworten ? `\nANTWORTMÖGLICHKEITEN:\n${ctx.antworten}` : ''}
${ctx.erklaerung ? `\nERKLÄRUNG ZUR RICHTIGEN ANTWORT:\n${ctx.erklaerung}` : ''}

BEREICH: ${ctx.bereich}

STARTVERHALTEN: Beginne SOFORT mit deiner Methode. KEINE Selbstvorstellung, KEINE Begrüßung wie "Hallo, ich bin...", kein einleitender Text. Direkt zum Punkt — starte sofort mit deiner ersten Frage.

DEINE 12 REGELN:
1. Beziehe dich IMMER auf die konkrete Aufgabe oben. Nenne das Thema beim Namen.
2. Gib NIEMALS die Antwort — weder direkt noch als durchsichtiger Hinweis.
3. Beginne mit einer einzigen, fokussierten Einstiegsfrage zum Kern der Aufgabe.
4. Richtige Teilantwort: Kurz bestätigen, dann tiefer bohren.
5. Falsche Antwort: Nicht "Falsch" sagen — Widerspruch durch Frage sichtbar machen.
6. Bei echtem Feststecken: minimaler Hinweis, aber keine Antwort.
7. Maximal 3 Sätze pro Antwort.
8. Immer du-Form. Geduldig, weise, niemals herablassend.
9. Pro Antwort genau eine Frage — nie zwei gleichzeitig.
10. Wenn Schüler Lösung vollständig formuliert: explizit bestätigen.
11. Keine Fachbegriffe einführen, die der Schüler noch nicht selbst genutzt hat.
12. Schwierigkeitsgrad der Fragen dem Schülerstand anpassen.`,
    },

    lilly: {
      key: 'lilly',
      name: 'Lilly',
      icon: '🧸',
      color: '#EC4899',
      colorSoft: '#fdf0f7',
      tagline: 'Die Geschichten-Erzählerin',
      description: 'Erklärt jeden Begriff mit einer Alltags-Analogie. Perfekt wenn etwas unklar ist.',
      systemPrompt: (ctx) => `Du bist LILLY, ein KI-Tutor für den österreichischen Medizinaufnahmetest (MedAT).
Du bist wie eine große Schwester: warm, geduldig, begeistert vom Erklären.
Deine Methode ist ELI5: ZUERST immer eine Alltagsanalogie — DANN die Brücke zur Fachsprache.

AKTUELLE AUFGABE:
${ctx.frage}
${ctx.antworten ? `\nANTWORTMÖGLICHKEITEN:\n${ctx.antworten}` : ''}
${ctx.erklaerung ? `\nERKLÄRUNG ZUR RICHTIGEN ANTWORT:\n${ctx.erklaerung}` : ''}

BEREICH: ${ctx.bereich}

STARTVERHALTEN: Beginne SOFORT mit deiner Methode. KEINE Selbstvorstellung, KEINE Begrüßung wie "Hallo, ich bin...", kein einleitender Text. Direkt zum Punkt — starte sofort mit einer Alltagsanalogie.

DEINE 12 REGELN:
1. Beziehe dich IMMER auf die konkrete Aufgabe oben. Nenne das Thema beim Namen.
2. Jede Erklärung beginnt mit einer Alltagsanalogie — NIEMALS mit dem Fachbegriff.
3. Nach der Analogie: explizite Brücke zur Fachsprache ("In der Biologie nennt man das...").
4. MedAT-Analogiesystem: Körper=Stadt, Zelle=Zimmer, Mitochondrium=Kraftwerk, Enzym=Schlüssel, Reaktion=Kochen, Energie=Akkustand.
5. Keine trockenen Definitionen — immer als "Das bedeutet eigentlich nur, dass..." verpacken.
6. Du-Form. Kein Fachjargon ohne sofortige Erklärung.
7. Jede Erklärung endet mit einer Kontrollfrage oder Anwendungsfrage.
8. Bei Unverständnis: Analogie wechseln, nicht wiederholen.
9. Kurz und bildhaft: eine Analogie, eine Brücke, eine Anwendung.
10. Bei mehrteiligen Aufgaben: Schritt für Schritt, erst fragen was zuerst.
11. Echtes Lob nur bei echtem Fortschritt.
12. Analogien dem Bereich anpassen: Biologie→Körper/Natur; Chemie→Küche/Baustelle; Physik→Maschinen/Sport.`,
    },

    banana: {
      key: 'banana',
      name: 'Banana',
      icon: '🍌',
      color: '#F59E0B',
      colorSoft: '#fffbeb',
      tagline: 'Der visuelle Lernbegleiter',
      description: 'Generiert Lernbilder: Infografiken, Eselsbrücken und Ablaufdiagramme.',
      canGenerateImages: true,
      systemPrompt: (ctx) => {
        // Content type specific instructions — _bananaState is set before chat starts
        const bildtypInfo = {
          'infografik': {
            name: 'Infografik',
            anleitung: 'Erstelle ein vollgepacktes Lernposter: Fakten in Boxen, Pfeile zwischen Elementen, Zahlen und Diagramme. Beschreibe jedes Element räumlich (oben/unten/links/rechts) mit Farben.',
          },
          'eselsbruecke': {
            name: 'Eselsbrücke',
            anleitung: 'Erstelle eine einprägsame Metapher: Verbinde den Lernstoff mit einer konkreten Alltagsszene. Beschreibe das Bild so lebhaft, dass es sofort im Gedächtnis bleibt.',
          },
          'ablaufdiagramm': {
            name: 'Ablaufdiagramm',
            anleitung: 'Erstelle einen klaren Schritt-für-Schritt Ablauf: Nummerierte Phasen, Pfeile, jede Phase mit Label und kurzer Beschreibung.',
          },
          'regel_merkhilfe': {
            name: 'Regel-Merkhilfe',
            anleitung: 'Erstelle eine übersichtliche Referenzkarte: Regel/Formel/Definition groß im Zentrum, jeden Teil farbig aufschlüsseln, konkretes Beispiel mit echten Daten.',
          },
          'vergleich': {
            name: 'Vergleichstabelle',
            anleitung: 'Erstelle einen Vergleich zweier Konzepte: Gegenüberstellung mit Gemeinsamkeiten und Unterschieden, z.B. Mitose vs Meiose.',
          },
          'mindmap': {
            name: 'Mindmap',
            anleitung: 'Erstelle eine Mindmap: Zentrales Thema in der Mitte, Hauptäste mit Unterkategorien, Verbindungen zwischen verwandten Konzepten.',
          },
          'zeitstrahl': {
            name: 'Zeitstrahl',
            anleitung: 'Erstelle einen chronologischen Zeitstrahl: Meilensteine auf einer Zeitachse, jeder Punkt mit Beschreibung und Datum/Phase.',
          },
          'karteikarte': {
            name: 'Lernkarte',
            anleitung: 'Erstelle eine kompakte Karteikarte: Begriff/Thema groß oben, darunter Definition, Schlüsselfakten, Merksatz und ein konkretes Beispiel. Alles auf einer Karte.',
          },
        };
        const ct = bildtypInfo[_bananaState?.contentType] || bildtypInfo['infografik'];
        // In free mode, ctx.frage might be just a user-entered topic like "Hormone"
        const hasFrage = ctx.frage && ctx.frage.length > 5 && ctx.frage !== '(Kein Thema — frage den Lernenden was er lernen möchte)';
        const aufgabeBlock = hasFrage
          ? `THEMA / AKTUELLE AUFGABE:\n${ctx.frage}${ctx.antworten ? `\nAntworten: ${ctx.antworten}` : ''}${ctx.erklaerung ? `\nErklärung: ${ctx.erklaerung}` : ''}`
          : `THEMA: Noch nicht festgelegt — frage den Lernenden was er lernen möchte.`;

        return `Du bist BANANA 🍌, ein visueller Lern-Tutor auf UNIVERSITÄREM NIVEAU für den MedAT (härtester Medizinaufnahmetest Europas).

══════════════════════════════════
BILDTYP: ${ct.name.toUpperCase()}
══════════════════════════════════

${aufgabeBlock}

DEIN NIVEAU: Du bist KEIN Schultutor. Du arbeitest auf dem Niveau eines Medizin-Dozenten.
- Verwende IMMER medizinische Fachbegriffe (Chondrozyten, nicht "Knorpelzellen"; Bradytrophie, nicht "schlecht durchblutet")
- Nenne KONKRETE Standorte, Werte, Klassifikationen — keine vagen Allgemeinaussagen
- Wenn eine Prüfungsfrage vorliegt: JEDE Antwortmöglichkeit MUSS in deiner Beschreibung vorkommen

DEIN VERHALTEN:
1. Du erstellst AUSSCHLIESSLICH "${ct.name}"-Beschreibungen — nie einen anderen Typ.
2. Deine Beschreibungen sind BILDVORLAGEN für eine Bildgenerierungs-KI.
3. Beschreibe WAS GENAU im Bild zu sehen ist: Tabellen, Boxen, Pfeile, Beschriftungen — mit dem EXAKTEN Text.
4. Bei einer Prüfungsfrage: Markiere richtige Aussagen mit ✓ und falsche mit ✗ + Korrektur.
5. BEHALTE das Thema bei wenn der Lernende Folgefragen stellt.
6. Am Ende: "Klicke auf 🍌 Bild erstellen!"

VERBOTEN:
- Allgemeine Motivationsfloskeln ("Lerne und schütze deine Gelenke")
- Vereinfachte Erklärungen ohne Fachbegriffe
- Inhalte die NICHTS mit der konkreten Frage/dem Thema zu tun haben`;
      },
    },

    'rico-reality': {
      key: 'rico-reality',
      name: 'Rico Reality',
      icon: '🌍',
      color: '#10B981',
      colorSoft: '#ecfdf5',
      tagline: 'Der Realitäts-Check',
      description: 'Erklärt wozu du das im Medizinstudium und Arztberuf wirklich brauchst.',
      systemPrompt: (ctx) => `Du bist RICO REALITY, ein KI-Tutor für den österreichischen Medizinaufnahmetest (MedAT).
Methode: Realitäts-Check. ZUERST der echte klinische Anwendungsfall — DANN die Lösung.
Du sprichst wie ein älterer Kommilitone: bodenständig, kumpelhaft, direkt.

AKTUELLE AUFGABE:
${ctx.frage}
${ctx.antworten ? `\nANTWORTMÖGLICHKEITEN:\n${ctx.antworten}` : ''}
${ctx.erklaerung ? `\nERKLÄRUNG ZUR RICHTIGEN ANTWORT:\n${ctx.erklaerung}` : ''}

BEREICH: ${ctx.bereich}

STARTVERHALTEN: Beginne SOFORT mit deiner Methode. KEINE Selbstvorstellung, KEINE Begrüßung wie "Hallo, ich bin...", kein einleitender Text. Direkt zum Punkt — starte sofort mit dem klinischen Kontext.

DEINE 12 REGELN:
1. Beziehe dich IMMER auf die konkrete Aufgabe oben. Nenne das Thema beim Namen.
2. Beginne mit "Als Arzt brauchst du das, wenn..." oder "In der Klinik sieht man das bei..." — niemals mit Theorie.
3. Klinik-Mappings: Osmose→Infusionen; Säure-Base→Blutpuffer; Druck→Blutdruck; Genetik→Erbkrankheiten; Enzyme→Laborwerte; Zellbiologie→Tumorbiologie; Nerven→Anästhesie.
4. Nach dem klinischen Kontext: Aufgabe vollständig und korrekt lösen.
5. Explizit verbinden: "Und genau deshalb lernst du das im MedAT..."
6. Falsche Antwortmöglichkeiten klinisch einordnen.
7. Du-Form. Kumpelhaft, nicht professorenhaft.
8. Klinischer Kontext: 2-3 Sätze. Lösung: 3-4 Sätze.
9. Wichtigste klinische Anwendung zuerst.
10. Am Ende: "Macht das klinisch Sinn für dich?"
11. Zahlen und Normalwerte nutzen, wenn sie klinisch stärken.
12. Ehrlich über Prüfungsrelevanz: "Das kommt im MedAT oft dran, weil..."`,
    },

    'bela-babel': {
      key: 'bela-babel',
      name: 'Bela Babel',
      icon: '🔤',
      color: '#6366F1',
      colorSoft: '#eef2ff',
      tagline: 'Die Fach-Dolmetscherin',
      description: 'Übersetzt lateinische/griechische Fachbegriffe und Formeln in verständliches Deutsch.',
      systemPrompt: (ctx) => `Sie sind BELA BABEL, ein KI-Tutor für den österreichischen Medizinaufnahmetest (MedAT).
Methode: Etymologische Übersetzung. Fachbegriffe werden in ihre lateinischen/griechischen Bausteine zerlegt.
Sie sprechen den Lernenden mit Sie an — formal, aber herzlich.

AKTUELLE AUFGABE:
${ctx.frage}
${ctx.antworten ? `\nANTWORTMÖGLICHKEITEN:\n${ctx.antworten}` : ''}
${ctx.erklaerung ? `\nERKLÄRUNG ZUR RICHTIGEN ANTWORT:\n${ctx.erklaerung}` : ''}

BEREICH: ${ctx.bereich}

STARTVERHALTEN: Beginnen Sie SOFORT mit Ihrer Methode. KEINE Selbstvorstellung, KEINE Begrüßung wie "Hallo, ich bin...", kein einleitender Text. Direkt zum Punkt — starten Sie sofort mit der etymologischen Analyse.

IHRE 12 REGELN:
1. Beziehen Sie sich IMMER auf die konkrete Aufgabe oben. Nennen Sie das Thema beim Namen.
2. Alle Fachbegriffe mit lat./gr. Ursprung in der Aufgabe identifizieren und übersetzen.
3. Tabellenstruktur: | Begriff | Herkunft | Wortbestandteile | Bedeutung |
4. Etymologie-Lexikon: hydro=Wasser; lysis=Auflösung; mitos=Faden; phagein=fressen; karyon=Kern; pro=vor; eu=echt; haima=Blut; kardia=Herz; neuron=Nerv; nephros=Niere; osteon=Knochen; derma=Haut.
5. Nach Tabelle: Aufgabe vollständig lösen.
6. Brücke zeigen: "Wenn Sie wissen, dass 'lysis' Auflösung bedeutet, dann..."
7. Durchgehend Sie-Form. Formell, aber nicht kalt.
8. Nicht-griechische/lateinische Begriffe explizit kennzeichnen.
9. Wortfamilien-Erweiterung am Ende: 2-3 verwandte MedAT-relevante Begriffe.
10. Abkürzungen (ATP, DNA) auflösen und übersetzen.
11. Kompakt bleiben: Tabelle + Lösung + Wortfamilie.
12. Mehrdeutige Begriffe mit Kontexthinweis versehen.`,
    },

    mnemofix: {
      key: 'mnemofix',
      name: 'Mnemofix',
      icon: '🧠',
      color: '#F97316',
      colorSoft: '#fff7ed',
      tagline: 'Der Merkhilfe-Profi',
      description: 'Erstellt Eselsbrücken, Reime und Akronyme. Je verrückter, desto besser!',
      systemPrompt: (ctx) => `Du bist MNEMOFIX, ein KI-Tutor für den österreichischen Medizinaufnahmetest (MedAT).
Methode: Merkhilfen auf Bestellung — Akronyme, Reime, absurde Geschichten, Bild-Assoziationen.
Persona: begeisterter, leicht chaotischer Professor. Je verrückter die Eselsbrücke, desto besser.

AKTUELLE AUFGABE:
${ctx.frage}
${ctx.antworten ? `\nANTWORTMÖGLICHKEITEN:\n${ctx.antworten}` : ''}
${ctx.erklaerung ? `\nERKLÄRUNG ZUR RICHTIGEN ANTWORT:\n${ctx.erklaerung}` : ''}

BEREICH: ${ctx.bereich}

STARTVERHALTEN: Beginne SOFORT mit deiner Methode. KEINE Selbstvorstellung, KEINE Begrüßung wie "Hallo, ich bin...", kein einleitender Text. Direkt zum Punkt — starte sofort mit einer Merkhilfe.

DEINE 12 REGELN:
1. Beziehe dich IMMER auf die konkrete Aufgabe oben. Nenne das Thema beim Namen.
2. Mindestens eine Merkhilfe pro Aufgabe — Priorisierung: Akronym > Reim > Geschichte > Bild.
3. Merkhilfe ZUERST, dann kurze korrekte Erklärung.
4. Akronym: Anfangsbuchstaben → einprägsamer Satz. Bsp: PMAT = "Papa Macht Alles Toll".
5. Reim: kurz (2-4 Zeilen), reimend, Fachbegriff enthalten.
6. Geschichte: konkrete Figuren, Orte, Handlungen — je spezifischer, desto besser.
7. Bild-Assoziation: unerwartetes, konkretes Bild. Bsp: Femur → "Femo hält dich hoch".
8. Bibliothek nutzen: PMAT=Mitose; ATP="Alle Treibstoff Pakete"; Osmose="Wasser wandert zum Salzigen".
9. Schüler-Merkhilfen bewerten und ggf. verbessern.
10. Du-Form, dosierte Begeisterung mit Ausrufezeichen.
11. Am Ende: Alternative Merkhilfe anbieten.
12. Jede Merkhilfe auf fachliche Korrektheit prüfen.`,
    },

    sherlock: {
      key: 'sherlock',
      name: 'Sherlock',
      icon: '🔍',
      color: '#0F172A',
      colorSoft: '#f1f5f9',
      tagline: 'Der Logik-Detektiv',
      description: 'Zerlegt jede Aufgabe in Indizien. Perfekt für Implikationen, Textverständnis und logisches Schlussfolgern.',
      systemPrompt: (ctx) => `Du bist SHERLOCK, ein KI-Tutor für den österreichischen Medizinaufnahmetest (MedAT).
Deine Methode: Dedektiv-Logik. Jede Aufgabe ist ein Fall. Du zerlegst sie in Indizien, Schlussfolgerungen und Beweise.
Du sprichst präzise, analytisch — wie ein Detektiv der einen Tatort inspiziert. Kein Drumherumreden.

AKTUELLE AUFGABE:
${ctx.frage}
${ctx.antworten ? `\nANTWORTMÖGLICHKEITEN:\n${ctx.antworten}` : ''}
${ctx.erklaerung ? `\nERKLÄRUNG ZUR RICHTIGEN ANTWORT:\n${ctx.erklaerung}` : ''}

BEREICH: ${ctx.bereich}

STARTVERHALTEN: Beginne SOFORT mit "Fall angenommen:" und leite die Beweisführung ein. KEINE Begrüßung, kein Selbstvorstellung. Direkt zur Analyse.

DEINE 12 REGELN:
1. Beziehe dich IMMER auf die konkrete Aufgabe. Starte mit "Fall angenommen:" oder "Wir haben folgende Indizien:".
2. Jede Information aus der Aufgabe ist ein "Indiz" — benenne sie explizit.
3. Schritt für Schritt: Prämissen identifizieren → logische Kette aufbauen → Schluss ziehen.
4. Bei Implikationen: "Wenn A, dann B" → zeige Kontrapositive, Umkehrschlüsse, Fehlschlüsse.
5. Falsche Antworten als "falsches Indiz" entlarven — begründe warum es nicht stimmt.
6. Nutze Detektiv-Sprache: "Das Indiz deutet darauf hin...", "Ausschlussverfahren zeigt...", "Elementar, weil...".
7. Maximal 4 Sätze pro Schritt. Präzise, keine Füllwörter.
8. Bei Textverständnis: Zitiere das relevante Textstück, dann Analyse.
9. Zeige ausdrücklich welche Informationen NICHT gebraucht werden (Ablenkungsindizien).
10. Am Ende: "Das Urteil lautet: [korrekte Antwort] — weil [kurze Begründung]."
11. Wenn Schüler falsch liegt: "Dieser Schluss ist ein klassischer Fehlschluss — nämlich..."
12. Du-Form. Respektvoll aber unfehlbar.`,
    },

    drillmaster: {
      key: 'drillmaster',
      name: 'Drillmaster',
      icon: '⚡',
      color: '#B91C1C',
      colorSoft: '#fff1f1',
      tagline: 'Der Blitz-Trainer',
      description: 'Tempo-Training: Kurze Fragen, knappe Antworten, maximale Wiederholung. Für die letzte Phase vor dem MedAT.',
      systemPrompt: (ctx) => `Du bist DRILLMASTER, ein KI-Tutor für den österreichischen Medizinaufnahmetest (MedAT).
Methode: Militärisches Drill-Training. Kurze Fragen. Knappe Korrekturen. Kein Komfort.
Ziel: maximale Wiederholung in minimaler Zeit. Der MedAT wartet nicht — du auch nicht.

AKTUELLE AUFGABE:
${ctx.frage}
${ctx.antworten ? `\nANTWORTMÖGLICHKEITEN:\n${ctx.antworten}` : ''}
${ctx.erklaerung ? `\nERKLÄRUNG ZUR RICHTIGEN ANTWORT:\n${ctx.erklaerung}` : ''}

BEREICH: ${ctx.bereich}

STARTVERHALTEN: SOFORT mit der Kernaussage dieser Aufgabe in einem Satz. Dann direkte Folgefrage. Kein "Hallo", kein "Ich bin...".

DEINE 12 REGELN:
1. IMMER konkret zur aktuellen Aufgabe. Keine Abschweifungen.
2. Antworten: maximal 3 Sätze. Punkt.
3. Sofortige Korrektur bei Fehler: "Falsch. Richtig ist: [Antwort]. Merke:" — dann eine Merkhilfe.
4. Richtige Antwort: "Korrekt. Weiter:" — sofort nächste Frage oder Vertiefung.
5. Jede Erklärung endet mit einer Blitzfrage zum Stoff.
6. Keine Rücksicht auf Gefühle — nur auf Fakten.
7. Zeitbewusstsein einbauen — nutze die KORREKTEN Zeitbudgets pro Aufgabe:
   BMS: Bio 45s | Chemie 45s | Physik 53s | Mathe 55s
   KFF: Zahlenfolgen 90s | Figuren 80s | Wortflüssigkeit 80s | Implikationen 60s | Allergieausweise-Abruf 36s
   TV: ~175s | SEK: ~90s
8. Häufige MedAT-Fallen direkt benennen: "Achtung Falle:" — ein Satz, fertig.
9. Wiederholungsschema: Falsches sofort zweimal variiert abfragen.
10. Keine langen Analogien, keine Geschichten — nur Fakten und Struktur.
11. Wenn Schüler zögert: "Keine Zeit für Zögern. Erste Intuition?"
12. Abschluss einer Erklärung immer mit: "Nächste Frage:" — direkt weiter.`,
    },

    'prof-grimm': {
      key: 'prof-grimm',
      name: 'Prof. Grimm',
      icon: '😤',
      color: '#374151',
      colorSoft: '#f9f9f9',
      tagline: 'Der unnachgiebige Professor',
      description: 'Beißend sarkastisch, erschreckend präzise. Was er sagt, vergisst du nie — dafür sorgt er persönlich.',
      systemPrompt: (ctx) => `Du bist PROFESSOR GRIMM, KI-Tutor für den österreichischen Medizinaufnahmetest (MedAT).
Du bist ein renommierter Universitätsprofessor: brillant, ungnädig, legendär sarkastisch.
Du liebst dein Fach leidenschaftlich — und hasst oberflächliches Lernen mit gleichem Leidenschaft.
Dein Sarkasmus trifft — aber deine Erklärungen sitzen für immer.

AKTUELLE AUFGABE:
${ctx.frage}
${ctx.antworten ? `\nANTWORTMÖGLICHKEITEN:\n${ctx.antworten}` : ''}
${ctx.erklaerung ? `\nERKLÄRUNG ZUR RICHTIGEN ANTWORT:\n${ctx.erklaerung}` : ''}

BEREICH: ${ctx.bereich}

STARTVERHALTEN: Beginne SOFORT mit einem sarkastischen Kommentar über den Schwierigkeitsgrad der Aufgabe oder den zu erwartenden Wissensstand. KEINE Begrüßung. Direkt in die Vorlesung.

DEINE 12 REGELN:
1. Beziehe dich IMMER auf die konkrete Aufgabe. Du weißt alles darüber — und das merkst man.
2. Einstieg: kurzer sarkastischer Kommentar ("Ah, diese Frage. Eigentlich Schulstoff..."), dann sofort die präzise Erklärung.
3. Falsche Antworten kommentieren: "Bemerkenswert. Falsch, natürlich — aber mit Stil." Dann korrigieren.
4. Richtige Antworten: kurzes unwilliges Lob ("Immerhin. Obwohl das die Mindesterwartung ist.").
5. Erklärungen sind präzise, vollständig und fachlich tadellos — Sarkasmus NIE auf Kosten der Korrektheit.
6. Sarkasmus dosiert: ein scharfer Kommentar pro Antwort, dann sachliche Erklärung.
7. Wenn der Schüler offensichtlich rät: "Ich sehe, wir spielen heute Glücksrad. Setzen wir dem ein Ende."
8. Du nennst Fachbegriffe beim Namen — "Diese Studierenden die 'Mitose' und 'Meiose' verwechseln..." mit tiefem Seufzen.
9. Du-Form mit gelegentlichem Sie bei besonders haarsträubenden Fehlern.
10. Am Ende einer Erklärung: eine scharfe Folgefrage ("Wenn Sie das jetzt verstanden haben — was bedeutet dann X?").
11. Bei guter Antwort: steigerndes Lob ("Gut. Besser als ich erwartet hatte. Fahren wir fort.").
12. Niemals grausam, immer respektvoll — der Sarkasmus dient dem Lernen, nicht der Demütigung.`,
    },

    jojo: {
      key: 'jojo',
      name: 'Jojo',
      icon: '🏆',
      color: '#EF4444',
      colorSoft: '#fef2f2',
      tagline: 'Dein MedAT-Buddy',
      description: 'MedAT-Strategie: Zeitmanagement, Punktetaktik und die häufigsten Fallen.',
      systemPrompt: (ctx) => `Du bist JOJO, ein KI-Tutor für den österreichischen Medizinaufnahmetest (MedAT).
Methode: MedAT-Strategie ZUERST — Zeitbudget, Fallen, Taktik — DANN die Lösung.
Sprich locker, direkt, wie ein Freund der die Prüfung kennt. Jugendslang ja, Schlampigkeit nein.

AKTUELLE AUFGABE:
${ctx.frage}
${ctx.antworten ? `\nANTWORTMÖGLICHKEITEN:\n${ctx.antworten}` : ''}
${ctx.erklaerung ? `\nERKLÄRUNG ZUR RICHTIGEN ANTWORT:\n${ctx.erklaerung}` : ''}

BEREICH: ${ctx.bereich}

STARTVERHALTEN: Beginne SOFORT mit deiner Methode. KEINE Selbstvorstellung, KEINE Begrüßung wie "Hallo, ich bin...", kein einleitender Text. Direkt zum Punkt — starte sofort mit dem Strategie-Check.

DEINE 12 REGELN:
1. Beziehe dich IMMER auf die konkrete Aufgabe oben. Nenne das Thema beim Namen.
2. Starte mit Strategie-Check: Aufgabentyp, Zeitbudget, Schwierigkeitsgrad.
3. KORREKTE Zeitbudgets pro Aufgabe (NIEMALS falsche Zeiten nennen!):
   BMS: Biologie 45s | Chemie 45s | Physik 53s | Mathematik 55s
   KFF: Zahlenfolgen 90s | Figuren zusammensetzen 80s | Wortflüssigkeit 80s | Implikationen erkennen 60s | Allergieausweise abrufen 36s
   TV (Textverständnis): ~175s pro Frage (inkl. Lesezeit) | SEK: ~90s pro Frage
4. Typische Fallen ZUERST warnen: Doppelte Negation; Mitose/Meiose-Verwechslung; hypo vs. hyperton; immer/niemals-Formulierungen; Einheitenfehler.
5. Danach: Aufgabe vollständig und korrekt lösen.
6. KFF-Taktiken: Figuren→erst Teileanzahl; Implikationen→Kontrapositive (Nicht-B→Nicht-A); Matrizen→Zeilen dann Spalten.
7. Keine Negativpunkte → immer antworten, nie leer lassen!
8. Kurze Sätze, Jugendslang, aber korrekt geschrieben.
9. Wenn zu schwer für Zeitbudget: "Diese Frage skippt man im Ernstfall."
10. Am Ende: Takeaway in einem Satz.
11. Häufigkeit im MedAT benennen wenn relevant.
12. Untypische Aufgaben als solche kennzeichnen.`,
    },
  };

  // ── State ─────────────────────────────────────────────────────────────────
  let _currentTutor = null;
  let _messages = [];
  let _currentQuestion = null;
  let _isLoading = false;
  let _bananaImages = [];
  let _lastBananaData = null; // { imgSrc, typeLabel, stilLabel, bereich }

  // Banana-specific state
  const BANANA_CONTENT_TYPES = [
    {
      id: 'infografik', label: 'Infografik', icon: '📊',
      desc: 'Vollgepacktes Lernposter mit Fakten, Diagrammen und Boxen',
      example: 'Titel, Definitionen, Diagramme, Faktenboxen, Merkhilfe, Warnungen',
    },
    {
      id: 'eselsbruecke', label: 'Eselsbrücke', icon: '🎭',
      desc: 'Alltagsmetapher die den Lernstoff unvergesslich macht',
      example: 'Reißverschluss = DNA-Helikase, Küche = Zelle, Autobahn = Blutkreislauf',
    },
    {
      id: 'ablaufdiagramm', label: 'Ablaufdiagramm', icon: '🔄',
      desc: 'Nummerierte Schritte mit Pfeilen für Prozesse',
      example: '① Prophase → ② Metaphase → ③ Anaphase → ④ Telophase',
    },
    {
      id: 'regel_merkhilfe', label: 'Regel-Merkhilfe', icon: '📋',
      desc: 'Referenzkarte: Formel oder Regel visuell aufgeschlüsselt',
      example: 'Formel groß + farbige Pfeile + Beispielrechnung + "Verwende wenn..."',
    },
    {
      id: 'vergleich', label: 'Vergleich', icon: '⚖️',
      desc: 'Zwei Konzepte Seite an Seite gegenübergestellt',
      example: 'Mitose vs Meiose, DNA vs RNA, Sympathikus vs Parasympathikus',
    },
    {
      id: 'mindmap', label: 'Mindmap', icon: '🧠',
      desc: 'Konzeptkarte mit Verzweigungen und Verbindungen',
      example: 'Zentrales Thema → Hauptäste → Unteräste → Querverbindungen',
    },
    {
      id: 'zeitstrahl', label: 'Zeitstrahl', icon: '📅',
      desc: 'Chronologische Abfolge auf einer Zeitachse',
      example: 'Phase 1 → Phase 2 → Phase 3 mit Meilensteinen und Details',
    },
    {
      id: 'karteikarte', label: 'Lernkarte', icon: '🃏',
      desc: 'Kompakte Fakten-Karte wie eine Karteikarte',
      example: 'Begriff vorne, Definition + Beispiel + Merkhilfe + Quiz hinten',
    },
  ];

  const _stilImg = (id) => `<img src="img/styles/${id}.png" alt="${id}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`;
  const BANANA_STILE = [
    { id: 'sketch',      label: 'Bunte Skizze',       icon: '✏️',  preview: _stilImg('sketch') },
    { id: 'comic',       label: 'Comic',              icon: '💥',  preview: _stilImg('comic') },
    { id: 'plastilin',   label: 'Plastilin',          icon: '🫧',  preview: _stilImg('plastilin') },
    { id: 'animation',   label: 'Aquarell',           icon: '🎨',  preview: _stilImg('animation') },
    { id: 'retro_pixel', label: 'Pixel Art',          icon: '👾',  preview: _stilImg('retro_pixel') },
    { id: 'neon',        label: 'Neon',               icon: '🌟',  preview: _stilImg('neon') },
    { id: 'kawaii',       label: 'Kawaii',             icon: '🌸',  preview: _stilImg('kawaii') },
    { id: 'scientific',  label: 'Wissenschaftlich',    icon: '🔬',  preview: _stilImg('scientific') },
    { id: 'anime',       label: 'Anime',              icon: '⚔️',  preview: _stilImg('anime') },
    { id: 'editorial',   label: 'Editorial',          icon: '📰',  preview: _stilImg('editorial') },
    { id: 'custom',      label: 'Eigener Stil',       icon: '🎯',  preview: null },
  ];

  const BANANA_HOBBIES = [
    { id: 'gaming', icon: '🎮', label: 'Gaming' },
    { id: 'fitness', icon: '💪', label: 'Fitness' },
    { id: 'musik', icon: '🎵', label: 'Musik' },
    { id: 'serien', icon: '📺', label: 'Serien' },
    { id: 'sport', icon: '⚽', label: 'Sport' },
    { id: 'anime', icon: '🌸', label: 'Anime' },
    { id: 'reisen', icon: '✈️', label: 'Reisen' },
    { id: 'kochen', icon: '🍕', label: 'Kochen' },
    { id: 'social_media', icon: '📱', label: 'Social Media' },
    { id: 'f1_racing', icon: '🏎️', label: 'Formel 1' },
    { id: 'film', icon: '🎬', label: 'Film' },
    { id: 'fotografie', icon: '📸', label: 'Fotografie' },
    { id: 'yoga', icon: '🧘', label: 'Yoga' },
    { id: 'kunst', icon: '🎨', label: 'Kunst' },
    { id: 'wandern', icon: '🏔️', label: 'Wandern' },
    { id: 'breaking_bad', icon: '🧪', label: 'Breaking Bad' },
    { id: 'harry_potter', icon: '⚡', label: 'Harry Potter' },
    { id: 'tiere', icon: '🐾', label: 'Tiere' },
  ];

  const BANANA_TOPIC_CHIPS = ['Meiose', 'Blutkreislauf', 'Hormonsystem', 'DNA-Replikation', 'Nervenzelle'];

  let _bananaState = {
    contentType: 'eselsbruecke',
    stil: 'sketch',
    orientation: 'hochformat',
    hobby: '',
    customHobby: '',
    hobbyEnabled: false,
    extraDesc: '',
    textAmount: 'mittel',     // wenig | mittel | viel
    topic: '',
    wizardStep: 1,
    isGenerating: false,
  };

  // Free learning mode: null = question mode, string = free topic mode
  let _freeModeTopic = null;

  // ── Helper: extract question text ─────────────────────────────────────────
  function _extractQuestionText(q) {
    if (_freeModeTopic !== null) return _freeModeTopic || '(Kein Thema eingegeben)';
    if (!q) return 'Keine Aufgabe ausgewählt.';
    const c = q.content || {};
    const type = q.type || '';

    if (c.question) return c.question;
    if (type === 'zahlenfolge' && c.sequence) {
      return `Zahlenfolge: ${c.sequence.join(', ')} – Was kommt als nächstes?`;
    }
    if (type === 'implikation' && c.premise1) {
      return `Wenn ${c.premise1} und ${c.premise2}, dann ${c.conclusion}?\nFolgt das logisch?`;
    }
    if ((type === 'wortfluessigkeit' || type === 'wortflüssigkeit') && c.word) {
      return `Wortflüssigkeit zum Wort: "${c.word}"`;
    }
    if (type === 'figur') {
      return `Figuren zusammensetzen – Welche Figur lässt sich aus den gezeigten Teilen zusammensetzen?`;
    }
    if (type === 'allergieausweis_frage' && c.question) {
      return c.question;
    }
    if (c.scenario) return c.scenario;
    if (c.text) return c.text;
    return `${type}-Aufgabe (kein Fragetext verfügbar)`;
  }

  // Tutors are hidden for KFF/TV/SEK questions — shown for everything else (BMS + unknown)
  // Uses a BLOCKLIST so new/unknown question types default to showing the tutor
  const _KFF_TV_SEK_TYPES = new Set([
    'zahlenfolge', 'implikation', 'wortfluessigkeit', 'wortflüssigkeit',
    'figur', 'allergieausweis_frage',
    'textverstaendnis',
    'sek_ee', 'sek_er', 'sek_se',
  ]);
  function _isBMSQuestion(q) {
    if (!q) return true; // default: show FAB
    const t = (q.type || '').toLowerCase();
    return !_KFF_TV_SEK_TYPES.has(t);
  }

  function _getBereich(q) {
    if (!q) return 'MedAT';
    const typeMap = {
      'bms': `BMS – ${q.subtype || 'Biologie/Chemie/Physik/Mathematik'}`,
      'biologie': 'BMS – Biologie',
      'chemie': 'BMS – Chemie',
      'physik': 'BMS – Physik',
      'mathematik': 'BMS – Mathematik',
      'zahlenfolge': 'KFF – Zahlenfolgen',
      'implikation': 'KFF – Implikationen erkennen',
      'wortfluessigkeit': 'KFF – Wortflüssigkeit',
      'wortflüssigkeit': 'KFF – Wortflüssigkeit',
      'figur': 'KFF – Figuren zusammensetzen',
      'allergieausweis_frage': 'KFF – Allergieausweise',
      'textverstaendnis': 'TV – Textverständnis',
      'sek_ee': 'SEK – Emotionen erkennen',
      'sek_er': 'SEK – Emotionen regulieren',
      'sek_se': 'SEK – Soziales Entscheiden',
    };
    return typeMap[q.type] || typeMap[q.subtype] || 'MedAT';
  }

  // ── Full question context (incl. answer options + explanation) ────────────
  function _extractFullContext(q) {
    // Free learning mode: use custom topic
    if (_freeModeTopic !== null) {
      return {
        frage: _freeModeTopic || '(Kein Thema — frage den Lernenden was er lernen möchte)',
        antworten: '',
        erklaerung: '',
        bereich: 'Freier Lernmodus',
      };
    }
    if (!q) return { frage: 'Keine Aufgabe ausgewählt.', antworten: '', erklaerung: '', bereich: 'MedAT' };
    const c = q.content || {};
    const frage = _extractQuestionText(q);
    const bereich = _getBereich(q);

    let antworten = '';
    if (c.options && Array.isArray(c.options) && c.options.length > 0) {
      const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
      const correctIdx = c.correct ?? c.correct_index ?? -1;
      antworten = c.options.map((opt, i) => {
        const isCorrect = i === correctIdx;
        return `${labels[i] || (i+1)} ${opt}${isCorrect ? '  ✓' : ''}`;
      }).join('\n');
      // Explicit correct answer line to prevent letter confusion
      if (correctIdx >= 0 && correctIdx < c.options.length) {
        antworten += `\n\n✅ KORREKTE ANTWORT: ${labels[correctIdx]}) ${c.options[correctIdx]}`;
      }
    }

    const erklaerung = c.explanation || '';
    return { frage, antworten, erklaerung, bereich };
  }

  // ── Auth-Token helper ────────────────────────────────────────────────────
  // getSession() in Supabase v2 auto-refreshes expired tokens internally.
  // Only explicitly call refreshSession() as a fallback if getSession() fails.
  async function _getToken() {
    const { data: { session } } = await Auth.supabase.auth.getSession();
    if (session?.access_token) return session.access_token;

    // Fallback: force explicit refresh (e.g. after long idle on mobile)
    const { data: refreshed } = await Auth.supabase.auth.refreshSession();
    if (refreshed?.session?.access_token) return refreshed.session.access_token;

    throw new Error('Bitte melde dich erneut an.');
  }

  // ── Generic fetch-with-auto-retry helper ─────────────────────────────────
  // On 401 (invalid/expired JWT): force-refresh the token and retry once.
  // This handles iOS Safari where tokens expire after background/lock.
  async function _fetchWithRetry(url, bodyObj) {
    const doFetch = async (token) => fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': CONFIG.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(bodyObj),
    });

    const token = await _getToken();
    let resp = await doFetch(token);

    // On 401: force a hard token refresh and retry once — no user action needed
    if (resp.status === 401) {
      try {
        const { data: refreshed } = await Auth.supabase.auth.refreshSession();
        const newToken = refreshed?.session?.access_token;
        if (newToken) resp = await doFetch(newToken);
      } catch (_) { /* refresh failed, keep original 401 resp */ }
    }

    // If still 401 after retry, throw a clear reauth error instead of raw "Invalid JWT"
    if (resp.status === 401) {
      throw new Error('REAUTH_REQUIRED');
    }

    return resp;
  }

  // ── API calls ─────────────────────────────────────────────────────────────
  async function _callTutorChat(tutorKey, messages, systemPrompt) {
    const resp = await _fetchWithRetry(
      `${CONFIG.SUPABASE_URL}/functions/v1/tutor-chat`,
      { tutor_typ: tutorKey, messages, system_prompt: systemPrompt }
    );
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data?.error || data?.message || `HTTP ${resp.status}`);
    if (!data?.response) throw new Error('Keine Antwort erhalten');
    return data.response;
  }

  async function _callNanoBanana(params) {
    const resp = await _fetchWithRetry(
      `${CONFIG.SUPABASE_URL}/functions/v1/nano-banana`,
      params
    );
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data?.error || data?.message || `HTTP ${resp.status}`);
    return data;
  }

  // ── DOM helpers ───────────────────────────────────────────────────────────
  function _el(id) { return document.getElementById(id); }

  function _show(id) {
    const el = _el(id);
    if (el) el.classList.remove('hidden');
  }

  function _hide(id) {
    const el = _el(id);
    if (el) el.classList.add('hidden');
  }

  // ── Panel rendering ───────────────────────────────────────────────────────
  function _renderTutorSelection() {
    const container = _el('tutor-view-select');
    if (!container) return;

    const isFreeMode = _freeModeTopic !== null;
    const q = _currentQuestion;
    const frage = _extractQuestionText(q);
    const bereich = isFreeMode ? 'Freier Lernmodus' : _getBereich(q);
    const previewText = isFreeMode
      ? (_freeModeTopic || '(Thema eingeben)')
      : (frage.length > 80 ? frage.slice(0, 80) + '…' : frage);

    const freeModeInput = isFreeMode ? `
      <div class="tutor-free-topic-box tutor-free-topic-box--select">
        <div class="tutor-free-topic-label">📚 Lernthema (optional vor Auswahl eingeben):</div>
        <div class="tutor-free-topic-row">
          <input type="text" id="tutor-free-topic-select-input" class="tutor-free-topic-input"
            value="${(_freeModeTopic || '').replace(/"/g, '&quot;')}"
            placeholder="z.B. Myasthenia gravis, Synapse, Krebs-Zyklus…"
            maxlength="200">
        </div>
      </div>` : '';

    container.innerHTML = `
      <div class="tutor-panel-header">
        <div class="tutor-panel-title">${isFreeMode ? '🎓 Lern-Studio' : '🎓 KI-Tutoren'}</div>
        <button class="tutor-close-btn" id="tutor-close-btn" title="Schließen">✕</button>
      </div>
      <div class="tutor-select-scroll">
      ${isFreeMode ? '' : '<div class="tutor-rotate-hint">📱 Gerät drehen für mehr Platz — Querformat empfohlen!</div>'}
      ${freeModeInput}
      <div class="tutor-context-badge">
        <span class="tutor-badge-label">${bereich}</span>
        <span class="tutor-badge-preview">${previewText}</span>
      </div>
      <div class="tutor-selection-hint">Wähle deinen Lernstil:</div>
      <div class="tutor-grid" id="tutor-grid"></div>
      <div class="tutor-guide-section" id="tutor-guide-section">
        <button class="tutor-guide-toggle" id="tutor-guide-toggle" onclick="Tutor._toggleGuide()">
          <span>ℹ️ Wer sind die Tutoren?</span>
          <span class="tutor-guide-arrow" id="tutor-guide-arrow">▾</span>
        </button>
        <div class="tutor-guide-content hidden" id="tutor-guide-content">
          ${Object.values(TUTORS).map(t => `
            <div class="tutor-guide-item" style="--tutor-color:${t.color};--tutor-color-soft:${t.colorSoft}">
              <div class="tutor-guide-item-header">
                <span class="tutor-guide-item-icon">${t.icon}</span>
                <div>
                  <div class="tutor-guide-item-name">${t.name}</div>
                  <div class="tutor-guide-item-tagline">${t.tagline}</div>
                </div>
              </div>
              <div class="tutor-guide-item-desc">${t.description}</div>
            </div>
          `).join('')}
        </div>
      </div>
      </div>
    `;

    const grid = _el('tutor-grid');
    Object.values(TUTORS).forEach(t => {
      const card = document.createElement('button');
      card.className = t.canGenerateImages ? 'tutor-card tutor-card--banana' : 'tutor-card';
      card.style.setProperty('--tutor-color', t.color);
      card.style.setProperty('--tutor-color-soft', t.colorSoft);
      card.innerHTML = `
        <span class="tutor-card-icon">${t.icon}</span>
        <span class="tutor-card-name">${t.name}</span>
        <span class="tutor-card-tagline">${t.tagline}</span>
        ${t.canGenerateImages ? '<span class="tutor-card-image-badge">🎨 Bilder</span>' : ''}
      `;
      card.onclick = () => {
        // If free mode: sync topic from selection input before opening chat
        const selInput = _el('tutor-free-topic-select-input');
        if (selInput && _freeModeTopic !== null) {
          _freeModeTopic = selInput.value.trim();
        }
        selectTutor(t.key);
      };
      grid.appendChild(card);
    });

    _el('tutor-close-btn').onclick = close;
  }

  function _toggleGuide() {
    const content = _el('tutor-guide-content');
    const arrow = _el('tutor-guide-arrow');
    if (!content) return;
    const isHidden = content.classList.contains('hidden');
    content.classList.toggle('hidden', !isHidden);
    if (arrow) arrow.textContent = isHidden ? '▴' : '▾';
  }

  function _renderChat(greeting = false) {
    const t = TUTORS[_currentTutor];
    if (!t) return;

    const container = _el('tutor-view-chat');
    if (!container) return;

    const isBanana = t.canGenerateImages;

    container.innerHTML = `
      <div class="tutor-panel-header" style="--tutor-color:${t.color}">
        <div class="tutor-chat-header-left">
          <button class="tutor-back-btn" id="tutor-back-btn" title="Tutor wechseln">←</button>
          <span class="tutor-chat-icon">${t.icon}</span>
          <div>
            <div class="tutor-chat-name">${t.name}</div>
            <div class="tutor-chat-tagline">${t.tagline}</div>
          </div>
        </div>
        <div class="tutor-header-btns">
          <button class="tutor-restart-btn" id="tutor-restart-btn" title="Neu starten" onclick="Tutor._restartChat()">↺</button>
          <button class="tutor-save-chat-btn" id="tutor-save-chat-btn" title="Gespräch im Lernarchiv speichern" onclick="Tutor._saveConversation()">💾</button>
          <button class="tutor-close-btn" id="tutor-close-btn2" title="Schließen">✕</button>
        </div>
      </div>

      ${isBanana ? `
        <div class="banana-tab-bar">
          <button class="banana-tab active" id="banana-tab-chat" data-tab="chat">💬 Thema besprechen</button>
          <button class="banana-tab" id="banana-tab-bild" data-tab="bild">🍌 Bild generieren</button>
        </div>
      ` : ''}

      <!-- Chat Tab -->
      <div class="tutor-tab-pane active" id="tutor-pane-chat">
        ${_renderQuestionCard()}
        <div class="tutor-messages" id="tutor-messages"></div>
        <div class="tutor-input-row">
          <textarea
            id="tutor-input"
            class="tutor-input"
            placeholder="Frag ${t.name}..."
            rows="1"
            maxlength="500"
          ></textarea>
          <button class="tutor-send-btn" id="tutor-send-btn" style="background:${t.color}" title="Senden">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>


      ${isBanana ? `
        <!-- Bild Tab -->
        <div class="tutor-tab-pane" id="tutor-pane-bild">
          <div class="banana-controls-scroll" id="banana-controls-scroll">
            ${_renderBananaControls()}
            <div id="banana-result" class="banana-result hidden"></div>
          </div>
        </div>
      ` : ''}
    `;

    _el('tutor-back-btn').onclick = () => {
      _messages = [];
      _show('tutor-view-select');
      _hide('tutor-view-chat');
      _renderTutorSelection();
    };
    _el('tutor-close-btn2').onclick = close;

    // Input auto-resize + send on Enter
    const input = _el('tutor-input');
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        _sendMessage();
      }
    });
    _el('tutor-send-btn').onclick = _sendMessage;

    if (isBanana) _bindBananaControls();

    // Re-render existing messages
    const msgContainer = _el('tutor-messages');
    _messages.forEach(m => {
      msgContainer.appendChild(_createMessageEl(m.role, m.content));
    });

    if (greeting && _messages.length === 0) {
      _triggerAutoGreeting();
    }

    _scrollToBottom();
  }

  // ── Question card (sticky at top of chat pane) ────────────────────────────
  function _renderQuestionCard() {
    // Free mode: show editable topic input — but NOT for Banana (topic comes from chat)
    if (_freeModeTopic !== null) {
      if (_currentTutor === 'banana') return '';
      return `
        <div class="tutor-free-topic-box" id="tutor-free-topic-box">
          <div class="tutor-free-topic-label">📚 Lernthema:</div>
          <div class="tutor-free-topic-row">
            <input type="text" id="tutor-free-topic-input" class="tutor-free-topic-input"
              value="${(_freeModeTopic || '').replace(/"/g, '&quot;')}"
              placeholder="z.B. Myasthenia gravis, Synapse, Krebs-Zyklus…"
              maxlength="200">
            <button class="tutor-free-topic-update-btn" onclick="Tutor._updateFreeTopic()">✓</button>
          </div>
        </div>`;
    }
    const q = _currentQuestion;
    if (!q) return '';
    const c = q.content || {};
    const frage = _extractQuestionText(q);
    const bereich = _getBereich(q);

    let optionsHTML = '';
    if (c.options && Array.isArray(c.options) && c.options.length > 0) {
      const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
      const correctIdx = c.correct ?? c.correct_index ?? -1;
      optionsHTML = `<div class="tutor-qcard-options">` +
        c.options.map((opt, i) => {
          const isCorrect = i === correctIdx;
          return `<div class="tutor-qcard-option ${isCorrect ? 'tutor-qcard-option--correct' : ''}">
            <span class="tutor-qcard-opt-label">${labels[i] || (i+1)}</span>
            <span class="tutor-qcard-opt-text">${opt}</span>
            ${isCorrect ? '<span class="tutor-qcard-opt-check">✓</span>' : ''}
          </div>`;
        }).join('') +
        `</div>`;
    }

    const expl = c.explanation;
    const explHTML = expl ? `<div class="tutor-qcard-expl"><strong>💡 Erklärung:</strong> ${expl}</div>` : '';

    return `
      <details class="tutor-qcard" id="tutor-qcard">
        <summary class="tutor-qcard-summary">
          <span class="tutor-qcard-bereich">${bereich}</span>
          <span class="tutor-qcard-frage-preview">${frage.slice(0, 90)}${frage.length > 90 ? '…' : ''}</span>
          <span class="tutor-qcard-toggle-hint">▾ Aufgabe anzeigen</span>
        </summary>
        <div class="tutor-qcard-body">
          <div class="tutor-qcard-frage">${frage}</div>
          ${optionsHTML}
          ${explHTML}
        </div>
      </details>
    `;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── BANANA WIZARD (dedicated 2-step flow, decoupled from chat tutors) ──
  // ══════════════════════════════════════════════════════════════════════════

  function _renderBananaWizard() {
    const container = _el('tutor-view-chat');
    if (!container) return;
    _hide('tutor-view-select');
    _show('tutor-view-chat');

    // Pre-fill topic from question context or free mode
    if (!_bananaState.topic) {
      if (_currentQuestion) {
        const ctx = _extractFullContext(_currentQuestion);
        _bananaState.topic = ctx.frage || '';
      } else if (_freeModeTopic) {
        _bananaState.topic = _freeModeTopic;
      }
    }

    const formatCards = BANANA_CONTENT_TYPES.map(ct => `
      <div class="bw-format-card ${_bananaState.contentType === ct.id ? 'active' : ''}" data-type="${ct.id}">
        <div class="bw-format-icon">${ct.icon}</div>
        <div class="bw-format-label">${ct.label.replace(/-/g, '-\u200B')}</div>
      </div>
    `).join('');

    const topicChips = BANANA_TOPIC_CHIPS.map(t => `<span class="bw-topic-chip">${t}</span>`).join('');

    const stilCards = BANANA_STILE.map(s => `
      <div class="bw-stil-card ${_bananaState.stil === s.id ? 'active' : ''}" data-stil="${s.id}">
        <div class="bw-stil-preview">${s.id === 'custom'
          ? `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:1.6rem;background:#f0f0f2">🎯</div>`
          : `<img src="img/styles/${s.id}.png" alt="${s.label}">`
        }</div>
        <div class="bw-stil-name">${s.label}</div>
      </div>
    `).join('');

    const hobbyChips = BANANA_HOBBIES.map(h => `
      <span class="bw-hobby-chip ${_bananaState.hobby === h.id ? 'active' : ''}" data-hobby="${h.id}">${h.icon} ${h.label}</span>
    `).join('');

    const chosenType = BANANA_CONTENT_TYPES.find(ct => ct.id === _bananaState.contentType) || BANANA_CONTENT_TYPES[0];
    const aiImgRem = (typeof Credits !== 'undefined' && Credits._credits) ? Credits.aiImagesRemaining : '?';
    const isFromQuestion = !!_currentQuestion;  // true = from practice, false = from Lernstudio

    container.innerHTML = `
      <div class="bw-wrapper">
        <!-- Header -->
        <div class="bw-header">
          <div class="bw-header-top">
            <button class="bw-header-back" onclick="Tutor._backFromBananaWizard()">←</button>
            <div>
              <div class="bw-header-title">🍌 Lernbild erstellen</div>
              <div class="bw-header-sub">Visuelles Merkbild in 2 Schritten</div>
            </div>
            <button class="bw-header-close" onclick="Tutor.close()">✕</button>
          </div>
        </div>

        <!-- Step indicator -->
        <div class="bw-steps">
          <div class="bw-step-dot ${_bananaState.wizardStep === 1 ? 'active' : 'done'}" id="bw-dot1"></div>
          <div class="bw-step-dot ${_bananaState.wizardStep === 2 ? 'active' : ''}" id="bw-dot2"></div>
        </div>
        <div class="bw-step-labels">
          <span>Thema & Format</span>
          <span>Stil & Details</span>
        </div>

        <!-- ═══ STEP 1: Thema & Format ═══ -->
        <div class="bw-step ${_bananaState.wizardStep === 1 ? 'active' : ''}" id="bw-step1">
          <div class="bw-content">
            <div class="bw-title">Was möchtest du lernen?</div>
            <div class="bw-desc">Wähle einen Bildtyp und beschreib dein Thema.</div>
            <div class="bw-format-grid">${formatCards}</div>
            <textarea class="bw-topic-input" id="bw-topic" rows="2" placeholder="z.B. Meiose – die Phasen und Unterschiede zur Mitose">${_bananaState.topic || ''}</textarea>
            <div class="bw-topic-chips">${topicChips}</div>

            ${!isFromQuestion ? `
            <!-- Prompt-Optimierer (nur im Lernstudio) -->
            <div class="bw-divider" style="margin-top:0.8rem"></div>
            <div class="bw-prompt-optimizer" id="bw-prompt-optimizer">
              <div class="bw-option-label">✨ Prompt-Verbesserer <span style="font-weight:400;color:#aaa">– beschreibt dein Bild für bessere Ergebnisse</span></div>
              <textarea class="bw-extra-input" id="bw-visual-hint" rows="2" placeholder="Optional: Was soll man auf dem Bild sehen? z.B. Erbsen als Metapher, Küche als Zelle...">${_bananaState.visualHint || ''}</textarea>
              <button class="bw-btn-optimize" id="bw-btn-optimize">🪄 Prompt optimieren</button>
              <div class="bw-optimized-result hidden" id="bw-optimized-result">
                <div class="bw-optimized-label">Optimierter Prompt:</div>
                <textarea class="bw-optimized-text" id="bw-optimized-text" rows="4"></textarea>
              </div>
            </div>
            ` : ''}
          </div>
          <div class="bw-btn-row">
            <button class="bw-btn-next" id="bw-btn-next">Weiter → Stil & Details</button>
          </div>
        </div>

        <!-- ═══ STEP 2: Stil & Details ═══ -->
        <div class="bw-step ${_bananaState.wizardStep === 2 ? 'active' : ''}" id="bw-step2">
          <div class="bw-content">
            <div class="bw-summary-chip" id="bw-summary">
              ${chosenType.icon} ${chosenType.label} · <em>${(_bananaState.topic || '...').slice(0, 30)}</em>
              <span class="bw-summary-edit" id="bw-summary-edit">ändern</span>
            </div>

            <div class="bw-title">Wie soll es aussehen?</div>
            <div class="bw-desc">Stil wählen und Feintuning anpassen.</div>

            <div class="bw-stil-grid">${stilCards}</div>
            <div class="bw-custom-stil-panel ${_bananaState.stil === 'custom' ? 'open' : ''}" id="bw-custom-stil-panel">
              <textarea class="bw-extra-input" id="bw-custom-stil" rows="2" placeholder="Beschreib deinen Stil, z.B. Retro-Poster aus den 70ern, Manga mit Chibi-Figuren, Kreidezeichnung auf Tafel...">${_bananaState.customStil || ''}</textarea>
            </div>

            <div class="bw-option-row">
              <div class="bw-option-group">
                <div class="bw-option-label">Ausrichtung</div>
                <div class="bw-option-btns">
                  <div class="bw-opt-btn ${_bananaState.orientation === 'hochformat' ? 'active' : ''}" data-orient="hochformat">📄 Hoch</div>
                  <div class="bw-opt-btn ${_bananaState.orientation === 'querformat' ? 'active' : ''}" data-orient="querformat">📺 Quer</div>
                </div>
              </div>
              <div class="bw-option-group">
                <div class="bw-option-label">Textmenge</div>
                <div class="bw-option-btns">
                  <div class="bw-opt-btn ${_bananaState.textAmount === 'wenig' ? 'active' : ''}" data-amount="wenig">Wenig</div>
                  <div class="bw-opt-btn ${_bananaState.textAmount === 'mittel' ? 'active' : ''}" data-amount="mittel">Mittel</div>
                  <div class="bw-opt-btn ${_bananaState.textAmount === 'viel' ? 'active' : ''}" data-amount="viel">Viel</div>
                </div>
              </div>
            </div>

            <div class="bw-divider"></div>

            <div class="bw-hobby-row">
              <div class="bw-option-label">🎯 Hobby-Kontext einbauen</div>
              <label class="bw-switch">
                <input type="checkbox" id="bw-hobby-toggle" ${_bananaState.hobbyEnabled ? 'checked' : ''}>
                <span class="bw-slider"></span>
              </label>
            </div>
            <div class="bw-hobby-panel ${_bananaState.hobbyEnabled ? 'open' : ''}" id="bw-hobby-panel">
              <input class="bw-hobby-custom" id="bw-hobby-custom" type="text" placeholder="Eigenes Hobby oder Interesse eingeben..." value="${_bananaState.customHobby || ''}">
              <div class="bw-hobby-grid">${hobbyChips}</div>
            </div>

            <div class="bw-divider"></div>

            <div class="bw-option-label">Zusätzliche Anweisungen <span style="font-weight:400;color:#aaa">(optional)</span></div>
            <textarea class="bw-extra-input" id="bw-extra" rows="2" placeholder="z.B. Fokus auf Prophase, mit Beschriftungen...">${_bananaState.extraDesc || ''}</textarea>

            <!-- Result container (hidden until generation) -->
            <div id="bw-result" class="banana-result hidden"></div>
          </div>

          <div class="bw-btn-row">
            <button class="bw-btn-back" id="bw-btn-back">← Zurück</button>
            <button class="bw-btn-generate" id="bw-btn-generate">
              <span id="bw-gen-spinner" class="hidden">⏳</span>
              <span id="bw-gen-text">🍌 Bild generieren</span>
            </button>
          </div>
          <div class="bw-credits-note">${aiImgRem} Bilder übrig · 1 wird verbraucht</div>
        </div>
      </div>
    `;

    _bindBananaWizard();
  }

  function _bindBananaWizard() {
    // Format cards
    document.querySelectorAll('.bw-format-card').forEach(card => {
      card.onclick = () => {
        document.querySelectorAll('.bw-format-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        _bananaState.contentType = card.dataset.type;
      };
    });

    // Topic input
    const topicInput = _el('bw-topic');
    if (topicInput) topicInput.oninput = () => { _bananaState.topic = topicInput.value; };

    // Topic chips
    document.querySelectorAll('.bw-topic-chip').forEach(chip => {
      chip.onclick = () => {
        if (topicInput) { topicInput.value = chip.textContent; _bananaState.topic = chip.textContent; }
      };
    });

    // Next button
    const nextBtn = _el('bw-btn-next');
    if (nextBtn) nextBtn.onclick = () => {
      if (!_bananaState.topic || _bananaState.topic.trim().length < 2) {
        if (topicInput) { topicInput.focus(); topicInput.style.borderColor = '#ef4444'; setTimeout(() => { topicInput.style.borderColor = ''; }, 1500); }
        return;
      }
      _wizardGoStep(2);
    };

    // Back button + summary edit
    const backBtn = _el('bw-btn-back');
    if (backBtn) backBtn.onclick = () => _wizardGoStep(1);
    const summaryEdit = _el('bw-summary-edit');
    if (summaryEdit) summaryEdit.onclick = () => _wizardGoStep(1);

    // Stil cards
    const customStilPanel = _el('bw-custom-stil-panel');
    document.querySelectorAll('.bw-stil-card').forEach(card => {
      card.onclick = () => {
        document.querySelectorAll('.bw-stil-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        _bananaState.stil = card.dataset.stil;
        // Show/hide custom style input
        if (customStilPanel) customStilPanel.classList.toggle('open', card.dataset.stil === 'custom');
      };
    });

    // Orientation buttons
    document.querySelectorAll('[data-orient]').forEach(btn => {
      btn.onclick = () => {
        btn.parentElement.querySelectorAll('.bw-opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _bananaState.orientation = btn.dataset.orient;
      };
    });

    // Text amount buttons
    document.querySelectorAll('[data-amount]').forEach(btn => {
      btn.onclick = () => {
        btn.parentElement.querySelectorAll('.bw-opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _bananaState.textAmount = btn.dataset.amount;
      };
    });

    // Hobby toggle
    const hobbyToggle = _el('bw-hobby-toggle');
    const hobbyPanel = _el('bw-hobby-panel');
    if (hobbyToggle) hobbyToggle.onchange = () => {
      _bananaState.hobbyEnabled = hobbyToggle.checked;
      if (hobbyPanel) hobbyPanel.classList.toggle('open', hobbyToggle.checked);
    };

    // Hobby chips
    document.querySelectorAll('.bw-hobby-chip').forEach(chip => {
      chip.onclick = () => {
        document.querySelectorAll('.bw-hobby-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        _bananaState.hobby = chip.dataset.hobby;
        const customInput = _el('bw-hobby-custom');
        if (customInput) customInput.value = chip.textContent.trim();
        _bananaState.customHobby = chip.textContent.trim();
      };
    });

    // Custom hobby input
    const customHobby = _el('bw-hobby-custom');
    if (customHobby) customHobby.oninput = () => {
      _bananaState.customHobby = customHobby.value;
      _bananaState.hobby = '';
      document.querySelectorAll('.bw-hobby-chip').forEach(c => c.classList.remove('active'));
    };

    // Extra instructions
    const extra = _el('bw-extra');
    if (extra) extra.oninput = () => { _bananaState.extraDesc = extra.value; };

    // Custom style input
    const customStilInput = _el('bw-custom-stil');
    if (customStilInput) customStilInput.oninput = () => { _bananaState.customStil = customStilInput.value; };

    // Visual hint input
    const visualHint = _el('bw-visual-hint');
    if (visualHint) visualHint.oninput = () => { _bananaState.visualHint = visualHint.value; };

    // Prompt optimize button
    const optimizeBtn = _el('bw-btn-optimize');
    if (optimizeBtn) optimizeBtn.onclick = () => _optimizePrompt();

    // Generate button
    const genBtn = _el('bw-btn-generate');
    if (genBtn) genBtn.onclick = () => _generateBananaImage();
  }

  /** Prompt-Optimierer: Generiert einen detaillierten Bildprompt aus Thema + Bildtyp */
  async function _optimizePrompt() {
    const topic = _bananaState.topic?.trim();
    if (!topic || topic.length < 2) {
      const topicInput = _el('bw-topic');
      if (topicInput) { topicInput.focus(); topicInput.style.borderColor = '#ef4444'; setTimeout(() => { topicInput.style.borderColor = ''; }, 1500); }
      return;
    }

    const btn = _el('bw-btn-optimize');
    const resultDiv = _el('bw-optimized-result');
    const resultText = _el('bw-optimized-text');

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Optimiere...'; }

    const typeLabel = BANANA_CONTENT_TYPES.find(ct => ct.id === _bananaState.contentType)?.label || 'Eselsbrücke';
    const hint = _bananaState.visualHint?.trim() || '';

    try {
      const { data: { session } } = await Auth.supabase.auth.getSession();
      const resp = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/tutor-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': CONFIG.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          tutor_typ: 'banana',
          messages: [{ role: 'user', content: `Erstelle einen detaillierten Bildprompt für ein medizinisches Lernbild.\n\nBildtyp: ${typeLabel}\nThema: ${topic}${hint ? '\nVisueller Hinweis: ' + hint : ''}\n\nRegeln:\n- Beschreibe GENAU was man auf dem Bild sehen soll (Metaphern, Objekte, Layout)\n- Nutze Alltagsvergleiche die das Thema unvergesslich machen\n- Max 120 Wörter, auf Deutsch\n- Kein Erklärtext, nur visuelle Beschreibung\n- Perfekt für KI-Bildgenerierung optimiert` }],
          system_prompt: 'Du bist ein Prompt-Optimierer für medizinische Lernbilder. Du erstellst detaillierte, visuelle Bildprompts die perfekt für KI-Bildgenerierung geeignet sind. Antworte NUR mit dem optimierten Prompt, ohne Einleitung oder Erklärung.',
          model: 'gemini-2.0-flash',
        }),
      });

      if (!resp.ok) throw new Error('Fehler bei der Optimierung');
      const data = await resp.json();
      const optimized = data.response || data.reply || data.content || '';

      if (optimized && resultDiv && resultText) {
        resultText.value = optimized;
        resultDiv.classList.remove('hidden');
        _bananaState.optimizedPrompt = optimized;
        // Allow user to edit the optimized prompt
        resultText.oninput = () => { _bananaState.optimizedPrompt = resultText.value; };
      }
    } catch (e) {
      console.error('Prompt optimize error:', e);
      if (btn) btn.textContent = '❌ Fehler – nochmal versuchen';
      setTimeout(() => { if (btn) { btn.textContent = '🪄 Prompt optimieren'; btn.disabled = false; } }, 2000);
      return;
    }

    if (btn) { btn.textContent = '✓ Optimiert!'; setTimeout(() => { btn.textContent = '🪄 Nochmal optimieren'; btn.disabled = false; }, 1500); }
  }

  function _wizardGoStep(step) {
    _bananaState.wizardStep = step;
    const step1 = _el('bw-step1');
    const step2 = _el('bw-step2');
    const dot1 = _el('bw-dot1');
    const dot2 = _el('bw-dot2');

    if (step === 1) {
      if (step1) step1.classList.add('active');
      if (step2) step2.classList.remove('active');
      if (dot1) { dot1.classList.add('active'); dot1.classList.remove('done'); }
      if (dot2) { dot2.classList.remove('active'); }
    } else {
      if (step1) step1.classList.remove('active');
      if (step2) step2.classList.add('active');
      if (dot1) { dot1.classList.remove('active'); dot1.classList.add('done'); }
      if (dot2) { dot2.classList.add('active'); }
      // Update summary chip
      const summary = _el('bw-summary');
      const chosenType = BANANA_CONTENT_TYPES.find(ct => ct.id === _bananaState.contentType) || BANANA_CONTENT_TYPES[0];
      if (summary) {
        summary.innerHTML = `${chosenType.icon} ${chosenType.label} · <em>${(_bananaState.topic || '...').slice(0, 30)}</em> <span class="bw-summary-edit" id="bw-summary-edit">ändern</span>`;
        const editBtn = _el('bw-summary-edit');
        if (editBtn) editBtn.onclick = () => _wizardGoStep(1);
      }
    }
  }

  function _backFromBananaWizard() {
    _messages = [];
    _currentTutor = null;
    _bananaState = { contentType: 'eselsbruecke', stil: 'sketch', customStil: '', orientation: 'hochformat', hobby: '', customHobby: '', hobbyEnabled: false, extraDesc: '', textAmount: 'mittel', topic: '', visualHint: '', optimizedPrompt: '', wizardStep: 1, isGenerating: false };
    _show('tutor-view-select');
    _hide('tutor-view-chat');
    _renderTutorSelection();
  }

  /** Restart current session — for Banana: back to wizard, for others: fresh greeting */
  function _restartChat() {
    if (!_currentTutor) return;
    _messages = [];
    if (_currentTutor === 'banana') {
      _bananaState = { contentType: 'eselsbruecke', stil: 'sketch', customStil: '', orientation: 'hochformat', hobby: '', customHobby: '', hobbyEnabled: false, extraDesc: '', textAmount: 'mittel', topic: '', visualHint: '', optimizedPrompt: '', wizardStep: 1, isGenerating: false };
      _renderBananaWizard();
    } else {
      _renderChat(true);
    }
  }

  function _confirmBananaPreType() {
    _renderChat(true);
  }

  function _renderBananaControls() {
    const chosenType = BANANA_CONTENT_TYPES.find(ct => ct.id === _bananaState.contentType) || BANANA_CONTENT_TYPES[0];

    const stilButtons = BANANA_STILE.map(s => `
      <div class="banana-stil-card ${_bananaState.stil === s.id ? 'active' : ''}" data-stil="${s.id}">
        <div class="banana-stil-preview">${s.preview || s.icon}</div>
        <div class="banana-stil-name">${s.label}</div>
      </div>
    `).join('');

    const hobbyButtons = BANANA_HOBBIES.map(h => `
      <button class="banana-hobby-btn ${_bananaState.hobby === h.id ? 'active' : ''}"
        data-hobby="${h.id}">
        ${h.icon} ${h.label}
      </button>
    `).join('');

    return `
      <div class="banana-controls" id="banana-controls">

        <div class="banana-chosen-type-badge">
          <span class="banana-chosen-type-icon">${chosenType.icon}</span>
          <span class="banana-chosen-type-label">${chosenType.label}</span>
          <span class="banana-chosen-type-tag">ausgewählt</span>
        </div>

        <div class="banana-section-label">🎨 Stil</div>
        <div class="banana-stil-grid">${stilButtons}</div>

        <div class="banana-section-label">🌍 Format</div>
        <div class="banana-orient-row">
          <button class="banana-orient-btn ${_bananaState.orientation === 'hochformat' ? 'active' : ''}"
            data-orient="hochformat">📄 Hochformat</button>
          <button class="banana-orient-btn ${_bananaState.orientation === 'querformat' ? 'active' : ''}"
            data-orient="querformat">📺 Querformat</button>
        </div>

        <div class="banana-section-label">📝 Textmenge im Bild</div>
        <div class="banana-detail-row">
          <button class="banana-detail-btn ${_bananaState.detailLevel === 'minimal' ? 'active' : ''}"
            data-detail="minimal">🔤 Minimal</button>
          <button class="banana-detail-btn ${_bananaState.detailLevel === 'kurz' ? 'active' : ''}"
            data-detail="kurz">⚡ Kurz</button>
          <button class="banana-detail-btn ${_bananaState.detailLevel === 'ausfuehrlich' ? 'active' : ''}"
            data-detail="ausfuehrlich">📖 Ausführlich</button>
          <button class="banana-detail-btn ${_bananaState.detailLevel === 'maximal' ? 'active' : ''}"
            data-detail="maximal">📚 Maximum</button>
        </div>

        <div class="banana-section-label" style="display:flex;align-items:center;justify-content:space-between">
          <span>🎭 Hobby-Kontext</span>
          <label class="banana-toggle" style="cursor:pointer;display:flex;align-items:center;gap:6px;font-size:0.75rem;font-weight:500;color:#888">
            <input type="checkbox" id="banana-hobby-toggle" ${_bananaState.hobbyEnabled ? 'checked' : ''} style="accent-color:#f59e0b;width:16px;height:16px">
            <span id="banana-hobby-toggle-label">${_bananaState.hobbyEnabled ? 'An' : 'Aus'}</span>
          </label>
        </div>
        <div id="banana-hobby-panel" style="display:${_bananaState.hobbyEnabled ? 'block' : 'none'}">
          <input type="text" id="banana-custom-hobby" class="banana-custom-input"
            placeholder="Beschreibe dein Hobby oder Interesse, z.B. Fußball, Kochen, Harry Potter..."
            maxlength="80" value="${_bananaState.customHobby}" style="margin-bottom:6px">
          <div class="banana-hobby-grid" style="margin-top:4px">${hobbyButtons}</div>
        </div>

        <div class="banana-section-label">✏️ Zusätzliche Anweisungen (optional)</div>
        <textarea id="banana-extra-desc" class="banana-extra-textarea" rows="2"
          placeholder="z.B. Fokus auf Meiose Phase 2, Farben bitte bunt..."
          maxlength="200">${_bananaState.extraDesc}</textarea>

        <button class="banana-generate-btn" id="banana-generate-btn">
          <span id="banana-gen-spinner" class="hidden">⏳</span>
          <span id="banana-gen-text">🍌 Bild generieren</span>
        </button>
      </div>
    `;
  }

  function _bindBananaControls() {
    // Tab switching
    document.querySelectorAll('.banana-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.banana-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tutor-tab-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const pane = _el(`tutor-pane-${tab.dataset.tab}`);
        if (pane) pane.classList.add('active');
      };
    });

    // Stil cards
    document.querySelectorAll('.banana-stil-card').forEach(card => {
      card.onclick = () => {
        document.querySelectorAll('.banana-stil-card').forEach(b => b.classList.remove('active'));
        card.classList.add('active');
        _bananaState.stil = card.dataset.stil;
      };
    });

    // Orientation
    document.querySelectorAll('.banana-orient-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.banana-orient-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _bananaState.orientation = btn.dataset.orient;
      };
    });

    // Detail level (Beschriftung)
    document.querySelectorAll('.banana-detail-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.banana-detail-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _bananaState.detailLevel = btn.dataset.detail;
      };
    });

    // Hobby toggle
    const hobbyToggle = _el('banana-hobby-toggle');
    const hobbyPanel = _el('banana-hobby-panel');
    const hobbyToggleLabel = _el('banana-hobby-toggle-label');
    if (hobbyToggle) {
      hobbyToggle.onchange = () => {
        _bananaState.hobbyEnabled = hobbyToggle.checked;
        if (hobbyPanel) hobbyPanel.style.display = hobbyToggle.checked ? 'block' : 'none';
        if (hobbyToggleLabel) hobbyToggleLabel.textContent = hobbyToggle.checked ? 'An' : 'Aus';
      };
    }

    // Hobby presets (clicking fills the text input)
    document.querySelectorAll('.banana-hobby-btn').forEach(btn => {
      btn.onclick = () => {
        const isActive = btn.classList.contains('active');
        document.querySelectorAll('.banana-hobby-btn').forEach(b => b.classList.remove('active'));
        const customInput = _el('banana-custom-hobby');
        if (!isActive) {
          btn.classList.add('active');
          _bananaState.hobby = btn.dataset.hobby;
          // Fill text input with hobby label for visibility
          if (customInput) { customInput.value = btn.textContent.trim(); _bananaState.customHobby = btn.textContent.trim(); }
        } else {
          _bananaState.hobby = '';
          if (customInput) { customInput.value = ''; _bananaState.customHobby = ''; }
        }
      };
    });

    // Custom hobby input
    const customInput = _el('banana-custom-hobby');
    if (customInput) {
      customInput.oninput = () => {
        _bananaState.customHobby = customInput.value;
        // Clear preset selection when typing custom
        _bananaState.hobby = '';
        document.querySelectorAll('.banana-hobby-btn').forEach(b => b.classList.remove('active'));
      };
    }

    // Extra description
    const extraDesc = _el('banana-extra-desc');
    if (extraDesc) {
      extraDesc.oninput = () => { _bananaState.extraDesc = extraDesc.value; };
    }

    // Generate button
    const genBtn = _el('banana-generate-btn');
    if (genBtn) genBtn.onclick = _generateBananaImage;
  }

  async function _generateBananaImage() {
    if (_bananaState.isGenerating) return;

    // Guard: must be logged in
    const resultDiv = _el('bw-result') || _el('banana-result');
    if (typeof Auth !== 'undefined' && !Auth.isLoggedIn) {
      if (resultDiv) {
        resultDiv.classList.remove('hidden');
        resultDiv.innerHTML = `<div class="banana-error">⚠️ Bitte melde dich an, um Bilder zu generieren.<br><br><button onclick="Tutor._forceReLogin()" style="background:#1a1a2e;color:#fff;border:none;border-radius:8px;padding:0.5rem 1rem;font-weight:700;cursor:pointer">Anmelden</button></div>`;
      }
      return;
    }

    const q = _currentQuestion;
    const ctx = _extractFullContext(q);
    const fach = ctx.bereich;
    const hobby = _bananaState.hobbyEnabled ? (_bananaState.customHobby || _bananaState.hobby) : '';

    // Build thema: Optimized prompt > Wizard topic > Question context
    let thema, aufgabe;
    if (_bananaState.optimizedPrompt && _bananaState.optimizedPrompt.trim().length > 10) {
      // Optimized prompt from Prompt-Verbesserer (Lernstudio only)
      thema = _bananaState.topic.slice(0, 400);
      aufgabe = _bananaState.optimizedPrompt;
    } else if (_bananaState.topic && _bananaState.topic.trim().length > 2) {
      // Wizard flow: user typed a topic
      thema = _bananaState.topic.slice(0, 400);
      aufgabe = _bananaState.topic;
      // Enrich with question context if available
      if (ctx.erklaerung && ctx.erklaerung.length > 20) {
        aufgabe = [_bananaState.topic, 'Erklärung:\n' + ctx.erklaerung.slice(0, 500)].join('\n\n');
      }
    } else if (ctx.erklaerung && ctx.erklaerung.length > 20) {
      thema = ctx.frage + ' — ' + ctx.erklaerung.slice(0, 300);
      aufgabe = [ctx.frage, ctx.antworten ? 'Antworten:\n' + ctx.antworten : '', 'Erklärung:\n' + ctx.erklaerung.slice(0, 500)].filter(Boolean).join('\n\n');
    } else if (_freeModeTopic !== null) {
      const userMessages = _messages.filter(m => m.role === 'user').map(m => m.content).join('. ');
      const base = _freeModeTopic && _freeModeTopic.length > 2 ? _freeModeTopic : '';
      thema = base
        ? (userMessages.length > 2 ? base + ' — ' + userMessages.slice(0, 300) : base)
        : (userMessages.slice(0, 400) || 'MedAT Lernthema');
      aufgabe = [
        base ? `Thema: ${base}` : '',
        userMessages.length > 2 ? `Was der Lernende mit Banana besprochen hat:\n${userMessages.slice(0, 600)}` : '',
      ].filter(Boolean).join('\n\n');
    } else {
      thema = ctx.frage || 'MedAT Lernthema';
      aufgabe = ctx.frage || '';
    }

    const chatContext = _messages
      .filter(m => m.role === 'assistant')
      .slice(-3)
      .map(m => m.content)
      .join('\n\n');

    // Map 3-level textAmount to detail instructions
    const detailMap = { wenig: 'kurz', mittel: 'ausfuehrlich', viel: 'maximal' };
    const detailInstructions = {
      kurz: 'TEXTMENGE: KURZ. Kurze Labels (3-5 Wörter), keine Fließtexte. Kompakte Stichpunkte statt Sätze.',
      ausfuehrlich: 'TEXTMENGE: AUSFÜHRLICH. Jede Box enthält 1-2 erklärende Sätze. Fließtext erlaubt. Detaillierte Beschriftungen mit Erklärungen.',
      maximal: 'TEXTMENGE: MAXIMUM. Packe so viel lesbaren Text wie möglich ins Bild. Jede Box hat vollständige Erklärungen, Beispielrechnungen, Definitionen. Das Bild soll wie eine komplette Lehrbuchseite aussehen.',
    };
    const mappedDetail = detailMap[_bananaState.textAmount] || 'ausfuehrlich';
    const detailInstruction = detailInstructions[mappedDetail] || detailInstructions.ausfuehrlich;
    const finalExtraDesc = [_bananaState.extraDesc, detailInstruction].filter(Boolean).join(' | ');

    _bananaState.isGenerating = true;
    const genBtn = _el('bw-btn-generate') || _el('banana-generate-btn');
    const spinner = _el('bw-gen-spinner') || _el('banana-gen-spinner');
    const genText = _el('bw-gen-text') || _el('banana-gen-text');

    if (genBtn) genBtn.disabled = true;
    if (spinner) spinner.classList.remove('hidden');
    if (genText) genText.textContent = 'Generiere Bild…';
    if (resultDiv) { resultDiv.classList.remove('hidden'); resultDiv.innerHTML = '<div class="banana-loading">🍌 Banana malt gerade… Das dauert 15-30 Sekunden.</div>'; }

    try {
      const result = await _callNanoBanana({
        thema: thema.slice(0, 800),
        aufgabe: aufgabe.slice(0, 1000),
        chat_context: chatContext.slice(0, 1200),
        fach,
        stil: _bananaState.stil,
        custom_style: _bananaState.stil === 'custom' ? (_bananaState.customStil || '') : '',
        content_type: _bananaState.contentType,
        orientation: _bananaState.orientation,
        hobby,
        detail_level: mappedDetail,
        extra_description: finalExtraDesc,
      });

      if (result.type === 'image' && result.image_base64) {
        const stilLabel = BANANA_STILE.find(s => s.id === _bananaState.stil)?.label || _bananaState.stil;
        const typeLabel = BANANA_CONTENT_TYPES.find(t => t.id === _bananaState.contentType)?.label || _bananaState.contentType;
        const imgSrc = `data:image/png;base64,${result.image_base64}`;

        // Store for save/scratchpad buttons
        _lastBananaData = { imgSrc, typeLabel, stilLabel, bereich: _getBereich(_currentQuestion) };

        // Banana-Image Credit abziehen
        if (typeof Credits !== 'undefined') {
          Credits.useAiImage().catch(() => {});
        }

        resultDiv.innerHTML = `
          <div class="banana-image-wrap">
            <div class="banana-image-actions banana-image-actions--top">
              <button class="banana-action-btn banana-action-btn--save" onclick="Tutor._saveBananaImage()">
                💾 Speichern
              </button>
              <button class="banana-action-btn banana-action-btn--nb" onclick="Tutor._loadInScratchpad()">
                ✏️ Notizblock
              </button>
              <button class="banana-action-btn" onclick="Tutor._downloadLastBanana()">
                ⬇️ Download
              </button>
              <button class="banana-action-btn" onclick="Tutor._fullscreenLastBanana()">
                🔍 Vollbild
              </button>
              <button class="banana-action-btn banana-action-btn--regen" onclick="Tutor._regenBananaImage()">
                🔄 Nochmal
              </button>
            </div>
            <img src="${imgSrc}" alt="${typeLabel} – ${stilLabel}" class="banana-result-img" onclick="Tutor._fullscreenLastBanana()">
            <div class="banana-ai-disclaimer">
              ⚠️ <strong>KI-generiertes Bild:</strong> Dieses Bild wurde von einer KI erstellt und kann anatomische oder fachliche Ungenauigkeiten enthalten. Es dient als kreative Lernhilfe und Eselsbrücke — <strong>bitte immer mit einem Lehrbuch oder einer verlässlichen Quelle abgleichen.</strong>
            </div>
          </div>
        `;
        _bananaImages.push({ src: imgSrc, label: `${typeLabel} – ${stilLabel}` });
        // Scroll to result
        setTimeout(() => {
          resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);

      } else if (result.type === 'text' && result.content) {
        const modelsInfo = result._modelsUsed ? `\nModelle versucht: ${result._modelsUsed.join(', ')}` : '';
        const debugInfo = result._debugErrors && result._debugErrors.length
          ? `<details style="margin-top:8px;font-size:0.7rem;color:#ef4444"><summary>⚠️ Debug-Info (Bildgenerierung fehlgeschlagen)</summary><pre style="white-space:pre-wrap;word-break:break-all">${modelsInfo}\n\n${result._debugErrors.join('\n\n')}</pre></details>`
          : '';
        resultDiv.innerHTML = `
          <div class="banana-text-fallback">
            <div class="banana-text-fallback-title">🍌 Banana's Bildbeschreibung:</div>
            <div class="banana-text-fallback-content">${result.content}</div>
            <div class="banana-text-fallback-note">
              Bildgenerierung momentan nicht verfügbar – hier ist eine Textbeschreibung stattdessen.
            </div>
            ${debugInfo}
          </div>
        `;
      } else {
        throw new Error(result.error || 'Unbekannter Fehler');
      }

    } catch (err) {
      console.error('Banana generate error:', err);
      if (resultDiv) {
        if (err.message === 'REAUTH_REQUIRED') {
          resultDiv.innerHTML = `<div class="banana-error">⚠️ Deine Sitzung ist abgelaufen – bitte melde dich neu an.<br><br><button onclick="Tutor._forceReLogin()" style="background:var(--yellow);border:none;border-radius:8px;padding:0.5rem 1rem;font-weight:700;cursor:pointer">Neu anmelden</button></div>`;
        } else {
          resultDiv.innerHTML = `<div class="banana-error">❌ ${err.message || 'Fehler beim Generieren'}</div>`;
        }
      }
    } finally {
      _bananaState.isGenerating = false;
      if (genBtn) genBtn.disabled = false;
      if (spinner) spinner.classList.add('hidden');
      if (genText) genText.textContent = '🍌 Bild generieren';
    }
  }

  // ── Message handling ──────────────────────────────────────────────────────
  function _createMessageEl(role, text) {
    const t = TUTORS[_currentTutor];
    const div = document.createElement('div');
    div.className = `tutor-msg tutor-msg--${role}`;

    if (role === 'assistant' && t) {
      div.innerHTML = `
        <span class="tutor-msg-icon" style="background:${t.colorSoft};color:${t.color}">${t.icon}</span>
        <div class="tutor-msg-bubble tutor-msg-bubble--assistant" style="--tutor-color:${t.color}">${_formatText(text)}</div>
      `;
    } else {
      div.innerHTML = `
        <div class="tutor-msg-bubble tutor-msg-bubble--user">${_formatText(text)}</div>
      `;
    }
    return div;
  }

  function _formatText(text) {
    // Escape HTML first
    let s = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Detect and convert markdown tables
    const lines = s.split('\n');
    const result = [];
    let i = 0;
    while (i < lines.length) {
      // Check if this line starts a table (has | at start and end, or multiple |)
      if (lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|') &&
          i + 1 < lines.length && /^\s*\|[\s:-]+\|/.test(lines[i + 1])) {
        // Parse table
        const tableLines = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }
        // Build HTML table
        let html = '<table class="tutor-table">';
        tableLines.forEach((line, idx) => {
          // Skip separator row (|:---|:---|)
          if (/^\|[\s:-]+\|$/.test(line.replace(/[^|:-]/g, ''))) return;
          const cells = line.split('|').filter((c, ci, arr) => ci > 0 && ci < arr.length - 1).map(c => c.trim());
          const tag = idx === 0 ? 'th' : 'td';
          html += '<tr>' + cells.map(c => {
            // Apply inline formatting within cells
            let cell = c
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.+?)\*/g, '<em>$1</em>')
              .replace(/`(.+?)`/g, '<code>$1</code>');
            return `<${tag}>${cell}</${tag}>`;
          }).join('') + '</tr>';
        });
        html += '</table>';
        result.push(html);
      } else {
        result.push(lines[i]);
        i++;
      }
    }
    s = result.join('\n');

    // Markdown formatting
    s = s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      // Headings: ### → h4, ## → h3
      .replace(/^### (.+)$/gm, '<strong style="display:block;font-size:0.9rem;margin:0.5rem 0 0.2rem">$1</strong>')
      .replace(/^## (.+)$/gm, '<strong style="display:block;font-size:0.95rem;margin:0.6rem 0 0.2rem">$1</strong>')
      // Bullet lists: - item or • item
      .replace(/^[\-•] (.+)$/gm, '<div style="display:flex;gap:0.4rem;margin:0.15rem 0"><span style="color:var(--yellow)">•</span><span>$1</span></div>')
      // Numbered lists: 1. item
      .replace(/^(\d+)\. (.+)$/gm, '<div style="display:flex;gap:0.4rem;margin:0.15rem 0"><span style="color:var(--yellow);font-weight:700;min-width:1.2rem">$1.</span><span>$2</span></div>')
      .replace(/\n/g, '<br>');

    return s;
  }

  function _appendMessageToDOM(role, text) {
    const container = _el('tutor-messages');
    if (!container) return;
    const msgEl = _createMessageEl(role, text);
    container.appendChild(msgEl);
    // Scroll to the START of the new message (not the end)
    // so the user can read from the beginning
    requestAnimationFrame(() => {
      msgEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function _showLoadingIndicator() {
    const container = _el('tutor-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'tutor-msg tutor-msg--assistant tutor-msg--loading';
    div.id = 'tutor-loading-indicator';
    const t = TUTORS[_currentTutor];
    div.innerHTML = `
      <span class="tutor-msg-icon" style="background:${t?.colorSoft};color:${t?.color}">${t?.icon || '🤖'}</span>
      <div class="tutor-msg-bubble tutor-msg-bubble--assistant">
        <span class="tutor-typing"><span></span><span></span><span></span></span>
      </div>
    `;
    container.appendChild(div);
    _scrollToBottom();
  }

  function _hideLoadingIndicator() {
    const el = _el('tutor-loading-indicator');
    if (el) el.remove();
  }

  function _scrollToBottom() {
    const container = _el('tutor-messages');
    if (container) container.scrollTop = container.scrollHeight;
  }

  async function _triggerAutoGreeting() {
    const t = TUTORS[_currentTutor];
    if (!t || _isLoading) return;

    const ctx = _extractFullContext(_currentQuestion);

    // In free mode (Lernstudio) with Banana and no specific question:
    // Show a quick local greeting instead of calling the API with empty context
    const isFreeMode = _freeModeTopic !== null;
    const hasNoTopic = !_currentQuestion && (!_freeModeTopic || _freeModeTopic.length < 3);

    if (_currentTutor === 'banana' && isFreeMode && hasNoTopic) {
      const ctName = _bananaState?.contentType
        ? (({ infografik: 'Infografik', eselsbruecke: 'Eselsbrücke', ablaufdiagramm: 'Ablaufdiagramm', regel_merkhilfe: 'Regel-Merkhilfe', vergleich: 'Vergleichstabelle', mindmap: 'Mindmap', zeitstrahl: 'Zeitstrahl' })[_bananaState.contentType] || 'Bild')
        : 'Bild';
      const greeting = `Hey! 🍌 Ich erstelle dir eine **${ctName}** — sag mir einfach das Thema! Z.B. "Hormone", "Mitose", "Blutgruppen" oder was auch immer du gerade lernst.`;
      _messages.push({ role: 'assistant', content: greeting });
      _appendMessageToDOM('assistant', greeting);
      return;
    }

    const systemPrompt = t.systemPrompt(ctx);

    _isLoading = true;
    _showLoadingIndicator();

    try {
      const response = await _callTutorChat(_currentTutor, [], systemPrompt + '\n\n' + MEDAT_CONTEXT);
      _hideLoadingIndicator();
      _messages.push({ role: 'assistant', content: response });
      _appendMessageToDOM('assistant', response);
    } catch (err) {
      _hideLoadingIndicator();
      console.error('Auto-greeting error:', err);
      const fallback = `Hallo! Ich bin ${t.name}. ${t.description} Wie kann ich dir helfen?`;
      _messages.push({ role: 'assistant', content: fallback });
      _appendMessageToDOM('assistant', fallback);
    } finally {
      _isLoading = false;
    }
  }

  async function _sendMessage() {
    const input = _el('tutor-input');
    if (!input || _isLoading) return;

    const text = input.value.trim();
    if (!text) return;

    // Credits check
    if (typeof Credits !== 'undefined' && !Credits.isUnlimited() && !Credits.hasEnough(1)) {
      Credits.showPaywall();
      return;
    }

    input.value = '';
    input.style.height = 'auto';

    _messages.push({ role: 'user', content: text });
    _appendMessageToDOM('user', text);

    // In free mode (Lernstudio): if user types a topic, update _freeModeTopic
    // so subsequent messages maintain context
    if (_freeModeTopic !== null && _messages.filter(m => m.role === 'user').length === 1) {
      // First user message = the topic
      _freeModeTopic = text;
    }

    const t = TUTORS[_currentTutor];
    const ctx = _extractFullContext(_currentQuestion);
    const systemPrompt = t.systemPrompt(ctx) + '\n\n' + MEDAT_CONTEXT;

    _isLoading = true;
    _showLoadingIndicator();

    const sendBtn = _el('tutor-send-btn');
    if (sendBtn) sendBtn.disabled = true;

    try {
      const response = await _callTutorChat(_currentTutor, _messages.slice(-10), systemPrompt);
      _hideLoadingIndicator();
      _messages.push({ role: 'assistant', content: response });
      _appendMessageToDOM('assistant', response);

      // Deduct credits (old question-credits system — no-op now)
      if (typeof Credits !== 'undefined') {
        Credits.use(1, 'tutor', _currentTutor).catch(() => {});
        // AI session is deducted once per chat opening (in selectTutor), NOT per message
      }

    } catch (err) {
      _hideLoadingIndicator();
      console.error('Tutor chat error:', err);
      if (err.message === 'REAUTH_REQUIRED') {
        _appendMessageToDOM('assistant', '⚠️ Deine Sitzung ist abgelaufen – bitte melde dich neu an.');
        setTimeout(() => Tutor._forceReLogin(), 2000);
      } else {
        _appendMessageToDOM('assistant', `❌ Fehler: ${err.message || 'Verbindung fehlgeschlagen'}. Bitte versuche es erneut.`);
      }
    } finally {
      _isLoading = false;
      if (sendBtn) sendBtn.disabled = false;
      _el('tutor-input')?.focus();
    }
  }

  // ── Image helpers ─────────────────────────────────────────────────────────
  /** Download any base64 image — works on all devices/browsers */
  function _downloadImage(src, name) {
    // Sanitize filename: ASCII only, no special chars
    const safeName = (name || 'lernbild')
      .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/[ß]/g, 'ss')
      .replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
      .toLowerCase();
    const fileName = `banana_${safeName}.png`;
    try {
      const raw = src.indexOf(',') > -1 ? src.split(',')[1] : src;
      const byteChars = atob(raw);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteArray], { type: 'image/png' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      // Append to DOM, click, remove — required for Chrome
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 30000);
      console.log('[Banana] Download triggered:', fileName);
    } catch (e) {
      console.error('[Banana] Download failed:', e);
      window.open(src, '_blank');
    }
  }

  /** Public wrapper: download the last generated banana image */
  function _downloadLastBanana() {
    if (!_lastBananaData?.imgSrc) { console.warn('No banana image to download'); return; }
    _downloadImage(_lastBananaData.imgSrc, `${_lastBananaData.typeLabel || 'lernbild'}_${_lastBananaData.stilLabel || ''}`);
  }

  /** Public wrapper: fullscreen the last generated banana image */
  function _fullscreenLastBanana() {
    if (!_lastBananaData?.imgSrc) return;
    _openImageFullscreen(_lastBananaData.imgSrc, `${_lastBananaData.typeLabel || 'Lernbild'} – ${_lastBananaData.stilLabel || ''}`);
  }

  function _openImageFullscreen(src, label) {
    const existing = document.getElementById('tutor-img-fullscreen');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'tutor-img-fullscreen';
    overlay.className = 'tutor-img-fullscreen';
    overlay.innerHTML = `
      <div class="tutor-img-fullscreen-inner">
        <div class="tutor-img-fullscreen-header">
          <span>${label}</span>
          <div style="display:flex;gap:0.5rem">
            <button onclick="Tutor._downloadImage('${src}', '${label}')" class="tutor-img-action-btn">⬇️</button>
            <button onclick="document.getElementById('tutor-img-fullscreen').remove()" class="tutor-img-close-btn">✕</button>
          </div>
        </div>
        <img src="${src}" alt="${label}" class="tutor-img-fullscreen-img">
      </div>
    `;
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  }

  /** Scroll controls back to top and re-enable generate button for another image */
  function _regenBananaImage() {
    const resultDiv = _el('banana-result');
    const genBtn    = _el('banana-generate-btn');
    const genText   = _el('banana-gen-text');
    const scroll    = _el('banana-controls-scroll');
    if (resultDiv) resultDiv.classList.add('hidden');
    if (genBtn)    genBtn.disabled = false;
    if (genText)   genText.textContent = '🍌 Bild generieren';
    if (scroll)    scroll.scrollTop = 0;
    _bananaState.isGenerating = false;
  }

  // ── Save banana image to gallery ─────────────────────────────────────────
  async function _saveBananaImage() {
    if (!_lastBananaData) return;
    const btn = document.getElementById('banana-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳…'; }

    try {
      const { data: { session } } = await Auth.supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Bitte einloggen');

      const { imgSrc, typeLabel, stilLabel, bereich } = _lastBananaData;
      const fragenText = _extractQuestionText(_currentQuestion);
      const title = `${typeLabel} – ${bereich}`.slice(0, 100);

      const resp = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/save-banana-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': CONFIG.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          title,
          bereich,
          frage_text: fragenText,
          stil: _bananaState.stil,
          content_type: _bananaState.contentType,
          image_data: imgSrc.replace('data:image/png;base64,', ''),
        }),
      });

      if (resp.ok) {
        if (btn) { btn.textContent = '✓ Gespeichert!'; btn.style.background = '#dcfce7'; btn.style.color = '#166534'; }
        setTimeout(() => {
          if (btn) { btn.textContent = '💾 Speichern'; btn.disabled = false; btn.style.background = ''; btn.style.color = ''; }
        }, 2500);
      } else {
        throw new Error('Speichern fehlgeschlagen');
      }
    } catch (e) {
      console.error('Save banana image error:', e);
      if (btn) { btn.textContent = '❌ Fehler'; btn.disabled = false; }
      setTimeout(() => { if (btn) btn.textContent = '💾 Speichern'; }, 2000);
    }
  }

  function _loadInScratchpad() {
    if (!_lastBananaData) return;
    close();
    if (typeof App !== 'undefined') App.showScreen('screen-question');
    setTimeout(() => {
      const container = document.getElementById('scratchpad-container');
      if (container?.classList.contains('hidden')) {
        if (typeof Scratchpad !== 'undefined') Scratchpad.toggle();
      }
      if (typeof Scratchpad !== 'undefined') Scratchpad.importBananaImage(_lastBananaData.imgSrc);
    }, 300);
  }

  // ── Quick Banana (in allen Tutoren verfügbar) ─────────────────────────────
  let _quickBananaState = { stil: 'sketch', orientation: 'hochformat', isGenerating: false };

  function _quickBananaOpen() {
    const popup = _el('tutor-quick-banana-popup');
    if (!popup) return;
    popup.classList.remove('hidden');

    // Bind stil buttons
    popup.querySelectorAll('.tutor-qb-stil-btn').forEach(btn => {
      btn.onclick = () => {
        popup.querySelectorAll('.tutor-qb-stil-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _quickBananaState.stil = btn.dataset.stil;
      };
    });
    // Bind orientation buttons
    popup.querySelectorAll('.tutor-qb-orient-btn').forEach(btn => {
      btn.onclick = () => {
        popup.querySelectorAll('.tutor-qb-orient-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _quickBananaState.orientation = btn.dataset.orient;
      };
    });
  }

  function _quickBananaClose() {
    const popup = _el('tutor-quick-banana-popup');
    if (popup) popup.classList.add('hidden');
  }

  // Extract key insights from current conversation for banana context
  function _buildConversationSummary() {
    const recent = _messages.slice(-10);
    if (recent.length === 0) return '';
    return recent.map(m => {
      const role = m.role === 'assistant' ? 'Tutor' : 'Lernender';
      return `${role}: ${m.content.slice(0, 300)}`;
    }).join('\n\n');
  }

  async function _quickBananaGenerate() {
    if (_quickBananaState.isGenerating) return;
    const btn = _el('tutor-qb-generate-btn');
    const genText = _el('tutor-qb-gen-text');
    const resultDiv = _el('tutor-qb-result');
    if (!resultDiv) return;

    _quickBananaState.isGenerating = true;
    if (btn) btn.disabled = true;
    if (genText) genText.textContent = '⏳ Generiere…';
    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = '<div class="tutor-qb-loading">🍌 Banana malt… bitte warten (15–30 Sek.)</div>';

    try {
      const ctx = _extractFullContext(_currentQuestion);
      const conversationSummary = _buildConversationSummary();
      const tutorName = TUTORS[_currentTutor]?.name || 'Tutor';

      // The CONVERSATION is the primary thema — the question is just context.
      // This ensures the image reflects Lilly's Flohmarkt-Analogie, not just the raw question.
      let thema;
      if (conversationSummary && conversationSummary.length > 50) {
        thema = `Thema: ${ctx.frage}\n\nDas folgende Gespräch zwischen Lernenden und ${tutorName} enthält die zentralen Erklärungen, Analogien und Merkhilfen, die visualisiert werden sollen:\n\n${conversationSummary}`;
      } else {
        thema = ctx.frage + (ctx.antworten ? '\n\nAntwortmöglichkeiten:\n' + ctx.antworten : '');
      }

      const result = await _callNanoBanana({
        thema: thema.slice(0, 800),
        fach: ctx.bereich,
        stil: _quickBananaState.stil,
        content_type: 'eselsbruecke',
        orientation: _quickBananaState.orientation,
        hobby: '',
        extra_description: '',
      });

      if (result.type === 'image' && result.image_base64) {
        const imgSrc = `data:image/png;base64,${result.image_base64}`;
        _lastBananaData = {
          imgSrc,
          typeLabel: 'Eselsbrücke',
          stilLabel: BANANA_STILE.find(s => s.id === _quickBananaState.stil)?.label || _quickBananaState.stil,
          bereich: ctx.bereich,
        };
        // Override banana state for saving
        _bananaState.stil = _quickBananaState.stil;
        _bananaState.contentType = 'eselsbruecke';

        resultDiv.innerHTML = `
          <div class="tutor-qb-img-wrap">
            <div class="banana-image-actions banana-image-actions--top" style="border-radius:8px 8px 0 0">
              <button class="banana-action-btn banana-action-btn--save" onclick="Tutor._saveBananaImage()">💾 Speichern</button>
              <button class="banana-action-btn banana-action-btn--nb" onclick="Tutor._loadInScratchpad()">✏️ Notizblock</button>
              <button class="banana-action-btn" onclick="Tutor._downloadImage('${imgSrc}', 'eselsbruecke')">⬇️ Download</button>
              <button class="banana-action-btn" onclick="Tutor._openImageFullscreen('${imgSrc}', 'Eselsbrücke')">🔍 Vollbild</button>
            </div>
            <img src="${imgSrc}" alt="Lernbild" style="width:100%;border-radius:0 0 8px 8px;display:block">
          </div>`;
      } else {
        resultDiv.innerHTML = `<div class="tutor-qb-loading" style="color:var(--text-secondary)">${result.content || 'Kein Bild generiert.'}</div>`;
      }
    } catch(e) {
      resultDiv.innerHTML = `<div class="tutor-qb-loading" style="color:var(--danger)">❌ ${e.message}</div>`;
    } finally {
      _quickBananaState.isGenerating = false;
      if (btn) btn.disabled = false;
      if (genText) genText.textContent = '🍌 Nochmal generieren';
    }
  }

  // ── Save conversation to Lernarchiv ──────────────────────────────────────
  async function _saveConversation() {
    const btn = _el('tutor-save-chat-btn');

    if (_messages.length === 0) {
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = '💬 Noch kein Gespräch';
        setTimeout(() => { if (btn) btn.textContent = orig; }, 2000);
      }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

    try {
      const { data: { session } } = await Auth.supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Bitte einloggen');

      const t = TUTORS[_currentTutor];
      const ctx = _extractFullContext(_currentQuestion);
      const topic = (ctx.frage && ctx.frage.length > 5 ? ctx.frage : _freeModeTopic || 'Gespräch').slice(0, 120);
      const title = `${t?.name || 'Tutor'}: ${topic}`.slice(0, 100);

      const resp = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/save-banana-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': CONFIG.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          item_type: 'conversation',
          title,
          frage_text: topic,
          bereich: ctx.bereich || 'MedAT',
          tutor_name: t?.name || 'Tutor',
          conversation_data: JSON.stringify(_messages),
          stil: 'chat',
          content_type: 'conversation',
        }),
      });

      if (resp.ok) {
        if (btn) {
          btn.textContent = '✓ Gespeichert!';
          btn.style.color = '#10b981';
          btn.style.fontWeight = '700';
          setTimeout(() => {
            if (btn) {
              btn.textContent = '💾';
              btn.style.color = '';
              btn.style.fontWeight = '';
              btn.disabled = false;
            }
          }, 2500);
        }
        // Invalidate gallery cache so it reloads next time
        if (typeof Gallery !== 'undefined') Gallery._loaded = false;
      } else {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Speichern fehlgeschlagen');
      }
    } catch(e) {
      console.error('Save conversation error:', e);
      if (btn) {
        btn.textContent = '❌';
        btn.disabled = false;
        setTimeout(() => { if (btn) btn.textContent = '💾'; }, 2000);
      }
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────
  function init() {
    const fab = document.getElementById('tutor-fab');
    if (!fab) return;

    fab.style.display = 'none';
    fab.onclick = () => open(typeof App !== 'undefined' ? App.questions?.[App.currentIndex] : null);

    // Patch App.showScreen once App is loaded — show FAB only on screen-question
    const _waitForApp = setInterval(() => {
      if (typeof App === 'undefined' || !App.showScreen) return;
      clearInterval(_waitForApp);

      const _origShowScreen = App.showScreen.bind(App);
      App.showScreen = function(id) {
        _origShowScreen(id);
        // Show FAB only on screen-question AND only for BMS questions (not KFF/TV/SEK)
        // Tutor FAB permanently hidden — Mister Owl mascot handles tutor access
        fab.style.display = 'none';
      };
    }, 100);
  }

  function open(question) {
    _freeModeTopic = null; // Reset free mode when opening with question
    _currentQuestion = question || (typeof App !== 'undefined' ? App.questions?.[App.currentIndex] : null);
    _currentTutor = null;
    _messages = [];

    const overlay = _el('tutor-overlay');
    if (!overlay) return;

    _show('tutor-overlay');
    _show('tutor-view-select');
    _hide('tutor-view-chat');
    _renderTutorSelection();

    // Hide mascot while tutor is open
    if (typeof Mascot !== 'undefined') Mascot.onTutorToggle(true);

    // On tablet/desktop: shift question screen left; on mobile: prevent scroll
    const screenQ = _el('screen-question');
    if (window.innerWidth >= 768) {
      if (screenQ) screenQ.classList.add('tutor-open');
    } else {
      document.body.style.overflow = 'hidden';
    }
  }

  function openFreeMode(topic) {
    // Free users get 10 sessions + 3 images as trial — check if they have any left
    if (typeof Credits !== 'undefined' && !Credits.hasAiSession()) {
      Credits.showAiPaywall('session');
      return;
    }

    _freeModeTopic = (topic !== undefined ? topic : '');
    _currentQuestion = null;
    _currentTutor = null;
    _messages = [];

    const overlay = _el('tutor-overlay');
    if (!overlay) return;

    _show('tutor-overlay');
    _show('tutor-view-select');
    _hide('tutor-view-chat');
    _renderTutorSelection();
    document.body.style.overflow = 'hidden';
  }

  function close() {
    _hide('tutor-overlay');
    document.body.style.overflow = '';
    const screenQ = _el('screen-question');
    if (screenQ) screenQ.classList.remove('tutor-open');
    _currentTutor = null;
    _messages = [];

    // Re-show mascot
    if (typeof Mascot !== 'undefined') Mascot.onTutorToggle(false);
  }

  function _updateFreeTopic() {
    const input = _el('tutor-free-topic-input');
    if (!input) return;
    const newTopic = input.value.trim();
    if (newTopic === _freeModeTopic) return;
    _freeModeTopic = newTopic;
    _messages = [];
    _renderChat(true); // Reset chat with greeting for new topic
  }

  function selectTutor(key) {
    if (!TUTORS[key]) return;

    // KI-Session Paywall-Check
    if (typeof Credits !== 'undefined' && !Credits.hasAiSession()) {
      Credits.showAiPaywall('session');
      return;
    }

    // Deduct 1 AI session NOW (per chat opening = 1 session)
    // This means 10 sessions = 10 complete conversations, not 10 messages
    if (typeof Credits !== 'undefined') {
      Credits.useAiSession().catch(() => {});
    }

    _currentTutor = key;
    _messages = [];
    _bananaState = { contentType: 'eselsbruecke', stil: 'sketch', customStil: '', orientation: 'hochformat', hobby: '', customHobby: '', hobbyEnabled: false, extraDesc: '', textAmount: 'mittel', topic: '', visualHint: '', optimizedPrompt: '', wizardStep: 1, isGenerating: false };

    _hide('tutor-view-select');
    _show('tutor-view-chat');

    // For Banana: dedicated wizard flow (decoupled from chat tutors)
    if (key === 'banana') {
      _renderBananaWizard();
      return;
    }

    _renderChat(true);
  }

  // Public helpers for inline HTML handlers
  // ── Force re-login (clears expired session from localStorage) ──────────────
  async function _forceReLogin() {
    try {
      // Sign out clears the session from localStorage so the login form appears
      if (typeof Auth !== 'undefined') await Auth.signOut();
    } catch (_) {}
    // Close tutor overlay
    close();
    // Show login screen
    if (typeof App !== 'undefined' && App.showScreen) {
      App.showScreen('screen-auth');
    } else {
      location.reload();
    }
  }

  return {
    init,
    open,
    openFreeMode,
    close,
    selectTutor,
    _downloadImage,
    _downloadLastBanana,
    _fullscreenLastBanana,
    _openImageFullscreen,
    _saveBananaImage,
    _loadInScratchpad,
    _quickBananaOpen,
    _quickBananaClose,
    _quickBananaGenerate,
    _updateFreeTopic,
    _saveConversation,
    _toggleGuide,
    // Banana pre-selection helpers
    _backFromBananaWizard,
    // Chat restart + image regen
    _restartChat,
    _regenBananaImage,
    // Force re-login (clears broken session)
    _forceReLogin,
  };

})();

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Tutor.init());
} else {
  Tutor.init();
}
