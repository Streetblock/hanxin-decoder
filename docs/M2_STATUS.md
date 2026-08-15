# M2 - Implementierungsstatus

Stand: 2026-08-15

## In Arbeit

M2.1 - Browser-Abgleich des vollständigen Golden-Renderer-Korpus

## Fertig und getestet

- Öffentlicher, plattformneutraler Rastervertrag ohne DOM-, Canvas-, Datei-
  oder Netzwerkabhängigkeit.
- Strikte Validierung positiver sicherer Dimensionen, arithmetisch sicherer
  Pixelzahl, erlaubter Typed Arrays und exakter Datenlänge.
- Eindeutige Formaterkennung aus der Datenlänge: Gray8, RGB8 und RGBA8.
- Deterministische Ganzzahl-Luminanz für RGB8.
- RGBA8-Komposition auf Weiß vor der Graustufenumwandlung.
- Eigener Gray8-Ausgabepuffer, sodass spätere Änderungen der Eingabe das
  normalisierte Raster nicht verändern.
- Deterministischer `BitMatrix`-Renderer mit ganzzahliger Modulgröße,
  Ruhezone, rechtwinkliger Drehung, Polaritätswechsel und frei platzierbarer
  Ausgabegröße.
- Gray8-, RGB8- und RGBA8-Ausgabe mit strikt geprüften Farbwerten; transparente
  Hintergründe werden ohne Plattform-API erzeugt.
- Digitaler Golden-Korpus aus allen drei finalen Anhang-F-Matrizen bei 2, 3, 4
  und 8 Pixeln pro Modul sowie 0/90/180/270 Grad.
- Baseline-Renderer-Korpus für alle 1.344 Kombinationen aus Version, Level und
  Maske bei 2 Pixeln pro Modul.
- Öffentliche Exporte über das Hauptpaket und den Unterpfad `./vision`.
- Vollständiger Korpus: 128/128 unter Node, null Fehler. Der Renderer selbst
  lief vor Ergänzung des 1.344er Baseline-Tests mit 127/127 auch unter
  Chromium 151; der abschließende Browserlauf des erweiterten Korpus steht aus.

## Als Nächstes

1. Deterministische globale Binarisierung für ideale Raster implementieren.
2. Symbolrahmen trotz zusätzlichem Rand und Zielbildübersetzung erkennen.

M2 ist erst abgeschlossen, wenn alle Kriterien `AC-M1-*` und `AC-M2-*`
erfüllt und im M2-Akzeptanzbericht nachgewiesen sind.
