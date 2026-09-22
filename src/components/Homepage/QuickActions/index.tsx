import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import {Icon, IconChip, type IconName, type Tint} from '../ui';
import {useDocsEntry} from '../hooks';
import styles from './styles.module.css';

type Action = {
  icon: IconName;
  tint: Tint;
  to: string;
  title: ReactNode;
  description: ReactNode;
};

function ActionCard({icon, tint, to, title, description}: Action) {
  return (
    <Link to={to} className={styles.action}>
      <IconChip icon={icon} tint={tint} size={56} />
      <span className={styles.kicker}>
        <Translate id="homepage.quick.kicker">Find a</Translate>
      </span>
      <span className={styles.title}>{title}</span>
      <span className={styles.description}>{description}</span>
      <Icon name="arrowRight" size={18} className={styles.arrow} />
    </Link>
  );
}

export default function QuickActions(): ReactNode {
  const universities = useDocsEntry('universities');
  const scholarships = useDocsEntry('scholarships');
  return (
    <div className={styles.panel}>
      <ActionCard
        icon="cap"
        tint="green"
        to={universities}
        title={
          <Translate id="homepage.quick.university.title">University</Translate>
        }
        description={
          <Translate id="homepage.quick.university.description">
            Explore universities in Lebanon
          </Translate>
        }
      />
      <ActionCard
        icon="book"
        tint="purple"
        to="#explore-by-major"
        title={<Translate id="homepage.quick.major.title">Major</Translate>}
        description={
          <Translate id="homepage.quick.major.description">
            Discover programs you will love
          </Translate>
        }
      />
      <ActionCard
        icon="star"
        tint="orange"
        to={scholarships}
        title={
          <Translate id="homepage.quick.scholarship.title">
            Scholarship
          </Translate>
        }
        description={
          <Translate id="homepage.quick.scholarship.description">
            Fund your future education
          </Translate>
        }
      />
    </div>
  );
}
