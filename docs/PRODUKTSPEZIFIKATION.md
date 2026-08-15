# Han Xin Decoder - Produktspezifikation

Version: 0.1 (Arbeitsentwurf)  
Stand: 2026-08-15

## 1. Ziel und Produktversprechen

Das Produkt ist eine in JavaScript geschriebene Han-Xin-Decoderbibliothek nach
GB/T 21049-2022. Sie dekodiert sowohl ideale digitale Symbole als auch
fotografierte oder gescannte Symbole und läuft mit demselben normativen Kern im
Browser und unter Node.js.

Die Bibliothek trennt Bildverarbeitung, Symbolrekonstruktion,
Fehlerkorrektur und Nutzdateninterpretation vollständig von Benutzeroberfläche,
Kamera und Dateiformaten. Ein positives Ergebnis wird nur ausgegeben, wenn
Funktionsinformation, Reed-Solomon-Prüfung und Nutzdatenstruktur konsistent
sind. Heuristische Rohtexte gelten niemals als erfolgreicher Decode.

## 2. Referenzhierarchie

1. GB/T 21049-2022 ist die normative Quelle für Symbolaufbau, Datenkodierung,
   Maskierung, Codewortanordnung, Fehlerkorrektur und Dekodierung.
2. Die Beispiele in Anhang F dienen als bitgenaue Golden Vectors.
3. `Referenzen/maxidecode-js` dient ausschließlich als Referenz für robuste
   Suchstrategien, Wiederholungslogik und Laufzeitintegration. Seine
   MaxiCode-Geometrie und sein Payload-Code werden nicht übernommen.
4. Proprietäre Drittanbieter dürfen in lokalen Entwicklungs- und Testwerkzeugen
   als optionale Interoperabilitäts-Orakel eingesetzt werden. Sie sind keine
   Laufzeitabhängigkeit und keine normative Implementierungsquelle.

Bei einem Widerspruch gilt die Norm. Abweichungen oder Interpretationsfragen
werden mit Seiten-/Abschnittsbezug in einem Entscheidungsprotokoll dokumentiert.

## 3. Produktgrenzen

### 3.1 Im Umfang

- Han-Xin-Versionen 1 bis 84.
- Fehlerkorrekturstufen L1, L2, L3 und L4.
- Alle vier Masken `00`, `01`, `10` und `11`.
- Alle elf Nutzdatenmodi:
  - Numerisch;
  - Text;
  - Binär/Byte;
  - häufige chinesische Zeichen, Region 1;
  - häufige chinesische Zeichen, Region 2;
  - GB18030, Zwei-Byte-Bereich;
  - GB18030, Vier-Byte-Bereich;
  - ECI;
  - Unicode;
  - GS1;
  - URI.
- Moduswechsel innerhalb eines Symbols sowie korrekte Behandlung von
  Terminatoren, Auffüllung und reservierten Indikatoren.
- Eingaben aus Browserdateien, Drag-and-drop, Zwischenablage und Kamera.
- Node.js-Eingaben als neutrales Rasterobjekt sowie PNG und JPEG über einen
  getrennten Adapter.
- Rotation, Skalierung, invertierte Polarität, perspektivische Verzerrung,
  ungleichmäßige Beleuchtung, moderate Unschärfe, Bildrauschen und innerhalb
  der Fehlerkorrektur liegende Modulschäden.
- Rohbytes, dekodierter Text, Segmente und technische Metadaten als Ergebnis.
- Diagnoseinformationen über die erreichte oder fehlgeschlagene Stufe.

### 3.2 Außerhalb des ersten Produktumfangs

- Erzeugung von Han-Xin-Codes als öffentliche Produktfunktion.
- Dekodierung anderer Barcode-Symbologien.
- Gleichzeitige Rückgabe mehrerer Han-Xin-Symbole aus einem Bild. In Version
  1 wird das beste vollständig validierte Symbol zurückgegeben.
- Spiegelverkehrte Symbole; sie dürfen optional experimentell unterstützt
  werden, sind aber kein Freigabekriterium.
- Native Scanner-, TWAIN-, WIA- oder Betriebssystemtreiber.
- Geschäftliche Interpretation beliebiger GS1-Anwendungsbezeichner über die
  normgerechte Segment- und Trennzeichenausgabe hinaus.
- Cloudverarbeitung oder Übertragung von Bildern an einen Server.

## 4. Zielumgebungen

