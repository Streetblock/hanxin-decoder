# M1 - Implementierungsstatus

Stand: 2026-08-15

## Fertig und getestet

- ESM-Projektgerüst ohne Laufzeitabhängigkeiten.
- `BitMatrix` mit validierten Zugriffen und deterministischer Speicherung.
- `BitReader` und `BitWriter` für nicht byteausgerichtete Datenströme.
- Han-Xin-Versions-/Dimensionsabbildung für Version 1 bis 84.
- Strikter Präfixparser für die elf Modusindikatoren aus Tabelle 1.
- Normative Segmentleser für alle elf Modi: Numerisch, Text, Binär, beide
  Bereiche häufiger chinesischer Zeichen, GB18030 Zwei- und Vier-Byte, ECI,
  Unicode, GS1 und URI. Abgedeckt sind Bereichs- und Submoduswechsel,
  variable Zähler, Terminatoren, GS1-FNC1, URI-A/B/C und Prozentkodierung sowie
  kontrollierte Fehler bei ungültigen oder abgeschnittenen Segmenten.
- Übergreifender Payload-Dispatcher für beliebige normgültige Modusfolgen,
  ECI-Zustandsweitergabe, verlustfreie Rohbytes und Nullauffüllung am Ende des
  Informationsbitstroms.
- Vollständige Matrix-zu-Payload-Kette aus redundanter Funktionsinformation,
  Dimensions-/Versionsabgleich, Demaskierung, Codewortauslesung,
  Picket-Fence-Rückordnung, blockweiser RS-Korrektur und Payload-Dispatch.
  Der Ergebnisvertrag enthält Version, Dimension, Fehlerstufe, Maske,
  Korrekturzahl und den Symbologiebezeichner aus Anhang K.
- Ende-zu-Ende-Abdeckung aller 1.344 Kombinationen aus Version 1-84,
  Fehlerstufe L1-L4 und Maske 0-3 mit synthetischen, normgültigen Matrizen.
- Deterministischer Doppel-Lauf mit byteidentischem Gesamtergebnis.
- Reproduzierbarer Matrix-zu-Payload-Benchmark für Version 84/L4/Maske 3.
  Der aktuelle Windows-x64-Lauf unter Node.js 24.19.0 erreicht nach zehn
  Aufwärmläufen über 50 Messläufe Median 9,78 ms und p95 11,13 ms. Der
  20-ms-Grenzwert ist damit auf dieser Maschine erfüllt; die verbindliche
  Referenzmaschine muss weiterhin festgeschrieben werden.
- Vier Masken aus Tabelle 14 mit Ausschluss von Funktionsmodulen. Die
  öffentliche Matrix-API ist nullbasiert; vor Auswertung der Normformeln
  werden Zeile und Spalte in die positiven Normkoordinaten `i` und `j`
  umgerechnet.
- `GF(2^8)` mit dem normativen primitiven Polynom `0x163`.
- Generatorpolynome gegen Anhang E geprüft.
- Reed-Solomon-Kodierung und -Dekodierung mit Generatorbasis 1.
- Normvektor aus Anhang F, Beispiel 1: `(25, 21, 4)` und Prüfwörter
  `EB B4 68 1D`.
- Alle drei finalen Matrizen aus Anhang F werden ohne Bildanalyse bytegenau zu
  den normativen Texten, Versionen, Fehlerstufen und Masken dekodiert.
- Für Anhang F, Beispiel 1, werden Informationsbits, Informationscodewörter,
  RS-Prüfwörter, Picket-Fence-Datenstrom, Funktionsinformation und finale
  Matrix exakt reproduziert.
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
  Zint sowie repräsentativen Matrizen eines proprietären Drittanbieter-Encoders
  abgeglichen. Die festgestellte Abweichung bei einzelnen hellen
  Begleitmodulen ist als `DEC-001` dokumentiert; dort gilt die Norm.
- Normative zeilenweise Datenplatzierung für Version 1-84 mit MSB-erster
  Codewortbelegung, getrennt ausgewiesenen Restmodulen und inverser
  Matrixauslesung. Alle nicht reservierten Module werden ohne Duplikat erfasst;
  Platzierung und Auslesen sind für jede Version bytegenau invers.
- Strikt getrennte, temporäre Drittanbieter-Vergleichsfixtures für
  Interoperabilitätsprüfungen; die Norm bleibt Implementierungsquelle.
- 100 fokussierte Kernprüfungen sowie Syntax- und öffentlicher ESM-Importtest
  erfolgreich.

## Als Nächstes

1. Die veröffentlichten Zwischenströme der Anhang-F-Beispiele 2 und 3
   zusätzlich zu ihren bereits bestandenen Endmatrizen erfassen.
2. Den M1-Kern unverändert in einem Browser-Testlauf ausführen und die
   Referenzmaschine für den verbindlichen Laufzeitnachweis festschreiben.
3. Die RS-Fehlerpositions- und Kapazitätstests über jeden Blocktyp bis `t`
   ausweiten.

M1 ist erst abgeschlossen, wenn sämtliche Kriterien `AC-M1-*` aus
`AKZEPTANZKRITERIEN.md` erfüllt sind.
