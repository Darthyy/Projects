import { rankPlaces } from './search';
import type { Place } from './types';

const ORIGIN = { latitude: 51.5, longitude: -0.12 };

/** Roughly `metresNorth` metres due north of the origin. */
function place(name: string, metresNorth: number, tags: Record<string, string> = {}): Place {
  return {
    id: `node/${name}`,
    osmType: 'node',
    osmId: 1,
    name,
    latitude: ORIGIN.latitude + metresNorth / 111_195,
    longitude: ORIGIN.longitude,
    category: 'restaurant',
    cuisines: (tags.cuisine ?? '').split(';').filter(Boolean),
    tags,
    openingHours: tags.opening_hours,
  };
}

const WEDNESDAY_NOON = new Date(2024, 0, 3, 12, 0);

const base = {
  origin: ORIGIN,
  diets: ['vegan'] as const,
  hideUnsuitable: true,
  openNowOnly: false,
  now: WEDNESDAY_NOON,
};

describe('rankPlaces', () => {
  const far = place('Far but vegan', 900, { 'diet:vegan': 'only' });
  const near = place('Near but unknown', 100);
  const middle = place('Middling', 400, { 'diet:vegan': 'yes' });

  it('puts the most suitable place first when sorting by match', () => {
    const ranked = rankPlaces([near, far, middle], { ...base, diets: ['vegan'], sort: 'match' });
    expect(ranked.map((r) => r.place.name)).toEqual(['Far but vegan', 'Middling', 'Near but unknown']);
  });

  it('puts the closest place first when sorting by distance', () => {
    const ranked = rankPlaces([near, far, middle], { ...base, diets: ['vegan'], sort: 'distance' });
    expect(ranked.map((r) => r.place.name)).toEqual(['Near but unknown', 'Middling', 'Far but vegan']);
  });

  it('breaks a tie on suitability with distance', () => {
    const closer = place('Closer', 200, { 'diet:vegan': 'yes' });
    const ranked = rankPlaces([middle, closer], { ...base, diets: ['vegan'], sort: 'match' });
    expect(ranked[0].place.name).toBe('Closer');
  });

  it('computes the distance to each place', () => {
    const [entry] = rankPlaces([near], { ...base, diets: ['vegan'], sort: 'distance' });
    expect(entry.distanceMetres).toBeCloseTo(100, 0);
  });

  it('drops places tagged as unsuitable when asked', () => {
    const banned = place('Steakhouse', 50, { 'diet:vegan': 'no' });
    const shown = rankPlaces([banned, near], { ...base, diets: ['vegan'], sort: 'match' });
    expect(shown.map((r) => r.place.name)).toEqual(['Near but unknown']);

    const all = rankPlaces([banned, near], {
      ...base,
      diets: ['vegan'],
      sort: 'match',
      hideUnsuitable: false,
    });
    expect(all).toHaveLength(2);
  });

  it('hides places that are shut, but keeps ones with unknown hours', () => {
    const shut = place('Evenings only', 50, { opening_hours: 'Mo-Su 18:00-23:00' });
    const open = place('Lunch spot', 60, { opening_hours: 'Mo-Su 11:00-15:00' });
    const unknown = place('No hours listed', 70);

    const ranked = rankPlaces([shut, open, unknown], {
      ...base,
      diets: ['vegan'],
      sort: 'distance',
      openNowOnly: true,
    });

    expect(ranked.map((r) => r.place.name)).toEqual(['Lunch spot', 'No hours listed']);
  });

  it('prefers an open place over an equally suitable closed one', () => {
    const closedNearer = place('Closed nearer', 50, {
      'diet:vegan': 'yes',
      opening_hours: 'Mo-Su 18:00-23:00',
    });
    const openFurther = place('Open further', 300, {
      'diet:vegan': 'yes',
      opening_hours: 'Mo-Su 11:00-15:00',
    });

    const ranked = rankPlaces([closedNearer, openFurther], {
      ...base,
      diets: ['vegan'],
      sort: 'match',
    });

    expect(ranked[0].place.name).toBe('Open further');
  });

  it('still sorts by distance when no requirements are set', () => {
    const ranked = rankPlaces([far, near, middle], { ...base, diets: [], sort: 'match' });
    expect(ranked.map((r) => r.place.name)).toEqual([
      'Near but unknown',
      'Middling',
      'Far but vegan',
    ]);
  });
});
