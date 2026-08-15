# M2-Akzeptanzbericht – Saubere digitale Symbole

Stand: 2026-08-16

Prüfbasis: M2-Abschlussstand

Ergebnis: **M2 abgenommen**

## 1. Umfang und Produktgrenze

M2 dekodiert lokal vorliegende, saubere digitale Han-Xin-Symbole aus neutralen
Gray8-, RGB8- und RGBA8-Rastern sowie PNG- und JPEG-Dateien. Verpflichtend sind
Version 1–84, L1–L4, alle vier Masken, beide Polaritäten, rechtwinklige
Rotationen, transparente und farbige Darstellungen sowie zusätzlicher Rand und
Verschiebung.

Beliebige Rotation, Perspektive, lokale Beleuchtungsänderungen, Unschärfe,
starkes Rauschen und reale Kameraaufnahmen gehören zu M3. M2 meldet für solche
oder sonst ungültigen Eingaben einen kontrollierten Fehlschlag und niemals ein
ungeprüftes Teilergebnis.

## 2. Laufzeitumgebungen

- CPU: 13th Gen Intel Core i9-13900H, 20 logische Prozessoren
- Betriebssystem: Microsoft Windows 10.0.26200, x64
- Node.js: v24.14.0
- Browser: Chromium 151.0.0.0, Windows x64

PNG und JPEG werden im Node-Adapter durch die exakt gepinnten Pakete `pngjs`
7.0.0 und `jpeg-js` 0.4.4 geladen. Die Browserprüfung verwendet native
`Blob`-, `ImageBitmap`- und Canvas-Funktionen. Alle Bilddaten bleiben lokal.

## 3. Gesamtergebnisse

| Lauf | Erwartung | Tatsächliches Ergebnis |
| --- | --- | --- |
| Node-Gesamtkorpus | alle gemeinsamen und Node-spezifischen Tests bestehen | 156/156 bestanden, 0 Fehler, 73,20 s |
| Chromium-Gesamtkorpus | alle gemeinsamen und Browser-spezifischen Tests bestehen | 155/155 bestanden, 0 Fehler, 54,04 s |
| Digitaler Vollkorpus | 84 × 4 × 4 Raster korrekt | 1.344/1.344 korrekt |
| Negativkorpus | null Erfolge aus 1.000 Bildern | 0/1.000 Erfolge |
| Raster-Performance | Profil `balanced`, p95 ≤ 150 ms bei höchstens 1 MP | 970.225 Pixel; Median 42,98 ms; p95 53,54 ms; Maximum 65,15 ms |

Der gemeinsame plattformneutrale Korpus umfasst 151 Tests. Hinzu kommen fünf
Node-Adaptertests beziehungsweise vier Browser-Adaptertests mit real kodierten
PNG- und JPEG-Eingaben.

## 4. Kriteriennachweis

