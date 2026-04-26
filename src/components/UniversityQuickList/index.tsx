import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

// Ordered alphabetically by short name to match the sidebar (Docusaurus
// renders sidebar_position 1..13, also alphabetical).
const UNIVERSITIES: {slug: string; short: string}[] = [
  {slug: 'aub',       short: 'AUB'},
  {slug: 'aust',      short: 'AUST'},
  {slug: 'bau',       short: 'BAU'},
  {slug: 'haigazian', short: 'Haigazian'},
  {slug: 'lau',       short: 'LAU'},
  {slug: 'liu',       short: 'LIU'},
  {slug: 'lu',        short: 'LU'},
  {slug: 'ndu',       short: 'NDU'},
  {slug: 'rhu',       short: 'RHU'},
  {slug: 'antonine',  short: 'UA'},
  {slug: 'uob',       short: 'UOB'},
  {slug: 'usek',      short: 'USEK'},
  {slug: 'usj',       short: 'USJ'},
];

export default function UniversityQuickList(): ReactNode {
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
          {UNIVERSITIES.map(({slug, short}) => (
            <Link
              key={slug}
              to={`/universities/${slug}`}
              className={styles.chip}>
              {short}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
