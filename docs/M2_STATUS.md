# M2 – Abschlussstatus

Stand: 2026-08-16
Ergebnis: **M2 vollständig implementiert und abgenommen**

## Lieferumfang

- Plattformneutraler Rastervertrag für Gray8, RGB8 und RGBA8 mit strikter
  Größen-, Format- und Ressourcenprüfung.
- Deterministischer Renderer und digitaler Golden-Korpus für alle 1.344
  Kombinationen aus Version 1–84, L1–L4 und vier Masken.
- Globale Binarisierung, automatische Polarität und exakte Rahmenerkennung bei
  Ruhezone, zusätzlichem Rand und ganzzahliger Verschiebung.
- Normgültige Rasterhypothesen, Mehrpunktabtastung, alle vier rechtwinkligen
  Orientierungen und getrennte Geometriepfade für Version 1–3 sowie 4–84.
- Vollständige Validierung über Funktionsmuster, Funktionsinformation,
  Reed-Solomon und Payload-Struktur; kein Teilergebnis wird als Erfolg gemeldet.
- Asynchrone öffentliche `decodeImage`-API mit stabilen Erfolgs-, Fehler-,
  Diagnose-, Abbruch- und Zeitlimitverträgen.
- Lokale PNG-/JPEG-Adapter für Node und Browser. Der Haupt-, Browser- und
  Normkern bleiben frei von Node-Bildabhängigkeiten.
- Deterministischer Negativkorpus aus 1.000 Dokument-, Text-, QR-ähnlichen,
  Data-Matrix-ähnlichen und Rauschbildern ohne Falschpositiv.
- Gepinnte und dokumentierte Node-Adapter-Abhängigkeiten; keine bekannten
  Installations-Sicherheitsmeldungen.

## Abnahmeergebnisse

| Prüfung | Ergebnis |
| --- | --- |
| Node.js | 156/156 bestanden, 0 Fehler, 73,20 s |
| Chromium 151 | 155/155 bestanden, 0 Fehler, 54,04 s |
| Gemeinsamer plattformneutraler Korpus | 151 Tests in Node und Browser |
| Digitaler Vollkorpus | 1.344/1.344 korrekt dekodiert |
| Negativkorpus | 0/1.000 erfolgreiche Decodes |
| Raster-Performance, 970.225 Pixel | Median 42,98 ms; p95 53,54 ms; Maximum 65,15 ms |

Die vollständige Zuordnung zu `AC-M2-001` bis `AC-M2-010`, die
Laufzeitumgebungen und Wiederholungsanweisungen stehen in
`docs/M2_AKZEPTANZBERICHT.md`.

## Nächster Meilenstein

M3 erweitert die Pipeline auf beliebige Rotation, Perspektive, lokale
Binarisierung, Unschärfe, Rauschen, Kompressionsartefakte und reale
Kamera-/Scanneraufnahmen. M2 bleibt dabei die unveränderte digitale Baseline.
