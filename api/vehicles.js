// Vercel Serverless Function: /api/vehicles
// CRUD operations for vehicles using Upstash Redis

import { Redis } from '@upstash/redis';

// Initialize Redis client from environment variables
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Storage keys
const VEHICLES_KEY = 'dubai-auto-eval:vehicles';
const PHOTOS_PREFIX = 'dubai-auto-eval:photos:';
const SETTINGS_KEY = 'dubai-auto-eval:settings';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { method, query } = req;
    const vehicleId = query.id;

    switch (method) {
      case 'GET':
        if (vehicleId) {
          // Get single vehicle with photos
          return await getVehicle(vehicleId, res);
        } else {
          // Get all vehicles (list view, with thumbnails)
          return await getAllVehicles(res);
        }

      case 'POST':
        // Create new vehicle
        return await createVehicle(req.body, res);

      case 'PUT':
        if (!vehicleId) {
          return res.status(400).json({ error: 'Vehicle ID required' });
        }
        // Update existing vehicle
        return await updateVehicle(vehicleId, req.body, res);

      case 'DELETE':
        if (!vehicleId) {
          return res.status(400).json({ error: 'Vehicle ID required' });
        }
        // Delete vehicle
        return await deleteVehicle(vehicleId, res);

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('[Vehicles API] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Get all vehicles (list view)
async function getAllVehicles(res) {
  const vehiclesJson = await redis.get(VEHICLES_KEY);
  const vehicles = vehiclesJson || [];

  // For list view, include thumbnail but not all photos
  const vehiclesWithThumbnails = await Promise.all(
    vehicles.map(async (vehicle) => {
      const photosJson = await redis.get(`${PHOTOS_PREFIX}${vehicle.id}`);
      const photos = photosJson || [];
      return {
        ...vehicle,
        photoCount: photos.length,
        thumbnailPhoto: photos[0] || null,
      };
    })
  );

  return res.status(200).json(vehiclesWithThumbnails);
}

// Get single vehicle with all photos
async function getVehicle(id, res) {
  const vehiclesJson = await redis.get(VEHICLES_KEY);
  const vehicles = vehiclesJson || [];
  const vehicle = vehicles.find((v) => v.id === id);

  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  // Load photos
  const photosJson = await redis.get(`${PHOTOS_PREFIX}${id}`);
  vehicle.photos = photosJson || [];

  return res.status(200).json(vehicle);
}

// Create new vehicle
async function createVehicle(vehicleData, res) {
  const vehiclesJson = await redis.get(VEHICLES_KEY);
  const vehicles = vehiclesJson || [];

  // Extract photos to store separately
  const { photos, ...vehicleWithoutPhotos } = vehicleData;

  // Add vehicle
  vehicles.push(vehicleWithoutPhotos);
  await redis.set(VEHICLES_KEY, vehicles);

  // Store photos separately
  if (photos && photos.length > 0) {
    await redis.set(`${PHOTOS_PREFIX}${vehicleData.id}`, photos);
  }

  console.log('[Vehicles API] Created vehicle:', vehicleData.id);
  return res.status(201).json(vehicleData);
}

// Update existing vehicle
async function updateVehicle(id, vehicleData, res) {
  const vehiclesJson = await redis.get(VEHICLES_KEY);
  const vehicles = vehiclesJson || [];

  const index = vehicles.findIndex((v) => v.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  // Extract photos to store separately
  const { photos, ...vehicleWithoutPhotos } = vehicleData;

  // Update vehicle
  vehicles[index] = vehicleWithoutPhotos;
  await redis.set(VEHICLES_KEY, vehicles);

  // Update photos separately
  if (photos !== undefined) {
    if (photos.length > 0) {
      await redis.set(`${PHOTOS_PREFIX}${id}`, photos);
    } else {
      await redis.del(`${PHOTOS_PREFIX}${id}`);
    }
  }

  console.log('[Vehicles API] Updated vehicle:', id);
  return res.status(200).json(vehicleData);
}

// Delete vehicle
async function deleteVehicle(id, res) {
  const vehiclesJson = await redis.get(VEHICLES_KEY);
  const vehicles = vehiclesJson || [];

  const filteredVehicles = vehicles.filter((v) => v.id !== id);
  if (filteredVehicles.length === vehicles.length) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  await redis.set(VEHICLES_KEY, filteredVehicles);

  // Delete photos
  await redis.del(`${PHOTOS_PREFIX}${id}`);

  console.log('[Vehicles API] Deleted vehicle:', id);
  return res.status(200).json({ success: true });
}

// Vercel Function Config
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Large limit for photos
    },
  },
  maxDuration: 30,
};
