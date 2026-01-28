import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  getStoredOwntracksLocations,
  storeOwntracksLocation,
  convertOwntracksToBlocks,
  getLatestOwntracksLocation,
  clearOwntracksLocations,
  type OwntracksPayload,
} from '../services/owntracks';
import { findMatchingZone } from '../utils/locationUtils';
import type { Coordinates, LocationZone } from '../types';

interface OwntracksState {
  isConnected: boolean;
  lastLocation: Coordinates | null;
  lastZone: LocationZone | null;
  lastUpdate: Date | null;
  locationCount: number;
  error: string | null;
}

export function useOwntracks(webhookUrl?: string, pollInterval: number = 30000) {
  const { state, addLocationBlocks } = useApp();
  const { zones, settings } = state;

  const [owntracksState, setOwntracksState] = useState<OwntracksState>({
    isConnected: false,
    lastLocation: null,
    lastZone: null,
    lastUpdate: null,
    locationCount: 0,
    error: null,
  });

  // Fetch locations from webhook endpoint
  const fetchLocations = useCallback(async () => {
    if (!webhookUrl) return;

    try {
      const response = await fetch(webhookUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.locations && Array.isArray(data.locations)) {
        // Store new locations
        for (const loc of data.locations) {
          const payload: OwntracksPayload = {
            _type: 'location',
            lat: loc.lat,
            lon: loc.lon,
            tst: loc.tst,
            acc: loc.acc,
            tid: loc.tid,
          };
          storeOwntracksLocation(payload);
        }

        // Update state
        const latest = getLatestOwntracksLocation();
        if (latest) {
          const coords: Coordinates = { lat: latest.lat, lng: latest.lon };
          const matchingZone = findMatchingZone(coords, zones);

          setOwntracksState({
            isConnected: true,
            lastLocation: coords,
            lastZone: matchingZone,
            lastUpdate: new Date(latest.receivedAt),
            locationCount: data.total || data.locations.length,
            error: null,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch Owntracks locations:', error);
      setOwntracksState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch',
      }));
    }
  }, [webhookUrl, zones]);

  // Poll for new locations
  useEffect(() => {
    if (!webhookUrl || !settings.owntracksEnabled) return;

    // Initial fetch
    fetchLocations();

    // Set up polling
    const intervalId = setInterval(fetchLocations, pollInterval);

    return () => clearInterval(intervalId);
  }, [webhookUrl, pollInterval, fetchLocations, settings.owntracksEnabled]);

  // Update state from local storage on mount
  useEffect(() => {
    const latest = getLatestOwntracksLocation();
    const allLocations = getStoredOwntracksLocations();

    if (latest) {
      const coords: Coordinates = { lat: latest.lat, lng: latest.lon };
      const matchingZone = findMatchingZone(coords, zones);

      setOwntracksState((prev) => ({
        ...prev,
        lastLocation: coords,
        lastZone: matchingZone,
        lastUpdate: new Date(latest.receivedAt),
        locationCount: allLocations.length,
      }));
    }
  }, [zones]);

  // Import stored locations as blocks
  const importAsBlocks = useCallback(() => {
    const locations = getStoredOwntracksLocations();
    const blocks = convertOwntracksToBlocks(locations, zones);

    if (blocks.length > 0) {
      addLocationBlocks(blocks);
      return blocks.length;
    }
    return 0;
  }, [zones, addLocationBlocks]);

  // Clear stored locations
  const clearLocations = useCallback(() => {
    clearOwntracksLocations();
    setOwntracksState((prev) => ({
      ...prev,
      lastLocation: null,
      lastZone: null,
      lastUpdate: null,
      locationCount: 0,
    }));
  }, []);

  // Manual refresh
  const refresh = useCallback(() => {
    fetchLocations();
  }, [fetchLocations]);

  return {
    ...owntracksState,
    importAsBlocks,
    clearLocations,
    refresh,
  };
}
