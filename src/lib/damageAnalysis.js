// AI Damage Analysis using Vertex AI (via Vercel Serverless Functions)
// Analyzes vehicle damage photos and returns structured assessment
// Supports both: Vercel (synchronous) and Local Dev Server (async job queue)
//
// ENHANCED: Now includes severity_breakdown with technical and economic severity scores
// - Technical severity: Based on safety-critical components, structural damage
// - Economic severity: Based on repair costs in Dubai (Sharjah parts, Al Quoz labor)
// See severityScoring.js for the deterministic scoring logic

import { enrichReportWithSeverityBreakdown } from './severityScoring.js';

// Configuration
// Backend URL - in production use relative path, in dev use same host as browser but port 3001
function getBackendUrl(path) {
  if (import.meta.env.PROD) {
    return path; // Relative URL in production (Vercel)
  }
  // In development: use same hostname as browser (wichtig für mobile Geräte im LAN)
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${host}:3001${path}`;
}

// Detect if running on Vercel (synchronous API) or local dev server (async job queue)
function isVercelEnvironment() {
  // In production (Vercel), we use synchronous API calls
  return import.meta.env.PROD;
}

// Polling configuration (only for local dev server with job queue)
const POLL_INTERVAL = 5000; // 5 Sekunden
const MAX_POLL_ATTEMPTS = 60; // Max 5 Minuten warten

// Damage analysis prompt (wird jetzt vom Server via System-Instruction gesetzt)
const ANALYSIS_PROMPT = `Analysiere die folgenden Bilder eines Fahrzeugs und erstelle eine detaillierte Schadensbewertung für den Dubai/VAE Markt.`;

/**
 * Converts base64 image data to Gemini format
 */
function prepareImageForGemini(imageData) {
  let base64Data = imageData;
  let mimeType = 'image/jpeg';

  if (imageData.startsWith('data:')) {
    const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      base64Data = matches[2];
    }
  }

  return {
    inlineData: {
      mimeType,
      data: base64Data,
    },
  };
}

/**
 * Optimizes image for API
 */
async function optimizeImageForAPI(imageData, maxWidth = 1024) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.width <= maxWidth) {
        resolve(imageData);
        return;
      }

      const canvas = document.createElement('canvas');
      const ratio = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * ratio;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const optimized = canvas.toDataURL('image/jpeg', 0.8);
      resolve(optimized);
    };
    img.onerror = () => resolve(imageData);
    img.src = imageData;
  });
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if backend server is available
 */
async function isBackendAvailable() {
  try {
    const healthUrl = getBackendUrl('/health');
    console.log('[AI] Checking backend at:', healthUrl);
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Request notification permission
 */
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('[Notification] Not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Show browser notification
 */
function showNotification(title, body, onClick) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    console.log('[Notification] Permission not granted');
    return null;
  }

  const notification = new Notification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'damage-analysis',
    requireInteraction: true,
  });

  if (onClick) {
    notification.onclick = () => {
      window.focus();
      onClick();
      notification.close();
    };
  }

  return notification;
}

/**
 * Call Vertex AI synchronously (for Vercel serverless functions)
 * Returns the result directly without job queue
 */
async function callVertexAISync(parts, onProgress) {
  const analyzeUrl = getBackendUrl('/api/analyze');
  console.log('[AI] Calling Vertex AI synchronously:', analyzeUrl);

  // Progress callback for "processing"
  if (onProgress) {
    onProgress({
      status: 'processing',
      attempt: 1,
      maxAttempts: 1,
      elapsedMs: 0,
    });
  }

  const startTime = Date.now();

  const response = await fetch(analyzeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
    }),
  });

  const duration = Date.now() - startTime;

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Backend error: ${response.status}`);
  }

  const data = await response.json();
  console.log('[AI] Sync response received in', duration, 'ms');

  // Progress callback for "completed"
  if (onProgress) {
    onProgress({
      status: 'completed',
      attempt: 1,
      maxAttempts: 1,
      elapsedMs: duration,
    });
  }

  // Extract text from Gemini response
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Keine Antwort von Vertex AI');
  }

  return {
    text,
    duration,
    jobId: 'sync-' + Date.now(),
  };
}

/**
 * Start async analysis job (for local dev server with job queue)
 */