- Browser: aktuelle stabile Versionen von Chromium, Firefox und Safari.
- Node.js: aktive LTS-Version, zu Projektbeginn mindestens Node.js 20.
- Paketformat: ESM als kanonisches Format. Ein Browserbundle darf zusätzlich
  erzeugt werden. CommonJS ist nur erforderlich, wenn ein konkreter Abnehmer
  dies vor der API-Freigabe verlangt.
- Der normative Kern darf weder DOM-, Canvas-, Kamera- noch Dateisystemzugriffe
  enthalten.

## 5. Architektur

### 5.1 `core`

Reine, deterministische Standardlogik:

- Bitleser und Bitmatrix;
- Versions- und Kapazitätstabellen;
- Funktionsinformation und Fehlerkorrekturstufe;
- Funktions- und Datenmodulkarte;
- Masken und Demaskierung;
- Codewortanordnung, Blockbildung und Deinterleaving;
- Galois-Feld `GF(2^8)` und Reed-Solomon-Decoder;
- Parser für die elf Modi, ECI-Zustand, GS1 und URI;
- Validierung reservierter Werte, Längen und Terminatoren.

### 5.2 `vision`

Bildanalyse ohne Kenntnis der Nutzdatensemantik:

- Alpha-Komposition auf weißem Hintergrund und Graustufenumwandlung;
- globale und lokale/adaptive Binarisierung;
- Erkennung und Bewertung der vier Positionsmuster;
- Gruppierung zu Symbolkandidaten;
- perspektivische Transformation;
- Versionspfad 1-3 ohne Kalibriermuster;
- Versionspfad 4-84 mit Haupt- und Hilfskalibriermustern;
- Abtastung der Module mit Helligkeitswert und Konfidenz;
- optionale Kennzeichnung unsicherer Module als Erasure-Kandidaten.

### 5.3 `decoder`

Begrenzt und priorisiert die Hypothesensuche:

1. schnelle Detektion auf verkleinertem Bild;
2. Neubewertung der besten Regionen in Originalauflösung;
3. geordnete Versuche für Polarität und Binarisierung;
4. Rekonstruktion von Geometrie und Funktionsinformation;
5. Rasterabtastung, Demaskierung und Codewortgewinnung;
6. Reed-Solomon-Korrektur;
7. Nutzdateninterpretation;
8. strikte Endvalidierung und Rangbildung.

Ein Versuch darf früh beendet werden, sobald ein vollständig validiertes
Ergebnis vorliegt. Zeitbudget und `AbortSignal` werden zwischen teuren Stufen
geprüft.

### 5.4 `adapters`

- Browseradapter für `ImageBitmap`, `ImageData`, Datei, Zwischenablage und
  Kamera; rechenintensive Arbeit kann in einem Web Worker laufen.
- Node-Adapter für neutrale Rasterdaten, PNG und JPEG.
- CLI mit maschinenlesbarer JSON-Ausgabe und stabilen Exitcodes.

### 5.5 `demo`

Die Demo enthält `index.html`, Styles und einen UI-Controller. Sie importiert
nur die öffentliche Bibliotheks-API und besitzt keine eigene Decoderlogik.

## 6. Öffentliche API

Die exakten Namen werden vor Meilenstein 1 eingefroren. Der Zielvertrag lautet:

```ts
type RasterImage = {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
};

type DecodeOptions = {
  effort?: "fast" | "balanced" | "thorough";
  tryInverted?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
  diagnostics?: "none" | "basic" | "full";
};

declare function decodeImage(
  image: RasterImage,
  options?: DecodeOptions,
): Promise<DecodeResult>;

declare function decodeMatrix(
  matrix: BitMatrix,
  options?: MatrixDecodeOptions,
): DecodeResult;
```

### 6.1 Erfolgreiches Ergebnis

```ts
type DecodeSuccess = {
  ok: true;
  format: "han-xin";
  text: string;
  bytes: Uint8Array;
  segments: HanXinSegment[];
  symbologyIdentifier: string;
  version: number;
  dimension: number;
  errorLevel: "L1" | "L2" | "L3" | "L4";
  mask: 0 | 1 | 2 | 3;
  correctedCodewords: number;
  erasuresUsed: number;
  rotationDegrees: number;
  corners: readonly Point[];
  confidence: DecodeConfidence;
  diagnostics?: DecodeDiagnostics;
};
```

`segments` bewahrt Modusgrenzen und enthält je nach Segment Rohbytes,
dekodierten Text, ECI-Zuweisung und GS1-/URI-Kennzeichnung. `text` ist eine
bequeme Gesamtdarstellung, ersetzt aber nicht die verlustfreie Segmentausgabe.

### 6.2 Fehlergebnis

