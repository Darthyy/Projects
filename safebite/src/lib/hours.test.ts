import { isOpenAt } from './hours';

/** Local-time helper: 2024-01-01 was a Monday, so day 1 = Monday. */
const at = (dayOfMonth: number, hour: number, minute = 0) =>
  new Date(2024, 0, dayOfMonth, hour, minute);

const MONDAY = 1;
const WEDNESDAY = 3;
const FRIDAY = 5;
const SATURDAY = 6;
const SUNDAY = 7;

describe('isOpenAt', () => {
  it('treats 24/7 as always open', () => {
    expect(isOpenAt('24/7', at(WEDNESDAY, 3))).toBe(true);
    expect(isOpenAt('24/7', at(SUNDAY, 23, 59))).toBe(true);
  });

  it('honours a weekday range', () => {
    const spec = 'Mo-Fr 09:00-17:00';
    expect(isOpenAt(spec, at(WEDNESDAY, 12))).toBe(true);
    expect(isOpenAt(spec, at(WEDNESDAY, 18))).toBe(false);
    expect(isOpenAt(spec, at(WEDNESDAY, 8, 59))).toBe(false);
    expect(isOpenAt(spec, at(SATURDAY, 12))).toBe(false);
  });

  it('closes during a lunch break', () => {
    const spec = 'Mo-Fr 08:00-12:00,13:00-18:00';
    expect(isOpenAt(spec, at(MONDAY, 11))).toBe(true);
    expect(isOpenAt(spec, at(MONDAY, 12, 30))).toBe(false);
    expect(isOpenAt(spec, at(MONDAY, 14))).toBe(true);
  });

  it('lets a later rule override an earlier one', () => {
    const spec = 'Mo-Su 09:00-17:00; We off';
    expect(isOpenAt(spec, at(MONDAY, 12))).toBe(true);
    expect(isOpenAt(spec, at(WEDNESDAY, 12))).toBe(false);
  });

  it('carries a span past midnight into the next day', () => {
    expect(isOpenAt('Fr-Sa 18:00-02:00', at(SATURDAY, 1))).toBe(true);
    expect(isOpenAt('Fr-Sa 18:00-02:00', at(SATURDAY, 3))).toBe(false);
  });

  it('wraps a Sunday night span into Monday', () => {
    expect(isOpenAt('Su 18:00-02:00', at(MONDAY, 1))).toBe(true);
  });

  it('handles a day range that wraps the week', () => {
    const spec = 'Sa-Mo 10:00-14:00';
    expect(isOpenAt(spec, at(SUNDAY, 11))).toBe(true);
    expect(isOpenAt(spec, at(MONDAY, 11))).toBe(true);
    expect(isOpenAt(spec, at(WEDNESDAY, 11))).toBe(false);
  });

  it('skips public holiday rules rather than guessing', () => {
    expect(isOpenAt('Mo-Fr 09:00-17:00; PH off', at(WEDNESDAY, 12))).toBe(true);
  });

  it('accepts a comma separated day list', () => {
    const spec = 'Mo,We,Fr 09:00-17:00';
    expect(isOpenAt(spec, at(WEDNESDAY, 12))).toBe(true);
    expect(isOpenAt(spec, at(FRIDAY, 12))).toBe(true);
    expect(isOpenAt(spec, at(SATURDAY, 12))).toBe(false);
  });

  it('says "unknown" rather than guessing at grammar it does not implement', () => {
    expect(isOpenAt('Jan-Mar Mo-Fr 09:00-17:00', at(WEDNESDAY, 12))).toBeNull();
    expect(isOpenAt('Mo-Fr sunrise-sunset', at(WEDNESDAY, 12))).toBeNull();
    expect(isOpenAt('Mo[1] 09:00-17:00', at(MONDAY, 12))).toBeNull();
    expect(isOpenAt('by appointment', at(WEDNESDAY, 12))).toBeNull();
    expect(isOpenAt('', at(WEDNESDAY, 12))).toBeNull();
    expect(isOpenAt(undefined, at(WEDNESDAY, 12))).toBeNull();
  });

  it('does not let one unreadable rule make the rest look authoritative', () => {
    expect(isOpenAt('Mo-Fr 09:00-17:00; Sa 10:00-late', at(WEDNESDAY, 12))).toBeNull();
  });
});
