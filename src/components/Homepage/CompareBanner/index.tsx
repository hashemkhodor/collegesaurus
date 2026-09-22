import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import Heading from '@theme/Heading';
import {Icon} from '../ui';
import {useDocsEntry} from '../hooks';
import BannerArt from './BannerArt';
import styles from './styles.module.css';

export default function CompareBanner(): ReactNode {
  const entry = useDocsEntry('universities');
  return (
    <section className={styles.banner}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>
          <Translate id="homepage.compare.eyebrow">
            Every school, one template
          </Translate>
        </p>
        <Heading as="h2" className={styles.title}>
          <Translate
            id="homepage.compare.title"
            values={{
              accent: (
                <span className={styles.accent}>
                  <Translate id="homepage.compare.titleAccent">
                    matters.
                  </Translate>
                </span>
              ),
            }}>
            {'Compare what actually {accent}'}
          </Translate>
        </Heading>
        <p className={styles.body}>
          <Translate id="homepage.compare.body">
            Tuition, programs, requirements and deadlines, laid out the same way
            for every university.
          </Translate>
        </p>
        <Link to={entry} className={styles.cta}>
          <Translate id="homepage.compare.cta">Browse universities</Translate>
          <Icon name="arrowRight" size={18} className={styles.ctaArrow} />
        </Link>
      </div>
      <BannerArt />
    </section>
  );
}
