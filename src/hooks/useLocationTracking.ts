import { useEffect, useRef, useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp } from '../context/AppContext';
import { findMatchingZone } from '../utils/locationUtils';
import type { Coordinates, LocationBlock, LocationZone } from '../types';

interface LocationTrackingState {
  isTracking: boolean;
  currentLocation: Coordinates | null;
  currentZone: LocationZone | null;
  error: string | null;
  lastUpdate: Date | null;
}

export function useLocationTracking() {
  const { state, addLocationBlocks, updateLocationBlock } = useApp();
  const { zones, settings, locationBlocks } = state;

  const [trackingState, setTrackingState] = useState<LocationTrackingState>({
    isTracking: false,
    currentLocation: null,
    currentZone: null,
    error: null,
    lastUpdate: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const currentBlockRef = useRef<LocationBlock | null>(null);
  const lastZoneRef = useRef<LocationZone | null>(null);

  // Find or create an active block for the current zone
  const handleLocationUpdate = useCallback((position: GeolocationPosition) => {
    const coords: Coordinates = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };

    const matchingZone = findMatchingZone(coords, zones);
    const now = new Date();

    setTrackingState(prev => ({
      ...prev,
      currentLocation: coords,
      currentZone: matchingZone,
      lastUpdate: now,
      error: null,
    }));

    // Check if we've entered a new zone
    if (matchingZone?.id !== lastZoneRef.current?.id) {
      // Close the previous block if there was one
      if (currentBlockRef.current) {
        const updatedBlock: LocationBlock = {
          ...currentBlockRef.current,
          endTime: now.toISOString(),
        };
        updateLocationBlock(updatedBlock);
        currentBlockRef.current = null;
      }

      // Start a new block if we're in a zone
      if (matchingZone) {
        const newBlock: LocationBlock = {
          id: uuidv4(),
          location: matchingZone.name,
          zoneId: matchingZone.id,
          category: matchingZone.category,
          startTime: now.toISOString(),
          endTime: now.toISOString(), // Will be updated continuously
          coordinates: coords,
          synced: false,
        };
        addLocationBlocks([newBlock]);
        currentBlockRef.current = newBlock;
      }

      lastZoneRef.current = matchingZone;
    } else if (currentBlockRef.current) {
      // Update the end time of the current block
      const updatedBlock: LocationBlock = {
        ...currentBlockRef.current,
        endTime: now.toISOString(),
        coordinates: coords,
      };
      updateLocationBlock(updatedBlock);
      currentBlockRef.current = updatedBlock;
    }
  }, [zones, addLocationBlocks, updateLocationBlock]);

  const handleLocationError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = 'Unknown error';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location unavailable';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out';
        break;
    }
    setTrackingState(prev => ({
      ...prev,
      error: errorMessage,
    }));
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setTrackingState(prev => ({
        ...prev,
        error: 'Geolocation not supported by your browser',
      }));
      return;
    }

    if (watchIdRef.current !== null) {
      return; // Already tracking
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000, // Cache position for 30 seconds
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleLocationUpdate,
      handleLocationError,
      options
    );

    setTrackingState(prev => ({
      ...prev,
      isTracking: true,
      error: null,
    }));
  }, [handleLocationUpdate, handleLocationError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Close any open block
    if (currentBlockRef.current) {
      const updatedBlock: LocationBlock = {
        ...currentBlockRef.current,
        endTime: new Date().toISOString(),
      };
      updateLocationBlock(updatedBlock);
      currentBlockRef.current = null;
    }

    lastZoneRef.current = null;

    setTrackingState(prev => ({
      ...prev,
      isTracking: false,
    }));
  }, [updateLocationBlock]);

  // Get current position once (for manual refresh)
  const refreshLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setTrackingState(prev => ({
        ...prev,
        error: 'Geolocation not supported',
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      handleLocationUpdate,
      handleLocationError,
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [handleLocationUpdate, handleLocationError]);

  // Auto-start tracking if enabled in settings
  useEffect(() => {
    if (settings.autoLocationTracking && !trackingState.isTracking) {
      startTracking();
    } else if (!settings.autoLocationTracking && trackingState.isTracking) {
      stopTracking();
    }
  }, [settings.autoLocationTracking, trackingState.isTracking, startTracking, stopTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    ...trackingState,
    startTracking,
    stopTracking,
    refreshLocation,
  };
}
