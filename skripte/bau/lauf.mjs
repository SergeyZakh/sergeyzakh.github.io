// Was ein Bau braucht und alle Teile teilen: Pfade, die Projekte mit Docs, gesammelte Warnungen,
// Suchindex und Sitemap. seite-bauen.mjs füllt es, bevor etwas gebaut wird.
export const lauf = {
  wurzel: '',      // dieses Repo
  ziel: '',        // Ausgabe, meist _site/
  quellen: [],     // Ordner, in denen die Repos der Projekte liegen
  adresse: 'https://sergeyzakh.github.io/',  // für Sitemap und 404-Seite
  startseite: '',  // index.html als Vorlage
  sz: '',          // das Pixelbild <symbol id="sz"> aus der Startseite
  mitDocs: [],     // Projekte mit Docs; Kopfleiste und Seitenleiste brauchen sie
  warnungen: [],
  suche: [],
  sitemap: [],
};
