# University page redesign: the Guidebook

The owner found the university page messy and overwhelming. After comparing four
directions on a phone-width board (0 Clean-up only, A Guidebook, B Tabs, C Questions)
they picked **A, the Guidebook**: one page, summary first, with sticky section
navigation and one card per section.

This folder holds a clickable mockup of it and a plan for the real build. Nothing
here is wired into the site. The Word documents and the drive_sync pipeline stay as
they are.

## Open the mockup

From the repository root:

```bash
python3 -m http.server 8765
```

Then open <http://127.0.0.1:8765/design/university-page/>. Opening `index.html`
straight from disk also works, because it uses plain scripts and relative paths into
`src/css/tokens.css` and `static/img/`.

All 14 universities are in the snapshot. Three show the range best:
- **AUB**, with lots of content, and the only page already updated for 2026-27.
- **AUST**, with thin content.
- **USJ**, a stress test with 31 faculty groups and four tuition tables.

The other 13 pages still carry 2025-26 content, so they open with the "Not yet
updated" notice, and their application dates show as closed.

To switch between them:
- **Desktop:** pick a university in the sidebar. The navbar's globe switches English
  and Arabic, and the moon/sun switches the theme.
- **Phone:** all three controls are in the ☰ menu.
- **URL:** parameters work too, for example `?u=aust&lang=ar&theme=dark`.

A line in the footer marks the page as a mockup. To see the phone layout, narrow the
window or use the browser's device mode.

## What changes for a student

These were measured on a 390×780 phone, counting screens from the top of the navbar.

On a phone the section chips work as tabs. Each tab is the header and facts plus one
section:

| | Today (whole page) | Guidebook on a phone, per tab |
|---|---|---|
| AUB | 45.0 screens | Programs 2.8 · Apply 3.5 · Tuition 2.8 · Scholarships 4.5 · Requirements 4.4 · Contact 2.9 |
| AUST | 22.8 | 1.9 to 3.5 |
| USJ | 53.5 | 3.3 to 6.6 (Tuition is the longest) |

From 761px up, the page is one scroll. At 390px, that full page would be 14.2 screens
for AUB (26.3 with everything opened), 9.2 for AUST and 21.0 for USJ. On today's
site, AUB's Application section starts on screen 17.5.

The application fee, the per-credit tuition range and an open application window
now show on the first screen, as key facts.

| What made it overwhelming | What the Guidebook does |
|---|---|
| The page opens with the full programs catalogue, one table per faculty | Programs become one searchable list with a faculty filter. The first 8 show; the rest open with "Show all". |
| No summary; the fee, tuition and deadline are buried in 20 tables | A header with the real logo, the year and Apply, then up to four derived facts, each linking to its section |
| Every section has the same weight, and "On this page" lists 22 entries | Six cards with an icon each, and a row of section chips that stays at the top of the screen and marks where you are |
| About 90 repeated "Link" / "Reference" cells | A reference column shared by every row becomes one "Source" line; otherwise a small ↗ per row |
| Two table styles; dates and phone numbers wrapping mid-value | One table style in three shapes (see below). Phones and emails become tap targets. |
| Application windows crammed into a narrow table; dates split over two lines, and 7 of AUB's 8 windows already closed | One row per window with its dates on one line. Open windows come first, and closed ones fold away. |
| The Apply and Ask AI pills cover the bottom of the phone screen | Apply moves into the header, the chips and the rail; Ask AI stays |
| A big yellow banner on 13 of 14 pages | The pipeline's own "Not yet updated for …" text becomes a compact notice under the name |
| The Arabic title's parentheses break | The Arabic name is the title; the English name is a separate, isolated line |

## The design

**By width.** The key facts appear in exactly one place at each width.

| Width | Layout |
|---|---|
| Up to 760px (phones) | navbar, header, 2×2 fact tiles, a pinned row of section chips ending in an Apply chip, then **one section at a time**. The chips act as tabs. |
| 761–996px | the same column, with every section as a card in one scroll |
| 997–1279px | the docs sidebar (14 universities), then the same column with the fact tiles in one row |
| 1280px and up | sidebar, main column, and a sticky "At a glance" rail with Apply, the facts, links to each section with the current one marked, and "Suggest a correction". The rail replaces "On this page". |

