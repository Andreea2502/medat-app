// === MedAT KFF Trainer – Konfiguration ===
// Exakte MedAT-H Testspezifikationen

const CONFIG = {
  SUPABASE_URL: 'https://vbmhkdrpglezbznnwpws.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZibWhrZHJwZ2xlemJ6bm53cHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwOTAzNzAsImV4cCI6MjA4NDY2NjM3MH0.zsrzk9VxlFaWo7wiAEoPqXoNhONmv85tOBYqu6BFhaE',

  // ===== MedAT-H Testblöcke =====
  TEST_BLOCKS: {
    bms: {
      id: 'bms',
      label: 'BMS',
      fullLabel: 'Basiskenntnistest für medizinische Studien',
      weight: 40,
      icon: 'flask',
      color: '#e0a820',
      gradient: 'linear-gradient(135deg, #f5c542, #e0a820)',
      sections: {
        biologie:    { label: 'Biologie',    icon: 'dna',      questions: 40, minutes: 30, dbType: 'bms', dbSubtype: 'biologie' },
        chemie:      { label: 'Chemie',      icon: 'testTube', questions: 24, minutes: 18, dbType: 'bms', dbSubtype: 'chemie' },
        physik:      { label: 'Physik',      icon: 'atom',     questions: 18, minutes: 16, dbType: 'bms', dbSubtype: 'physik' },
        mathematik:  { label: 'Mathematik',  icon: 'ruler',    questions: 12, minutes: 11, dbType: 'bms', dbSubtype: 'mathematik' },
      }
    },
    tv: {
      id: 'tv',
      label: 'TV',
      fullLabel: 'Textverständnis',
      weight: 10,
      icon: 'bookRead',
      color: '#6db88a',
      gradient: 'linear-gradient(135deg, #6db88a, #4a9e6e)',
      sections: {
        textverstaendnis: { label: 'Textverständnis', icon: 'bookRead', questions: 12, minutes: 35, dbType: 'textverstaendnis', dbSubtype: null, isAIGenerated: true, textCount: 4, questionsPerText: 3 },
      }
    },
    kff: {
      id: 'kff',
      label: 'KFF',
      fullLabel: 'Kognitive Fähigkeiten und Fertigkeiten',
      weight: 40,
      icon: 'brain',
      color: '#9b7fc4',
      gradient: 'linear-gradient(135deg, #9b7fc4, #7a5fb0)',
      sections: {
        figuren:             { label: 'Figuren zusammensetzen',    icon: 'puzzle',         questions: 15, minutes: 20, dbType: 'figur', dbSubtype: null, available: true },
        allergieausweis_mem: { label: 'Allergieausweise einprägen', icon: 'clipboard',      questions: 8,  minutes: 8,  dbType: 'allergieausweis_frage', dbSubtype: null, isMemorize: true },
        zahlenfolge:         { label: 'Zahlenfolgen',              icon: 'hash',           questions: 10, minutes: 15, dbType: 'zahlenfolge', dbSubtype: null },
        wortfluessigkeit:    { label: 'Wortflüssigkeit',           icon: 'textLines',      questions: 15, minutes: 20, dbType: 'wortfluessigkeit', dbSubtype: null },
        allergieausweis_abruf: { label: 'Allergieausweise abrufen', icon: 'clipboardCheck', questions: 25, minutes: 15, dbType: 'allergieausweis_frage', dbSubtype: null, isRecall: true },
        implikation:         { label: 'Implikationen erkennen',    icon: 'brainCog',       questions: 10, minutes: 10, dbType: 'implikation', dbSubtype: null },
      }
    },
    sek: {
      id: 'sek',
      label: 'SEK',
      fullLabel: 'Sozial-emotionale Kompetenzen',
      weight: 10,
      icon: 'heart',
      color: '#e0734a',
      gradient: 'linear-gradient(135deg, #f5a68e, #c8644a)',
      sections: {
        emotionen_erkennen:   { label: 'Emotionen erkennen',   icon: 'eye',   questions: 14, minutes: 21, dbType: 'sek_ee', dbSubtype: 'erkennen', isAIGenerated: true },
        emotionen_regulieren: { label: 'Emotionen regulieren', icon: 'smile', questions: 12, minutes: 18, dbType: 'sek_er', dbSubtype: 'regulieren', isAIGenerated: true },
        soziales_entscheiden: { label: 'Soziales Entscheiden', icon: 'users', questions: 14, minutes: 21, dbType: 'sek_se', dbSubtype: 'entscheiden', isAIGenerated: true, isRanking: true },
      }
    }
  },

  // Simulation: Reihenfolge der Blöcke
  SIMULATION_ORDER: ['bms', 'tv', 'kff', 'sek'],

  // KFF-Sektion Reihenfolge in Simulation (wichtig für Allergieausweis Einprägen → Abruf)
  KFF_SECTION_ORDER: ['figuren', 'allergieausweis_mem', 'zahlenfolge', 'wortfluessigkeit', 'allergieausweis_abruf', 'implikation'],

  // SEK-Sektion Reihenfolge in Simulation
  SEK_SECTION_ORDER: ['emotionen_erkennen', 'emotionen_regulieren', 'soziales_entscheiden'],

  // ===== Topic-Definitionen pro BMS-Fach =====
  BMS_TOPICS: {
    biologie: [
      'Atmungssystem', 'Bewegungsapparat', 'Fortpflanzung & Entwicklung',
      'Genetik & Molekularbiologie', 'Gewebe & Histologie', 'Herz-Kreislauf-System',
      'Hormonsystem', 'Humangenetik', 'Immunsystem', 'Methoden der Gentechnik',
      'Nervensystem', 'Niere & Harnwege',
      'Ökologie & Evolution', 'Stoffwechsel', 'Verdauungssystem', 'Zellbiologie'
    ],
    chemie: [
      'Atombau & PSE', 'Chemische Bindung', 'Chemisches Gleichgewicht',
      'Elemente & Verbindungen', 'Gasgesetze & Aggregatzustände', 'Naturstoffe',
      'Organische Chemie', 'Redox & Elektrochemie', 'Säure-Base',
      'Stöchiometrie & Reaktionen'
    ],
    physik: [
      'Mechanik', 'Thermodynamik', 'Elektrizität & Magnetismus',
      'Optik', 'Wellen & Akustik', 'Atomphysik & Radioaktivität'
    ],
    mathematik: [
      'Algebra & Gleichungen', 'Funktionen & Analysis', 'Geometrie & Trigonometrie',
      'Statistik & Wahrscheinlichkeit', 'Prozent- & Zinsrechnung', 'Einheiten & Umrechnung'
    ]
  },

  // Topic-Icons (Emoji als einfache visuelle Hilfe)
  TOPIC_ICONS: {
    'Atmungssystem': '🫁', 'Bewegungsapparat': '🦴', 'Fortpflanzung & Entwicklung': '🤰',
    'Genetik & Molekularbiologie': '🧬', 'Gewebe & Histologie': '🔬', 'Herz-Kreislauf-System': '❤️',
    'Hormonsystem': '⚗️', 'Humangenetik': '👨‍👩‍👧', 'Immunsystem': '🛡️', 'Methoden der Gentechnik': '🔬',
    'Nervensystem': '🧠', 'Niere & Harnwege': '💧',
    'Ökologie & Evolution': '🌿', 'Stoffwechsel': '⚡', 'Verdauungssystem': '🍽️', 'Zellbiologie': '🦠',
    'Atombau & PSE': '⚛️', 'Chemische Bindung': '🔗', 'Chemisches Gleichgewicht': '⚖️',
    'Elemente & Verbindungen': '🧪', 'Gasgesetze & Aggregatzustände': '💨', 'Naturstoffe': '🌱',
    'Organische Chemie': '🔥', 'Redox & Elektrochemie': '🔋', 'Säure-Base': '🧫',
    'Stöchiometrie & Reaktionen': '📊', 'Mechanik': '⚙️', 'Thermodynamik': '🌡️',
    'Elektrizität & Magnetismus': '⚡', 'Optik': '🔦', 'Wellen & Akustik': '🔊',
    'Atomphysik & Radioaktivität': '☢️', 'Algebra & Gleichungen': '➗', 'Funktionen & Analysis': '📈',
    'Geometrie & Trigonometrie': '📐', 'Statistik & Wahrscheinlichkeit': '🎲',
    'Prozent- & Zinsrechnung': '💰', 'Einheiten & Umrechnung': '📏'
  },

  getSessionId() {
    let sid = localStorage.getItem('medat_session_id');
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem('medat_session_id', sid);
    }
    return sid;
  }
};
