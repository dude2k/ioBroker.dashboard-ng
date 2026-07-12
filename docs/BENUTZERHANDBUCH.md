# Dashboard-NG Benutzerhandbuch

## Ueberblick

Dashboard-NG ist ein ioBroker-Adapter fuer responsive Smart-Home-Dashboards
ohne eigenes HTML, CSS oder JavaScript. Im Editor werden Dashboards erstellt;
der schlanke Viewer wird auf Telefonen, Tablets, Desktop-PCs und Wandpanels
verwendet.

Dashboard-NG befindet sich derzeit im Alpha-Status. Bis zur stabilen Version
1.0.0 sollte es fuer Tests und Entwicklung eingesetzt werden.

## Installation

Zuerst den Checkout bauen:

```bash
npm install
npm run build
```

Fuer eine Testinstallation aus GitHub auf dem ioBroker-Host ausfuehren:

```bash
iobroker url https://github.com/dude2k/ioBroker.dashboard-ng
```

Danach im ioBroker-Admin eine Adapterinstanz anlegen. Die Admin-Seite oeffnet
den Editor. Der Viewer wird vom Adapter bereitgestellt und ist die Ansicht fuer
den taeglichen Einsatz.

## Erstes Dashboard

1. Adapter-Adminseite oeffnen und ein Dashboard anlegen oder auswaehlen.
2. Bei Bedarf eine weitere Seite anlegen.
3. Eine Karte aus der Komponentenpalette auf das Raster ziehen.
4. Karte auswaehlen und im Inspektor konfigurieren.
5. Benoetigte ioBroker-Zustaende binden und speichern.
6. Den Viewer auf dem Zielgeraet oeffnen.

Dashboard-NG rastet Karten an Spalten und Zeilen ein. Seiten, Layouts,
Komponenten, Bindungen, Aktionen, Themes, Assets und Vorlagen liegen als
versioniertes Dashboard-JSON vor.

## Editor Bedienen

Die Palette enthaelt Karten und Startvorlagen. Auf der Arbeitsflaeche werden
Karten ausgewaehlt, verschoben und skaliert. Der Inspektor bearbeitet die
Auswahl; bei mehreren ausgewaehlten Karten stehen Ausrichten und Verteilen zur
Verfuegung.

Sections und Container gruppieren zusammengehoerige Karten. Verschachtelte
Komponenten verwenden das 12-spaltige Raster ihres Containers, Seiten das
responsive Geraeteraster.

Der Erweiterte Modus zeigt exakte Werte fuer `x`, `y`, Breite und Hoehe. In der
Vorschau kann fuer Telefon, Tablet, Desktop oder Wandpanel ein eigenes
Breakpoint-Layout gesetzt werden. Mit Zuruecksetzen erbt der Breakpoint wieder
das Standardlayout.

Undo/Redo, Kopieren, Einfuegen, Duplizieren, Sperren und Im Editor verbergen
stehen fuer ausgewaehlte Karten bereit. Editor-Vorschau und Viewer verwenden
dieselbe Karten-Laufzeit.

## Zustaende Und Formeln

Bindungen verbinden eine Karteneigenschaft mit einem ioBroker-Zustand. Der
State-Picker durchsucht Objekt-ID, Name, Rolle und Einheit und zeigt Typ,
Schreibrecht, Wertebereich und Aliase an. Fehlende Zustaende bleiben nach einem
Import sichtbar markiert und koennen gezielt ersetzt werden.

Formeln liefern berechnete Werte, Bedingungen und Styles. Sie werden durch eine
sichere Ausdruckssprache ausgewertet; beliebiges JavaScript wird nie
ausgefuehrt. Beispiel:

```text
(state("alias.0.solar.power") + state("alias.0.grid.power")) / 1000
```

Unterstuetzt werden Rechenoperatoren, Vergleiche, `&&`, `||`, unare Operatoren
sowie `state`, `min`, `max`, `abs` und `round`. Bindungs- und
Transformationsformeln koennen `value`, Vergleichsformeln auch `expected`
verwenden. Das [Schema-Handbuch](DASHBOARD_SCHEMA.md) beschreibt das
Bindungsmodell vollstaendig.

## Themes, Aktionen Und Styles

In den Projekteinstellungen stehen vier Themes bereit: Modern Dark, Clean
Light, Glass Panel und Minimal Wall Tablet. Dort werden die zentralen
Design-Tokens des aktiven Themes angepasst; der Viewer uebernimmt dieselben
Werte.

Karten koennen einfache Aktionen wie Umschalten oder Wert schreiben ausfuehren.
Sichtbarkeit und bedingte Styles koennen auf Zustaende oder Formeln reagieren.
Fuer Wandpanels sollten diese Regeln bewusst einfach gehalten werden.

## Vorlagen, Assets, Import Und Export

Ein Export erzeugt portables Dashboard-JSON. Beim Import wird das Dashboard vor
dem Speichern validiert und migriert. Fehlende Zustaende werden im Editor
ausdruecklich neu zugeordnet.

Seiten, Sections oder Kartengruppen lassen sich als Vorlagen speichern.
Enthaltene Startvorlagen bieten eine Raumuebersicht fuer Wandpanels und eine
kompakte Statusseite fuer Mobilgeraete.

Hochgeladene Bilder und SVG-Icons werden als Data-URL eingebettet und bleiben
damit beim Export erhalten. HTTP(S)-Assets bleiben extern; ihr Server muss vom
Viewer-Geraet erreichbar sein.

## Viewer Und Kiosk

Der Viewer ist vom Editor getrennt und laedt nur die Karten-Laufzeit. Bei einer
Verbindungsunterbrechung bleibt das letzte Dashboard sichtbar, markiert Daten
bei Bedarf als veraltet und verbindet sich automatisch neu.

Fuer fest installierte Anzeigen stehen Vollbild und Kiosk-Betrieb bereit.
Unterstuetzte Browser koennen per Wake Lock aktiv gehalten werden. Der
Einbrennschutz bewegt oder dimmt die Anzeige dezent und kann deaktiviert werden.

## Problembehebung

- Karte ohne Wert: Zustands-ID, Typ und Adapterzugriff im State-Picker pruefen.
- Import markiert eine Bindung als fehlend: Ersatz-Zustand waehlen und speichern.
- Formel fehlerhaft: Editor-Validierung verwenden und Anfuehrungszeichen sowie
  vollstaendige Zustands-IDs pruefen.
- Layout passt nicht: passenden Breakpoint in der Vorschau waehlen und im
  Erweiterten Modus ein Override setzen.
- Viewer zeigt alte Daten: ioBroker-Verbindung pruefen; der Viewer verbindet
  sich neu und aktualisiert Zustaende automatisch.

## Entwicklung Und Grenzen

Die Qualitaetspruefung im Repository-Root ausfuehren:

```bash
npm test
npm run lint
npm run build
npm run release:check
```

`release:check` prueft Formatierung, Linting, Tests, alle Builds, Paket,
Integration und Adapter. Technische Hintergruende stehen in der
[Architektur](ARCHITECTURE.md), der [Produktspezifikation](PRODUCT_SPEC.md) und
der [Roadmap](ROADMAP.md). Dashboard-NG steht unter der MIT-Lizenz.

Nicht zum MVP gehoeren ein Plugin-System, ein Marketplace, eine VIS/VIS2-
Migration oder beliebiges Benutzer-JavaScript. Das Device-Mapping ist
heuristisch und sollte gegen die realen ioBroker-Objekte getestet werden.
