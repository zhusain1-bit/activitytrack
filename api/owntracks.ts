// Simple file-based storage for Owntracks locations
// This works with Vercel's /tmp directory for short-term storage
// For production, use Vercel KV, Upstash Redis, or a database

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { promises as fs } from 'fs';
import path from 'path';

const STORAGE_FILE = '/tmp/owntracks-locations.json';

interface StoredLocation {
  lat: number;
  lon: number;
  tst: number;
  acc?: number;
  tid?: string;
  receivedAt: number;
}

async function readLocations(): Promise<StoredLocation[]> {
  try {
    const data = await fs.readFile(STORAGE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeLocations(locations: StoredLocation[]): Promise<void> {
  await fs.writeFile(STORAGE_FILE, JSON.stringify(locations));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Limit-U, X-Limit-D');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST - receive location from Owntracks
  if (req.method === 'POST') {
    try {
      const body = req.body;
      console.log('Received Owntracks payload:', JSON.stringify(body));

      // Owntracks can send different message types
      if (!body || body._type !== 'location') {
        // Acknowledge non-location messages
        return res.status(200).json([]);
      }

      if (typeof body.lat !== 'number' || typeof body.lon !== 'number') {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }

      // Read existing locations
      const locations = await readLocations();

      // Add new location
      const newLocation: StoredLocation = {
        lat: body.lat,
        lon: body.lon,
        tst: body.tst || Math.floor(Date.now() / 1000),
        acc: body.acc,
        tid: body.tid,
        receivedAt: Date.now(),
      };

      locations.push(newLocation);

      // Keep only last 500 locations
      const trimmed = locations.slice(-500);
      await writeLocations(trimmed);

      console.log(`Stored location: ${body.lat}, ${body.lon}. Total: ${trimmed.length}`);

      // Owntracks expects an empty array response for HTTP mode
      return res.status(200).json([]);
    } catch (error) {
      console.error('Error processing Owntracks payload:', error);
      return res.status(200).json([]);
    }
  }

  // GET - retrieve stored locations
  if (req.method === 'GET') {
    try {
      const { since, limit } = req.query;
      let locations = await readLocations();

      // Filter by timestamp if provided
      if (since) {
        const sinceTime = parseInt(since as string, 10);
        if (!isNaN(sinceTime)) {
          locations = locations.filter((loc) => loc.tst > sinceTime);
        }
      }

      // Limit results
      const limitNum = parseInt(limit as string, 10) || 500;
      const result = locations.slice(-limitNum);

      return res.status(200).json({
        locations: result,
        count: result.length,
        lastUpdate: result.length > 0 ? result[result.length - 1].receivedAt : null,
      });
    } catch (error) {
      console.error('Error reading locations:', error);
      return res.status(200).json({ locations: [], count: 0 });
    }
  }

  // DELETE - clear all locations
  if (req.method === 'DELETE') {
    try {
      await writeLocations([]);
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to clear' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
