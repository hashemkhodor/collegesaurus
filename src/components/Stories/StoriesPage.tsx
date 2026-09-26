import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import BlogListPaginator from '@theme/BlogListPaginator';
import type {Props as ListPageProps} from '@theme/BlogListPage';
import ui from '../Homepage/ui/ui.module.css';
import StoryCard from './StoryCard';
import styles from './page.module.css';

/** The hero band and container shared by every Stories page; there's no sidebar here, that stays on post pages. */
export default function StoriesPage({
  eyebrow,
  title,
  lead,
  hero,
  children,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  hero?: ReactNode;
  children: ReactNode;
}): ReactNode {
  return (
    <Layout>
      <main className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.container}>
            <p className={clsx(ui.eyebrow, styles.eyebrow)}>{eyebrow}</p>
            <Heading as="h1" className={styles.title}>
              {title}
            </Heading>
            {lead && <p className={styles.lead}>{lead}</p>}
            {hero}
          </div>
        </header>
        <div className={styles.container}>{children}</div>
      </main>
    </Layout>
  );
}

export function StoryGrid({
  items,
  listMetadata,
}: {
  items: ListPageProps['items'];
  listMetadata: ListPageProps['metadata'];
}): ReactNode {
  return (
    <>
      <ul className={styles.grid}>
        {items.map(({content}) => (
          <StoryCard
            key={content.metadata.permalink}
            metadata={content.metadata}
            image={content.frontMatter.image}
          />
        ))}
      </ul>
      <BlogListPaginator metadata={listMetadata} />
    </>
  );
}

export function TopicChips({
  tags,
  label,
}: {
  tags: readonly {label: string; permalink: string; count?: number}[];
  label: string;
}): ReactNode {
  if (tags.length === 0) return null;
  return (
    <nav className={styles.tags} aria-label={label}>
      {tags.map((tag) => (
        <Link key={tag.permalink} className={styles.tag} to={tag.permalink}>
          {tag.label}
          {tag.count !== undefined && (
            <span className={styles.chipCount}>{tag.count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}

export {styles as pageStyles};
