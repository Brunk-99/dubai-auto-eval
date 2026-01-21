// Number and currency formatters

export function formatCurrency(value, currency = 'EUR') {
  if (value === null || value === undefined || isNaN(value)) {
    return '–';
  }
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '–';
  }
  return new Intl.NumberFormat('de-DE').format(value);
}

export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) {
    return '–';
  }
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(dateString) {
  if (!dateString) return '–';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(dateString) {
  if (!dateString) return '–';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Parse currency input (German format with dots/commas)
export function parseCurrencyInput(value) {
  if (!value) return 0;
  // Remove currency symbols and whitespace
  const cleaned = String(value)
    .replace(/[€$\s]/g, '')
    .replace(/\./g, '') // Remove thousand separators
    .replace(',', '.'); // Replace decimal comma with dot
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Status labels
export const STATUS_LABELS = {
  watching: 'Beobachten',
  bid_placed: 'Gebot aktiv',
  bought: 'Gekauft',
  rejected: 'Abgelehnt',
};

export const STATUS_COLORS = {
  watching: 'bg-blue-100 text-blue-800',
  bid_placed: 'bg-yellow-100 text-yellow-800',
  bought: 'bg-green-100 text-green-800',
  rejected: 'bg-gray-100 text-gray-600',
};

// Risk labels
export const RISK_LABELS = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
};

export const RISK_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

// Severity labels
export const SEVERITY_LABELS = {
  low: 'Gering',
  medium: 'Mittel',
  high: 'Schwer',
};

export const SEVERITY_COLORS = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-red-600',
};
