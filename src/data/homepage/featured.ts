/**
 * Order for the "Popular universities" strip, by enrolment and how often these
 * come up for students choosing a school. Anything missing follows in the
 * pipeline's own order, so a new university still shows up on its own.
 */
export const FEATURED_UNIVERSITIES = [
  'aub',
  'lu',
  'lau',
  'usj',
  'usek',
  'ndu',
  'bau',
  'liu',
];

export function featuredFirst<T extends {id: string}>(universities: T[]): T[] {
  const rank = new Map(FEATURED_UNIVERSITIES.map((id, index) => [id, index]));
  const position = (item: T) =>
    rank.get(item.id) ?? FEATURED_UNIVERSITIES.length;
  return [...universities].sort((a, b) => position(a) - position(b));
}
