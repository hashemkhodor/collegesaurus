/**
 * Register the site's custom navbar item types alongside the built-in ones.
 * Docs: https://docusaurus.io/docs/api/themes/configuration#navbar-custom-items
 */
import ComponentTypes from '@theme-original/NavbarItem/ComponentTypes';
import DocsYearDropdown from '@site/src/components/DocsYearDropdown';

export default {
  ...ComponentTypes,
  'custom-docsYear': DocsYearDropdown,
};
