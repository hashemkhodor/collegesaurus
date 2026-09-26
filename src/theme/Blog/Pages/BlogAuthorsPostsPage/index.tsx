import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import Translate from '@docusaurus/Translate';
import {
  PageMetadata,
  HtmlClassNameProvider,
  ThemeClassNames,
} from '@docusaurus/theme-common';
import {
  useBlogAuthorPageTitle,
  BlogAuthorNoPostsLabel,
} from '@docusaurus/theme-common/internal';
import {useBlogMetadata} from '@docusaurus/plugin-content-blog/client';
import SearchMetadata from '@theme/SearchMetadata';
import AuthorSocials from '@theme/Blog/Components/Author/Socials';
import type {Props} from '@theme/Blog/Pages/BlogAuthorsPostsPage';
import {ArrowLink} from '@site/src/components/Homepage/ui';
import StoriesPage, {
  StoryGrid,
  pageStyles,
} from '@site/src/components/Stories/StoriesPage';

export default function BlogAuthorsPostsPage({
  author,
  items,
  listMetadata,
}: Props): ReactNode {
  const title = useBlogAuthorPageTitle(author);
  const {authorsListPath} = useBlogMetadata();
  return (
    <HtmlClassNameProvider
      className={clsx(
        ThemeClassNames.wrapper.blogPages,
        ThemeClassNames.page.blogAuthorsPostsPage,
      )}>
      <PageMetadata title={title} />
      <SearchMetadata tag="blog_authors_posts" />
      <StoriesPage
        eyebrow={<Translate id="stories.author.eyebrow">Author</Translate>}
        title={author.name}
        lead={author.description}
        hero={
          <>
            <div className={pageStyles.authorLine}>
              {author.imageURL && (
                <img
                  src={author.imageURL}
                  alt=""
                  width={56}
                  height={56}
                  className={pageStyles.avatar}
                />
              )}
              {author.title && <p className={pageStyles.role}>{author.title}</p>}
            </div>
            <AuthorSocials author={author} />
            <ArrowLink to={authorsListPath}>
              <Translate id="stories.author.all">All authors</Translate>
            </ArrowLink>
          </>
        }>
        {items.length === 0 ? (
          <p className={pageStyles.empty}>
            <BlogAuthorNoPostsLabel />
          </p>
        ) : (
          <StoryGrid items={items} listMetadata={listMetadata} />
        )}
      </StoriesPage>
    </HtmlClassNameProvider>
  );
}
