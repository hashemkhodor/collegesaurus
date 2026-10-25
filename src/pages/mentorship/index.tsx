import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import Translate, {translate} from '@docusaurus/Translate';
import Heading from '@theme/Heading';
import Layout from '@theme/Layout';
import Button from '@site/src/components/ui/Button';
import {
  Accent,
  Icon,
  IconChip,
  type IconName,
} from '@site/src/components/Homepage/ui';
import ui from '@site/src/components/Homepage/ui/ui.module.css';
import {MENTORSHIP_MAILTO} from '@site/src/data/mentorship';

import styles from './styles.module.css';

type Tone = 'solid' | 'soft' | 'profile';

type Bar = {
  id: string;
  icon: IconName;
  tone: Tone;
  delay: number;
  label?: ReactNode;
  title: ReactNode;
};

const PROFILE = (
  <Translate id="mentorship.profile.title">Student profile</Translate>
);

const TRACKS: Bar[] = [
  {
    id: 'sat',
    icon: 'pencil',
    tone: 'solid',
    delay: 0,
    title: <Translate id="mentorship.tracks.sat">SAT tutoring</Translate>,
  },
  {
    id: 'selection',
    icon: 'cap',
    tone: 'soft',
    delay: 0,
    title: (
      <Translate id="mentorship.tracks.selection">
        University & major selection guidance
      </Translate>
    ),
  },
  {
    id: 'profile',
    icon: 'document',
    tone: 'profile',
    delay: 0.9,
    label: <Translate id="mentorship.p1.builds">Builds the</Translate>,
    title: PROFILE,
  },
];

const STEPS: Bar[] = [
  {
    id: 'profile',
    icon: 'document',
    tone: 'profile',
    delay: 0,
    label: <Translate id="mentorship.p2.starts">Starts from the</Translate>,
    title: PROFILE,
  },
  {
    id: 'scholarships',
    icon: 'wallet',
    tone: 'solid',
    delay: 0.35,
    title: (
      <Translate id="mentorship.steps.scholarships">Scholarships</Translate>
    ),
  },
  {
    id: 'majors',
    icon: 'book',
    tone: 'solid',
    delay: 0.7,
    title: <Translate id="mentorship.steps.majors">Majors</Translate>,
  },
  {
    id: 'universities',
    icon: 'university',
    tone: 'solid',
    delay: 1.05,
    title: (
      <Translate id="mentorship.steps.universities">
        University selection
      </Translate>
    ),
  },
];

type Reveal = 'static' | 'idle' | 'run';

// Bars render filled until hydration, so the diagram still reads without JS.
function useReveal<T extends Element>() {
  const ref = useRef<T>(null);
  const [state, setState] = useState<Reveal>('static');
  useEffect(() => {
    const el = ref.current;
    if (
      !el ||
      !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return undefined;
    }
    setState('idle');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          requestAnimationFrame(() => setState('run'));
          observer.disconnect();
        }
      },
      {threshold: 0.4},
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, state] as const;
}

function Bars({
  bars,
  layout,
}: {
  bars: Bar[];
  layout: 'parallel' | 'sequence';
}): ReactNode {
  const [ref, state] = useReveal<HTMLOListElement>();
  return (
    <ol ref={ref} className={clsx(styles.bars, styles[layout])} data-reveal={state}>
      {bars.map((bar) => (
        <li
          key={bar.id}
          className={clsx(styles.bar, styles[bar.tone])}
          style={{'--delay': `${bar.delay}s`} as CSSProperties}>
          <span className={styles.fill}>
            <Icon name={bar.icon} size={20} className={styles.barIcon} />
            <span className={styles.barText}>
              {bar.label && (
                <span className={styles.barLabel}>{bar.label}</span>
              )}
              <span className={styles.barTitle}>{bar.title}</span>
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Pipeline({
  id,
  eyebrow,
  title,
  lead,
  children,
}: {
  id: string;
  eyebrow: ReactNode;
  title: ReactNode;
  lead: ReactNode;
  children: ReactNode;
}): ReactNode {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <p className={ui.eyebrow}>{eyebrow}</p>
      <Heading as="h2" id={id} className={styles.sectionTitle}>
        {title}
      </Heading>
      <p className={styles.sectionLead}>{lead}</p>
      {children}
    </section>
  );
}

export default function Mentorship(): ReactNode {
  return (
    <Layout
      title={translate({id: 'mentorship.meta.title', message: 'Mentorship'})}
      description={translate({
        id: 'mentorship.meta.description',
        message:
          'Collegesaurus mentorship: SAT tutoring and university and major guidance in Grades 10 and 11, then scholarships, majors and university selection in Grade 12.',
      })}>
      <main className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.container}>
            <p className={clsx(ui.eyebrow, styles.eyebrow)}>
              <Translate id="mentorship.hero.eyebrow">Mentorship</Translate>
            </p>
            <Heading as="h1" className={styles.title}>
              <Translate
                id="mentorship.hero.title"
                values={{
                  grades: (
                    <Accent underline>
                      <Translate id="mentorship.hero.accent">
                        Grade 10 to Grade 12
                      </Translate>
                    </Accent>
                  ),
                }}>
                {'Mentorship from {grades}'}
              </Translate>
            </Heading>
            <p className={styles.lead}>
              <Translate id="mentorship.hero.lead">
                We mentor students through two pipelines. In Grades 10 and 11
                we build the student's profile. In Grade 12 we build on that
                profile to work through scholarships, majors and university
                selection.
              </Translate>
            </p>
            <div className={styles.actions}>
              <Button to={MENTORSHIP_MAILTO} icon="mail">
                <Translate id="mentorship.cta.button">
                  Ask about mentorship
                </Translate>
              </Button>
            </div>
          </div>
        </header>

        <div className={styles.container}>
          <Pipeline
            id="grades-10-11"
            eyebrow={
              <Translate id="mentorship.p1.eyebrow">
                Pipeline 1 · Grades 10 & 11
              </Translate>
            }
            title={
              <Translate id="mentorship.p1.title">
                Two tracks, one profile
              </Translate>
            }
            lead={
              <Translate id="mentorship.p1.lead">
                Two tracks run in parallel. Together they build the student's
                profile, the core of this pipeline.
              </Translate>
            }>
            <Bars bars={TRACKS} layout="parallel" />
          </Pipeline>

          <Pipeline
            id="grade-12"
            eyebrow={
              <Translate id="mentorship.p2.eyebrow">
                Pipeline 2 · Grade 12
              </Translate>
            }
            title={
              <Translate id="mentorship.p2.title">
                Building on the profile
              </Translate>
            }
            lead={
              <Translate id="mentorship.p2.lead">
                Students in this pipeline already have a profile from Pipeline
                1. We build on it to cover scholarships, majors and university
                selection.
              </Translate>
            }>
            <Bars bars={STEPS} layout="sequence" />
          </Pipeline>

          <section
            className={clsx(ui.card, styles.section, styles.contact)}
            aria-labelledby="contact">
            <IconChip icon="mail" tint="green" />
            <div className={styles.contactText}>
              <Heading as="h2" id="contact" className={styles.contactTitle}>
                <Translate id="mentorship.contact.title">
                  Interested in mentorship?
                </Translate>
              </Heading>
              <p className={styles.sectionLead}>
                <Translate id="mentorship.contact.description">
                  Email us, and tell us which grade the student is in.
                </Translate>
              </p>
            </div>
            <Button to={MENTORSHIP_MAILTO} variant="soft">
              <Translate id="mentorship.cta.button">
                Ask about mentorship
              </Translate>
            </Button>
          </section>
        </div>
      </main>
    </Layout>
  );
}
