# drive_sync — the content contract

Google Drive is the source of truth. This pipeline reads it and writes the MDX
the Docusaurus site builds from. Nothing it emits is committed.

## Drive layout

```
<content root>/
  v2/
    universities/
      2025-2026/
        aub/
          info.docx          # required — prose + metadata, English
          info.ar.docx       # optional — the Arabic page
          majors.xlsx        # required for universities
          majors.ar.xlsx     # optional
          attachments/       # optional — PDFs, images; published as-is
    scholarships/
      2025-2026/
        fulbright/
          info.docx
          info.ar.docx
```

The year folder is the unit of versioning: each one becomes a Docusaurus docs
version. The newest year serves the bare URL (`/universities/aub`); older years
serve `/universities/2025-2026/aub`.

A slug with no folder for the newest year is **carried forward** from its most
recent year and gets a staleness banner, so a live URL never 404s and never
silently shows old tuition as current.

Anything in a slug folder that is not one of the recognized filenames is
reported and ignored — put supporting files in `attachments/`.

## Inside `info.docx`

The first `Heading 1` must be `Metadata`, followed by a two-column key/value
table:

| Key | Value |
|---|---|
| `title` | Page title (required) |
| `sidebar_label` | Short name for the sidebar (required) |
| `sidebar_position` | Sort order (required today; see below) |
| `apply_url` | Application portal, **https only** (optional) |
| `page_h1` | Rich page heading; falls back to `title` (optional) |

Every later `Heading 1` is a section, in document order. Sections are **open**:
a heading the registry does not know still renders, under its own text. The
canonical six (Faculty, Application, Tuition, Scholarships, Requirements,
Contacts) get localized headings and are warned about when missing.

Write section headings in either language — `Faculty`, `الكلية`, or
`الكلية (Faculty)` all resolve.

The academic year is taken from the folder path, so do **not** write
`Tuition (AY 2025-26)`; just `Tuition`.

## Deadlines

The landing page's "Upcoming deadlines" card and calendar are read from the
pages at build time, so a deadline shows there once its page states it in a
table:

- **Universities:** in the Application section, a table with a **Closes**
  column (or Deadline / Last day; `يغلق` / `تُقفل`) and, if known, an
  **Opens** column. The first other column names the row, e.g.
  `Freshman – Regular (Fall 2027-28)`.
- **Scholarships:** the same table in the Application window section, or a
  `Stage | Date` table with a closing row, e.g.
  `Applications close | 25 November 2026` (`إقفال التقديم`).
- **Full dates only:** `Nov 30, 2026`, `30 November 2026` or
  `30 تشرين الثاني 2026`, optionally followed by a note in brackets. `TBA`,
  `Rolling`, `Mid-Jan 2027` or a date without a year stay on the page but
  never reach the calendar.
- A row named as a Scholarship or Financial aid (`منحة`, `مساعدات`) is shown
  as a scholarship; every other row is an application.

The page's own window cards read the same columns and dates, so what the page
marks as open is what the landing page lists. A deadline no page gives yet can
go in `src/data/homepage/deadlines.ts`; a page row for the same day replaces it.

The same deadlines go out as a calendar students can subscribe to
(`/deadlines.ics`, `/ar/deadlines.ics`), so a corrected date reaches their
calendars the next time their calendar app checks, usually within a day.

## Naming a component

Put a directive on its own line directly above a table:

```
@component: TuitionTable

| Faculty / School | USD per credit | Reference |
| ---------------- | -------------- | --------- |
| MSFEA            | 990            | https://… |
```

The header row becomes the field names, so the table renders as sortable,
responsive data instead of a static table. Arguments work too:
`@component: Callout variant=warning`.

A table with no directive still renders normally — directives are opt-in, and
can be added one page at a time.

If you mistype a component name, the page still renders as a plain table and
the build report tells you. Nothing an editor writes in Drive can break the
site.

Available components are listed in [`components.toml`](./components.toml).
Adding one is a React component in `src/components/` plus a row there.

## Changing how a Word style renders

[`mapping.toml`](./mapping.toml) maps Word styles to block kinds and section
headings to localized labels. Adding a style or a section is an edit to that
file — not to the parser. A style nobody has mapped renders as a paragraph and
is reported.

## Running it

```bash
# Validate the Drive tree without downloading or writing anything
python -m drive_sync --validate

# Full sync (what CI runs)
python -m drive_sync

# Work against a local copy, writing somewhere harmless
python -m drive_sync --content-root ./mirror --out-prefix /tmp/out

# Narrow it down
python -m drive_sync --year 2025-2026 --only aub
```

`--content-prefix` selects the tree under the content root (default `v2`; pass
`""` for the pre-v2 flat layout). Credentials come from
`GDRIVE_SERVICE_ACCOUNT_JSON` or `GDRIVE_SERVICE_ACCOUNT_JSON_FILE`, plus
`GDRIVE_CONTENT_ROOT_ID`.

`scripts/sync-test.sh` wraps sync + build; `scripts/sync-clean.sh` removes
everything generated.

## Known gaps

- `sidebar_position` is still authored by hand in every document, per locale
  and per year. It is slated to be derived from `sidebar_label`.
- Typed spreadsheet sheets (`programs`, `faculties`, `tuition`) for cross-year
  comparison are designed but not built; `majors.xlsx` is still the only sheet.
