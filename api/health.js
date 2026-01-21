// Vercel Serverless Function: GET /api/health
// Health Check Endpoint

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.status(200).json({
    status: 'ok',
    provider: 'openai',
    model: 'gpt-4.1',
    strategy: 'aggressive-retry (5 attempts, exponential backoff)',
    features: ['vision', 'json_mode'],
    environment: 'vercel',
    timestamp: new Date().toISOString(),
  });
}
