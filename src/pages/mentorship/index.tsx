import type {ReactNode} from 'react';
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
  type Tint,
} from '@site/src/components/Homepage/ui';
import ui from '@site/src/components/Homepage/ui/ui.module.css';
import {MENTORSHIP_MAILTO} from '@site/src/data/mentorship';

import styles from './styles.module.css';

type Item = {id: string; icon: IconName; tint: Tint; title: ReactNode};

const TRACKS: Item[] = [
  {
    id: 'sat',
    icon: 'pencil',
    tint: 'green',
    title: <Translate id="mentorship.tracks.sat">SAT tutoring</Translate>,
  },
  {
    id: 'selection',
    icon: 'compass',
    tint: 'blue',
    title: (
      <Translate id="mentorship.tracks.selection">
        University & major selection guidance
      </Translate>
    ),
  },
];

const STEPS: Item[] = [
  {
    id: 'scholarships',
    icon: 'wallet',
    tint: 'purple',
    title: (
      <Translate id="mentorship.steps.scholarships">Scholarships</Translate>
    ),
  },
  {
    id: 'majors',
    icon: 'book',
    tint: 'orange',
    title: <Translate id="mentorship.steps.majors">Majors</Translate>,
  },
  {
    id: 'universities',
    icon: 'university',
    tint: 'blue',
    title: (
      <Translate id="mentorship.steps.universities">
        University selection
      </Translate>
    ),
  },
];

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

function ProfileCard({label}: {label: ReactNode}): ReactNode {
  return (
    <div className={styles.profile}>
      <IconChip icon="document" tint="green" size={40} />
      <span className={styles.profileText}>
        <span className={styles.profileLabel}>{label}</span>
        <span className={styles.profileTitle}>
          <Translate id="mentorship.profile.title">Student profile</Translate>
        </span>
      </span>
    </div>
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
            <div className={styles.parallel}>
              <ul className={styles.tracks}>
                {TRACKS.map((track) => (
                  <li key={track.id} className={clsx(ui.card, styles.node)}>
                    <IconChip icon={track.icon} tint={track.tint} />
                    <Heading as="h3" className={styles.nodeTitle}>
                      {track.title}
                    </Heading>
                  </li>
                ))}
              </ul>
              <div className={styles.merge} aria-hidden="true" />
              <ProfileCard
                label={
                  <Translate id="mentorship.p1.builds">Builds the</Translate>
                }
              />
            </div>
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
            <ol className={styles.flow}>
              <li className={styles.flowStart}>
                <ProfileCard
                  label={
                    <Translate id="mentorship.p2.starts">Starts from the</Translate>
                  }
                />
              </li>
              {STEPS.map((step) => (
                <li key={step.id} className={styles.flowItem}>
                  <Icon name="arrowRight" size={22} className={styles.flowArrow} />
                  <div className={clsx(ui.card, styles.node)}>
                    <IconChip icon={step.icon} tint={step.tint} />
                    <Heading as="h3" className={styles.nodeTitle}>
                      {step.title}
                    </Heading>
                  </div>
                </li>
              ))}
            </ol>
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
