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
  Zint sowie repräsentativen Matrizen eines proprietären Drittanbieter-Encoders
  abgeglichen. Die festgestellte Abweichung bei einzelnen hellen
  Begleitmodulen ist als `DEC-001` dokumentiert; dort gilt die Norm.
- Normative zeilenweise Datenplatzierung für Version 1-84 mit MSB-erster
  Codewortbelegung, getrennt ausgewiesenen Restmodulen und inverser
  Matrixauslesung. Alle nicht reservierten Module werden ohne Duplikat erfasst;
  Platzierung und Auslesen sind für jede Version bytegenau invers.
- Strikt getrennte, temporäre Drittanbieter-Vergleichsfixtures für
  Interoperabilitätsprüfungen; die Norm bleibt Implementierungsquelle.
- 96 fokussierte Kernprüfungen sowie Syntax- und öffentlicher ESM-Importtest
  erfolgreich.

## Als Nächstes

1. Die drei Beispiele aus Anhang F als vollständige Ende-zu-Ende-Golden-Vektoren
   ergänzen.
2. Die vollständige Version-/Stufen-/Masken-Abdeckungsmatrix sowie die
   Laufzeit- und Determinismusnachweise automatisieren.

M1 ist erst abgeschlossen, wenn sämtliche Kriterien `AC-M1-*` aus
`AKZEPTANZKRITERIEN.md` erfüllt sind.
