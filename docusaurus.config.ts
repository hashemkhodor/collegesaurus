import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
// @ts-expect-error — local ESM plugin without types
import rehypeTableDataLabels from './src/remark/rehypeTableDataLabels.mjs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Collegesaurus',
  tagline: 'Your guide to universities and scholarships in Lebanon',
  favicon: 'img/logo.svg',

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
        blogRouteBasePath: 'stories',
        blogDir: 'stories',
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
        admonitions: {},
        editUrl:
          'https://github.com/hashemkhodor/collegesaurus/edit/main/',
        editLocalizedFiles: true,
        rehypePlugins: [rehypeTableDataLabels],
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
        editUrl:
          'https://github.com/hashemkhodor/collegesaurus/edit/main/',
        editLocalizedFiles: true,
        rehypePlugins: [rehypeTableDataLabels],
      },
    ],
  ],

  customFields: {
    // URL of the Collegesaurus AI Streamlit app that the floating chat
    // bubble iframes in. Defaults to the live Streamlit Cloud deployment so
    // a plain `npm start` already embeds the real chatbot. Override with
    // CHAT_URL=http://localhost:8501 when iterating on the chatbot locally.
    chatUrl:
      process.env.CHAT_URL || 'https://collegesaurus-ai.streamlit.app',
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
        {type: 'localeDropdown', position: 'right'},
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Guide',
          items: [
            {label: 'Universities', to: '/universities/aub'},
            {label: 'Scholarships', to: '/scholarships/life'},
          ],
        },
        {
          title: 'More',
          items: [
            {label: 'Stories', to: '/stories'},
          ],
        },
        {
          title: 'Contribute',
          items: [
            {
              label: 'Suggest a correction',
              href: 'https://github.com/hashemkhodor/collegesaurus/issues/new?template=inaccurate-info.yml',
            },
            {
              label: 'Suggest a scholarship',
              href: 'https://github.com/hashemkhodor/collegesaurus/issues/new?template=new-scholarship.yml',
            },
            {
              label: 'Share your experience',
              href: 'https://github.com/hashemkhodor/collegesaurus/issues/new?template=share-experience.yml',
            },
            {
              label: 'How to contribute',
              to: '/contribute',
            },
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
