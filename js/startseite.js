// === Neue Startseite (Entwurf A) ===
// Die alte Startseite bleibt im HTML und ist nur ausgeblendet. Zurück: NEUE_STARTSEITE auf false setzen.
(function () {
  const NEUE_STARTSEITE = true;
  if (!NEUE_STARTSEITE) return;
  document.documentElement.classList.add("neue-startseite");
  const $ = (id) => document.getElementById(id);

  // Steht die Person gerade auf der Startseite? (dann keine schwebenden Knöpfe)
  function startAktiv() {
    const h = $("screen-home");
    document.documentElement.classList.toggle("hn-auf-start", !!(h && h.classList.contains("active")));
  }

  // Gruß, Profil-Kürzel, Upgrade und Admin aus der bestehenden App übernehmen
  function kopf() {
    const g = $("hero-greeting");
    const text = g && g.textContent.trim();
    if (text) $("hn-gruss").textContent = text.replace(/!$/, "");
    let name = "";
    try { name = (Auth.userProfile && (Auth.userProfile.username || Auth.userProfile.display_name)) || (Auth.isLoggedIn ? Auth.displayName : "") || ""; } catch (e) {}
    const kuerzel = String(name).trim().split(/\s+/).map((w) => w[0] || "").join("").slice(0, 2).toUpperCase();
    $("hn-profil").textContent = kuerzel || "–";
    const up = $("hero-upgrade-btn");
    $("hn-upgrade").hidden = !(up && up.style.display !== "none");
    try { $("hn-admin").hidden = !(typeof Admin !== "undefined" && Admin.isAdmin()); } catch (e) { $("hn-admin").hidden = true; }
  }

  // Countdown – gleicher Termin wie in der App (nächster MedAT oder eigenes Datum)
  const zwei = (n) => String(n).padStart(2, "0");
  function countdown() {
    const ziel = (typeof App !== "undefined" && App._medatZiel) ? App._medatZiel : null;
    if (!ziel) return;
    const z = new Date(ziel.getTime()); z.setHours(8, 0, 0, 0);
    $("hn-bis").textContent = "Noch bis zum MedAT (" + z.toLocaleDateString("de-AT", { day: "numeric", month: "long", year: "numeric" }) + ")";
    let s = Math.floor((z - Date.now()) / 1000);
    if (s <= 0) { $("hn-t").textContent = "0"; $("hn-h").textContent = $("hn-m").textContent = $("hn-s").textContent = "00"; return; }
    const t = Math.floor(s / 86400); s -= t * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    $("hn-t").textContent = t; $("hn-h").textContent = zwei(h); $("hn-m").textContent = zwei(m); $("hn-s").textContent = zwei(s);
  }

  function assistent(text) { if (window.Assistent) Assistent.open(text); }

  function init() {
    if (!$("home-neu")) return;
    $("hn-menue").onclick = () => { const b = $("hamburger-btn"); if (b) b.click(); };
    $("hn-profil").onclick = () => { if (typeof App !== "undefined") App.showScreen(Auth && Auth.isLoggedIn ? "screen-profile" : "screen-auth"); };
    $("hn-admin").onclick = () => { App.showScreen("screen-admin"); if (typeof Admin !== "undefined") Admin.render(); };
    $("hn-upgrade").onclick = () => { App.showScreen("screen-konto"); App.renderKonto(); };
    $("hn-weiter").onclick = $("hn-ueben").onclick = () => App.openPracticeSelect();
    $("hn-frage").onsubmit = (e) => { e.preventDefault(); const q = $("hn-q").value.trim(); $("hn-q").value = ""; assistent(q || undefined); };
    document.querySelectorAll("#home-neu [data-as]").forEach((b) => { b.onclick = () => assistent(b.dataset.as); });
    document.querySelectorAll("#home-neu [data-lb]").forEach((b) => {
      b.onclick = () => { if (!window.LernBlick) return; if (b.dataset.lb === "thema") LernBlick.thema(); else LernBlick.open({ starters: true }); };
    });
    // Foto prüfen: Datei wählen, dann korrigiert LernBlick direkt auf dem Foto
    $("hn-foto").onclick = () => $("hn-foto-datei").click();
    $("hn-foto-datei").onchange = (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f && window.LernBlick && LernBlick.foto) LernBlick.foto(f); };
    // Diktieren (wenn der Browser es kann)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) $("hn-mic").hidden = true;
    else $("hn-mic").onclick = () => {
      const r = new SR(); r.lang = "de-AT"; r.interimResults = true;
      $("hn-mic").classList.add("hn-hoert");
      r.onresult = (ev) => { $("hn-q").value = [...ev.results].map((x) => x[0].transcript).join(" "); };
      r.onend = () => { $("hn-mic").classList.remove("hn-hoert"); if ($("hn-q").value.trim()) $("hn-frage").requestSubmit(); };
      r.start();
    };
    kopf(); countdown(); startAktiv();
    setInterval(countdown, 1000);
    setInterval(() => { kopf(); startAktiv(); }, 700);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
