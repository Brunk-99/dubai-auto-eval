# React Best Practices

**Version 1.0.0**
Vercel Engineering
Januar 2026

> **Hinweis:**
> Dieses Dokument ist hauptsächlich für Agenten und LLMs gedacht, die React und Next.js Codebases warten, generieren oder refaktorieren. Menschen können es ebenfalls nützlich finden, aber die Anleitung ist für Automatisierung und Konsistenz durch KI-gestützte Workflows optimiert.

---

## Zusammenfassung

Umfassender Performance-Optimierungsleitfaden für React und Next.js Anwendungen, entwickelt für KI-Agenten und LLMs. Enthält 40+ Regeln in 8 Kategorien, priorisiert nach Auswirkung von kritisch (Eliminierung von Wasserfällen, Reduzierung der Bundle-Größe) bis inkrementell (fortgeschrittene Muster). Jede Regel enthält detaillierte Erklärungen, praxisnahe Beispiele, die falsche vs. korrekte Implementierungen vergleichen, und spezifische Auswirkungsmetriken.

---

## Kategorien nach Priorität

### 1. Eliminierung von Wasserfällen — **KRITISCH**

Wasserfälle sind der #1 Performance-Killer. Jedes sequentielle await fügt volle Netzwerklatenz hinzu.

**Regeln:**
- 1.1 Defer Await Until Needed - `await` erst dort, wo es gebraucht wird
- 1.2 Dependency-Based Parallelization - Nutze `better-all` für maximale Parallelität
- 1.3 Prevent Waterfall Chains in API Routes - Starte unabhängige Operationen sofort
- 1.4 Promise.all() for Independent Operations - Parallele Ausführung statt sequentiell
- 1.5 Strategic Suspense Boundaries - Zeige Wrapper-UI schneller

### 2. Bundle Size Optimization — **KRITISCH**

Reduzierung der initialen Bundle-Größe verbessert Time to Interactive und LCP.

**Regeln:**
- 2.1 Avoid Barrel File Imports - Direkt von Quelldateien importieren (200-800ms Einsparung)
- 2.2 Conditional Module Loading - Große Module nur bei Bedarf laden
- 2.3 Defer Non-Critical Third-Party Libraries - Analytics nach Hydration laden
- 2.4 Dynamic Imports for Heavy Components - `next/dynamic` für große Komponenten
- 2.5 Preload Based on User Intent - Preload bei Hover/Focus

### 3. Server-Side Performance — **HOCH**

Optimierung von Server-Side Rendering und Data Fetching.

**Regeln:**
- 3.1 Authenticate Server Actions Like API Routes - Immer Auth in Server Actions prüfen
- 3.2 Avoid Duplicate Serialization in RSC Props - Transformationen im Client
- 3.3 Cross-Request LRU Caching - LRU Cache für übergreifende Requests
- 3.4 Minimize Serialization at RSC Boundaries - Nur benötigte Felder übergeben
- 3.5 Parallel Data Fetching with Component Composition - Komponenten parallelisieren
- 3.6 Per-Request Deduplication with React.cache() - Deduplikation pro Request
- 3.7 Use after() for Non-Blocking Operations - Logging nach Response

### 4. Client-Side Data Fetching — **MITTEL-HOCH**

Automatische Deduplikation und effiziente Data-Fetching-Muster.

**Regeln:**
- 4.1 Deduplicate Global Event Listeners - useSWRSubscription für geteilte Listener
- 4.2 Use Passive Event Listeners for Scrolling Performance - `{ passive: true }`
- 4.3 Use SWR for Automatic Deduplication - Automatische Deduplikation mit SWR
- 4.4 Version and Minimize localStorage Data - Versionierung und Minimierung

### 5. Re-render Optimization — **MITTEL**

Reduzierung unnötiger Re-Renders.

**Regeln:**
- 5.1 Defer State Reads to Usage Point - State erst lesen wenn nötig
- 5.2 Extract to Memoized Components - Teure Arbeit extrahieren
- 5.3 Narrow Effect Dependencies - Primitive Dependencies statt Objekte
- 5.4 Subscribe to Derived State - Boolean State statt kontinuierliche Werte
- 5.5 Use Functional setState Updates - Funktionale Updates für stabile Callbacks
- 5.6 Use Lazy State Initialization - Funktion an useState für teure Initialisierung
- 5.7 Use Transitions for Non-Urgent Updates - startTransition für nicht-dringende Updates

### 6. Rendering Performance — **MITTEL**

Optimierung des Rendering-Prozesses.

**Regeln:**
- 6.1 Animate SVG Wrapper Instead of SVG Element - Wrapper für Hardware-Beschleunigung
- 6.2 CSS content-visibility for Long Lists - content-visibility: auto
- 6.3 Hoist Static JSX Elements - Statische JSX außerhalb der Komponente
- 6.4 Optimize SVG Precision - Reduzierte Präzision für kleinere Dateien
- 6.5 Prevent Hydration Mismatch Without Flickering - Synchrones Script
- 6.6 Use Activity Component for Show/Hide - State/DOM erhalten
- 6.7 Use Explicit Conditional Rendering - Ternary statt && bei 0/NaN

### 7. JavaScript Performance — **NIEDRIG-MITTEL**

Mikro-Optimierungen für Hot Paths.

**Regeln:**
- 7.1 Batch DOM CSS Changes - Keine Verschachtelung von Reads und Writes
- 7.2 Build Index Maps for Repeated Lookups - Map statt wiederholtes .find()
- 7.3 Cache Property Access in Loops - Property-Zugriffe cachen
- 7.4 Cache Repeated Function Calls - Modul-Level Map für Caching
- 7.5 Cache Storage API Calls - localStorage/sessionStorage cachen
- 7.6 Combine Multiple Array Iterations - Mehrere filter/map in eine Schleife
- 7.7 Early Length Check for Array Comparisons - Länge zuerst prüfen
- 7.8 Early Return from Functions - Früh zurückkehren
- 7.9 Hoist RegExp Creation - RegExp außerhalb von Render
- 7.10 Use Loop for Min/Max Instead of Sort - O(n) statt O(n log n)
- 7.11 Use Set/Map for O(1) Lookups - Set/Map statt Array.includes
- 7.12 Use toSorted() Instead of sort() for Immutability - Keine Mutation

### 8. Advanced Patterns — **NIEDRIG**

Fortgeschrittene Muster für spezielle Fälle.

**Regeln:**
- 8.1 Store Event Handlers in Refs - Stabile Subscriptions
- 8.2 useLatest for Stable Callback Refs - Aktuelle Werte ohne Effect Re-Runs

---

## Anwendung auf dieses Projekt

### Relevante Regeln für Dubai Auto Eval (React/Vite PWA):

**Immer anwenden:**
- Promise.all für parallele API-Calls
- Lazy State Initialization für teure Initialisierung
- Functional setState Updates
- Set/Map für O(1) Lookups
- toSorted() statt sort()
- Early returns in Funktionen

**Bei Bedarf:**
- useMemo/memo für teure Berechnungen
- content-visibility für lange Listen
- Passive Event Listeners für Scroll-Handler

**Nicht relevant (kein Next.js):**
- Server Components
- Server Actions
- next/dynamic (stattdessen React.lazy verwenden)

---

## Referenzen

- https://react.dev
- https://github.com/shuding/better-all
- https://swr.vercel.app
- https://vercel.com/blog/how-we-optimized-package-imports-in-next-js
