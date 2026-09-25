import type {ReactNode} from 'react';
import clsx from 'clsx';
import {ThemeClassNames} from '@docusaurus/theme-common';
import {isActiveSidebarItem} from '@docusaurus/plugin-content-docs/client';
import Link from '@docusaurus/Link';
import isInternalUrl from '@docusaurus/isInternalUrl';
import IconExternalLink from '@theme/Icon/ExternalLink';
import type {Props} from '@theme/DocSidebarItem/Link';
import SidebarTile from './Tile';

export default function DocSidebarItemLink({item, onItemClick, activePath, level, index, ...props}: Props): ReactNode {
  const {href, label, className, autoAddBaseUrl, docId} = item;
  const isActive = isActiveSidebarItem(item, activePath);
  const isInternalLink = isInternalUrl(href);
  const slug = docId?.split('/').pop() ?? href.split('/').filter(Boolean).pop() ?? label;
  return (
    <li
      className={clsx(
        ThemeClassNames.docs.docSidebarItemLink,
        ThemeClassNames.docs.docSidebarItemLinkLevel(level),
        'menu__list-item',
        className,
      )}
      key={label}>
      <Link
        className={clsx('menu__link', {'menu__link--active': isActive})}
        autoAddBaseUrl={autoAddBaseUrl}
        aria-current={isActive ? 'page' : undefined}
        to={href}
        {...(isInternalLink && {onClick: onItemClick ? () => onItemClick(item) : undefined})}
        {...props}>
        {level === 1 ? <SidebarTile slug={slug} label={label} /> : null}
        <span className="menu-label" title={label}>
          {label}
        </span>
        {!isInternalLink && <IconExternalLink />}
      </Link>
    </li>
  );
}
