# UI Skills

Sammlung von vier UI-Skills für hochwertige Interfaces.

---

## 1. Baseline UI

Opinionierte UI-Constraints zur Vermeidung von KI-generierten Interface-Qualitätsproblemen.

### Stack-Anforderungen
- **MUSS** Tailwind CSS Defaults verwenden
- `motion/react` für Animationen
- `cn` Utility für Class-Logik

### Komponenten
- Accessibility Primitives sind **Pflicht** für interaktive Elemente
- **NIEMALS** Primitive-Systeme innerhalb derselben Interaktionsfläche mischen
- `aria-label` auf Icon-only Buttons erforderlich

### Interaktions-Standards
- Destruktive Aktionen brauchen AlertDialogs
- Ladezustände nutzen strukturelle Skeletons
- Fehler werden kontextuell angezeigt
- **NIEMALS** Paste in input/textarea blockieren

### Animations-Constraints
- Animationen nur auf explizite Anfrage
- Nur Compositor-Properties (transform/opacity) animieren
- **NIEMALS** 200ms für Interaktions-Feedback überschreiten
- `prefers-reduced-motion` respektieren

### Typografie & Layout
- Headings brauchen `text-balance`
- Body-Text nutzt `text-pretty`
- Daten brauchen `tabular-nums`
- Feste z-index Skalen sind Pflicht

### Performance & Design
- Keine Animation großer Blur-Effekte
- Keine Gradienten ohne Anfrage
- Keine unnötigen Farb-Tokens einführen

---

## 2. Fixing Accessibility

Strukturierte Anleitung zur Identifizierung und Behebung von Accessibility-Problemen.

### 9 Prioritäts-Kategorien:

1. **Accessible Names** — Alle interaktiven Controls brauchen beschreibende Labels; Icon-only Buttons brauchen `aria-label`

2. **Keyboard Access** — Elemente müssen Tab-erreichbar sein mit sichtbarem Fokus; `tabindex > 0` vermeiden

3. **Focus and Dialogs** — Modals fangen Fokus und stellen ihn bei Schließen wieder her; Dialoge erhalten initialen Fokus

4. **Semantics** — Native Elemente vor ARIA-Workarounds bevorzugen; korrekte Heading-Hierarchie

5. **Forms and Errors** — Fehler via `aria-describedby` verknüpft; ungültige Felder mit `aria-invalid` markiert

6. **Announcements** — Kritische Updates nutzen `aria-live`; erweiterbare Controls nutzen `aria-expanded`

7. **Contrast and States** — Ausreichender Farbkontrast; Keyboard-Alternativen für Hover-Interaktionen

8. **Media and Motion** — Aussagekräftiger Alt-Text; Untertitel für Videos; `prefers-reduced-motion` respektieren

9. **Tool Boundaries** — Minimale Änderungen; natives HTML vor ARIA; kein unnötiges Refactoring

**Kernprinzip:** "Kritische Issues zuerst fixen (Namen, Keyboard, Fokus, Tool Boundaries)" mit Präferenz für native HTML-Lösungen vor ARIA-Patches.

---

## 3. Fixing Metadata

Anleitung für korrektes, vollständiges Metadata-Shipping.

### Kern-Regeln nach Priorität:

1. **Correctness** — Metadata an einer Stelle pro Seite definieren, konkurrierende Systeme und doppelte Tags vermeiden

2. **Titles & Descriptions** — Jede Seite braucht beides; knapp halten ohne Keyword-Stuffing

3. **Canonical & Indexing** — Canonical muss auf bevorzugte URL zeigen; noindex bedacht einsetzen

4. **Social Cards** — Teilbare Seiten brauchen Open Graph und Twitter Metadata mit absoluten Bild-URLs

5. **Icons & Manifest** — Favicon, apple-touch-icon und valides Manifest bei Bedarf einbinden

6. **Structured Data** — JSON-LD nur hinzufügen wenn es tatsächlichen Seiteninhalt widerspiegelt

7. **Locale & Alternates** — html lang, og:locale und hreflang korrekt setzen

8. **Tool Boundaries** — Minimale Diffs beibehalten und bestehenden Projekt-Patterns folgen

**Kernprinzip:** "Stabiles, langweiliges Metadata vor cleverem oder dynamischem" bevorzugen.

---

## 4. Fixing Motion Performance

Performance-Richtlinien für UI-Animationen über CSS, WAAPI, Motion, rAF und GSAP.

### 9 Prioritäts-Kategorien:

1. **Layout Reads/Writes** — Layout-Reads und -Writes nicht im selben Frame verschachteln

2. **Mechanism Selection** — `transform` und `opacity` als Standard für Motion; JS-Animation nur für interaktionsabhängige Szenarien

3. **Measurement** — Einmal messen, dann via transform/opacity animieren; DOM-Operationen batchen

4. **Scroll-Linked Motion** — Scroll oder View Timelines für scroll-verknüpfte Motion wenn verfügbar; kein Polling der Scroll-Position

5. **Paint Performance** — Paint-triggernde Animation nur auf kleinen, isolierten Elementen; nicht auf großen Containern

6. **Layer Management** — `will-change` temporär und chirurgisch einsetzen; mit Performance-Tools validieren

7. **Blur Effects** — Blur klein halten (<=8px); keine kontinuierliche Animation auf großen Flächen

8. **Tool Respect** — Animations-Libraries nicht migrieren oder umschreiben ohne explizite Anfrage

9. **Validation** — Verhalten mit Performance-Tools validieren

---

## Anwendung auf Dubai Auto Eval

### Direkt relevant:

**Baseline UI:**
- Tailwind CSS Defaults (bereits im Einsatz)
- `aria-label` auf Icon-Buttons
- Skeleton-Loader für Ladezustände
- `tabular-nums` für Zahlen in Tabellen

**Accessibility:**
- Labels auf allen Form-Inputs
- Korrekte Heading-Hierarchie
- Fokus-Management in Modals
- `aria-live` für Toast-Benachrichtigungen

**Motion Performance:**
- Nur transform/opacity animieren
- `prefers-reduced-motion` respektieren
- Blur-Effekte minimal halten

### Teilweise relevant:

**Metadata:**
- PWA Manifest bereits vorhanden
- OG-Tags für Sharing hinzufügen falls nötig

---

## Quelle

ibelick/ui-skills
https://github.com/ibelick/ui-skills
