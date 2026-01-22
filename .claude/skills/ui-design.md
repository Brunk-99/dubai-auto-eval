# UI Design Guidelines für Dubai Auto Eval

## Projekt-Kontext
Mobile-first PWA für KFZ-Schadensanalyse im Dubai/VAE-Markt. Zielgruppe: Autohändler, Mechaniker, Einkäufer.

## Sprache
- **Immer Deutsch** für alle UI-Texte
- Technische Begriffe können Englisch bleiben (z.B. "ADAS")

## Design-Philosophie
- **Mobile-first**: Primär für Smartphones optimiert
- **Klarheit über Dekoration**: Informationen müssen sofort erfassbar sein
- **Visuelle Hierarchie**: Wichtiges zuerst, Details auf Anfrage
- **Feedback**: Jede Aktion braucht visuelles Feedback

## Tailwind CSS Komponenten-Stil

### Cards
```
rounded-2xl shadow-sm border border-gray-100 bg-white p-4
Hover: hover:shadow-md transition-shadow
```

### Buttons
```
Primary: bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium px-4 py-3
Secondary: bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl
Danger: bg-red-600 hover:bg-red-700 text-white rounded-xl
Ghost: hover:bg-gray-100 rounded-xl
```

### Badges/Pills
```
rounded-full px-3 py-1 text-xs font-medium
Success: bg-green-100 text-green-700
Warning: bg-orange-100 text-orange-700
Danger: bg-red-100 text-red-700
Info: bg-blue-100 text-blue-700
Neutral: bg-gray-100 text-gray-600
```

### Inputs
```
rounded-xl border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
```

## Farb-Schema

### Semantische Farben
- **Erfolg/Positiv**: green-500/600 (Hintergrund: green-50)
- **Warnung/Prüfen**: orange-500/600 (Hintergrund: orange-50)
- **Fehler/Kritisch**: red-500/600 (Hintergrund: red-50)
- **Info/Neutral**: blue-500/600 (Hintergrund: blue-50)
- **Deaktiviert**: gray-400

### Schadens-Schweregrade
- **Leicht (1-3)**: Grün - `bg-green-500`, `text-green-700`
- **Mittel (4-6)**: Orange - `bg-orange-500`, `text-orange-700`
- **Schwer (7-8)**: Rot - `bg-red-500`, `text-red-700`
- **Kritisch (9-10)**: Dunkelrot - `bg-red-700`, `text-red-800`

### Konfidenz-Anzeige
- **Hoch (≥80%)**: `bg-green-100 text-green-700`
- **Mittel (50-79%)**: `bg-yellow-100 text-yellow-700`
- **Niedrig (<50%)**: `bg-gray-100 text-gray-500`

## Icons
- **Keine externen Libraries** (heroicons nicht installiert)
- Inline SVGs verwenden
- Emojis für visuelle Akzente:
  - ⚠️ Warnung/Muss ersetzt werden
  - 🔍 Prüfen/Untersuchen
  - ✅ Erledigt/OK
  - ❌ Fehler/Abgelehnt
  - 💰 Kosten/Geld
  - 🔧 Reparatur/Werkzeug
  - 📍 Ort/Location
  - ⏱️ Zeit/Dauer
  - 📊 Statistik/Analyse

## Animationen & Transitions
```css
/* Standard Transition */
transition-all duration-200 ease-out

/* Hover-Effekte */
hover:scale-[1.02] active:scale-[0.98]

/* Einblenden */
animate-fadeIn (opacity 0 → 1)

/* Slide-in von unten (Modals) */
animate-slideUp (translateY 100% → 0)
```

## Schadens-Analyse Darstellung

### Teileliste - Muss ersetzt werden
```
Card mit:
- border-l-4 border-red-500 (linker Akzent)
- bg-gradient-to-r from-red-50 to-white
- Icon: ⚠️ oder 🔴
- Teil-Name fett, schwarz
- Grund in rot
- Evidence kursiv, grau
- Konfidenz-Badge rechts oben
```

### Teileliste - Prüfen
```
Card mit:
- border-l-4 border-orange-500
- bg-gradient-to-r from-orange-50 to-white
- Icon: 🔍 oder 🟠
- Teil-Name fett
- Verdacht in orange
- Prüfanweisung in grau mit Icon 🔧
```

### Kosten-Anzeige
```
- Große Zahl für Gesamtkosten (mid)
- Range als kleinere Zeile darunter (low - high)
- Visuelle Fortschrittsbalken für Teile vs Arbeit
- EUR prominent, AED sekundär
```

### Arbeitszeit
```
- Horizontale Balken für jeden Posten
- Farben: Blau-Gradient
- Gesamtstunden groß rechts
```

### Risk Flags
```
- Pill-Badges in einer Reihe
- Gelber Hintergrund
- Deutsche Übersetzungen
- Tooltip mit Erklärung (falls möglich)
```

## Responsive Breakpoints
- Mobile: < 640px (Standard)
- Tablet: 640px - 1024px
- Desktop: > 1024px

## Accessibility
- Kontrastverhältnis mindestens 4.5:1
- Touch-Targets mindestens 44x44px
- Focus-States sichtbar
- Keine rein farbbasierten Informationen

## Performance
- Lazy Loading für Bilder
- Skeleton-States während Laden
- Optimistische UI-Updates
