// Cloud Storage - API-based storage using Upstash Redis via Vercel Functions
// Replaces localStorage for cross-device sync

// API Base URL
function getApiUrl(path) {
  if (import.meta.env.PROD) {
    return path; // Relative URL in production (Vercel)
  }
  // In development: use same hostname as browser but port 3001
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${host}:3001${path}`;
}

// UUID Generator
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// VEHICLES CRUD

export async function getAllVehicles() {
  try {
    const response = await fetch(getApiUrl('/api/vehicles'));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const vehicles = await response.json();
    console.log('[CloudStorage] getAllVehicles:', vehicles.length, 'vehicles');
    return vehicles;
  } catch (error) {
    console.error('[CloudStorage] getAllVehicles error:', error);
    // Fallback to empty array on error
    return [];
  }
}

export async function getVehicle(id) {
  try {
    const response = await fetch(getApiUrl(`/api/vehicles?id=${id}`));
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP ${response.status}`);
    }
    const vehicle = await response.json();
    console.log('[CloudStorage] getVehicle:', id, vehicle ? 'found' : 'not found');
    return vehicle;
  } catch (error) {
    console.error('[CloudStorage] getVehicle error:', error);
    return null;
  }
}

export async function saveVehicle(vehicle) {
  console.log('[CloudStorage] saveVehicle:', vehicle.id);

  // Check if vehicle exists
  const existing = await getVehicle(vehicle.id);
  const method = existing ? 'PUT' : 'POST';
  const url = existing ? getApiUrl(`/api/vehicles?id=${vehicle.id}`) : getApiUrl('/api/vehicles');

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vehicle),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const saved = await response.json();
    console.log('[CloudStorage] saveVehicle success:', vehicle.id);
    return saved;
  } catch (error) {
    console.error('[CloudStorage] saveVehicle error:', error);
    throw new Error('Speichern fehlgeschlagen: ' + error.message);
  }
}

export async function deleteVehicle(id) {
  console.log('[CloudStorage] deleteVehicle:', id);

  try {
    const response = await fetch(getApiUrl(`/api/vehicles?id=${id}`), {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    console.log('[CloudStorage] deleteVehicle success:', id);
  } catch (error) {
    console.error('[CloudStorage] deleteVehicle error:', error);
    throw new Error('Löschen fehlgeschlagen: ' + error.message);
  }
}

// SETTINGS

export async function getSetting(key) {
  try {
    const response = await fetch(getApiUrl(`/api/settings?key=${key}`));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.value;
  } catch (error) {
    console.error('[CloudStorage] getSetting error:', error);
    return undefined;
  }
}

export async function saveSetting(key, value) {
  try {
    const response = await fetch(getApiUrl(`/api/settings?key=${key}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.log('[CloudStorage] saveSetting success:', key);
  } catch (error) {
    console.error('[CloudStorage] saveSetting error:', error);
    throw new Error('Einstellung konnte nicht gespeichert werden');
  }
}

export async function getAllSettings() {
  try {
    const response = await fetch(getApiUrl('/api/settings'));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[CloudStorage] getAllSettings error:', error);
    return {};
  }
}

export async function saveAllSettings(settings) {
  try {
    const response = await fetch(getApiUrl('/api/settings'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.log('[CloudStorage] saveAllSettings success');
  } catch (error) {
    console.error('[CloudStorage] saveAllSettings error:', error);
    throw new Error('Einstellungen konnten nicht gespeichert werden');
  }
}

// DEFAULT COST SETTINGS
const DEFAULT_COST_SETTINGS = {
  transportCost: 2500,
  tuvCost: 800,
  miscCost: 500,
  repairBufferPct: 15,
  defaultMarketPriceDE: 0,
  targetProfit: 2000,
  safetyDeduction: 200,
};

export async function getCostDefaults() {
  const saved = await getSetting('costDefaults');
  return { ...DEFAULT_COST_SETTINGS, ...saved };
}

export async function saveCostDefaults(defaults) {
  await saveSetting('costDefaults', defaults);
}

// Helper: Create new vehicle with defaults
export function createEmptyVehicle(costDefaults, currentUser = null) {
  const now = new Date().toISOString();
  return {
    id: generateUUID(),
    brand: '',
    model: '',
    title: '',
    color: '',
    vin: '',
    mileage: '',
    auctionLocation: '',
    notes: '',
    status: 'watching',
    startBid: 0,
    finalBid: 0,
    marketPriceDE: costDefaults?.defaultMarketPriceDE ?? DEFAULT_COST_SETTINGS.defaultMarketPriceDE,
    photos: [],
    aiDamageReport: null,
    reviews: [],
    comments: [],
    costInputs: {
      transportCost: costDefaults?.transportCost ?? DEFAULT_COST_SETTINGS.transportCost,
      tuvCost: costDefaults?.tuvCost ?? DEFAULT_COST_SETTINGS.tuvCost,
      miscCost: costDefaults?.miscCost ?? DEFAULT_COST_SETTINGS.miscCost,
      repairBufferPct: costDefaults?.repairBufferPct ?? DEFAULT_COST_SETTINGS.repairBufferPct,
    },
    createdBy: currentUser ? { id: currentUser.id, name: currentUser.name } : null,
    createdAt: now,
    updatedBy: currentUser ? { id: currentUser.id, name: currentUser.name } : null,
    updatedAt: now,
  };
}

// Helper: Create mechanic review
export function createMechanicReview(currentUser, data = {}) {
  return {
    id: generateUUID(),
    mechanicId: currentUser?.id || null,
    mechanicName: currentUser?.name || 'Unbekannt',
    recommendation: data.recommendation || null,
    repairEstimate: data.repairEstimate || 0,
    risk: data.risk || null,
    comment: data.comment || '',
    createdAt: new Date().toISOString(),
  };
}

// Helper: Create comment
export function createComment(currentUser, text) {
  return {
    id: generateUUID(),
    authorId: currentUser?.id || null,
    authorName: currentUser?.name || 'Unbekannt',
    authorRole: currentUser?.role || null,
    text: text,
    createdAt: new Date().toISOString(),
  };
}

// Migration: No-op for cloud storage (localStorage migration handled separately)
export async function migrateVehicles() {
  // Cloud storage doesn't need migration
  console.log('[CloudStorage] migrateVehicles - no action needed');
}
