import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {usePluralForm} from '@docusaurus/theme-common';
import Heading from '@theme/Heading';
import type {HomeDoc} from '@site/plugins/homepage-data/types';
import {deadlines} from '@site/src/data/homepage/deadlines';
import type {Deadline} from '@site/src/data/homepage/types';
import {IconChip} from '../ui';
import ui from '../ui/ui.module.css';
import {findDoc, useDocsEntry, useHomepageData, useNow} from '../hooks';
import {daysUntil, deadlineStatus} from './status';
import styles from './styles.module.css';

const MAX_ROWS = 4;

function useDateFormat() {
  const {i18n} = useDocusaurusContext();
  // Arabic pages use Levantine month names, which ar-LB gives; Latin digits
  // keep the pill consistent with the tables on the content pages.
  const locale = i18n.currentLocale === 'ar' ? 'ar-LB' : i18n.currentLocale;
  const format = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    numberingSystem: 'latn',
  });
  return (iso: string) => format.format(new Date(`${iso}T00:00:00Z`));
}

function Pill({deadline, now}: {deadline: Deadline; now: Date | null}) {
  const {selectMessage} = usePluralForm();
  const formatDate = useDateFormat();

  // Before hydration there is no clock, so every row shows its closing date;
  // the relative wording arrives with the first client render after mount.
  const status = now ? deadlineStatus(deadline, now) : {kind: 'date' as const};

  if (status.kind === 'open') {
    return (
      <span className={clsx(styles.pill, styles.pillOpen)}>
        <Translate id="homepage.deadlines.open">Open now</Translate>
      </span>
    );
  }
  if (status.kind === 'closing') {
    return (
      <span className={clsx(styles.pill, styles.pillSoon)}>
        {selectMessage(
          status.days,
          translate(
            {
              id: 'homepage.deadlines.closing',
              message: '{count} day left|{count} days left',
              description: 'Days until a deadline closes, by plural form',
            },
            {count: status.days},
          ),
        )}
      </span>
    );
  }
  if (status.kind === 'opening') {
    return (
      <span className={clsx(styles.pill, styles.pillNeutral)}>
        {selectMessage(
          status.days,
          translate(
            {
              id: 'homepage.deadlines.opening',
              message: 'Opens in {count} day|Opens in {count} days',
              description: 'Days until a deadline opens, by plural form',
            },
            {count: status.days},
          ),
        )}
      </span>
    );
  }
  if (status.kind === 'closed') {
    return (
      <span className={clsx(styles.pill, styles.pillNeutral)}>
        <Translate id="homepage.deadlines.closed">Closed</Translate>
      </span>
    );
  }
  return (
    <span className={clsx(styles.pill, styles.pillNeutral)}>
      <Translate
        id="homepage.deadlines.closes"
        values={{date: formatDate(deadline.closes)}}>
        {'Closes {date}'}
      </Translate>
    </span>
  );
}

function Row({
  deadline,
  doc,
  now,
}: {
  deadline: Deadline;
  doc: HomeDoc;
  now: Date | null;
}) {
  return (
    <li>
      <Link to={doc.permalink} className={styles.row}>
        <IconChip
          icon={deadline.ref.plugin === 'universities' ? 'university' : 'cap'}
          tint={deadline.ref.plugin === 'universities' ? 'green' : 'purple'}
          size={40}
          shape="square"
        />
        <span className={styles.text}>
          <span className={styles.name}>{doc.shortName}</span>
          <span className={styles.title}>{deadline.title}</span>
        </span>
        <time dateTime={deadline.closes} className={styles.when}>
          <Pill deadline={deadline} now={now} />
        </time>
      </Link>
    </li>
  );
}

export default function UpcomingDeadlines(): ReactNode {
  const data = useHomepageData();
  const now = useNow();
  const entry = useDocsEntry('universities');

  // Filtered against build time, not the clock, so the server and the first
  // client render produce the same rows. A row that closes in between says
  // "Closed" after mount instead of vanishing and shifting the card.
  const built = new Date(data.generatedAt);
  const rows = deadlines()
    .map((deadline) => ({deadline, doc: findDoc(data, deadline.ref)}))
    .filter(
      (row): row is {deadline: Deadline; doc: HomeDoc} =>
        row.doc !== undefined && daysUntil(built, row.deadline.closes) >= 0,
    )
    .sort((a, b) => a.deadline.closes.localeCompare(b.deadline.closes))
    .slice(0, MAX_ROWS);

  return (
    <section className={clsx(ui.card, styles.card)}>
      <div className={ui.cardHead}>
        <Heading as="h2" className={ui.cardTitle}>
          <Translate id="homepage.deadlines.title">
            Deadlines coming up
          </Translate>
        </Heading>
      </div>

      {rows.length > 0 ? (
        <ul className={styles.list}>
          {rows.map((row) => (
            <Row
              key={`${row.deadline.ref.id}-${row.deadline.closes}`}
              deadline={row.deadline}
              doc={row.doc}
              now={now}
            />
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>
          <Translate id="homepage.deadlines.empty">
            No deadlines in the coming weeks.
          </Translate>{' '}
          <Link to={entry}>
            <Translate id="homepage.deadlines.emptyLink">
              Each university page lists its application windows.
            </Translate>
          </Link>
        </p>
      )}
    </section>
  );
}
