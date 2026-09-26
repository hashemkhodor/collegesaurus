import type {ReactNode} from 'react';
import Translate from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {Icon} from '../Homepage/ui';
import styles from './byline.module.css';

type Author = {name?: string; imageURL?: string; title?: string};

/** Author avatars and names, then date (ISO string) and reading time. Shared by the story cards and the post header. */
export default function Byline({
  authors,
  date,
  readingTime,
}: {
  authors: readonly Author[];
  date: string;
  readingTime?: number;
}): ReactNode {
  const {i18n} = useDocusaurusContext();
  const formatted = new Intl.DateTimeFormat(i18n.currentLocale, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(date));
  return (
    <div className={styles.byline}>
      {authors.length > 0 && (
        <span className={styles.authors}>
          {authors.map((author) =>
            author.imageURL ? (
              <img
                key={author.name}
                src={author.imageURL}
                alt=""
                width={28}
                height={28}
                loading="lazy"
                className={styles.avatar}
              />
            ) : null,
          )}
          <span className={styles.names}>
            {authors.map((author) => author.name).join(', ')}
          </span>
        </span>
      )}
      <time dateTime={date} className={styles.meta}>
        {formatted}
      </time>
      {readingTime !== undefined && (
        <span className={styles.meta}>
          <Icon name="clock" size={14} />
          <Translate
            id="stories.readingTime"
            values={{minutes: Math.max(1, Math.ceil(readingTime))}}>
            {'{minutes} min read'}
          </Translate>
        </span>
      )}
    </div>
  );
}
