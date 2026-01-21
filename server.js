// Production Server for Dubai Auto Eval
// Serves both Frontend (static files) and Backend (Vertex AI Proxy)
// Run with: node server.js

import express from 'express';
import cors from 'cors';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

// Set up paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Service Account Key - MUST be set on server, never in frontend!
const keyPath = path.join(__dirname, 'service-account-key.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Vertex AI Configuration
const VERTEX_PROJECT = process.env.VERTEX_PROJECT || 'dubai-car-check';
const VERTEX_LOCATION = process.env.VERTEX_LOCATION || 'us-central1';
// Gemini 3.0 Pro als Primary, Gemini 2.5 Pro als Fallback
const VERTEX_MODEL_PRIMARY = 'gemini-3.0-pro';
const VERTEX_MODEL_FALLBACK = 'gemini-2.5-pro-preview-05-06';
let currentModel = process.env.VERTEX_MODEL || VERTEX_MODEL_PRIMARY;

// Funktion um Vertex AI URL zu generieren
const getVertexUrl = (model) =>
  `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/${model}:generateContent`;

// Wechselkurs EUR/AED (kann später durch API ersetzt werden)
const EUR_AED_RATE = 4.00;

// System-Instruction für KFZ-Gutachter Dubai/VAE mit dynamischem Wechselkurs
const getSystemInstruction = (exchangeRate) => `Du bist ein KFZ-Gutachter für den Zweitmarkt in den VAE. Analysiere den Schaden basierend auf Werkstattpreisen in Al Quoz (Dubai) und Sharjah Industrial Area.

Nutze für Ersatzteile Preise für gebrauchte Originalteile (Scrap Parts) von Anbietern aus Sharjah (Sajja).

Der aktuelle Wechselkurs ist 1 EUR = ${exchangeRate.toFixed(2)} AED.

Berechne die Kosten in AED und rechne sie zusätzlich in EUR um.

Arbeitskosten: Nutze Stundensätze kleinerer, unabhängiger Garagen (ca. 100-200 AED pro Stunde).

Reparatur-Stil: Priorisiere 'Denting & Painting' (Ausbeulen und Lackieren) gegenüber Neukauf von Blechteilen.

Gib die Antwort STRENG als JSON aus mit folgendem Schema:
{
  "bauteil": "string",
  "schaden_analyse": "string",
  "schweregrad": 1-10,
  "reparatur_weg": "Gebrauchtteile/Denting/Lackierung",
  "kosten_schaetzung_aed": {
    "teile": number,
    "arbeit": number,
    "gesamt": number
  },
  "kosten_schaetzung_eur": {
    "gesamt_euro": number,
    "umrechnungskurs": ${exchangeRate.toFixed(2)}
  },
  "location_tipp": "z.B. Sharjah Industrial Area oder Al Quoz",
  "fahrbereit": boolean
}

Wichtig: Antworte NUR im JSON-Format ohne zusätzlichen Text.`;

// ============================================
// JOB QUEUE für asynchrone Analyse
// ============================================
const analysisJobs = new Map();

// Job-Status: pending | processing | completed | failed
// Job-Struktur: { status, createdAt, result, error }

// Cleanup alte Jobs (älter als 1 Stunde)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [jobId, job] of analysisJobs) {
    if (job.createdAt < oneHourAgo) {
      analysisJobs.delete(jobId);
      console.log(`[Jobs] Cleaned up old job: ${jobId}`);
    }
  }
}, 5 * 60 * 1000); // Alle 5 Minuten aufräumen

// Simple API Key for internal backend protection (optional but recommended)
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || null;

// CORS Configuration - restrict in production
const corsOptions = {
  origin: IS_PRODUCTION
    ? false  // Disable CORS in production (same origin)
    : true,  // Allow all origins in development (needed for LAN access from mobile)
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Optional: API Key protection for /api routes
if (INTERNAL_API_KEY) {
  app.use('/api/*', (req, res, next) => {
    const providedKey = req.headers['x-api-key'];
    if (providedKey !== INTERNAL_API_KEY) {
      console.warn(`[WARN] Unauthorized API access attempt from ${req.ip}`);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    project: VERTEX_PROJECT,
    model: currentModel,
    fallback: VERTEX_MODEL_FALLBACK,
    activeJobs: analysisJobs.size,
    environment: IS_PRODUCTION ? 'production' : 'development'
  });
});

// Also expose as /api/health for frontend compatibility
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    project: VERTEX_PROJECT,
    model: currentModel,
    activeJobs: analysisJobs.size
  });
});

// ============================================
// ASYNC ANALYZE ENDPOINT - Startet Job und gibt sofort jobId zurück
// ============================================
app.post('/api/analyze', async (req, res) => {
  try {
    const { contents, generationConfig, safetySettings } = req.body;

    if (!contents) {
      return res.status(400).json({ error: 'Missing contents' });
    }

    // Generiere eindeutige Job-ID
    const jobId = randomUUID();
    const partCount = contents[0]?.parts?.length || 0;

    // Job in Queue speichern
    analysisJobs.set(jobId, {
      status: 'pending',
      createdAt: Date.now(),
      result: null,
      error: null
    });

    console.log(`[Analyze] Job ${jobId} created with ${partCount} parts`);

    // Sofort antworten mit jobId
    res.json({
      jobId,
      status: 'pending',
      message: 'Analyse gestartet. Bitte Status abfragen.'
    });

    // Analyse im Hintergrund starten (nicht awaiten!)
    runAnalysisInBackground(jobId, contents, generationConfig, safetySettings);

  } catch (error) {
    console.error('[Analyze] Error creating job:', error.message);
    return res.status(500).json({
      error: 'Job konnte nicht erstellt werden.',
    });
  }
});

