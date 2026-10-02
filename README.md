# sergeyzakh.github.io

Die Startseite unter https://sergeyzakh.github.io, die Docs zu meinen Werkzeugen unter
https://sergeyzakh.github.io/docs/ und die Karte für das GitHub-Profil. Ohne Framework und ohne
Anfragen nach außen; auch die Schrift (Instrument Sans, wie in Berichtsheft und Fundus) liegt hier.

## Startseite

`index.html`, eine Datei. Eckdaten und Kenntnisse stehen nur in `angaben.mjs`: Nach einer Änderung
schreibt `node skripte/erzeugen.mjs` sie in die Seite und in die Karte unter `karte/`, die das Profil
[SergeyZakh](https://github.com/SergeyZakh) von hier lädt. `node skripte/bildschirmfoto.mjs` nimmt
die Vorschaubilder der Projekte neu auf. `bilder/fundus.jpg` ist ein Ausschnitt aus
`handbuch/bilder/fundus-vollbild.png` im Fundus-Repo, ohne die orangen Markierungen.

## Docs

Die Texte bleiben in den Projekt-Repos und werden dort gepflegt. `docs.mjs` legt fest, welche Datei
zu welcher Seite wird; `skripte/seite-bauen.mjs` setzt sie im Stil der Startseite:

- Seitenleiste je Werkzeug, rechts ein Inhaltsverzeichnis, das beim Lesen mitläuft
- Suche mit `Strg` + `K` über alle Docs; den Index schreibt der Bau, er lädt erst beim Suchen
- Hinweise wie `> [!TIP]`, Code mit Kopieren-Knopf, Bilder aus den Repos
- Anker wie auf GitHub; Verweise zwischen den Dateien zeigen auf die Docs-Seiten, alles andere
  (Quelltext, Lizenz, Issues) auf GitHub
- Mermaid-Diagramme stehen als SVG aus dem Repo da (`mermaid:` in `docs.mjs`)
- das Handbuch von Fundus mit der Gliederung aus `skripte/einrichten.py` im Fundus-Repo
- Abzeichen von shields.io und andere Bilder von außen fallen weg

Lokal, mit den beiden Repos im selben Ordner wie dieses:

```bash
npm ci
node skripte/seite-bauen.mjs     # nach _site/; --quellen <ordner>, wenn die Repos woanders liegen
node skripte/seite-pruefen.mjs   # Verweise, Anker, doppelte ids, nichts von außen
python3 -m http.server -d _site 8000
```

## Veröffentlichen

`.github/workflows/seite.yml` baut bei jedem Push auf `main`, jede Nacht und auf Knopfdruck, prüft
und veröffentlicht. Dafür steht in den Repo-Einstellungen Pages → Source auf „GitHub Actions“.
Findet die Prüfung einen toten Verweis, bleibt die letzte gute Fassung online.
