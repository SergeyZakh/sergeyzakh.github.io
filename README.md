# sergeyzakh.github.io

Die Startseite unter https://sergeyzakh.github.io und die Karte für das GitHub-Profil. Die Seite
sieht aus wie eine tmux-Sitzung mit drei Fenstern und besteht aus einer einzigen HTML-Datei ohne
Abhängigkeiten.

Die Angaben aus neofetch stehen nur in `angaben.mjs`. Nach einer Änderung schreibt
`node skripte/erzeugen.mjs` sie in die Seite und in die Karte unter `karte/`, die das Profil
[SergeyZakh](https://github.com/SergeyZakh) von hier lädt. `node skripte/bildschirmfoto.mjs`
nimmt die Vorschaubilder der Projekte neu auf.
