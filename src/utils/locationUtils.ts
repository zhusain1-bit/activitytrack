import { Coordinates, LocationZone, GoogleTimelineData, GoogleTimelinePlaceVisit, GoogleTimelineActivitySegment, LocationBlock, LocationCategory } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Haversine formula to calculate distance between two coordinates
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371e3; // Earth's radius in meters
  const lat1Rad = (coord1.lat * Math.PI) / 180;
  const lat2Rad = (coord2.lat * Math.PI) / 180;
  const deltaLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const deltaLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Check if coordinates are within a zone
export function isWithinZone(coords: Coordinates, zone: LocationZone): boolean {
  const distance = calculateDistance(coords, zone.coordinates);
  return distance <= zone.radius;
}

// Find matching zone for coordinates
export function findMatchingZone(coords: Coordinates, zones: LocationZone[]): LocationZone | null {
  for (const zone of zones) {
    if (isWithinZone(coords, zone)) {
      return zone;
    }
  }
  return null;
}

// Convert Google Timeline E7 coordinates to regular lat/lng
export function convertE7Coordinates(latE7: number, lngE7: number): Coordinates {
  return {
    lat: latE7 / 1e7,
    lng: lngE7 / 1e7,
  };
}

// Parse Google Timeline JSON export
export function parseGoogleTimeline(
  data: GoogleTimelineData,
  zones: LocationZone[]
): LocationBlock[] {
  const blocks: LocationBlock[] = [];

  if (!data.timelineObjects || !Array.isArray(data.timelineObjects)) {
    console.error('Invalid Google Timeline data format');
    return blocks;
  }

  for (const obj of data.timelineObjects) {
    if (obj.placeVisit) {
      const block = parsePlaceVisit(obj.placeVisit, zones);
      if (block) {
        blocks.push(block);
      }
    } else if (obj.activitySegment) {
      const block = parseActivitySegment(obj.activitySegment, zones);
      if (block) {
        blocks.push(block);
      }
    }
  }

  // Sort by start time
  blocks.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return blocks;
}

function parsePlaceVisit(visit: GoogleTimelinePlaceVisit, zones: LocationZone[]): LocationBlock | null {
  try {
    const coords = convertE7Coordinates(
      visit.location.latitudeE7,
      visit.location.longitudeE7
    );

    const matchingZone = findMatchingZone(coords, zones);
    const locationName = matchingZone?.name || visit.location.name || visit.location.address || 'Unknown Location';
    const category: LocationCategory = matchingZone?.category || 'Other';

    return {
      id: uuidv4(),
      location: locationName,
      zoneId: matchingZone?.id,
      category,
      startTime: visit.duration.startTimestamp,
      endTime: visit.duration.endTimestamp,
      coordinates: coords,
      synced: false,
    };
  } catch (error) {
    console.error('Error parsing place visit:', error);
    return null;
  }
}

function parseActivitySegment(
  segment: GoogleTimelineActivitySegment,
  zones: LocationZone[]
): LocationBlock | null {
  try {
    // Activity segments are typically commutes
    const activityType = segment.activityType || 'UNKNOWN';

    // Check if it's a commute activity
    const commuteActivities = ['IN_VEHICLE', 'IN_BUS', 'IN_TRAIN', 'IN_SUBWAY', 'IN_TRAM', 'DRIVING', 'CYCLING', 'WALKING'];
    const isCommute = commuteActivities.includes(activityType);

    let coords: Coordinates | undefined;
    if (segment.startLocation) {
      coords = convertE7Coordinates(
        segment.startLocation.latitudeE7,
        segment.startLocation.longitudeE7
      );
    }

    const matchingZone = coords ? findMatchingZone(coords, zones) : null;

    return {
      id: uuidv4(),
      location: isCommute ? 'Commute' : activityType.replace(/_/g, ' ').toLowerCase(),
      zoneId: matchingZone?.id,
      category: isCommute ? 'Commute' : (matchingZone?.category || 'Other'),
      startTime: segment.duration.startTimestamp,
      endTime: segment.duration.endTimestamp,
      coordinates: coords,
      synced: false,
    };
  } catch (error) {
    console.error('Error parsing activity segment:', error);
    return null;
  }
}

// Validate and merge overlapping blocks
export function mergeOverlappingBlocks(blocks: LocationBlock[]): LocationBlock[] {
  if (blocks.length <= 1) return blocks;

  const sorted = [...blocks].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const merged: LocationBlock[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    const lastEnd = new Date(last.endTime).getTime();
    const currentStart = new Date(current.startTime).getTime();

    if (currentStart <= lastEnd) {
      // Overlapping - extend the previous block if same location
      if (current.location === last.location) {
        const currentEnd = new Date(current.endTime).getTime();
        if (currentEnd > lastEnd) {
          last.endTime = current.endTime;
        }
      } else {
        // Different locations - adjust start time of current
        current.startTime = last.endTime;
        if (new Date(current.startTime).getTime() < new Date(current.endTime).getTime()) {
          merged.push(current);
        }
      }
    } else {
      merged.push(current);
    }
  }

  return merged;
}

// Create commute blocks between location blocks
export function addCommuteBlocks(blocks: LocationBlock[], minGapMinutes: number = 5): LocationBlock[] {
  if (blocks.length <= 1) return blocks;

  const sorted = [...blocks].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const result: LocationBlock[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const prevEnd = new Date(sorted[i - 1].endTime).getTime();
      const currentStart = new Date(sorted[i].startTime).getTime();
      const gapMinutes = (currentStart - prevEnd) / (1000 * 60);

      if (gapMinutes >= minGapMinutes && sorted[i - 1].category !== 'Commute') {
        // Add commute block
        result.push({
          id: uuidv4(),
          location: 'Commute',
          category: 'Commute',
          startTime: sorted[i - 1].endTime,
          endTime: sorted[i].startTime,
          synced: false,
        });
      }
    }
    result.push(sorted[i]);
  }

  return result;
}

// Filter blocks by date range
export function filterBlocksByDateRange(
  blocks: LocationBlock[],
  start: Date,
  end: Date
): LocationBlock[] {
  const startTime = start.getTime();
  const endTime = end.getTime();

  return blocks.filter((block) => {
    const blockStart = new Date(block.startTime).getTime();
    const blockEnd = new Date(block.endTime).getTime();
    return blockEnd >= startTime && blockStart <= endTime;
  });
}

// Get blocks for a specific day
export function getBlocksForDate(blocks: LocationBlock[], date: Date): LocationBlock[] {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return filterBlocksByDateRange(blocks, dayStart, dayEnd);
}

// Get current location based on active block
export function getCurrentLocation(blocks: LocationBlock[]): LocationBlock | null {
  const now = new Date().getTime();

  for (const block of blocks) {
    const start = new Date(block.startTime).getTime();
    const end = new Date(block.endTime).getTime();

    if (now >= start && now <= end) {
      return block;
    }
  }

  return null;
}

// Format coordinates for display
export function formatCoordinates(coords: Coordinates): string {
  return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
}

// Generate a Google Maps link
export function getGoogleMapsLink(coords: Coordinates): string {
  return `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
}
