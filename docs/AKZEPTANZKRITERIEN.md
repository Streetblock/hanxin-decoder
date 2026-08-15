# Han Xin Decoder - Akzeptanzkriterien

Version: 0.1 (Arbeitsentwurf)  
Stand: 2026-08-15

## 1. Grundregeln

Ein Kriterium ist nur erfüllt, wenn Testeingabe, erwartetes Ergebnis,
tatsächliches Ergebnis, Laufzeitumgebung und Wiederholungsanweisung im
Akzeptanzbericht festgehalten sind.

- Ein erfolgreicher Decode muss Bytes, Segmente und Metadaten exakt liefern.
- Ein falscher positiver Decode ist ein Freigabeblocker.
- Ein sauberer Fehler oder Timeout ist einem erfundenen Teilergebnis
  vorzuziehen.
- Zufallsbasierte Tests verwenden gespeicherte Seeds.
- Leistungstests laufen nach Aufwärmphase mindestens 30-mal; bewertet werden
  Median und p95.
- Tests dürfen proprietary third-party als Vergleichsinstanz verwenden, müssen aber mindestens
  einen unabhängigen normbasierten Erwartungswert besitzen.
- Normative Golden Vectors werden unverändert versioniert und erhalten eine
  dokumentierte Herkunft.

## 2. Testkorpus

### 2.1 Norm- und Matrixkorpus

`NORM`: Die drei Beispiele aus Anhang F mit Informationsbitstrom,
Informationscodewörtern, RS-Codewörtern, Maskenentscheidung,
Funktionsinformation und finaler Matrix.

`COVERAGE`: Mindestens ein gültiges Symbol für jede Kombination aus Version
1-84, L1-L4 und Maske 0-3, soweit die Kombination nach Norm gültig ist. Das
ergibt bei vollständiger Gültigkeit 1.344 Basissymbole.

`MODES`: Für jeden der elf Modi mindestens:

- minimale gültige Nutzlast;
- Nutzlast unmittelbar an einer Längen- oder Gruppen-Grenze;
- größtmögliche Nutzlast einer ausgewählten kleinen Version;
- Modus am Datenende;
- Modus vor und nach einem anderen Modus;
- ungültige beziehungsweise reservierte Präfixe als Negativfälle.

`RS`: Für jeden in den Versionstabellen vorkommenden RS-Blocktyp fehlerfreie,
korrigierbare und nicht korrigierbare Codewörter mit reproduzierbaren
Fehlerpositionen.

### 2.2 Digitales Bildkorpus

Aus den Matrixvektoren deterministisch gerenderte Bilder mit:

- 2, 3, 4 und 8 Pixeln pro Modul;
- 0, 90, 180 und 270 Grad Rotation;
- normaler und invertierter Polarität;
- Schwarzweiß, Graustufen, Farbe und transparentem Hintergrund;
- zusätzlichem Bildrand und unterschiedlichen Positionen im Bild;
- PNG und JPEG in den verpflichtenden Adaptern.

### 2.3 Synthetisches Robustheitskorpus

Jede Störungsfamilie wird zunächst einzeln und anschließend in einem
kontrollierten Kombinationssatz angewandt:

- beliebige Rotation von 0 bis unter 360 Grad;
- perspektivische Verschiebung jeder Ecke bis 20 % der Symbolkante;
- Helligkeitsgradient bis 45 % über die Symbolfläche;
- Kontrastabsenkung bis zu einer Schwarz-Weiß-Differenz von 50 Grauwerten;
- gaußsche Unschärfe bis 0,35 Modulbreiten Standardabweichung;
- additives Rauschen bis 8 % der Grauwertspanne;
- JPEG-Kompression bis Qualitätsstufe 40;
- teilweise Modulschäden innerhalb der jeweiligen RS-Korrekturkapazität;
- Randanschnitt, solange Positionsmuster und vorgeschriebene Abtastpunkte
  vollständig vorhanden bleiben.

Extremfälle jenseits dieser Grenzen bilden ein separates Ablehnungskorpus und
müssen lediglich kontrolliert und ohne Falschpositiv fehlschlagen.

### 2.4 Reales Korpus

Vor M3-Abnahme werden mindestens folgende, manuell klassifizierte Bilder
gesammelt:

