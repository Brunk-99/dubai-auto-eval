// Cost calculation logic for German import

// Exchange rate AED to EUR (1 EUR = 4.00 AED)
export const EUR_AED_RATE = 4.00;

// Default target profit percentage (35%)
const DEFAULT_TARGET_PROFIT_PCT = 35;

// Round down to nearest 50
function roundDownToNearest50(value) {
  return Math.floor(value / 50) * 50;
}

// Convert AED to EUR
export function aedToEur(aedAmount) {
  return aedAmount / EUR_AED_RATE;
}

// Convert EUR to AED
export function eurToAed(eurAmount) {
  return eurAmount * EUR_AED_RATE;
}

// Get repair estimate base (mechanic avg or AI estimate)
function getRepairEstimateBase(vehicle) {
  const { reviews, aiDamageReport } = vehicle;

  // First: use mechanic repair estimates if available
  const mechanicEstimates = (reviews || [])
    .map(r => r.repairEstimate)
    .filter(e => typeof e === 'number' && e > 0);

  if (mechanicEstimates.length > 0) {
    return {
      value: mechanicEstimates.reduce((a, b) => a + b, 0) / mechanicEstimates.length,
      source: 'mechanic',
      count: mechanicEstimates.length,
    };
  }

  // Second: use AI estimated repair cost
  if (aiDamageReport?.estimatedRepairCost > 0) {
    return {
      value: aiDamageReport.estimatedRepairCost,
      source: 'ai',
      count: 1,
    };
  }

  return { value: 0, source: 'none', count: 0 };
}

// Main cost calculation
// NOTE: startBid and finalBid are in AED and will be converted to EUR
export function calculateCosts(vehicle, settings = {}) {
  const {
    finalBid = 0,
    startBid = 0,
    marketPriceDE = 0,
    expectedResaleDE = 0, // Legacy field
    costInputs = {},
  } = vehicle;

  const {
    transportCost = 0,
    tuvCost = 0,
    miscCost = 0,
    repairBufferPct = 15,
  } = costInputs;

  const {
    targetProfitPct = DEFAULT_TARGET_PROFIT_PCT,
    safetyDeduction = 200,
  } = settings;

  // Use finalBid, fallback to startBid (both are in AED)
  const bidPriceAED = finalBid || startBid || 0;

  // Convert AED to EUR for calculations
  const bidPrice = aedToEur(bidPriceAED);

  // Use marketPriceDE, fallback to legacy expectedResaleDE
  const marketPrice = marketPriceDE || expectedResaleDE || 0;

  // Calculate target profit as percentage of market price (35%)
  const targetProfit = marketPrice * (targetProfitPct / 100);

  // Import duty (10%)
  const duty10 = bidPrice * 0.10;

  // VAT base and VAT (19%)
  const vatBase = bidPrice + duty10;
  const vat19 = vatBase * 0.19;

  // Repair estimate
  const repairEstimate = getRepairEstimateBase(vehicle);
  const repairEstimateAvg = repairEstimate.value;

  // Repair with buffer
  const bufferMultiplier = 1 + (repairBufferPct / 100);
  const repairBuffered = repairEstimateAvg * bufferMultiplier;

  // Other costs (excluding purchase price and duties)
  const otherCosts = transportCost + tuvCost + miscCost + repairBuffered;

  // Total cost
  const totalCost = bidPrice + duty10 + vat19 + otherCosts;

  // Profit
  const profit = marketPrice - totalCost;

  // ROI percentage
  const roiPct = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  // Profit percentage of market price
  const profitPct = marketPrice > 0 ? (profit / marketPrice) * 100 : 0;

  // Calculate max bid (in EUR)
  // Formula: maxBidRaw = (marketPrice - targetProfit - safetyDeduction - otherCosts) / 1.309
  // 1.309 = 1 + 0.10 (duty) + 0.19 * 1.10 (VAT on price+duty)
  const maxBidRaw = (marketPrice - targetProfit - safetyDeduction - otherCosts) / 1.309;
  const maxBid = Math.max(0, roundDownToNearest50(maxBidRaw));

  // Max bid in AED
  const maxBidAED = eurToAed(maxBid);

  return {
    bidPrice,
    bidPriceAED,
    marketPrice,
    duty10,
    vatBase,
    vat19,
    transportCost,
    tuvCost,
    miscCost,
    repairEstimateAvg,
    repairEstimateSource: repairEstimate.source,
    repairEstimateCount: repairEstimate.count,
    repairBuffered,
    otherCosts,
    totalCost,
    profit,
    roiPct,
    profitPct,
    maxBid,
    maxBidAED,
    targetProfit,
    targetProfitPct,
    safetyDeduction,
    eurAedRate: EUR_AED_RATE,
  };
}

