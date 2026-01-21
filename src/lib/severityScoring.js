// ============================================================================
// SEVERITY SCORING MODULE
// ============================================================================
// Implements technical and economic severity scoring for Dubai Auto Eval
//
// This module provides deterministic scoring functions that separate:
// - TECHNICAL severity: Based on safety-critical components, structural damage
// - ECONOMIC severity: Based on repair costs in Dubai (Sharjah parts, Al Quoz labor)
//
// The scores are computed from AI analysis findings, NOT hallucinated by the AI.
// ============================================================================

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

// Technical severity weight factors for different damage types
const TECHNICAL_WEIGHTS = {
  // Safety-critical components (highest weight)
  SAFETY_CRITICAL: {
    weight: 1.0,
    keywords: [
      'airbag', 'luftsack', 'scheinwerfer', 'headlight', 'beleuchtung',
      'bremse', 'brake', 'lenkung', 'steering', 'fahrwerk', 'suspension',
      'gurt', 'seatbelt', 'sensor', 'radar', 'kamera', 'camera'
    ]
  },
  // Structural components (high weight)
  STRUCTURAL: {
    weight: 0.85,
    keywords: [
      'rahmen', 'frame', 'träger', 'beam', 'schweller', 'sill',
      'a-säule', 'b-säule', 'c-säule', 'pillar', 'crashbar',
      'längsträger', 'querträger', 'bodenblech', 'floor', 'roof'
    ]
  },
  // Drivetrain components (medium-high weight)
  DRIVETRAIN: {
    weight: 0.7,
    keywords: [
      'motor', 'engine', 'getriebe', 'transmission', 'antrieb', 'drivetrain',
      'kühler', 'radiator', 'auspuff', 'exhaust', 'öl', 'oil'
    ]
  },
  // Body panels (medium weight)
  BODY_PANELS: {
    weight: 0.5,
    keywords: [
      'stoßstange', 'bumper', 'kotflügel', 'fender', 'motorhaube', 'hood',
      'tür', 'door', 'kofferraum', 'trunk', 'heckklappe', 'tailgate',
      'seitenteil', 'quarter panel'
    ]
  },
  // Cosmetic/minor (low weight)
  COSMETIC: {
    weight: 0.25,
    keywords: [
      'lack', 'paint', 'kratzer', 'scratch', 'delle', 'dent',
      'spiegel', 'mirror', 'zierleiste', 'trim', 'emblem', 'logo'
    ]
  }
};

// Economic severity thresholds (Dubai market)
// These are absolute values, not relative to vehicle price
const ECONOMIC_THRESHOLDS = {
  // Repair cost in EUR
  REPAIR_COST: {
    low: 1500,      // 0-1500 EUR = low severity
    medium: 5000,   // 1500-5000 EUR = medium severity
    // > 5000 EUR = high severity
  },
  // Labor hours
  LABOR_HOURS: {
    low: 10,        // 0-10 hours = low severity
    medium: 25,     // 10-25 hours = medium severity
    // > 25 hours = high severity
  },
  // Parts count (number of affected areas)
  PARTS_COUNT: {
    low: 2,
    medium: 5,
  }
};

// Label mapping based on percentage
const SEVERITY_LABELS_MAP = {
  low: 'LEICHT',
  medium: 'MITTEL',
  high: 'SCHWER'
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clamp a value between min and max
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Convert percentage (0-100) to severity label
 */
function percentToLabel(percent) {
  if (percent < 30) return 'LEICHT';
  if (percent < 60) return 'MITTEL';
  return 'SCHWER';
}

/**
 * Convert schweregrad (1-10) to percentage (0-100)
 */
function schweregradToPercent(schweregrad) {
  return Math.round(schweregrad * 10);
}

/**
 * Check if text contains any keyword from list (case-insensitive)
 */
function containsKeyword(text, keywords) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return keywords.some(kw => lowerText.includes(kw.toLowerCase()));
}

/**
 * Detect damage category from text description
 */
function detectDamageCategory(text) {
  if (!text) return 'COSMETIC';

  for (const [category, config] of Object.entries(TECHNICAL_WEIGHTS)) {
    if (containsKeyword(text, config.keywords)) {
      return category;
    }
  }
  return 'COSMETIC';
}

// ============================================================================
// TECHNICAL SEVERITY SCORING
// ============================================================================

