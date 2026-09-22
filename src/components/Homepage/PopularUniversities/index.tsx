import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {usePluralForm} from '@docusaurus/theme-common';
import Heading from '@theme/Heading';
import type {HomeUniversity} from '@site/plugins/homepage-data/types';
import {featuredFirst} from '@site/src/data/homepage/featured';
import {UNIVERSITY_LOGOS} from '@site/src/data/homepage/logos';
import type {Tint} from '../ui';
import {ArrowLink} from '../ui';
import ui from '../ui/ui.module.css';
import {useDocsEntry, useHomepageData} from '../hooks';
import {useSnapCarousel} from './useSnapCarousel';
import styles from './styles.module.css';

const TINTS: Tint[] = ['green', 'purple', 'orange', 'blue'];

/** Initials tile: the acronym itself, or its first letter when it is a word. */
function monogram(shortName: string): string {
  return shortName.length <= 4 ? shortName : shortName.slice(0, 1);
}

function UniversityCard({
  university,
  tint,
  index,
  programsLabel,
}: {
  university: HomeUniversity;
  tint: Tint;
  index: number;
  programsLabel: (count: number) => string;
}) {
  const logo = UNIVERSITY_LOGOS[university.id];
  const logoBase = useBaseUrl('/img/universities/');
  return (
    <li className={styles.item} data-index={index}>
      <Link to={university.permalink} className={styles.tile}>
        <span
          className={clsx(
            styles.mark,
            logo
              ? logo.tone === 'dark'
                ? styles.markDark
                : styles.markLogo
              : styles[tint],
          )}>
          {logo ? (
            /* Decorative: the card already names the university in text. */
            <img
              className={styles.logo}
              src={logoBase + logo.file}
              alt=""
              width={112}
              height={40}
              decoding="async"
            />
          ) : (
            monogram(university.shortName)
          )}
        </span>
        <span className={styles.shortName}>{university.shortName}</span>
        <span className={styles.fullName}>{university.fullName}</span>
        {university.programCount ? (
          <span className={styles.programs}>
            {programsLabel(university.programCount)}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

export default function PopularUniversities(): ReactNode {
  const {universities} = useHomepageData();
  const entry = useDocsEntry('universities');
  const {selectMessage} = usePluralForm();
  const ordered = featuredFirst(universities);
  const {trackRef, pages, page, goToPage} = useSnapCarousel(ordered.length);

  const programsLabel = (count: number) =>
    selectMessage(
      count,
      translate(
        {
          id: 'homepage.universities.programs',
          message: '{count} program|{count} programs',
          description: 'Program count on a university card, by plural form',
        },
        {count},
      ),
    );

  if (ordered.length === 0) {
    return null;
  }

  return (
    <section className={clsx(ui.card, styles.card)}>
      <div className={ui.cardHead}>
        <Heading as="h2" className={ui.cardTitle}>
          <Translate id="homepage.universities.title">
            Popular universities
          </Translate>
        </Heading>
        <ArrowLink to={entry}>
          <Translate id="homepage.universities.viewAll">View all</Translate>
        </ArrowLink>
      </div>

      <ul
        className={styles.track}
        ref={trackRef}
        tabIndex={0}
        role="region"
        aria-label={translate({
          id: 'homepage.universities.trackLabel',
          message: 'Universities, scrollable',
        })}>
        {ordered.map((university, index) => (
          <UniversityCard
            key={university.id}
            university={university}
            tint={TINTS[index % TINTS.length]!}
            index={index}
            programsLabel={programsLabel}
          />
        ))}
      </ul>

      {pages > 1 ? (
        <div className={styles.dots}>
          {Array.from({length: pages}, (_, index) => (
            <button
              key={index}
              type="button"
              className={clsx(styles.dot, index === page && styles.dotActive)}
              aria-current={index === page}
              aria-label={translate(
                {
                  id: 'homepage.universities.page',
                  message: 'Page {page} of {total}',
                },
                {page: index + 1, total: pages},
              )}
              onClick={() => goToPage(index)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.dots} aria-hidden="true" />
      )}
    </section>
  );
}
