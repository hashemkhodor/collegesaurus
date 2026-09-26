// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON src/components/Homepage/UpcomingDeadlines/calendarLinks.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {
  googleEvent,
  googleSubscribe,
  icsx5Subscribe,
  inGoogleCalendarApp,
  opensApps,
  outlookEvent,
  outlookSubscribe,
  platformOf,
  webcal,
} from './calendarLinks.ts';

const FEED = 'https://collegesaurus.org/deadlines.ics';
const AUB = {date: '2026-10-31', title: 'AUB deadline', description: 'Transfer'};

const UA = {
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
  instagramAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.127 Mobile Safari/537.36 Instagram 347.0.0.36.89 Android',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
};

test('Apple Calendar subscribes to the webcal address, in every language', () => {
  assert.equal(webcal(FEED), 'webcal://collegesaurus.org/deadlines.ics');
  assert.equal(
    webcal('https://collegesaurus.org/ar/deadlines.ics'),
    'webcal://collegesaurus.org/ar/deadlines.ics',
  );
});

test('Google Calendar subscribes through cid, which takes the webcal address', () => {
  assert.equal(
    googleSubscribe(FEED),
    'https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fcollegesaurus.org%2Fdeadlines.ics',
  );
});

test("Outlook subscribes to the https address, under the calendar's name", () => {
  assert.equal(
    outlookSubscribe(FEED, 'Collegesaurus deadlines'),
    'https://outlook.live.com/calendar/0/addfromweb?url=https%3A%2F%2Fcollegesaurus.org%2Fdeadlines.ics&name=Collegesaurus%20deadlines',
  );
});

test('on Android, a webcal app such as ICSx⁵ subscribes, and Google Play offers ICSx⁵ without one', () => {
  assert.equal(
    icsx5Subscribe('https://collegesaurus.org/ar/deadlines.ics'),
    'intent://collegesaurus.org/ar/deadlines.ics#Intent;scheme=webcal;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dat.bitfire.icsdroid;end',
  );
});

test('Google Calendar adds one deadline as an all-day event that ends the next day', () => {
  assert.equal(
    googleEvent(AUB),
    'https://calendar.google.com/calendar/render?action=TEMPLATE&text=AUB%20deadline&dates=20261031%2F20261101&details=Transfer&crm=AVAILABLE',
  );
});

test('Outlook adds one deadline as an all-day event that ends the next day', () => {
  assert.equal(
    outlookEvent(AUB),
    'https://outlook.live.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=AUB%20deadline&startdt=2026-10-31&enddt=2026-11-01&allday=true&body=Transfer',
  );
});

test('Arabic, #, & and new lines reach Google and Outlook as written, across the new year', () => {
  const event = {
    date: '2026-12-31',
    title: 'آخر موعد: AUB',
    description: 'Early Merit #1 & Transfer\n\nhttps://collegesaurus.org/ar/universities/aub?x=1',
  };
  const google = new URL(googleEvent(event)).searchParams;
  const outlook = new URL(outlookEvent(event)).searchParams;

  assert.equal(google.get('text'), event.title);
  assert.equal(google.get('details'), event.description);
  assert.equal(google.get('dates'), '20261231/20270101');
  assert.equal(outlook.get('subject'), event.title);
  assert.equal(outlook.get('body'), event.description);
  assert.equal(outlook.get('enddt'), '2027-01-01');
});

test('on Android the Google Calendar app opens the same link, or the browser does without it', () => {
  const link = googleEvent(AUB);
  const intent = inGoogleCalendarApp(link);

  assert.equal(
    intent,
    `intent://calendar.google.com/calendar/render?action=TEMPLATE&text=AUB%20deadline&dates=20261031%2F20261101&details=Transfer&crm=AVAILABLE#Intent;scheme=https;package=com.google.android.calendar;S.browser_fallback_url=${encodeURIComponent(link)};end`,
  );
  assert.equal(decodeURIComponent(intent.match(/S\.browser_fallback_url=([^;]*)/)![1]!), link);
});

test("the reader's device: Android, Apple (iPads report a Mac) or anything else", () => {
  assert.equal(platformOf(UA.chromeAndroid), 'android');
  assert.equal(platformOf(UA.instagramAndroid), 'android');
  assert.equal(platformOf(UA.iphone), 'apple');
  assert.equal(platformOf(UA.ipad), 'apple');
  assert.equal(platformOf(UA.windows), 'other');
});

test("an Android browser opens other apps, but an app's own browser can't", () => {
  assert.equal(opensApps(UA.chromeAndroid), true);
  assert.equal(opensApps(UA.instagramAndroid), false);
  assert.equal(opensApps(UA.iphone), false);
  assert.equal(opensApps(UA.windows), false);
});
