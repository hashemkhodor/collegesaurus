# Collegesaurus

**Your guide to universities and scholarships in Lebanon.**

[Live Site](https://hashemkhodor.github.io/collegesaurus/)

Spot something wrong? [Report it](https://github.com/hashemkhodor/collegesaurus/issues/new?template=inaccurate-info.yml) | Know a university or scholarship we're missing? [Tell us](https://github.com/hashemkhodor/collegesaurus/issues/new?template=new-university.yml) | [General feedback](https://github.com/hashemkhodor/collegesaurus/issues/new?template=general-feedback.yml)

---

## About

All the Lebanese university and scholarship info you'd normally have to dig through a dozen websites to find — deadlines, tuition, requirements, financial aid, contacts — collected in one place. Bilingual (English + Arabic), open source, and always looking for contributors to keep things accurate.

## Features

- **Universities** — Detailed pages covering overview, majors, application requirements, tuition, scholarships, and contacts
- **Scholarships** — Eligibility, application windows, supported universities, benefits, and recipient contacts
- **Bilingual** — Full English and Arabic (RTL) support
- **Local search** — Search across all content, no external service needed
- **Open source** — Anyone can contribute corrections, updates, or new content

---

## Contributing

There are two ways to contribute, depending on your comfort level with GitHub.

### I just want to report something (no technical skills needed)

Open an issue using one of these templates — just fill in the fields:

- [Report inaccurate information](https://github.com/hashemkhodor/collegesaurus/issues/new?template=inaccurate-info.yml) — something on the site is wrong or outdated
- [Suggest a new university](https://github.com/hashemkhodor/collegesaurus/issues/new?template=new-university.yml) — a Lebanese university that should be covered
- [Suggest a new scholarship](https://github.com/hashemkhodor/collegesaurus/issues/new?template=new-scholarship.yml) — a scholarship available to Lebanese students
- [General feedback](https://github.com/hashemkhodor/collegesaurus/issues/new?template=general-feedback.yml) — ideas, suggestions, anything else

### I want to edit content directly

#### Setup

```bash
git clone https://github.com/hashemkhodor/collegesaurus.git
cd collegesaurus
npm install
npm run start        # Dev server at localhost:3000
```

#### Branch naming

Create a branch from `main` using this convention:

| Action | Branch name |
|--------|------------|
| Add a university | `feature/add-university-{name}` |
| Update a university | `feature/update-university-{name}` |
| Add a scholarship | `feature/add-scholarship-{name}` |
| Update a scholarship | `feature/update-scholarship-{name}` |

Examples: `feature/add-university-ndu`, `feature/update-scholarship-fulbright`

#### Content structure

Universities go in `universities/` and scholarships go in `scholarships/`. Each is a single `.mdx` file.

**University template** (5 sections):

```
---
sidebar_position: [next available number]
title: [Full University Name]
sidebar_label: [Abbreviation]
---

## Overview
## Majors
## Application
## Tuition & Scholarships
## Contacts
```

**Scholarship template** (6 sections):

```
---
sidebar_position: [next available number]
title: [Scholarship Name]
sidebar_label: [Short Name]
---

## Overview
## Grade & background requirements
## Application window
## Supported universities
## Benefits
## Contacts of recipients
```

Look at existing files like `universities/aub.mdx` or `scholarships/usaid-usp.mdx` for detailed examples of what goes under each section.

#### Keeping content up to date

Each file represents the **current** version of the information. When you update a page:

1. Add a "Last verified" badge at the top of the page (below the frontmatter):

   ```markdown
   > Last verified: April 2026
   ```

2. Add or update the **Changelog** section at the bottom of the page using a collapsible block:

   ```markdown
   ## Changelog

   <details>
   <summary>Previous updates</summary>

   - **April 2026** — Updated tuition fees, added new SAT minimum for Engineering
   - **January 2026** — Initial page

   </details>
   ```

This way readers can see when information was last checked and what changed, without needing separate files per year.

#### Submitting your changes

1. Commit your changes and push your branch
2. Open a pull request against `main`
3. Describe what you added or changed and link to official sources

Every factual claim should have a reference link to an official source. If you can't find a piece of data, mark it as `> TODO: [description]` rather than guessing.

---

## Development

```bash
npm run start                         # Dev server (English)
npm run start -- --locale ar          # Dev server (Arabic, RTL)
npm run build                         # Production build (all locales)
npm run serve                         # Serve the production build
npm run typecheck                     # TypeScript check
npm run clear                         # Clear cache (fix weird build issues)
```

## License

[MIT](LICENSE)

