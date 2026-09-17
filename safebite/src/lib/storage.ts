import AsyncStorage from '@react-native-async-storage/async-storage';
import { isDietId, type DietId } from '../diet/diets';
import type { SortMode } from '../data/search';

const STORAGE_KEY = 'safebite.preferences.v1';

export interface Preferences {
  diets: DietId[];
  radiusMetres: number;
  sort: SortMode;
  hideUnsuitable: boolean;
  openNowOnly: boolean;
  /** False until the diet picker has been completed at least once. */
  onboarded: boolean;
}

export const RADIUS_CHOICES = [500, 1000, 2000, 5000] as const;

export const DEFAULT_PREFERENCES: Preferences = {
  diets: [],
  radiusMetres: 1000,
  sort: 'match',
  hideUnsuitable: true,
  openNowOnly: false,
  onboarded: false,
};

/** Tolerate anything on disk: a corrupt value should not stop the app opening. */
function coerce(raw: unknown): Preferences {
  const value = (raw ?? {}) as Partial<Record<keyof Preferences, unknown>>;

  const diets = Array.isArray(value.diets)
    ? value.diets.filter((id): id is DietId => typeof id === 'string' && isDietId(id))
    : DEFAULT_PREFERENCES.diets;

  const radiusMetres = RADIUS_CHOICES.includes(value.radiusMetres as never)
    ? (value.radiusMetres as number)
    : DEFAULT_PREFERENCES.radiusMetres;

  return {
    diets,
    radiusMetres,
    sort: value.sort === 'distance' ? 'distance' : 'match',
    hideUnsuitable: value.hideUnsuitable !== false,
    openNowOnly: value.openNowOnly === true,
    onboarded: value.onboarded === true,
  };
}

export async function loadPreferences(): Promise<Preferences> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored ? coerce(JSON.parse(stored)) : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(preferences: Preferences): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Losing a preference write is survivable; crashing the app is not.
  }
}
