# M1-Akzeptanzbericht - Bitgenauer Normkern

Stand: 2026-08-15  
Prüfbasis: `d78f3a2`  
Ergebnis: **M1 abgenommen**

## 1. Umfang und Produktgrenze

M1 nimmt den Decoder ab einer bereits normalisierten, quadratischen
Han-Xin-Modulmatrix ab. Bildsuche, Binarisierung, Perspektivkorrektur und
Rasterabtastung gehören zu M2 und M3. Maßgebliche normative Quelle ist
GB/T 21049-2022; die Golden-Daten stammen insbesondere aus den Anhängen A, B,
E, F, G und K.

Die dokumentierte Inkonsistenz in Anhang F, Beispiel 3, ist gemäß `DEC-003`
behandelt: F.3.3 bleibt mit allen 251 veröffentlichten Codewörtern erhalten;
für den L2-RS-Strom gelten die ebenfalls veröffentlichten drei Blöcke mit
zusammen 209 Daten- und 90 Prüfcodewörtern. F.3.4 und die Endmatrix bestätigen
diesen Übergang. Es besteht kein offener Normtreuedefekt.

## 2. Laufzeitumgebungen

### Referenzmaschine

- CPU: Intel Core i9-13900H
- logische Prozessoren: 20
- Betriebssystem: Microsoft Windows 10.0.26200, x64
- Node.js: v24.14.0

### Browserlauf

- Chromium: 151.0.0.0, Windows x64
- Testseite: `test/browser/core-full.html`
- derselbe Korpus und dieselben Testdateien wie im Node-Lauf; nur die beiden
  Testframework-Importe werden per Import-Map auf browserneutrale Adapter
  abgebildet

## 3. Gesamtergebnisse

| Lauf | Eingabe | Erwartung | Tatsächliches Ergebnis |
|---|---|---|---|
| Node-Kernkorpus | `test/all.test.mjs` | 115 Tests, null Fehler | 115 bestanden, 0 fehlgeschlagen, 21,12 s |
| Chromium-Kernkorpus | identische 115 Tests | identisches Ergebnis zu Node | 115 bestanden, 0 fehlgeschlagen, 20,04 s |
| Matrix-Performance | Version 84, L4, Maske 3; 10 Warmups, 50 Messungen | p95 <= 20 ms | Median 9,49 ms; p95 10,89 ms; Maximum 12,00 ms |
| Architekturprüfung | alle 21 Module unter `src/core` | keine DOM-, Canvas-, Kamera-, Datei- oder Netzreferenz | keine verbotene Referenz gefunden |

## 4. Kriteriennachweis

