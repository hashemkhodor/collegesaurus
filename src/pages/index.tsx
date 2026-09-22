import type {ReactNode} from 'react';
import {translate} from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Hero from '@site/src/components/Homepage/Hero';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import UniversityQuickList from '@site/src/components/UniversityQuickList';

import styles from './index.module.css';

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description={translate({
        id: 'homepage.meta.description',
        message:
          'A student guide to universities and external scholarships in Lebanon.',
        description: 'The homepage meta description',
      })}>
      {/* One <main> wrapping everything: the skip link targets the first one,
          so a hero outside it would put the search out of that link's reach. */}
      <main className={styles.page}>
        <Hero />
        <HomepageFeatures />
        <UniversityQuickList />
      </main>
    </Layout>
  );
}
