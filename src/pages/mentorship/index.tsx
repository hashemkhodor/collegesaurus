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
  tone: 'solid' | 'soft' | 'outline' | 'result';
  title: ReactNode;
};

const TRACKS: Bar[] = [
  {
    id: 'goals',
    icon: 'check',
    tone: 'outline',
    title: (
      <Translate id="mentorship.tracks.goals">
        Setting goals: grades, SAT, activities
      </Translate>
    ),
  },
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
        Choosing a university and major
      </Translate>
    ),
  },
];

const APPLY: Bar = {
  id: 'apply',
  icon: 'university',
  tone: 'solid',
  title: (
    <Translate id="mentorship.apply.bar">
      Apply: universities, majors, scholarships
    </Translate>
  ),
};

const RESULTS: Bar = {
  id: 'results',
  icon: 'star',
  tone: 'result',
  title: <Translate id="mentorship.results">Your results</Translate>,
};

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

const TRACK_SLOTS = [styles.goals, styles.sat, styles.selection];

function Timeline(): ReactNode {
  const [ref, state] = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={styles.timeline} data-reveal={state}>
      <span className={clsx(styles.gridline, styles.g10)} aria-hidden="true" />
      <span className={clsx(styles.gridline, styles.g11)} aria-hidden="true" />
      <span className={clsx(styles.gridline, styles.g12)} aria-hidden="true" />

      <span className={clsx(styles.phase, styles.phase1)}>
        <Translate id="mentorship.timeline.p1">Pipeline 1</Translate>
      </span>
      <span className={clsx(styles.phase, styles.phase2)}>
        <Translate id="mentorship.timeline.p2">Pipeline 2</Translate>
      </span>
      <span className={clsx(styles.tick, styles.g10)}>
        <Translate id="mentorship.timeline.grade10">Grade 10</Translate>
      </span>
      <span className={clsx(styles.tick, styles.g11)}>
        <Translate id="mentorship.timeline.grade11">Grade 11</Translate>
      </span>
      <span className={clsx(styles.tick, styles.g12)}>
        <Translate id="mentorship.timeline.grade12">Grade 12</Translate>
      </span>
      <span className={clsx(styles.subtick, styles.build)}>
        <Translate id="mentorship.timeline.build">Build your profile</Translate>
      </span>
      <span className={clsx(styles.subtick, styles.apply)}>
        <Translate id="mentorship.timeline.apply">Apply</Translate>
      </span>
      <span className={clsx(styles.subtick, styles.resultsCol)}>
        <Translate id="mentorship.timeline.results">Results</Translate>
      </span>

      <span className={clsx(styles.lane, styles.lane1)}>
        <span className={styles.laneTitle}>
          <Translate id="mentorship.timeline.lane1">Grades 10 & 11</Translate>
        </span>
        <span className={styles.laneSub}>
          <Translate id="mentorship.timeline.lane1.sub">
            Build your profile
          </Translate>
        </span>
      </span>
      {TRACKS.map((bar, i) => (
        <TimelineBar key={bar.id} bar={bar} className={TRACK_SLOTS[i]!} />
      ))}

      <span className={styles.handoff} aria-hidden="true" />
      <span className={styles.profile}>
        <Icon name="document" size={18} />
        <Translate id="mentorship.profile.title">Your profile</Translate>
      </span>

      <span className={clsx(styles.lane, styles.lane2)}>
        <span className={styles.laneTitle}>
          <Translate id="mentorship.timeline.lane2">Grade 12</Translate>
        </span>
        <span className={styles.laneSub}>
          <Translate id="mentorship.timeline.lane2.sub">
            Apply. New students welcome.
          </Translate>
        </span>
      </span>
      <TimelineBar bar={APPLY} className={styles.applyBar} />
      <TimelineBar bar={RESULTS} className={styles.resultsBar} />
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
          'Collegesaurus mentorship. Grades 10 and 11: SAT tutoring and help choosing a university and major. Grade 12: help applying to majors, universities and scholarships.',
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
                We help you get into university with scholarships. In Grades 10
                and 11, you build your profile. In Grade 12, we help you apply
                and get your results.
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
                From Grade 10 to your results
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
                    Build your profile
                  </Translate>
                }
                lead={
                  <Translate id="mentorship.p1.lead">
                    We set goals with you for your school grades, the SAT
                    and extracurricular activities, so you're ready to apply
                    to universities, majors and scholarships. Alongside that,
                    you get SAT tutoring and help choosing a university and
                    major. Together, they build your profile.
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
                    Apply and get your results
                  </Translate>
                }
                lead={
                  <Translate id="mentorship.p2.lead">
                    We help you apply to majors, universities and
                    scholarships. Then you get your results. Coming from
                    Pipeline 1? You start with your profile. New in Grade 12?
                    You can join too.
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
                  Email us and tell us what grade you're in.
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
