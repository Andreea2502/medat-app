// === Figuren zusammensetzen – MedAT-konformer Generator v3 ===
// Based on official MedAT rules:
// - 13 standard shapes grouped by similarity
// - 3–7 pieces per figure (NEVER 2!)
// - Pieces may be ROTATED but NEVER mirrored
// - 5 answer options: A–D = complete figures, E = "Keine davon"
// - Distractors from SAME shape group for realistic difficulty

const FigurenGenerator = (() => {

  // ---- Seeded RNG (Mulberry32) ----
  function mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  let rng = Math.random;
  function rand(min, max) { return min + rng() * (max - min); }
  function randInt(min, max) { return Math.floor(rand(min, max + 0.999)); }
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }

  // ---- 2D Geometry Helpers ----
  function vecAdd(a, b) { return [a[0]+b[0], a[1]+b[1]]; }
  function vecSub(a, b) { return [a[0]-b[0], a[1]-b[1]]; }
  function vecScale(v, s) { return [v[0]*s, v[1]*s]; }
  function vecDot(a, b) { return a[0]*b[0] + a[1]*b[1]; }
  function vecRotate(v, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return [v[0]*c - v[1]*s, v[0]*s + v[1]*c];
  }

  function polyArea(pts) {
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      area += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
    }
    return area / 2;
  }

  function polyCentroid(pts) {
    const a = polyArea(pts);
    if (Math.abs(a) < 1e-8) {
      let cx = 0, cy = 0;
      for (const [x, y] of pts) { cx += x; cy += y; }
      return [cx / pts.length, cy / pts.length];
    }
    let cx = 0, cy = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      const f = pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
      cx += (pts[i][0] + pts[j][0]) * f;
      cy += (pts[i][1] + pts[j][1]) * f;
    }
    const div = 6 * a;
    return [cx / div, cy / div];
  }

  function polyBBox(pts) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of pts) {
      if (x < minX) minX = x; if (y < minY) minY = y;
      if (x > maxX) maxX = x; if (y > maxY) maxY = y;
    }
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }

  // =============================================
  // 13 STANDARD MedAT SHAPES (centered at origin)
  // =============================================

  function regularPoly(sides, radius = 45) {
    const pts = [];
    const offset = -Math.PI / 2;
    for (let i = 0; i < sides; i++) {
      const angle = offset + (2 * Math.PI * i) / sides;
      pts.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
    }
    return pts;
  }

  function arcPoints(cx, cy, r, startAngle, endAngle, steps = 24) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = startAngle + (endAngle - startAngle) * (i / steps);
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
  }

  function genDreieck()         { return regularPoly(3, 48); }
  function genQuadrat()         { return [[-42,-42],[42,-42],[42,42],[-42,42]]; }
  function genRechteck()        { return [[-50,-32],[50,-32],[50,32],[-50,32]]; }
  function genParallelogramm()  { return [[-32,-32],[48,-32],[32,32],[-48,32]]; }
  function genRaute()           { return [[0,-48],[30,0],[0,48],[-30,0]]; }
  function genTrapez()          { return [[-28,-34],[28,-34],[48,34],[-48,34]]; }
  function genFuenfeck()        { return regularPoly(5, 44); }
  function genSechseck()        { return regularPoly(6, 42); }
  function genSiebeneck()       { return regularPoly(7, 42); }
  function genAchteck()         { return regularPoly(8, 42); }

  function genViertelkreis() {
    const r = 48;
    return [[0, 0], ...arcPoints(0, 0, r, -Math.PI/2, 0, 16)];
  }
  function genHalbkreis() {
    const r = 44;
    const arc = arcPoints(0, 0, r, -Math.PI/2, Math.PI/2, 20);
    return [[0, -r], ...arc.slice(1), [0, r]];
  }
  function genDreiviertelkreis() {
    const r = 42;
    return [[0, 0], ...arcPoints(0, 0, r, -Math.PI/2, Math.PI, 24)];
  }
  function genKreis() {
    const r = 42;
    return arcPoints(0, 0, r, 0, Math.PI * 2 - 0.01, 32);
  }

  // =============================================
  // SHAPE REGISTRY with groups for distractor matching
  // =============================================

  const SHAPE_REGISTRY = {
    'Dreieck':          { gen: genDreieck,          groups: ['polygon', 'simple'] },
    'Quadrat':          { gen: genQuadrat,          groups: ['quad', 'polygon'] },
    'Rechteck':         { gen: genRechteck,         groups: ['quad', 'polygon'] },
    'Parallelogramm':   { gen: genParallelogramm,   groups: ['quad', 'polygon'] },
    'Raute':            { gen: genRaute,            groups: ['quad', 'polygon'] },
    'Trapez':           { gen: genTrapez,           groups: ['quad', 'polygon'] },
    'Fünfeck':          { gen: genFuenfeck,         groups: ['polygon', 'regular'] },
    'Sechseck':         { gen: genSechseck,         groups: ['polygon', 'regular'] },
    'Siebeneck':        { gen: genSiebeneck,        groups: ['polygon', 'regular'] },
    'Achteck':          { gen: genAchteck,          groups: ['polygon', 'regular'] },
    'Viertelkreis':     { gen: genViertelkreis,     groups: ['circle'] },
    'Halbkreis':        { gen: genHalbkreis,        groups: ['circle'] },
    'Dreiviertelkreis': { gen: genDreiviertelkreis, groups: ['circle'] },
    'Kreis':            { gen: genKreis,            groups: ['circle'] },
  };

  // Available shapes per difficulty
  const SHAPES_BY_DIFF = {
    easy:   ['Dreieck','Quadrat','Rechteck','Fünfeck','Sechseck','Halbkreis'],
    medium: ['Dreieck','Quadrat','Rechteck','Parallelogramm','Raute','Fünfeck','Sechseck','Achteck','Halbkreis','Viertelkreis'],
    hard:   Object.keys(SHAPE_REGISTRY),
  };

  function pickShapeName(difficulty) {
    const names = SHAPES_BY_DIFF[difficulty] || SHAPES_BY_DIFF.medium;
    return pick(names);
  }

  // =============================================
  // IMPROVED CUTTING – structured angles, no slivers
  // =============================================

  function splitPolygonByLine(poly, p1, p2) {
    const dir = vecSub(p2, p1);
    const norm = [dir[1], -dir[0]];
    const polyA = [], polyB = [];
    const n = poly.length;

    for (let i = 0; i < n; i++) {
      const curr = poly[i];
      const next = poly[(i + 1) % n];
      const dCurr = vecDot(vecSub(curr, p1), norm);
      const dNext = vecDot(vecSub(next, p1), norm);

      if (dCurr >= -1e-8) polyA.push(curr);
      if (dCurr <= 1e-8)  polyB.push(curr);

      if ((dCurr > 1e-8 && dNext < -1e-8) || (dCurr < -1e-8 && dNext > 1e-8)) {
        const t = dCurr / (dCurr - dNext);
        const inter = vecAdd(curr, vecScale(vecSub(next, curr), t));
        polyA.push(inter);
        polyB.push(inter);
      }
    }
    return [polyA, polyB].filter(p => p.length >= 3);
  }

  function pieceQuality(piece) {
    const area = Math.abs(polyArea(piece));
    const bbox = polyBBox(piece);
    const bboxArea = bbox.width * bbox.height;
    if (bboxArea < 1) return { area, aspect: 0, compactness: 0 };
    const aspect = Math.min(bbox.width, bbox.height) / Math.max(bbox.width, bbox.height);
    const compactness = area / bboxArea;
    return { area, aspect, compactness };
  }

  function splitFigure(poly, numCuts) {
    // Use structured cut angles for cleaner, more predictable pieces
    const structuredAngles = [0, Math.PI/6, Math.PI/4, Math.PI/3, Math.PI/2,
                              2*Math.PI/3, 3*Math.PI/4, 5*Math.PI/6];
    const shuffledAngles = shuffle([...structuredAngles]);

    let pieces = [poly];

    for (let cut = 0; cut < numCuts; cut++) {
      // Pick the largest piece to cut
      let bestIdx = 0, bestArea = 0;
      for (let i = 0; i < pieces.length; i++) {
        const a = Math.abs(polyArea(pieces[i]));
        if (a > bestArea) { bestArea = a; bestIdx = i; }
      }

      const target = pieces[bestIdx];
      const bbox = polyBBox(target);
      const cx = (bbox.minX + bbox.maxX) / 2;
      const cy = (bbox.minY + bbox.maxY) / 2;

      let bestSplit = null, bestScore = 0;

      for (let attempt = 0; attempt < 25; attempt++) {
        // Pick a structured angle with small random wobble
        const baseAngle = shuffledAngles[(cut * 7 + attempt) % shuffledAngles.length];
        const angle = baseAngle + rand(-0.12, 0.12);
        const dir = [Math.cos(angle), Math.sin(angle)];

        // Offset from center
        const offsetAmt = rand(-0.3, 0.3);
        const point = [cx + bbox.width * offsetAmt * Math.sin(angle),
                       cy + bbox.height * offsetAmt * Math.cos(angle)];

        const halves = splitPolygonByLine(target, point, vecAdd(point, dir));
        if (halves.length !== 2) continue;

        // Validate both halves
        const q0 = pieceQuality(halves[0]);
        const q1 = pieceQuality(halves[1]);

        // Reject thin slivers
        if (q0.area < 50 || q1.area < 50) continue;
        if (q0.aspect < 0.18 || q1.aspect < 0.18) continue;
        if (q0.compactness < 0.12 || q1.compactness < 0.12) continue;

        const ratio = Math.min(q0.area, q1.area) / Math.max(q0.area, q1.area);
        // Score: prefer balanced splits with good aspect ratios
        const score = ratio * (q0.aspect + q1.aspect) / 2;
        if (score > bestScore) {
          bestScore = score;
          bestSplit = halves;
        }
      }

      if (bestSplit) {
        pieces.splice(bestIdx, 1, ...bestSplit);
      }
    }

    return pieces;
  }

  // =============================================
  // GROUP-BASED DISTRACTOR GENERATION
  // =============================================

  function getGroupDistractors(correctName) {
    const correctInfo = SHAPE_REGISTRY[correctName];
    if (!correctInfo) return [];

    // Collect candidates scored by group similarity
    const candidates = [];
    for (const [name, info] of Object.entries(SHAPE_REGISTRY)) {
      if (name === correctName) continue;
      const sharedGroups = info.groups.filter(g => correctInfo.groups.includes(g));
      if (sharedGroups.length > 0) {
        candidates.push({ name, gen: info.gen, score: sharedGroups.length * 10 });
      }
    }

    // Sort by score (most similar first)
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  function deformShape(shape) {
    // Move 1-3 random vertices by 8-18% of shape size
    const bbox = polyBBox(shape);
    const size = Math.max(bbox.width, bbox.height);
    const numToMove = randInt(1, 3);
    const indices = [];
    while (indices.length < numToMove && indices.length < shape.length) {
      const idx = randInt(0, shape.length - 1);
      if (!indices.includes(idx)) indices.push(idx);
    }
    return shape.map(([x, y], i) => {
      if (indices.includes(i)) {
        return [x + rand(-size*0.14, size*0.14), y + rand(-size*0.14, size*0.14)];
      }
      return [x, y];
    });
  }

  function stretchShape(shape) {
    // Stretch in one axis to create visually similar but different shape
    const sx = rng() > 0.5 ? rand(0.7, 0.85) : rand(1.15, 1.35);
    const sy = 1.0 / sx; // Compensate to keep overall size similar
    return shape.map(([x, y]) => [x * sx, y * sy]);
  }

  function generateDistractors(baseFigure, shapeName) {
    const distractors = [];
    const needed = 4;

    // 1. Get same-group shapes (most important for realism!)
    const groupCandidates = getGroupDistractors(shapeName);
    const usedNames = new Set([shapeName]);

    // Take up to 3 different shapes from the same group
    for (const cand of groupCandidates) {
      if (distractors.length >= 3) break;
      if (usedNames.has(cand.name)) continue;
      usedNames.add(cand.name);
      const shape = cand.gen();
      // Apply slight random rotation for visual variety
      const angle = rand(0, Math.PI * 2);
      distractors.push(shape.map(p => vecRotate(p, angle)));
    }

    // 2. Fill remaining with deformed/stretched versions of correct shape
    let attempts = 0;
    while (distractors.length < needed && attempts < 20) {
      attempts++;
      const method = randInt(0, 1);
      let dist;
      if (method === 0) {
        dist = deformShape(baseFigure);
      } else {
        dist = stretchShape(baseFigure);
      }

      // Validate: must look different enough from correct and existing
      const dArea = Math.abs(polyArea(dist));
      const cArea = Math.abs(polyArea(baseFigure));
      if (cArea < 1 || dArea < 1) continue;

      const areaDiff = Math.abs(dArea - cArea) / cArea;
      if (areaDiff < 0.04) continue; // Too similar

      let tooSimilar = false;
      for (const ex of distractors) {
        const eArea = Math.abs(polyArea(ex));
        if (Math.abs(dArea - eArea) / Math.max(dArea, eArea, 1) < 0.03) {
          tooSimilar = true;
          break;
        }
      }
      if (tooSimilar) continue;

      distractors.push(dist);
    }

    // Absolute fallback: scaled versions
    while (distractors.length < needed) {
      const scale = 0.6 + distractors.length * 0.15;
      distractors.push(baseFigure.map(p => vecScale(p, scale)));
    }

    return distractors.slice(0, needed);
  }

  // =============================================
  // NORMALIZE for consistent display
  // =============================================

  function normalizePoly(pts, targetSize = 80) {
    const bbox = polyBBox(pts);
    const scale = targetSize / Math.max(bbox.width, bbox.height, 1);
    const cx = (bbox.minX + bbox.maxX) / 2;
    const cy = (bbox.minY + bbox.maxY) / 2;
    return pts.map(([x, y]) => [(x - cx) * scale, (y - cy) * scale]);
  }

  // =============================================
  // SVG RENDERING (for web UI)
  // =============================================

  function polyToPath(pts) {
    if (!pts || pts.length < 3) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ' Z';
  }

  function renderPieceSVG(pts, size = 90) {
    const normalized = normalizePoly(pts, size * 0.8);
    const half = size / 2;
    const path = polyToPath(normalized.map(([x, y]) => [x + half, y + half]));
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="figur-piece">
      <path d="${path}" fill="var(--figur-fill, #7BBFDE)" stroke="var(--figur-stroke, #2a5a7a)" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`;
  }

  function renderAnswerSVG(pts, size = 100) {
    const normalized = normalizePoly(pts, size * 0.75);
    const half = size / 2;
    const path = polyToPath(normalized.map(([x, y]) => [x + half, y + half]));
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="figur-answer-shape">
      <path d="${path}" fill="var(--figur-fill, #7BBFDE)" stroke="var(--figur-stroke, #2a5a7a)" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`;
  }

  // =============================================
  // MAIN QUESTION GENERATOR
  // =============================================

  function generate(difficulty = 'medium', seed = null) {
    if (seed !== null) {
      rng = mulberry32(seed);
    } else {
      rng = mulberry32(Date.now() + Math.floor(Math.random() * 100000));
    }

    // 1. Pick shape by name (for group-based distractor matching)
    const shapeName = pickShapeName(difficulty);
    const baseFigure = SHAPE_REGISTRY[shapeName].gen();

    // 2. Piece count based on difficulty
    const numCuts = difficulty === 'easy' ? randInt(2, 3) :    // 3–4 pieces
                    difficulty === 'hard' ? randInt(4, 6) :     // 5–7 pieces
                    randInt(3, 4);                               // 4–5 pieces

    // 3. Split into pieces (with quality checks)
    const pieces = splitFigure(baseFigure, numCuts);

    // Verify minimum 3 pieces
    if (pieces.length < 3) {
      return generate(difficulty, seed ? seed + 1 : null);
    }

    // 4. Scatter pieces with random rotations (NEVER mirrored!)
    const scatteredPieces = pieces.map(piece => {
      const angle = rand(0, Math.PI * 2);
      const centroid = polyCentroid(piece);
      return piece.map(p => vecRotate(vecSub(p, centroid), angle));
    });

    // 5. Generate group-based distractors
    const distractors = generateDistractors(baseFigure, shapeName);

    // 6. Decide if E is correct (15% chance)
    const eIsCorrect = rng() < 0.15;
    let options, correctIdx;

    if (eIsCorrect && distractors.length >= 4) {
      options = shuffle(distractors.slice(0, 4));
      correctIdx = 4; // E
    } else {
      const dists = shuffle(distractors.slice(0, 3));
      correctIdx = randInt(0, 3);
      options = [...dists];
      options.splice(correctIdx, 0, baseFigure);
    }

    return {
      pieces: scatteredPieces,
      originalPieces: pieces,
      options: options.map(opt => normalizePoly(opt)),
      correct: correctIdx,
      correctShape: normalizePoly(baseFigure),
      difficulty,
      numPieces: pieces.length,
      shapeName, // useful for debugging
    };
  }

  // =============================================
  // HTML RENDERING
  // =============================================

  function renderQuestion(questionData) {
    const { pieces, options, correct } = questionData;
    const labels = ['A', 'B', 'C', 'D', 'E'];

    let piecesHTML = '<div class="figur-pieces-row">';
    for (const piece of pieces) {
      piecesHTML += renderPieceSVG(piece, 80);
    }
    piecesHTML += '</div>';

    let optionsHTML = '<div class="figur-options-row">';
    for (let i = 0; i < 5; i++) {
      if (i < 4 && i < options.length) {
        optionsHTML += `
          <div class="figur-option" data-idx="${i}">
            ${renderAnswerSVG(options[i], 90)}
            <span class="figur-option-label">${labels[i]}</span>
          </div>`;
      } else if (i === 4) {
        optionsHTML += `
          <div class="figur-option figur-option-e" data-idx="4">
            <div class="figur-e-text">Keine der Antwort-<br>möglichkeiten<br>ist richtig.</div>
            <span class="figur-option-label">E</span>
          </div>`;
      }
    }
    optionsHTML += '</div>';

    return { piecesHTML, optionsHTML, correct };
  }

  // =============================================
  // SOLUTION RENDERING
  // =============================================

  function renderSolution(questionData, size = 180) {
    const { originalPieces } = questionData;
    if (!originalPieces || originalPieces.length < 2) return '';

    let gMinX = Infinity, gMinY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity;
    for (const piece of originalPieces) {
      for (const [x, y] of piece) {
        if (x < gMinX) gMinX = x; if (y < gMinY) gMinY = y;
        if (x > gMaxX) gMaxX = x; if (y > gMaxY) gMaxY = y;
      }
    }
    const gW = gMaxX - gMinX || 1, gH = gMaxY - gMinY || 1;
    const scale = (size * 0.8) / Math.max(gW, gH);
    const gcx = (gMinX + gMaxX) / 2, gcy = (gMinY + gMaxY) / 2;
    const half = size / 2;

    const colors = [
      '#7BBFDE', '#A8D8A8', '#F5C28D', '#D4A5D4', '#F2A3A3',
      '#B3D9F2', '#C9E8B3', '#FFD699', '#E0C4E0', '#F7C4C4'
    ];

    let paths = '';
    originalPieces.forEach((piece, idx) => {
      const translated = piece.map(([x, y]) => [
        (x - gcx) * scale + half,
        (y - gcy) * scale + half
      ]);
      const d = polyToPath(translated);
      const fill = colors[idx % colors.length];
      paths += `<path d="${d}" fill="${fill}" fill-opacity="0.55" stroke="var(--figur-stroke, #2a5a7a)" stroke-width="2" stroke-linejoin="round" stroke-dasharray="6,3"/>`;
    });

    const outerPts = questionData.correctShape.map(([x, y]) => [
      x * (size * 0.8 / 80) + half,
      y * (size * 0.8 / 80) + half
    ]);
    const outerD = polyToPath(outerPts);
    paths += `<path d="${outerD}" fill="none" stroke="var(--figur-stroke, #2a5a7a)" stroke-width="2.5" stroke-linejoin="round"/>`;

    return `<div class="figur-solution-wrap">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="figur-solution-svg">
        ${paths}
      </svg>
    </div>`;
  }

  // =============================================
  // STRATEGY TIPS
  // =============================================

  function generateTips(questionData, wasCorrect) {
    const { numPieces, difficulty } = questionData;
    const tips = [];

    if (!wasCorrect) {
      tips.push('💡 <strong>Umriss zuerst:</strong> Schau dir zuerst die äußere Form jedes Teils an. Welche Gesamtform könnten sie bilden? Ecken und gerade Kanten geben dir Hinweise.');

      if (numPieces >= 5) {
        tips.push('🧩 <strong>Große Teile zuerst:</strong> Bei vielen Teilen beginne mit den größten Stücken. Sie schränken die Möglichkeiten am meisten ein.');
      }

      tips.push('🔄 <strong>Drehung beachten:</strong> Denk daran, dass Teile gedreht, aber NIEMALS gespiegelt werden! Dreh die Teile im Kopf, bis die Kanten zusammenpassen.');

      if (difficulty === 'easy') {
        tips.push('📐 <strong>Fläche vergleichen:</strong> Schätze die Gesamtfläche aller Teile und vergleiche mit den Antwortoptionen.');
      } else if (difficulty === 'medium') {
        tips.push('🔍 <strong>Besondere Merkmale:</strong> Suche nach markanten Ecken, Einkerbungen oder geraden Kanten.');
        tips.push('⏱️ <strong>Ausschlussverfahren:</strong> Eliminiere zuerst die Antworten, die offensichtlich nicht passen.');
      } else {
        tips.push('🎯 <strong>Systematisch vorgehen:</strong> Nummeriere die Teile gedanklich und versuche, sie Schritt für Schritt anzulegen.');
        tips.push('🧠 <strong>Kanten zählen:</strong> Zähle die geraden Außenkanten aller Teile. Die Gesamtfigur hat weniger Außenkanten, weil innere Schnittkanten verschwinden.');
        tips.push('⏱️ <strong>Zeitmanagement:</strong> Du hast ~80 Sekunden pro Aufgabe. Wenn du nach 60 Sekunden keine Lösung hast, wähle die wahrscheinlichste Option.');
      }

      tips.push('🅴 <strong>Option E nicht vergessen:</strong> Prüfe immer, ob keine der Figuren A–D wirklich passt. Manchmal ist „Keine richtig" die korrekte Antwort!');
    } else {
      tips.push('✅ <strong>Gut gemacht!</strong> Du hast die Figur richtig erkannt.');
      if (numPieces >= 5) {
        tips.push('⭐ Besonders stark bei einer Aufgabe mit ' + numPieces + ' Teilen!');
      }
    }

    return tips;
  }

  // =============================================
  // BATCH GENERATE
  // =============================================

  function generateBatch(count, difficulty = 'medium') {
    const questions = [];
    const baseSeed = Date.now();
    for (let i = 0; i < count; i++) {
      const q = generate(difficulty, baseSeed + i * 7919);
      questions.push({
        id: `figur_${baseSeed}_${i}`,
        type: 'figur',
        content: q,
        difficulty
      });
    }
    return questions;
  }

  return { generate, renderQuestion, renderSolution, generateTips, generateBatch };
})();

if (typeof window !== 'undefined') {
  window.FigurenGenerator = FigurenGenerator;
}
