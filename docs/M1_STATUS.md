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
- Normative Eckfunktionsvorlage mit vier orientierten 7x7-Suchmustern,
  einmoduligen Trennzonen und beiden 34-Modul-Funktionsinformationskopien.
  Für Version 1-3 ist diese Vorlage bereits die vollständige
  Funktionsmodulkarte.
- Vollständige Funktionsmodulkarte für Version 1-84 mit alternierenden
  Ausrichtungsmustern und randbeschnittenen Hilfsausrichtungsmustern. Die
  Geometrie ist über alle Versionen gegen Symbolkapazitäten geprüft und mit
  Zint sowie repräsentativen proprietary third-party-Matrizen abgeglichen. Die festgestellte
  proprietary third-party-Abweichung bei einzelnen hellen Begleitmodulen ist als `DEC-001`
  dokumentiert; dort gilt die Norm.
- Normative zeilenweise Datenplatzierung für Version 1-84 mit MSB-erster
  Codewortbelegung, getrennt ausgewiesenen Restmodulen und inverser
  Matrixauslesung. Alle nicht reservierten Module werden ohne Duplikat erfasst;
  Platzierung und Auslesen sind für jede Version bytegenau invers.
- `HanXinProbe.java` als strikt getrenntes proprietary third-party-Verhaltensorakel für
  Interoperabilitätsprüfungen; die Norm bleibt Implementierungsquelle.
- 63 fokussierte Kernprüfungen sowie Syntax- und öffentlicher ESM-Importtest
  erfolgreich.

## Als Nächstes

1. Nutzdatenparser zunächst für Numerisch, Text und Binär, danach die
   chinesischen, GB18030-, ECI-, Unicode-, GS1- und URI-Modi.

M1 ist erst abgeschlossen, wenn sämtliche Kriterien `AC-M1-*` aus
`AKZEPTANZKRITERIEN.md` erfüllt sind.
