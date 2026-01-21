// Vercel Serverless Function: /api/settings
// Settings storage using Upstash Redis

import { Redis } from '@upstash/redis';

// Initialize Redis client from environment variables
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Storage key
const SETTINGS_KEY = 'dubai-auto-eval:settings';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { method, query } = req;
    const settingKey = query.key;

    switch (method) {
      case 'GET':
        if (settingKey) {
          // Get single setting
          return await getSetting(settingKey, res);
        } else {
          // Get all settings
          return await getAllSettings(res);
        }

      case 'POST':
      case 'PUT':
        if (settingKey) {
          // Save single setting
          return await saveSetting(settingKey, req.body.value, res);
        } else {
          // Save all settings
          return await saveAllSettings(req.body, res);
        }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('[Settings API] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Get all settings
async function getAllSettings(res) {
  const settings = await redis.get(SETTINGS_KEY);
  return res.status(200).json(settings || {});
}

// Get single setting
async function getSetting(key, res) {
  const settings = await redis.get(SETTINGS_KEY);
  const value = settings?.[key];
  return res.status(200).json({ key, value: value ?? null });
}

// Save single setting
async function saveSetting(key, value, res) {
  const settings = (await redis.get(SETTINGS_KEY)) || {};
  settings[key] = value;
  await redis.set(SETTINGS_KEY, settings);
  console.log('[Settings API] Saved setting:', key);
  return res.status(200).json({ key, value });
}

// Save all settings (merge)
async function saveAllSettings(newSettings, res) {
  const settings = (await redis.get(SETTINGS_KEY)) || {};
  const merged = { ...settings, ...newSettings };
  await redis.set(SETTINGS_KEY, merged);
  console.log('[Settings API] Saved all settings');
  return res.status(200).json(merged);
}

// Vercel Function Config
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
  maxDuration: 10,
};
