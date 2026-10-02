# Hinweise für KI-Assistenten - Nicht prüfbedürftig

Persönliche Seite unter sergeyzakh.github.io: Startseite, Docs zu den eigenen Projekten, Karte für
das GitHub-Profil. Oberfläche, Kommentare, Bezeichner und Commit-Nachrichten sind Deutsch.
Erst lesen: [README.md](README.md).

## Befehle

```bash
npm ci
node skripte/quellen-holen.mjs   # Repos der Projekte nach quellen/
node skripte/erzeugen.mjs        # angaben.mjs → Profilkarte und Kenntnisse in index.html
node skripte/seite-bauen.mjs     # alles nach _site/
node skripte/seite-pruefen.mjs   # muss grün sein, sonst veröffentlicht die Action nicht
```

## Was man sonst erst durch Stolpern lernt

- **Projekte stehen nur in `projekte.mjs`.** Startseite, Docs, Docs-Kopfleiste und Profilkarte
  folgen daraus. Nie ein Projekt von Hand in `index.html` schreiben: Zwischen
  `<!-- projekte:anfang/ende -->` setzt der Bau ein, was dort steht, wird überschrieben.
- **Versionen und „Neues“ kommen aus den CHANGELOGs** der Repos (`versionenAus()` in
  `skripte/bau/einlesen.mjs`, Überschriften `## [x.y.z] – JJJJ-MM-TT`). Nie von Hand nachtragen;
  ein falscher Eintrag wird im Repo des Projekts behoben.
- **Docs-Texte gehören in die Projekt-Repos**, nicht hierher. Hier steht nur, welche Datei zu
  welcher Seite wird. Ein Fehler in einem Docs-Text wird im jeweiligen Repo behoben.
- **Keine Anfragen nach außen**, kein CDN, keine Schriften von Google. `seite-pruefen.mjs` prüft das.
  Einzige Abhängigkeit ist `marked`, und nur beim Bauen.
- **Der Bau steht in Teilen unter `skripte/bau/`**, gemeinsamer Stand in `lauf.mjs`. Wer etwas am
  Bau umstellt, ohne dass sich die Seite ändern soll, baut vorher und nachher und vergleicht mit
  `diff -r`: Es muss byte-genau gleich herauskommen.
- **Aufräumen ist lieber zu eng als zu gierig** (`istNavigation()` in `aufbereiten.mjs`): Was aus
  den Repos wegfällt, steht sonst nirgends. Nach einer Änderung dort die Zahl der `<p>` je Seite
  vor und nach vergleichen.
- **Anker wie auf GitHub** (`anker()` in `skripte/bau/aufbereiten.mjs`), damit Verweise aus den Repos
  (`START.md#weg-2-für-mehrere-…`) auch hier treffen. Ids im Seitenrahmen (`hauptteil`,
  `seitenleiste`) so wählen, dass keine Überschrift sie trifft.
- **Ein Seitenrand für alles:** `--rand` (20 bis 40 px, wächst mit der Breite) steht in `index.html`
  und `docs/docs.css` gleich; Kopfleiste und Inhalt der Docs nehmen beide denselben Rahmen
  (`.kopf-innen`, `.raster`), damit Logo, Seitenleiste und Text auf einer Linie stehen. Ein Innenabstand
  auf `.breite` oder `.fuss` nur als `padding-top`/`padding-bottom`, sonst verschluckt er den Rand.
- **Ein senkrechter Abstand für alles:** `--abstand` (64 bis 104 px) in `index.html` gilt oben und unten im
  Kopf und in jedem Band. Gemessen wird, was man sieht: im Kopf oben ab der Leiste, nicht ab dem Seitenrand.
- **Stil:** Farben, Schrift und Maße wie Berichtsheft und Fundus (warmes Grau, Instrument Sans,
  Haarlinien). Farbe trägt Bedeutung: Grün veröffentlicht, Bernstein Vorabversion; daneben steht
  immer ein Wort. Browser-JavaScript mit `var` und Funktionen, Skripte unter `skripte/` modernes Node.
- **Symmetrie ist Pflicht, nicht Geschmack:** Gleichartige Container stehen gleich groß nebeneinander
  (Projektkarten, Kontaktkacheln), und Linien zwischen Angaben liegen in allen Karten auf derselben
  y-Koordinate. Die Projektkarten sind dafür Subgrids mit 1fr-Zeilen für die Punkte. Nach jeder
  Änderung messen statt schätzen, von 1920 bis 360 px: Breite, Höhe und die y der Linien je Karte.
- **Generiert, nicht von Hand ändern:** `karte/*.svg`, die Blöcke zwischen den Markierungen in
  `index.html`, alles in `_site/`.
- **Keine Links auf Claude-Sitzungen** in Commits oder Kommentaren; `Co-Authored-By` darf bleiben.

## Fertig heißt

`node skripte/seite-bauen.mjs && node skripte/seite-pruefen.mjs` ohne Fehler, die Seite am PC und am
Handy (390 px) ohne seitliches Scrollen angesehen, README nachgezogen.