// ============================================
// HINTERGRUND-ANALYSE Funktion
// ============================================
async function runAnalysisInBackground(jobId, contents, generationConfig, safetySettings) {
  try {
    // Status auf "processing" setzen
    const job = analysisJobs.get(jobId);
    if (!job) return;
    job.status = 'processing';

    console.log(`[Analyze] Job ${jobId} processing...`);

    // Get access token using Service Account
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    // Request-Body mit System-Instruction für Gemini (dynamischer Wechselkurs)
    const requestBody = {
      system_instruction: {
        parts: [{ text: getSystemInstruction(EUR_AED_RATE) }]
      },
      contents,
      generationConfig: generationConfig || {
        temperature: 0.2,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
      safetySettings: safetySettings || [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    };

    // Versuche Primary Model, dann Fallback
    const modelsToTry = [VERTEX_MODEL_PRIMARY, VERTEX_MODEL_FALLBACK];
    let lastError = null;

    for (const model of modelsToTry) {
      const url = getVertexUrl(model);
      console.log(`[Analyze] Job ${jobId} trying model: ${model}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[Analyze] Job ${jobId} SUCCESS with model: ${model}`);
        currentModel = model;

        // Job als completed markieren
        job.status = 'completed';
        job.result = data;
        job.completedAt = Date.now();
        return;
      }

      // Fehler speichern und nächstes Modell versuchen
      lastError = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }));
      console.warn(`[Analyze] Job ${jobId} model ${model} failed:`, lastError.error?.message || response.status);

      const errorMsg = lastError.error?.message || '';
      if (!errorMsg.includes('not found') && !errorMsg.includes('does not have access')) {
        break;
      }
    }

    // Alle Modelle fehlgeschlagen
    console.error(`[Analyze] Job ${jobId} FAILED:`, lastError);
    job.status = 'failed';
    job.error = lastError?.error?.message || 'Vertex AI error';

  } catch (error) {
    console.error(`[Analyze] Job ${jobId} exception:`, error.message);
    const job = analysisJobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error.message;
    }
  }
}

// ============================================
// STATUS ENDPOINT - Frontend pollt hier
// ============================================
app.get('/api/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = analysisJobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      error: 'Job nicht gefunden',
      jobId
    });
  }

  // Basis-Response
  const response = {
    jobId,
    status: job.status,
    createdAt: job.createdAt
  };

  // Bei completed: Ergebnis mitliefern
  if (job.status === 'completed') {
    response.result = job.result;
    response.completedAt = job.completedAt;
    response.duration = job.completedAt - job.createdAt;
  }

  // Bei failed: Fehler mitliefern
  if (job.status === 'failed') {
    response.error = job.error;
  }

  res.json(response);
});

// ============================================
// LEGACY SYNC ENDPOINT (optional, falls benötigt)
// ============================================
app.post('/api/analyze-sync', async (req, res) => {
  try {
    const { contents, generationConfig, safetySettings } = req.body;

    if (!contents) {
      return res.status(400).json({ error: 'Missing contents' });
    }

    const partCount = contents[0]?.parts?.length || 0;
    console.log(`[Analyze-Sync] Processing request with ${partCount} parts...`);

    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const requestBody = {
      system_instruction: {
        parts: [{ text: getSystemInstruction(EUR_AED_RATE) }]
      },
      contents,
      generationConfig: generationConfig || {
        temperature: 0.2,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
      safetySettings: safetySettings || [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    };

    const modelsToTry = [VERTEX_MODEL_PRIMARY, VERTEX_MODEL_FALLBACK];
    let lastError = null;

    for (const model of modelsToTry) {
      const url = getVertexUrl(model);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        currentModel = model;
        return res.json(data);
      }

      lastError = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }));
      const errorMsg = lastError.error?.message || '';
      if (!errorMsg.includes('not found') && !errorMsg.includes('does not have access')) {
        break;
      }
    }

    return res.status(500).json({
      error: lastError?.error?.message || 'Vertex AI error',
    });

  } catch (error) {
    console.error('[Analyze-Sync] Server error:', error.message);
    return res.status(500).json({
      error: 'Analyse fehlgeschlagen.',
    });
  }
});

// In production: Serve static frontend files
if (IS_PRODUCTION) {
  const distPath = path.join(__dirname, 'dist');

  // Serve static files
  app.use(express.static(distPath));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/') || req.path === '/health') {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           Dubai Auto Eval - Server gestartet               ║
╠════════════════════════════════════════════════════════════╣
║  URL:         http://localhost:${PORT.toString().padEnd(27)}║
║  Environment: ${(IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT').padEnd(44)}║
║  Project:     ${VERTEX_PROJECT.padEnd(44)}║
║  Model:       ${VERTEX_MODEL_PRIMARY.padEnd(44)}║
║  Fallback:    ${VERTEX_MODEL_FALLBACK.padEnd(44)}║
║  Async Jobs:  ENABLED                                      ║
║  API-Key:     ${(INTERNAL_API_KEY ? 'Aktiviert' : 'Deaktiviert').padEnd(44)}║
╚════════════════════════════════════════════════════════════╝
`);

  if (!IS_PRODUCTION) {
    console.log('  → Frontend läuft separat auf http://localhost:5173');
    console.log('  → Für Produktion: npm run build && NODE_ENV=production node server.js\n');
  }
});
