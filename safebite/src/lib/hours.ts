/**
 * A deliberately partial parser for OpenStreetMap `opening_hours` values.
 *
 * The full grammar is enormous. This handles the shapes that cover the vast
 * majority of food venues — `24/7`, weekday ranges, multiple time spans,
 * spans past midnight and `off` exceptions — and returns `null` for anything
 * it does not fully understand. Saying "I don't know" is the only safe answer
 * when someone is deciding whether it is worth walking there.
 */

/** `true` open, `false` closed, `null` unknown / unparseable. */
export type OpenState = boolean | null;

const DAY_INDEX: Record<string, number> = {
  mo: 0, tu: 1, we: 2, th: 3, fr: 4, sa: 5, su: 6,
};

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/** Grammar we knowingly do not implement; seeing any of it invalidates the spec. */
const UNSUPPORTED = /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|week\b|sunrise|sunset|dawn|dusk|easter|\[|"/i;

/** Minutes since Monday 00:00 for a JS Date, using the device's local time. */
function weekMinutes(at: Date): number {
  const dayIndex = (at.getDay() + 6) % 7; // JS weeks start on Sunday, OSM on Monday.
  return dayIndex * 1440 + at.getHours() * 60 + at.getMinutes();
}

function parseDays(token: string): number[] | null {
  const days = new Set<number>();

  for (const part of token.split(',')) {
    const range = part.trim().toLowerCase();
    if (!range) continue;

    const [fromRaw, toRaw, ...rest] = range.split('-');
    if (rest.length > 0) return null;

    const from = DAY_INDEX[fromRaw];
    if (from === undefined) return null;

    if (toRaw === undefined) {
      days.add(from);
      continue;
    }

    const to = DAY_INDEX[toRaw];
    if (to === undefined) return null;

    // Ranges may wrap the week, e.g. Sa-Mo.
    for (let i = from; ; i = (i + 1) % 7) {
      days.add(i);
      if (i === to) break;
    }
  }

  return days.size > 0 ? [...days] : null;
}

/** `08:00-17:30` → `[480, 1050]`. Spans ending past midnight exceed 1440. */
function parseTimeSpan(token: string): [number, number] | null {
  const match = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(token.trim());
  if (!match) return null;

  const [, h1, m1, h2, m2] = match;
  const start = Number(h1) * 60 + Number(m1);
  let end = Number(h2) * 60 + Number(m2);

  if (start > 1440 || end > 1440) return null;
  if (end <= start) end += 1440; // e.g. 18:00-02:00

  return [start, end];
}

interface Rule {
  days: number[];
  /** Empty means the rule closes those days. */
  spans: [number, number][];
}

function parseRule(raw: string): Rule | null {
  const text = raw.trim();
  if (!text) return null;

  // Public-holiday and school-holiday rules are skipped rather than guessed at.
  if (/\b(ph|sh)\b/i.test(text)) return null;

  if (text === '24/7') return { days: ALL_DAYS, spans: [[0, 1440]] };

  // Split the leading day selector from the trailing time selector.
  const match = /^([A-Za-z,\- ]*?)\s*((?:\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\s*,?\s*)+|off|closed|open|24\/7)$/i
    .exec(text);
  if (!match) return null;

  const [, dayToken, timeToken] = match;
  const days = dayToken.trim() ? parseDays(dayToken) : ALL_DAYS;
  if (!days) return null;

  const times = timeToken.trim().toLowerCase();
  if (times === 'off' || times === 'closed') return { days, spans: [] };
  if (times === 'open' || times === '24/7') return { days, spans: [[0, 1440]] };

  const spans: [number, number][] = [];
  for (const part of times.split(',')) {
    if (!part.trim()) continue;
    const span = parseTimeSpan(part);
    if (!span) return null;
    spans.push(span);
  }

  return spans.length > 0 ? { days, spans } : null;
}

/**
 * Evaluate an `opening_hours` value at a moment in time.
 *
 * Later rules override earlier ones for the days they name, matching the
 * spec's semantics (`Mo-Su 09:00-17:00; We off`).
 */
export function isOpenAt(spec: string | undefined | null, at: Date): OpenState {
  if (!spec) return null;

  const trimmed = spec.trim();
  if (!trimmed) return null;
  if (trimmed === '24/7') return true;
  if (UNSUPPORTED.test(trimmed)) return null;

  // Per weekday, the spans from the last rule that mentioned that day.
  const byDay = new Map<number, [number, number][]>();
  let matchedAnyRule = false;

  for (const raw of trimmed.split(';')) {
    if (!raw.trim()) continue;

    const rule = parseRule(raw);
    if (!rule) {
      // A rule we cannot read may be the one that matters — don't guess.
      if (/\b(ph|sh)\b/i.test(raw)) continue;
      return null;
    }

    matchedAnyRule = true;
    for (const day of rule.days) byDay.set(day, rule.spans);
  }

  if (!matchedAnyRule) return null;

  const now = weekMinutes(at);
  const WEEK = 7 * 1440;

  for (const [day, spans] of byDay) {
    for (const [start, end] of spans) {
      const from = day * 1440 + start;
      const to = day * 1440 + end;

      // Compare on the week circle so Sunday-night spans reach into Monday.
      for (const offset of [-WEEK, 0, WEEK]) {
        if (now >= from + offset && now < to + offset) return true;
      }
    }
  }

  return false;
}

/** Convenience wrapper used by the UI. */
export function isOpenNow(spec: string | undefined | null, now: Date = new Date()): OpenState {
  return isOpenAt(spec, now);
}
