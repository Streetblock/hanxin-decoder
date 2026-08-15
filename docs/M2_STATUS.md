# M2 - Implementierungsstatus

Stand: 2026-08-15

## In Arbeit

M2.1 - Rasterbasis und Golden-Renderer

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
- Öffentliche Exporte über das Hauptpaket und den Unterpfad `./vision`.
- Vollständiger gemeinsamer Korpus nach der Erweiterung: 120/120 unter Node
  und 120/120 unter Chromium 151, null Fehler. Der Browserlauf dauerte 15,80 s.

## Als Nächstes

1. Den deterministischen Golden-Renderer aus `BitMatrix` für Skalierung,
   Ruhezone, Position, Rotation, Polarität, RGB/RGBA und Transparenz bauen.
2. Daraus das erste digitale M2-Korpus für die drei Anhang-F-Matrizen erzeugen.

M2 ist erst abgeschlossen, wenn alle Kriterien `AC-M1-*` und `AC-M2-*`
erfüllt und im M2-Akzeptanzbericht nachgewiesen sind.
