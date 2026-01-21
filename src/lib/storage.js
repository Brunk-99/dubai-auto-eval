// Storage mit localStorage für Safari/iOS Kompatibilität

const STORAGE_KEY = 'dubai-auto-eval-data';

// UUID Generator - funktioniert auch ohne HTTPS auf mobilen Geräten
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback wenn nicht verfügbar
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Lade alle Daten aus localStorage
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    console.log('[Storage] loadData - raw from localStorage:', raw ? `${raw.length} chars` : 'EMPTY');
    if (raw) {
      const parsed = JSON.parse(raw);
      console.log('[Storage] loadData - parsed vehicles count:', parsed.vehicles?.length || 0);
      return parsed;
    }
  } catch (e) {
    console.error('Storage: Failed to load data:', e);
  }
  console.log('[Storage] loadData - returning empty default');
  return { vehicles: [], settings: {} };
}

// Speichere alle Daten in localStorage
function saveData(data) {
  const json = JSON.stringify(data);
  const sizeMB = (json.length / 1024 / 1024).toFixed(2);
  console.log('[Storage] saveData - saving:', json.length, 'chars (', sizeMB, 'MB), vehicles:', data.vehicles?.length || 0);

  try {
    localStorage.setItem(STORAGE_KEY, json);
  } catch (e) {
    console.error('Storage: Failed to save data:', e);
    // localStorage ist voll (typischerweise 5-10MB Limit)
    if (e.name === 'QuotaExceededError' || e.message?.includes('quota')) {
      throw new Error(`Speicher voll! Daten sind ${sizeMB} MB groß. Bitte lösche alte Fahrzeuge oder reduziere die Anzahl der Fotos.`);
    }
    throw new Error('Speichern fehlgeschlagen: ' + e.message);
  }

  // Verify it was saved
  const verify = localStorage.getItem(STORAGE_KEY);
  console.log('[Storage] saveData - verification:', verify ? `${verify.length} chars saved OK` : 'FAILED - NOT SAVED');
}

// VEHICLES CRUD

export async function getAllVehicles() {
  const data = loadData();
  const vehicles = data.vehicles || [];

  // Lade Foto-Anzahl für jedes Fahrzeug (nicht die ganzen Bilder)
  for (const vehicle of vehicles) {
    const photoKey = `dubai-auto-eval-photos-${vehicle.id}`;
    try {
      const photosJson = localStorage.getItem(photoKey);
      if (photosJson) {
        const photos = JSON.parse(photosJson);
        vehicle.photoCount = photos.length;
        // Lade nur erstes Foto als Thumbnail
        if (photos.length > 0) {
          vehicle.thumbnailPhoto = photos[0];
        }
      }
    } catch (e) {
      console.error('[Storage] Failed to load photo count for', vehicle.id);
    }
  }

  return vehicles;
}

export async function getVehicle(id) {
  const data = loadData();
  const vehicle = data.vehicles?.find(v => v.id === id) || null;

  if (vehicle) {
    // Lade Fotos separat
    const photoKey = `dubai-auto-eval-photos-${id}`;
    try {
      const photosJson = localStorage.getItem(photoKey);
      if (photosJson) {
        vehicle.photos = JSON.parse(photosJson);
        console.log('[Storage] getVehicle - loaded', vehicle.photos.length, 'photos separately');
      }
    } catch (e) {
      console.error('[Storage] Failed to load photos:', e);
      vehicle.photos = vehicle.photos || [];
    }
  }

  return vehicle;
}

