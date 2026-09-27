// Die Angaben aus neofetch, an einer Stelle für die Startseite und die Profilkarte.
// Nach jeder Änderung: node skripte/erzeugen.mjs

// Zahlen, die später eine Action täglich einsetzen kann
export const zahlen = { repos: 1, sterne: 1, follower: 1, beitraege: 315 };

// [Schlüssel, Wert, kurzer Schlüssel fürs Handy] oder null für eine Leerzeile
export const angaben = [
  ['OS', 'Windows 11, Linux in Docker'],
  ['Uptime', '26 years'],
  ['Kernel', 'Fachinformatiker Systemintegration'],
  ['Shell', 'leidenschaftliche Neugier'],
  ['IDE', 'VS Code, IntelliJ, Claude Code'],
  null,
  ['Languages.Programming', 'TS, JS, PHP, Python, C, Java, ASM', 'Lang.Code'],
  ['Languages.Scripting', 'Bash, PowerShell', 'Lang.Script'],
  ['Languages.Computer', 'HTML, CSS, SQL, YAML, HCL, LaTeX', 'Lang.Comp'],
  ['Languages.Real', 'Deutsch, Russisch, Englisch', 'Lang.Real'],
  null,
  ['Infra', 'Docker, Kubernetes, Terraform, Azure'],
];

// Nur in der Profilkarte, auf der Startseite stehen Projekte und Kontakt in eigenen Fenstern
export const projekte = 'Ausbildungs-Berichtsheft, Fundus (bald)';
export const kontakt = [['GitHub', 'SergeyZakh'], ['LinkedIn', 'sergey-zakharov-jr']];
