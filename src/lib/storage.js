// Storage Facade - Automatically switches between localStorage (dev) and Cloud (prod)

// Check if running in production (Vercel)
const isProduction = import.meta.env.PROD;

// Import Cloud Storage for production
import * as cloudStorage from './cloudStorage.js';

// ============================================================
// LOCAL STORAGE IMPLEMENTATION (for development)
// ============================================================

const STORAGE_KEY = 'dubai-auto-eval-data';

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

// Load data from localStorage
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    console.log('[LocalStorage] loadData - raw:', raw ? `${raw.length} chars` : 'EMPTY');
    if (raw) {
      const parsed = JSON.parse(raw);
      console.log('[LocalStorage] loadData - vehicles:', parsed.vehicles?.length || 0);
      return parsed;
    }
  } catch (e) {
    console.error('[LocalStorage] Failed to load:', e);
  }
  return { vehicles: [], settings: {} };
}

// Save data to localStorage
function saveData(data) {
  const json = JSON.stringify(data);
  const sizeMB = (json.length / 1024 / 1024).toFixed(2);
  console.log('[LocalStorage] saveData - saving:', json.length, 'chars (', sizeMB, 'MB)');

  try {
    localStorage.setItem(STORAGE_KEY, json);
  } catch (e) {
    console.error('[LocalStorage] Failed to save:', e);
    if (e.name === 'QuotaExceededError' || e.message?.includes('quota')) {
      throw new Error(
        `Speicher voll! Daten sind ${sizeMB} MB groß. Bitte lösche alte Fahrzeuge.`
      );
    }
    throw new Error('Speichern fehlgeschlagen: ' + e.message);
  }
}

// LOCAL VEHICLES CRUD

async function localGetAllVehicles() {
  const data = loadData();
  const vehicles = data.vehicles || [];

  for (const vehicle of vehicles) {
    const photoKey = `dubai-auto-eval-photos-${vehicle.id}`;
    try {
      const photosJson = localStorage.getItem(photoKey);
      if (photosJson) {
        const photos = JSON.parse(photosJson);
        vehicle.photoCount = photos.length;
        if (photos.length > 0) {
          vehicle.thumbnailPhoto = photos[0];
        }
      }
    } catch (e) {
      console.error('[LocalStorage] Failed to load photo count for', vehicle.id);
    }
  }

  return vehicles;
}

async function localGetVehicle(id) {
  const data = loadData();
  const vehicle = data.vehicles?.find((v) => v.id === id) || null;

  if (vehicle) {
    const photoKey = `dubai-auto-eval-photos-${id}`;
    try {
      const photosJson = localStorage.getItem(photoKey);
      if (photosJson) {
        vehicle.photos = JSON.parse(photosJson);
        console.log('[LocalStorage] getVehicle - loaded', vehicle.photos.length, 'photos');
      }
    } catch (e) {
      console.error('[LocalStorage] Failed to load photos:', e);
      vehicle.photos = vehicle.photos || [];
    }
  }

  return vehicle;
}

async function localSaveVehicle(vehicle) {
  console.log('[LocalStorage] saveVehicle:', vehicle.id);
  const data = loadData();

  if (!Array.isArray(data.vehicles)) {
    data.vehicles = [];
  }

  const photos = vehicle.photos || [];
  const photoKey = `dubai-auto-eval-photos-${vehicle.id}`;
  const vehicleWithoutPhotos = { ...vehicle, photos: [] };

  const index = data.vehicles.findIndex((v) => v.id === vehicle.id);
  if (index >= 0) {
    data.vehicles[index] = vehicleWithoutPhotos;
  } else {
    data.vehicles.push(vehicleWithoutPhotos);
  }

  saveData(data);

  if (photos.length > 0) {
    try {
      const photosJson = JSON.stringify(photos);
      console.log('[LocalStorage] Saving photos:', photos.length);
      localStorage.setItem(photoKey, photosJson);
    } catch (e) {
      console.error('[LocalStorage] Failed to save photos:', e);
      if (e.name === 'QuotaExceededError' || e.message?.includes('quota')) {
        throw new Error(`Zu viele Fotos! Bitte reduziere auf max. 5-6 Fotos.`);
      }
      throw new Error('Fotos konnten nicht gespeichert werden: ' + e.message);
    }
  }

  return vehicle;
}

async function localDeleteVehicle(id) {
  const data = loadData();
  data.vehicles = data.vehicles.filter((v) => v.id !== id);
  saveData(data);

  const photoKey = `dubai-auto-eval-photos-${id}`;
  try {
    localStorage.removeItem(photoKey);
  } catch (e) {
    console.error('[LocalStorage] Failed to delete photos:', e);
  }
}

// LOCAL SETTINGS

async function localGetSetting(key) {
  const data = loadData();
  return data.settings?.[key];
}

async function localSaveSetting(key, value) {
  const data = loadData();
  if (!data.settings) data.settings = {};
  data.settings[key] = value;
  saveData(data);
}

async function localGetAllSettings() {
  const data = loadData();
  return data.settings || {};
}

async function localSaveAllSettings(settings) {
  const data = loadData();
  data.settings = { ...data.settings, ...settings };
  saveData(data);
}

// ============================================================
// EXPORTED FUNCTIONS - Switch based on environment
// ============================================================

console.log(`[Storage] Mode: ${isProduction ? 'CLOUD (Vercel)' : 'LOCAL (Development)'}`);

// VEHICLES
export async function getAllVehicles() {
  if (isProduction) {
    return cloudStorage.getAllVehicles();
  }
  return localGetAllVehicles();
}

export async function getVehicle(id) {
  if (isProduction) {
    return cloudStorage.getVehicle(id);
  }
  return localGetVehicle(id);
}

export async function saveVehicle(vehicle) {
  if (isProduction) {
    return cloudStorage.saveVehicle(vehicle);
  }
  return localSaveVehicle(vehicle);
}

export async function deleteVehicle(id) {
  if (isProduction) {
    return cloudStorage.deleteVehicle(id);
  }
  return localDeleteVehicle(id);
}

// SETTINGS
export async function getSetting(key) {
  if (isProduction) {
    return cloudStorage.getSetting(key);
  }
  return localGetSetting(key);
}

export async function saveSetting(key, value) {
  if (isProduction) {
    return cloudStorage.saveSetting(key, value);
  }
  return localSaveSetting(key, value);
}

export async function getAllSettings() {
  if (isProduction) {
    return cloudStorage.getAllSettings();
  }
  return localGetAllSettings();
}

export async function saveAllSettings(settings) {
  if (isProduction) {
    return cloudStorage.saveAllSettings(settings);
  }
  return localSaveAllSettings(settings);
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

// HELPER FUNCTIONS (same for both modes)

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

// MIGRATION (only for localStorage)
export async function migrateVehicles() {
  if (isProduction) {
    console.log('[Storage] Cloud mode - no migration needed');
    return;
  }

  const data = loadData();
  let changed = false;

  for (const vehicle of data.vehicles) {
    if (vehicle.marketPriceDE === undefined) {
      vehicle.marketPriceDE = vehicle.expectedResaleDE || 0;
      changed = true;
    }
    if (!vehicle.createdBy) {
      vehicle.createdBy = null;
      changed = true;
    }
    if (!vehicle.updatedBy) {
      vehicle.updatedBy = null;
      changed = true;
    }
    if (vehicle.reviews?.length > 0) {
      for (const review of vehicle.reviews) {
        if (review.recommendation === undefined) {
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