export async function saveVehicle(vehicle) {
  console.log('[Storage] saveVehicle called with id:', vehicle.id);
  const data = loadData();

  // Ensure vehicles array exists
  if (!Array.isArray(data.vehicles)) {
    console.log('[Storage] saveVehicle - initializing vehicles array');
    data.vehicles = [];
  }

  // Speichere Fotos separat um localStorage-Limit zu umgehen
  const photos = vehicle.photos || [];
  const photoKey = `dubai-auto-eval-photos-${vehicle.id}`;

  // Vehicle ohne Fotos für Hauptspeicher
  const vehicleWithoutPhotos = { ...vehicle, photos: [] };

  console.log('[Storage] saveVehicle - existing vehicles before:', data.vehicles.length);
  const index = data.vehicles.findIndex(v => v.id === vehicle.id);
  if (index >= 0) {
    console.log('[Storage] saveVehicle - UPDATING existing at index:', index);
    data.vehicles[index] = vehicleWithoutPhotos;
  } else {
    console.log('[Storage] saveVehicle - ADDING new vehicle');
    data.vehicles.push(vehicleWithoutPhotos);
  }
  console.log('[Storage] saveVehicle - vehicles after:', data.vehicles.length);

  // Speichere Hauptdaten
  saveData(data);

  // Speichere Fotos separat
  if (photos.length > 0) {
    try {
      const photosJson = JSON.stringify(photos);
      const photosSizeMB = (photosJson.length / 1024 / 1024).toFixed(2);
      console.log('[Storage] saveVehicle - saving photos separately:', photos.length, 'photos,', photosSizeMB, 'MB');
      localStorage.setItem(photoKey, photosJson);
    } catch (e) {
      console.error('[Storage] Failed to save photos:', e);
      if (e.name === 'QuotaExceededError' || e.message?.includes('quota')) {
        throw new Error(`Zu viele Fotos! ${photos.length} Fotos sind zu groß. Bitte reduziere auf max. 5-6 Fotos.`);
      }
      throw new Error('Fotos konnten nicht gespeichert werden: ' + e.message);
    }
  }

  // Double-check it was saved
  const verification = loadData();
  const saved = verification.vehicles?.find(v => v.id === vehicle.id);
  if (!saved) {
    console.error('[Storage] CRITICAL: Vehicle was not saved!');
    throw new Error('Fahrzeug konnte nicht gespeichert werden');
  }
  console.log('[Storage] saveVehicle - verified OK');

  return vehicle;
}

export async function deleteVehicle(id) {
  const data = loadData();
  data.vehicles = data.vehicles.filter(v => v.id !== id);
  saveData(data);

  // Lösche auch die separaten Fotos
  const photoKey = `dubai-auto-eval-photos-${id}`;
  try {
    localStorage.removeItem(photoKey);
    console.log('[Storage] deleteVehicle - removed photos for', id);
  } catch (e) {
    console.error('[Storage] Failed to delete photos:', e);
  }
}

// SETTINGS

export async function getSetting(key) {
  const data = loadData();
  return data.settings?.[key];
}

export async function saveSetting(key, value) {
  const data = loadData();
  if (!data.settings) data.settings = {};
  data.settings[key] = value;
  saveData(data);
}

export async function getAllSettings() {
  const data = loadData();
  return data.settings || {};
}

export async function saveAllSettings(settings) {
  const data = loadData();
  data.settings = { ...data.settings, ...settings };
  saveData(data);
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
    title: '',  // wird automatisch aus brand + model generiert
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
    // Audit trail
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
    recommendation: data.recommendation || null, // green | orange | red
    repairEstimate: data.repairEstimate || 0,
    risk: data.risk || null, // low | medium | high (optional)
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

// Migrate old vehicles to new format
export async function migrateVehicles() {
  const data = loadData();
  let changed = false;

  for (const vehicle of data.vehicles) {
    // Add marketPriceDE if missing (migrate from expectedResaleDE)
    if (vehicle.marketPriceDE === undefined) {
      vehicle.marketPriceDE = vehicle.expectedResaleDE || 0;
      changed = true;
    }

    // Add audit fields if missing
    if (!vehicle.createdBy) {
      vehicle.createdBy = null;
      changed = true;
    }
    if (!vehicle.updatedBy) {
      vehicle.updatedBy = null;
      changed = true;
    }

    // Migrate old reviews to new format
    if (vehicle.reviews?.length > 0) {
      for (const review of vehicle.reviews) {
        if (review.recommendation === undefined) {
          // Migrate old risk-based to recommendation
          if (review.risk === 'low') {
            review.recommendation = 'green';
          } else if (review.risk === 'high') {
            review.recommendation = 'red';
          } else {
            review.recommendation = 'orange';
          }
          changed = true;
        }
        if (review.mechanicId === undefined) {
          review.mechanicId = null;
          changed = true;
        }
      }
    }
  }

  if (changed) {
    saveData(data);
  }
}
