import type {ReactNode} from 'react';
import clsx from 'clsx';
import Translate, {translate} from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {usePluralForm} from '@docusaurus/theme-common';
import Heading from '@theme/Heading';
import {Accent, IconChip, type IconName, type Tint} from '../ui';
import ui from '../ui/ui.module.css';
import {useHomepageData} from '../hooks';
import styles from './styles.module.css';

type Stat = {icon: IconName; tint: Tint; value: number; label: string};

export default function StatsCard(): ReactNode {
  const {totals} = useHomepageData();
  const {i18n} = useDocusaurusContext();
  const {selectMessage} = usePluralForm();

  const stats: Stat[] = [
    {
      icon: 'university',
      tint: 'green',
      value: totals.universities,
      label: selectMessage(
        totals.universities,
        translate({
          id: 'homepage.stats.universities',
          message: 'University|Universities',
          description: 'Label under the university count, by plural form',
        }),
      ),
    },
    {
      icon: 'star',
      tint: 'orange',
      value: totals.scholarships,
      label: selectMessage(
        totals.scholarships,
        translate({
          id: 'homepage.stats.scholarships',
          message: 'Scholarship|Scholarships',
          description: 'Label under the scholarship count, by plural form',
        }),
      ),
    },
    {
      icon: 'globe',
      tint: 'blue',
      value: i18n.locales.length,
      label: selectMessage(
        i18n.locales.length,
        translate({
          id: 'homepage.stats.languages',
          message: 'Language|Languages',
          description: 'Label under the language count, by plural form',
        }),
      ),
    },
  ];

  // Hidden rather than shown as zero when the emitted table format drifts.
  if (totals.programs !== null) {
    stats.splice(1, 0, {
      icon: 'bookOpen',
      tint: 'purple',
      value: totals.programs,
      label: selectMessage(
        totals.programs,
        translate({
          id: 'homepage.stats.programs',
          message: 'Program|Programs',
          description: 'Label under the program count, by plural form',
        }),
      ),
    });
  }

  return (
    <section className={clsx(ui.card, styles.card)}>
      <Heading as="h2" className={ui.cardTitle}>
        <Translate
          id="homepage.stats.title"
          values={{
            accent: (
              <Accent>
                <Translate id="homepage.stats.titleAccent">
                  in one place.
                </Translate>
              </Accent>
            ),
          }}>
          {'Everything you need, {accent}'}
        </Translate>
      </Heading>
      <ul className={styles.list}>
        {stats.map((stat) => (
          <li key={stat.icon} className={styles.stat}>
            <IconChip icon={stat.icon} tint={stat.tint} size={44} shape="square" />
            <span className={styles.text}>
              <span className={styles.value}>{stat.value}</span>
              <span className={styles.label}>{stat.label}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
