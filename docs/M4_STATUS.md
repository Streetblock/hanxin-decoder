# M4 – Implementierungsstatus

Stand: 2026-08-16

## Fertig: M4.1 Browserdemo, erster Produktstand

- eigenständige responsive Oberfläche für Desktop und Mobilgeräte
- lokales Öffnen von PNG und JPEG
- Drag-and-drop und Einfügen aus der Zwischenablage
- Live-Kamera mit Umgebungskamera-Präferenz
- begrenzte Kameraabtastung mit höchstens 960 Pixeln längster Kante
- Kamera-Stop und Freigabe aller Media-Tracks
- eingefrorenes Erfolgsbild und erneutes Scannen
- Decoderarbeit in einem Modul-Worker, mit direktem Rückfall nur wenn Worker
  nicht verfügbar sind
- vollständige Ergebnisdarstellung für Text/Rohbytes, Version, Level, Maske,
  Ausrichtung, Polarität, Korrekturzahl, Symbologie und Segmente
- Kopieren des dekodierten Inhalts
- Tastaturbedienung, Fokusmarkierung und zugängliche Live-Statusmeldungen
- restriktive Content Security Policy mit `connect-src 'none'`
- sichtbarer Hinweis auf lokale Verarbeitung und die derzeitige M2-Bildgrenze

## Nachweise dieses Zwischenstands

- 159/159 Node-Tests bestanden, einschließlich drei neuer Demo-Vertragstests
- JavaScript-Syntaxprüfung für UI-Controller und Worker bestanden
- lokaler HTTP-Smoke-Test für HTML, CSS, Controller und Worker bestanden
- keine Netzwerk-API in Demo oder Worker
- keine Firmen- oder Referenznamen im Repository

## Noch offen für die vollständige M4-Abnahme

- interaktive Browserabnahme mit Datei, Drop, Paste und echten Kamerageräten
- Messung der Hauptthread-Blockierung und Kamera-Latenz
- Paketinstallation und Inhaltsprüfung
- Node-CLI mit dokumentierten Exitcodes
- vollständige öffentliche API- und Fehlercodedokumentation
- reproduzierbarer Freigabebefehl
- abschließender M4-Akzeptanzbericht

Die Erkennungsquote realer Kameraaufnahmen und die Kamera-Latenz werden nach M3
erneut abgenommen. Die Produktoberfläche kann bis dahin bereits gegen saubere,
rechtwinklige M2-Symbole verwendet werden.