**Phone tabs.** Up to 760px wide, only the chosen section is shown under the pinned
chips.
- Tapping a chip swaps the section. If the chips are already pinned, the new
  section starts right under them; near the top, the content swaps in place.
- Scrolling up from any section leads straight back to the header and facts.
- The other sections stay in the page as `hidden="until-found"`. Ctrl+F in Chrome
  and Firefox can still find them and opens the matching tab.
- Fact tiles, deep links and search results open the right tab.
- Printing shows every section.
- The chip bar is opaque. The earlier translucent blur is a known flicker source
  for sticky elements on iPhone Safari.

**Header.**
- Built from the `title` front matter ("AUB — American University of Beirut"). If
  the H1's parenthetical differs from the short name (the English name on Arabic
  pages), it shows as a second, isolated line.
- A year chip ("2026–27 information"), or the staleness notice on carried-forward pages.
- Apply opens `apply_url` and names its host, so students know they are leaving the site.

**Sections.**
- The six canonical sections render as cards in document order, each with an icon.
- Sections are recognized from the localized H2 labels in `mapping.toml`. Unknown
  sections render as plain cards where they appear.
- The Faculty card is titled "Programs"; see decision 2.
- Headings stay real H2/H3/H4 elements, because the site search indexes headings
  and the text that follows them.

**Programs.**
- The prose before the first faculty stays at the top of the card.
- A search box and a faculty select filter rows *within* the faculty groups, so
  faculty headings and their anchors survive.
- Each row shows the program, the department when it adds something, a degree tag,
  the years, the credits and the language. A ↗ links to the program page.
- Rows past the first 8 are in the page but collapsed with `hidden="until-found"`,
  so Ctrl+F and anchor links still reach them.

**Application windows.** A table with a Closes / Deadline / Last day column (or
يغلق / تُقفل) becomes a list of windows.
- Each row shows the window's name, its dates on one line exactly as the editor wrote
  them, and the other columns (Decisions, Latest SAT, …) as small details underneath.
- A status label (Open now, N days left, Opens in N days, Closed) appears only when
  the row's closing date is a full date. "By end Dec 2025" or "November 30" get no
  label.
- Open and upcoming windows come first. When at least one is open, the closed ones
  fold behind "Show N closed windows".
- Closed windows are muted. When every window is closed (USJ today), they all stay
  visible.
- This is separate from the header's deadline fact, which still comes only from
  `deadlines.ts`.

**Tables.**
- The reference column (Reference, Source, Link, المرجع, …) is lifted out of the grid.
- Each table takes one of three shapes:
  - one column left: a list, with each row's link beside it;
  - two or three columns: label/value rows under a small header line;
  - four or more: a table with natural column widths.
- A four-plus-column table becomes stacked cards whenever its own space is under
  700px. It uses a CSS container query, so this covers phones and the three-column
  desktop layout. Cards drop "—" cells.
- Tables over 8 rows show 6, then "Show N more". The extra rows stay in the same
  table, so columns line up. The cost: Ctrl+F only finds those rows once they are
  open.
- A section with more than 3 subheadings and more than 14 rows collapses after its
  third subheading. That applies to AUB's scholarships and USJ's tuition.
- A collapsed group always starts at a heading, so a lead-in is never separated
  from its table.

