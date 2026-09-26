import {createHash} from 'node:crypto';

/**
 * iCalendar (RFC 5545) text for the deadlines calendar: all-day events, and
 * nothing about the site itself. Lines end in CRLF and fold at 75 octets
 * without splitting a character, so Arabic titles survive every calendar app.
 */

export type CalendarEvent = {
  /** The same on every build, so a subscription updates the event instead of adding it twice. */
  uid: string;
  /** YYYY-MM-DD, the day the event falls on. */
  date: string;
  title: string;
  description: string;
  url: string;
  categories: string[];
};

/** RFC 4122's namespace for names that are URLs. */
export const URL_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

const PRODID = '-//Collegesaurus//Deadlines//EN';
const CRLF = '\r\n';
const MAX_OCTETS = 75;
// A hint for how often to come back; Google and Apple keep their own schedules.
const REFRESH = 'PT12H';
// Counted from the start of the all-day event: 9:00 the day before.
const REMINDER = '-PT15H';

/** A name-based UUID (version 5): the same name always gives the same UUID. */
export function uuid5(namespace: string, name: string): string {
  const hash = createHash('sha1')
    .update(Buffer.from(namespace.replace(/-/g, ''), 'hex'))
    .update(name, 'utf8')
    .digest()
    .subarray(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.toString('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join(
    '-',
  );
}

function escapeText(value: string): string {
  return value.replace(/[\\;,]/g, (char) => `\\${char}`).replace(/\r?\n/g, '\\n');
}

function octets(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  if (code < 0x80) {
    return 1;
  }
  if (code < 0x800) {
    return 2;
  }
  return code < 0x10000 ? 3 : 4;
}

/** Breaks a line every 75 octets, only ever between whole characters. */
function fold(line: string): string {
  const parts: string[] = [];
  let part = '';
  let size = 0;
  for (const char of line) {
    const width = octets(char);
    if (size + width > MAX_OCTETS) {
      parts.push(part);
      // A continuation line starts with a space, which counts towards its 75.
      part = ' ';
      size = 1;
    }
    part += char;
    size += width;
  }
  parts.push(part);
  return parts.join(CRLF);
}

const dateValue = (iso: string) => iso.replace(/-/g, '');

function nextDay(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

const stampValue = (stamp: Date) =>
  stamp.toISOString().replace(/\.\d{3}/, '').replace(/[-:]/g, '');

function eventLines(event: CalendarEvent, stamp: Date, remind: boolean): string[] {
  const title = escapeText(event.title);
  return [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${stampValue(stamp)}`,
    `DTSTART;VALUE=DATE:${dateValue(event.date)}`,
    // The end of an all-day event is the day after, not included.
    `DTEND;VALUE=DATE:${dateValue(nextDay(event.date))}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `URL:${event.url}`,
    ...(event.categories.length > 0
      ? [`CATEGORIES:${event.categories.map(escapeText).join(',')}`]
      : []),
    'TRANSP:TRANSPARENT',
    ...(remind
      ? ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, `TRIGGER:${REMINDER}`, 'END:VALARM']
      : []),
    'END:VEVENT',
  ];
}

function calendar(properties: string[], events: string[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...properties,
    ...events,
    'END:VCALENDAR',
  ];
  return lines.map(fold).join(CRLF) + CRLF;
}

/** A feed to subscribe to: every event, under the calendar's name. */
export function calendarFeed(feed: {name: string; events: CalendarEvent[]}, stamp: Date): string {
  const name = escapeText(feed.name);
  return calendar(
    [
      `X-WR-CALNAME:${name}`,
      `NAME:${name}`,
      `REFRESH-INTERVAL;VALUE=DURATION:${REFRESH}`,
      `X-PUBLISHED-TTL:${REFRESH}`,
    ],
    feed.events.flatMap((event) => eventLines(event, stamp, false)),
  );
}

/** One event on its own, to import once, with a reminder the morning before. */
export function eventFile(event: CalendarEvent, stamp: Date): string {
  return calendar([], eventLines(event, stamp, true));
}
