// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON plugins/homepage-data/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {calendarFeed, eventFile, uuid5, URL_NAMESPACE, type CalendarEvent} from './ical.ts';

const STAMP = new Date('2026-09-26T08:30:00Z');
const CRLF = '\r\n';

const AUB: CalendarEvent = {
  uid: 'f7bf9c60-1420-5246-926a-faedfd0e46fc',
  date: '2026-10-31',
  title: 'AUB deadline',
  description: 'Freshman - Early Merit (Fall 2027-28)',
  url: 'https://collegesaurus.org/universities/aub',
  categories: ['Application'],
};

const lines = (text: string) => text.split(CRLF);
const unfold = (text: string) => text.replace(/\r\n /g, '');
const field = (text: string, name: string) =>
  lines(unfold(text)).find((line) => line.startsWith(`${name}:`) || line.startsWith(`${name};`));

test('a feed lists each deadline as an all-day event under the calendar name', () => {
  assert.equal(
    calendarFeed({name: 'Collegesaurus deadlines', events: [AUB]}, STAMP),
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Collegesaurus//Deadlines//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Collegesaurus deadlines',
      'NAME:Collegesaurus deadlines',
      'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
      'X-PUBLISHED-TTL:PT12H',
      'BEGIN:VEVENT',
      'UID:f7bf9c60-1420-5246-926a-faedfd0e46fc',
      'DTSTAMP:20260926T083000Z',
      'DTSTART;VALUE=DATE:20261031',
      'DTEND;VALUE=DATE:20261101',
      'SUMMARY:AUB deadline',
      'DESCRIPTION:Freshman - Early Merit (Fall 2027-28)',
      'URL:https://collegesaurus.org/universities/aub',
      'CATEGORIES:Application',
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ].join(CRLF),
  );
});

test('a single event has no calendar name, and reminds the morning before', () => {
  const file = eventFile(AUB, STAMP);

  assert.equal(field(file, 'X-WR-CALNAME'), undefined);
  assert.equal(field(file, 'REFRESH-INTERVAL'), undefined);
  assert.match(
    file,
    /BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:AUB deadline\r\nTRIGGER:-PT15H\r\nEND:VALARM\r\nEND:VEVENT/,
  );
});

test('an all-day event ends the day after it falls, across months, years and leap days', () => {
  const end = (date: string) => field(calendarFeed({name: 'x', events: [{...AUB, date}]}, STAMP), 'DTEND');

  assert.equal(end('2026-12-31'), 'DTEND;VALUE=DATE:20270101');
  assert.equal(end('2027-02-28'), 'DTEND;VALUE=DATE:20270301');
  assert.equal(end('2028-02-28'), 'DTEND;VALUE=DATE:20280229');
});

test('text escapes commas, semicolons, backslashes and newlines', () => {
  const file = calendarFeed(
    {
      name: 'x',
      events: [{...AUB, title: 'Early Merit, Fall; A\\B', description: 'One\nTwo', categories: ['Scholarship, aid']}],
    },
    STAMP,
  );

  assert.equal(field(file, 'SUMMARY'), 'SUMMARY:Early Merit\\, Fall\\; A\\\\B');
  assert.equal(field(file, 'DESCRIPTION'), 'DESCRIPTION:One\\nTwo');
  assert.equal(field(file, 'CATEGORIES'), 'CATEGORIES:Scholarship\\, aid');
});

test('a long line folds at 75 octets', () => {
  const file = calendarFeed({name: 'x', events: [{...AUB, title: 'a'.repeat(100)}]}, STAMP);

  assert.ok(file.includes(`SUMMARY:${'a'.repeat(67)}${CRLF} ${'a'.repeat(33)}${CRLF}`));
});

test('folding never splits a character, in Arabic or beyond the basic plane', () => {
  const description = `${'تشرين الأول '.repeat(12)}🎓 ${'موعد نهائي '.repeat(9)}`;
  const file = calendarFeed({name: 'x', events: [{...AUB, description}]}, STAMP);
  const lone = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

  for (const line of lines(file)) {
    assert.ok(Buffer.byteLength(line) <= 75, `${Buffer.byteLength(line)} octets: ${line}`);
    assert.doesNotMatch(line, lone);
  }
  assert.equal(field(file, 'DESCRIPTION'), `DESCRIPTION:${description}`);
});

test('a UID is the same UUID (version 5) for the same name, every build', () => {
  // Reference values from Python's uuid.uuid5.
  const DNS_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  assert.equal(uuid5(DNS_NAMESPACE, 'www.example.com'), '2ed6657d-e927-568b-95e1-2665a8aea6a2');
  assert.equal(
    uuid5(URL_NAMESPACE, 'https://collegesaurus.org/deadlines/universities-aub-2026-10-31'),
    'f7bf9c60-1420-5246-926a-faedfd0e46fc',
  );
});
