# Collegesaurus

**Your guide to universities and scholarships in Lebanon.**

[Live Site](https://hashemkhodor.github.io/collegesaurus/)

Spot something wrong? [Report it](https://github.com/hashemkhodor/collegesaurus/issues/new?template=inaccurate-info.yml) | Know a university or scholarship we're missing? [Tell us](https://github.com/hashemkhodor/collegesaurus/issues/new?template=new-university.yml) | [General feedback](https://github.com/hashemkhodor/collegesaurus/issues/new?template=general-feedback.yml)

---

## About

All the Lebanese university and scholarship info you'd normally have to dig through a dozen websites to find — deadlines, tuition, requirements, financial aid, contacts — collected in one place. Bilingual (English + Arabic), open source, and always looking for contributors to keep things accurate.

## Features

- **Universities** — Detailed pages covering programs, application windows and fees, tuition, scholarships, requirements, and contacts. Every program row links to its official catalog/program page; each page has a floating **Apply** button that opens the university's portal.
- **Scholarships** — Eligibility, application windows, supported universities, benefits, and recipient contacts
- **Bilingual** — Full English and Arabic (RTL) support, with content mirrored byte-for-byte for tables
- **Sortable program tables** — Built-in `<MajorsTable>` MDX component with sortable columns and direct links to each program
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

**University template** (5 sections + `<MajorsTable>` for programs):

```mdx
---
sidebar_position: [alphabetical position; mirror the value across en + ar]
title: [Abbreviation] — [Full University Name]
sidebar_label: [Abbreviation]
apply_url: [direct link to the university's online application portal]
---

# [Full University Name] ([Abbreviation])

## Faculty
[short prose: # of programs, # of faculties, campus(es), credit system, accreditations]

### Faculty of [Name] ([code](faculty-page-url))
[1–2 lines describing the faculty: duration, accreditation, branches]

<MajorsTable
  faculty="[ABBR + FACULTY-CODE]"
  rows={[
    {program: 'Program Name', degree: 'BA/BS/BBA/...', department: 'Faculty Department', credits: 96, years: 3, language: 'EN', source: 'https://.../program-page'},
    ...
  ]}
/>

## Application
### Application Windows  [table of term -> deadline -> reference]
### Application Price    [table of fee -> amount -> reference]

## Scholarships
### Tuition (AY 2025-26)  [per-credit / per-year rate table with references]
### University-offered scholarships  [name -> coverage -> eligibility -> reference]

## Requirements
### SAT / English proficiency
### High-school grades
### Documents (or program-specific entrance exams, language proficiency, etc.)

## Contacts
[table of office -> phone -> email -> notes]
[Mailing address as bold prose]
```

**`apply_url`** drives a floating **Apply** button rendered at the bottom-left of every university page. Use the most direct admissions/portal URL the university publishes — verify it returns HTTP 200 before committing.

**`<MajorsTable>`** is the canonical way to list programs. Each row shape:

| Field        | Required | Notes |
|--------------|----------|-------|
| `program`    | yes      | Program name as the university writes it |
| `degree`     | no       | e.g. `BA`, `BS`, `BBA`, `BE`, `MD`, `Diploma` |
| `department` | no       | Free-form string, e.g. `FAS Computer Science` |
| `credits`    | no       | Number; the table sorts numerically |
| `years`      | no       | Number; indicative duration |
| `language`   | no       | e.g. `EN`, `FR`, `AR`, `EN/FR`. The Language column auto-hides when no row sets it |
| `source`     | no       | Direct URL to the program's official page or catalog sheet |

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

Look at existing files for detailed examples — `universities/aub.mdx` (large multi-faculty), `universities/haigazian.mdx` (small private), `universities/lu.mdx` (public, French BMD) — and `scholarships/usaid-usp.mdx`.

**Arabic mirror.** Every university file at `universities/<x>.mdx` has a translated mirror at `i18n/ar/docusaurus-plugin-content-docs-universities/current/<x>.mdx`. Mirror `<MajorsTable>` blocks **byte-for-byte** (rows are not translated — column headers swap automatically based on locale); translate only the prose, section headers, and table-cell labels in non-program tables.

**References are mandatory.** Every factual claim — tuition rate, deadline, fee, contact number, ranking — must include a reference link in the same row/sentence. If a claim can't be sourced, mark it as `> TODO: [description]` rather than guessing. Run an HTTP audit before committing — a quick `curl -sk -o /dev/null -w "%{http_code}" -L <url>` per link catches the broken ones.

#### Submitting your changes

1. Commit your changes and push your branch
2. Open a pull request against `main`
3. Describe what you added or changed and link to official sources

The PR description should call out any **TODO blockquotes** that remained (info you couldn't source) and the result of your link audit.

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