- 300 erwartbar lesbare Aufnahmen;
- mindestens fünf Kamera- oder Scannergeräte;
- mindestens drei Symbolgrößen und drei Druck-/Darstellungsqualitäten;
- diffuse, gerichtete und schwache Beleuchtung;
- frontale, gedrehte und perspektivische Aufnahmen;
- zusätzlich 1.000 Bilder ohne Han-Xin-Code für die Falschpositivprüfung.

Jedes Bild erhält erwartete Bytes, Lesbarkeitsklasse, Gerät und
Aufnahmebedingungen. Trainings- oder Tuningbilder und Abnahmebilder sind
getrennt.

## 3. M1 - Bitgenauer Normkern

### M1-A Normbeispiele

- **AC-M1-001:** Alle drei Beispiele aus Anhang F ergeben in jedem
  dokumentierten Zwischenschritt exakt die normativen Bits und Codewörter.
- **AC-M1-002:** Die finale Matrix jedes Beispiels wird ohne Bildanalyse zu den
  erwarteten Bytes, Segmenten, Texten und Metadaten dekodiert.

### M1-B Modi und Nutzdaten

- **AC-M1-010:** Alle elf Modi bestehen sämtliche `MODES`-Fälle bytegenau.
- **AC-M1-011:** Jede paarweise sinnvolle Modusfolge wird mindestens einmal
  getestet; ECI-Wechsel und Rückkehr zu Folgemodi bleiben positionsgenau.
- **AC-M1-012:** GS1 und URI werden anhand ihrer acht Bit langen Indikatoren
  eindeutig erkannt.
- **AC-M1-013:** Reservierte Modusindikatoren, unvollständige Präfixe,
  überlange Längenfelder und vorzeitiges Datenende liefern `PAYLOAD_INVALID`.
- **AC-M1-014:** Unbekannte ECI-Zuweisungen bewahren Rohbytes und Segmentgrenzen
  und erzeugen keinen erfundenen Unicode-Text.
- **AC-M1-015:** Numerische, chinesische, GB18030- und Unicode-Grenzwerte direkt
  an ihren jeweils kleinsten und größten gültigen Werten bestehen.
- **AC-M1-016:** Der Symbologiebezeichner und sein Modifikator entsprechen für
  allgemeine Daten, ECI, GS1, URI und Unicode exakt Anhang K.

### M1-C Version, Maske und Codewörter

- **AC-M1-020:** Alle gültigen `COVERAGE`-Kombinationen werden aus ihrer Matrix
  mit korrekter Version, Dimension, Fehlerkorrekturstufe und Maske dekodiert.
- **AC-M1-021:** Die vier Masken sind in Hin- und Rückrichtung bitgenau und
  verändern keine Funktionsmodule.
- **AC-M1-022:** Datenmodule werden für Version 1-3 und Version 4-84 vollständig,
  ohne Duplikat und in normativer Reihenfolge besucht.
- **AC-M1-023:** Deinterleaving und Blockaufteilung stimmen für jeden in der
  Norm vorkommenden Blocktyp mit den Golden-Daten überein.
- **AC-M1-024:** Korrigierbare Bitfehler in beiden Gruppen der redundanten
  Funktionsinformation liefern dieselben Version-, Level- und Maskenwerte wie
  die fehlerfreie Referenz.
- **AC-M1-025:** Widersprüchliche oder nicht korrigierbare Funktionsinformation
  wird mit `FUNCTION_INFO_INVALID` abgewiesen.

### M1-D Reed-Solomon

- **AC-M1-030:** Fehlerfreie `RS`-Blöcke werden unverändert akzeptiert.
- **AC-M1-031:** Für jeden Block mit Korrekturkapazität `t` werden 1 bis `t`
  fehlerhafte Codewörter an Rand-, Mittel- und zufälligen Positionen exakt
  korrigiert.
- **AC-M1-032:** Getestete Kombinationen aus Fehlern und Erasures innerhalb der
  zulässigen Kapazität werden exakt korrigiert, sofern Erasures in M1 aktiviert
  sind.
- **AC-M1-033:** Mehr als `t` unbekannte Fehler führen entweder zu
  `RS_UNCORRECTABLE` oder werden nur dann akzeptiert, wenn das Ergebnis
  nachweislich das ursprüngliche gültige Codewort ist. Niemals darf ein anderes
  gültig erscheinendes Payload-Ergebnis zurückgegeben werden.

### M1-E Laufzeit und Struktur

- **AC-M1-040:** Dieselben M1-Tests laufen unverändert in Node und mindestens
  einem Browser-Testlauf.
- **AC-M1-041:** Kein Modul unter `core` referenziert DOM, Canvas, Kamera,
  Dateisystem oder Netzwerk.
