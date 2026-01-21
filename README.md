# Dubai Auto Eval

Mobile-first PWA für die Bewertung von Unfallfahrzeugen in Dubai (Kauf, Reparatur, Import nach Deutschland, Weiterverkauf).

## Features

- **Access Gate**: Zugangscode-basierter Schutz (Owner / Mechaniker)
- **Fahrzeug-Dashboard**: Übersicht aller Fahrzeuge mit Filter & Sortierung
- **Foto-Upload**: Komprimierte Bilder direkt von der Kamera/Galerie
- **KI-Schadensanalyse**: Simulierte Damage Reports (vorbereitet für echte AI-Integration)
- **Mechaniker-Reviews**: Reparaturschätzungen und Risikobewertungen
- **Kostenkalkulation**: Automatische Berechnung von Zoll, MwSt, Transport, etc.
- **Profit/ROI + Ampel**: Entscheidungshilfe mit Ampelsystem (Grün/Gelb/Rot)
- **Offline-fähig**: IndexedDB-Speicherung, PWA mit Service Worker
- **Installierbar**: Als App auf iPhone/Android installierbar

## Tech Stack

- Vite + React + JavaScript
- Tailwind CSS v4
- React Router
- IndexedDB (via `idb`)
- PWA (manifest + service worker)

## Installation

```bash
# Dependencies installieren
npm install

# Development Server starten
npm run dev

# Production Build
npm run build

# Preview des Builds
npm run preview
```

## Konfiguration

Erstelle eine `.env` Datei (oder kopiere `.env.example`):

```env
VITE_OWNER_CODE=dein-owner-code
VITE_MECHANIC_CODE=dein-mechaniker-code
```

## Rollen

| Rolle | Code-Variable | Berechtigungen |
|-------|---------------|----------------|
| Owner | `VITE_OWNER_CODE` | Alles: Fahrzeuge anlegen/bearbeiten/löschen, Einstellungen |
| Mechaniker | `VITE_MECHANIC_CODE` | Nur Reviews/Kommentare abgeben |

## Kostenlogik (Deutschland-Import)

```
Zoll (10%)       = Kaufpreis × 0.10
MwSt-Basis       = Kaufpreis + Zoll
MwSt (19%)       = MwSt-Basis × 0.19
Reparatur        = Durchschnitt Mechaniker-Schätzungen × (1 + Puffer%)
Gesamtkosten     = Kaufpreis + Zoll + MwSt + Transport + TÜV + Sonstiges + Reparatur
Profit           = Erwarteter Verkauf - Gesamtkosten
ROI              = (Profit / Gesamtkosten) × 100
```

## Ampel-Logik

| Farbe | Bedingung |
|-------|-----------|
| 🟢 Grün | Profit > 2.000€ UND Risiko ≠ hoch |
| 🟡 Gelb | Profit zwischen -500€ und 2.000€ ODER hohes Risiko bei gutem Profit |
| 🔴 Rot | Profit < -500€ ODER hoher Schaden + hohes Risiko |

## Ordnerstruktur

```
src/
├── components/     # Wiederverwendbare UI-Komponenten
├── lib/            # Utilities, Storage, Berechnungen
├── pages/          # Seiten/Routes
└── styles/         # CSS (Tailwind)

public/
├── manifest.json   # PWA Manifest
├── sw.js           # Service Worker
└── icon-*.png      # App Icons
```

## iPhone Installation

1. App im Safari öffnen (HTTPS erforderlich)
2. Share-Button tippen
3. "Zum Home-Bildschirm" wählen
4. Namen bestätigen und "Hinzufügen"

Die App öffnet sich dann im Vollbild-Modus ohne Safari-UI.

## Deployment

Für HTTPS (erforderlich für PWA):

```bash
# Build erstellen
npm run build

# dist/ Ordner auf deinen Server hochladen
# Stelle sicher, dass HTTPS aktiv ist
```

Empfohlene Hosting-Optionen:
- Vercel
- Netlify
- Cloudflare Pages

## Zukünftige Erweiterungen

- [ ] Echte OpenAI Vision API für Schadensanalyse
- [ ] PDF-Export der Kalkulation
- [ ] Mehrsprachigkeit
- [ ] Cloud-Sync (optional)
- [ ] Benachrichtigungen

## Lizenz

Private Nutzung.