**Lists.** A list whose every item starts with a bold term and a dash ("**Early
Merit** — Apply by October 31…") becomes term/description pairs: stacked on phones,
two columns on desktop.

**Notes and sources.**
- Blockquotes render as neutral notes, with no "not published" label, because not
  every note is that.
- "Reference:" lines become a small "Sources" row.

**Arabic.**
- The layout mirrors, arrows flip, and program names are isolated.
- English asides inside Arabic headings are isolated too, so their brackets survive
  a line break.
- Fact values and the year chip are pinned left to right, like data, unless the
  value itself is in Arabic script: LU's "500,000 ل.ل" keeps its right-to-left
  order. Prose and headings keep the natural bidi order, so "2025-2026" inside an
  Arabic heading reads right to left as it does on the live site; see decision 7.

**Behaviour.**
- Anchor links open whatever collapsed group holds their target.
- Printing opens everything, including closed windows and extra table rows, and
  hides the navigation, the rail, the chips and the pills.
- Everything works from the keyboard with a visible focus ring. Reduced motion is
  respected.

**Unchanged.** The navbar, the docs sidebar, the Ask AI bubble and the footer.

## Where the facts come from

Every fact is derived at build time from what the pipeline already emits, and left
out when the tables don't support it. `build_content.py` is a working prototype of
these rules.

| Fact | Rule | Coverage (of 14) |
|---|---|---|
| Programs | Count of `MajorsTable` rows (the same count the homepage cards use). "In N faculties" only when there are at most 12 groups. | 14 |
| Application fee | Application-section table whose first header is Fee / الرسم, first row mentioning application or admission | 12 |
| Tuition | Values from a "per credit" column, or the first per-credit row. Shown only when every value shares one currency and unit; flat yearly rows are skipped; "see the notes" if the section has notes. | 9 |
| Open window | Only from the hand-checked `src/data/homepage/deadlines.ts`, with the homepage's status rules. Never parsed from tables, whose dates are free text in 12 shapes. | 1 (AUB) |
| Contact | The admissions row of the Contacts table, else its first row with an email or phone | 14 |

`python3 design/university-page/build_content.py SYNC_DIR --report` prints the
per-university table. Arabic now derives the same values as English for all 14:
the rules know the Arabic headers and "ل.ل".

Two checks back this up:
- The script verifies that every link in the MDX survives parsing.
- A browser check confirmed that every unique link and every table cell of all 14
  universities, in both languages, is on the rendered page: 945 links and 1,645
  cells in English. The same check found no horizontal scroll and no clipped table
  at 320, 390, 768, 1024, 1280 and 1440px.

## Word editing stays the same

- **No new field, section or component.** The mockup uses only the front matter,
  sections, tables, lists, notes and majors rows the pipeline already emits.
  `mapping.toml` and `components.toml` are untouched.
- **Existing docs render as they are.** Reordering, the "Programs" title and the
  fact tiles are presentational choices made in the theme.
- **Two habits make pages better; neither is required.**
  - A section's first paragraph reads as its summary.
  - Don't refer to on-screen positions. Thirteen English docs, and eleven Arabic
    ones, say "the Apply Now button at the bottom-left of this page", which this
    layout no longer has.

## Decisions for the owner

1. **Floating Apply pill.** The mockup drops it: Apply is in the header, the chips
   and the rail, and the pill covered content on phones. Dropping it means editing
   that "bottom-left" sentence in 13 English and 11 Arabic Word docs. Keeping it
   means living with the overlap.
2. **"Faculty" or "Programs".** The card and chips say Programs. The build can
   relabel in the theme, or change the `faculty` label in `mapping.toml` so the H2
   says it too.
3. **Stable section anchors.** Today the Tuition anchor changes every year and
   language (`#tuition-ay-2026-2027`). The emitter could write `{/* #tuition */}`
   after each H2. Docusaurus 3.10 reads that form; the classic `{#tuition}` does not
   compile under `future.v4`. It is a one-line change editors never see, and
   optional.
4. **Search-result descriptions.** Docusaurus uses the first line after the H1, so
   the meta description is "Faculty", or the staleness text on carried-forward pages.
   The emitter could write a `description`. Optional.
5. **Docs sidebar.** It is the only way to browse universities, so the mockup keeps
   it. Hide it on university pages?
6. **External scholarships.** Scholarship pages already name the universities they
   fund: six name AUB (LASER, LIFE, MEPI-TL, Tomooh, ULYP, USAID-USP) and one names
   AUST (ULYP). A build-time match could list them on the university page. Inline
   list, link out, or skip?
7. **Arabic numbers.** Pin data values left to right as the mockup does, and keep
   prose natural? Worth an Arabic reader's look.
8. **Deadlines.** Only AUB has a hand-checked entry, so only AUB shows an open
   window. Is extending `deadlines.ts` per university acceptable upkeep, or should
   the tile stay rare?

## Plan for the real build

This is proposed and not started.

**Phase 1, the foundation.** It is useful whatever the layout.
- **`src/remark/remarkUniversitySections.mjs`**, registered only on the
  `universities` docs plugin. It:
  - wraps each H2 section in a section element with its key, matched against the
    `mapping.toml` labels;
  - lifts the staleness admonition into the header;
  - leaves headings as real headings.
- **Build-time facts.** Port the `build_content.py` rules to TypeScript, next to
  `plugins/homepage-data`, which already reads the emitted MDX to count programs.
  Publish them per doc.
- **Components** in `src/components/University/`: `Header`, `Facts`, `Section`,
  `ProgramExplorer` (replaces `MajorsTable` through `MDXComponents`), `SmartTable`
  (plain markdown tables inside university sections), `Note` and `Sources`.
  `SmartTable` routes a table with a Closes / Deadline column to the windows list.
  That list should be the existing `ApplicationWindows` component, so a table marked
  with `@component: ApplicationWindows` in Word looks the same.
- **Layout.** A university branch in `src/theme/DocItem/Layout` renders the header,
  the facts and the chips, and swaps the TOC column for the rail from 1280px. Per
  decision 1, it drops `FloatingApplyButton` there.
- **Strings.** New strings go through `<Translate>` in `i18n/*/code.json`, including
  French once that lands.
- **Tests.**
  - Unit tests for the fact rules, reusing this snapshot's expectations.
  - `npm run build` with synced content.
  - The QA matrix below.

**Phase 2, the Guidebook structure.**
- The chips and their current-section marking, the rail, "Show all" with
  `until-found`, deep-link reveal and print.

**Sequencing.** Land this after `task/add-french-language`. That branch rewrites
`DocItem/Layout`, `MajorsTable`, `DataTable`, `ContentTables`, `DocVersionBadge` and
the emitter's front matter.

**Dependencies.** None; everything is React, CSS modules and the existing tokens
and icons.

**Risks.**
- **Safari and `hidden="until-found"`.** Safari does not support it yet, so there
  the collapsed rows fall back to plain `hidden` and Ctrl+F cannot reach them until
  "Show all". Chrome and Firefox are fine.
- **Deadline status needs the reader's clock.** It must render after mount, as the
  homepage does, to avoid a hydration mismatch.
- **Table heuristics.** They cover today's corpus. A new table shape falls back to a
  plain table, never to an error.

**QA matrix for the build:**
- universities: all 14
- languages: EN, AR and FR
- themes: light and dark
- widths: 320, 390, 768, 1024, 1280 and 1440
- behaviour: keyboard only, Ctrl+F into collapsed rows, anchor links, and print

## The other directions, for the record

All four were rendered with the same AUB content on a phone. The screen counts were
estimates.

| Direction | Idea | Phone length | Why it wasn't picked |
|---|---|---|---|
| 0 · Clean-up only | Today's order and headings; fix the parts (header, facts box, compact rows, tidier tables) | ≈ 16 screens | Deadlines and fees still sit after the whole programs list. No way to jump around on a phone. |
| B · Tabs | An Overview tab plus one tab per section | ≈ 3 (Overview) | Content is hidden behind tabs, which Ctrl+F, search links and print have to work around. Thin pages leave near-empty tabs. |
| C · Questions | Each section folds into a question, with the editor's first sentence as its answer | ≈ 2 folded | Every detail costs a tap. Summaries are only as good as each section's first paragraph. |

The Guidebook took the summary-first header from all of them, kept everything on
one page, and borrowed C's collapsing only for long lists.

**Patterns reviewed:**
- QS university pages: identity header, stat tiles, sticky section tabs.
- College Scorecard: identity block, three headline numbers, expandable sections.
- UCAS and Studyportals: key-information panel and an Apply action that stays in
  view.
- GOV.UK step-by-step.
- Apple spec sheets and Wikipedia infoboxes: label/value data.

## Files and regenerating

| File | What it is |
|---|---|
| `index.html` | The mockup page |
| `assets/mockup.css` | Layout and components; reads the real tokens from `src/css/tokens.css` |
| `assets/mockup.js` | Rendering and behaviour, as a plain script |
| `assets/content.js` | A generated snapshot of the 2026-2027 Drive sync of 2026-09-23 (all 14 universities, EN and AR) |
| `build_content.py` | The MDX-to-snapshot prototype, with the fact rules and the coverage report |

To refresh the snapshot, run from the repository root with Drive credentials in `.env`:

```bash
set -a; . ./.env; set +a
PYTHONPATH=scripts .venv/bin/python -m drive_sync --out-prefix /tmp/sync --cache-dir /tmp/drive-cache
python3 design/university-page/build_content.py /tmp/sync
```

**Limits of the mockup:**
- It renders in the browser from a snapshot: no server rendering and no real site
  search.
- The navbar links and the Ask AI bubble are inert.
