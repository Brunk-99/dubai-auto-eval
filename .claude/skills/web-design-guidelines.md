# Web Interface Guidelines

Review-Skill für UI-Code-Compliance. Prüfe Dateien gegen folgende Regeln. Output knapp aber umfassend. Hoher Signal-to-Noise-Ratio.

---

## Regeln

### Accessibility

- Icon-only Buttons brauchen `aria-label`
- Form Controls brauchen `<label>` oder `aria-label`
- Interaktive Elemente brauchen Keyboard-Handler (`onKeyDown`/`onKeyUp`)
- `<button>` für Aktionen, `<a>`/`<Link>` für Navigation (nicht `<div onClick>`)
- Bilder brauchen `alt` (oder `alt=""` wenn dekorativ)
- Dekorative Icons brauchen `aria-hidden="true"`
- Async Updates (Toasts, Validierung) brauchen `aria-live="polite"`
- Semantisches HTML (`<button>`, `<a>`, `<label>`, `<table>`) vor ARIA
- Hierarchische Headings `<h1>`–`<h6>`; Skip-Link für Hauptinhalt
- `scroll-margin-top` auf Heading-Ankern

### Focus States

- Interaktive Elemente brauchen sichtbaren Fokus: `focus-visible:ring-*` oder äquivalent
- Niemals `outline-none` ohne Fokus-Ersatz
- `:focus-visible` statt `:focus` verwenden (kein Focus-Ring bei Klick)
- `:focus-within` für zusammengesetzte Controls gruppieren

### Forms

- Inputs brauchen `autocomplete` und aussagekräftigen `name`
- Richtigen `type` verwenden (`email`, `tel`, `url`, `number`) und `inputmode`
- Niemals Paste blockieren (`onPaste` + `preventDefault`)
- Labels klickbar (`htmlFor` oder Control umschließend)
- Spellcheck bei E-Mails, Codes, Benutzernamen deaktivieren (`spellCheck={false}`)
- Checkboxes/Radios: Label + Control teilen sich Hit-Target (keine toten Zonen)
- Submit-Button bleibt aktiv bis Request startet; Spinner während Request
- Fehler inline neben Feldern; ersten Fehler bei Submit fokussieren
- Platzhalter enden mit `…` und zeigen Beispielmuster
- `autocomplete="off"` auf Non-Auth-Feldern (Passwort-Manager vermeiden)
- Warnung vor Navigation mit ungespeicherten Änderungen

### Animation

- `prefers-reduced-motion` respektieren (reduzierte Variante oder deaktivieren)
- Nur `transform`/`opacity` animieren (Compositor-freundlich)
- Niemals `transition: all` — Eigenschaften explizit auflisten
- Korrekten `transform-origin` setzen
- SVG: Transforms auf `<g>` Wrapper mit `transform-box: fill-box; transform-origin: center`
- Animationen unterbrechbar — auf User-Input mid-Animation reagieren

### Typography

- `…` nicht `...`
- Geschweifte Anführungszeichen `"` `"` nicht gerade `"`
- Geschützte Leerzeichen: `10&nbsp;MB`, `⌘&nbsp;K`, Markennamen
- Ladezustände enden mit `…`: `"Laden…"`, `"Speichern…"`
- `font-variant-numeric: tabular-nums` für Zahlenspalten/-vergleiche
- `text-wrap: balance` oder `text-pretty` auf Headings (verhindert Hurenkinder)

### Content Handling

- Text-Container handhaben langen Inhalt: `truncate`, `line-clamp-*`, oder `break-words`
- Flex-Children brauchen `min-w-0` für Text-Truncation
- Empty States behandeln — keine kaputte UI für leere Strings/Arrays
- User-Generated Content: kurze, durchschnittliche und sehr lange Eingaben antizipieren

### Images

- `<img>` braucht explizite `width` und `height` (verhindert CLS)
- Below-fold Bilder: `loading="lazy"`
- Above-fold kritische Bilder: `priority` oder `fetchpriority="high"`

### Performance

- Große Listen (>50 Items): virtualisieren (`virtua`, `content-visibility: auto`)
- Keine Layout-Reads im Render (`getBoundingClientRect`, `offsetHeight`, `offsetWidth`, `scrollTop`)
- DOM Reads/Writes batchen; nicht verschachteln
- Uncontrolled Inputs bevorzugen; Controlled Inputs müssen günstig pro Tastendruck sein
- `<link rel="preconnect">` für CDN/Asset-Domains hinzufügen
- Kritische Fonts: `<link rel="preload" as="font">` mit `font-display: swap`

