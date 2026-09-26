import type {ReactNode} from 'react';
import clsx from 'clsx';
import Translate, {translate} from '@docusaurus/Translate';
import Heading from '@theme/Heading';
import Layout from '@theme/Layout';
import Button from '@site/src/components/ui/Button';
import {
  Accent,
  ArrowLink,
  Icon,
  IconChip,
  type IconName,
  type Tint,
} from '@site/src/components/Homepage/ui';
import ui from '@site/src/components/Homepage/ui/ui.module.css';
import {
  DRIVE_URL,
  EDITOR_MAILTO,
  FORM_URL,
  SCHOLARSHIP_TEMPLATES_URL,
  UNIVERSITY_TEMPLATES_URL,
} from '@site/src/data/contribute';

import styles from './styles.module.css';

type Way = {
  icon: IconName;
  tint: Tint;
  title: ReactNode;
  description: ReactNode;
  to: string;
  cta: ReactNode;
};

const WAYS: Way[] = [
  {
    icon: 'alert',
    tint: 'orange',
    title: (
      <Translate id="contribute.ways.correction.title">
        Flag a correction
      </Translate>
    ),
    description: (
      <Translate id="contribute.ways.correction.description">
        A tuition figure looks off, a deadline moved, a contact changed?
        Point at what's wrong and where you saw better information. You don't
        have to fix it yourself.
      </Translate>
    ),
    to: FORM_URL,
    cta: (
      <Translate id="contribute.ways.correction.cta">Report a mistake</Translate>
    ),
  },
  {
    icon: 'upload',
    tint: 'green',
    title: (
      <Translate id="contribute.ways.add.title">
        Add a scholarship or university
      </Translate>
    ),
    description: (
      <Translate id="contribute.ways.add.description">
        Know a scholarship Lebanese students can apply to, or a school that
        should be listed? Fill in a small template and upload it.
      </Translate>
    ),
    to: '#add',
    cta: <Translate id="contribute.ways.add.cta">See what you need</Translate>,
  },
  {
    icon: 'bookOpen',
    tint: 'purple',
    title: (
      <Translate id="contribute.ways.story.title">Share your story</Translate>
    ),
    description: (
      <Translate id="contribute.ways.story.description">
        Got into a programme, won a scholarship, or learned something the hard
        way? Tell us and we may publish it as a story.
      </Translate>
    ),
    to: FORM_URL,
    cta: (
      <Translate id="contribute.ways.story.cta">Send us your experience</Translate>
    ),
  },
  {
    icon: 'users',
    tint: 'blue',
    title: (
      <Translate id="contribute.ways.editor.title">
        Become an editor
      </Translate>
    ),
    description: (
      <Translate id="contribute.ways.editor.description">
        Admissions officer, or a volunteer who wants to keep one page current?
        Ask for ongoing edit access to the right Drive folder.
      </Translate>
    ),
    to: EDITOR_MAILTO,
    cta: <Translate id="contribute.ways.editor.cta">Email us</Translate>,
  },
];

type Step = {title: ReactNode; description: ReactNode};

const STEPS: Step[] = [
  {
    title: <Translate id="contribute.steps.submit.title">You send it</Translate>,
    description: (
      <Translate id="contribute.steps.submit.description">
        Through the form, or straight into Drive if you're an editor.
      </Translate>
    ),
  },
  {
    title: (
      <Translate id="contribute.steps.review.title">We check it</Translate>
    ),
    description: (
      <Translate id="contribute.steps.review.description">
        The maintainer reviews submissions every few days and verifies each
        change against an official source.
      </Translate>
    ),
  },
  {
    title: (
      <Translate id="contribute.steps.live.title">It goes live</Translate>
    ),
    description: (
      <Translate id="contribute.steps.live.description">
        Approved changes appear after the next morning rebuild. You're credited
        the way you chose: by name, anonymously, or not at all.
      </Translate>
    ),
  },
];

type Rule = {id: string; text: ReactNode};

