/** The dietary requirements the app can filter on, and what OSM knows about each. */

export type DietId =
  | 'vegan'
  | 'vegetarian'
  | 'gluten_free'
  | 'halal'
  | 'kosher'
  | 'lactose_free'
  | 'nut_free';

/**
 * `allergy` requirements are the ones where being wrong hurts someone, so the
 * UI always tells people to confirm with staff — however good the tagging is.
 */
export type DietKind = 'lifestyle' | 'religious' | 'allergy';

export interface Diet {
  id: DietId;
  label: string;
  emoji: string;
  description: string;
  kind: DietKind;
  /**
   * Suffix of the OpenStreetMap `diet:*` key that records this requirement,
   * or `null` where the community has no agreed tag for it.
   */
  osmKey: string | null;
  /** Cuisines that usually cater well for this diet. */
  friendlyCuisines: string[];
  /** Cuisines that rarely do. */
  unfriendlyCuisines: string[];
  /** Shown whenever this diet is part of a result. */
  safetyNote?: string;
}

export const DIETS: Diet[] = [
  {
    id: 'vegan',
    label: 'Vegan',
    emoji: '🌱',
    description: 'No animal products at all.',
    kind: 'lifestyle',
    osmKey: 'vegan',
    friendlyCuisines: [
      'vegan', 'vegetarian', 'indian', 'ethiopian', 'falafel', 'salad',
      'juice', 'buddhist', 'lebanese', 'thai', 'vietnamese', 'middle_eastern',
    ],
    unfriendlyCuisines: ['steak_house', 'barbecue', 'seafood', 'fish', 'chicken', 'kebab'],
  },
  {
    id: 'vegetarian',
    label: 'Vegetarian',
    emoji: '🥗',
    description: 'No meat or fish.',
    kind: 'lifestyle',
    osmKey: 'vegetarian',
    friendlyCuisines: [
      'vegetarian', 'vegan', 'indian', 'ethiopian', 'falafel', 'pizza',
      'italian', 'thai', 'lebanese', 'mexican', 'salad', 'middle_eastern',
    ],
    unfriendlyCuisines: ['steak_house', 'barbecue', 'seafood', 'fish', 'chicken'],
  },
  {
    id: 'gluten_free',
    label: 'Gluten free',
    emoji: '🌾',
    description: 'Coeliac-safe options, no wheat, barley or rye.',
    kind: 'allergy',
    osmKey: 'gluten_free',
    friendlyCuisines: ['mexican', 'indian', 'thai', 'vietnamese', 'salad', 'grill'],
    unfriendlyCuisines: ['pizza', 'pasta', 'bakery', 'sandwich', 'noodle', 'ramen', 'crepe'],
    safetyNote:
      'Cross-contamination is invisible in map data. Always tell staff it is coeliac, not a preference.',
  },
  {
    id: 'halal',
    label: 'Halal',
    emoji: '🕌',
    description: 'Prepared according to Islamic dietary law.',
    kind: 'religious',
    osmKey: 'halal',
    friendlyCuisines: [
      'turkish', 'lebanese', 'pakistani', 'persian', 'arab', 'afghan',
      'indonesian', 'malaysian', 'kebab', 'moroccan', 'somali', 'bangladeshi',
    ],
    unfriendlyCuisines: ['pork', 'german', 'barbecue'],
    safetyNote: 'Certification is rarely recorded in map data — check for a certificate on site.',
  },
  {
    id: 'kosher',
    label: 'Kosher',
    emoji: '✡️',
    description: 'Prepared according to Jewish dietary law.',
    kind: 'religious',
    osmKey: 'kosher',
    friendlyCuisines: ['kosher', 'jewish', 'israeli'],
    unfriendlyCuisines: ['pork', 'seafood', 'shellfish'],
    safetyNote: 'Supervision varies. Check the hechsher before relying on a listing.',
  },
  {
    id: 'lactose_free',
    label: 'Dairy free',
    emoji: '🥛',
    description: 'No milk, cheese, butter or cream.',
    kind: 'allergy',
    osmKey: 'lactose_free',
    friendlyCuisines: ['vegan', 'thai', 'vietnamese', 'japanese', 'sushi', 'chinese', 'falafel'],
    unfriendlyCuisines: ['pizza', 'ice_cream', 'french', 'creperie', 'cheese'],
    safetyNote: 'Butter and milk hide in sauces and breads — ask before ordering.',
  },
  {
    id: 'nut_free',
    label: 'Nut free',
    emoji: '🥜',
    description: 'No peanuts or tree nuts.',
    kind: 'allergy',
    osmKey: null,
    friendlyCuisines: [],
    unfriendlyCuisines: ['thai', 'vietnamese', 'indonesian', 'malaysian', 'chinese', 'indian', 'ice_cream'],
    safetyNote:
      'No map data records nut safety. Results are ranked by risk of nuts in the cuisine only — you must call ahead.',
  },
];

const DIET_BY_ID = new Map(DIETS.map((diet) => [diet.id, diet]));

export function getDiet(id: DietId): Diet {
  const diet = DIET_BY_ID.get(id);
  if (!diet) throw new Error(`Unknown diet: ${id}`);
  return diet;
}

export function isDietId(value: string): value is DietId {
  return DIET_BY_ID.has(value as DietId);
}