/**
 * Calculate technical severity score based on damage findings
 *
 * @param {Object} analysisData - The parsed AI analysis data
 * @param {number} analysisData.schweregrad - AI severity score (1-10)
 * @param {string} analysisData.bauteil - Main affected part
 * @param {string} analysisData.schadenAnalyse - Damage description
 * @param {string} analysisData.reparaturWeg - Repair method
 * @param {boolean} analysisData.fahrbereit - Is vehicle driveable
 * @param {Array} [analysisData.damageDetails] - Array of damage details
 * @param {Array} [analysisData.affectedAreas] - Array of affected areas
 * @param {string} [analysisData.frameRisk] - Frame risk level
 *
 * @returns {Object} Technical severity breakdown
 */
function calculateTechnicalSeverity(analysisData) {
  const reasons = [];
  let baseScore = 0;
  let modifiers = 0;

  // 1. Base score from AI schweregrad (contributes 50% of technical score)
  const schweregrad = analysisData.schweregrad || 5;
  baseScore = (schweregrad / 10) * 0.5;

  // 2. Detect damage category from main part
  const mainPart = analysisData.bauteil || '';
  const description = analysisData.schadenAnalyse || '';
  const combinedText = `${mainPart} ${description}`.toLowerCase();

  // Check for safety-critical damage
  if (containsKeyword(combinedText, TECHNICAL_WEIGHTS.SAFETY_CRITICAL.keywords)) {
    modifiers += 0.25;

    // Specific reasons
    if (combinedText.includes('scheinwerfer') || combinedText.includes('headlight') || combinedText.includes('beleuchtung')) {
      reasons.push('Beleuchtung betroffen - Sicherheitsfunktion eingeschränkt');
    }
    if (combinedText.includes('airbag') || combinedText.includes('luftsack')) {
      reasons.push('Airbag-System möglicherweise betroffen');
    }
    if (combinedText.includes('bremse') || combinedText.includes('brake')) {
      reasons.push('Bremssystem betroffen');
    }
    if (combinedText.includes('sensor') || combinedText.includes('radar') || combinedText.includes('kamera')) {
      reasons.push('Fahrassistenzsysteme betroffen');
    }
  }

  // Check for structural damage
  if (containsKeyword(combinedText, TECHNICAL_WEIGHTS.STRUCTURAL.keywords)) {
    modifiers += 0.2;
    reasons.push('Strukturelle Komponenten betroffen');
  }

  // Check frame risk
  const frameRisk = analysisData.frameRisk || 'niedrig';
  if (frameRisk === 'hoch') {
    modifiers += 0.15;
    reasons.push('Hohes Rahmenrisiko erkannt');
  } else if (frameRisk === 'mittel') {
    modifiers += 0.08;
    reasons.push('Mittleres Rahmenrisiko');
  }

  // Check if vehicle is not driveable
  if (analysisData.fahrbereit === false) {
    modifiers += 0.1;
    reasons.push('Fahrzeug nicht fahrbereit');
  }

  // Count affected areas for additional scoring
  const affectedCount = analysisData.affectedAreas?.length || 1;
  if (affectedCount >= 3) {
    modifiers += 0.05;
    reasons.push(`Mehrere Bereiche betroffen (${affectedCount})`);
  }

  // Check damage details for additional safety concerns
  const damageDetails = analysisData.damageDetails || [];
  for (const detail of damageDetails) {
    const detailText = `${detail.area || ''} ${detail.type || ''}`.toLowerCase();
    if (containsKeyword(detailText, TECHNICAL_WEIGHTS.SAFETY_CRITICAL.keywords)) {
      if (!reasons.some(r => r.includes('Sicherheit'))) {
        modifiers += 0.05;
      }
    }
  }

  // Calculate final score
  const score = clamp(baseScore + modifiers, 0, 1);
  const percent = Math.round(score * 100);
  const label = percentToLabel(percent);

  // Ensure we have at least one reason
  if (reasons.length === 0) {
    if (schweregrad <= 3) {
      reasons.push('Leichte Beschädigungen erkannt');
    } else if (schweregrad <= 6) {
      reasons.push('Mittlere Beschädigungen an Karosserieteilen');
    } else {
      reasons.push('Umfangreiche Beschädigungen erkannt');
    }
  }

  return {
    score: Math.round(score * 100) / 100,
    percent,
    label,
    reasons: reasons.slice(0, 6) // Max 6 reasons
  };
}