const RULES: Rule[] = [
  {
    id: 'metadata',
    text: (
      <Translate
        id="contribute.rules.metadata"
        values={{h1: <code># Metadata</code>}}>
        {'Every info.docx starts with a {h1} heading followed by a key/value table.'}
      </Translate>
    ),
  },
  {
    id: 'university',
    text: (
      <Translate id="contribute.rules.university">
        University pages keep their sections in this order: Introduction,
        Application, Tuition, Scholarships, Requirements, Contacts.
      </Translate>
    ),
  },
  {
    id: 'scholarship',
    text: (
      <Translate id="contribute.rules.scholarship">
        Scholarship pages only fix the Metadata block. Rename, reorder, add or
        remove the other sections freely.
      </Translate>
    ),
  },
  {
    id: 'majors',
    text: (
      <Translate id="contribute.rules.majors">
        majors.xlsx keeps its column headers; program, degree and faculty are
        required.
      </Translate>
    ),
  },
];

function Files({files}: {files: {name: string; purpose: ReactNode}[]}) {
  return (
    <ul className={styles.files}>
      {files.map((file) => (
        <li key={file.name} className={styles.file}>
          <Icon name="document" size={18} className={styles.fileIcon} />
          <span>
            <code>{file.name}</code>
            <span className={styles.filePurpose}>{file.purpose}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function Contribute(): ReactNode {
  const english = (
    <Translate id="contribute.files.info.en">Prose page, English</Translate>
  );
  const arabic = (
    <Translate id="contribute.files.info.ar">Prose page, Arabic</Translate>
  );
  return (
    <Layout
      title={translate({id: 'contribute.meta.title', message: 'Contribute'})}
      description={translate({
        id: 'contribute.meta.description',
        message:
          'How to help keep Collegesaurus accurate: flag a correction, add a page, share a story or join as an editor.',
      })}>
      <main className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.container}>
            <p className={clsx(ui.eyebrow, styles.eyebrow)}>
              <Translate id="contribute.hero.eyebrow">Contribute</Translate>
            </p>
            <Heading as="h1" className={styles.title}>
              <Translate
                id="contribute.hero.title"
                values={{accurate: <Accent underline>accurate</Accent>}}>
                {'Help keep Collegesaurus {accurate}'}
              </Translate>
            </Heading>
            <p className={styles.lead}>
              <Translate id="contribute.hero.lead">
                Collegesaurus is run by volunteers, and anyone can help. You
                don't need to know how to code, and most of these take less
                than five minutes.
              </Translate>
            </p>
            <div className={styles.actions}>
              <Button to={FORM_URL} icon="alert">
                <Translate id="contribute.hero.primary">
                  Flag a correction
                </Translate>
              </Button>
              <Button to={DRIVE_URL} variant="soft" icon="link">
                <Translate id="contribute.hero.secondary">
                  Browse the data
                </Translate>
              </Button>
            </div>
          </div>
        </header>

        <div className={styles.container}>
          <section className={styles.section} aria-labelledby="ways">
            <Heading as="h2" id="ways" className={styles.sectionTitle}>
              <Translate id="contribute.ways.title">Ways to help</Translate>
            </Heading>
            <ul className={styles.ways}>
              {WAYS.map((way) => (
                <li key={way.to + way.icon} className={clsx(ui.card, styles.way)}>
                  <IconChip icon={way.icon} tint={way.tint} />
                  <Heading as="h3" className={styles.wayTitle}>
                    {way.title}
                  </Heading>
                  <p className={styles.wayText}>{way.description}</p>
                  {way.to.startsWith('#') ? (
                    <ArrowLink to={way.to}>{way.cta}</ArrowLink>
                  ) : (
                    <Button to={way.to} variant="soft">
                      {way.cta}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section
            id="add"
            className={clsx(ui.card, styles.section, styles.addCard)}
            aria-labelledby="add-title">
            <Heading as="h2" id="add-title" className={ui.cardTitle}>
              <Translate id="contribute.add.title">
                Adding a page: what you'll need
              </Translate>
            </Heading>
            <p className={styles.sectionLead}>
              <Translate id="contribute.add.lead">
                Download the template, fill it in, and upload it through the
                form. One set of files per page, one file per language.
              </Translate>
            </p>

            <div className={styles.kinds}>
              <div className={styles.kind}>
                <Heading as="h3" className={styles.kindTitle}>
                  <Translate id="contribute.add.scholarship">
                    New scholarship
                  </Translate>
                  <span className={styles.count}>
                    <Translate id="contribute.add.scholarship.count">
                      2 files
                    </Translate>
                  </span>
                </Heading>
                <Files
                  files={[
                    {name: 'info.docx', purpose: english},
                    {name: 'info.ar.docx', purpose: arabic},
                  ]}
                />
                <Button to={SCHOLARSHIP_TEMPLATES_URL} variant="soft">
                  <Translate id="contribute.add.templates">
                    Open the templates
                  </Translate>
                </Button>
              </div>
              <div className={styles.kind}>
                <Heading as="h3" className={styles.kindTitle}>
                  <Translate id="contribute.add.university">
                    New university
                  </Translate>
                  <span className={styles.count}>
                    <Translate id="contribute.add.university.count">
                      4 files
                    </Translate>
                  </span>
                </Heading>
                <Files
                  files={[
                    {name: 'info.docx', purpose: english},
                    {name: 'info.ar.docx', purpose: arabic},
                    {
                      name: 'majors.xlsx',
                      purpose: (
                        <Translate id="contribute.files.majors.en">
                          Degree programmes, one row per major, English
                        </Translate>
                      ),
                    },
                    {
                      name: 'majors.ar.xlsx',
                      purpose: (
                        <Translate id="contribute.files.majors.ar">
                          Degree programmes, Arabic
                        </Translate>
                      ),
                    },
                  ]}
                />
                <Button to={UNIVERSITY_TEMPLATES_URL} variant="soft">
                  <Translate id="contribute.add.templates">
                    Open the templates
                  </Translate>
                </Button>
              </div>
            </div>

            <div className={styles.rules}>
              <Heading as="h3" className={styles.rulesTitle}>
                <Translate id="contribute.rules.title">
                  Keep the template's structure
                </Translate>
              </Heading>
              <p className={styles.rulesLead}>
                <Translate id="contribute.rules.lead">
                  The morning sync reads these files automatically, so don't
                  reshape them.
                </Translate>
              </p>
              <ul className={styles.checklist}>
                {RULES.map((rule) => (
                  <li key={rule.id}>
                    <Icon name="check" size={16} className={styles.check} />
                    <span>{rule.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className={styles.note}>
              <Icon name="info" size={18} className={styles.noteIcon} />
              <Translate id="contribute.add.signin">
                Uploading files requires you to sign in with Google.
              </Translate>
            </p>
            <Button to={FORM_URL} icon="upload">
              <Translate id="contribute.add.submit">
                Submit a scholarship or university
              </Translate>
            </Button>
          </section>

          <section className={styles.section} aria-labelledby="how">
            <Heading as="h2" id="how" className={styles.sectionTitle}>
              <Translate id="contribute.steps.title">How it works</Translate>
            </Heading>
            <ol className={styles.steps}>
              {STEPS.map((step, index) => (
                <li key={index} className={styles.step}>
                  <span className={styles.stepNumber} aria-hidden="true">
                    {index + 1}
                  </span>
                  <Heading as="h3" className={styles.stepTitle}>
                    {step.title}
                  </Heading>
                  <p className={styles.stepText}>{step.description}</p>
                </li>
              ))}
            </ol>
          </section>

          <section
            className={clsx(ui.card, styles.section, styles.source)}
            aria-labelledby="source">
            <IconChip icon="layers" tint="green" />
            <div className={styles.sourceText}>
              <Heading as="h2" id="source" className={styles.sourceTitle}>
                <Translate id="contribute.source.title">
                  Read the source
                </Translate>
              </Heading>
              <p className={styles.sectionLead}>
                <Translate id="contribute.source.description">
                  Every university and scholarship page is built from a plain
                  .docx or .xlsx file in a Google Drive folder. It's open for
                  reading without signing in, and the site is rebuilt from it
                  every morning around 7 AM Beirut time.
                </Translate>
              </p>
            </div>
            <Button to={DRIVE_URL} variant="soft">
              <Translate id="contribute.source.cta">Open the Drive folder</Translate>
            </Button>
          </section>

          <p className={styles.thanks}>
            <Translate id="contribute.thanks">
              Thank you. Every fix, however small, helps a student make a
              better-informed decision.
            </Translate>
          </p>
        </div>
      </main>
    </Layout>
  );
}
