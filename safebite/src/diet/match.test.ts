import type { Place } from '../data/types';
import { matchDiet, matchPlace } from './match';

function place(tags: Record<string, string>): Place {
  return {
    id: 'node/1',
    osmType: 'node',
    osmId: 1,
    name: 'Test Kitchen',
    latitude: 51.5,
    longitude: -0.12,
    category: 'restaurant',
    cuisines: (tags.cuisine ?? '').split(';').map((c) => c.trim()).filter(Boolean),
    tags,
  };
}

describe('matchDiet', () => {
  it('reads an explicit diet tag', () => {
    expect(matchDiet(place({ 'diet:vegan': 'only' }), 'vegan').verdict).toBe('dedicated');
    expect(matchDiet(place({ 'diet:vegan': 'yes' }), 'vegan').verdict).toBe('confirmed');
    expect(matchDiet(place({ 'diet:vegan': 'limited' }), 'vegan').verdict).toBe('limited');
    expect(matchDiet(place({ 'diet:vegan': 'no' }), 'vegan').verdict).toBe('unsuitable');
  });

  it('ignores a diet tag it does not recognise', () => {
    expect(matchDiet(place({ 'diet:vegan': 'maybe' }), 'vegan').verdict).toBe('unknown');
  });

  it('infers vegetarian from vegan', () => {
    expect(matchDiet(place({ 'diet:vegan': 'only' }), 'vegetarian').verdict).toBe('dedicated');
    expect(matchDiet(place({ 'diet:vegan': 'yes' }), 'vegetarian').verdict).toBe('confirmed');
    expect(matchDiet(place({ 'diet:vegan': 'limited' }), 'vegetarian').verdict).toBe('limited');
  });

  it('infers dairy free from an entirely vegan kitchen', () => {
    expect(matchDiet(place({ 'diet:vegan': 'only' }), 'lactose_free').verdict).toBe('confirmed');
  });

  it('prefers the stronger of an explicit tag and an inference', () => {
    const vegetarianTaggedWeakly = place({ 'diet:vegan': 'only', 'diet:vegetarian': 'limited' });
    expect(matchDiet(vegetarianTaggedWeakly, 'vegetarian').verdict).toBe('dedicated');
  });

  it('lets an explicit "no" beat any inference', () => {
    const contradictory = place({ 'diet:vegan': 'only', 'diet:vegetarian': 'no' });
    expect(matchDiet(contradictory, 'vegetarian').verdict).toBe('unsuitable');
  });

  it('treats a vegan cuisine as a dedicated kitchen', () => {
    expect(matchDiet(place({ cuisine: 'vegan' }), 'vegan').verdict).toBe('dedicated');
    expect(matchDiet(place({ cuisine: 'vegan' }), 'vegetarian').verdict).toBe('dedicated');
  });

  it('falls back to what the cuisine usually offers', () => {
    expect(matchDiet(place({ cuisine: 'indian' }), 'vegetarian').verdict).toBe('likely');
    expect(matchDiet(place({ cuisine: 'turkish' }), 'halal').verdict).toBe('likely');
  });

  it('flags a cuisine that rarely caters', () => {
    expect(matchDiet(place({ cuisine: 'steak_house' }), 'vegan').verdict).toBe('unlikely');
    expect(matchDiet(place({ cuisine: 'pizza' }), 'gluten_free').verdict).toBe('unlikely');
  });

  it('stays neutral when only some cuisines are unfriendly', () => {
    expect(matchDiet(place({ cuisine: 'steak_house;salad' }), 'vegan').verdict).toBe('likely');
  });

  it('says nothing is recorded when there is nothing to go on', () => {
    expect(matchDiet(place({}), 'gluten_free').verdict).toBe('unknown');
  });

  describe('staff checks', () => {
    it('always asks for allergies, however good the tag', () => {
      expect(matchDiet(place({ 'diet:gluten_free': 'only' }), 'gluten_free').needsStaffCheck).toBe(true);
      expect(matchDiet(place({}), 'nut_free').needsStaffCheck).toBe(true);
    });

    it('asks whenever a verdict was only inferred', () => {
      expect(matchDiet(place({ cuisine: 'indian' }), 'vegetarian').needsStaffCheck).toBe(true);
    });

    it('does not nag when a lifestyle diet is explicitly catered for', () => {
      expect(matchDiet(place({ 'diet:vegan': 'yes' }), 'vegan').needsStaffCheck).toBe(false);
    });
  });
});

describe('matchPlace', () => {
  it('reports the weakest requirement, not the best one', () => {
    const result = matchPlace(
      place({ 'diet:vegan': 'yes', 'diet:gluten_free': 'no' }),
      ['vegan', 'gluten_free'],
    );

    expect(result.verdict).toBe('unsuitable');
    expect(result.matches.map((m) => m.verdict)).toEqual(['confirmed', 'unsuitable']);
  });

  it('is dedicated only when every requirement is', () => {
    const result = matchPlace(place({ 'diet:vegan': 'only', 'diet:halal': 'only' }), ['vegan', 'halal']);
    expect(result.verdict).toBe('dedicated');
  });

  it('propagates the need for a staff check', () => {
    const result = matchPlace(place({ 'diet:vegan': 'yes' }), ['vegan', 'nut_free']);
    expect(result.needsStaffCheck).toBe(true);
  });

  it('checks nothing when no requirements are set', () => {
    const result = matchPlace(place({}), []);
    expect(result.matches).toHaveLength(0);
    expect(result.needsStaffCheck).toBe(false);
  });
});