// ============================================================================
// ECONOMIC SEVERITY SCORING
// ============================================================================

/**
 * Calculate economic severity score based on repair costs (Dubai market)
 *
 * @param {Object} analysisData - The parsed AI analysis data
 * @param {Object} analysisData.kostenEur - Cost in EUR
 * @param {Object} analysisData.kostenAed - Cost in AED
 * @param {number} analysisData.totalRepairHours - Estimated repair hours
 * @param {Array} [analysisData.damageDetails] - Array of damage details
 *
 * @returns {Object} Economic severity breakdown
 */
function calculateEconomicSeverity(analysisData) {
  const reasons = [];

  // 1. Get repair cost (in EUR)
  const repairCostEur = analysisData.estimatedRepairCost ||
                        analysisData.kostenEur?.gesamt || 0;

  // 2. Get labor hours
  const laborHours = analysisData.totalRepairHours || 0;

  // 3. Get parts count
  const partsCount = analysisData.affectedAreas?.length ||
                     analysisData.damageDetails?.length || 1;

  // Calculate cost score (0-1)
  let costScore = 0;
  if (repairCostEur <= ECONOMIC_THRESHOLDS.REPAIR_COST.low) {
    costScore = repairCostEur / ECONOMIC_THRESHOLDS.REPAIR_COST.low * 0.3;
    reasons.push(`Reparaturkosten günstig (${repairCostEur}€)`);
  } else if (repairCostEur <= ECONOMIC_THRESHOLDS.REPAIR_COST.medium) {
    costScore = 0.3 + ((repairCostEur - ECONOMIC_THRESHOLDS.REPAIR_COST.low) /
                (ECONOMIC_THRESHOLDS.REPAIR_COST.medium - ECONOMIC_THRESHOLDS.REPAIR_COST.low)) * 0.3;
    reasons.push(`Reparaturkosten moderat (${repairCostEur}€)`);
  } else {
    const excess = repairCostEur - ECONOMIC_THRESHOLDS.REPAIR_COST.medium;
    costScore = 0.6 + Math.min(excess / 5000, 0.4);
    reasons.push(`Reparaturkosten hoch (${repairCostEur}€)`);
  }

  // Calculate labor score (0-1)
  let laborScore = 0;
  if (laborHours <= ECONOMIC_THRESHOLDS.LABOR_HOURS.low) {
    laborScore = laborHours / ECONOMIC_THRESHOLDS.LABOR_HOURS.low * 0.3;
    if (laborHours > 0) {
      reasons.push(`Arbeitsaufwand gering (${laborHours}h)`);
    }
  } else if (laborHours <= ECONOMIC_THRESHOLDS.LABOR_HOURS.medium) {
    laborScore = 0.3 + ((laborHours - ECONOMIC_THRESHOLDS.LABOR_HOURS.low) /
                (ECONOMIC_THRESHOLDS.LABOR_HOURS.medium - ECONOMIC_THRESHOLDS.LABOR_HOURS.low)) * 0.3;
    reasons.push(`Arbeitsaufwand moderat (${laborHours}h)`);
  } else {
    const excess = laborHours - ECONOMIC_THRESHOLDS.LABOR_HOURS.medium;
    laborScore = 0.6 + Math.min(excess / 25, 0.4);
    reasons.push(`Arbeitsaufwand hoch (${laborHours}h)`);
  }

  // Add parts info if significant
  if (partsCount >= ECONOMIC_THRESHOLDS.PARTS_COUNT.medium) {
    reasons.push(`${partsCount} Teile betroffen`);
  }

  // Combined economic score: 65% cost, 35% labor
  const score = clamp(0.65 * costScore + 0.35 * laborScore, 0, 1);
  const percent = Math.round(score * 100);
  const label = percentToLabel(percent);

  // Add Dubai context
  if (repairCostEur > 0 && repairCostEur <= 3000) {
    reasons.push('Günstige Teile in Sharjah verfügbar');
  }

  return {
    score: Math.round(score * 100) / 100,
    percent,
    label,
    reasons: reasons.slice(0, 6) // Max 6 reasons
  };
}

