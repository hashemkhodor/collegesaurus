/**
 * The site footer, built from the landing page's tokens and icon set instead of
 * Infima's dark footer. Its content lives here rather than in themeConfig.footer
 * so the section links follow the newest academic year and can carry icons.
 */
import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import isInternalUrl from '@docusaurus/isInternalUrl';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import ThemedImage from '@theme/ThemedImage';
import Wordmark from '@site/src/components/Wordmark';
import {ThemeClassNames} from '@docusaurus/theme-common';
import {useAlternatePageUtils} from '@docusaurus/theme-common/internal';
import {Icon, type IconName} from '@site/src/components/Homepage/ui';
import ui from '@site/src/components/Homepage/ui/ui.module.css';
import {
  useDocsEntry,
  useHomepageData,
} from '@site/src/components/Homepage/hooks';
import styles from './styles.module.css';

const REPO = 'https://github.com/hashemkhodor/collegesaurus';
const EMAIL = 'mailto:hashemkhoder1@gmail.com?subject=Collegesaurus';
const FORM =
  'https://docs.google.com/forms/d/e/1FAIpQLScUnf_qsTZXRX5CKP1KkK_Yy5VuhkUBjo988FNbqSzzYz301w/viewform?usp=dialog';

type FooterLink = {id: string; to: string; label: ReactNode};

const CONTRIBUTE: FooterLink[] = [
  {
    id: 'guide',
    to: '/contribute',
    label: (
      <Translate id="footer.contribute.guide">How to contribute</Translate>
    ),
  },
  {
    id: 'correction',
    to: FORM,
    label: (
      <Translate id="footer.contribute.correction">
        Suggest a correction
      </Translate>
    ),
  },
  {
    id: 'addition',
    to: FORM,
    label: (
      <Translate id="footer.contribute.addition">
        Add a scholarship or university
      </Translate>
    ),
  },
  {
    id: 'experience',
    to: FORM,
    label: (
      <Translate id="footer.contribute.experience">
        Share your experience
      </Translate>
    ),
  },
];

type Contact = {
  icon: IconName;
  href: string;
  label: string;
  newTab?: boolean;
};

function newTabLabel(): string {
  return translate({
    id: 'theme.IconExternalLink.ariaLabel',
    message: '(opens in new tab)',
    description: 'The ARIA label for the external link icon',
  });
}

function TextLink({to, children}: {to: string; children: ReactNode}): ReactNode {
  const outbound = !isInternalUrl(to);
  return (
    <Link to={to} className={styles.link}>
      {children}
      {outbound && (
        <span className={styles.outbound}>
          {' '}
          <Icon name="arrowUpRight" size={14} className={styles.arrow} />
          <span className={ui.visuallyHidden}> {newTabLabel()}</span>
        </span>
      )}
    </Link>
  );
}

function LinkGroup({
  title,
  links,
}: {
  title: ReactNode;
  links: FooterLink[];
}): ReactNode {
  return (
    <div>
      <h2 className={styles.title}>{title}</h2>
      <ul className={styles.list}>
        {links.map((link) => (
          <li key={link.id}>
            <TextLink to={link.to}>{link.label}</TextLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LocaleLinks(): ReactNode {
  const {
    i18n: {currentLocale, locales, localeConfigs},
  } = useDocusaurusContext();
  const {createUrl} = useAlternatePageUtils();
  const others = locales.filter((locale) => locale !== currentLocale);
  if (others.length === 0) {
    return null;
  }
  return (
    <ul className={styles.locales}>
      {others.map((locale) => {
        const {label, htmlLang} = localeConfigs[locale]!;
        return (
          <li key={locale}>
            {/* Each locale is its own build, so this must be a full page load. */}
            <Link
              to={`pathname://${createUrl({locale, fullyQualified: false})}`}
              target="_self"
              autoAddBaseUrl={false}
              lang={htmlLang}
              hrefLang={htmlLang}
              className={clsx(styles.link, styles.locale)}>
              <Icon name="globe" size={18} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function Footer(): ReactNode {
  const universities = useDocsEntry('universities');
  const scholarships = useDocsEntry('scholarships');
  // Build time, not the reader's clock, so server and client render one year.
  const year = new Date(useHomepageData().generatedAt).getUTCFullYear();
  const logo = {
    light: useBaseUrl('/img/brand/logo-icon.svg'),
    dark: useBaseUrl('/img/brand/logo-icon-dark.svg'),
  };
  const feed = useBaseUrl('/stories/rss.xml');

  const explore: FooterLink[] = [
    {
      id: 'universities',
      to: universities,
      label: (
        <Translate id="footer.explore.universities">Universities</Translate>
      ),
    },
    {
      id: 'scholarships',
      to: scholarships,
      label: (
        <Translate id="footer.explore.scholarships">Scholarships</Translate>
      ),
    },
    {
      id: 'stories',
      to: '/stories',
      label: <Translate id="footer.explore.stories">Stories</Translate>,
    },
  ];

  const contacts: Contact[] = [
    {
      icon: 'github',
      href: REPO,
      newTab: true,
      label: translate({
        id: 'footer.contact.github',
        message: 'Collegesaurus on GitHub',
      }),
    },
    {
      icon: 'mail',
      href: EMAIL,
      label: translate({
        id: 'footer.contact.email',
        message: 'Email Collegesaurus',
      }),
    },
    {
      icon: 'rss',
      href: feed,
      label: translate({
        id: 'footer.contact.feed',
        message: 'Stories RSS feed',
      }),
    },
  ];

  return (
    <footer
      className={clsx(ThemeClassNames.layout.footer.container, styles.footer)}>
      <div className={styles.container}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Link to="/" className={styles.home}>
              <ThemedImage sources={logo} alt="" width={32} height={32} />
              <Wordmark className={styles.wordmark} />
            </Link>
            <p className={styles.tagline}>
              <Translate id="footer.tagline">
                A free, student-built guide to universities and scholarships
                in Lebanon.
              </Translate>
            </p>
            <ul className={styles.contacts}>
              {contacts.map(({icon, href, label, newTab}) => (
                <li key={icon}>
                  <a
                    href={href}
                    title={label}
                    target={newTab ? '_blank' : undefined}
                    rel={newTab ? 'noopener noreferrer' : undefined}
                    className={styles.contact}>
                    <Icon name={icon} size={20} />
                    <span className={ui.visuallyHidden}>
                      {label}
                      {newTab && ` ${newTabLabel()}`}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <LinkGroup
            title={<Translate id="footer.explore.title">Explore</Translate>}
            links={explore}
          />
          <LinkGroup
            title={
              <Translate id="footer.contribute.title">Contribute</Translate>
            }
            links={CONTRIBUTE}
          />
        </div>
        <div className={styles.bottom}>
          <ul className={styles.legal}>
            <li>
              <Translate id="footer.copyright" values={{year}}>
                {'© {year} Collegesaurus'}
              </Translate>
            </li>
            <li>
              <TextLink to={`${REPO}/blob/main/LICENSE`}>
                <Translate id="footer.license">MIT License</Translate>
              </TextLink>
            </li>
          </ul>
          <p className={styles.disclaimer}>
            <Translate id="footer.disclaimer">
              An independent student project, not affiliated with any
              university or scholarship provider.
            </Translate>
          </p>
          <LocaleLinks />
        </div>
      </div>
    </footer>
  );
}
