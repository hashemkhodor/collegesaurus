import type {ReactNode} from 'react';
import clsx from 'clsx';
import Translate, {translate} from '@docusaurus/Translate';
import Heading from '@theme/Heading';
import {IconChip, type IconName, type Tint} from '../ui';
import ui from '../ui/ui.module.css';
import styles from './styles.module.css';

type Benefit = {
  icon: IconName;
  tint: Tint;
  title: ReactNode;
  description: ReactNode;
};

const BENEFITS: Benefit[] = [
  {
    icon: 'shieldCheck',
    tint: 'green',
    title: (
      <Translate id="homepage.benefits.sourced.title">
        Sourced from official pages
      </Translate>
    ),
    description: (
      <Translate id="homepage.benefits.sourced.description">
        Every fact links to the page it came from, and each page shows the
        academic year it covers.
      </Translate>
    ),
  },
  {
    icon: 'layers',
    tint: 'purple',
    title: (
      <Translate id="homepage.benefits.together.title">
        All in one place
      </Translate>
    ),
    description: (
      <Translate id="homepage.benefits.together.description">
        Universities, majors, requirements, tuition and scholarships, in the
        same shape everywhere.
      </Translate>
    ),
  },
  {
    icon: 'heart',
    tint: 'orange',
    title: (
      <Translate id="homepage.benefits.forYou.title">
        Made for Lebanese students
      </Translate>
    ),
    description: (
      <Translate id="homepage.benefits.forYou.description">
        Built by students who went through it, to help you choose with
        confidence.
      </Translate>
    ),
  },
  {
    icon: 'unlock',
    tint: 'blue',
    title: (
      <Translate id="homepage.benefits.free.title">100% free</Translate>
    ),
    description: (
      <Translate id="homepage.benefits.free.description">
        No sign-up and no fees. The whole site is open source.
      </Translate>
    ),
  },
];

export default function Benefits(): ReactNode {
  return (
    <section className={clsx(ui.card, styles.card)} aria-labelledby="why-collegesaurus">
      <Heading as="h2" id="why-collegesaurus" className={ui.visuallyHidden}>
        {translate({
          id: 'homepage.benefits.title',
          message: 'Why Collegesaurus',
        })}
      </Heading>
      <ul className={styles.list}>
        {BENEFITS.map((benefit) => (
          <li key={benefit.icon} className={styles.item}>
            <IconChip icon={benefit.icon} tint={benefit.tint} size={44} />
            <div className={styles.text}>
              <h3 className={styles.title}>{benefit.title}</h3>
              <p className={styles.description}>{benefit.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
