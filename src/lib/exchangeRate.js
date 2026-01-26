// Exchange rate service for AED to EUR conversion
// Uses frankfurter.app (free, no API key required)

const CACHE_KEY = 'exchange_rate_cache';
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours in ms
const FALLBACK_RATE = 4.00; // Fallback if API fails

// Get cached rate from localStorage
function getCachedRate() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { rate, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    // Return cached rate if still valid
    if (age < CACHE_DURATION) {
      return { rate, fromCache: true, timestamp };
    }
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

// Fetch current exchange rate from API
async function fetchRate() {
  try {
    // frankfurter.app is free and doesn't require API key
    const response = await fetch('https://api.frankfurter.app/latest?from=EUR&to=AED');

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const rate = data.rates?.AED;

    if (typeof rate !== 'number' || rate <= 0) {
      throw new Error('Invalid rate received');
    }

    console.log('[ExchangeRate] Fetched rate: 1 EUR =', rate, 'AED');
    return rate;
  } catch (error) {
    console.error('[ExchangeRate] Fetch error:', error);
    return null;
  }
}

// Get current AED/EUR rate (1 EUR = X AED)
export async function getExchangeRate() {
  // Check cache first
  const cached = getCachedRate();
  if (cached) {
    console.log('[ExchangeRate] Using cached rate:', cached.rate);
    return {
      rate: cached.rate,
      fromCache: true,
      updatedAt: new Date(cached.timestamp).toLocaleString('de-DE'),
    };
  }

  // Fetch fresh rate
  const freshRate = await fetchRate();

  if (freshRate) {
    setCachedRate(freshRate);
    return {
      rate: freshRate,
      fromCache: false,
      updatedAt: new Date().toLocaleString('de-DE'),
    };
  }

  // Fallback if everything fails
  console.warn('[ExchangeRate] Using fallback rate:', FALLBACK_RATE);
  return {
    rate: FALLBACK_RATE,
    fromCache: false,
    isFallback: true,
    updatedAt: null,
  };
}

// Synchronous getter for cached rate (for calculations that can't await)
export function getCachedExchangeRate() {
  const cached = getCachedRate();
  return cached?.rate || FALLBACK_RATE;
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
