import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import UniversityQuickList from '@site/src/components/UniversityQuickList';
import DeadlinesCalendar from '@site/src/components/DeadlinesCalendar';

import styles from './index.module.css';

function HeroSearchForm() {
  const searchAction = useBaseUrl('/search');
  const placeholder = translate({
    id: 'homepage.hero.searchPlaceholder',
    message: 'Search universities, scholarships, majors…',
  });
  const label = translate({
    id: 'homepage.hero.searchLabel',
    message: 'Search universities and scholarships',
  });
  return (
    <form
      className={styles.heroSearch}
      action={searchAction}
      method="get"
      role="search">
      <span className={styles.heroSearchIcon} aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round"
             strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        type="search"
        name="q"
        className={styles.heroSearchInput}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
      />
    </form>
  );
}

function HomepageHero() {
  return (
    <header className={styles.heroBanner}>
      <div className={styles.heroInner}>
        <Heading as="h1" className={styles.heroTitle}>
          <Translate id="homepage.hero.title">
            Your path to uni in Lebanon, sorted.
          </Translate>
        </Heading>
        <p className={styles.heroSubtitle}>
          <Translate id="homepage.hero.subtitle">
            A free, student-built guide to universities and scholarships, with
            the same template for every school so you can compare what actually
            matters.
          </Translate>
        </p>
        <div className={styles.heroButtons}>
          <Link
            className={clsx('button button--lg', styles.heroPrimaryButton)}
            to="/universities/aub">
            <Translate id="homepage.hero.ctaUniversities">
              Explore universities
            </Translate>
          </Link>
          <Link
            className={clsx('button button--lg', styles.heroSecondaryButton)}
            to="/scholarships/life">
            <Translate id="homepage.hero.ctaScholarships">
              Find scholarships
            </Translate>
          </Link>
        </div>
        <HeroSearchForm />
      </div>
    </header>
  );
}

function HomepageStats() {
  return (
    <section className={styles.stats} aria-label={translate({
      id: 'homepage.stats.ariaLabel',
      message: 'At a glance',
    })}>
      <div className={styles.statsInner}>
        <div className={styles.stat}>
          <div className={styles.statValue}>13</div>
          <div className={styles.statLabel}>
            <Translate id="homepage.stats.universities">Universities</Translate>
          </div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>9</div>
          <div className={styles.statLabel}>
            <Translate id="homepage.stats.scholarships">Scholarships</Translate>
          </div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>2</div>
          <div className={styles.statLabel}>
            <Translate id="homepage.stats.languages">Languages</Translate>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="A student guide to universities and external scholarships in Lebanon.">
      <HomepageHero />
      <main>
        <HomepageStats />
        <HomepageFeatures />
        <DeadlinesCalendar />
        <UniversityQuickList />
      </main>
    </Layout>
  );
}