// ============================================================================
// MAIN SEVERITY BREAKDOWN FUNCTION
// ============================================================================

/**
 * Calculate complete severity breakdown with technical and economic scores
 *
 * This is the main export function that should be called after AI analysis.
 * It takes the parsed analysis data and returns a severity_breakdown object.
 *
 * @param {Object} analysisData - The parsed AI analysis data (from parseGeminiResponse)
 * @returns {Object} Complete severity breakdown
 */
export function calculateSeverityBreakdown(analysisData) {
  if (!analysisData) {
    return null;
  }

  const technical = calculateTechnicalSeverity(analysisData);
  const economic = calculateEconomicSeverity(analysisData);

  // Generate summary badge
  const summaryBadge = generateSummaryBadge(technical, economic);

  return {
    technical,
    economic,
    summaryBadge
  };
}

/**
 * Generate a human-readable summary badge
 */
function generateSummaryBadge(technical, economic) {
  const techLabel = technical.label;
  const econLabel = economic.label;

  // Same level
  if (techLabel === econLabel) {
    if (techLabel === 'LEICHT') {
      return 'Leichter Schaden, günstig reparierbar';
    } else if (techLabel === 'MITTEL') {
      return 'Mittlerer Schaden, moderate Kosten';
    } else {
      return 'Schwerer Schaden, hohe Kosten';
    }
  }

  // Technical higher than economic
  if (technical.percent > economic.percent + 20) {
    if (techLabel === 'SCHWER' && econLabel !== 'SCHWER') {
      return `Technisch schwer, aber gut reparierbar (Dubai)`;
    }
    if (techLabel === 'MITTEL' && econLabel === 'LEICHT') {
      return 'Mittlerer Schaden, günstige Reparatur möglich';
    }
  }

  // Economic higher than technical
  if (economic.percent > technical.percent + 20) {
    if (econLabel === 'SCHWER' && techLabel !== 'SCHWER') {
      return `Technisch ${techLabel.toLowerCase()}, aber hohe Kosten`;
    }
    if (econLabel === 'MITTEL' && techLabel === 'LEICHT') {
      return 'Leichter Schaden, aber moderate Kosten';
    }
  }

  // Default: show both
  return `Technisch ${techLabel.toLowerCase()}, wirtschaftlich ${econLabel.toLowerCase()}`;
}

/**
 * Calculate combined/overall severity score
 * Uses 70% technical + 30% economic weighting
 *
 * This is for backward compatibility if needed
 *
 * @param {Object} severityBreakdown - The severity breakdown object
 * @returns {number} Overall severity percentage (0-100)
 */
export function calculateOverallSeverity(severityBreakdown) {
  if (!severityBreakdown) return 50;

  const techPercent = severityBreakdown.technical?.percent || 50;
  const econPercent = severityBreakdown.economic?.percent || 50;

  return Math.round(techPercent * 0.7 + econPercent * 0.3);
}

/**
 * Enrich an existing AI analysis report with severity breakdown
 * This function is called after the AI analysis is parsed
 *
 * @param {Object} report - The existing AI damage report
 * @returns {Object} Report with added severity_breakdown
 */
export function enrichReportWithSeverityBreakdown(report) {
  if (!report) return report;

  // Calculate severity breakdown
  const severityBreakdown = calculateSeverityBreakdown({
    schweregrad: report.schweregrad,
    bauteil: report.bauteil,
    schadenAnalyse: report.schadenAnalyse || report.summary,
    reparaturWeg: report.reparaturWeg,
    fahrbereit: report.fahrbereit,
    frameRisk: report.frameRisk,
    affectedAreas: report.affectedAreas,
    damageDetails: report.damageDetails,
    kostenEur: report.kostenEur,
    kostenAed: report.kostenAed,
    estimatedRepairCost: report.estimatedRepairCost,
    totalRepairHours: report.totalRepairHours
  });

  // Return enriched report
  return {
    ...report,
    severityBreakdown,
    // Keep existing severity fields for backward compatibility
    severity: report.severity,
    severityScore: report.severityScore
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  calculateTechnicalSeverity,
  calculateEconomicSeverity,
  percentToLabel,
  schweregradToPercent,
  TECHNICAL_WEIGHTS,
  ECONOMIC_THRESHOLDS,
  SEVERITY_LABELS_MAP
};
