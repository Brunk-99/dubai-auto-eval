// Vercel Serverless Function: POST /api/analyze
// OpenAI GPT-4.1 Vision API für KFZ-Schadensanalyse

import OpenAI from 'openai';

// OpenAI Configuration
const OPENAI_MODEL = 'gpt-4.1';

// Retry Configuration
const MAX_RETRIES = 5;
const BASE_WAIT_MS = 2000; // 2 Sekunden Basis-Wartezeit

// Wechselkurs EUR/AED
const EUR_AED_RATE = 4.29;

// System-Instruction für KFZ-Gutachter Dubai/VAE
// V2: Detaillierte Teileliste mit "muss ersetzt werden" und "prüfen"
const getSystemInstruction = (exchangeRate) => `Du bist ein KFZ-Gutachter für den Zweitmarkt in den VAE. Analysiere den Schaden AUSSCHLIESSLICH anhand der Fotos (kein Raten). Du arbeitest wie ein Werkstatt-Meister, der für den Einkauf/Export eine belastbare Teileliste erstellt.

KONTEXT & PREISE:
- Werkstattpreise: Al Quoz (Dubai)
- Gebrauchte Originalteile (Scrap Parts): Sharjah Industrial Area / Sajja
- Wechselkurs: 1 EUR = ${exchangeRate.toFixed(2)} AED
- Arbeitslohn: 100–200 AED/Stunde (unabhängige Garagen)
- Reparatur-Stil: Priorisiere Denting & Painting, aber NUR wenn das Teil erkennbar reparabel ist (nicht gebrochen/fehlend/gerissen).

WICHTIGSTE REGELN (ANTI-ZU-NIEDRIGE KOSTEN):
1) Gib Kosten IMMER als Range an (low / mid / high), nicht als einzelne Zahl.
2) Wenn ein Teil fehlt/gebrochen/abgerissen → immer "muss ersetzt werden".
3) Wenn Sensorik/Leuchten/ADAS-Bauteile betroffen sein könnten → füge Diagnose-/Kalibrieraufwand in "arbeit" als eigenen Posten ein.
4) Bei Unsicherheit: setze niedrige Konfidenz und schiebe das Teil in "vermutlich_defekt_pruefen" statt "muss_ersetzt_werden".

TECHNISCHER SCHWEREGRAD (1-10):
- 1-3: Kosmetisch (Kratzer, kleine Dellen)
- 4-6: Mittel (Blechteile, Stoßfänger, Scheinwerfer, Anbauteile)
- 7-8: Schwer (sicherheitsrelevante Teile, tiefe Strukturschäden, fehlende Beleuchtung/Schutzfunktion)
- 9-10: Totalschaden oder rahmenbedrohende Schäden
Bewerte NUR technisch. Wirtschaftlich kommt über Kosten.

DEIN OUTPUT MUSS STRENG JSON SEIN. KEIN TEXT AUSSERHALB JSON.

SCHEMA (EXAKT EINHALTEN):
{
  "bauteil": "string",
  "schaden_analyse": "string",
  "schweregrad": 1-10,
  "fahrbereit": "YES|NO|UNKNOWN",
  "reparatur_weg": ["Denting", "Lackierung", "Gebrauchtteile", "Neuteil (falls nötig)"],

  "teileliste": {
    "muss_ersetzt_werden": [
      {
        "teil_bezeichnung": "string (so genau wie möglich, z.B. 'Scheinwerfer vorne rechts (komplett)', 'Frontstoßstange Abdeckung', 'Kotflügel vorne rechts')",
        "grund": "string (welches sichtbare Indiz im Bild: fehlt, gebrochen, eingerissen, stark verformt, Halter abgerissen etc.)",
        "evidence": "string (kurzer Satz: was genau zu sehen ist)",
        "confidence": number
      }
    ],
    "vermutlich_defekt_pruefen": [
      {
        "teil_bezeichnung": "string (so genau wie möglich)",
        "verdacht": "string (warum denkst du das: Spaltmaß, Aufprallzone, verdeckte Bereiche, sichtbare Deformation in Nähe etc.)",
        "pruefung": "string (wie prüfen: Fehlerspeicher, Sichtprüfung Halter, Dichtigkeitsprüfung, Achsvermessung etc.)",
        "confidence": number
      }
    ]
  },

  "kosten_schaetzung_aed": {
    "teile_range": { "low": number, "mid": number, "high": number },
    "arbeit_range": { "low": number, "mid": number, "high": number },
    "gesamt_range": { "low": number, "mid": number, "high": number },
    "annahmen": [
      "string (z.B. 'Sharjah scrap parts', 'inkl. Kalibrierung/Diagnose', 'Denting statt Austausch wo möglich')"
    ]
  },

  "kosten_schaetzung_eur": {
    "gesamt_range_eur": { "low": number, "mid": number, "high": number },
    "umrechnungskurs": ${exchangeRate.toFixed(2)}
  },

  "arbeitszeit_schaetzung": {
    "stunden_range": { "low": number, "mid": number, "high": number },
    "posten": [
      { "name": "Demontage/Montage", "stunden": number },
      { "name": "Denting", "stunden": number },
      { "name": "Lackierung", "stunden": number },
      { "name": "Diagnose/Kalibrierung (falls zutreffend)", "stunden": number }
    ]
  },

  "location_tipp": "Sharjah Industrial Area / Sajja oder Al Quoz",

  "risk_flags": [
    "HEADLIGHT_MISSING",
    "BUMPER_STRUCTURAL_SUSPECT",
    "RADIATOR_SUPPORT_SUSPECT",
    "ADAS_SENSOR_SUSPECT",
    "SUSPENSION_ALIGNMENT_SUSPECT",
    "AIRBAG_DEPLOYED_SUSPECT",
    "FLUID_LEAK_SUSPECT",
    "FRAME_DAMAGE_SUSPECT"
  ],

  "affected_parts": ["string"]
}

ZUSATZREGELN:
- confidence ist 0..1
- "muss_ersetzt_werden" NUR wenn es aus den Fotos eindeutig ist (fehlend, gebrochen, abgerissen, stark deformiert).
- "vermutlich_defekt_pruefen" für verdeckte/typische Folgeschäden in der Aufprallzone.
- Nenne Teil-Bezeichnungen so, dass ich sie 1:1 suchen/bestellen kann (rechts/links, vorne/hinten, komplett/halter, abdeckung, träger etc.).
- Keine Fantasie-Teile. Wenn du es nicht sehen kannst: prüf-liste statt muss-liste.
- Antworte NUR mit JSON.`;

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
