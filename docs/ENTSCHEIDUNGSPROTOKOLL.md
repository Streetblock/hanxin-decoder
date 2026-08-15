# Han Xin Decoder - Entscheidungsprotokoll

Stand: 2026-08-15

## DEC-001: Helle Begleitmodule der Ausrichtungsmuster

**Status:** entschieden

**Kontext:** GB/T 21049-2022 beschreibt die Ausrichtungsmuster ab Version 4
als dunkle Linien mit einer angrenzenden hellen Linie. Diese hellen Module
müssen deshalb ebenso wie die dunklen Module von der Datenplatzierung und
Maskierung ausgeschlossen werden.

Ein stichprobenartiger Vergleich mit einem proprietären Drittanbieter-Encoder
zeigte bei Version 9 vollständige Übereinstimmung. Bei Version 11 enthielten
einzelne erwartete helle Begleitpositionen dagegen nutzlastabhängige dunkle
Werte. Die festen dunklen Module stimmten überein. Das Verhalten spricht dafür,
dass dieser Encoder an den betroffenen Positionen Daten platziert und die
helle Begleitlinie nicht vollständig reserviert.

**Entscheidung:** Die Kernbibliothek reserviert sämtliche dunklen und hellen
Module gemäß GB/T 21049-2022. Die Platzierungsreihenfolge wurde zusätzlich mit
der unabhängigen Zint-Implementierung nach ISO/IEC 20830:2021 abgeglichen.
Proprietäre Vergleichsencoder bleiben optionale Interoperabilitätsorakel,
überstimmen aber keine normative Vorgabe.

**Testfolge:** Die vollständige Funktionsmodulkarte wird für Version 1-84
erzeugt. Kapazitätsprüfungen lassen danach ausschließlich 1, 3, 5 oder 7
Restbits außerhalb der vollständigen Codewörter übrig. Alle vier Masken
verändern auch bei Version 84 kein reserviertes Modul.

## DEC-002: ECI-Zeichensatzinterpretation und Rohdatenerhalt

**Status:** entschieden

**Kontext:** GB/T 21049-2022 definiert den ECI-Modusindikator, die drei
Längenformen der Zuweisungsnummer und ihre Gültigkeit bis zum nächsten
ECI-Wechsel. Die Bedeutung der Zuweisungsnummern wird durch das in der Norm
referenzierte ECI-Register festgelegt. Mehrbytezeichen können dabei über
mehrere nachfolgende Han-Xin-Datensegmente verteilt sein.

**Entscheidung:** ECI-Zuweisung und Han-Xin-Segmentstruktur bleiben getrennte
Schichten. Die Bibliothek führt für bekannte Zeichensatzzuweisungen einen
strikten, zustandsbehafteten Decoder vom ECI-Indikator bis zum nächsten
ECI-Indikator oder Datenende. Unbekannte Zuweisungen, im jeweiligen
JavaScript-Laufzeitsystem nicht verfügbare Zeichensätze und ungültige
Bytefolgen bewahren die Rohbytes und Segmentgrenzen unverändert; für den
betroffenen ECI-Lauf wird kein Unicode-Text erzeugt.

**Testfolge:** Das ECI-Beispiel der Norm mit Zuweisung 9 und den Bytes
`A1 A2 A3 A4 A5` wird bytegenau gelesen. Ein UTF-8-Zeichen wird über zwei
Binärsegmente hinweg dekodiert, ein anschließender ECI-Wechsel wird
positionsgenau wirksam. Unbekannte und ungültige Zuweisungen bleiben
verlustfrei und textlos. Derselbe Mehrsegmentfall läuft in Node und Chromium.

## DEC-003: Überzählige Nullcodewörter in Anhang F, Beispiel 3

**Status:** entschieden

**Kontext:** Beispiel 3 ist als Version 17 mit Fehlerkorrekturstufe L2
festgelegt. F.3.3 bezeichnet seinen Informationscodewortstrom dennoch als
251 Codewörter und veröffentlicht nach den 195 Nutzdatenbytes insgesamt 56
Nullcodewörter. 251 ist die Datenkapazität von Version 17/L1. Unmittelbar
danach legt derselbe Abschnitt für L2 die drei Blöcke `(100,70,30)`,
`(100,70,30)` und `(99,69,30)` fest. Diese besitzen zusammen nur 209
Informationscodewörter und 90 Prüfcodewörter. F.3.4 sowie die veröffentlichte
Endmatrix entsprechen dieser L2-Struktur; die letzten 42 Nullcodewörter aus
F.3.3 gehen dort nicht ein.

**Entscheidung:** Der Golden-Test bewahrt F.3.3 vollständig mit allen 251
veröffentlichten Werten. Für den Übergang zu F.3.4 verwendet die Bibliothek
gemäß Tabelle B.1 und der im Beispiel selbst genannten L2-Blockstruktur die
ersten 209 Informationscodewörter. Die 42 überzähligen, ausschließlich
nullwertigen Codewörter werden als dokumentierte Norminkonsistenz behandelt,
nicht als Teil des L2-RS-Stroms.

**Testfolge:** Der Test fordert 251 veröffentlichte F.3.3-Codewörter, exakt 42
überzählige Nullcodewörter, die L2-Blöcke mit 209 Daten- und 90 Prüfcodewörtern
sowie die bytegenaue Übereinstimmung von F.3.4, F.3.5, F.3.6 und der Endmatrix.
