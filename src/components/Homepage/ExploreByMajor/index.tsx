import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Heading from '@theme/Heading';
import {majorTiles} from '@site/src/data/homepage/majors';
import {IconChip} from '../ui';
import ui from '../ui/ui.module.css';
import styles from './styles.module.css';

export default function ExploreByMajor(): ReactNode {
  const searchUrl = useBaseUrl('/search');
  return (
    <section className={clsx(ui.card, styles.card)}>
      <div className={styles.head}>
        {/* Heading registers the anchor the hero's "Find a Major" card links
            to, and gives it the theme's scroll offset under the navbar. */}
        <Heading as="h2" id="explore-by-major" className={ui.cardTitle}>
          <Translate id="homepage.majors.title">Explore by major</Translate>
        </Heading>
        <p className={styles.subtitle}>
          <Translate id="homepage.majors.subtitle">
            Browse popular fields and find the right path for you.
          </Translate>
        </p>
      </div>
      <ul className={styles.grid}>
        {majorTiles().map((tile) => (
          <li key={tile.query}>
            <Link
              to={`${searchUrl}?q=${encodeURIComponent(tile.query)}`}
              className={styles.tile}>
              <IconChip icon={tile.icon} tint={tile.tint} size={48} shape="square" />
              <span className={styles.label}>{tile.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
