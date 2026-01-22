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
- **Konsistenz**: Einheitliche Farben, Abstände, Icons

## Farbpalette

### Primärfarbe
- **Blau** für alle interaktiven Elemente und Akzente
- `text-blue-600` für Icons, Links, Highlights
- `bg-blue-50` für leichte Hintergründe
- `bg-blue-600` für primäre Buttons

### Semantische Farben (nur wo nötig)
- **Grün**: Erfolg, positive Zahlen, "OK"-Status
- **Rot**: Fehler, negative Zahlen, kritische Warnungen
- **Orange**: Warnungen, ausstehende Aktionen
- **Grau**: Neutrale Inhalte, deaktivierte Elemente

## Icons

### Grundregeln
- **Keine Emojis** in der UI (außer Schadensanalyse-Tab)
- **Inline SVGs** mit einheitlicher Farbe: `text-blue-600`
- Icons nur wo sie Mehrwert bieten, nicht zur Dekoration
- Größe: `w-5 h-5` für inline, `w-6 h-6` für hervorgehobene

### Standard-Icons (alle in blue-600)
```jsx
// Info/Details
<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>

// Geld/Kosten
<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>

// Auto/Fahrzeug
<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
</svg>

// Dokument/Liste
<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
</svg>

// Checkmark/Erledigt
<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
</svg>

// Uhr/Zeit
<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>

// Ort/Location
<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
</svg>

// Rechner/Kalkulation
<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
</svg>

// Export/Teilen
<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
</svg>
```

## Tailwind CSS Komponenten-Stil

### Cards
```
Standard: rounded-2xl shadow-sm border border-gray-100 bg-white p-4
Hervorgehoben: rounded-2xl shadow-md bg-blue-50 border border-blue-100 p-4
```

### Section Headers
```jsx
<div className="flex items-center gap-2 mb-3">
  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
    {/* Icon hier */}
  </div>
  <h3 className="font-semibold text-gray-900">Titel</h3>
</div>
```

### Buttons
```
Primary: bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium px-4 py-3
Secondary: bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl
Danger: bg-red-600 hover:bg-red-700 text-white rounded-xl
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

### Data Rows
```jsx
<div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
  <span className="text-gray-600">Label</span>
  <span className="text-gray-900 font-medium">Wert</span>
</div>
```

## Animationen & Transitions
```css
/* Standard Transition */
transition-all duration-200 ease-out

/* Hover-Effekte für Karten */
hover:shadow-md transition-shadow

/* Aktiv-Effekt für Buttons */
active:scale-[0.98]
```

## Schadens-Analyse (Sonderfall - darf Emojis nutzen)
Die Schadensanalyse-Seite ist die einzige, die Emojis verwenden darf, da sie komplexe technische Informationen vermittelt und die Emojis hier zur schnellen visuellen Orientierung dienen.

## Responsive Breakpoints
- Mobile: < 640px (Standard)
- Tablet: 640px - 1024px
- Desktop: > 1024px

## Accessibility
- Kontrastverhältnis mindestens 4.5:1
- Touch-Targets mindestens 44x44px
- Focus-States sichtbar
- Keine rein farbbasierten Informationen
