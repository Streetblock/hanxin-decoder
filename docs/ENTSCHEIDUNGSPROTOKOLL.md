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
