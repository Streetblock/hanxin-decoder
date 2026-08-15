# M4 – Produktintegration und Freigabe

Stand: 2026-08-16

M4 wird vor M3 begonnen. Die Browserdemo und die Produktintegration verwenden
zunächst die freigegebene M2-Bildpipeline. Dadurch sind Datei- und
Kameraabläufe früh benutzbar; fotografische Robustheit außerhalb sauberer,
rechtwinkliger Symbole bleibt bis M3 ausdrücklich begrenzt.

## M4.1 – Browserdemo

- Upload, Drag-and-drop und Einfügen lokaler PNG-/JPEG-Bilder
- Live-Kamera mit Start, Stop, erneutem Scannen und eingefrorenem Erfolgsbild
- Decoderarbeit in einem Web Worker, sofern verfügbar
- Ergebnisdarstellung für Text, Bytes, Segmente und Symbolmetadaten
- zugängliche Tastaturbedienung und verständliche Live-Statusmeldungen
- keine Übertragung von Bild- oder Nutzdaten

## M4.2 – Paket und CLI

- reproduzierbares Paket mit dokumentiertem Dateiinhalt
- Installationstest in einem leeren Projekt
- Node-CLI mit JSON-Ausgabe und getrennten Exitcodes
- vollständige Lizenz- und Drittanbieterhinweise

## M4.3 – API und Dokumentation

- stabiler öffentlicher Browser-/Node-Vertrag
- dokumentierte Optionen, Fehlercodes und Beispiele
- Datenschutz- und Diagnosevertrag
- reproduzierbarer Freigabebefehl

## M4.4 – Abnahme

- automatisierter UI-Vertrag und Browserfunktionsprüfung
- Kamera-Lebenszyklus und Worker-Verhalten
- Paket-, CLI-, Netzwerk- und Performance-Nachweise
- M4-Akzeptanzbericht mit Zuordnung zu allen `AC-M4-*`

M4.1 kann auf M2 vollständig implementiert werden. Die endgültigen
Erkennungsquoten und Kamera-Zeitbudgets werden nach Integration von M3 erneut
gemessen; M4 gilt deshalb bis dahin als begonnen, nicht als vollständig
abgenommen.