```ts
type DecodeFailure = {
  ok: false;
  code:
    | "UNSUPPORTED_INPUT"
    | "NO_SYMBOL"
    | "FINDER_PATTERN_NOT_FOUND"
    | "FUNCTION_INFO_INVALID"
    | "GRID_SAMPLING_FAILED"
    | "RS_UNCORRECTABLE"
    | "PAYLOAD_INVALID"
    | "TIMEOUT"
    | "ABORTED";
  message: string;
  diagnostics?: DecodeDiagnostics;
};
```

Normale Nicht-Erkennung wird als Ergebnis und nicht als Ausnahme behandelt.
Programmierfehler und verletzte API-Vorbedingungen dürfen Ausnahmen auslösen.

## 7. Funktionale Anforderungen

- **FR-001:** `core` liefert bei identischer Eingabe in Browser und Node
  bitidentische Ergebnisse.
- **FR-002:** Öffentliche Kernmodule haben keine Seiteneffekte und keine
  Abhängigkeit von globalem Browserzustand.
- **FR-010:** Der Payload-Parser unterstützt alle elf Modi und beliebige
  normgültige Modusfolgen.
- **FR-011:** GS1 und URI werden als acht Bit lange Präfixindikatoren erkannt;
  reservierte Präfixe werden abgewiesen.
- **FR-012:** ECI-Zuweisungen gelten ab ihrer Position bis zum nächsten
  ECI-Wechsel oder Datenende und bleiben in den Segmentmetadaten erhalten.
- **FR-013:** Rohbytes gehen auch dann nicht verloren, wenn eine Zeichencodierung
  unbekannt oder nicht darstellbar ist.
- **FR-014:** Das Ergebnis enthält den normgerechten Han-Xin-Symbologiebezeichner
  einschließlich Modifikator für allgemeine Daten, ECI, GS1, URI oder Unicode.
- **FR-020:** Version, Fehlerkorrekturstufe und Maske werden aus der
  Funktionsinformation fehlerkorrigiert und nicht aus der Bildgröße geraten.
- **FR-021:** Die Rasterrekonstruktion besitzt getrennte Verfahren für Version
  1-3 und Version 4-84.
- **FR-022:** Alle vier Masken werden exakt nach Norm aufgehoben.
- **FR-023:** Codewörter werden normgerecht extrahiert, deinterleaved und den
  korrekten RS-Blöcken zugeordnet.
- **FR-024:** Korrigierbare RS-Fehler werden korrigiert; nicht korrigierbare
  Blöcke erzeugen niemals ein erfolgreiches Ergebnis.
- **FR-025:** Ein Ergebnis gilt erst nach erfolgreicher Payload-Strukturprüfung
  als dekodiert.
- **FR-030:** Die Bildsuche verarbeitet beliebige Rotationen und moderate
  perspektivische Verzerrungen.
- **FR-031:** Ungleichmäßige Beleuchtung wird durch mindestens ein lokales
  Binarisierungsverfahren adressiert.
- **FR-032:** Invertierte Symbole werden standardmäßig versucht, wenn der
  normale Pfad nicht erfolgreich ist.
- **FR-033:** Kandidaten aus verschiedenen Vorverarbeitungen werden erhalten;
  die nachgelagerte Normvalidierung entscheidet.
- **FR-034:** Die Hypothesensuche ist durch Kandidatenzahl, Aufwandprofil,
  Zeitbudget und Abbruchsignal begrenzt.
- **FR-040:** Browserbilder werden vollständig lokal verarbeitet.
- **FR-041:** Node und Browser verwenden denselben `core`- und
  `decoder`-Quellcode.
- **FR-042:** Die Demo unterstützt Upload, Drag-and-drop, Einfügen, Kamera,
  Abbruch, erneutes Scannen und Kopieren des Ergebnisses.
- **FR-050:** Diagnoseausgaben unterscheiden mindestens Detektion,
  Funktionsinformation, Raster, RS und Payload.
- **FR-051:** Diagnoseausgaben enthalten standardmäßig keine vollständigen
  Eingabebilder und keine geheimen oder personenbezogenen Zusatzdaten.

## 8. Robustheitsstrategie

- Detektion zuerst auf einer Bildpyramide, Präzisierung anschließend nur in
  aussichtsreichen Regionen.
- Kombination aus Laufbreiten-/Strukturerkennung und geometrischer
  Vierpunktkonsistenz, damit einzelne QR-ähnliche Ecken nicht genügen.
- Homographie aus den Positionsmustern; Kalibriermuster verfeinern die lokale
  Geometrie großer Versionen.
- Mehrpunktabtastung pro Modul und lokale Schwelle statt ausschließlich eines
  einzelnen binären Pixels.
