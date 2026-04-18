import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const UNIVERSITIES: {slug: string; short: string}[] = [
  {slug: 'aub',       short: 'AUB'},
  {slug: 'lau',       short: 'LAU'},
  {slug: 'lu',        short: 'LU'},
  {slug: 'usj',       short: 'USJ'},
  {slug: 'ndu',       short: 'NDU'},
  {slug: 'bau',       short: 'BAU'},
  {slug: 'liu',       short: 'LIU'},
  {slug: 'usek',      short: 'USEK'},
  {slug: 'uob',       short: 'UOB'},
  {slug: 'rhu',       short: 'RHU'},
  {slug: 'haigazian', short: 'Haigazian'},
  {slug: 'aust',      short: 'AUST'},
  {slug: 'antonine',  short: 'UA'},
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