- **AC-M1-042:** Matrix-zu-Payload erreicht auf der festgelegten
  Referenzmaschine p95 <= 20 ms.
- **AC-M1-043:** Zweimalige Ausführung mit identischer Eingabe ergibt
  byteidentische Resultate und Diagnosen.

M1 ist abgeschlossen, wenn alle Kriterien `AC-M1-*` erfüllt sind und kein
offener Defekt die Normtreue betrifft.

## 4. M2 - Saubere digitale Symbole

- **AC-M2-001:** 100 % des digitalen `COVERAGE`-Korpus mit mindestens 2 Pixeln
  pro Modul werden korrekt dekodiert.
- **AC-M2-002:** Alle rechtwinkligen Rotationen und beide Polaritäten liefern
  identische Bytes und Metadaten.
- **AC-M2-003:** Transparente Bilder werden auf weiß komponiert und ergeben
  dasselbe Resultat wie ihre deckende Referenz.
- **AC-M2-004:** Farbige dunkle Module auf hellem Hintergrund werden bei
  ausreichendem Luminanzkontrast korrekt verarbeitet.
- **AC-M2-005:** Übersetzung im Bild und zusätzlicher Hintergrundrand verändern
  das Resultat nicht.
- **AC-M2-006:** Version 1-3 und Version 4-84 werden jeweils über ihren
  vorgesehenen Geometriepfad dekodiert; dies ist über Diagnostik prüfbar.
- **AC-M2-007:** 1.000 reine Dokument-, Text-, QR-, Data-Matrix- und
  Rauschbilder erzeugen null erfolgreiche Han-Xin-Decodes.
- **AC-M2-008:** Ein sauberes Bild bis 1 Megapixel erreicht im Profil
  `balanced` p95 <= 150 ms.
- **AC-M2-009:** Node und Browser liefern für dieselben Rasterdaten
  byteidentische Ergebnisse.
- **AC-M2-010:** Abbruch vor Start oder während einer teuren Stufe ergibt
  `ABORTED` und hinterlässt keinen laufenden Hintergrundauftrag.

M2 ist abgeschlossen, wenn alle Kriterien `AC-M1-*` und `AC-M2-*` erfüllt
sind.

## 5. M3 - Robuste Bilderkennung

### M3-A Synthetische Störungen

- **AC-M3-001:** Jede einzelne Störungsfamilie innerhalb der in Abschnitt 2.3
  definierten Grenze erreicht mindestens 98 % korrekte Decodes.
- **AC-M3-002:** Der kontrollierte Zweifach-Störungssatz erreicht mindestens
  95 % korrekte Decodes.
- **AC-M3-003:** Beliebige Rotation verändert Nutzdaten und Metadaten nicht;
  die gemeldete Orientierung liegt innerhalb von 3 Grad.
- **AC-M3-004:** Perspektivisch verzerrte Symbole melden Ecken mit höchstens
  0,75 Modulbreiten mittlerem Reprojektionsfehler.
- **AC-M3-005:** Lokale Binarisierung wird bei Helligkeitsgradienten tatsächlich
  verwendet und ist über Diagnostik nachvollziehbar.
- **AC-M3-006:** Fehler innerhalb der RS-Kapazität werden korrekt gemeldet;
  jenseits der Kapazität erfolgt ein sauberer Fehlschlag ohne Falschpositiv.

### M3-B Reale Aufnahmen

- **AC-M3-010:** Mindestens 95 % der 300 als lesbar klassifizierten, zuvor nicht
  zum Tuning verwendeten Aufnahmen werden bytegenau dekodiert.
- **AC-M3-011:** Keine einzelne verpflichtende Geräteklasse unterschreitet
  90 % Erfolgsquote.
- **AC-M3-012:** Die 1.000 realen Negativbilder erzeugen null erfolgreiche
  Decodes.
- **AC-M3-013:** Jeder Fehlschlag besitzt mindestens einen stabilen Fehlercode
  und die zuletzt erreichte Pipeline-Stufe.

### M3-C Ressourcen

- **AC-M3-020:** Ein 1920x1080-Foto erreicht im Profil `balanced` p95 <= 750 ms.
- **AC-M3-021:** `thorough` beendet jeden Einzelbildversuch spätestens nach dem
  konfigurierten Standardbudget von 2.000 ms mit Erfolg oder `TIMEOUT`.
