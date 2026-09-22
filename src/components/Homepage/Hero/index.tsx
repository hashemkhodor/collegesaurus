import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Heading from '@theme/Heading';
import {popularSearches} from '@site/src/data/homepage/popularSearches';
import {Accent, Icon} from '../ui';
import ui from '../ui/ui.module.css';
import {findDoc, useHomepageData} from '../hooks';
import QuickActions from '../QuickActions';
import styles from './styles.module.css';

function HeroSearch() {
  return (
    <form
      className={styles.search}
      action={useBaseUrl('/search')}
      method="get"
      role="search">
      <span className={styles.searchIcon} aria-hidden="true">
        <Icon name="search" size={20} />
      </span>
      <input
        type="search"
        name="q"
        className={styles.searchInput}
        placeholder={translate({
          id: 'homepage.hero.searchPlaceholder',
          message: 'Search universities, scholarships, majors…',
        })}
        aria-label={translate({
          id: 'homepage.hero.searchLabel',
          message: 'Search universities and scholarships',
        })}
        autoComplete="off"
      />
      <button type="submit" className={styles.searchButton}>
        <Translate id="homepage.hero.searchButton">Search</Translate>
      </button>
    </form>
  );
}

function PopularSearches() {
  const data = useHomepageData();
  const searchUrl = useBaseUrl('/search');
  const chips = popularSearches().map((search) => {
    const doc = search.doc && findDoc(data, search.doc);
    return {
      label: search.label,
      to: doc ? doc.permalink : `${searchUrl}?q=${encodeURIComponent(search.query)}`,
    };
  });

  return (
    <nav
      className={styles.popular}
      aria-label={translate({
        id: 'homepage.hero.popularLabel',
        message: 'Popular searches',
      })}>
      <span className={styles.popularTitle}>
        <Translate id="homepage.hero.popularTitle">Popular searches</Translate>
      </span>
      <ul className={styles.chips}>
        {chips.map((chip) => (
          <li key={chip.label}>
            <Link to={chip.to} className={styles.chip}>
              {chip.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Hero(): ReactNode {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={clsx(ui.eyebrow, styles.eyebrow)}>
            <Translate id="homepage.hero.eyebrow">
              All the info. Zero guesswork.
            </Translate>
          </p>
          <Heading as="h1" className={styles.title}>
            <span className={styles.titleLine}>
              <Translate id="homepage.hero.titleLine1">Your future.</Translate>
            </span>
            <span className={styles.titleLine}>
              <Translate id="homepage.hero.titleLine2">Your choice.</Translate>
            </span>
            <span className={styles.titleLine}>
              <Translate
                id="homepage.hero.titleLine3"
                values={{
                  accent: (
                    <Accent underline>
                      <Translate id="homepage.hero.titleAccent">
                        simple.
                      </Translate>
                    </Accent>
                  ),
                }}>
                {'We make it {accent}'}
              </Translate>
            </span>
          </Heading>
          <p className={styles.lead}>
            <Translate id="homepage.hero.lead">
              Collegesaurus helps Lebanese students discover universities,
              majors and scholarships, all in one place.
            </Translate>
          </p>
          <HeroSearch />
          <PopularSearches />
        </div>

        <QuickActions />
      </div>
    </section>
  );
}
