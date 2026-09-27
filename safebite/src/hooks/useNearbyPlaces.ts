import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchNearbyPlaces } from '../data/overpass';
import type { Place } from '../data/types';
import type { Coords } from '../lib/geo';
import { haversineMetres } from '../lib/geo';

export type PlacesStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface NearbyPlacesState {
  places: Place[];
  status: PlacesStatus;
  error: string | null;
  reload: () => void;
}

/** Re-query only once the user has actually moved a useful distance. */
const REFETCH_DISTANCE_M = 250;

export function useNearbyPlaces(coords: Coords | null, radiusMetres: number): NearbyPlacesState {
  const [places, setPlaces] = useState<Place[]>([]);
  const [status, setStatus] = useState<PlacesStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // The query anchor, so small GPS jitter does not hammer the API.
  const anchor = useRef<{ coords: Coords; radiusMetres: number } | null>(null);

  const reload = useCallback(() => {
    anchor.current = null;
    setNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!coords) return;

    const previous = anchor.current;
    const moved = previous ? haversineMetres(previous.coords, coords) : Infinity;
    if (previous && previous.radiusMetres === radiusMetres && moved < REFETCH_DISTANCE_M) {
      return;
    }

    anchor.current = { coords, radiusMetres };

    const controller = new AbortController();
    let cancelled = false;

    setStatus('loading');
    setError(null);

    fetchNearbyPlaces({
      latitude: coords.latitude,
      longitude: coords.longitude,
      radiusMetres,
      signal: controller.signal,
    })
      .then((result) => {
        if (cancelled) return;
        setPlaces(result);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        // Let the previous results stand rather than blanking the screen.
        anchor.current = null;
        setError(cause instanceof Error ? cause.message : 'Something went wrong.');
        setStatus('error');
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [coords, radiusMetres, nonce]);

  return { places, status, error, reload };
}
