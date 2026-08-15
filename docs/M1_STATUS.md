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
- 18 fokussierte Kernprüfungen sowie Syntax- und öffentlicher ESM-Importtest
  erfolgreich.

## Als Nächstes

1. Tabellen aus Anhang A und B in maschinenlesbare, prüfbare Konstanten
   überführen.
2. Funktionsinformation samt Redundanz und Fehlerkorrektur implementieren.
3. Funktionsmodulkarte und Datenplatzierung für Version 1-3 sowie 4-84
   implementieren.
4. Deinterleaving und RS-Blockverarbeitung für alle Version-/Level-Kombinationen.
5. Nutzdatenparser zunächst für Numerisch, Text und Binär, danach die
   chinesischen, GB18030-, ECI-, Unicode-, GS1- und URI-Modi.

M1 ist erst abgeschlossen, wenn sämtliche Kriterien `AC-M1-*` aus
`AKZEPTANZKRITERIEN.md` erfüllt sind.
