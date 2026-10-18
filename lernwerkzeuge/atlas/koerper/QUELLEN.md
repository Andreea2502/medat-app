# Quellen: 3D-Atlas „Körper“

Stand: 07.10.2026 · gebaut mit `scripts/atlas-bauen.mjs` aus der Auswahl `scripts/atlas/koerper.json`

## Quelle und Lizenz

| | |
|---|---|
| Datenbank | BodyParts3D, Release 4.0 (Database Center for Life Science, DBCLS, Japan) |
| Datei | `isa_BP3D_4.0_obj_99.zip` (IS-A-Baum, Polygonreduktion 99 %, 142.903.898 Bytes, SHA-256 `40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e`) |
| Download | https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip, geladen am 07.10.2026 (Seite: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html) |
| Lizenz | Creative Commons Namensnennung 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ |
| Beleg | `../quellen/bodyparts3d-lizenz-2026-10-07.txt` (Textkopie von https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html, Stand der Seite 27.02.2025) |

Die Kopfzeilen der OBJ-Dateien nennen noch die frühere Lizenz „CC Attribution-Share Alike 2.1 Japan“. Die Lizenzseite
und die README der Datenbank stehen seit 27.02.2025 auf CC BY 4.0; das gilt für den ganzen Datensatz. Deshalb ist
die Lizenzseite gesichert.

**Nennungstext (Pflicht, so von DBCLS vorgegeben):**

> BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International

Für den Knopf „Quellen & Lizenzen“ im Werkzeug, auf Deutsch ergänzt:

> 3D-Modelle: BodyParts3D, © The Database Center for Life Science, lizenziert unter CC BY 4.0
> (https://creativecommons.org/licenses/by/4.0/). Für das Lehrerzimmer ausgewählt, zusammengefasst, verkleinert und umbenannt.

Der Nennungstext steht auch in jeder GLB-Datei (`asset.copyright`).

## Dateien

| Datei | Teile | Dreiecke | Größe |
|---|---|---|---|
| `skelett.glb` | 88 | 65.918 | 527 KB |
| `organe.glb` | 21 | 37.464 | 267 KB |
| `muskeln.glb` | 59 | 65.810 | 495 KB |
| `teile.json` | 168 Zeilen | | 41 KB |
| `vorschau-skelett.webp`, `vorschau-organe.webp`, `vorschau-muskeln.webp` | Standbild von vorne, 480 × 800 px, weißer Grund | | je 20–26 KB |

Welche BodyParts3D-Dateien (FJ-Nummern) in welchem Teil stecken, steht je Teil in `teile.json` (`fj`) und in
`scripts/atlas/koerper.json`.

## Änderungen gegenüber dem Original

- **Ausgewählt:** 168 Teile aus 2.234 Einzeldateien. Keine Geschlechtsorgane, keine Gefäße und Nerven (außer den Wurzeln der großen Gefäße
  am Herzen), keine Haut, keine Haare.
- **Zusammengefasst:** mehrere Einzeldateien zu einem Teil, z. B. die Schädelknochen zu „schaedel“, die Handwurzel-,
  Mittelhand- und Fingerknochen je Hand, die Fußknochen je Fuß, die Zahnreihen, alle Bandscheiben, Rippe mit
  Rippenknorpel, mehrteilige Muskeln (Deltamuskel, Bizeps, Trizeps, Kapuzenmuskel, großer Brustmuskel,
  vierköpfiger Oberschenkelmuskel, Schenkelbeuger, Zwillingswadenmuskel, Rückenstrecker, Adduktoren,
  oberflächliche Beuger und Strecker des Unterarms), Dünndarm (Zwölffinger-, Leer- und Krummdarm), Dickdarm mit
  Blinddarm, Wurmfortsatz und Mastdarm.
- **Umbenannt:** Knotennamen sind Teile-IDs (`femur-l`, `herz`, `lunge-r` …); `-l` ist die linke Körperseite.
- **Verkleinert:** jedes Teil mit meshoptimizer auf eine Dreieckszahl im Verhältnis zu seiner Oberfläche (mit
  Mindestzahl je Knochen, damit kleine Teile erkennbar bleiben); flache Splitter ohne Rauminhalt entfernt;
  Ecken verschweißt, Normalen neu berechnet. Alle Teile sind geschlossen (keine offenen Kanten).
- **Geglättete Hüllen:** Gehirn, Augen, Herz (mit Aorta und Lungenstamm), Leber und Harnblase über ein Voxelgitter
  zu einer glatten, geschlossenen Außenhaut verschmolzen (innere Wände und Klappen entfallen).
- **Lungen berechnet:** BodyParts3D 4.0 enthält kein Lungengewebe, nur Bronchialbaum und Lungengefäße. Die beiden
  Lungen sind daraus berechnete Hüllen (geschlossen mit einer 90-mm-Kugel, um 10 mm vergrößert, Herz, große
  Gefäße, Luft- und Speiseröhre und Zwerchfell ausgespart). Form und Lage stimmen, die Oberfläche ist vereinfacht.
- **Achsen und Einheit:** BodyParts3D rechnet in Millimetern mit Z nach oben, Gesicht nach −Y, linke Körperseite
  bei +X. Hier: Meter, Y nach oben, Gesicht nach +Z, linke Körperseite bei +X, Füße bei y = 0, Körpermitte bei
  x = z = 0. Umrechnung `x = X/1000`, `y = (Z + 70,5)/1000`, `z = −(Y + 109)/1000` (Ursprung aus dem Umriss des
  Skeletts; gleich für alle drei Dateien, sie passen übereinander). Körperhöhe 1,707 m.
- **Format:** glTF 2.0 binär, ein Knoten mit einem Mesh (ein Primitive) je Teil, keine Texturen,
  `EXT_meshopt_compression` und `KHR_mesh_quantization` (Normalen 8 Bit). Lädt mit dem three.js-GLTFLoader r186
  und `setMeshoptDecoder`.

## In BodyParts3D 4.0 nicht vorhanden

Gerader Bauchmuskel, breiter Rückenmuskel, Schläfen- und Kaumuskel, Steißbein und Lungengewebe gibt es im
Datensatz nicht. Die Lücke in der Bauchmitte schließt die weiße Linie (`weisse-linie`, Linea alba).

## Vorschaubilder

Aus den Prüfaufnahmen: three.js r186 in Chromium, orthografische Kamera von vorne, Farben je Schicht,
960 × 1600 px gerendert, auf 480 × 800 px verkleinert, WebP Qualität 90.
