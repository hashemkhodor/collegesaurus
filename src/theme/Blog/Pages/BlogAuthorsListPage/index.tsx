import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import {
  PageMetadata,
  HtmlClassNameProvider,
  ThemeClassNames,
} from '@docusaurus/theme-common';
import {translateBlogAuthorsListPageTitle} from '@docusaurus/theme-common/internal';
import SearchMetadata from '@theme/SearchMetadata';
import Heading from '@theme/Heading';
import type {Props} from '@theme/Blog/Pages/BlogAuthorsListPage';
import ui from '@site/src/components/Homepage/ui/ui.module.css';
import StoriesPage, {pageStyles} from '@site/src/components/Stories/StoriesPage';

export default function BlogAuthorsListPage({authors}: Props): ReactNode {
  const title: string = translateBlogAuthorsListPageTitle();
  return (
    <HtmlClassNameProvider
      className={clsx(
        ThemeClassNames.wrapper.blogPages,
        ThemeClassNames.page.blogAuthorsListPage,
      )}>
      <PageMetadata title={title} />
      <SearchMetadata tag="blog_authors_list" />
      <StoriesPage
        eyebrow={<Translate id="stories.hero.eyebrow">Stories</Translate>}
        title={title}>
        <ul className={pageStyles.people}>
          {authors.map((author) => (
            <li key={author.key} className={clsx(ui.card, pageStyles.person)}>
              {author.imageURL && (
                <img
                  src={author.imageURL}
                  alt=""
                  width={56}
                  height={56}
                  loading="lazy"
                  className={pageStyles.avatar}
                />
              )}
              <div>
                <Heading as="h2" className={pageStyles.personName}>
                  {author.page ? (
                    <Link
                      to={author.page.permalink}
                      className={clsx(ui.focusable, pageStyles.personLink)}>
                      {author.name}
                    </Link>
                  ) : (
                    author.name
                  )}
                </Heading>
                {author.title && (
                  <p className={pageStyles.personMeta}>{author.title}</p>
                )}
                <p className={pageStyles.personMeta}>
                  <Translate
                    id="stories.author.count"
                    values={{count: author.count ?? 0}}>
                    {'Stories: {count}'}
                  </Translate>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </StoriesPage>
    </HtmlClassNameProvider>
  );
}
