import { v4 as uuidv4 } from 'uuid';
import type { Coordinates, LocationBlock, LocationZone } from '../types';
import { findMatchingZone } from '../utils/locationUtils';

// Owntracks HTTP payload format
export interface OwntracksPayload {
  _type: 'location' | 'transition' | 'waypoint' | 'lwt';
  acc?: number; // accuracy in meters
  alt?: number; // altitude
  batt?: number; // battery percentage
  bs?: number; // battery status
  conn?: string; // connection type
  lat: number;
  lon: number;
  t?: string; // trigger type
  tid?: string; // tracker ID
  tst: number; // timestamp (unix)
  vac?: number; // vertical accuracy
  vel?: number; // velocity
}

// Storage key for Owntracks data
const OWNTRACKS_STORAGE_KEY = 'activitytrack_owntracks';
const OWNTRACKS_SECRET_KEY = 'activitytrack_owntracks_secret';

// Generate a unique webhook secret
export function generateWebhookSecret(): string {
  return uuidv4().replace(/-/g, '');
}

// Get or create webhook secret
export function getWebhookSecret(): string {
  let secret = localStorage.getItem(OWNTRACKS_SECRET_KEY);
  if (!secret) {
    secret = generateWebhookSecret();
    localStorage.setItem(OWNTRACKS_SECRET_KEY, secret);
  }
  return secret;
}

// Store incoming location from Owntracks
export function storeOwntracksLocation(payload: OwntracksPayload): void {
  const locations = getStoredOwntracksLocations();
  locations.push({
    ...payload,
    receivedAt: Date.now(),
  });

  // Keep only last 1000 locations
  if (locations.length > 1000) {
    locations.splice(0, locations.length - 1000);
  }

  localStorage.setItem(OWNTRACKS_STORAGE_KEY, JSON.stringify(locations));
}

// Get stored Owntracks locations
export function getStoredOwntracksLocations(): (OwntracksPayload & { receivedAt: number })[] {
  const stored = localStorage.getItem(OWNTRACKS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

// Clear stored Owntracks locations
export function clearOwntracksLocations(): void {
  localStorage.removeItem(OWNTRACKS_STORAGE_KEY);
}

// Convert Owntracks locations to LocationBlocks
export function convertOwntracksToBlocks(
  locations: (OwntracksPayload & { receivedAt: number })[],
  zones: LocationZone[],
  minDurationMinutes: number = 5
): LocationBlock[] {
  if (locations.length === 0) return [];

  // Sort by timestamp
  const sorted = [...locations].sort((a, b) => a.tst - b.tst);

  const blocks: LocationBlock[] = [];
  let currentBlock: {
    zone: LocationZone | null;
    coords: Coordinates;
    startTime: number;
    endTime: number;
  } | null = null;

  for (const loc of sorted) {
    if (loc._type !== 'location') continue;

    const coords: Coordinates = { lat: loc.lat, lng: loc.lon };
    const matchingZone = findMatchingZone(coords, zones);
    const timestamp = loc.tst * 1000; // Convert to milliseconds

    if (!currentBlock) {
      // Start new block
      currentBlock = {
        zone: matchingZone,
        coords,
        startTime: timestamp,
        endTime: timestamp,
      };
    } else if (matchingZone?.id === currentBlock.zone?.id) {
      // Same zone, extend block
      currentBlock.endTime = timestamp;
      currentBlock.coords = coords;
    } else {
      // Zone changed, close current block and start new one
      const durationMinutes = (currentBlock.endTime - currentBlock.startTime) / 60000;

      if (durationMinutes >= minDurationMinutes || currentBlock.zone) {
        blocks.push(createBlockFromOwntracks(currentBlock));
      }

      currentBlock = {
        zone: matchingZone,
        coords,
        startTime: timestamp,
        endTime: timestamp,
      };
    }
  }

  // Don't forget the last block
  if (currentBlock) {
    const durationMinutes = (currentBlock.endTime - currentBlock.startTime) / 60000;
    if (durationMinutes >= minDurationMinutes || currentBlock.zone) {
      blocks.push(createBlockFromOwntracks(currentBlock));
    }
  }

  return blocks;
}

function createBlockFromOwntracks(block: {
  zone: LocationZone | null;
  coords: Coordinates;
  startTime: number;
  endTime: number;
}): LocationBlock {
  return {
    id: uuidv4(),
    location: block.zone?.name || 'Unknown Location',
    zoneId: block.zone?.id,
    category: block.zone?.category || 'Other',
    startTime: new Date(block.startTime).toISOString(),
    endTime: new Date(block.endTime).toISOString(),
    coordinates: block.coords,
    synced: false,
  };
}

// Get webhook URL for Owntracks configuration
export function getOwntracksWebhookUrl(baseUrl: string, secret: string): string {
  return `${baseUrl}/api/owntracks?secret=${secret}`;
}

// Validate webhook secret
export function validateWebhookSecret(providedSecret: string): boolean {
  const storedSecret = localStorage.getItem(OWNTRACKS_SECRET_KEY);
  return storedSecret === providedSecret;
}

// Parse Owntracks payload from request
export function parseOwntracksPayload(body: unknown): OwntracksPayload | null {
  if (!body || typeof body !== 'object') return null;

  const payload = body as Record<string, unknown>;

  if (payload._type !== 'location') return null;
  if (typeof payload.lat !== 'number' || typeof payload.lon !== 'number') return null;
  if (typeof payload.tst !== 'number') return null;

  return {
    _type: 'location',
    lat: payload.lat,
    lon: payload.lon,
    tst: payload.tst,
    acc: typeof payload.acc === 'number' ? payload.acc : undefined,
    alt: typeof payload.alt === 'number' ? payload.alt : undefined,
    batt: typeof payload.batt === 'number' ? payload.batt : undefined,
    tid: typeof payload.tid === 'string' ? payload.tid : undefined,
    vel: typeof payload.vel === 'number' ? payload.vel : undefined,
  };
}

// Get latest location from stored Owntracks data
export function getLatestOwntracksLocation(): (OwntracksPayload & { receivedAt: number }) | null {
  const locations = getStoredOwntracksLocations();
  if (locations.length === 0) return null;
  return locations[locations.length - 1];
}

// Manually add location (for testing or manual entry)
export function addManualLocation(lat: number, lon: number): void {
  const payload: OwntracksPayload = {
    _type: 'location',
    lat,
    lon,
    tst: Math.floor(Date.now() / 1000),
  };
  storeOwntracksLocation(payload);
}