### Navigation & State

- URL spiegelt State wider — Filter, Tabs, Pagination, erweiterte Panels in Query-Params
- Links verwenden `<a>`/`<Link>` (Cmd/Ctrl+Click, Mittelklick-Support)
- Alle stateful UI deep-linken (wenn `useState`, URL-Sync erwägen via nuqs o.ä.)
- Destruktive Aktionen brauchen Bestätigungs-Modal oder Undo-Fenster — niemals sofort

### Touch & Interaction

- `touch-action: manipulation` (verhindert Double-Tap Zoom-Delay)
- `-webkit-tap-highlight-color` bewusst setzen
- `overscroll-behavior: contain` in Modals/Drawers/Sheets
- Während Drag: Textauswahl deaktivieren, `inert` auf gezogenen Elementen
- `autoFocus` sparsam verwenden — nur Desktop, einzelner primärer Input; auf Mobile vermeiden

### Safe Areas & Layout

- Full-Bleed Layouts brauchen `env(safe-area-inset-*)` für Notches
- Ungewollte Scrollbars vermeiden: `overflow-x-hidden` auf Containern, Content-Overflow fixen
- Flex/Grid statt JS-Messung für Layout

### Dark Mode & Theming

- `color-scheme: dark` auf `<html>` für Dark Themes (fixt Scrollbar, Inputs)
- `<meta name="theme-color">` passt zum Seitenhintergrund
- Native `<select>`: explizite `background-color` und `color` (Windows Dark Mode)

### Locale & i18n

- Datum/Zeit: `Intl.DateTimeFormat` verwenden, nicht hardcodierte Formate
- Zahlen/Währung: `Intl.NumberFormat` verwenden, nicht hardcodierte Formate
- Sprache via `Accept-Language` / `navigator.languages` erkennen, nicht IP

### Hydration Safety

- Inputs mit `value` brauchen `onChange` (oder `defaultValue` für Uncontrolled)
- Datum/Zeit-Rendering: vor Hydration-Mismatch schützen (Server vs Client)
- `suppressHydrationWarning` nur wo wirklich nötig

### Hover & Interactive States

- Buttons/Links brauchen `hover:` State (visuelles Feedback)
- Interaktive States erhöhen Kontrast: Hover/Active/Focus prominenter als Ruhe

### Content & Copy

- Aktive Stimme: "Installiere die CLI" nicht "Die CLI wird installiert"
- Title Case für Headings/Buttons (Chicago Style)
- Ziffern für Zählungen: "8 Deployments" nicht "acht"
- Spezifische Button-Labels: "API-Key speichern" nicht "Weiter"
- Fehlermeldungen enthalten Fix/nächsten Schritt, nicht nur das Problem
- Zweite Person; erste Person vermeiden
- `&` statt "und" wo Platz begrenzt

### Anti-patterns (markieren)

- `user-scalable=no` oder `maximum-scale=1` deaktiviert Zoom
- `onPaste` mit `preventDefault`
- `transition: all`
- `outline-none` ohne focus-visible Ersatz
- Inline `onClick` Navigation ohne `<a>`
- `<div>` oder `<span>` mit Click-Handlern (sollte `<button>` sein)
- Bilder ohne Dimensionen
- Große Arrays `.map()` ohne Virtualisierung
- Form-Inputs ohne Labels
- Icon-Buttons ohne `aria-label`
- Hardcodierte Datum/Zahlen-Formate (stattdessen `Intl.*`)
- `autoFocus` ohne klare Begründung

---

## Output Format

Nach Datei gruppieren. `file:line` Format (VS Code klickbar). Knappe Findings.

```text
## src/Button.tsx

src/Button.tsx:42 - Icon-Button fehlt aria-label
src/Button.tsx:18 - Input fehlt Label
src/Button.tsx:55 - Animation fehlt prefers-reduced-motion
src/Button.tsx:67 - transition: all → Eigenschaften auflisten

## src/Modal.tsx

src/Modal.tsx:12 - fehlt overscroll-behavior: contain
src/Modal.tsx:34 - "..." → "…"

## src/Card.tsx

✓ pass
```

Problem + Ort angeben. Erklärung nur wenn Fix nicht offensichtlich. Keine Präambel.

---

## Quelle

Vercel Engineering - Web Interface Guidelines
https://github.com/vercel-labs/web-interface-guidelines
