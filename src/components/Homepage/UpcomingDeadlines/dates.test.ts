// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON src/components/Homepage/UpcomingDeadlines/dates.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {addMonths, clampMonth, dayFormatter, weeksOf} from './dates.ts';

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

test('October 2026 starts on a Thursday, three days into a Monday-first week', () => {
  const weeks = weeksOf('2026-10');

  assert.equal(weeks.length, 5);
  assert.deepEqual(weeks[0], [null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
  assert.deepEqual(weeks[4], ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', null]);
});

test('November 2026 starts on a Sunday and needs six weeks', () => {
  const weeks = weeksOf('2026-11');

  assert.equal(weeks.length, 6);
  assert.deepEqual(weeks[0], [null, null, null, null, null, null, '2026-11-01']);
  assert.deepEqual(weeks[5], ['2026-11-30', null, null, null, null, null, null]);
});

test('February 2027 fits exactly four weeks, and a leap February gets its 29th', () => {
  const february = weeksOf('2027-02');
  assert.equal(february.length, 4);
  assert.deepEqual(february[3], ['2027-02-22', '2027-02-23', '2027-02-24', '2027-02-25', '2027-02-26', '2027-02-27', '2027-02-28']);

  const leap = weeksOf('2028-02');
  assert.equal(leap.length, 5);
  assert.deepEqual(leap[4], ['2028-02-28', '2028-02-29', null, null, null, null, null]);
});

test('months step across years', () => {
  assert.equal(addMonths('2026-12', 1), '2027-01');
  assert.equal(addMonths('2027-01', -1), '2026-12');
  assert.equal(addMonths('2026-10', 10), '2027-08');
});

test('a month is held between the first and last months that have deadlines', () => {
  assert.equal(clampMonth('2026-08', '2026-09', '2027-08'), '2026-09');
  assert.equal(clampMonth('2026-11', '2026-09', '2027-08'), '2026-11');
  assert.equal(clampMonth('2027-09', '2026-09', '2027-08'), '2027-08');
});