| Kriterium | Testeingabe und Erwartung | Tatsächliches Ergebnis und Nachweis | Status |
| --- | --- | --- | --- |
| AC-M2-001 | alle 1.344 `COVERAGE`-Kombinationen mit 2 Pixeln je Modul | 1.344/1.344 werden bis zu Bytes und Metadaten korrekt dekodiert (`ideal-grid-decoder.test.mjs`) | erfüllt |
| AC-M2-002 | 0/90/180/270 Grad und beide Polaritäten | identische Bytes, Version, Level und Maske; erkannte Orientierung und Polarität stimmen (`ideal-grid-decoder.test.mjs`, `binarization.test.mjs`) | erfüllt |
| AC-M2-003 | transparente RGBA-Ausgabe gegen deckende Referenz | Alpha wird deterministisch auf Weiß komponiert und liefert dasselbe Ergebnis (`raster-image.test.mjs`, `ideal-grid-decoder.test.mjs`) | erfüllt |
| AC-M2-004 | farbige dunkle Module auf hellem Hintergrund | RGB-Luminanz und Kontrastschwelle liefern das Referenzergebnis (`binarization.test.mjs`, `matrix-renderer.test.mjs`) | erfüllt |
| AC-M2-005 | zusätzliche Ränder und verschiedene ganzzahlige Positionen | Rahmen und Payload bleiben exakt (`binarization.test.mjs`, `ideal-grid-decoder.test.mjs`) | erfüllt |
| AC-M2-006 | Version 1–3 und 4–84 über getrennte Geometriepfade | Diagnose meldet `corner-only` beziehungsweise `alignment-assisted`; beide Pfade dekodieren erfolgreich (`ideal-grid-decoder.test.mjs`) | erfüllt |
| AC-M2-007 | je 200 Dokument-, Text-, QR-, Data-Matrix- und Rauschbilder | alle 1.000 werden kontrolliert abgewiesen; null Falschpositive (`negative-corpus.test.mjs`) | erfüllt |
| AC-M2-008 | sauberes Bild bis 1 MP, 5 Warmups und 30 Messungen | 985 × 985 = 970.225 Pixel; p95 53,54 ms und damit 96,46 ms unter Budget (`raster-to-payload.mjs`) | erfüllt |
| AC-M2-009 | dieselben neutralen Raster in Node und Chromium | alle 151 gemeinsamen Tests liefern exakt dieselben erwarteten Bytes und Metadaten; Node- und Browser-PNG/JPEG-Adapter führen in dieselbe Raster-API | erfüllt |
| AC-M2-010 | Abbruch vor Start und an Kontrollpunkten einer teuren Stufe | stabiler Code `ABORTED`; synchrone Kernpipeline startet keinen Worker oder Hintergrundauftrag (`binarization.test.mjs`, `ideal-grid-decoder.test.mjs`, Adaptertests) | erfüllt |

Die bereits abgenommenen Kriterien `AC-M1-*` laufen im gemeinsamen Korpus als
Regressionstests unverändert weiter. Es besteht kein offener Normtreuedefekt.

## 5. API- und Ressourcenprüfung

- `decodeImage(raster, options)` ist plattformneutral und gibt immer ein
  Promise zurück.
- `./browser` akzeptiert lokale PNG-/JPEG-`Blob`s; beschädigte Inhalte,
  Größenüberschreitung, Abbruch und Zeitüberschreitung liefern stabile Fehler.
- `./node` akzeptiert PNG-/JPEG-Bytes und lokale Dateipfade. Signatur,
  Eingabegröße und Bilddimensionen werden vor teurer Dekodierung begrenzt.
- Standardgrenze für neutrale Raster: 16.777.216 Pixel.
- Die Rasterhypothesen sind auf zwölf und die Polaritätsversuche auf zwei
  begrenzt.
- Der Kern führt keine Netzanforderung aus und startet keine Hintergrundarbeit.
- Drittanbieter, Versionen und Lizenzen sind in
  `docs/THIRD_PARTY_NOTICES.md` dokumentiert.

## 6. Wiederholung

Node-Gesamtkorpus:

```powershell
npm.cmd test
```

Browser-Gesamtkorpus:

```powershell
npm.cmd run test:browser:serve
```

Danach `http://127.0.0.1:4173/test/browser/core-full.html` in Chromium öffnen.
Die Seite muss `ok: true`, `tests: 155`, `passed: 155` und `failed: 0`
ausgeben.

Performance:

```powershell
npm.cmd run test:raster-performance
```

Das JSON-Ergebnis muss `ok: true`, mindestens 30 Messungen und
`p95Ms <= 150` enthalten.

## 7. Freigabeentscheidung

Alle Kriterien `AC-M2-001` bis `AC-M2-010` sind erfüllt. Die M1-Regression ist
in Node und Chromium vollständig grün. M2 ist abgeschlossen und bildet die
freigegebene digitale Baseline für M3.
