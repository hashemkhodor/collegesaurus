/**
 * One academic-year control in the navbar, for whichever docs section you are
 * in.
 *
 * Docusaurus' `docsVersionDropdown` is bound to a single docsPluginId, and this
 * site has two docs plugins (universities, scholarships). Declaring one per
 * plugin puts two dropdowns side by side, only one of which is ever meaningful.
 * This resolves the plugin from the current route instead, and renders nothing
 * off docs pages.
 */
import type {ReactNode} from 'react';
import {useActivePlugin} from '@docusaurus/plugin-content-docs/client';
import DocsVersionDropdownNavbarItem from '@theme/NavbarItem/DocsVersionDropdownNavbarItem';
import type {Props as DocsVersionDropdownProps} from '@theme/NavbarItem/DocsVersionDropdownNavbarItem';

type Props = Omit<DocsVersionDropdownProps, 'docsPluginId' | 'items'>;

export default function DocsYearDropdown(props: Props): ReactNode {
  const activePlugin = useActivePlugin();

  if (!activePlugin) {
    return null;
  }

  return (
    <DocsVersionDropdownNavbarItem
      {...props}
      docsPluginId={activePlugin.pluginId}
      // Spread without defaults inside the component, so omitting them throws.
      dropdownItemsBefore={[]}
      dropdownItemsAfter={[]}
      // Inherited from DropdownNavbarItem's props but recomputed internally
      // and applied after the spread, so this value is never used.
      items={[]}
    />
  );
}
