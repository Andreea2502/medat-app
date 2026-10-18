/* MedAT: LernBlick auch in den Lernwerkzeugen (Bio-Labor).
   Lädt Supabase, die App-Konfiguration und LernBlick nach. Dieselbe Anmeldung wie in der App
   (gleiche Domain, gleiche gespeicherte Sitzung). */
(function () {
  if (window.__lbLaden) return; window.__lbLaden = true;
  var V = '20261018k';
  var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/css/lernblick.css?v=' + V; document.head.appendChild(css);
  function js(src, cb) { var s = document.createElement('script'); s.src = src; s.onload = cb; s.onerror = cb; document.head.appendChild(s); }
  function weiter() { js('/js/config.js?v=20260527a', function () { js('/js/lernblick.js?v=' + V); }); }
  if (window.supabase) weiter(); else js('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js', weiter);
})();
