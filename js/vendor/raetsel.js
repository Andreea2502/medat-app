"use strict";
var Raetsel = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // _raetsel-entry.ts
  var raetsel_entry_exports = {};
  __export(raetsel_entry_exports, {
    legeRaetsel: () => legeRaetsel,
    legeSalat: () => legeSalat,
    nurBuchstaben: () => nurBuchstaben
  });

  // src/lib/presentation/kreuzwortraetsel.ts
  var RO_GRUND = {
    "\u0218": "S",
    "\u015E": "S",
    "\u021A": "T",
    "\u0162": "T",
    "\u0102": "A",
    "\xC2": "A",
    "\xCE": "I"
  };
  function samenZufall(samen) {
    let a = samen >>> 0;
    return () => {
      a = a + 1831565813 >>> 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function nurBuchstaben(s) {
    return s.toUpperCase().replace(/ẞ/g, "SS").replace(/[ȘŞȚŢĂÂÎ]/g, (z) => {
      var _a;
      return (_a = RO_GRUND[z]) != null ? _a : z;
    }).replace(/[^A-ZÄÖÜß]/g, "");
  }
  var schluessel = (z, s) => `${z}:${s}`;
  function lies(feld, z, s) {
    return feld.get(schluessel(z, s));
  }
  function passt(feld, wort, z, s, richtung, gesperrt, lexikon, neueLaeufe) {
    const waag = richtung === "waagrecht";
    const dz = waag ? 0 : 1;
    const ds = waag ? 1 : 0;
    if (lies(feld, z - dz, s - ds) !== void 0) return null;
    if (lies(feld, z + dz * wort.length, s + ds * wort.length) !== void 0) return null;
    if (gesperrt) {
      for (let i = 0; i < wort.length; i++) {
        if (gesperrt.has(schluessel(z + dz * i, s + ds * i))) return null;
      }
    }
    let kreuzungen = 0;
    for (let i = 0; i < wort.length; i++) {
      const zz = z + dz * i;
      const ss = s + ds * i;
      const da = lies(feld, zz, ss);
      if (da !== void 0) {
        if (da !== wort[i]) return null;
        kreuzungen++;
        continue;
      }
      const qz = waag ? 1 : 0, qs = waag ? 0 : 1;
      const vor = lies(feld, zz - qz, ss - qs), nach = lies(feld, zz + qz, ss + qs);
      if (vor !== void 0 || nach !== void 0) {
        if (!lexikon) return null;
        let a = 0;
        while (lies(feld, zz - qz * (a + 1), ss - qs * (a + 1)) !== void 0) a++;
        let b = 0;
        while (lies(feld, zz + qz * (b + 1), ss + qs * (b + 1)) !== void 0) b++;
        let folge = "";
        for (let k = -a; k <= b; k++) folge += k === 0 ? wort[i] : lies(feld, zz + qz * k, ss + qs * k);
        if (!lexikon.has(folge)) return null;
        const vz = zz - qz * (a + 1), vs = ss - qs * (a + 1);
        if (gesperrt && (gesperrt.has(schluessel(vz, vs)) || lies(feld, vz, vs) !== void 0)) return null;
        neueLaeufe == null ? void 0 : neueLaeufe.push({ wort: folge, z: vz + qz, s: vs + qs, richtung: waag ? "senkrecht" : "waagrecht" });
      }
    }
    return kreuzungen > 0 ? kreuzungen : null;
  }
  function schreibe(feld, wort, z, s, richtung) {
    const dz = richtung === "waagrecht" ? 0 : 1;
    const ds = richtung === "waagrecht" ? 1 : 0;
    for (let i = 0; i < wort.length; i++) feld.set(schluessel(z + dz * i, s + ds * i), wort[i]);
  }
  var RAETSEL_CACHE = /* @__PURE__ */ new Map();
  function legeRaetsel(roh, versuche = 12, art = "liste", ziel, dicht = false) {
    var _a, _b, _c, _d, _e;
    const gesehen = /* @__PURE__ */ new Set();
    const liste = [];
    const vorabRaus = [];
    for (const r of roh) {
      const w = nurBuchstaben(r.wort);
      if (w.length < 3 || w.length > 18) {
        if (w) vorabRaus.push(w);
        continue;
      }
      if (gesehen.has(w)) continue;
      gesehen.add(w);
      liste.push({ wort: w, frage: String((_a = r.frage) != null ? _a : "").trim(), fuell: r.fuell === true });
    }
    if (liste.length === 0) return { breite: 0, hoehe: 0, woerter: [], ausgelassen: vorabRaus };
    const lexikon = dicht ? new Set(liste.map((l) => l.wort)) : null;
    const frageZu = new Map(liste.map((l) => [l.wort, l.frage]));
    const nachLaenge = /* @__PURE__ */ new Map();
    for (const l of liste) {
      const arr = (_b = nachLaenge.get(l.wort.length)) != null ? _b : [];
      arr.push(l);
      nachLaenge.set(l.wort.length, arr);
    }
    let bestes = null;
    let besteZahl = -1;
    let besteWertung = -Infinity;
    if (ziel) versuche = Math.max(versuche, 120);
    const schluesselCache = JSON.stringify([liste.map((l) => l.wort + (l.fuell ? "*" : "")), art, ziel, dicht, versuche]);
    const gemerkt = RAETSEL_CACHE.get(schluesselCache);
    if (gemerkt) return gemerkt;
    const maxLaenge = ziel ? Math.max(ziel.breite, ziel.hoehe) - (art === "schwedisch" ? 1 : 0) : Infinity;
    const zuLang = liste.filter((l) => l.wort.length > maxLaenge);
    const legbar = liste.filter((l) => l.wort.length <= maxLaenge);
    if (!legbar.length) return { breite: 0, hoehe: 0, woerter: [], ausgelassen: [...vorabRaus, ...zuLang.map((l) => l.wort)] };
    for (let versuch = 0; versuch < versuche; versuch++) {
      const zufall2 = samenZufall(versuch * 7919 + 17);
      const gewicht = new Map(legbar.map((l) => [l.wort, versuch === 0 ? l.wort.length : l.wort.length + zufall2() * (versuch % 2 ? 9 : 5)]));
      const themen = legbar.filter((l) => !l.fuell).sort((a, b) => gewicht.get(b.wort) - gewicht.get(a.wort));
      const fuell = legbar.filter((l) => l.fuell).sort((a, b) => b.wort.length - a.wort.length);
      if (!themen.length) themen.push(...fuell.splice(0, 1));
      const sortiert = themen;
      const fuellVorrat = fuell.slice().sort((a, b) => a.wort.length - b.wort.length).slice(0, 220);
      const feld = /* @__PURE__ */ new Map();
      const gesperrt = /* @__PURE__ */ new Set();
      const gelegt = [];
      let startRichtung = versuch % 3 === 2 ? "senkrecht" : "waagrecht";
      if (ziel && sortiert[0].wort.length > (startRichtung === "senkrecht" ? ziel.hoehe : ziel.breite) - (art === "schwedisch" ? 1 : 0)) {
        startRichtung = startRichtung === "senkrecht" ? "waagrecht" : "senkrecht";
      }
      schreibe(feld, sortiert[0].wort, 0, 0, startRichtung);
      gelegt.push({ ...sortiert[0], z: 0, s: 0, richtung: startRichtung });
      if (art === "schwedisch") gesperrt.add(startRichtung === "waagrecht" ? schluessel(0, -1) : schluessel(-1, 0));
      const rahmen = {
        minZ: art === "schwedisch" && startRichtung === "senkrecht" ? -1 : 0,
        maxZ: startRichtung === "senkrecht" ? sortiert[0].wort.length - 1 : 0,
        minS: art === "schwedisch" && startRichtung === "waagrecht" ? -1 : 0,
        maxS: startRichtung === "waagrecht" ? sortiert[0].wort.length - 1 : 0
      };
      let kreuzungen = 0;
      const schonDa = /* @__PURE__ */ new Set([sortiert[0].wort]);
      let offen = sortiert.slice(1);
      for (let runde = 0; runde < 4 && offen.length; runde++) {
        const nochOffen = [];
        for (const r of offen) {
          if (schonDa.has(r.wort)) continue;
          let beste = null;
          for (const g of gelegt) {
            const quer = g.richtung === "waagrecht" ? "senkrecht" : "waagrecht";
            for (let i = 0; i < g.wort.length; i++) {
              const bz = g.richtung === "waagrecht" ? g.z : g.z + i;
              const bs = g.richtung === "waagrecht" ? g.s + i : g.s;
              for (let j = 0; j < r.wort.length; j++) {
                if (r.wort[j] !== g.wort[i]) continue;
                const z = quer === "waagrecht" ? bz : bz - j;
                const s = quer === "waagrecht" ? bs - j : bs;
                const laeufe = [];
                const kreuz = passt(feld, r.wort, z, s, quer, art === "schwedisch" ? gesperrt : void 0, lexikon, laeufe);
                if (kreuz === null) continue;
                if (laeufe.some((l) => schonDa.has(l.wort)) || new Set(laeufe.map((l) => l.wort)).size !== laeufe.length) continue;
                if (art === "schwedisch") {
                  const [fz, fs] = quer === "waagrecht" ? [z, s - 1] : [z - 1, s];
                  if (lies(feld, fz, fs) !== void 0) continue;
                }
                if (ziel) {
                  const ez = quer === "senkrecht" ? z + r.wort.length - 1 : z;
                  const es = quer === "waagrecht" ? s + r.wort.length - 1 : s;
                  const fz = art === "schwedisch" && quer === "senkrecht" ? z - 1 : z;
                  const fs = art === "schwedisch" && quer === "waagrecht" ? s - 1 : s;
                  if (Math.max(rahmen.maxZ, ez) - Math.min(rahmen.minZ, fz) + 1 > ziel.hoehe) continue;
                  if (Math.max(rahmen.maxS, es) - Math.min(rahmen.minS, fs) + 1 > ziel.breite) continue;
                }
                const ez2 = quer === "senkrecht" ? z + r.wort.length - 1 : z;
                const es2 = quer === "waagrecht" ? s + r.wort.length - 1 : s;
                const hoeheNeu = Math.max(rahmen.maxZ, ez2) - Math.min(rahmen.minZ, z) + 1;
                const breiteNeu = Math.max(rahmen.maxS, es2) - Math.min(rahmen.minS, s) + 1;
                const wachstum = hoeheNeu * breiteNeu - (rahmen.maxZ - rahmen.minZ + 1) * (rahmen.maxS - rahmen.minS + 1);
                const mz = (rahmen.minZ + rahmen.maxZ) / 2, ms = (rahmen.minS + rahmen.maxS) / 2;
                const wz = quer === "senkrecht" ? z + r.wort.length / 2 : z, ws = quer === "waagrecht" ? s + r.wort.length / 2 : s;
                const form = ziel ? -Math.abs(hoeheNeu / ziel.hoehe - breiteNeu / ziel.breite) * 40 : 0;
                const punkte = kreuz * 100 + laeufe.length * 150 - wachstum * (ziel ? 0.3 : 1) - (Math.abs(wz - mz) + Math.abs(ws - ms)) * 1.5 + form;
                if (!beste || punkte > beste.punkte) beste = { z, s, richtung: quer, punkte, kreuz, laeufe };
              }
            }
          }
          if (beste) {
            schreibe(feld, r.wort, beste.z, beste.s, beste.richtung);
            gelegt.push({ ...r, z: beste.z, s: beste.s, richtung: beste.richtung });
            schonDa.add(r.wort);
            kreuzungen += beste.kreuz;
            for (const l of beste.laeufe) {
              gelegt.push({ wort: l.wort, frage: (_c = frageZu.get(l.wort)) != null ? _c : "", z: l.z, s: l.s, richtung: l.richtung });
              schonDa.add(l.wort);
              kreuzungen += l.wort.length;
              if (art === "schwedisch") gesperrt.add(l.richtung === "waagrecht" ? schluessel(l.z, l.s - 1) : schluessel(l.z - 1, l.s));
            }
            rahmen.minZ = Math.min(rahmen.minZ, art === "schwedisch" && beste.richtung === "senkrecht" ? beste.z - 1 : beste.z);
            rahmen.minS = Math.min(rahmen.minS, art === "schwedisch" && beste.richtung === "waagrecht" ? beste.s - 1 : beste.s);
            rahmen.maxZ = Math.max(rahmen.maxZ, beste.richtung === "senkrecht" ? beste.z + r.wort.length - 1 : beste.z);
            rahmen.maxS = Math.max(rahmen.maxS, beste.richtung === "waagrecht" ? beste.s + r.wort.length - 1 : beste.s);
            if (art === "schwedisch") {
              const [fz, fs] = beste.richtung === "waagrecht" ? [beste.z, beste.s - 1] : [beste.z - 1, beste.s];
              gesperrt.add(schluessel(fz, fs));
            }
          } else nochOffen.push(r);
        }
        if (nochOffen.length === offen.length) break;
        offen = nochOffen;
      }
      if (dicht && ziel) {
        const start = Date.now();
        let fortschritt = true;
        let runden = 0;
        const maxLen = Math.min(12, Math.max(...liste.map((l) => l.wort.length)));
        while (fortschritt && runden++ < 4 && Date.now() - start < 1500) {
          fortschritt = false;
          for (let z = rahmen.minZ - 1; z <= rahmen.maxZ + 1; z++) {
            for (let s2 = rahmen.minS - 1; s2 <= rahmen.maxS + 1; s2++) {
              if (ziel.maxWoerter && gelegt.length >= ziel.maxWoerter) break;
              for (const richtung of ["waagrecht", "senkrecht"]) {
                if (lies(feld, richtung === "waagrecht" ? z : z - 1, richtung === "waagrecht" ? s2 - 1 : s2) !== void 0) continue;
                for (let len = 2; len <= maxLen; len++) {
                  const ez = richtung === "senkrecht" ? z + len - 1 : z;
                  const es = richtung === "waagrecht" ? s2 + len - 1 : s2;
                  const fz = art === "schwedisch" && richtung === "senkrecht" ? z - 1 : z;
                  const fs = art === "schwedisch" && richtung === "waagrecht" ? s2 - 1 : s2;
                  if (Math.max(rahmen.maxZ, ez) - Math.min(rahmen.minZ, fz) + 1 > ziel.hoehe) break;
                  if (Math.max(rahmen.maxS, es) - Math.min(rahmen.minS, fs) + 1 > ziel.breite) break;
                  let muster = "", feste = 0, beruehrt = false;
                  for (let i = 0; i < len; i++) {
                    const cz = richtung === "senkrecht" ? z + i : z, cs = richtung === "waagrecht" ? s2 + i : s2;
                    const ch = lies(feld, cz, cs);
                    if (ch !== void 0) {
                      muster += ch;
                      feste++;
                    } else {
                      muster += ".";
                      const qz = richtung === "waagrecht" ? 1 : 0, qs = richtung === "waagrecht" ? 0 : 1;
                      if (lies(feld, cz - qz, cs - qs) !== void 0 || lies(feld, cz + qz, cs + qs) !== void 0) beruehrt = true;
                    }
                  }
                  if (feste === len) continue;
                  if (!feste && !beruehrt) continue;
                  if (art === "schwedisch" && lies(feld, fz, fs) !== void 0) continue;
                  const re = new RegExp("^" + muster + "$");
                  const kandidaten = ((_d = nachLaenge.get(len)) != null ? _d : []).filter((l) => !schonDa.has(l.wort) && re.test(l.wort));
                  if (!kandidaten.length) continue;
                  let beste = null;
                  for (const r2 of kandidaten) {
                    const laeufe = [];
                    const kreuz = passt(feld, r2.wort, z, s2, richtung, art === "schwedisch" ? gesperrt : void 0, lexikon, laeufe);
                    if (kreuz === null || kreuz === 0 && laeufe.length === 0) continue;
                    if (laeufe.some((l) => schonDa.has(l.wort)) || new Set(laeufe.map((l) => l.wort)).size !== laeufe.length) continue;
                    const punkte = kreuz * 100 + laeufe.length * 150 + (r2.fuell ? 0 : 400) + len * 5;
                    if (!beste || punkte > beste.punkte) beste = { r: r2, kreuz, laeufe, punkte };
                  }
                  if (!beste) continue;
                  const r = beste.r;
                  schreibe(feld, r.wort, z, s2, richtung);
                  gelegt.push({ ...r, z, s: s2, richtung });
                  schonDa.add(r.wort);
                  kreuzungen += beste.kreuz;
                  if (art === "schwedisch") gesperrt.add(richtung === "waagrecht" ? schluessel(z, s2 - 1) : schluessel(z - 1, s2));
                  for (const l of beste.laeufe) {
                    gelegt.push({ wort: l.wort, frage: (_e = frageZu.get(l.wort)) != null ? _e : "", z: l.z, s: l.s, richtung: l.richtung });
                    schonDa.add(l.wort);
                    kreuzungen += l.wort.length;
                    if (art === "schwedisch") gesperrt.add(l.richtung === "waagrecht" ? schluessel(l.z, l.s - 1) : schluessel(l.z - 1, l.s));
                  }
                  rahmen.minZ = Math.min(rahmen.minZ, fz);
                  rahmen.minS = Math.min(rahmen.minS, fs);
                  rahmen.maxZ = Math.max(rahmen.maxZ, ez);
                  rahmen.maxS = Math.max(rahmen.maxS, es);
                  fortschritt = true;
                  break;
                }
              }
            }
          }
        }
      }
      const flaeche = (rahmen.maxZ - rahmen.minZ + 1) * (rahmen.maxS - rahmen.minS + 1);
      const themenGelegt = gelegt.filter((g) => {
        var _a2;
        return !((_a2 = liste.find((l) => l.wort === g.wort)) == null ? void 0 : _a2.fuell);
      }).length;
      const wertung = ziel ? themenGelegt * 1e3 + (gelegt.length - themenGelegt) * 120 + kreuzungen * 20 - flaeche : gelegt.length * 1e3 + kreuzungen * 10 - flaeche * 0.05;
      if (wertung > besteWertung) {
        besteWertung = wertung;
        besteZahl = gelegt.length;
        bestes = { gelegt, feld, gesperrt };
        if (!ziel && gelegt.length === liste.length) break;
      }
      if (ziel && versuch >= 40 && bestes && bestes.gelegt.length >= legbar.filter((l) => !l.fuell).length) {
        break;
      }
    }
    if (!bestes) return { breite: 0, hoehe: 0, woerter: [], ausgelassen: [...vorabRaus, ...liste.map((l) => l.wort)] };
    const roheGelegt = bestes.gelegt;
    let minZ = Infinity, maxZ = -Infinity, minS = Infinity, maxS = -Infinity;
    const alleFelder = art === "schwedisch" ? [...bestes.feld.keys(), ...bestes.gesperrt] : [...bestes.feld.keys()];
    for (const k of alleFelder) {
      const [z, s] = k.split(":").map(Number);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
      minS = Math.min(minS, s);
      maxS = Math.max(maxS, s);
    }
    const anfaenge = roheGelegt.map((g) => ({ ...g, z: g.z - minZ, s: g.s - minS })).sort((a, b) => a.z - b.z || a.s - b.s);
    const nummerAn = /* @__PURE__ */ new Map();
    let n = 0;
    const woerter = [];
    for (const g of anfaenge) {
      const k = schluessel(g.z, g.s);
      if (!nummerAn.has(k)) nummerAn.set(k, ++n);
      woerter.push({
        wort: g.wort,
        frage: g.frage,
        zeile: g.z,
        spalte: g.s,
        richtung: g.richtung,
        nummer: nummerAn.get(k),
        fragefeld: art === "schwedisch" ? g.richtung === "waagrecht" ? { zeile: g.z, spalte: g.s - 1 } : { zeile: g.z - 1, spalte: g.s } : null
      });
    }
    const untergebracht = new Set(woerter.map((w) => w.wort));
    const ergebnis = {
      breite: maxS - minS + 1,
      hoehe: maxZ - minZ + 1,
      woerter,
      /* Füllwörter, die nicht ins Gitter kamen, sind kein Verlust — nur Themenwörter werden gemeldet. */
      ausgelassen: [...vorabRaus, ...liste.filter((l) => !l.fuell && !untergebracht.has(l.wort)).map((l) => l.wort)]
    };
    if (RAETSEL_CACHE.size > 60) RAETSEL_CACHE.delete(RAETSEL_CACHE.keys().next().value);
    RAETSEL_CACHE.set(schluesselCache, ergebnis);
    return ergebnis;
  }

  // src/lib/presentation/buchstabensalat.ts
  var SCHRITT = {
    rechts: [0, 1],
    runter: [1, 0],
    "rechts-runter": [1, 1],
    "rechts-hoch": [-1, 1],
    links: [0, -1],
    hoch: [-1, 0],
    "links-hoch": [-1, -1],
    "links-runter": [1, -1]
  };
  var RICHTUNGEN = {
    /* Volksschule: nur vorwärts lesen, waagrecht und senkrecht. */
    leicht: ["rechts", "runter"],
    /* Dazu die beiden Schrägen — noch immer alles vorwärts. */
    mittel: ["rechts", "runter", "rechts-runter", "rechts-hoch"],
    /* Auch rückwärts. Das ist die Fassung aus dem Rätselheft. */
    schwer: ["rechts", "runter", "rechts-runter", "rechts-hoch", "links", "hoch", "links-hoch", "links-runter"]
  };
  function zufall(startwert) {
    let z = startwert >>> 0 || 1;
    return () => {
      z ^= z << 13;
      z >>>= 0;
      z ^= z >> 17;
      z ^= z << 5;
      z >>>= 0;
      return z / 4294967296;
    };
  }
  function startwertAus(woerter) {
    let h = 2166136261;
    for (const w of woerter) {
      for (let i = 0; i < w.length; i++) {
        h ^= w.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
    }
    return h >>> 0;
  }
  var FUELLER = {
    de: "EEEEEEENNNNNIIIIISSSSRRRRAAAATTTDDHHUULLCCGGMMOOBBWWFFKKZPVJYXQ",
    en: "EEEEEEETTTTTAAAAAOOOOIIIINNNSSSHHRRDDLLCCUUMMWWFFGGYYPPBVKJXQZ",
    ro: "EEEEEEAAAAAIIIIIRRRRNNNNTTTUUUSSSCCCLLOOPPMMDDFVGBZHJXKQWY"
  };
  function legeSalat(roh, opt = {}) {
    var _a, _b, _c, _d, _e;
    const stufe = (_a = opt.stufe) != null ? _a : "mittel";
    const richtungen = RICHTUNGEN[stufe];
    const gesehen = /* @__PURE__ */ new Set();
    const woerter = [];
    const vorabRaus = [];
    for (const r of roh) {
      const w = nurBuchstaben(r);
      if (w.length < 3 || w.length > 16) {
        if (w) vorabRaus.push(w);
        continue;
      }
      if (gesehen.has(w)) continue;
      gesehen.add(w);
      woerter.push(w);
    }
    if (!woerter.length) return { breite: 0, hoehe: 0, felder: [], woerter: [], ausgelassen: vorabRaus };
    const laengstes = Math.max(...woerter.map((w) => w.length));
    const buchstaben = woerter.reduce((n, w) => n + w.length, 0);
    const nachInhalt = Math.ceil(Math.sqrt(buchstaben * 2));
    const kante = Math.min(20, Math.max((_b = opt.groesse) != null ? _b : 0, laengstes + 1, nachInhalt));
    const wuerfel = zufall(startwertAus(woerter));
    const feld = Array.from({ length: kante }, () => Array(kante).fill(null));
    const gelegt = [];
    const nichtGelegt = [];
    for (const wort of [...woerter].sort((a, b) => b.length - a.length)) {
      const plaetze = [];
      for (const richtung of richtungen) {
        const [dz2, ds2] = SCHRITT[richtung];
        for (let z = 0; z < kante; z++) {
          for (let s = 0; s < kante; s++) {
            const endeZ = z + dz2 * (wort.length - 1);
            const endeS = s + ds2 * (wort.length - 1);
            if (endeZ < 0 || endeZ >= kante || endeS < 0 || endeS >= kante) continue;
            let geht = true;
            for (let i = 0; i < wort.length; i++) {
              const da = feld[z + dz2 * i][s + ds2 * i];
              if (da !== null && da !== wort[i]) {
                geht = false;
                break;
              }
            }
            if (geht) plaetze.push({ wort, zeile: z, spalte: s, richtung });
          }
        }
      }
      if (!plaetze.length) {
        nichtGelegt.push(wort);
        continue;
      }
      let beste = plaetze[0];
      let besteZahl = -1;
      for (const p of plaetze) {
        const [dz2, ds2] = SCHRITT[p.richtung];
        let kreuz = 0;
        for (let i = 0; i < wort.length; i++) if (feld[p.zeile + dz2 * i][p.spalte + ds2 * i] !== null) kreuz++;
        const punkte = kreuz * 10 + wuerfel();
        if (punkte > besteZahl) {
          besteZahl = punkte;
          beste = p;
        }
      }
      const [dz, ds] = SCHRITT[beste.richtung];
      for (let i = 0; i < wort.length; i++) feld[beste.zeile + dz * i][beste.spalte + ds * i] = wort[i];
      gelegt.push(beste);
    }
    const vorrat = (_e = FUELLER[(_d = (_c = opt.sprache) == null ? void 0 : _c.slice(0, 2)) != null ? _d : "de"]) != null ? _e : FUELLER.de;
    const felder = feld.map(
      (zeile) => zeile.map((z) => z != null ? z : vorrat[Math.floor(wuerfel() * vorrat.length)]).join("")
    );
    return { breite: kante, hoehe: kante, felder, woerter: gelegt, ausgelassen: [...vorabRaus, ...nichtGelegt] };
  }
  return __toCommonJS(raetsel_entry_exports);
})();
