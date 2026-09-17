import type { Place } from '../data/types';
import { DIETS, getDiet, type Diet, type DietId } from './diets';

/**
 * How well a place is known to suit a requirement. Ordered worst to best by
 * `VERDICT_RANK` — a place's overall verdict is its weakest diet, because one
 * unmet requirement is enough to ruin a meal.
 */
export type Verdict =
  | 'unsuitable' // explicitly tagged as not catering for this
  | 'unlikely'   // nothing recorded, and the cuisine rarely caters for it
  | 'unknown'    // nothing recorded either way
  | 'likely'     // no tag, but the cuisine usually caters for it
  | 'limited'    // tagged as having a few options
  | 'confirmed'  // tagged as catering for this
  | 'dedicated'; // the whole venue is safe

export const VERDICT_RANK: Record<Verdict, number> = {
  unsuitable: 0,
  unlikely: 1,
  unknown: 2,
  likely: 3,
  limited: 4,
  confirmed: 5,
  dedicated: 6,
};

export const VERDICT_LABELS: Record<Verdict, string> = {
  unsuitable: 'Not suitable',
  unlikely: 'Probably not',
  unknown: 'Not recorded',
  likely: 'Usually caters',
  limited: 'A few options',
  confirmed: 'Caters for you',
  dedicated: 'Entirely suitable',
};

export interface DietMatch {
  dietId: DietId;
  verdict: Verdict;
  /** One line explaining where the verdict came from. */
  reason: string;
  /** True when a mistake could make someone ill, so staff must be asked. */
  needsStaffCheck: boolean;
}

export interface PlaceMatch {
  verdict: Verdict;
  matches: DietMatch[];
  needsStaffCheck: boolean;
}

/** OSM records diet support as one of these values. */
const TAG_VERDICTS: Record<string, Verdict> = {
  only: 'dedicated',
  yes: 'confirmed',
  limited: 'limited',
  no: 'unsuitable',
};

const TAG_REASONS: Record<string, string> = {
  only: 'The whole menu is tagged as suitable',
  yes: 'Tagged as catering for this',
  limited: 'Tagged as having a few options',
  no: 'Tagged as not catering for this',
};

function readDietTag(place: Place, osmKey: string): { verdict: Verdict; reason: string } | null {
  const raw = place.tags[`diet:${osmKey}`]?.trim().toLowerCase();
  if (!raw) return null;

  const verdict = TAG_VERDICTS[raw];
  if (!verdict) return null;

  return { verdict, reason: TAG_REASONS[raw] };
}

/**
 * Facts one tag implies about another, so a vegan-only kitchen is not reported
 * as "unknown" for vegetarian or dairy-free diners.
 */
function impliedFromOtherTags(place: Place, diet: Diet): { verdict: Verdict; reason: string } | null {
  const vegan = readDietTag(place, 'vegan')?.verdict;
  const veganOnly = vegan === 'dedicated';

  if (diet.id === 'vegetarian') {
    if (veganOnly) return { verdict: 'dedicated', reason: 'Entirely vegan, so entirely vegetarian' };
    if (vegan === 'confirmed') return { verdict: 'confirmed', reason: 'Serves vegan food, so vegetarian too' };
    if (vegan === 'limited') return { verdict: 'limited', reason: 'Has some vegan food, so some vegetarian too' };
  }

  if (diet.id === 'lactose_free' && veganOnly) {
    return { verdict: 'confirmed', reason: 'Entirely vegan, so nothing on the menu contains dairy' };
  }

  if (diet.id === 'vegan' && place.cuisines.includes('vegan')) {
    return { verdict: 'dedicated', reason: 'Listed as a vegan kitchen' };
  }

  if (diet.id === 'vegetarian' && place.cuisines.some((c) => c === 'vegan' || c === 'vegetarian')) {
    return { verdict: 'dedicated', reason: 'Listed as a vegetarian kitchen' };
  }

  return null;
}

function fromCuisine(place: Place, diet: Diet): { verdict: Verdict; reason: string } {
  if (place.cuisines.length === 0) {
    return { verdict: 'unknown', reason: 'Nothing recorded about this place' };
  }

  const friendly = place.cuisines.filter((c) => diet.friendlyCuisines.includes(c));
  if (friendly.length > 0) {
    return {
      verdict: 'likely',
      reason: `No tag, but ${friendly[0].replace(/_/g, ' ')} places usually cater for this`,
    };
  }

  const unfriendly = place.cuisines.filter((c) => diet.unfriendlyCuisines.includes(c));
  if (unfriendly.length > 0 && unfriendly.length === place.cuisines.length) {
    return {
      verdict: 'unlikely',
      reason: `No tag, and ${unfriendly[0].replace(/_/g, ' ')} places rarely cater for this`,
    };
  }

  return { verdict: 'unknown', reason: 'Nothing recorded about this place' };
}

export function matchDiet(place: Place, dietId: DietId): DietMatch {
  const diet = getDiet(dietId);

  const tagged = diet.osmKey ? readDietTag(place, diet.osmKey) : null;
  const implied = impliedFromOtherTags(place, diet);

  // Take whichever signal is strongest, except that an explicit "no" always wins.
  let best = tagged ?? implied ?? fromCuisine(place, diet);
  if (tagged?.verdict === 'unsuitable') {
    best = tagged;
  } else if (implied && VERDICT_RANK[implied.verdict] > VERDICT_RANK[best.verdict]) {
    best = implied;
  }

  return {
    dietId,
    verdict: best.verdict,
    reason: best.reason,
    // Allergies always need confirming; so does anything we only inferred.
    needsStaffCheck:
      diet.kind === 'allergy' ||
      VERDICT_RANK[best.verdict] <= VERDICT_RANK.likely,
  };
}

/** Score a place against every selected requirement at once. */
export function matchPlace(place: Place, dietIds: DietId[]): PlaceMatch {
  if (dietIds.length === 0) {
    return { verdict: 'unknown', matches: [], needsStaffCheck: false };
  }

  const matches = dietIds.map((id) => matchDiet(place, id));

  // Weakest link: every requirement has to be met, not just the easy ones.
  const verdict = matches.reduce<Verdict>(
    (worst, match) => (VERDICT_RANK[match.verdict] < VERDICT_RANK[worst] ? match.verdict : worst),
    'dedicated',
  );

  return {
    verdict,
    matches,
    needsStaffCheck: matches.some((match) => match.needsStaffCheck),
  };
}

/** Every diet that has no `diet:*` tag in OSM, so we can be upfront about it. */
export const UNTAGGABLE_DIETS = DIETS.filter((diet) => diet.osmKey === null).map((d) => d.id);
