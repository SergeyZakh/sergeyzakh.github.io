// Welche Dateien aus den Projekt-Repos zu den Docs unter docs/ werden, in welcher Reihenfolge und
// unter welchem Pfad. Die Texte selbst bleiben in den Repos und werden dort gepflegt;
// node skripte/seite-bauen.mjs holt sie beim Bauen und setzt sie im Stil der Startseite.
//
// Ein Werkzeug:
//   kurz      Pfad unter docs/
//   ordner    Name der Kopie des Repos (neben diesem Repo oder unter --quellen)
//   vorab     true: Bernstein „Vorabversion“ statt grüner Versionsnummer
//   gruppen   Abschnitte der Seitenleiste; titel null = ohne Überschrift
// Eine Seite: datei im Repo, pfad unter docs/<kurz>/ ('' = Überblick), titel für die Seitenleiste.
// mermaid: Bilder, die nacheinander für die Mermaid-Blöcke der Datei stehen. Mermaid bräuchte
// eine Bibliothek im Browser; die Repos haben die Diagramme ohnehin als SVG.
// handbuch: Die Handbuchseiten von Fundus, Gliederung und Titel stehen in einrichten.py.

export const werkzeuge = [
  {
    kurz: 'berichtsheft',
    name: 'Berichtsheft',
    repo: 'SergeyZakh/Ausbildungs-Berichtsheft',
    ordner: 'Ausbildungs-Berichtsheft',
    satz: 'Der IHK-Ausbildungsnachweis aus dem CSV-Export der Zeiterfassung, als Word oder PDF.',
    demo: 'https://sergeyzakh.github.io/Ausbildungs-Berichtsheft/',
    gruppen: [
      {
        titel: null,
        seiten: [
          { datei: 'README.md', pfad: '', titel: 'Überblick' },
          { datei: 'docs/START.md', pfad: 'erste-schritte', titel: 'Erste Schritte' },
          { datei: 'docs/KI.md', pfad: 'ki', titel: 'KI mit Ollama' },
          { datei: 'docs/SERVER.md', pfad: 'server', titel: 'Betrieb mit Konten' },
        ],
      },
      {
        titel: 'Für Mitwirkende',
        seiten: [
          { datei: 'docs/ENTWICKLUNG.md', pfad: 'entwicklung', titel: 'Entwicklung' },
          { datei: 'CONTRIBUTING.md', pfad: 'mitmachen', titel: 'Mitmachen' },
          { datei: 'SECURITY.md', pfad: 'sicherheit', titel: 'Sicherheit' },
          { datei: 'CHANGELOG.md', pfad: 'aenderungen', titel: 'Änderungen' },
        ],
      },
    ],
  },
  {
    kurz: 'fundus',
    name: 'Fundus',
    repo: 'SergeyZakh/fundus',
    ordner: 'fundus',
    vorab: true,
    satz: 'Firmenwiki mit KI-Suche zum Selbstbetreiben, als Theme für BookStack.',
    gruppen: [
      {
        titel: null,
        seiten: [
          {
            datei: 'README.md', pfad: '', titel: 'Überblick',
            mermaid: [{
              bild: 'docs/bilder/ki-ablauf.svg',
              alt: 'Beim Speichern wird ein Artikel in Stücke zerlegt, eingebettet und indexiert; '
                + 'eine Frage sucht nur im Lesbaren, das Sprachmodell antwortet mit Quelle',
            }],
          },
          { datei: 'docs/START.md', pfad: 'erste-schritte', titel: 'Erste Schritte' },
        ],
      },
      {
        titel: 'Handbuch',
        handbuch: { gliederung: 'skripte/einrichten.py', ordner: 'handbuch', pfad: 'handbuch' },
      },
      {
        titel: 'Für Mitwirkende',
        seiten: [
          { datei: 'docs/ENTWICKLUNG.md', pfad: 'entwicklung', titel: 'Entwicklung und Betrieb' },
          { datei: 'CONTRIBUTING.md', pfad: 'mitmachen', titel: 'Mitmachen' },
          { datei: 'SECURITY.md', pfad: 'sicherheit', titel: 'Sicherheit' },
          { datei: 'CHANGELOG.md', pfad: 'aenderungen', titel: 'Änderungen' },
        ],
      },
    ],
  },
];