// Get mechanic recommendation consensus
export function getReviewConsensus(reviews) {
  if (!reviews || reviews.length === 0) {
    return { green: 0, orange: 0, red: 0, total: 0, dominant: null };
  }

  const counts = { green: 0, orange: 0, red: 0 };
  for (const review of reviews) {
    if (review.recommendation && counts[review.recommendation] !== undefined) {
      counts[review.recommendation]++;
    }
  }

  const total = counts.green + counts.orange + counts.red;
  let dominant = null;
  let maxCount = 0;

  for (const [color, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = color;
    }
  }

  return { ...counts, total, dominant };
}

// Get highest risk level from reviews (legacy support)
export function getHighestRisk(reviews) {
  if (!reviews || reviews.length === 0) return null;

  const riskLevels = { high: 3, medium: 2, low: 1 };
  let highest = null;
  let highestLevel = 0;

  for (const review of reviews) {
    const level = riskLevels[review.risk] || 0;
    if (level > highestLevel) {
      highestLevel = level;
      highest = review.risk;
    }
  }
  return highest;
}

// Decision traffic light (Ampel) based on new rules
export function getAmpelStatus(vehicle, settings = {}) {
  const costs = calculateCosts(vehicle, settings);
  const { profit, profitPct, targetProfitPct } = costs;

  const consensus = getReviewConsensus(vehicle.reviews);
  const severity = vehicle.aiDamageReport?.severity;

  // Count red recommendations from mechanics
  const redCount = consensus.red || 0;

  // RED conditions
  if (profit < -500) {
    return { color: 'red', label: 'Nicht empfohlen', reason: 'Negatives Ergebnis' };
  }
  if (severity === 'high' && redCount >= 2) {
    return { color: 'red', label: 'Hohes Risiko', reason: 'Hoher Schaden, mehrere Mechaniker raten ab' };
  }
  if (consensus.dominant === 'red' && consensus.red >= 2) {
    return { color: 'red', label: 'Nicht empfohlen', reason: 'Mehrere Mechaniker raten ab' };
  }

  // YELLOW/ORANGE conditions - use percentage comparison
  if (profit >= -500 && profitPct <= targetProfitPct) {
    return { color: 'yellow', label: 'Vorsicht', reason: 'Grenzwertiger Profit' };
  }
  if (severity === 'high' && profitPct > targetProfitPct) {
    return { color: 'yellow', label: 'Prüfen', reason: 'Hoher Schaden aber guter Profit' };
  }
  if (consensus.dominant === 'orange') {
    return { color: 'yellow', label: 'Unsicher', reason: 'Mechaniker sind unsicher' };
  }

  // GREEN conditions - use percentage comparison
  if (profitPct > targetProfitPct && severity !== 'high') {
    return { color: 'green', label: 'Empfohlen', reason: 'Guter Profit, akzeptabler Schaden' };
  }
  if (profitPct > targetProfitPct && consensus.dominant === 'green') {
    return { color: 'green', label: 'Empfohlen', reason: 'Guter Profit, Mechaniker empfehlen' };
  }

  // Default to yellow if unclear
  return { color: 'yellow', label: 'Prüfen', reason: 'Bitte manuell bewerten' };
}

// Recommendation labels and colors
export const RECOMMENDATION_LABELS = {
  green: 'Empfehlung',
  orange: 'Unsicher',
  red: 'Nicht empfohlen',
};

export const RECOMMENDATION_COLORS = {
  green: 'bg-green-100 text-green-800',
  orange: 'bg-orange-100 text-orange-800',
  red: 'bg-red-100 text-red-800',
};
