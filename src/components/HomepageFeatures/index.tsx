import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
  to: string;
  cta: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Universities in Lebanon',
    Svg: require('@site/static/img/icon-graduation.svg').default,
    description: (
      <>
        Majors, SAT and high-school requirements, deadlines, application types,
        documents, and contacts — for AUB, LAU, the Lebanese University, and
        more.
      </>
    ),
    to: '/universities/intro',
    cta: 'Browse universities',
  },
  {
    title: 'External Scholarships',
    Svg: require('@site/static/img/icon-scholarship.svg').default,
    description: (
      <>
        Scholarships from NGOs, Lebanese foundations, and international
        programs — eligibility, deadlines, documents, and how to apply.
      </>
    ),
    to: '/scholarships/intro',
    cta: 'Browse scholarships',
  },
  {
    title: 'Compare Side-by-Side',
    Svg: require('@site/static/img/icon-compare.svg').default,
    description: (
      <>
        Every university and scholarship page follows the same template, so
        you can quickly compare requirements, deadlines, and benefits.
      </>
    ),
    to: '/universities/intro',
    cta: 'See the overview',
  },
];

function Feature({title, Svg, description, to, cta}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
        <Link className="button button--primary" to={to}>
          {cta}
        </Link>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
