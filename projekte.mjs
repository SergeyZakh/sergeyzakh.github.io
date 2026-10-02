// Alle Projekte an einer Stelle. Daraus entstehen der Projektteil der Startseite, die Docs unter
// docs/ und die Zeile „Projects“ der Profilkarte. Ein neues Projekt ist ein neuer Eintrag hier;
// die Reihenfolge hier ist die Reihenfolge überall.
//
//   name      wie es heißt
//   repo      Besitzer/Name auf GitHub. Version (aus CHANGELOG.md) und Docs kommen von dort.
//   satz      ein Satz, was es ist: Startseite, Docs, Vorschau in Suchmaschinen
//   vorab     true: Bernstein „Vorabversion“ statt grüner Versionsnummer
//   demo      Adresse einer Demo                              (optional)
//   download  { adresse, name } für den Knopf zum Herunterladen (optional)
//   bild      { datei, handy, alt }: Bildschirmfoto unter bilder/; handy ist ein Ausschnitt für
//             schmale Bildschirme. Mit Bild steht das Projekt groß auf der Startseite, ohne kompakt.
//   punkte    { Überschrift: Text } unter dem Bild, höchstens drei   (optional)
//   docs      weglassen oder true: Seiten werden gefunden (README, docs/*.md, CONTRIBUTING,
//             SECURITY, CHANGELOG); false: keine Docs; { gruppen } für eine eigene Gliederung:
//               gruppen  Abschnitte der Seitenleiste, titel null = ohne Überschrift
//               Seite    datei im Repo, pfad unter docs/<projekt>/ ('' = Überblick), titel
//               mermaid  Bilder, die nacheinander für die Mermaid-Blöcke der Datei stehen. Mermaid
//                        bräuchte eine Bibliothek im Browser; die Repos haben die Diagramme als SVG.
//               handbuch Seiten, deren Gliederung und Titel in einer Python-Datei des Repos stehen
//                        (Fundus: skripte/einrichten.py); hinweis steht über jeder dieser Seiten

export const projekte = [
  {
    name: 'Berichtsheft',
    repo: 'SergeyZakh/Ausbildungs-Berichtsheft',
    satz: 'Der IHK-Ausbildungsnachweis aus dem CSV-Export der Zeiterfassung, als Word oder PDF.',
    demo: 'https://sergeyzakh.github.io/Ausbildungs-Berichtsheft/',
    download: { adresse: 'https://github.com/SergeyZakh/Ausbildungs-Berichtsheft/releases/latest', name: 'Berichtsheft.html' },
    bild: {
      datei: 'bilder/berichtsheft-tag.jpg',
      alt: 'Tagesansicht des Berichtshefts: links der Text für das Heft, farbig unterstrichen nach der Buchung, aus der jedes Wort stammt; rechts die Buchungen des Tages',
    },
    punkte: {
      'Was es kann': 'Liest Clockify, Harvest, Jira mit Tempo, Kimai, Toggl Track oder Excel und schreibt Wochenblätter nach IHK-Vordruck.',
      'Wie es läuft': 'Eine HTML-Datei, auch offline. Auf Wunsch mit Server, Konten und einer Ansicht für Ausbilder.',
      'Gebaut mit': 'JavaScript ohne Framework, docx, Node, PostgreSQL, OIDC. Getestet mit Playwright.',
    },
    docs: {
      gruppen: [
        {
          titel: null,
          seiten: [
            { datei: 'README.md', pfad: '', titel: 'Überblick' },
            { datei: 'docs/START.md', pfad: 'erste-schritte', titel: 'Erste Schritte' },
            { datei: 'docs/KI.md', pfad: 'ki', titel: 'KI mit Ollama' },
            { datei: 'docs/SERVER.md', pfad: 'server', titel: 'Berichtsheft mit Konten' },
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
  },
  {
    name: 'Fundus',
    repo: 'SergeyZakh/fundus',
    satz: 'Firmenwiki mit KI-Suche zum Selbstbetreiben. Die Inhalte verlassen das eigene Netz nicht.',
    vorab: true,
    bild: {
      datei: 'bilder/fundus-frag.jpg',
      alt: 'Ein Artikel im Wiki, rechts daneben beantwortet Frag Fundus eine Frage dazu und nennt die Artikel, aus denen die Antwort stammt',
    },
    punkte: {
      'Was es kann': '„Frag Fundus“ antwortet nur aus Artikeln, die die fragende Person lesen darf, und nennt die Quellen.',
      'Wie es läuft': 'Fertiger Docker-Stapel: BookStack, MariaDB, draw.io, Texterkennung, Ollama und nächtliche Sicherung.',
      'Gebaut mit': 'Theme für BookStack in PHP und JavaScript, Einrichtung in Python, Anmeldung über Keycloak.',
    },
    docs: {
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
          handbuch: {
            gliederung: 'skripte/einrichten.py', buch: 'So funktioniert das Wiki', ordner: 'handbuch', pfad: 'handbuch',
            hinweis: 'Aus dem Handbuch, das Fundus beim Einrichten ins Wiki legt. „Unser Wiki“ ist dort das Wiki der Firma, die Fundus betreibt.',
          },
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
  },
];
