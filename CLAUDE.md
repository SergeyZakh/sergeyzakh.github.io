# Hinweise für KI-Assistenten - Nicht prüfbedürftig

Persönliche Seite unter sergeyzakh.github.io: Startseite, Docs zu den eigenen Projekten, Karte für
das GitHub-Profil. Oberfläche, Kommentare, Bezeichner und Commit-Nachrichten sind Deutsch.
Erst lesen: [README.md](README.md).

## Befehle

```bash
npm ci
node skripte/quellen-holen.mjs   # Repos der Projekte nach quellen/
node skripte/erzeugen.mjs        # angaben.mjs → Profilkarte, Eckdaten und Kenntnisse in index.html
node skripte/seite-bauen.mjs     # alles nach _site/
node skripte/seite-pruefen.mjs   # muss grün sein, sonst veröffentlicht die Action nicht
```

## Was man sonst erst durch Stolpern lernt

- **Projekte stehen nur in `projekte.mjs`.** Startseite, Docs, Docs-Kopfleiste und Profilkarte
  folgen daraus. Nie ein Projekt von Hand in `index.html` schreiben: Zwischen
  `<!-- projekte:anfang/ende -->` setzt der Bau ein, was dort steht, wird überschrieben.
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
- **Stil:** Farben, Schrift und Maße wie Berichtsheft und Fundus (warmes Grau, Instrument Sans,
  Haarlinien). Farbe trägt Bedeutung: Grün veröffentlicht, Bernstein Vorabversion; daneben steht
  immer ein Wort. Browser-JavaScript mit `var` und Funktionen, Skripte unter `skripte/` modernes Node.
- **Generiert, nicht von Hand ändern:** `karte/*.svg`, die Blöcke zwischen den Markierungen in
  `index.html`, alles in `_site/`.
- **Keine Links auf Claude-Sitzungen** in Commits oder Kommentaren; `Co-Authored-By` darf bleiben.

## Fertig heißt

`node skripte/seite-bauen.mjs && node skripte/seite-pruefen.mjs` ohne Fehler, die Seite am PC und am
Handy (390 px) ohne seitliches Scrollen angesehen, README nachgezogen.
