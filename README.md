# sergeyzakh.github.io

Die Startseite unter https://sergeyzakh.github.io, die Docs zu meinen Projekten unter
https://sergeyzakh.github.io/docs/ und die Karte für das GitHub-Profil. Ohne Framework und ohne
Anfragen nach außen; auch die Schrift (Instrument Sans, wie in Berichtsheft und Fundus) liegt hier.

## Neues Projekt aufnehmen

Ein Eintrag in `projekte.mjs`, mehr nicht. Was daraus folgt:

- **Startseite:** ein Abschnitt mit Name, Stand, Satz und Knöpfen (die Demo dunkel, sonst die Docs).
  Mit `bild` groß: Text und Bildschirmfoto nebeneinander, von Projekt zu Projekt abwechselnd links und
  rechts, darunter drei Punkte. Ohne Bild kompakt; aufeinanderfolgende stehen nebeneinander im
  Raster. Nummer und Anzahl zählen sich selbst. Mit `buehne` (ein zweites Bildschirmfoto) steht das
  Projekt zusätzlich unter dem Kopf; dort sind Platz für die ersten zwei.
- **Version und Datum:** aus der ersten Überschrift `## [x.y.z] – JJJJ-MM-TT` im `CHANGELOG.md` des
  Repos, bei jedem Bau neu.
- **Neues:** die letzten Versionen aus den CHANGELOGs, je Projekt höchstens zwei, zusammen vier. Als
  Text der Satz unter der Versionsüberschrift, sonst die fett gesetzten Anfänge der Punkte; jede Zeile
  führt auf die Version in den Docs.
- **Docs:** ohne weitere Angaben findet der Bau README, `docs/*.md`, CONTRIBUTING, SECURITY und
  CHANGELOG. Eine eigene Gliederung geht mit `docs: { gruppen }`, keine Docs mit `docs: false`.
- **Kopfleiste der Docs:** bis drei Projekte ein Umschalter, ab vier ein Menü mit Stand und Satz.
- **Profilkarte:** die Zeile „Projects“ nach `node skripte/erzeugen.mjs`; passen die Namen nicht
  mehr hinein, steht der Rest als „+n“ da.
- **Bau:** Die Action holt jedes Repo aus der Liste selbst. Private Repos brauchen ein Secret
  `QUELLEN_TOKEN` mit Leserecht (siehe `.github/workflows/seite.yml`).

Ein Bildschirmfoto gehört nach `bilder/`, am besten mit doppelter Auflösung (2880 × 1800); Breite und
Höhe liest der Bau selbst. Bilder unter 1400 Pixel Breite stehen schmaler, damit sie scharf bleiben.

## Startseite

`index.html` ist die Vorlage. Von oben: Titel, Name, ein Satz und zwei Knöpfe (mittig), darunter die Bühne mit
Bildschirmfotos, dann Projekte, Neues, Kenntnisse und dunkel Kontakt und Fuß; die
Leiste oben springt dorthin (unter 480 px ohne „Neues“, damit sie in die Breite passt).
Die Kenntnisse stehen nur in `angaben.mjs`: Nach einer
Änderung schreibt `node skripte/erzeugen.mjs` sie in die Seite und in die Karte unter `karte/`, die
das Profil [SergeyZakh](https://github.com/SergeyZakh) von hier lädt. Den Projektteil zwischen
`<!-- projekte:… -->` setzt erst der Bau ein, zusammen mit „Neues“; die fertige Seite liegt danach
in `_site/`.

Die Bildschirmfotos zeigen den aktuellen Stand der Projekte mit ihren ausgedachten Beispielinhalten,
bei 1200 × 760 und doppelter Auflösung, damit man auf der Startseite etwas lesen kann:
`bilder/berichtsheft-tag.jpg` ist die Tagesansicht der Demo mit dem Beispielheft (Helfer aus
`test/hilfen.js` im Berichtsheft-Repo), `bilder/fundus-frag.jpg` ein Artikel mit „Frag Fundus“ aus dem
lokalen Stapel nach `einrichten.py --beispiele`, aufgenommen wie die Handbuch-Bilder
(`skripte/handbuch-bilder/aufnehmen.mjs`), nur ohne Markierungen. Nach sichtbaren Änderungen an einem
Projekt neu aufnehmen; `node skripte/bildschirmfoto.mjs` hilft unter Windows.

## Docs

Die Texte bleiben in den Projekt-Repos und werden dort gepflegt. `skripte/seite-bauen.mjs` setzt sie
im Stil der Startseite:

- Seitenleiste je Projekt, rechts ein Inhaltsverzeichnis, das beim Lesen mitläuft
- Suche mit `Strg` + `K` über alle Docs; Treffer im Projekt, in dem man liest, zuerst. Den Index
  schreibt der Bau, er lädt erst beim Suchen.
- Hinweise wie `> [!TIP]`, Code mit Kopieren-Knopf, Bilder aus den Repos
- Anker wie auf GitHub; Verweise zwischen den Dateien zeigen auf die Docs-Seiten, alles andere
  (Quelltext, Lizenz, Issues) auf GitHub
- Mermaid-Diagramme stehen als SVG aus dem Repo da (`mermaid:` in `projekte.mjs`)
- das Handbuch von Fundus mit der Gliederung aus `skripte/einrichten.py` im Fundus-Repo
- Abzeichen von shields.io und andere Bilder von außen fallen weg
- Aufrufe wie `**[▶ Direkt im Browser ausprobieren](…)** — mit …` werden Knöpfe; ein fetter Satz ganz
  oben wird die Unterzeile der Seite
- Linkzeilen, die hier schon Seitenleiste und Inhaltsverzeichnis abdecken („**Anleitungen:** …“, die
  Inhaltsliste im README), fallen weg, ebenso Überschriften, die dadurch leer werden
- dazu `404.html`, `sitemap.xml` und `robots.txt`

Der Bau steht unter `skripte/bau/`: `einlesen` (Projekte, Versionen, Seiten), `markdown`,
`aufbereiten` (Bilder, Verweise, Anker, Aufräumen), `rahmen` (Kopfleiste, Seitenleiste) und `seiten`
(Docs-Seiten, Übersicht, Startseite, 404, Sitemap); `seite-bauen.mjs` setzt sie zusammen.

## Lokal

```bash
npm ci
node skripte/quellen-holen.mjs   # Repos aus projekte.mjs nach quellen/; ohne: Repos neben diesem
node skripte/seite-bauen.mjs     # nach _site/
node skripte/seite-pruefen.mjs   # Verweise, Anker, doppelte ids, nichts von außen
python3 -m http.server -d _site 8000
```

`node skripte/seite-bauen.mjs --projekte andere-liste.mjs --ziel /tmp/probe` baut mit einer anderen
Liste, etwa um auszuprobieren, wie die Seite mit zehn Projekten aussieht.

## Veröffentlichen

`.github/workflows/seite.yml` baut bei jedem Push auf `main`, jede Nacht und auf Knopfdruck, prüft
und veröffentlicht. Dafür steht in den Repo-Einstellungen Pages → Source auf „GitHub Actions“.
Findet die Prüfung einen toten Verweis, bleibt die letzte gute Fassung online. Ein Projekt-Repo kann
den Bau nach einem Push sofort anstoßen, mit einem `repository_dispatch` vom Typ `docs`.
