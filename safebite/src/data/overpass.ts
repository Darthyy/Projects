import type { Place, PlaceCategory, OsmElementType } from './types';

/**
 * Nearby places come from the OpenStreetMap Overpass API: free, no API key,
 * and — unusually — it carries structured `diet:*` tags, which is the whole
 * reason this app can answer "can I eat there?" rather than just "is it near?".
 */

/** Public instances, tried in order. They rate-limit, so failover matters. */
export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const MAX_RESULTS = 250;
const REQUEST_TIMEOUT_MS = 20_000;

const AMENITY_CATEGORIES: Record<string, PlaceCategory> = {
  restaurant: 'restaurant',
  cafe: 'cafe',
  fast_food: 'fast_food',
  pub: 'pub',
  bar: 'bar',
  biergarten: 'bar',
  ice_cream: 'ice_cream',
  food_court: 'food_court',
};

const SHOP_CATEGORIES: Record<string, PlaceCategory> = {
  bakery: 'bakery',
  deli: 'deli',
  health_food: 'deli',
};

export interface OverpassQueryOptions {
  latitude: number;
  longitude: number;
  radiusMetres: number;
}

export function buildOverpassQuery({
  latitude,
  longitude,
  radiusMetres,
}: OverpassQueryOptions): string {
  const amenities = Object.keys(AMENITY_CATEGORIES).join('|');
  const shops = Object.keys(SHOP_CATEGORIES).join('|');
  const around = `around:${Math.round(radiusMetres)},${latitude.toFixed(6)},${longitude.toFixed(6)}`;

  // `nwr` covers nodes, ways and relations; `out center` gives ways a single
  // coordinate so everything can be treated as a point.
  return [
    '[out:json][timeout:25];',
    '(',
    `  nwr["amenity"~"^(${amenities})$"](${around});`,
    `  nwr["shop"~"^(${shops})$"](${around});`,
    ');',
    `out center ${MAX_RESULTS};`,
  ].join('\n');
}

interface OverpassElement {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function categoryOf(tags: Record<string, string>): PlaceCategory {
  return AMENITY_CATEGORIES[tags.amenity] ?? SHOP_CATEGORIES[tags.shop] ?? 'other';
}

function addressOf(tags: Record<string, string>): string | undefined {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const parts = [street, tags['addr:city'], tags['addr:postcode']].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : undefined;
}

function cuisinesOf(tags: Record<string, string>): string[] {
  return (tags.cuisine ?? '')
    .split(';')
    .map((value) => value.trim().toLowerCase().replace(/\s+/g, '_'))
    .filter(Boolean);
}

export function parseOverpassResponse(payload: unknown): Place[] {
  const elements = (payload as { elements?: OverpassElement[] })?.elements;
  if (!Array.isArray(elements)) return [];

  const places: Place[] = [];
  const seen = new Set<string>();

  for (const element of elements) {
    const tags = element.tags;
    const name = tags?.name?.trim();

    // An unnamed point is no use to someone deciding where to walk.
    if (!tags || !name) continue;

    const latitude = element.lat ?? element.center?.lat;
    const longitude = element.lon ?? element.center?.lon;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') continue;

    const osmType = (element.type ?? 'node') as OsmElementType;
    const osmId = element.id;
    if (typeof osmId !== 'number') continue;

    const id = `${osmType}/${osmId}`;
    if (seen.has(id)) continue;
    seen.add(id);

    places.push({
      id,
      osmType,
      osmId,
      name,
      latitude,
      longitude,
      category: categoryOf(tags),
      cuisines: cuisinesOf(tags),
      tags,
      address: addressOf(tags),
      phone: tags.phone ?? tags['contact:phone'],
      website: tags.website ?? tags['contact:website'],
      openingHours: tags.opening_hours,
    });
  }

  return places;
}

export class OverpassError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'OverpassError';
  }
}

async function postQuery(endpoint: string, query: string, signal?: AbortSignal): Promise<unknown> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS);

  const onAbort = () => timeout.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: timeout.signal,
    });

    if (!response.ok) {
      throw new OverpassError(`${endpoint} responded ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

export interface FetchNearbyOptions extends OverpassQueryOptions {
  signal?: AbortSignal;
  endpoints?: string[];
}

/** Fetch every food venue within the radius, trying each mirror in turn. */
export async function fetchNearbyPlaces({
  endpoints = OVERPASS_ENDPOINTS,
  signal,
  ...query
}: FetchNearbyOptions): Promise<Place[]> {
  const body = buildOverpassQuery(query);
  let lastError: unknown;

  for (const endpoint of endpoints) {
    if (signal?.aborted) throw new OverpassError('Search cancelled');

    try {
      return parseOverpassResponse(await postQuery(endpoint, body, signal));
    } catch (error) {
      if (signal?.aborted) throw new OverpassError('Search cancelled');
      lastError = error;
    }
  }

  throw new OverpassError(
    'Could not reach the OpenStreetMap servers. Check your connection and try again.',
    lastError,
  );
}
