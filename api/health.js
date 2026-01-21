// Vercel Serverless Function: GET /api/health
// Health Check Endpoint

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.status(200).json({
    status: 'ok',
    project: process.env.VERTEX_PROJECT || 'dubai-car-check',
    model: 'gemini-3.0-pro',
    environment: 'vercel',
    timestamp: new Date().toISOString(),
  });
}
