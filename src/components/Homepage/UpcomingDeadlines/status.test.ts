// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON src/components/Homepage/UpcomingDeadlines/status.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {beirutDay, daysUntil, deadlineStatus} from './status.ts';

const AUB = {
  ref: {plugin: 'universities' as const, id: 'aub'},
  title: 'Transfer applications',
  opens: '2026-09-01',
  closes: '2026-10-31',
  sourceUrl: 'https://www.aub.edu.lb/admissions/Pages/Deadlines.aspx',
  verifiedOn: '2026-09-22',
};

test('a day starts at midnight in Beirut, not in UTC', () => {
  // Summer, UTC+3: 21:30 UTC is already half past midnight in Beirut.
  assert.equal(beirutDay(new Date('2026-07-14T21:30:00Z')), '2026-07-15');
  // Winter, UTC+2.
  assert.equal(beirutDay(new Date('2027-01-14T22:30:00Z')), '2027-01-15');
  assert.equal(beirutDay(new Date('2027-01-14T21:59:00Z')), '2027-01-14');
});

test("the day does not depend on the reader's timezone", () => {
  const saved = process.env.TZ;
  process.env.TZ = 'America/Los_Angeles';
  try {
    // 22:00 on the 30th in Los Angeles is 08:00 on the 31st in Beirut.
    assert.equal(beirutDay(new Date('2026-10-31T05:00:00Z')), '2026-10-31');
  } finally {
    process.env.TZ = saved;
  }
});

test('days are counted between Beirut dates', () => {
  assert.equal(daysUntil(new Date('2026-09-26T09:00:00Z'), '2026-10-31'), 35);
  // 00:30 on the 31st in Beirut is still the 30th in UTC.
  assert.equal(daysUntil(new Date('2026-10-30T22:30:00Z'), '2026-10-31'), 0);
});

test("the deadline's own day counts as closing, not closed", () => {
  const status = deadlineStatus(AUB, new Date('2026-10-30T22:30:00Z'));

  assert.deepEqual(status, {kind: 'closing', days: 0});
});

test('a deadline has closed once its day ends in Beirut', () => {
  // 00:30 on 1 November in Beirut, still 31 October in UTC.
  const status = deadlineStatus(AUB, new Date('2026-10-31T22:30:00Z'));

  assert.deepEqual(status, {kind: 'closed'});
});
