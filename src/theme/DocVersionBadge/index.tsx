/**
 * Show the year a page's content is actually from, not the version it was
 * published into.
 *
 * A slug with no folder for the newest year is carried forward, so its page
 * lives in the new version while its figures are older. Docusaurus labels the
 * badge from version metadata, which would then claim the new year over old
 * tuition — contradicting the staleness banner right below it.
 *
 * The pipeline writes the true year into `content_year` frontmatter, and this
 * prefers it. Pages that are genuinely up to date have content_year equal to
 * their version, so nothing changes for them.
 */
import type {ReactNode} from 'react';
import clsx from 'clsx';
import Translate from '@docusaurus/Translate';
import {ThemeClassNames} from '@docusaurus/theme-common';
import {useDoc, useDocsVersion} from '@docusaurus/plugin-content-docs/client';

type Props = {className?: string};

export default function DocVersionBadge({className}: Props): ReactNode {
  const versionMetadata = useDocsVersion();
  const {frontMatter} = useDoc() as {frontMatter: {content_year?: string}};

  if (!versionMetadata.badge) {
    return null;
  }

  const versionLabel = frontMatter.content_year ?? versionMetadata.label;
  const isStale =
    frontMatter.content_year != null &&
    frontMatter.content_year !== versionMetadata.label;

  return (
    <span
      className={clsx(
        className,
        ThemeClassNames.docs.docVersionBadge,
        'badge',
        isStale ? 'badge--warning' : 'badge--secondary',
      )}
      title={
        isStale
          ? `Content from ${frontMatter.content_year}; not yet updated for ${versionMetadata.label}`
          : undefined
      }>
      <Translate
        id="theme.docs.versionBadge.label"
        values={{versionLabel}}>
        {'Version: {versionLabel}'}
      </Translate>
    </span>
  );
}
