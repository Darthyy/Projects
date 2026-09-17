import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { Coords } from '../lib/geo';

export type LocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'error';

export interface LocationState {
  status: LocationStatus;
  coords: Coords | null;
  error: string | null;
  refresh: () => void;
}

/**
 * Asks for the device's position once, and again on demand. The whole app is
 * "what is near me right now", so a stale fix is worse than a slow one — but we
 * show the last known position first so the list is never empty while waiting.
 */
export function useLocation(): LocationState {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function locate() {
      setStatus('locating');
      setError(null);

      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;

        if (!permission.granted) {
          setStatus('denied');
          return;
        }

        // Show something immediately where the OS already has a recent fix.
        const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
        if (cancelled) return;
        if (lastKnown) {
          setCoords(lastKnown.coords);
          setStatus('ready');
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;

        setCoords(current.coords);
        setStatus('ready');
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Could not work out where you are.');
        setStatus('error');
      }
    }

    void locate();

    return () => {
      cancelled = true;
    };
  }, [nonce]);

  return { status, coords, error, refresh };
}
