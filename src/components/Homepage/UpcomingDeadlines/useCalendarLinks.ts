import {useEffect, useMemo, useState} from 'react';
import {translate} from '@docusaurus/Translate';
import {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import type {CalendarOption} from './AddToCalendar';
import {
  googleEvent,
  googleSubscribe,
  ICSX5_PAGE,
  icsx5Subscribe,
  inGoogleCalendarApp,
  opensApps,
  outlookEvent,
  outlookSubscribe,
  platformOf,
  webcal,
  type Platform,
} from './calendarLinks';
import {eventPath, FEED_PATH} from './entries';
import {deadlineEvent, eventText} from './event';
import type {DeadlineRow} from './useDeadlines';

type Device = {platform: Platform; opensApps: boolean};

/** No device in particular on the server and the first client render, so both agree. */
function useDevice(): Device {
  const [device, setDevice] = useState<Device>({platform: 'other', opensApps: false});
  useEffect(() => {
    setDevice({
      platform: platformOf(navigator.userAgent),
      opensApps: opensApps(navigator.userAgent),
    });
  }, []);
  return device;
}

/** Moves the reader's own kind of calendar to the top, keeping the rest in order. */
const ownFirst = (options: CalendarOption[], own: string | null) =>
  [...options].sort((a, b) => Number(b.key === own) - Number(a.key === own));

/**
 * The ways into a calendar app, for the whole feed and for each deadline. On
 * Android, Google Calendar and ICSx⁵ open as apps rather than web pages.
 */
export function useCalendarLinks() {
  const {siteConfig, i18n} = useDocusaurusContext();
  const {withBaseUrl} = useBaseUrlUtils();
  const device = useDevice();
  const text = useMemo(() => eventText(translate, i18n.currentLocale), [i18n.currentLocale]);
  const google = translate({id: 'homepage.deadlines.googleCalendar', message: 'Google Calendar'});
  const apple = translate({id: 'homepage.deadlines.appleCalendar', message: 'Apple Calendar'});

  const feed = (): CalendarOption[] => {
    const url = withBaseUrl(`/${FEED_PATH}`, {absolute: true});
    return ownFirst(
      [
        {
          key: 'google',
          label: google,
          hint: translate({
            id: 'homepage.deadlines.subscribeGoogle',
            message: 'From a computer. On Android, then turn on Sync for it in the app.',
            description: 'How to subscribe with Google Calendar, which works from a computer only',
          }),
          href: googleSubscribe(url),
          newTab: true,
        },
        {
          key: 'apple',
          label: apple,
          hint: translate({id: 'homepage.deadlines.subscribeApple', message: 'iPhone, iPad and Mac'}),
          href: webcal(url),
        },
        {
          key: 'android',
          label: 'Android',
          hint: translate({id: 'homepage.deadlines.subscribeAndroid', message: 'With the ICSx⁵ app'}),
          ...(device.opensApps ? {href: icsx5Subscribe(url)} : {href: ICSX5_PAGE, newTab: true}),
        },
        {
          key: 'outlook',
          label: 'Outlook',
          hint: translate({id: 'homepage.deadlines.subscribeOutlook', message: 'Outlook on the web'}),
          href: outlookSubscribe(url, text.calendar),
          newTab: true,
        },
        {
          key: 'copy',
          label: translate({id: 'homepage.deadlines.copyLink', message: 'Copy the link'}),
          hint: translate({
            id: 'homepage.deadlines.copyLinkHint',
            message: 'For any other calendar app',
          }),
          copy: url,
        },
      ],
      device.platform === 'other' ? null : device.platform,
    );
  };

  const event = ({entry, doc}: DeadlineRow): CalendarOption[] => {
    const details = deadlineEvent(
      entry,
      {shortName: doc.shortName, url: `${siteConfig.url}${doc.permalink}`},
      text,
    );
    const inGoogle = googleEvent(details);
    const file = withBaseUrl(`/${eventPath(entry)}`);
    return ownFirst(
      [
        {
          key: 'google',
          label: google,
          ...(device.opensApps
            ? {href: inGoogleCalendarApp(inGoogle)}
            : {href: inGoogle, newTab: true}),
        },
        {key: 'apple', label: apple, href: file},
        {key: 'outlook', label: 'Outlook', href: outlookEvent(details), newTab: true},
        {
          key: 'other',
          label: translate({id: 'homepage.deadlines.otherCalendar', message: 'Other calendar app'}),
          href: file,
          download: true,
        },
      ],
      device.platform === 'apple' ? 'apple' : null,
    );
  };

  return {feed, event};
}

export type CalendarLinks = ReturnType<typeof useCalendarLinks>;
