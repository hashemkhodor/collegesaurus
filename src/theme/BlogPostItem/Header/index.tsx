import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';
import BlogPostItemHeaderTitle from '@theme/BlogPostItem/Header/Title';
import ui from '@site/src/components/Homepage/ui/ui.module.css';
import Byline from '@site/src/components/Stories/Byline';
import {storyKind} from '@site/src/components/Stories/kind';
import styles from './styles.module.css';

export default function BlogPostItemHeader(): ReactNode {
  const {metadata} = useBlogPost();
  const {permalink, date, readingTime, authors} = metadata;
  const kind = storyKind(permalink);
  return (
    <header className={styles.header}>
      {kind && <p className={clsx(ui.eyebrow, styles.kind)}>{kind}</p>}
      <BlogPostItemHeaderTitle />
      <Byline authors={[]} date={date} readingTime={readingTime} />
      {authors.length > 0 && (
        <ul className={styles.authors}>
          {authors.map((author) => {
            const name = author.page ? (
              <Link to={author.page.permalink}>{author.name}</Link>
            ) : (
              author.name
            );
            return (
              <li key={author.key ?? author.name} className={styles.author}>
                {author.imageURL && (
                  <img
                    src={author.imageURL}
                    alt=""
                    width={48}
                    height={48}
                    className={styles.avatar}
                  />
                )}
                <span className={styles.text}>
                  <span className={styles.name}>{name}</span>
                  {author.title && (
                    <span className={styles.role}>{author.title}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </header>
  );
}
