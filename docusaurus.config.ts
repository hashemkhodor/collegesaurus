import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
// @ts-expect-error — local ESM plugin without types
import rehypeTableDataLabels from './src/remark/rehypeTableDataLabels.mjs';
import remarkGuidebook from './src/remark/remarkGuidebook.mjs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Collegesaurus',
  tagline: 'Your guide to universities and scholarships in Lebanon',
  favicon: 'img/logo.svg',

  future: {
    v4: true,
  },

  url: 'https://collegesaurus.org',
  baseUrl: '/',

  organizationName: 'hashemkhodor',
  projectName: 'collegesaurus',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ar'],
    localeConfigs: {
      en: {label: 'English', direction: 'ltr', htmlLang: 'en-US'},
      ar: {label: 'العربية', direction: 'rtl', htmlLang: 'ar'},
    },
  },

  presets: [
    [
      'classic',
      {
        // Docs are provided by two named plugin instances below.
        docs: false,
        blog: {
          path: 'stories',
          routeBasePath: 'stories',
          blogTitle: 'Stories',
          blogDescription:
            'First-hand experiences from students who navigated Lebanese higher education and external scholarships.',
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
          rehypePlugins: [rehypeTableDataLabels],
        },
        pages: {
          rehypePlugins: [rehypeTableDataLabels],
        },
        theme: {
          customCss: ['./src/css/custom.css', './src/css/tokens.css'],
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    // Path spelled out to the file: plugin paths go through require.resolve,
    // which would not find a directory holding only index.ts.
    './plugins/homepage-data/index.ts',
    // Publishes /chatbot/corpus.json and /chatbot/version.json for the
    // Collegesaurus AI chatbot (collegesaurus-ai repo).
    './plugins/chatbot-corpus/index.ts',
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexBlog: true,
        language: ['en', 'ar'],
        docsRouteBasePath: ['universities', 'scholarships'],
        docsDir: ['universities_versioned_docs', 'scholarships_versioned_docs'],
        blogRouteBasePath: 'stories',
        blogDir: 'stories',
        docsPluginIdForPreferredVersion: 'universities',
        // Decorative nodes are not content: without this the table sort glyphs
        // and every "↗" land in the index and open most snippets.
        ignoreCssSelectors: ['[aria-hidden="true"]'],
        // Near-miss matching only adds noise on a corpus this small.
        fuzzyMatchingDistance: 0,
        // The navbar's quick list; the search page ranks a much larger pool.
        searchResultLimits: 10,
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'universities',
        path: 'universities',
        routeBasePath: 'universities',
        sidebarPath: './sidebars/universities.ts',
        admonitions: {},
        remarkPlugins: [remarkGuidebook],
        rehypePlugins: [rehypeTableDataLabels],
        // Every academic year is a version, written by `python -m drive_sync`
        // into universities_versioned_docs/. There is deliberately no "current"
        // version: with includeCurrentVersion the newest year would be served
        // at /universities/next/ and every existing URL would move.
        includeCurrentVersion: false,
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'scholarships',
        path: 'scholarships',
        routeBasePath: 'scholarships',
        sidebarPath: './sidebars/scholarships.ts',
        admonitions: {},
        remarkPlugins: [[remarkGuidebook, {kind: 'scholarship'}]],
        rehypePlugins: [rehypeTableDataLabels],
        // Every academic year is a version, written by `python -m drive_sync`
        // into scholarships_versioned_docs/. There is deliberately no "current"
        // version: with includeCurrentVersion the newest year would be served
        // at /scholarships/next/ and every existing URL would move.
        includeCurrentVersion: false,
      },
    ],
  ],

  customFields: {
    // URL of the Collegesaurus AI chat page that the floating chat bubble
    // iframes in. Production sets it through the CHAT_URL Actions variable;
    // the default is the same Fly.io app, so an unset variable still opens it.
    // Locally: CHAT_URL=http://localhost:8000 (see collegesaurus-ai's
    // chatbot/README.md).
    chatUrl: process.env.CHAT_URL || 'https://collegesaurus-ai.fly.dev',
  },

  themeConfig: {
    // image: 'img/social-card.jpg', // TODO: add a custom social card
    colorMode: {
      respectPrefersColorScheme: true,
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: false,
      },
    },
    navbar: {
      title: 'Collegesaurus',
      logo: {
        alt: 'Collegesaurus logo',
        src: 'img/logo.svg',
      },
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
        {to: '/stories', label: 'Stories', position: 'left'},
        {to: '/contribute', label: 'Contribute', position: 'left'},
        {type: 'custom-docsYear', position: 'right'},
        {type: 'localeDropdown', position: 'right'},
      ],
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
