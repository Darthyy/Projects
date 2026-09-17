import { haversineMetres, type Coords } from '../lib/geo';
import { isOpenNow, type OpenState } from '../lib/hours';
import { matchPlace, VERDICT_RANK, type PlaceMatch } from '../diet/match';
import type { DietId } from '../diet/diets';
import type { Place } from './types';

export type SortMode = 'match' | 'distance';

/** A place with everything the list needs already worked out. */
export interface RankedPlace {
  place: Place;
  distanceMetres: number;
  match: PlaceMatch;
  openState: OpenState;
}

export interface RankOptions {
  origin: Coords;
  diets: DietId[];
  sort: SortMode;
  /** Drop places explicitly tagged as not catering for a requirement. */
  hideUnsuitable: boolean;
  /** Drop places we know to be closed right now (never those with no hours). */
  openNowOnly: boolean;
  now?: Date;
}

/**
 * Turn raw places into the ordered list people see. Everything the UI sorts or
 * filters on is computed once here, so scrolling stays cheap.
 */
export function rankPlaces(places: Place[], options: RankOptions): RankedPlace[] {
  const { origin, diets, sort, hideUnsuitable, openNowOnly, now = new Date() } = options;

  const ranked = places.map<RankedPlace>((place) => ({
    place,
    distanceMetres: haversineMetres(origin, {
      latitude: place.latitude,
      longitude: place.longitude,
    }),
    match: matchPlace(place, diets),
    openState: isOpenNow(place.openingHours, now),
  }));

  const filtered = ranked.filter((entry) => {
    if (hideUnsuitable && entry.match.verdict === 'unsuitable') return false;
    // `null` means the hours are unknown — that is not a reason to hide a place.
    if (openNowOnly && entry.openState === false) return false;
    return true;
  });

  return filtered.sort((a, b) => {
    if (sort === 'match') {
      const byVerdict = VERDICT_RANK[b.match.verdict] - VERDICT_RANK[a.match.verdict];
      if (byVerdict !== 0) return byVerdict;

      // Among equally suitable places, an open one beats one that is shut.
      const openScore = (entry: RankedPlace) => (entry.openState === true ? 1 : 0);
      const byOpen = openScore(b) - openScore(a);
      if (byOpen !== 0) return byOpen;
    }

    return a.distanceMetres - b.distanceMetres;
  });
}
