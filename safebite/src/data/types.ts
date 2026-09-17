export type OsmElementType = 'node' | 'way' | 'relation';

export type PlaceCategory =
  | 'restaurant'
  | 'cafe'
  | 'fast_food'
  | 'pub'
  | 'bar'
  | 'bakery'
  | 'ice_cream'
  | 'deli'
  | 'food_court'
  | 'other';

export const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  fast_food: 'Fast food',
  pub: 'Pub',
  bar: 'Bar',
  bakery: 'Bakery',
  ice_cream: 'Ice cream',
  deli: 'Deli',
  food_court: 'Food court',
  other: 'Food',
};

/** A single eating place, normalised out of an OpenStreetMap element. */
export interface Place {
  /** Stable across refreshes: `node/12345`. */
  id: string;
  osmType: OsmElementType;
  osmId: number;
  name: string;
  latitude: number;
  longitude: number;
  category: PlaceCategory;
  /** Normalised `cuisine` values, e.g. `['italian', 'pizza']`. */
  cuisines: string[];
  /** Raw OSM tags, kept so the matcher can read anything it needs. */
  tags: Record<string, string>;
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
}
