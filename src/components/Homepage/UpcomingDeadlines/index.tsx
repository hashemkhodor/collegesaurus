import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import {usePluralForm} from '@docusaurus/theme-common';
import Heading from '@theme/Heading';
import {ArrowLink} from '../ui';
import ui from '../ui/ui.module.css';
import {useDocsEntry} from '../hooks';
import DatePage from './DatePage';
import Pill from './Pill';
import {useDateFormats, type DateFormats} from './formats';
import {useDeadlines, type DeadlineRow} from './useDeadlines';
import styles from './styles.module.css';

/** As many as fit beside the stats without making the row taller. */
const MAX_ROWS = 3;

function Row({row, now, formats}: {row: DeadlineRow; now: Date | null; formats: DateFormats}) {
  const {selectMessage} = usePluralForm();
  const {entry, doc} = row;
  const more = entry.rounds.length - 1;
  return (
    <li>
      <Link to={doc.permalink} className={styles.row}>
        <DatePage
          iso={entry.closes}
          kinds={entry.kinds}
          month={formats.band(entry.closes)}
          size="small"
        />
        <span className={styles.text}>
          <span className={styles.name}>{doc.shortName}</span>
          <span className={styles.title}>
            {entry.rounds[0]}
            {more > 0
              ? ` ${selectMessage(
                  more,
                  translate(
                    {
                      id: 'homepage.deadlines.moreRounds',
                      message: 'and {count} more|and {count} more',
                      description:
                        'Under the first rounds that close on the same day, by plural form',
                    },
                    {count: more},
                  ),
                )}`
              : null}
          </span>
        </span>
        <span className={styles.when}>
          <Pill entry={entry} now={now} formats={formats} />
        </span>
      </Link>
    </li>
  );
}

/** The top row's deadlines card: the three soonest, and the way to the calendar. */
export default function UpcomingDeadlines(): ReactNode {
  const {now, upcoming} = useDeadlines();
  const formats = useDateFormats();
  const universities = useDocsEntry('universities');
  const rows = upcoming.slice(0, MAX_ROWS);

  return (
    <section className={clsx(ui.card, styles.card)}>
      <div className={ui.cardHead}>
        <Heading as="h2" className={ui.cardTitle}>
          <Translate id="homepage.deadlines.title">Upcoming deadlines</Translate>
        </Heading>
      </div>

      {rows.length > 0 ? (
        <>
          <ul className={styles.list}>
            {rows.map((row) => (
              <Row
                key={`${row.entry.ref.plugin}-${row.entry.ref.id}-${row.entry.closes}`}
                row={row}
                now={now}
                formats={formats}
              />
            ))}
          </ul>
          <div className={styles.more}>
            <ArrowLink to="#deadlines">
              <Translate id="homepage.deadlines.seeCalendar">See the calendar</Translate>
            </ArrowLink>
          </div>
        </>
      ) : (
        <p className={styles.empty}>
          <Translate id="homepage.deadlines.empty">No deadlines in the coming weeks.</Translate>{' '}
          <Link to={universities}>
            <Translate id="homepage.deadlines.emptyLink">
              Each university page lists its application windows.
            </Translate>
          </Link>
        </p>
      )}
    </section>
  );
}
