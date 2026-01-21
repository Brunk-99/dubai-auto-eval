// Vercel Serverless Function: POST /api/analyze
// High-End Vertex AI Proxy mit aggressivem Retry für Premium-Modelle

import { GoogleAuth } from 'google-auth-library';

// Vertex AI Configuration
const VERTEX_PROJECT = process.env.VERTEX_PROJECT || 'dubai-car-check';
const VERTEX_LOCATION = process.env.VERTEX_LOCATION || 'us-central1';

// High-End Pro-Modelle - KEIN Fallback auf Flash/Lite!
// Priority: 2.5 Pro (neueste) -> 1.5 Pro (bewährt, immer verfügbar)
const VERTEX_MODELS = [
  'gemini-2.5-pro-001',   // Neueste Pro-Version (Beta)
  'gemini-1.5-pro-002'    // Bewährte Pro-Version (stabil)
];

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

    // PRO-SWITCH: Versuche Modelle der Reihe nach (2.5 Pro -> 1.5 Pro)
    // Innerhalb jedes Modells: Aggressive Retry bei 429
    for (const currentModel of VERTEX_MODELS) {
      const url = getVertexUrl(currentModel);
      console.log(`[Analyze] Trying HIGH-END model: ${currentModel}`);

      // AGGRESSIVE RETRY LOOP für aktuelles Modell
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(`[Analyze] Attempt ${attempt}/${MAX_RETRIES} with model: ${currentModel}`);

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
          console.log(`[Analyze] SUCCESS with model: ${currentModel} on attempt ${attempt}`);

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
              model: currentModel,
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

        // Model not found (404) - Wechsle zum nächsten Pro-Modell
        if (statusCode === 404 || errorMsg.includes('not found') || errorMsg.includes('does not have access')) {
          console.log(`[Analyze] Model ${currentModel} not available. Trying next Pro model...`);
          break; // Breche Retry-Loop ab, wechsle zum nächsten Modell
        }

        // 429 Resource Exhausted - RETRY mit Backoff (beim GLEICHEN Modell bleiben!)
        if (statusCode === 429 || errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota')) {
          if (attempt < MAX_RETRIES) {
            const waitTime = BASE_WAIT_MS * attempt; // 5s, 10s, 15s, 20s, 25s
            console.log(`[Analyze] 429 Quota exhausted. Waiting ${waitTime/1000}s before retry...`);
            console.log(`[Analyze] STATUS: retrying - High-End Modell ausgelastet. Warte auf freien Slot (Versuch ${attempt}/${MAX_RETRIES})...`);

            await sleep(waitTime);
            continue; // Nächster Versuch mit gleichem Modell
          }
          // Nach 5 Versuchen: Wechsle zum nächsten Modell
          console.log(`[Analyze] 429 after ${MAX_RETRIES} attempts. Trying next Pro model...`);
          break;
        }

        // Andere Fehler - Retry versuchen
        if (attempt < MAX_RETRIES) {
          const waitTime = BASE_WAIT_MS * attempt;
          console.log(`[Analyze] Error ${statusCode}. Waiting ${waitTime/1000}s before retry...`);
          await sleep(waitTime);
          continue;
        }
      }
    }

    // Alle Pro-Modelle fehlgeschlagen
    console.error('[Analyze] All Pro models failed');
    return res.status(503).json({
      error: 'Alle High-End Modelle (2.5 Pro, 1.5 Pro) sind derzeit nicht verfügbar. Bitte später erneut versuchen.',
      status: 'all_models_failed',
      _meta: { models_tried: VERTEX_MODELS }
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
