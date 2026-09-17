import { buildOverpassQuery, parseOverpassResponse } from './overpass';

describe('buildOverpassQuery', () => {
  const query = buildOverpassQuery({ latitude: 51.5308, longitude: -0.1238, radiusMetres: 1500 });

  it('asks for JSON and a bounded search', () => {
    expect(query).toContain('[out:json]');
    expect(query).toContain('around:1500,51.530800,-0.123800');
  });

  it('covers the places people actually eat at', () => {
    expect(query).toContain('restaurant');
    expect(query).toContain('cafe');
    expect(query).toContain('fast_food');
    expect(query).toContain('bakery');
  });

  it('asks for a centre point so ways and relations are usable', () => {
    expect(query).toContain('out center');
  });

  it('rounds the radius, which Overpass requires as an integer', () => {
    const rounded = buildOverpassQuery({ latitude: 0, longitude: 0, radiusMetres: 999.7 });
    expect(rounded).toContain('around:1000,');
  });
});

describe('parseOverpassResponse', () => {
  const payload = {
    elements: [
      {
        type: 'node',
        id: 1,
        lat: 51.53,
        lon: -0.12,
        tags: {
          name: 'The Green Fork',
          amenity: 'restaurant',
          cuisine: 'Vegan;Salad',
          'diet:vegan': 'only',
          'addr:housenumber': '12',
          'addr:street': 'Caledonian Road',
          'addr:city': 'London',
          opening_hours: 'Mo-Su 09:00-22:00',
          'contact:phone': '+44 20 7000 0000',
          website: 'https://example.com',
        },
      },
      {
        type: 'way',
        id: 2,
        center: { lat: 51.54, lon: -0.13 },
        tags: { name: 'Corner Bakery', shop: 'bakery' },
      },
      // No name: useless to someone choosing where to walk.
      { type: 'node', id: 3, lat: 51.55, lon: -0.14, tags: { amenity: 'cafe' } },
      // No coordinates at all.
      { type: 'relation', id: 4, tags: { name: 'Ghost Diner', amenity: 'restaurant' } },
      // Duplicate of the first element.
      { type: 'node', id: 1, lat: 51.53, lon: -0.12, tags: { name: 'The Green Fork', amenity: 'restaurant' } },
    ],
  };

  const places = parseOverpassResponse(payload);

  it('keeps only usable places', () => {
    expect(places.map((p) => p.id)).toEqual(['node/1', 'way/2']);
  });

  it('normalises cuisine into lowercase tokens', () => {
    expect(places[0].cuisines).toEqual(['vegan', 'salad']);
  });

  it('assembles a readable address', () => {
    expect(places[0].address).toBe('12 Caledonian Road, London');
  });

  it('falls back to the contact: namespace for phone numbers', () => {
    expect(places[0].phone).toBe('+44 20 7000 0000');
  });

  it('keeps the raw tags so the matcher can read anything', () => {
    expect(places[0].tags['diet:vegan']).toBe('only');
  });

  it('uses the centre point of a way', () => {
    expect(places[1]).toMatchObject({ latitude: 51.54, longitude: -0.13, category: 'bakery' });
  });

  it('survives junk', () => {
    expect(parseOverpassResponse(null)).toEqual([]);
    expect(parseOverpassResponse({})).toEqual([]);
    expect(parseOverpassResponse({ elements: 'nope' })).toEqual([]);
  });
});
