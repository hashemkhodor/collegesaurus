import type {CalendarEvent} from '@site/plugins/homepage-data/ical';
import {nextDay} from './dates.ts';

/**
 * Where each calendar app takes the deadlines. Subscribing to the feed keeps
 * a calendar up to date; adding one deadline makes a copy that won't follow
 * later changes.
 */

type EventDetails = Pick<CalendarEvent, 'date' | 'title' | 'description'>;

const GOOGLE = 'https://calendar.google.com/calendar/render';
const OUTLOOK = 'https://outlook.live.com/calendar/0';
const GOOGLE_CALENDAR_APP = 'com.google.android.calendar';
/** ICSx⁵ keeps an Android phone's own calendar subscribed to a feed. */
export const ICSX5_PAGE = 'https://play.google.com/store/apps/details?id=at.bitfire.icsdroid';

const query = (params: [string, string][]) =>
  params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');

const compact = (iso: string) => iso.replace(/-/g, '');

/** An Android intent:// link: an app that takes `url` opens it, or the browser opens `fallback`. */
function intent(url: string, fallback: string, app?: string): string {
  const scheme = url.slice(0, url.indexOf('://'));
  const address = url.slice(scheme.length + '://'.length);
  const extras = [
    `scheme=${scheme}`,
    ...(app ? [`package=${app}`] : []),
    `S.browser_fallback_url=${encodeURIComponent(fallback)}`,
  ];
  return `intent://${address}#Intent;${extras.join(';')};end`;
}

/** The feed at webcal://, which calendar apps open as a subscription. */
export const webcal = (feed: string) => feed.replace(/^https?:/, 'webcal:');

/** Google Calendar subscribes to the feed; Google supports this in a computer's browser. */
export const googleSubscribe = (feed: string) => `${GOOGLE}?${query([['cid', webcal(feed)]])}`;

export const outlookSubscribe = (feed: string, name: string) =>
  `${OUTLOOK}/addfromweb?${query([
    ['url', feed],
    ['name', name],
  ])}`;

/**
 * On Android, a webcal app such as ICSx⁵ subscribes to the feed; without one,
 * Google Play offers ICSx⁵.
 */
export const icsx5Subscribe = (feed: string) => intent(webcal(feed), ICSX5_PAGE);

export const googleEvent = (event: EventDetails) =>
  `${GOOGLE}?${query([
    ['action', 'TEMPLATE'],
    ['text', event.title],
    // All day: the end is the next day, not included.
    ['dates', `${compact(event.date)}/${compact(nextDay(event.date))}`],
    ['details', event.description],
    // Free, not busy: a deadline doesn't take up the day.
    ['crm', 'AVAILABLE'],
  ])}`;

/**
 * On Android, the Google Calendar app opens a Google Calendar link, or the
 * browser does without it.
 */
export const inGoogleCalendarApp = (link: string) => intent(link, link, GOOGLE_CALENDAR_APP);

export const outlookEvent = (event: EventDetails) =>
  `${OUTLOOK}/deeplink/compose?${query([
    ['path', '/calendar/action/compose'],
    ['rru', 'addevent'],
    ['subject', event.title],
    ['startdt', event.date],
    ['enddt', nextDay(event.date)],
    ['allday', 'true'],
    ['body', event.description],
  ])}`;

export type Platform = 'android' | 'apple' | 'other';

/** The reader's kind of device, from the browser's user agent. iPads report a Mac. */
export function platformOf(userAgent: string): Platform {
  if (/Android/i.test(userAgent)) {
    return 'android';
  }
  return /iPhone|iPad|iPod|Macintosh/.test(userAgent) ? 'apple' : 'other';
}

/** Android browsers hand intent:// links to apps; an app's own browser ("; wv") doesn't. */
export const opensApps = (userAgent: string) =>
  platformOf(userAgent) === 'android' && !/; wv\)/.test(userAgent);