async function startAnalysisJob(parts) {
  const analyzeUrl = getBackendUrl('/api/analyze');
  console.log('[AI] Starting async analysis job:', analyzeUrl);

  const response = await fetch(analyzeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Backend error: ${response.status}`);
  }

  const data = await response.json();
  console.log('[AI] Job created:', data.jobId);
  return data.jobId;
}

/**
 * Poll job status
 */
async function pollJobStatus(jobId) {
  const statusUrl = getBackendUrl(`/api/status/${jobId}`);

  const response = await fetch(statusUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Status error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Wait for job completion with polling
 * Stoppt sofort bei completed/failed und gibt das Ergebnis zurück
 */
async function waitForJobCompletion(jobId, onProgress) {
  let attempts = 0;
  let lastStatus = null;

  while (attempts < MAX_POLL_ATTEMPTS) {
    attempts++;

    try {
      const status = await pollJobStatus(jobId);
      lastStatus = status;
      console.log(`[AI] Poll #${attempts}: ${status.status}`);

      // Bei completed: SOFORT zurückgeben, kein weiteres Polling
      if (status.status === 'completed') {
        console.log('[AI] Job completed, stopping poll loop');
        // Letzter Progress-Callback mit completed-Status
        if (onProgress) {
          onProgress({
            status: 'completed',
            attempt: attempts,
            maxAttempts: MAX_POLL_ATTEMPTS,
            elapsedMs: status.duration || 0,
          });
        }
        return status;
      }

      // Bei failed: SOFORT Fehler werfen
      if (status.status === 'failed') {
        console.log('[AI] Job failed, stopping poll loop');
        throw new Error(status.error || 'Analyse fehlgeschlagen');
      }

      // Callback für Progress-Updates (nur bei pending/processing)
      if (onProgress) {
        onProgress({
          status: status.status,
          attempt: attempts,
          maxAttempts: MAX_POLL_ATTEMPTS,
          elapsedMs: Date.now() - status.createdAt,
        });
      }

      // Warte vor nächstem Poll
      await sleep(POLL_INTERVAL);
    } catch (pollError) {
      console.error('[AI] Poll error:', pollError.message);
      // Bei Netzwerkfehler: Weitermachen, aber loggen
      if (attempts >= MAX_POLL_ATTEMPTS) {
        throw pollError;
      }
      await sleep(POLL_INTERVAL);
    }
  }

  throw new Error('Analyse-Timeout: Maximale Wartezeit überschritten');
}

/**
 * Call Vertex AI via async job queue with polling (local dev server only)
 */
async function callVertexAIAsync(parts, onProgress) {
  // Starte Job
  const jobId = await startAnalysisJob(parts);

  // Warte auf Completion mit Polling
  const result = await waitForJobCompletion(jobId, onProgress);

  // Extrahiere Text aus Ergebnis
  const text = result.result?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Keine Antwort von Vertex AI');
  }

  return {
    text,
    duration: result.duration,
    jobId,
  };
}

/**
 * Call Vertex AI - automatically chooses sync (Vercel) or async (local dev) mode
 */
async function callVertexAI(parts, onProgress) {
  if (isVercelEnvironment()) {
    // Vercel: Synchronous API call (serverless function waits for completion)
    console.log('[AI] Using synchronous Vercel API');
    return await callVertexAISync(parts, onProgress);
  } else {
    // Local dev server: Async job queue with polling
    console.log('[AI] Using async job queue (local dev)');
    return await callVertexAIAsync(parts, onProgress);
  }
}

/**
 * Main API call function - calls Vertex AI via backend (auto-detects sync/async mode)
 */
async function callGeminiAPI(images, prompt, onProgress) {
  // Prepare content parts
  const parts = [{ text: prompt }];

  // Add images (limit to 10)
  const imagesToSend = images.slice(0, 10);
  for (const img of imagesToSend) {
    const optimized = await optimizeImageForAPI(img.data);
    parts.push(prepareImageForGemini(optimized));
  }

  console.log(`[AI] Preparing ${imagesToSend.length} images for analysis...`);

  // Check if backend is available
  const backendReady = await isBackendAvailable();
  if (!backendReady) {
    throw new Error('Backend-Server nicht erreichbar. Bitte später erneut versuchen.');
  }

  console.log('[AI] Starting analysis via backend...');
  return await callVertexAI(parts, onProgress);
}

/**
 * Parses JSON response from Gemini (Dubai/VAE Format)
 * Mit robusterem Parsing für verschiedene Antwortformate
 */
