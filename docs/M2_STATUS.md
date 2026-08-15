# M2 - Implementierungsstatus

Stand: 2026-08-15

## In Arbeit

M2.3 - Orientierung, Dimension und Modulabtastung

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
- Deterministische globale Schwelle aus minimaler und maximaler Luminanz mit
  konfigurierbarer Kontrastuntergrenze und optionaler fester Schwelle.
- Geordnete Kandidatenbildung: normale Polarität zuerst, invertierte Polarität
  als begrenzter zweiter Versuch; der zweite Versuch kann abgeschaltet werden.
- Exakter Vordergrundrahmen in Eingabekoordinaten trotz Ruhezone,
  zusätzlichem Bildrand und beliebiger ganzzahliger Übersetzung.
- Harte Standardgrenze von 16.777.216 Pixeln und höchstens zwei
  Polaritätskandidaten.
- Kontrollpunkte während Graustufenumwandlung, Kontrastscan und Binarisierung
  liefern stabil `ABORTED` beziehungsweise `TIMEOUT`.
- Öffentliche Exporte über das Hauptpaket und den Unterpfad `./vision`.
- Vollständiger gemeinsamer Korpus: 136/136 unter Node und 136/136 unter
  Chromium 151, null Fehler. Der Browserlauf dauerte 39,33 s.

## Als Nächstes

1. Aus dem Kandidatenrahmen ausschließlich Versionen 1-84 und ganzzahlige
   Modulgrößen ableiten.
2. Module rechtwinklig orientieren, abtasten und an `decodeMatrix` übergeben.

M2 ist erst abgeschlossen, wenn alle Kriterien `AC-M1-*` und `AC-M2-*`
erfüllt und im M2-Akzeptanzbericht nachgewiesen sind.
