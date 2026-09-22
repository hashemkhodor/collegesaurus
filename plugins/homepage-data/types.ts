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

export type HomepageData = {
  /** Build time, so server and client agree on what "upcoming" means. */
  generatedAt: string;
  universities: HomeUniversity[];
  scholarships: HomeDoc[];
  totals: {
    universities: number;
    scholarships: number;
    programs: number | null;
  };
};
