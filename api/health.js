// Vercel Serverless Function: GET /api/health
// Health Check Endpoint

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.status(200).json({
    status: 'ok',
    project: process.env.VERTEX_PROJECT || 'dubai-car-check',
    models: ['gemini-2.5-pro-001', 'gemini-1.5-pro-002'],
    strategy: 'pro-switch + aggressive-retry (5 attempts per model)',
    endpoint: 'v1beta1',
    environment: 'vercel',
    timestamp: new Date().toISOString(),
  });
}
