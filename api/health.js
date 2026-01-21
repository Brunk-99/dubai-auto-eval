// Vercel Serverless Function: GET /api/health
// Health Check Endpoint

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.status(200).json({
    status: 'ok',
    project: process.env.VERTEX_PROJECT || 'dubai-car-check',
    models: ['gemini-3-pro-preview', 'gemini-2.5-pro', 'gemini-1.5-pro-002'],
    endpoint: 'v1beta1',
    environment: 'vercel',
    timestamp: new Date().toISOString(),
  });
}
