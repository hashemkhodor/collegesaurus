import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureProps = {
  icon: string;
  to: string;
  title: ReactNode;
  description: ReactNode;
  cta: ReactNode;
};

function Feature({icon, to, title, description, cta}: FeatureProps) {
  return (
    <Link to={to} className={styles.featureCard}>
      <div className={styles.featureIcon} aria-hidden="true">
        {icon}
      </div>
      <Heading as="h3" className={styles.featureTitle}>
        {title}
      </Heading>
      <p className={styles.featureDescription}>{description}</p>
      <span className={styles.featureCta}>
        {cta}
        <span aria-hidden="true" className={styles.featureCtaArrow}>
          →
        </span>
      </span>
    </Link>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className={styles.featuresInner}>
        <Heading as="h2" className={styles.featuresHeading}>
          <Translate id="homepage.features.heading">What you'll find</Translate>
        </Heading>
        <div className={styles.featureGrid}>
          <Feature
            icon="🎓"
            to="/universities/aub"
            title={
              <Translate id="homepage.features.universities.title">
                Universities in Lebanon
              </Translate>
            }
            description={
              <Translate id="homepage.features.universities.description">
                Majors, SAT and high-school requirements, deadlines, application
                types, documents, and contacts for AUB, LAU, the Lebanese
                University, and more.
              </Translate>
            }
            cta={
              <Translate id="homepage.features.universities.cta">
                Browse universities
              </Translate>
            }
          />
          <Feature
            icon="📚"
            to="/scholarships/life"
            title={
              <Translate id="homepage.features.scholarships.title">
                External scholarships
              </Translate>
            }
            description={
              <Translate id="homepage.features.scholarships.description">
                Scholarships from NGOs, Lebanese foundations, and international
                programs, with eligibility, deadlines, documents, and how to
                apply.
              </Translate>
            }
            cta={
              <Translate id="homepage.features.scholarships.cta">
                Browse scholarships
              </Translate>
            }
          />
        </div>
      </div>
    </section>
  );
}
