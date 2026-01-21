// Vercel Serverless Function: GET /api/health
// Health Check Endpoint

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.status(200).json({
    status: 'ok',
    project: process.env.VERTEX_PROJECT || 'dubai-car-check',
    model: 'gemini-3-pro-preview',
    strategy: 'aggressive-retry (5 attempts, exponential backoff)',
    endpoint: 'v1beta1',
    environment: 'vercel',
    timestamp: new Date().toISOString(),
  });
}
