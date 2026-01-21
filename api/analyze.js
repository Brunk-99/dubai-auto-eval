// Vercel Serverless Function: POST /api/analyze
// OpenAI GPT-4.1 Vision API für KFZ-Schadensanalyse

import OpenAI from 'openai';

// OpenAI Configuration
const OPENAI_MODEL = 'gpt-4.1';

// Retry Configuration
const MAX_RETRIES = 5;
const BASE_WAIT_MS = 2000; // 2 Sekunden Basis-Wartezeit

// Wechselkurs EUR/AED
const EUR_AED_RATE = 4.00;

// System-Instruction für KFZ-Gutachter Dubai/VAE
// ENHANCED: Zusätzliche Felder für technisches vs. wirtschaftliches Severity-Scoring
const getSystemInstruction = (exchangeRate) => `Du bist ein KFZ-Gutachter für den Zweitmarkt in den VAE. Analysiere den Schaden basierend auf Werkstattpreisen in Al Quoz (Dubai) und Sharjah Industrial Area.

Nutze für Ersatzteile Preise für gebrauchte Originalteile (Scrap Parts) von Anbietern aus Sharjah (Sajja).

Der aktuelle Wechselkurs ist 1 EUR = ${exchangeRate.toFixed(2)} AED.

Berechne die Kosten in AED und rechne sie zusätzlich in EUR um.

Arbeitskosten: Nutze Stundensätze kleinerer, unabhängiger Garagen (ca. 100-200 AED pro Stunde).

Reparatur-Stil: Priorisiere 'Denting & Painting' (Ausbeulen und Lackieren) gegenüber Neukauf von Blechteilen.

WICHTIG: Bei der Schweregrad-Bewertung (1-10) fokussiere dich NUR auf den TECHNISCHEN Schweregrad:
- 1-3: Kosmetische Schäden (Kratzer, kleine Dellen)
- 4-6: Mittlere Schäden (Blechteile, Stoßstangen, Scheinwerfer)
- 7-8: Schwere Schäden (Sicherheitsrelevante Teile, tiefe Strukturschäden)
- 9-10: Totalschaden oder rahmenbedrohende Schäden

Die wirtschaftliche Bewertung erfolgt separat über die Kostenangaben.

Gib die Antwort STRENG als JSON aus mit folgendem Schema:
{
  "bauteil": "string (Hauptbauteil das beschädigt ist)",
  "schaden_analyse": "string (Detaillierte Beschreibung)",
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
  "fahrbereit": boolean,
  "affected_parts": ["string (Liste aller beschädigten Teile)"],
  "risk_flags": ["string (z.B. HEADLIGHT_MISSING, STRUCTURAL_SUSPECT, AIRBAG_RISK, FLUID_LEAK)"]
}

Wichtig: Antworte NUR im JSON-Format ohne zusätzlichen Text.`;

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// JSON Repair Helper - extrahiert JSON aus Text mit möglichen Markdown-Blöcken
function extractAndRepairJSON(text) {
  if (!text) return null;

  let jsonString = text.trim();

  // Entferne Markdown Code-Blöcke
  if (jsonString.startsWith('```json')) {
    jsonString = jsonString.slice(7);
  } else if (jsonString.startsWith('```')) {
    jsonString = jsonString.slice(3);
  }
  if (jsonString.endsWith('```')) {
    jsonString = jsonString.slice(0, -3);
  }
  jsonString = jsonString.trim();

  // Finde JSON-Objekt
  const startBracket = jsonString.indexOf('{');
  const endBracket = jsonString.lastIndexOf('}');

  if (startBracket !== -1 && endBracket !== -1 && endBracket > startBracket) {
    jsonString = jsonString.substring(startBracket, endBracket + 1);
  }

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.warn('[Analyze] JSON-Parsing fehlgeschlagen:', e.message);
    return null;
  }
}

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
    const { contents } = req.body;

    if (!contents) {
      return res.status(400).json({ error: 'Missing contents' });
    }

    // Extrahiere Bilder und Text aus Gemini-Format (Kompatibilität)
    const parts = contents[0]?.parts || [];
    const partCount = parts.length;
    console.log(`[Analyze] Processing request with ${partCount} parts...`);
    console.log(`[Analyze] Using OpenAI Model: ${OPENAI_MODEL}`);

    // Konvertiere Gemini-Format zu OpenAI-Format
    const openaiContent = [];

    for (const part of parts) {
      if (part.text) {
        openaiContent.push({
          type: 'text',
          text: part.text
        });
      } else if (part.inline_data || part.inlineData) {
        const inlineData = part.inline_data || part.inlineData;
        const mimeType = inlineData.mime_type || inlineData.mimeType || 'image/jpeg';
        const base64Data = inlineData.data;

        openaiContent.push({
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${base64Data}`,
            detail: 'high' // Beste Bildqualität für Schadensanalyse
          }
        });
      }
    }

    if (openaiContent.length === 0) {
      return res.status(400).json({ error: 'No valid content found' });
    }

    // OpenAI Client initialisieren
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // AGGRESSIVE RETRY LOOP
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`[Analyze] Attempt ${attempt}/${MAX_RETRIES} with model: ${OPENAI_MODEL}`);

      try {
        const response = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            {
              role: 'system',
              content: getSystemInstruction(EUR_AED_RATE)
            },
            {
              role: 'user',
              content: openaiContent
            }
          ],
          max_tokens: 4096,
          temperature: 0.2,
          response_format: { type: 'json_object' }
        });

        // Erfolgreiche Antwort
        const rawText = response.choices[0]?.message?.content || '';
        console.log('[Analyze] RAW KI ANSWER:', rawText.substring(0, 500) + (rawText.length > 500 ? '...' : ''));

        // JSON extrahieren und validieren
        const parsed = extractAndRepairJSON(rawText);

        if (parsed) {
          console.log(`[Analyze] SUCCESS with model: ${OPENAI_MODEL} on attempt ${attempt}`);

          // Antwort im Gemini-kompatiblen Format zurückgeben
          return res.status(200).json({
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify(parsed)
                }]
              }
            }],
            _meta: {
              model: OPENAI_MODEL,
              attempt: attempt,
              status: 'success',
              provider: 'openai'
            }
          });
        } else {
          console.warn('[Analyze] JSON extraction failed, raw response saved');
          // Auch bei fehlerhaftem JSON zurückgeben
          return res.status(200).json({
            candidates: [{
              content: {
                parts: [{
                  text: rawText
                }]
              }
            }],
            _meta: {
              model: OPENAI_MODEL,
              attempt: attempt,
              status: 'success_raw',
              provider: 'openai'
            }
          });
        }

      } catch (error) {
        lastError = error;
        const statusCode = error.status || error.statusCode || 500;
        const errorMsg = error.message || '';

        console.warn(`[Analyze] Attempt ${attempt} failed:`, statusCode, errorMsg);

        // Rate Limit (429) - Retry mit Backoff
        if (statusCode === 429 || errorMsg.includes('rate_limit')) {
          if (attempt < MAX_RETRIES) {
            const waitTime = BASE_WAIT_MS * Math.pow(2, attempt - 1); // Exponential backoff
            console.log(`[Analyze] Rate limit hit. Waiting ${waitTime/1000}s before retry...`);
            await sleep(waitTime);
            continue;
          }
        }

        // Server Error (5xx) - Retry
        if (statusCode >= 500 && statusCode < 600) {
          if (attempt < MAX_RETRIES) {
            const waitTime = BASE_WAIT_MS * attempt;
            console.log(`[Analyze] Server error ${statusCode}. Waiting ${waitTime/1000}s before retry...`);
            await sleep(waitTime);
            continue;
          }
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

    // Alle Versuche fehlgeschlagen
    console.error('[Analyze] All attempts failed');
    return res.status(503).json({
      error: `OpenAI API nicht erreichbar nach ${MAX_RETRIES} Versuchen. Bitte später erneut versuchen.`,
      details: lastError?.message || 'Unknown error',
      status: 'all_attempts_failed',
      _meta: { model: OPENAI_MODEL, attempts: MAX_RETRIES }
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
