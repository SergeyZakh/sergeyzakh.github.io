// Docs: Kopieren-Knöpfe an Code, das Inhaltsverzeichnis folgt dem Lesen, die Seitenleiste wird am
// Handy zur Schublade, und Strg + K sucht in allen Docs. Der Suchindex (suche.js) lädt erst, wenn
// jemand sucht. Was aus dem Index kommt, landet nur über textContent in der Seite.
(function () {
  // "" auf der 404-Seite: Pfade ab der Wurzel, weil sie unter jedem falschen Pfad ausgeliefert wird
  var wurzel = document.body.getAttribute("data-wurzel");
  if (wurzel === null) wurzel = ".";
  var projekt = document.body.getAttribute("data-projekt") || "";

  function element(tag, klasse, text) {
    var el = document.createElement(tag);
    if (klasse) el.className = klasse;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  // ---------- Hell oder dunkel (themaWechseln steht im Kopf jeder Seite) ----------
  document.querySelectorAll("[data-thema]").forEach(function (knopf) {
    knopf.addEventListener("click", function () { window.themaWechseln(); });
  });

  // ---------- Kopieren ----------
  document.querySelectorAll(".code").forEach(function (block) {
    var knopf = element("button", "kopieren", "Kopieren");
    knopf.type = "button";
    knopf.addEventListener("click", function () {
      var text = block.querySelector("code").textContent;
      function melden(wort) {
        knopf.textContent = wort;
        setTimeout(function () { knopf.textContent = "Kopieren"; }, 1600);
      }
      if (!navigator.clipboard) return melden("Nicht möglich");
      navigator.clipboard.writeText(text).then(function () { melden("Kopiert"); }, function () { melden("Nicht möglich"); });
    });
    block.querySelector(".code-kopf").appendChild(knopf);
  });

  // Eine lange Liste (Seitenleiste, Inhaltsverzeichnis) so rollen, dass der Eintrag sichtbar ist.
  // Ohne scrollIntoView, das würde auch die Seite selbst bewegen.
  function zeigen(liste, eintrag) {
    if (!liste || !eintrag) return;
    var oben = eintrag.offsetTop, unten = oben + eintrag.offsetHeight;
    if (oben < liste.scrollTop + 40 || unten > liste.scrollTop + liste.clientHeight - 40) {
      liste.scrollTop = oben - liste.clientHeight / 3;
    }
  }
  var seiten = document.querySelector(".seiten");
  zeigen(seiten, document.querySelector('.seiten a[aria-current]'));

  // ---------- Inhaltsverzeichnis folgt dem Lesen ----------
  var toc = document.querySelector(".toc");
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a"));
  // Dieselben Abschnitte stehen links unter der markierten Seite. Sichtbar sind sie nur, wenn das
  // Inhaltsverzeichnis rechts fehlt (schmales Fenster, Schublade am Handy), siehe docs.css.
  var hier = document.querySelector(".seiten a[aria-current]");
  var leisteLinks = [];
  if (tocLinks.length && hier) {
    var abschnitte = toc.querySelector("ul").cloneNode(true);
    abschnitte.className = "abschnitte";
    abschnitte.setAttribute("aria-label", "Auf dieser Seite");
    hier.parentNode.appendChild(abschnitte);
    leisteLinks = Array.prototype.slice.call(abschnitte.querySelectorAll("a"));
  }
  if (tocLinks.length) {
    var ziele = tocLinks.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
    var aktiv = -1;
    var markieren = function () {
      var neu = 0;
      ziele.forEach(function (z, i) { if (z && z.getBoundingClientRect().top < 140) neu = i; });
      // Ganz unten zählt der letzte Abschnitt, auch wenn er nie bis oben kommt
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) neu = ziele.length - 1;
      if (neu === aktiv) return;
      aktiv = neu;
      tocLinks.forEach(function (a, i) { a.classList.toggle("aktiv", i === aktiv); });
      leisteLinks.forEach(function (a, i) { a.classList.toggle("aktiv", i === aktiv); });
      zeigen(toc, tocLinks[aktiv]);
      // offsetParent ist null, solange die Abschnitte links ausgeblendet sind
      if (leisteLinks[aktiv] && leisteLinks[aktiv].offsetParent) zeigen(seiten, leisteLinks[aktiv]);
    };
    addEventListener("scroll", markieren, { passive: true });
    markieren();
  }

  // ---------- Seitenleiste am Handy ----------
  var menue = document.querySelector("[data-menue]");
  if (menue) {
    var setzen = function (offen) {
      document.body.classList.toggle("menue-offen", offen);
      menue.setAttribute("aria-expanded", String(offen));
      if (offen) zeigen(seiten, document.querySelector(".seiten .abschnitte a.aktiv") || document.querySelector('.seiten a[aria-current]'));
    };
    menue.addEventListener("click", function () { setzen(!document.body.classList.contains("menue-offen")); });
    document.addEventListener("click", function (e) {
      if (!document.body.classList.contains("menue-offen")) return;
      // Ein Abschnitt dieser Seite schließt die Schublade, sonst verdeckte sie, wohin man springt
      if (!e.target.closest(".seiten, [data-menue]") || e.target.closest(".abschnitte a")) setzen(false);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setzen(false); });
  }

  // ---------- Suche ----------
  var dialog, feld, liste, index = null, treffer = [], gewaehlt = 0;
  var LUPE = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

  function bauen() {
    dialog = element("dialog", "suche");
    dialog.setAttribute("aria-label", "Docs durchsuchen");
    dialog.innerHTML =
      '<div class="suche-kopf">' + LUPE +
      '<input type="search" autocomplete="off" spellcheck="false" placeholder="Befehl, Einstellung oder Frage …" aria-label="Suchbegriff">' +
      '<kbd>Esc</kbd></div><ul class="treffer" role="listbox"></ul>' +
      '<div class="suche-fuss"><span><kbd>↑</kbd><kbd>↓</kbd> auswählen</span><span><kbd>Enter</kbd> öffnen</span>' +
      '<span><kbd>Strg</kbd><kbd>K</kbd> öffnen und schließen</span></div>';
    document.body.appendChild(dialog);
    feld = dialog.querySelector("input");
    liste = dialog.querySelector(".treffer");
    feld.addEventListener("input", function () { gewaehlt = 0; anzeigen(); });
    feld.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); waehlen(gewaehlt + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); waehlen(gewaehlt - 1); }
      else if (e.key === "Enter") {
        var a = liste.querySelectorAll("a")[gewaehlt];
        if (a) { e.preventDefault(); a.click(); }
      }
    });
    // Klick auf den abgedunkelten Grund schließt, wie Esc
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
  }

  function laden() {
    if (index) return anzeigen();
    liste.textContent = "";
    liste.appendChild(element("li", "leer", "Lädt …"));
    var skript = document.createElement("script");
    skript.src = wurzel + "/docs/suche.js";
    skript.onload = function () {
      index = (window.DOCS_SUCHE || []).map(function (e) {
        e.kopf = (e.w + " " + e.s + " " + e.t).toLowerCase();
        e.klein = e.x.toLowerCase();
        return e;
      });
      anzeigen();
    };
    skript.onerror = function () {
      liste.textContent = "";
      liste.appendChild(element("li", "leer", "Der Suchindex lässt sich gerade nicht laden."));
    };
    document.head.appendChild(skript);
  }

  // Alle Wörter müssen vorkommen. Treffer in der Überschrift zählen mehr als im Text, Treffer im
  // Projekt, in dem man gerade liest, etwas mehr als in den anderen.
  function suchen(woerter) {
    var ergebnis = [];
    index.forEach(function (e) {
      var punkte = 0;
      for (var i = 0; i < woerter.length; i++) {
        var w = woerter[i], imKopf = e.kopf.indexOf(w) >= 0, imText = e.klein.indexOf(w) >= 0;
        if (!imKopf && !imText) return;
        punkte += (e.t.toLowerCase().indexOf(w) >= 0 ? 12 : 0) + (imKopf ? 4 : 0) + (imText ? 1 : 0);
      }
      ergebnis.push({ e: e, punkte: punkte + (e.k === projekt ? 3 : 0) });
    });
    ergebnis.sort(function (a, b) { return b.punkte - a.punkte; });
    return ergebnis.slice(0, 40).map(function (r) { return r.e; });
  }

  // Text mit gelb markierten Suchwörtern, wie die Schnellsuche in Fundus
  function mitMarken(el, text, woerter) {
    var klein = text.toLowerCase(), pos = 0;
    while (pos < text.length) {
      var naechste = -1, laenge = 0;
      woerter.forEach(function (w) {
        var i = klein.indexOf(w, pos);
        if (i >= 0 && (naechste < 0 || i < naechste)) { naechste = i; laenge = w.length; }
      });
      if (naechste < 0) break;
      el.appendChild(document.createTextNode(text.slice(pos, naechste)));
      el.appendChild(element("mark", "", text.slice(naechste, naechste + laenge)));
      pos = naechste + laenge;
    }
    el.appendChild(document.createTextNode(text.slice(pos)));
    return el;
  }

  function ausschnitt(e, woerter) {
    var i = -1;
    woerter.forEach(function (w) { var j = e.klein.indexOf(w); if (j >= 0 && (i < 0 || j < i)) i = j; });
    if (i < 0) return e.x.slice(0, 180);
    var von = Math.max(0, i - 60);
    return (von > 0 ? "… " : "") + e.x.slice(von, von + 200);
  }

  function anzeigen() {
    // Wer schneller tippt, als der Index lädt, bekommt die Treffer, sobald er da ist (laden ruft wieder)
    if (!index) return;
    var eingabe = feld.value.trim().toLowerCase();
    var woerter = eingabe.split(/\s+/).filter(Boolean);
    // Ohne Eingabe stehen die Seiten selbst da, zum Stöbern
    treffer = woerter.length ? suchen(woerter) : index.filter(function (e) { return e.u.indexOf("#") < 0; })
      .sort(function (a, b) { return (b.k === projekt) - (a.k === projekt); });
    gewaehlt = Math.min(gewaehlt, Math.max(treffer.length - 1, 0));
    liste.textContent = "";
    if (!treffer.length) {
      liste.appendChild(element("li", "leer", "Nichts gefunden. Versuch es mit einem Wort aus einem Befehl, etwa „docker“ oder „ollama“."));
      return;
    }
    treffer.forEach(function (e, n) {
      var li = element("li"), a = element("a", n === gewaehlt ? "gewaehlt" : "");
      a.href = wurzel + "/docs/" + e.u;
      a.setAttribute("role", "option");
      a.appendChild(element("small", "", e.w + " › " + e.s));
      a.appendChild(mitMarken(element("b"), e.t, woerter));
      if (woerter.length && e.x) a.appendChild(mitMarken(element("span"), ausschnitt(e, woerter), woerter));
      a.addEventListener("mousemove", function () { if (gewaehlt !== n) waehlen(n); });
      a.addEventListener("click", function () { dialog.close(); });
      li.appendChild(a);
      liste.appendChild(li);
    });
  }

  function waehlen(n) {
    var links = liste.querySelectorAll("a");
    if (!links.length) return;
    gewaehlt = Math.max(0, Math.min(n, links.length - 1));
    links.forEach(function (a, i) { a.classList.toggle("gewaehlt", i === gewaehlt); });
    zeigen(liste, links[gewaehlt].parentNode);
  }

  function oeffnen() {
    if (!dialog) bauen();
    if (dialog.open) { dialog.close(); return; }
    feld.value = "";
    gewaehlt = 0;
    dialog.showModal();
    feld.focus();
    laden();
  }

  document.querySelectorAll("[data-suche]").forEach(function (k) { k.addEventListener("click", oeffnen); });
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); oeffnen(); }
    else if (e.key === "/" && !(dialog && dialog.open) && !/^(input|textarea|select)$/i.test(e.target.tagName)) { e.preventDefault(); oeffnen(); }
  });
})();
