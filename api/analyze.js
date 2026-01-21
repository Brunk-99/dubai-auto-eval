// Vercel Serverless Function: POST /api/analyze
// High-End Vertex AI Proxy mit aggressivem Retry für Premium-Modelle

import { GoogleAuth } from 'google-auth-library';

// Vertex AI Configuration
const VERTEX_PROJECT = process.env.VERTEX_PROJECT || 'dubai-car-check';
const VERTEX_LOCATION = process.env.VERTEX_LOCATION || 'us-central1';

// NUR High-End Modelle - KEIN Fallback auf Flash/Lite
const VERTEX_MODEL = 'gemini-3-pro-preview';

// Retry Configuration
const MAX_RETRIES = 5;
const BASE_WAIT_MS = 5000; // 5 Sekunden Basis-Wartezeit

// Wechselkurs EUR/AED
const EUR_AED_RATE = 4.00;

// System-Instruction für KFZ-Gutachter Dubai/VAE
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

// Vertex AI URL Generator - v1beta1 für neue Modelle
const getVertexUrl = (model) =>
  `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1beta1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/${model}:generateContent`;

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contents, generationConfig, safetySettings } = req.body;

    if (!contents) {
      return res.status(400).json({ error: 'Missing contents' });
    }

    const partCount = contents[0]?.parts?.length || 0;
    console.log(`[Analyze] Processing request with ${partCount} parts...`);
    console.log(`[Analyze] Using HIGH-END model: ${VERTEX_MODEL}`);

    // Google Auth mit Service Account Credentials aus Environment
    let auth;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
    } else {
      auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
    }

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    // Request Body mit System Instruction und striktem JSON-Schema
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
        responseSchema: {
          type: 'OBJECT',
          properties: {
            bauteil: { type: 'STRING' },
            schaden_analyse: { type: 'STRING' },
            schweregrad: { type: 'NUMBER' },
            reparatur_weg: { type: 'STRING' },
            kosten_schaetzung_aed: {
              type: 'OBJECT',
              properties: {
                teile: { type: 'NUMBER' },
                arbeit: { type: 'NUMBER' },
                gesamt: { type: 'NUMBER' }
              }
            },
            kosten_schaetzung_eur: {
              type: 'OBJECT',
              properties: {
                gesamt_euro: { type: 'NUMBER' },
                umrechnungskurs: { type: 'NUMBER' }
              }
            },
            location_tipp: { type: 'STRING' },
            fahrbereit: { type: 'BOOLEAN' }
          }
        }
      },
      safetySettings: safetySettings || [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    };

    const url = getVertexUrl(VERTEX_MODEL);

    // AGGRESSIVE RETRY LOOP - Wir bleiben hartnäckig bei High-End Modellen
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`[Analyze] Attempt ${attempt}/${MAX_RETRIES} with model: ${VERTEX_MODEL}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // SUCCESS - Verarbeite Antwort
      if (response.ok) {
        const data = await response.json();
        console.log(`[Analyze] SUCCESS with model: ${VERTEX_MODEL} on attempt ${attempt}`);

        // Extrem sicheres JSON-Parsing
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const rawText = data.candidates[0].content.parts[0].text;
          console.log('[Analyze] RAW KI ANSWER:', rawText.substring(0, 500) + (rawText.length > 500 ? '...' : ''));

          const startBracket = rawText.indexOf('{');
          const endBracket = rawText.lastIndexOf('}');

          if (startBracket !== -1 && endBracket !== -1 && endBracket > startBracket) {
            const jsonString = rawText.substring(startBracket, endBracket + 1);
            try {
              const parsed = JSON.parse(jsonString);
              data.candidates[0].content.parts[0].text = JSON.stringify(parsed);
              console.log('[Analyze] JSON erfolgreich extrahiert und bereinigt');
            } catch (e) {
              console.warn('[Analyze] JSON-Parsing fehlgeschlagen, sende Rohtext:', e.message);
            }
          }
        }

        // Erfolg - Modell-Info mitgeben
        return res.status(200).json({
          ...data,
          _meta: {
            model: VERTEX_MODEL,
            attempt: attempt,
            status: 'success'
          }
        });
      }

      // ERROR - Analysiere Fehlertyp
      const errorData = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }));
      const errorMsg = errorData.error?.message || '';
      const statusCode = response.status;

      console.warn(`[Analyze] Attempt ${attempt} failed:`, statusCode, errorMsg);

      // 429 Resource Exhausted - RETRY mit Backoff
      if (statusCode === 429 || errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota')) {
        if (attempt < MAX_RETRIES) {
          const waitTime = BASE_WAIT_MS * attempt; // 5s, 10s, 15s, 20s, 25s
          console.log(`[Analyze] 429 Quota exhausted. Waiting ${waitTime/1000}s before retry...`);

          // Sende "retrying" Status ans Frontend (für Polling)
          // Bei synchronem Request können wir das nicht direkt, aber wir loggen es
          console.log(`[Analyze] STATUS: retrying - High-End Modell ausgelastet. Warte auf freien Slot (Versuch ${attempt}/${MAX_RETRIES})...`);

          await sleep(waitTime);
          continue; // Nächster Versuch
        }
      }

      // Model not found - Kein Retry, sofort Fehler
      if (errorMsg.includes('not found') || errorMsg.includes('does not have access')) {
        console.error(`[Analyze] Model ${VERTEX_MODEL} not available:`, errorMsg);
        return res.status(503).json({
          error: `High-End Modell ${VERTEX_MODEL} nicht verfügbar. Bitte später erneut versuchen.`,
          status: 'model_unavailable',
          _meta: { model: VERTEX_MODEL, attempt }
        });
      }

      // Andere Fehler - Auch retry versuchen
      if (attempt < MAX_RETRIES) {
        const waitTime = BASE_WAIT_MS * attempt;
        console.log(`[Analyze] Error ${statusCode}. Waiting ${waitTime/1000}s before retry...`);
        await sleep(waitTime);
        continue;
      }

      // Alle Retries aufgebraucht
      return res.status(statusCode || 500).json({
        error: errorMsg || 'Vertex AI Fehler nach mehreren Versuchen',
        status: 'failed_after_retries',
        _meta: { model: VERTEX_MODEL, attempts: attempt }
      });
    }

    // Sollte nie erreicht werden
    return res.status(500).json({
      error: 'Unerwarteter Fehler im Retry-Loop',
      status: 'unexpected_error'
    });

  } catch (error) {
    console.error('[Analyze] Server error:', error.message);
    return res.status(500).json({
      error: 'Analyse fehlgeschlagen: ' + error.message,
      status: 'server_error'
    });
  }
}

// Vercel Function Config
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
  maxDuration: 60, // 60 Sekunden Timeout für AI-Analyse inkl. Retries
};
