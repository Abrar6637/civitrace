import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { GeoPoint } from '@civitrace/shared';

export type PositionState = { state: 'locating' | 'found' | 'denied' | 'error'; point?: GeoPoint };

// Asks for permission and reads the current GPS position once (and again on retry)
export function useCurrentPosition() {
  const [position, setPosition] = useState<PositionState>({ state: 'locating' });

  const locate = useCallback(async () => {
    setPosition({ state: 'locating' });
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setPosition({ state: 'denied' });
      return;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const accuracy = pos.coords.accuracy;
      setPosition({
        state: 'found',
        point: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          ...(accuracy != null ? { accuracyM: Math.round(accuracy) } : {}),
        },
      });
    } catch {
      setPosition({ state: 'error' });
    }
  }, []);

  useEffect(() => {
    void locate();
  }, [locate]);

  return { ...position, retry: locate };
}