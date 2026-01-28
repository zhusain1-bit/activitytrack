// Vercel Serverless Function for receiving Owntracks webhooks
// Deploy to Vercel and configure Owntracks to POST to: https://your-app.vercel.app/api/owntracks

import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory storage (for demo - in production use a database)
// For persistent storage, use Vercel KV, Upstash Redis, or a database
const locations: Array<{
  lat: number;
  lon: number;
  tst: number;
  acc?: number;
  tid?: string;
  receivedAt: number;
}> = [];

// Keep only last 100 locations in memory
const MAX_LOCATIONS = 100;

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST - receive location from Owntracks
  if (req.method === 'POST') {
    try {
      const body = req.body;

      // Validate payload
      if (!body || body._type !== 'location') {
        return res.status(200).json({ _type: 'response', ret: 'ok' });
      }

      if (typeof body.lat !== 'number' || typeof body.lon !== 'number') {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }

      // Store location
      const location = {
        lat: body.lat,
        lon: body.lon,
        tst: body.tst || Math.floor(Date.now() / 1000),
        acc: body.acc,
        tid: body.tid,
        receivedAt: Date.now(),
      };

      locations.push(location);

      // Trim to max size
      if (locations.length > MAX_LOCATIONS) {
        locations.splice(0, locations.length - MAX_LOCATIONS);
      }

      console.log(`Received location: ${body.lat}, ${body.lon}`);

      // Owntracks expects this response format
      return res.status(200).json({ _type: 'response', ret: 'ok' });
    } catch (error) {
      console.error('Error processing Owntracks payload:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET - retrieve stored locations
  if (req.method === 'GET') {
    const { since, limit } = req.query;

    let result = [...locations];

    // Filter by timestamp if provided
    if (since) {
      const sinceTime = parseInt(since as string, 10);
      if (!isNaN(sinceTime)) {
        result = result.filter((loc) => loc.tst > sinceTime);
      }
    }

    // Limit results
    const limitNum = parseInt(limit as string, 10) || 100;
    result = result.slice(-limitNum);

    return res.status(200).json({
      locations: result,
      count: result.length,
      total: locations.length,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
