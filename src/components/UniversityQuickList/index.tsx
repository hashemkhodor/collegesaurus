import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import Heading from '@theme/Heading';
import {useAllDocsData} from '@docusaurus/plugin-content-docs/client';
import styles from './styles.module.css';

// Display name overrides for slugs whose chip label isn't just the
// uppercased slug (e.g. "antonine" → "UA"). Slugs not listed here fall back
// to slug.toUpperCase() so adding a new university auto-shows in the grid
// even before a nicer label is chosen.
const SHORT_LABELS: Record<string, string> = {
  aub: 'AUB',
  aust: 'AUST',
  bau: 'BAU',
  haigazian: 'Haigazian',
  lau: 'LAU',
  liu: 'LIU',
  lu: 'LU',
  ndu: 'NDU',
  rhu: 'RHU',
  antonine: 'UA',
  uob: 'UOB',
  usek: 'USEK',
  usj: 'USJ',
  elte: 'ELTE',
};

function shortFor(slug: string): string {
  return SHORT_LABELS[slug] ?? slug.toUpperCase();
}

export default function UniversityQuickList(): ReactNode {
  const docs = useAllDocsData().universities?.versions[0]?.docs ?? [];
  const chips = docs
    .map((d) => ({slug: d.id, short: shortFor(d.id), path: d.path}))
    .sort((a, b) => a.short.localeCompare(b.short, undefined, {sensitivity: 'base'}));

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <Heading as="h2" className={styles.heading}>
          <Translate id="homepage.unilist.heading">
            Jump to a university
          </Translate>
        </Heading>
        <p className={styles.subheading}>
          <Translate id="homepage.unilist.subheading">
            Skip the menu. Pick a school and go straight to its page.
          </Translate>
        </p>
        <div className={styles.grid}>
          {chips.map(({slug, short, path}) => (
            <Link
              key={slug}
              to={path}
              className={styles.chip}>
              {short}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