function parseGeminiResponse(responseText) {
  console.log('[Parse] Raw response length:', responseText?.length);

  if (!responseText || typeof responseText !== 'string') {
    console.error('[Parse] Invalid response:', responseText);
    throw new Error('Keine gültige Antwort erhalten');
  }

  let cleanedText = responseText.trim();

  // Remove markdown code blocks (mehrere Varianten)
  cleanedText = cleanedText.replace(/^```json\s*/gi, '');
  cleanedText = cleanedText.replace(/^```\s*/gi, '');
  cleanedText = cleanedText.replace(/\s*```\s*$/gi, '');
  // Auch mittendrin Code-Blocks entfernen
  cleanedText = cleanedText.replace(/```json/gi, '');
  cleanedText = cleanedText.replace(/```/g, '');

  // Entferne führende/trailing Whitespace und Newlines
  cleanedText = cleanedText.trim();

  // Extract JSON - finde die äußersten geschweiften Klammern
  const firstBrace = cleanedText.indexOf('{');
  const lastBrace = cleanedText.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    console.error('[Parse] No JSON braces found in response:', cleanedText.substring(0, 500));
    throw new Error('Kein JSON in der Antwort');
  }

  let jsonString = cleanedText.substring(firstBrace, lastBrace + 1);
  console.log('[Parse] Extracted JSON length:', jsonString.length);

  // Versuche JSON zu reparieren (häufige Probleme)
  // 1. Trailing commas entfernen
  jsonString = jsonString.replace(/,\s*}/g, '}');
  jsonString = jsonString.replace(/,\s*]/g, ']');

  // 2. Unescaped Newlines in Strings reparieren
  jsonString = jsonString.replace(/\n/g, '\\n');
  jsonString = jsonString.replace(/\r/g, '\\r');
  jsonString = jsonString.replace(/\t/g, '\\t');

  // 3. Erneut parsen - manchmal hilft doppeltes Encoding
  jsonString = jsonString.replace(/\\n/g, ' ');

  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (parseError) {
    console.error('[Parse] JSON parse error:', parseError.message);
    console.error('[Parse] JSON string preview:', jsonString.substring(0, 500));

    // Zweiter Versuch: Versuche mit relaxtem Parser
    try {
      // Entferne alle Steuerzeichen außer erlaubten
      const sanitized = jsonString.replace(/[\x00-\x1F\x7F]/g, ' ');
      parsed = JSON.parse(sanitized);
      console.log('[Parse] Second attempt succeeded with sanitized string');
    } catch (secondError) {
      console.error('[Parse] Second parse attempt also failed:', secondError.message);
      throw new Error('Ungültiges JSON in der Antwort');
    }
  }

  // Dubai/VAE Format V2 mit Teileliste und Kostenranges
  const kostenAed = parsed.kosten_schaetzung_aed || {};
  const kostenEur = parsed.kosten_schaetzung_eur || {};

  // Unterstütze sowohl altes Format (einzelne Zahlen) als auch neues Format (Ranges)
  const getKostenValue = (rangeOrValue, field = 'mid') => {
    if (typeof rangeOrValue === 'number') return rangeOrValue;
    if (rangeOrValue && typeof rangeOrValue === 'object') {
      return rangeOrValue[field] || rangeOrValue.mid || 0;
    }
    return 0;
  };

  // Fahrbereit kann jetzt "YES", "NO", "UNKNOWN" oder boolean sein
  const parseFahrbereit = (value) => {
    if (typeof value === 'boolean') return value ? 'YES' : 'NO';
    if (typeof value === 'string') return value.toUpperCase();
    return 'UNKNOWN';
  };

  return {
    bauteil: parsed.bauteil || 'Unbekannt',
    schadenAnalyse: parsed.schaden_analyse || parsed.schadenAnalyse || '',
    schweregrad: Math.min(10, Math.max(1, parsed.schweregrad || 5)),
    reparaturWeg: parsed.reparatur_weg || parsed.reparaturWeg || 'Nicht bestimmt',

    // Neue Teileliste
    teileliste: {
      mussErsetztWerden: (parsed.teileliste?.muss_ersetzt_werden || []).map(t => ({
        teilBezeichnung: t.teil_bezeichnung || t.teilBezeichnung || '',
        grund: t.grund || '',
        evidence: t.evidence || '',
        confidence: t.confidence || 0.5,
      })),
      vermutlichDefektPruefen: (parsed.teileliste?.vermutlich_defekt_pruefen || []).map(t => ({
        teilBezeichnung: t.teil_bezeichnung || t.teilBezeichnung || '',
        verdacht: t.verdacht || '',
        pruefung: t.pruefung || '',
        confidence: t.confidence || 0.5,
      })),
    },

    // Kosten mit Ranges (V2) und Fallback für altes Format
    kostenAed: {
      teileRange: kostenAed.teile_range || { low: kostenAed.teile || 0, mid: kostenAed.teile || 0, high: kostenAed.teile || 0 },
      arbeitRange: kostenAed.arbeit_range || { low: kostenAed.arbeit || 0, mid: kostenAed.arbeit || 0, high: kostenAed.arbeit || 0 },
      gesamtRange: kostenAed.gesamt_range || { low: kostenAed.gesamt || 0, mid: kostenAed.gesamt || 0, high: kostenAed.gesamt || 0 },
      annahmen: kostenAed.annahmen || [],
      // Legacy single values (mid-point für Kompatibilität)
      teile: getKostenValue(kostenAed.teile_range || kostenAed.teile),
      arbeit: getKostenValue(kostenAed.arbeit_range || kostenAed.arbeit),
      gesamt: getKostenValue(kostenAed.gesamt_range || kostenAed.gesamt),
    },
    kostenEur: {
      gesamtRange: kostenEur.gesamt_range_eur || {
        low: kostenEur.gesamt_euro || 0,
        mid: kostenEur.gesamt_euro || 0,
        high: kostenEur.gesamt_euro || 0
      },
      kurs: kostenEur.umrechnungskurs || 4.29,
      // Legacy single value
      gesamt: getKostenValue(kostenEur.gesamt_range_eur || kostenEur.gesamt_euro),
    },

    // Arbeitszeitschätzung (neu)
    arbeitszeitSchaetzung: parsed.arbeitszeit_schaetzung ? {
      stundenRange: parsed.arbeitszeit_schaetzung.stunden_range || { low: 0, mid: 0, high: 0 },
      posten: (parsed.arbeitszeit_schaetzung.posten || []).map(p => ({
        name: p.name || '',
        stunden: p.stunden || 0,
      })),
    } : null,

    locationTipp: parsed.location_tipp || parsed.locationTipp || 'Sharjah Industrial Area',
    fahrbereit: parseFahrbereit(parsed.fahrbereit),
    riskFlags: parsed.risk_flags || [],
    affectedParts: parsed.affected_parts || [],

    // Legacy fields for compatibility
    severity: parsed.schweregrad <= 3 ? 'low' : parsed.schweregrad <= 6 ? 'medium' : 'high',
    severityScore: parsed.schweregrad * 10,
    confidence: 85,
  };
}

/**
 * Map severity to internal format
 */
function mapSeverityToInternal(schweregrad) {
  if (schweregrad <= 3) return 'low';
  if (schweregrad <= 6) return 'medium';
  return 'high';
}

/**
 * Main analysis function with async job queue and notifications
 */
export async function analyzeVehicleDamage(photos, vehicleInfo = {}, options = {}) {
  const { onProgress, enableNotifications = true } = options;
  const photoCount = photos?.length || 0;

  if (photoCount === 0) {
    return {
      success: false,
      error: 'Keine Fotos für die Analyse vorhanden',
    };
  }

  try {
    console.log(`[AI] Starting analysis with ${photoCount} photos...`);

    // Request notification permission early
    if (enableNotifications) {
      await requestNotificationPermission();
    }

    const result = await callGeminiAPI(photos, ANALYSIS_PROMPT, onProgress);
    console.log(`[AI] Response received (${result.duration}ms)`);

    const analysis = parseGeminiResponse(result.text);
    console.log('[AI] Parsed:', analysis);

    // Build base report - V2 with parts list and cost ranges
    const baseReport = {
      createdAt: new Date().toISOString(),
      // Dubai/VAE specific
      bauteil: analysis.bauteil,
      schadenAnalyse: analysis.schadenAnalyse,
      schweregrad: analysis.schweregrad,
      reparaturWeg: analysis.reparaturWeg,
      kostenAed: analysis.kostenAed,
      kostenEur: analysis.kostenEur,
      locationTipp: analysis.locationTipp,
      fahrbereit: analysis.fahrbereit,

      // V2: Detaillierte Teileliste
      teileliste: analysis.teileliste,

      // V2: Arbeitszeitschätzung
      arbeitszeitSchaetzung: analysis.arbeitszeitSchaetzung,

      // V2: Risk Flags und Affected Parts
      riskFlags: analysis.riskFlags || [],
      affectedParts: analysis.affectedParts || [],

      // Legacy compatibility (kept for backward compatibility)
      severity: analysis.severity,
      severityScore: analysis.severityScore,
      summary: analysis.schadenAnalyse,
      affectedAreas: [analysis.bauteil, ...(analysis.affectedParts || [])],
      damageDetails: [{
        area: analysis.bauteil,
        type: Array.isArray(analysis.reparaturWeg) ? analysis.reparaturWeg.join(', ') : analysis.reparaturWeg,
        repairHours: Math.ceil(analysis.kostenAed.arbeit / 150), // ~150 AED/Stunde
        confidence: analysis.confidence,
      }],
      frameRisk: analysis.schweregrad >= 8 ? 'hoch' : analysis.schweregrad >= 5 ? 'mittel' : 'niedrig',
      totalRepairHours: Math.ceil(analysis.kostenAed.arbeit / 150),
      estimatedRepairCost: analysis.kostenEur.gesamt,
      estimatedRepairCostAed: analysis.kostenAed.gesamt,
      warnings: analysis.fahrbereit === 'NO' ? ['Fahrzeug nicht fahrbereit'] :
                analysis.fahrbereit === 'UNKNOWN' ? ['Fahrbereitschaft unklar - prüfen'] : [],
      recommendations: [`Reparatur in ${analysis.locationTipp} empfohlen`],
      photosAnalyzed: photoCount,
      vehicleInfo: {
        title: vehicleInfo.title || 'Unbekannt',
        mileage: vehicleInfo.mileage || null,
      },
      rawJson: {
        model: 'gpt-4.1 (OpenAI)',
        timestamp: Date.now(),
        confidence: analysis.confidence,
        duration: result.duration,
        jobId: result.jobId,
        rawAnalysis: analysis,
      },
    };

    // ENHANCED: Add severity breakdown (technical vs economic)
    // This calculates technical and economic severity scores deterministically
    // from the AI findings, NOT hallucinated by the AI itself
    const report = enrichReportWithSeverityBreakdown(baseReport);
    console.log('[AI] Severity breakdown:', report.severityBreakdown);

    // Show browser notification
    if (enableNotifications) {
      showNotification(
        'Analyse fertig!',
        `Schaden am ${analysis.bauteil}: ${analysis.kostenAed.gesamt} AED (${analysis.kostenEur.gesamt} EUR)`,
        () => {
          // Optional: Scroll to results or trigger callback
          console.log('[Notification] Clicked');
        }
      );
    }

    return { success: true, report };
  } catch (error) {
    console.error('[AI] Analysis failed:', error);

    // Show error notification
    if (enableNotifications) {
      showNotification(
        'Analyse fehlgeschlagen',
        error.message,
        null
      );
    }

    return {
      success: false,
      error: `KI-Analyse fehlgeschlagen: ${error.message}`,
      fallbackAvailable: true,
    };
  }
}

/**
 * Fallback analysis
 */
export async function analyzeVehicleDamageFallback(photos, vehicleInfo = {}) {
  await sleep(1000);

  const photoCount = photos?.length || 0;
  const severityRand = Math.random();
  const severity = severityRand < 0.3 ? 'low' : severityRand < 0.7 ? 'medium' : 'high';
  const costsAed = { low: 800, medium: 2000, high: 5000 };

  return {
    success: true,
    report: {
      createdAt: new Date().toISOString(),
      bauteil: 'Nicht bestimmt',
      schadenAnalyse: 'Fallback-Analyse: Manuelle Überprüfung empfohlen.',
      schweregrad: severity === 'low' ? 2 : severity === 'medium' ? 5 : 8,
      reparaturWeg: 'Manuelle Bewertung erforderlich',
      kostenAed: { teile: 0, arbeit: 0, gesamt: costsAed[severity] },
      kostenEur: { gesamt: Math.round(costsAed[severity] / 4), kurs: 4.0 },
      locationTipp: 'Sharjah Industrial Area',
      fahrbereit: true,
      severity,
      severityScore: severity === 'low' ? 25 : severity === 'medium' ? 50 : 80,
      summary: 'Fallback-Analyse: Manuelle Überprüfung empfohlen.',
      affectedAreas: ['Nicht bestimmt'],
      damageDetails: [],
      frameRisk: 'mittel',
      totalRepairHours: 0,
      estimatedRepairCost: Math.round(costsAed[severity] / 4),
      estimatedRepairCostAed: costsAed[severity],
      warnings: ['Fallback-Analyse - KI war nicht verfügbar'],
      recommendations: ['Manuelle Begutachtung empfohlen'],
      photosAnalyzed: photoCount,
      vehicleInfo: {
        title: vehicleInfo.title || 'Unbekannt',
        mileage: vehicleInfo.mileage || null,
      },
      rawJson: { model: 'fallback-v1', timestamp: Date.now() },
    },
  };
}

// Export config and utilities
export const ANALYSIS_CONFIG = {
  getBackendUrl,
  maxImages: 10,
  maxImageWidth: 1024,
  pollInterval: POLL_INTERVAL,
  maxPollAttempts: MAX_POLL_ATTEMPTS,
};

export { requestNotificationPermission, showNotification };
