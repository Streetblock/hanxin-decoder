# M2-Plan - Saubere digitale Symbole

Stand: 2026-08-15  
Voraussetzung: M1 abgenommen in `docs/M1_AKZEPTANZBERICHT.md`

## Ziel und Grenze

M2 erweitert den bitgenauen Matrixdecoder um die Erkennung und Abtastung ideal
gerenderter Rasterbilder. Verpflichtend sind neutrale Rasterdaten in Browser
und Node, 2/3/4/8 Pixel pro Modul, rechtwinklige Rotation, normale und
invertierte Polarität, Grau/RGB/RGBA, transparenter Hintergrund, Rand und
Übersetzung sowie PNG- und JPEG-Adapter.

Beliebige Rotation, Perspektive, adaptive lokale Binarisierung, Unschärfe,
Rauschen und fotografierte Codes bleiben M3. Die M2-Erkennung darf daher eine
achsenparallele beziehungsweise rechtwinklig gedrehte, ideal gerenderte
Modulgeometrie voraussetzen, muss aber jeden Erfolg vollständig durch den
M1-Normkern validieren.

## Rastervertrag

Der öffentliche Grundtyp bleibt:

```ts
type RasterImage = {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
};
```

Die Kanalzahl wird ohne Plattformmetadaten aus der exakten Datenlänge
bestimmt:

- `width * height`: Graustufen;
- `width * height * 3`: RGB;
- `width * height * 4`: RGBA.

RGBA wird vor der Graustufenumwandlung auf Weiß komponiert. Andere Längen,
Nullmaße, nichtganzzahlige Maße und arithmetische Überläufe werden vor einer
Allokation abgewiesen.

## Arbeitspakete

### M2.1 Rasterbasis und Golden-Renderer

- strikte Rastervalidierung und kanonische Graustufenrepräsentation;
- Alpha-Komposition auf Weiß;
- deterministischer Renderer aus `BitMatrix` mit Ruhezone, Skalierung,
  Rotation, Polarität, Farbe, Transparenz und Position im Zielbild;
- Golden-Korpus aus den drei Anhang-F-Matrizen und dem 1.344er-Coverage-Satz.

Nachweis: Grundlagen für `AC-M2-001` bis `AC-M2-005` und `AC-M2-009`.

### M2.2 Ideale Binarisierung und Kandidatenrahmen

- globale Schwelle für ideale Schwarzweiß-, Grau- und Farbraster;
- automatische Polarität oder geordneter invertierter Zweitversuch;
- Erkennung zusammenhängender Symbolrahmen trotz zusätzlichem Bildrand und
  Übersetzung;
- harte Größen-, Kandidaten- und Zeitgrenzen.

Nachweis: `AC-M2-001`, `AC-M2-002`, `AC-M2-004`, `AC-M2-005`, `AC-M2-010`.

### M2.3 Orientierung, Dimension und Modulabtastung

- Normalisierung von 0/90/180/270 Grad;
- Dimensionskandidaten ausschließlich aus Version 1-84;
- getrennte Geometriepfade für Version 1-3 und 4-84;
- Mehrpunktabtastung idealer Module und Übergabe an `decodeMatrix`;
- Erfolg nur nach Funktionsinformation, RS und Payload-Validierung.

Nachweis: `AC-M2-001`, `AC-M2-002`, `AC-M2-006`, `AC-M2-007`.

### M2.4 Adapter, Parität und Abnahme

- Browser-Rastereingang ohne Netzwerkzugriff;
- Node-Adapter für neutrales Raster, PNG und JPEG mit dokumentierter Lizenz
  jeder Abhängigkeit;
- unveränderte Golden-Erwartungen in Node und Chromium;
- 1.000 digitale Negativbilder ohne Falschpositiv;
- Benchmark bis 1 Megapixel, 30+ Messungen, p95 <= 150 ms;
- M2-Akzeptanzbericht mit Status je `AC-M2-*`.

Nachweis: `AC-M2-001` bis `AC-M2-010`.

## Commit- und Prüffolge

Jedes Arbeitspaket wird getrennt committet. Vor jedem Commit laufen mindestens
die betroffenen Tests; vor M2-Abnahme laufen der vollständige M1-Korpus, der
M2-Rasterkorpus in Node und Chromium, der Negativkorpus und der
Performance-Test. M1-Golden-Vektoren dürfen durch M2 nicht verändert werden.

## M2 fertig, wenn

- alle Kriterien `AC-M1-*` weiterhin erfüllt sind;
- alle Kriterien `AC-M2-*` nachweislich erfüllt sind;
- kein erfolgreicher Decode ohne vollständige M1-Endvalidierung möglich ist;
- Raster-, PNG- und JPEG-Eingaben lokal und reproduzierbar in Browser und Node
  funktionieren;
- der M2-Akzeptanzbericht committed ist.
