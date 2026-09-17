import { formatDistance, formatWalkingTime, haversineMetres, walkingMinutes } from './geo';

describe('haversineMetres', () => {
  it('is zero for the same point', () => {
    expect(haversineMetres({ latitude: 51.5, longitude: -0.12 }, { latitude: 51.5, longitude: -0.12 })).toBe(0);
  });

  it('matches the length of one degree of latitude', () => {
    // A degree along a meridian is R * (pi/180) = 111_195 m.
    const distance = haversineMetres(
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 0 },
    );
    expect(distance).toBeCloseTo(111_195, -1);
  });

  it('shrinks a degree of longitude with latitude', () => {
    const atEquator = haversineMetres({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 });
    const atSixty = haversineMetres({ latitude: 60, longitude: 0 }, { latitude: 60, longitude: 1 });

    // cos(60°) = 0.5, so the same degree spans half the distance.
    expect(atSixty / atEquator).toBeCloseTo(0.5, 2);
  });

  it('is symmetric', () => {
    const a = { latitude: 51.5308, longitude: -0.1238 };
    const b = { latitude: 48.8584, longitude: 2.2945 };
    expect(haversineMetres(a, b)).toBeCloseTo(haversineMetres(b, a), 6);
  });
});

describe('formatDistance', () => {
  it.each([
    [0, '0 m'],
    [184, '180 m'],
    [999, '1.0 km'],
    [1240, '1.2 km'],
    [15_400, '15 km'],
  ])('formats %i m as %s', (metres, expected) => {
    expect(formatDistance(metres)).toBe(expected);
  });

  it('refuses to invent a distance', () => {
    expect(formatDistance(Number.NaN)).toBe('—');
    expect(formatDistance(-5)).toBe('—');
  });
});

describe('walking time', () => {
  it('never claims less than a minute', () => {
    expect(walkingMinutes(5)).toBe(1);
  });

  it('pads the straight-line distance for real streets', () => {
    // 800 m as the crow flies is padded to 1040 m, i.e. 13 minutes at 80 m/min.
    expect(walkingMinutes(800)).toBe(13);
    expect(formatWalkingTime(800)).toBe('13 min walk');
  });

  it('switches to hours for long walks', () => {
    expect(formatWalkingTime(10_000)).toBe('2.7 h walk');
  });
});
