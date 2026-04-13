import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Collegesaurus',
  tagline: 'Your guide to universities and scholarships in Lebanon',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://hashemkhodor.github.io',
  baseUrl: '/collegesaurus/',

  organizationName: 'hashemkhodor',
  projectName: 'collegesaurus',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ar'],
    localeConfigs: {
      en: {label: 'English', direction: 'ltr', htmlLang: 'en-US'},
      ar: {label: 'العربية', direction: 'rtl', htmlLang: 'ar-LB'},
    },
  },

  presets: [
    [
      'classic',
      {
        // Docs are provided by two named plugin instances below.
        docs: false,
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexBlog: true,
        language: ['en', 'ar'],
        docsRouteBasePath: ['universities', 'scholarships'],
        docsDir: ['universities', 'scholarships'],
        docsPluginIdForPreferredVersion: 'universities',
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'universities',
        path: 'universities',
        routeBasePath: 'universities',
        sidebarPath: './sidebars/universities.ts',
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'scholarships',
        path: 'scholarships',
        routeBasePath: 'scholarships',
        sidebarPath: './sidebars/scholarships.ts',
      },
    ],
  ],

  themeConfig: {
    // image: 'img/social-card.jpg', // TODO: add a custom social card
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Collegesaurus',
      items: [
        {
          type: 'docSidebar',
          docsPluginId: 'universities',
          sidebarId: 'universitiesSidebar',
          position: 'left',
          label: 'Universities',
        },
        {
          type: 'docSidebar',
          docsPluginId: 'scholarships',
          sidebarId: 'scholarshipsSidebar',
          position: 'left',
          label: 'Scholarships',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
        {
          type: 'docsVersionDropdown',
          docsPluginId: 'universities',
          position: 'right',
        },
        {
          type: 'docsVersionDropdown',
          docsPluginId: 'scholarships',
          position: 'right',
        },
        {type: 'localeDropdown', position: 'right'},
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Guide',
          items: [
            {label: 'Universities', to: '/universities/intro'},
            {label: 'Scholarships', to: '/scholarships/intro'},
          ],
        },
        {
          title: 'More',
          items: [
            {label: 'Blog', to: '/blog'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Collegesaurus. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
