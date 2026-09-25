/** Shape of the global data published by the homepage-data plugin. */

export type HomeDoc = {
  id: string;
  permalink: string;
  /** "AUB": the part of the title before the dash, never shown with it. */
  shortName: string;
  /** "American University of Beirut" */
  fullName: string;
  contentYear: string | null;
};

export type HomeUniversity = HomeDoc & {
  /** Null when the MajorsTable format drifted and nothing could be counted. */
  programCount: number | null;
};

/** A dated row from a page's application section, as that page shows it. */
export type HomeDeadline = {
  ref: {plugin: 'universities' | 'scholarships'; id: string};
  /** The row's own label: a term, round or stage. */
  title: string;
  /** YYYY-MM-DD, or null when the page gives no full opening date. */
  opens: string | null;
  closes: string;
  kind: 'application' | 'scholarship';
};

export type HomepageData = {
  /** Build time, so server and client agree on what "upcoming" means. */
  generatedAt: string;
  universities: HomeUniversity[];
  scholarships: HomeDoc[];
  /** Upcoming deadlines read from the pages themselves, soonest first. */
  deadlines: HomeDeadline[];
  totals: {
    universities: number;
    scholarships: number;
    programs: number | null;
  };
};
