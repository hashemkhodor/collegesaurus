import type {ReactNode} from 'react';
import {translate} from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Hero from '@site/src/components/Homepage/Hero';
import StatsCard from '@site/src/components/Homepage/StatsCard';
import PopularUniversities from '@site/src/components/Homepage/PopularUniversities';
import UpcomingDeadlines from '@site/src/components/Homepage/UpcomingDeadlines';
import CompareBanner from '@site/src/components/Homepage/CompareBanner';
import Benefits from '@site/src/components/Homepage/Benefits';
import ExploreByMajor from '@site/src/components/Homepage/ExploreByMajor';

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
        <div className={styles.container}>
          <div className={styles.row}>
            <StatsCard />
            <PopularUniversities />
            <UpcomingDeadlines />
          </div>
          <CompareBanner />
          <Benefits />
          <ExploreByMajor />
        </div>
      </main>
    </Layout>
  );
}