- **AC-M3-022:** Der zusätzliche Speicher-Spitzenbedarf bleibt für 1920x1080 im
  Profil `balanced` <= 128 MiB.
- **AC-M3-023:** Kandidaten- und Hypothesenzahlen besitzen dokumentierte obere
  Grenzen; ein adversariales Rauschbild kann keine unbegrenzte Suche auslösen.

M3 ist abgeschlossen, wenn alle Kriterien `AC-M1-*` bis `AC-M3-*` erfüllt
sind. Jede Abweichung von einer Prozentgrenze benötigt eine schriftliche
Produktentscheidung und ein zeitlich begrenztes Waiver.

## 6. M4 - Produktintegration und Freigabe

### M4-A Paket und Node

- **AC-M4-001:** Installation des erzeugten Pakets in einem leeren Node-Projekt
  und ESM-Import funktionieren ohne Zugriff auf den Quellbaum.
- **AC-M4-002:** PNG- und JPEG-Adapter dekodieren die zugehörigen M2- und
  M3-Testdateien mit denselben Ergebnissen wie der Rastereingang.
- **AC-M4-003:** Die CLI liefert bei Erfolg JSON und Exitcode 0, bei
  Nicht-Erkennung einen dokumentierten Nichtnull-Exitcode und bei
  Bedienfehlern einen davon verschiedenen Exitcode.
- **AC-M4-004:** Das veröffentlichte Paket enthält nur dokumentierte Dateien,
  Abhängigkeiten und Lizenzen.

### M4-B Browserdemo

- **AC-M4-010:** Upload, Drag-and-drop und Einfügen dekodieren dasselbe Bild
  identisch.
- **AC-M4-011:** Kamera kann gestartet, gestoppt und erneut gestartet werden;
  Tracks werden bei Stop, Erfolg und Seitenwechsel beendet.
- **AC-M4-012:** Nach erfolgreichem Kamera-Decode wird das Erfolgsbild
  eingefroren, bis der Nutzer erneut scannt oder löscht.
- **AC-M4-013:** Bei verfügbarem Worker blockiert keine Decoderarbeit den
  Hauptthread länger als 50 ms.
- **AC-M4-014:** Der Median vom ersten vollständig sichtbaren Kamerasymbol bis
  zum Ergebnis beträgt auf dem Referenzgerät <= 1.000 ms.
- **AC-M4-015:** Die wesentlichen Aktionen sind per Tastatur erreichbar und
  Statusänderungen besitzen verständliche zugängliche Beschriftungen.
- **AC-M4-016:** Während Upload-, Zwischenablage- und Kameratests werden keine
  Bild- oder Payloaddaten über das Netzwerk übertragen.

### M4-C API und Dokumentation

- **AC-M4-020:** Öffentliche Typen, Optionen, Fehlercodes und Beispiele sind
  vollständig dokumentiert.
- **AC-M4-021:** Browser und Node bestehen denselben öffentlichen API-Vertrag.
- **AC-M4-022:** `basic`-Diagnostik enthält keine Eingabebilder; `full` ist als
  entwicklungsorientiert dokumentiert und explizit zu aktivieren.
- **AC-M4-023:** Ein reproduzierbarer Freigabebefehl führt Tests, Korpusprüfung,
  Paketprüfung und Performance-Smoke-Test aus.
- **AC-M4-024:** Der Akzeptanzbericht enthält für jedes Kriterium Status,
  Testreferenz und Nachweis.

M4 und damit Version 1.0 sind abgeschlossen, wenn alle Kriterien
`AC-M1-*` bis `AC-M4-*` erfüllt, alle Freigabeblocker geschlossen und sämtliche
Abhängigkeiten lizenzseitig dokumentiert sind.

## 7. Rückverfolgbarkeit

Mindestens folgende Zuordnung wird im Testsystem gepflegt:

- FR-001 und FR-002 -> AC-M1-040, AC-M1-041 und AC-M1-043;
- FR-010 bis FR-014 -> AC-M1-010 bis AC-M1-016;
- FR-020 bis FR-025 -> AC-M1-020 bis AC-M1-033;
- FR-030 bis FR-034 -> AC-M2-001 bis AC-M3-023;
- FR-040 bis FR-042 -> AC-M4-001 bis AC-M4-016;
- FR-050 und FR-051 -> AC-M3-013, AC-M4-020 bis AC-M4-024.

Neue funktionale Anforderungen benötigen vor Implementierung mindestens ein
zugeordnetes Akzeptanzkriterium.
