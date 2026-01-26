// Exchange rate service for AED to EUR conversion
// Uses fawazahmed0/currency-api (free, no API key, high precision, CDN-backed)
// Fallback to open.er-api.com if primary fails

const CACHE_KEY = 'exchange_rate_cache';
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours in ms
const HARDCODED_FALLBACK = 4.35; // Only used if no cached rate exists at all

// Get cached rate from localStorage
function getCachedRate() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { rate, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    // Return rate with info about whether it's still fresh
    return {
      rate,
      timestamp,
      isFresh: age < CACHE_DURATION,
      age,
    };
  } catch (e) {
    console.warn('[ExchangeRate] Cache read error:', e);
  }
  return null;
}

// Save rate to cache
function setCachedRate(rate) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      rate,
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.warn('[ExchangeRate] Cache write error:', e);
  }
}

// Fetch from primary API (fawazahmed0 - high precision, CDN-backed)
async function fetchFromPrimaryAPI() {
  const response = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json');

  if (!response.ok) {
    throw new Error(`Primary API error: ${response.status}`);
  }

  const data = await response.json();
  const rate = data.eur?.aed;

  if (typeof rate !== 'number' || rate <= 0) {
    throw new Error('Invalid rate from primary API');
  }

  return rate;
}

// Fetch from fallback API (open.er-api.com)
async function fetchFromFallbackAPI() {
  const response = await fetch('https://open.er-api.com/v6/latest/EUR');

  if (!response.ok) {
    throw new Error(`Fallback API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.result !== 'success') {
    throw new Error('Fallback API returned error');
  }

  const rate = data.rates?.AED;

  if (typeof rate !== 'number' || rate <= 0) {
    throw new Error('Invalid rate from fallback API');
  }

  return rate;
}

// Fetch current exchange rate from API (with fallback)
async function fetchRate() {
  // Try primary API first
  try {
    const rate = await fetchFromPrimaryAPI();
    console.log('[ExchangeRate] Fetched from primary API: 1 EUR =', rate, 'AED');
    return rate;
  } catch (primaryError) {
    console.warn('[ExchangeRate] Primary API failed:', primaryError.message);
  }

  // Fallback to secondary API
  try {
    const rate = await fetchFromFallbackAPI();
    console.log('[ExchangeRate] Fetched from fallback API: 1 EUR =', rate, 'AED');
    return rate;
  } catch (fallbackError) {
    console.error('[ExchangeRate] All APIs failed:', fallbackError.message);
    return null;
  }
}

// Get the best available fallback rate (last known or hardcoded)
function getFallbackRate() {
  const cached = getCachedRate();
  if (cached?.rate) {
    console.log('[ExchangeRate] Using last known rate as fallback:', cached.rate);
    return {
      rate: cached.rate,
      timestamp: cached.timestamp,
      isLastKnown: true,
    };
  }
  console.warn('[ExchangeRate] No cached rate, using hardcoded fallback:', HARDCODED_FALLBACK);
  return {
    rate: HARDCODED_FALLBACK,
    timestamp: null,
    isHardcoded: true,
  };
}

// Get current AED/EUR rate (1 EUR = X AED)
export async function getExchangeRate() {
  // Check cache first
  const cached = getCachedRate();

  // If cache is fresh, use it
  if (cached?.isFresh) {
    console.log('[ExchangeRate] Using fresh cached rate:', cached.rate);
    return {
      rate: cached.rate,
      fromCache: true,
      updatedAt: new Date(cached.timestamp).toLocaleString('de-DE'),
    };
  }

  // Cache expired or empty, try to fetch fresh rate
  const freshRate = await fetchRate();

  if (freshRate) {
    setCachedRate(freshRate);
    return {
      rate: freshRate,
      fromCache: false,
      updatedAt: new Date().toLocaleString('de-DE'),
    };
  }

  // API failed - use fallback (last known rate or hardcoded)
  const fallback = getFallbackRate();

  return {
    rate: fallback.rate,
    fromCache: false,
    isFallback: true,
    isLastKnown: fallback.isLastKnown || false,
    updatedAt: fallback.timestamp
      ? new Date(fallback.timestamp).toLocaleString('de-DE')
      : null,
  };
}

// Synchronous getter for cached rate (for calculations that can't await)
export function getCachedExchangeRate() {
  const cached = getCachedRate();
  return cached?.rate || HARDCODED_FALLBACK;
}

// Force refresh the rate
export async function refreshExchangeRate() {
  const freshRate = await fetchRate();
  if (freshRate) {
    setCachedRate(freshRate);
    return freshRate;
  }
  return getCachedExchangeRate();
}

// Convert AED to EUR using current rate
export function aedToEur(aedAmount, rate = null) {
  const exchangeRate = rate || getCachedExchangeRate();
  return aedAmount / exchangeRate;
}

// Convert EUR to AED using current rate
export function eurToAed(eurAmount, rate = null) {
  const exchangeRate = rate || getCachedExchangeRate();
  return eurAmount * exchangeRate;
}