- Unsichere Module dürfen als Erasure-Hinweis dienen, sofern dies nachweislich
  die Korrektur verbessert und keine höhere Falschpositivrate erzeugt.
- Reed-Solomon und Payload-Syntax sind Validierungsstufen, kein Ersatz für eine
  plausible Geometrie und Funktionsinformation.

## 9. Vorläufige Leistungsbudgets

Die Referenzmaschine und Browserstände werden vor dem ersten Performance-Gate
im Testprotokoll festgeschrieben. Bis dahin gelten folgende Produktziele:

- Matrix-zu-Payload, einschließlich RS: p95 höchstens 20 ms pro Symbol.
- Sauberes Bild bis 1 Megapixel im Profil `balanced`: p95 höchstens 150 ms.
- Fotografiertes 1920x1080-Bild im Profil `balanced`: p95 höchstens 750 ms.
- Profil `thorough`: hartes Standardzeitbudget 2.000 ms pro Einzelbild.
- Kamera: Median höchstens 1.000 ms vom ersten vollständig sichtbaren Symbol
  bis zum validierten Ergebnis.
- Speicher: höchstens 128 MiB zusätzlicher Spitzenbedarf für ein 1920x1080-
  Einzelbild im Profil `balanced`.
- Browserhauptthread: keine Decoderarbeit über 50 ms am Stück, sofern Worker
  verfügbar sind.

Zeitüberschreitung führt zu `TIMEOUT`, niemals zu einem unvalidierten
Teilergebnis.

## 10. Qualitäts- und Sicherheitsanforderungen

- Keine Netzwerkzugriffe durch Bibliothek oder Demo während des Dekodierens.
- Keine dynamische Codeausführung aus Payloaddaten.
- Größen- und Überlaufprüfungen vor Speicherallokationen und Bitzugriffen.
- Deterministische Ergebnisse bei gleicher Eingabe und gleichen Optionen.
- Öffentliche Resultate sind JSON-serialisierbar, abgesehen von dokumentierten
  `Uint8Array`-Feldern.
- Keine erfolgreiche Dekodierung allein aufgrund eines plausibel aussehenden
  Texts.
- Jede veröffentlichte Binär- oder Quellabhängigkeit besitzt dokumentierte
  Herkunft und Lizenz.

## 11. Meilensteine

### M1 - Bitgenauer Normkern

Lieferumfang: Tabellen, Bitmatrix, Funktionsinformation, Masken,
Codewortanordnung, RS und elf Modi. Eingang ist eine bereits normalisierte
Bitmatrix oder ein Codewortstrom. Anhang-F-Vektoren und synthetische
Normvektoren sind exakt reproduzierbar.

### M2 - Saubere digitale Symbole

Lieferumfang: Detektion und Abtastung ideal gerenderter Rasterbilder,
rechtwinklige Rotationen, Skalierung, Transparenz, Farbe und invertierte
Darstellung. Browser- und Node-Rastereingang funktionieren.

### M3 - Robuste Bilderkennung

Lieferumfang: adaptive Binarisierung, beliebige Rotation, Homographie,
Kalibriermuster, Mehrhypothesensuche, Unschärfe-, Beleuchtungs- und
Rauschrobustheit sowie ein reales Foto-/Scan-Korpus.

### M4 - Produktintegration und Freigabe

Lieferumfang: stabile API, Paket, Node-CLI, Browserdemo, Kamera-Worker,
Diagnostik, Dokumentation, Performance-Nachweise und vollständiger
Akzeptanzbericht.

Die verbindlichen Exitkriterien stehen in `AKZEPTANZKRITERIEN.md`.

## 12. Festgelegte Annahmen und offene Entscheidungen

Für Version 0.1 gelten folgende Annahmen:

- Decoder-only ist der Produktumfang; ein interner Testencoder ist zulässig.
- Pro Bild wird genau das beste vollständig validierte Symbol zurückgegeben.
- ESM und Node.js 20 sind die Ausgangsbasis.
- PNG und JPEG sind die verpflichtenden Node-Dateiformate in M4.
- Spiegelung und strukturierte GS1-Geschäftssemantik bleiben Erweiterungen.

Vor API-Freeze zu entscheiden:

- endgültiger Paketname und Lizenz;
- konkrete Referenzmaschine für Performance-Gates;
- ob CommonJS als zusätzliches Distributionsformat benötigt wird;
- ob Diagnosebilder ausschließlich in Entwicklungsbuilds erlaubt sind;
- welche realen Scanner- und Kamerageräte den Freigabekorpus bilden.
