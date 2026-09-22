import {translate} from '@docusaurus/Translate';
import type {Deadline} from './types';

/**
 * Hand-maintained until the pipeline carries structured dates: the application
 * windows on the content pages are free text in a different shape per
 * university, and most of them have passed.
 *
 * Every entry needs an official source and the date it was last checked. Rows
 * drop off on their own once they close, so a stale list empties rather than
 * misleading anyone. Entries whose institution has no page in a given build are
 * dropped too.
 *
 * Leaving `opens` out means the row never claims to be open, which is how a
 * published-but-expected deadline should read.
 */
export function deadlines(): Deadline[] {
  return [
    {
      ref: {plugin: 'universities', id: 'aub'},
      title: translate({
        id: 'homepage.deadline.aubTransferSpring',
        message: 'Transfer applications, Spring 2026-27',
      }),
      opens: '2026-09-01',
      closes: '2026-10-31',
      sourceUrl: 'https://www.aub.edu.lb/admissions/Pages/Deadlines.aspx',
      verifiedOn: '2026-09-22',
    },
    {
      ref: {plugin: 'scholarships', id: 'mepi-tl'},
      title: translate({
        id: 'homepage.deadline.mepiTl',
        message: "Tomorrow's Leaders, expected window",
      }),
      opens: '2026-09-15',
      closes: '2026-11-25',
      sourceUrl: 'https://www.tomorrowsleadersprogram.org/timeline/',
      verifiedOn: '2026-09-22',
    },
    {
      ref: {plugin: 'scholarships', id: 'stipendium-hungaricum'},
      title: translate({
        id: 'homepage.deadline.stipendiumHungaricum',
        message: 'Next call, expected deadline',
      }),
      closes: '2027-01-15',
      sourceUrl: 'https://stipendiumhungaricum.hu/apply_timeline/',
      verifiedOn: '2026-09-22',
    },
  ];
}
