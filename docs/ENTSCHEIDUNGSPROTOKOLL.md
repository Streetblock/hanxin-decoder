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
