import {useEffect, useRef, useState, type ReactNode} from 'react';
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

type Bar = {
  id: string;
  icon: IconName;
  tone: 'solid' | 'soft';
  title: ReactNode;
};

const TRACKS: Bar[] = [
  {
    id: 'sat',
    icon: 'pencil',
    tone: 'solid',
    title: <Translate id="mentorship.tracks.sat">SAT tutoring</Translate>,
  },
  {
    id: 'selection',
    icon: 'cap',
    tone: 'soft',
    title: (
      <Translate id="mentorship.tracks.selection">
        University & major selection guidance
      </Translate>
    ),
  },
];

const STEPS: Bar[] = [
  {
    id: 'scholarships',
    icon: 'wallet',
    tone: 'solid',
    title: (
      <Translate id="mentorship.steps.scholarships">Scholarships</Translate>
    ),
  },
  {
    id: 'majors',
    icon: 'book',
    tone: 'solid',
    title: <Translate id="mentorship.steps.majors">Majors</Translate>,
  },
  {
    id: 'universities',
    icon: 'university',
    tone: 'solid',
    title: (
      <Translate id="mentorship.steps.universities">
        University selection
      </Translate>
    ),
  },
];

type Reveal = 'static' | 'idle' | 'run';

// Bars render filled until hydration, so the timeline still reads without JS.
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
        if (!entry) {
          return;
        }
        // Plays whenever it scrolls into view; resets once fully off screen.
        if (entry.intersectionRatio >= 0.4) {
          requestAnimationFrame(() => setState('run'));
        } else if (!entry.isIntersecting) {
          setState('idle');
        }
      },
      {threshold: [0, 0.4]},
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, state] as const;
}

function TimelineBar({bar, className}: {bar: Bar; className: string}) {
  return (
    <div className={clsx(styles.bar, styles[bar.tone], className)}>
      <Icon name={bar.icon} size={18} className={styles.barIcon} />
      <span className={styles.barTitle}>{bar.title}</span>
    </div>
  );
}

const TRACK_SLOTS = [styles.sat, styles.selection];
const STEP_SLOTS = [styles.scholarships, styles.majors, styles.universities];

function Timeline(): ReactNode {
  const [ref, state] = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={styles.timeline} data-reveal={state}>
      <span className={clsx(styles.gridline, styles.col10)} aria-hidden="true" />
      <span className={clsx(styles.gridline, styles.col11)} aria-hidden="true" />
      <span className={clsx(styles.gridline, styles.col12)} aria-hidden="true" />

      <span className={clsx(styles.phase, styles.phase1)}>
        <Translate id="mentorship.timeline.p1">Pipeline 1</Translate>
      </span>
      <span className={clsx(styles.phase, styles.phase2)}>
        <Translate id="mentorship.timeline.p2">Pipeline 2</Translate>
      </span>
      <span className={clsx(styles.tick, styles.col10)}>
        <Translate id="mentorship.timeline.grade10">Grade 10</Translate>
      </span>
      <span className={clsx(styles.tick, styles.col11)}>
        <Translate id="mentorship.timeline.grade11">Grade 11</Translate>
      </span>
      <span className={clsx(styles.tick, styles.col12)}>
        <Translate id="mentorship.timeline.grade12">Grade 12</Translate>
      </span>

      <span className={clsx(styles.lane, styles.lane1)}>
        <Translate id="mentorship.timeline.lane1">Grades 10 & 11</Translate>
      </span>
      {TRACKS.map((bar, i) => (
        <TimelineBar key={bar.id} bar={bar} className={TRACK_SLOTS[i]!} />
      ))}

      <span className={styles.handoff} aria-hidden="true" />
      <span className={styles.profile}>
        <Icon name="document" size={18} />
        <Translate id="mentorship.profile.title">Student profile</Translate>
      </span>

      <span className={clsx(styles.lane, styles.lane2)}>
        <Translate id="mentorship.timeline.lane2">Grade 12</Translate>
      </span>
      {STEPS.map((bar, i) => (
        <TimelineBar key={bar.id} bar={bar} className={STEP_SLOTS[i]!} />
      ))}
    </div>
  );
}

function Pipeline({
  id,
  eyebrow,
  title,
  lead,
}: {
  id: string;
  eyebrow: ReactNode;
  title: ReactNode;
  lead: ReactNode;
}): ReactNode {
  return (
    <section className={clsx(ui.card, styles.pipeline)} aria-labelledby={id}>
      <p className={ui.eyebrow}>{eyebrow}</p>
      <Heading as="h3" id={id} className={styles.pipelineTitle}>
        {title}
      </Heading>
      <p className={styles.sectionLead}>{lead}</p>
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
          <section className={styles.section} aria-labelledby="how">
            <p className={ui.eyebrow}>
              <Translate id="mentorship.timeline.eyebrow">How it works</Translate>
            </p>
            <Heading as="h2" id="how" className={styles.sectionTitle}>
              <Translate id="mentorship.timeline.title">
                Two pipelines, one timeline
              </Translate>
            </Heading>
            <Timeline />
            <div className={styles.pipelines}>
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
                    Two tracks run in parallel. Together they build the
                    student's profile, the core of this pipeline.
                  </Translate>
                }
              />
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
                    Students in this pipeline already have a profile from
                    Pipeline 1. We build on it to cover scholarships, majors
                    and university selection.
                  </Translate>
                }
              />
            </div>
          </section>

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
