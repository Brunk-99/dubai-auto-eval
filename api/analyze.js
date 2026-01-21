// Vercel Serverless Function: POST /api/analyze
// Synchroner Vertex AI Proxy (kein Job-Queue nötig bei Vercel)

import { GoogleAuth } from 'google-auth-library';

// Vertex AI Configuration
const VERTEX_PROJECT = process.env.VERTEX_PROJECT || 'dubai-car-check';
const VERTEX_LOCATION = process.env.VERTEX_LOCATION || 'us-central1';
// Gemini 3.0 Pro Preview als Primary, Gemini 2.5 Pro als stabiler Fallback
const VERTEX_MODEL_PRIMARY = 'gemini-3-pro-preview';
const VERTEX_MODEL_FALLBACK = 'gemini-2.5-pro';

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

// Vertex AI URL Generator - v1beta1 für neue Modelle (3.0/2.5)
const getVertexUrl = (model) =>
  `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1beta1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/${model}:generateContent`;

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

    // Google Auth mit Service Account Credentials aus Environment
    let auth;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      // Vercel: Credentials als JSON String in ENV
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
    } else {
      // Lokal: GOOGLE_APPLICATION_CREDENTIALS Datei
      auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
    }

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    // Request Body mit System Instruction
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
      console.log(`[Analyze] Trying model: ${model}`);

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
        console.log(`[Analyze] SUCCESS with model: ${model}`);

        // Robustes JSON-Parsing: Entferne eventuelle Einleitungstexte
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          let text = data.candidates[0].content.parts[0].text;
          // Versuche JSON zu extrahieren, falls Einleitungstext vorhanden
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              data.candidates[0].content.parts[0].text = JSON.stringify(parsed);
              console.log('[Analyze] JSON erfolgreich extrahiert und bereinigt');
            } catch (e) {
              console.log('[Analyze] JSON bereits valide oder Parsing nicht nötig');
            }
          }
        }

        return res.status(200).json(data);
      }

      // Error speichern und nächstes Modell versuchen
      lastError = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }));
      console.warn(`[Analyze] Model ${model} failed:`, lastError.error?.message || response.status);

      const errorMsg = lastError.error?.message || '';
      if (!errorMsg.includes('not found') && !errorMsg.includes('does not have access')) {
        break;
      }
    }

    // Alle Modelle fehlgeschlagen
    console.error('[Analyze] All models failed:', lastError);
    return res.status(500).json({
      error: lastError?.error?.message || 'Vertex AI error',
    });

  } catch (error) {
    console.error('[Analyze] Server error:', error.message);
    return res.status(500).json({
      error: 'Analyse fehlgeschlagen: ' + error.message,
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
  maxDuration: 60, // 60 Sekunden Timeout für AI-Analyse
};
