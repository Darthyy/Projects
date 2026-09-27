/** Geographic helpers. All distances are in metres unless stated otherwise. */

export interface Coords {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_M = 6_371_008.8;

/** Average walking speed in metres per minute (~4.8 km/h). */
const WALKING_SPEED_M_PER_MIN = 80;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Great-circle distance between two points, in metres. */
export function haversineMetres(from: Coords, to: Coords): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** "180 m", "1.2 km", "12 km" — the precision people actually read. */
export function formatDistance(metres: number): string {
  if (!Number.isFinite(metres) || metres < 0) return '—';

  // Round before choosing the unit, so 999 m reads as "1.0 km", not "1000 m".
  const rounded = Math.round(metres / 10) * 10;
  if (rounded < 1000) return `${rounded} m`;
  if (rounded < 10_000) return `${(rounded / 1000).toFixed(1)} km`;
  return `${Math.round(rounded / 1000)} km`;
}

/**
 * Rough walking time. Street distance is always longer than the crow flies, so
 * we pad by 30% rather than quoting an optimistic straight-line number.
 */
export function walkingMinutes(metres: number): number {
  return Math.max(1, Math.round((metres * 1.3) / WALKING_SPEED_M_PER_MIN));
}

export function formatWalkingTime(metres: number): string {
  const minutes = walkingMinutes(metres);
  if (minutes < 60) return `${minutes} min walk`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} h walk`;
}