| Kriterium | Testeingabe und Erwartung | Tatsächliches Ergebnis und Nachweis | Status |
|---|---|---|---|
| AC-M1-001 | Drei Anhang-F-Beispiele; alle veröffentlichten Bits und Codewortströme müssen übereinstimmen | Informations-, RS-, Picket-Fence- und Funktionsinformationsströme sowie Endmatrizen stimmen; F.3.3-Abweichung gemäß `DEC-003` explizit geprüft (`annex-f.test.mjs`) | erfüllt |
| AC-M1-002 | Drei veröffentlichte Endmatrizen; Bytes, Text, Segmente und Metadaten erwartet | bytegenaue Nutzdaten, exakte Segmentmodus-/Längenfolge, Version, Level, Maske, Korrekturzahl und `]h0` stimmen (`annex-f.test.mjs`) | erfüllt |
| AC-M1-010 | Elf Modi mit Minimal-, Grenz-, Version-1/L1-Maximal- und Negativfällen | alle elf Modusleser und elf unmittelbar zu große Kapazitätsfälle geprüft (`payload-segments.test.mjs`, `mode-combinations.test.mjs`) | erfüllt |
| AC-M1-011 | Jede geordnete Modusnachbarschaft einschließlich ECI-Wechsel | 100 Datenmoduspaare, 20 ECI-/Daten-Nachbarschaften und ECI-zu-ECI-Ersetzung, zusammen alle 121 geordneten Paare (`mode-combinations.test.mjs`) | erfüllt |
| AC-M1-012 | acht Bit lange GS1- und URI-Indikatoren | beide eindeutig erkannt; reservierte erweiterte Indikatoren abgewiesen (`modes.test.mjs`, `payload-segments.test.mjs`) | erfüllt |
| AC-M1-013 | reservierte, abgeschnittene und überlange Datenströme | sämtliche geprüften Fälle werfen `PAYLOAD_INVALID`; zu große Version-1/L1-Ströme werden vor Matrixbau abgewiesen | erfüllt |
| AC-M1-014 | unbekannte ECI-Zuweisung 899 | Rohbytes und Segmentgrenzen bleiben erhalten, Gesamttext bleibt undefiniert (`eci.test.mjs`, `payload-segments.test.mjs`) | erfüllt |
| AC-M1-015 | kleinste und größte Werte/Gruppen für Numerisch, Chinesisch, GB18030 und Unicode | direkte Grenztests sowie Version-1/L1-Kapazitätsgrenzen bestehen (`payload-segments.test.mjs`, `mode-combinations.test.mjs`) | erfüllt |
| AC-M1-016 | allgemeine Daten, ECI, GS1, URI und Unicode | Symbologiebezeichner `]h0`, `]h1`, `]h2`, `]h4`, `]h8` stimmen mit Anhang K (`matrix-decoder.test.mjs`) | erfüllt |
| AC-M1-020 | 84 Versionen x 4 Level x 4 Masken | alle 1.344 Matrizen liefern Version, Dimension, Level und Maske exakt (`matrix-decoder.test.mjs`) | erfüllt |
| AC-M1-021 | vier Masken vorwärts/rückwärts, Funktionsmodule unverändert | alle Formeln und Involutionen bestehen bis Version 84 (`masks.test.mjs`) | erfüllt |
| AC-M1-022 | Datenbelegung Version 1-3 und 4-84 | jedes Datenmodul wird exakt einmal in Normreihenfolge besucht; Restmodule bleiben hell (`data-placement.test.mjs`, `function-pattern.test.mjs`) | erfüllt |
| AC-M1-023 | alle Normtabellenstrukturen und Blocktypen | 336 Version-/Level-Strukturen sowie 241 eindeutige RS-Blocktypen bestehen Split, Join und Picket-Fence-Rundlauf (`rs-blocks.test.mjs`, `rs-block-table.test.mjs`) | erfüllt |
| AC-M1-024 | korrigierbare Schäden in beiden Funktionsinformationskopien | beide Kopien werden gleichzeitig mit je einem beschädigten GF(16)-Symbol korrekt rekonstruiert (`function-information.test.mjs`) | erfüllt |
| AC-M1-025 | widersprüchliche oder nicht korrigierbare Funktionsinformation | Widerspruch und Ausfall beider Kopien liefern `FUNCTION_INFO_INVALID`; intakte Zweitkopie dient als normativer Rückfall | erfüllt |
| AC-M1-030 | fehlerfreie RS-Blöcke | bleiben byteidentisch und melden null Korrekturen (`reed-solomon.test.mjs`, `reed-solomon-coverage.test.mjs`) | erfüllt |
| AC-M1-031 | für alle 241 Blocktypen Fehlerzahl 1 bis `t`, Rand/Mitte/Seed | jeder Fall wird exakt zum ursprünglichen Codewort korrigiert (`reed-solomon-coverage.test.mjs`) | erfüllt |
| AC-M1-032 | Erasures nur, sofern in M1 aktiviert | Erasure-Eingaben sind in M1 nicht aktiviert und nicht Teil der öffentlichen M1-API | nicht anwendbar |
| AC-M1-033 | `t+1` unbekannte Fehler je Blocktyp | kein anderes Codewort wird als gültig akzeptiert; Erfolg ist nur bei exakter Ursprungsrekonstruktion zulässig (`reed-solomon-coverage.test.mjs`) | erfüllt |
| AC-M1-040 | unveränderte M1-Tests in Node und Browser | 115/115 in beiden Umgebungen; Browser nutzt dieselben Testmodule (`core-full.html`) | erfüllt |
| AC-M1-041 | `core` ohne Browser-, Kamera-, Datei- oder Netzabhängigkeit | statische Suche in 21 Kernmodulen ohne Treffer; ESM-Import in Node und Chromium erfolgreich | erfüllt |
| AC-M1-042 | Version 84/L4/Maske 3, p95 <= 20 ms | p95 10,89 ms bei 50 Messungen nach 10 Warmups (`matrix-to-payload.mjs`) | erfüllt |
| AC-M1-043 | identische Eingabe zweimal | vollständige Decodergebnisse sind tief byteidentisch (`matrix-decoder.test.mjs`) | erfüllt |

## 5. Wiederholung

Node-Korpus:

```powershell
node --test test/all.test.mjs
```

Browser-Korpus:

```powershell
node test/browser/server.mjs
```

Danach `http://127.0.0.1:4173/test/browser/core-full.html` in Chromium öffnen.
Die Seite muss `ok: true`, `tests: 115`, `passed: 115` und `failed: 0`
ausgeben.

Performance:

```powershell
node test/performance/matrix-to-payload.mjs
```

Das JSON-Ergebnis muss `passed: true` und `p95Ms <= 20` enthalten.

Architekturprüfung:

```powershell
rg -n -e '\bdocument\b' -e '\bwindow\b' -e '\bnavigator\b' `
  -e '\bCanvas\b' -e '\bcamera\b' -e '\bfetch\b' -e 'XMLHttpRequest' `
  -e 'WebSocket' -e 'node:fs' -e 'node:path' src/core --glob '*.js'
```

Erwartetes Ergebnis: keine Treffer.

## 6. Freigabeentscheidung

Alle anwendbaren Kriterien `AC-M1-*` sind erfüllt. `AC-M1-032` ist gemäß
seiner Bedingung nicht anwendbar, weil M1 keine Erasure-Schnittstelle
aktiviert. M1 ist damit abgeschlossen und bildet die freigegebene Grundlage
für M2, die Dekodierung sauberer digitaler Rasterbilder.
