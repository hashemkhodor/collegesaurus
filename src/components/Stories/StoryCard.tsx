import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import ui from '../Homepage/ui/ui.module.css';
import Byline from './Byline';
import {storyKind} from './kind';
import TagPills from './TagPills';
import styles from './styles.module.css';

type Metadata = {
  permalink: string;
  title: string;
  description?: string;
  date: string;
  readingTime?: number;
  authors: readonly {name?: string; imageURL?: string}[];
  tags: readonly {label: string; permalink: string}[];
};

export default function StoryCard({
  metadata,
  image,
}: {
  metadata: Metadata;
  image?: string;
}): ReactNode {
  const kind = storyKind(metadata.permalink);
  return (
    <li className={clsx(ui.card, styles.card)}>
      {image && <img src={image} alt="" loading="lazy" className={styles.cover} />}
      {kind && <p className={clsx(ui.eyebrow, styles.kind)}>{kind}</p>}
      <Heading as="h2" className={styles.title}>
        <Link to={metadata.permalink} className={clsx(ui.focusable, styles.titleLink)}>
          {metadata.title}
        </Link>
      </Heading>
      {metadata.description && <p className={styles.excerpt}>{metadata.description}</p>}
      <div className={styles.footer}>
        <Byline
          authors={metadata.authors}
          date={metadata.date}
          readingTime={metadata.readingTime}
        />
        <TagPills tags={metadata.tags.slice(0, 2)} />
      </div>
    </li>
  );
}
