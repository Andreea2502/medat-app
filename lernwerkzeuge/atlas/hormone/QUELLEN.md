# Quellen: 3D-Atlas „Hormone“

Stand: 18.10.2026 · gebaut mit `node scripts/atlas-bauen.mjs --thema hormone` aus der Auswahl `scripts/atlas/hormone.json`
· verwendet im Werkzeug `../../wissenslab/bio-hormonsystem.html`

## Quelle und Lizenz

| | |
|---|---|
| Datenbank | BodyParts3D, Release 4.0 (Database Center for Life Science, DBCLS, Japan) — dieselbe Quelle wie `../koerper/` |
| Datei | `isa_BP3D_4.0_obj_99.zip` (IS-A-Baum, Polygonreduktion 99 %, 142.903.898 Bytes, SHA-256 `40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e`; am 18.10.2026 nachgeprüft, gleiche Datei wie am 07.10.2026) |
| Download | https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip (Seite: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html) |
| Lizenz | Creative Commons Namensnennung 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ |
| Beleg | `../quellen/bodyparts3d-lizenz-2026-10-07.txt` (Textkopie von https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html, Stand der Seite 27.02.2025) |

**Nennungstext (Pflicht, so von DBCLS vorgegeben):**

> BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International

Im Werkzeug (Knopf „Quellen“ unten auf der Seite), auf Deutsch ergänzt:

> 3D-Modelle: BodyParts3D, © The Database Center for Life Science, lizenziert unter CC BY 4.0
> (https://creativecommons.org/licenses/by/4.0/). Für das Lehrerzimmer ausgewählt, zusammengefasst, verkleinert und umbenannt.

Der Nennungstext steht auch in jeder GLB-Datei (`asset.copyright`).

## Dateien

| Datei | Teile | Dreiecke | Größe |
|---|---|---|---|
| `druesen.glb` | 9 | 19.500 | 131 KB |
| `orientierung.glb` | 8 | 23.994 | 163 KB |
| `teile.json` | 17 Zeilen | | 4 KB |

Das Skelett im Werkzeug ist **keine eigene Datei**: es ist `../koerper/skelett.glb` (siehe `../koerper/QUELLEN.md`),
halb durchsichtig darübergelegt. Beide Themen haben denselben Ursprung und passen übereinander.

### Die Teile

| Teil (ID) | Schicht | BodyParts3D (FJ) | Dreiecke |
|---|---|---|---|
| Hypothalamus (`hypothalamus`) | druesen | FJ1760, FJ1808 (linke und rechte Hälfte) | 2.400 |
| Hypophyse (`hypophyse`) | druesen | FJ1796 | 1.600 |
| Zirbeldrüse (`zirbeldruese`) | druesen | FJ1795 | 900 |
| Thymus (`thymus`) | druesen | FJ3150, FJ3151 (zwei Lappen) | 2.070 |
| Nebenniere links (`nebenniere-l`) | druesen | FJ3129 | 2.964 |
| Nebenniere rechts (`nebenniere-r`) | druesen | FJ3130 | 2.294 |
| Bauchspeicheldrüse (`bauchspeicheldruese`) | druesen | FJ2629 | 4.272 |
| Hoden links (`hoden-l`) | druesen | FJ3138 | 1.500 |
| Hoden rechts (`hoden-r`) | druesen | FJ3142 | 1.500 |
| Gehirn (`gehirn`) | orientierung | 46 Dateien, dieselben wie `gehirn` in `../koerper/` | 4.996 |
| Sehnervenkreuzung (`sehnervenkreuzung`) | orientierung | FJ1771, FJ1818 | 500 |
| Kehlkopf (`kehlkopf`) | orientierung | FJ2808, FJ2440 | 1.600 |
| Luftröhre (`luftroehre`) | orientierung | FJ2541 | 1.400 |
| Herz (`herz`) | orientierung | wie `herz` in `../koerper/` | 5.536 |
| Leber (`leber`) | orientierung | wie `leber` in `../koerper/` | 6.672 |
| Niere links / rechts (`niere-l`, `niere-r`) | orientierung | FJ3145, FJ3147 | 1.646 / 1.644 |

Die vollständigen FJ-Listen stehen je Teil in `teile.json` (`fj`) und in `scripts/atlas/hormone.json`.
Von den Geschlechtsorganen sind **nur die Keimdrüsen** (Hoden) aufgenommen, nichts Äußeres.

## Änderungen gegenüber dem Original

- **Ausgewählt:** 17 Teile — die Hormondrüsen, die der Datensatz enthält, und acht Organe zur Orientierung
  (im Werkzeug halb durchsichtig: Gehirn, Nieren, Leber, dazu Herz, Kehlkopf, Luftröhre, Sehnervenkreuzung).
- **Zusammengefasst:** die beiden Hälften des Hypothalamus, die beiden Thymuslappen, Schild- und Ringknorpel zum
  Kehlkopf, die Gehirnteile zum Gehirn, Herz mit Aorta und Lungenstamm, die Leberlappen zur Leber.
- **Umbenannt:** Knotennamen sind Teile-IDs; `-l` ist die linke Körperseite.
- **Verkleinert:** jedes Teil mit meshoptimizer auf eine Dreieckszahl im Verhältnis zu seiner Oberfläche, mit
  Mindestzahl je Drüse, damit auch die kleinen Drüsen rund bleiben; Ecken verschweißt, Normalen neu berechnet.
- **Geglättete Hüllen:** Hypothalamus, Hypophyse, Zirbeldrüse und Hoden (feines Voxelgitter 0,3–0,6 mm), dazu
  Gehirn, Sehnervenkreuzung, Herz und Leber über ein Voxelgitter zu einer glatten, geschlossenen Außenhaut
  verschmolzen. Form und Lage bleiben, innere Wände entfallen.
- **Achsen und Einheit:** wie `../koerper/`: Meter, Y nach oben, Gesicht nach +Z, linke Körperseite bei +X,
  Füße bei y = 0. Umrechnung `x = X/1000`, `y = (Z + 70,5)/1000`, `z = −(Y + 109)/1000` (Ursprung aus dem Skelett
  in `scripts/atlas/koerper.json`).
- **Format:** glTF 2.0 binär, ein Knoten mit einem Mesh je Teil, keine Texturen, `EXT_meshopt_compression` und
  `KHR_mesh_quantization`. Lädt mit dem three.js-GLTFLoader r186 und `setMeshoptDecoder`.

## In BodyParts3D 4.0 nicht vorhanden

**Schilddrüse, Nebenschilddrüsen und Eierstöcke** gibt es im Datensatz nicht (geprüft in den Teilelisten
`isa_parts_list_e.txt` und `partof_parts_list_e.txt` und in den Kopfzeilen aller OBJ-Dateien; der Datensatz zeigt
einen männlichen Körper). Sie werden **nicht nachgebaut**:

- Schilddrüse und Nebenschilddrüsen erscheinen im Werkzeug nur als **Lagepunkt** (`atlas.marken`) vor bzw. hinter
  der Luftröhre direkt unter dem Kehlkopf, abgeleitet aus den Teilen `kehlkopf` und `luftroehre` dieses Modells.
  Beschriftet als „nicht im Datensatz“.
- Eierstöcke: kein Punkt im Modell, im Steckbrief eine schematische Zeichnung.
