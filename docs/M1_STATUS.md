# M1 - Implementierungsstatus

Stand: 2026-08-15

## Fertig und getestet

- ESM-Projektgerüst ohne Laufzeitabhängigkeiten.
- `BitMatrix` mit validierten Zugriffen und deterministischer Speicherung.
- `BitReader` und `BitWriter` für nicht byteausgerichtete Datenströme.
- Han-Xin-Versions-/Dimensionsabbildung für Version 1 bis 84.
- Strikter Präfixparser für die elf Modusindikatoren aus Tabelle 1.
- Vier Masken aus Tabelle 14 mit Ausschluss von Funktionsmodulen. Die
  öffentliche Matrix-API ist nullbasiert; vor Auswertung der Normformeln
  werden Zeile und Spalte in die positiven Normkoordinaten `i` und `j`
  umgerechnet.
- `GF(2^8)` mit dem normativen primitiven Polynom `0x163`.
- Generatorpolynome gegen Anhang E geprüft.
- Reed-Solomon-Kodierung und -Dekodierung mit Generatorbasis 1.
- Normvektor aus Anhang F, Beispiel 1: `(25, 21, 4)` und Prüfwörter
  `EB B4 68 1D`.
- Korrektur von einem und zwei unbekannten Codewortfehlern im Normvektor.
- Funktionsinformation nach Anhang G mit `GF(2^4)`, RS `(7, 3, 4)`,
  Normbeispiel, allen 1.344 Version-/Level-/Maskenkombinationen und Korrektur
  von bis zu zwei beschädigten GF(16)-Symbolen.
- Platzierung und Auslesen der zwei 34-Modul-Kopien in den vier Eckbereichen,
  einschließlich Rückfall auf die intakte Kopie und Erkennung widersprüchlicher
  gültiger Kopien.
- Vollständige Tabelle A.1 mit den Ausrichtungsparametern `r`, `k` und `m` für
  Version 1-84 sowie abgeleitete, geometrisch validierte Regionsbreiten.
- Vollständige Tabelle B.1 mit allen 336 RS-Blockstrukturen für Version 1-84
  und L1-L4, einschließlich konsistenter Daten-, Prüf- und Gesamtwortzahlen.
- Normative Codewort-Umsortierung im 13er-Schritt, invertierbares
  Deinterleaving, Split/Join aller RS-Blöcke sowie blockweise
  Reed-Solomon-Korrektur.
- 44 fokussierte Kernprüfungen sowie Syntax- und öffentlicher ESM-Importtest
  erfolgreich.

## Als Nächstes

1. Vollständige Funktionsmodulkarte mit Such-, Trenn-, Ausrichtungs- und
   Hilfsausrichtungsmustern für Version 1-84 implementieren.
2. Datenplatzierung für Version 1-3 sowie 4-84
   implementieren.
3. Nutzdatenparser zunächst für Numerisch, Text und Binär, danach die
   chinesischen, GB18030-, ECI-, Unicode-, GS1- und URI-Modi.

M1 ist erst abgeschlossen, wenn sämtliche Kriterien `AC-M1-*` aus
`AKZEPTANZKRITERIEN.md` erfüllt sind.
