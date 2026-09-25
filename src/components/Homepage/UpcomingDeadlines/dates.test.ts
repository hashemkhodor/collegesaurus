// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON src/components/Homepage/UpcomingDeadlines/dates.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {dayFormatter} from './dates.ts';

/** Runs `body` with the process in another timezone, as a reader's browser would be. */
function inZone<T>(zone: string, body: () => T): T {
  const saved = process.env.TZ;
  process.env.TZ = zone;
  try {
    return body();
  } finally {
    process.env.TZ = saved;
  }
}

test('a closing date keeps its calendar day in every timezone', () => {
  for (const zone of ['America/Los_Angeles', 'Asia/Beirut', 'Pacific/Kiritimati', 'UTC']) {
    const text = inZone(zone, () => dayFormatter('en', {day: 'numeric', month: 'short'})('2027-01-15'));
    assert.equal(text, 'Jan 15', zone);
  }
});

test('Arabic dates use Levantine month names and Latin digits', () => {
  const format = dayFormatter('ar', {day: 'numeric', month: 'long'});

  assert.equal(format('2026-10-31'), '31 تشرين الأول');
});
