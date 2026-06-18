import rawData from "./experiences.json";

export type ExperienceFile = {
  name: string;
  path: string;
  type: "pdf" | "image";
};

export type Experience = {
  id: string;
  title: string;
  company: string;
  location?: string;
  type: "Work" | "Project" | "Research";
  skills: string[];
  date: string;
  duration?: string;
  summary: string;
  details: string;
  files: ExperienceFile[];
};

export const EXPERIENCES: Experience[] = rawData as Experience[];

/** Deduplicated, sorted list of all skills across experiences */
export const ALL_SKILLS: string[] = [
  ...new Set(EXPERIENCES.flatMap((e) => e.skills)),
].sort();

/** All unique experience types */
export const ALL_TYPES: string[] = [
  ...new Set(EXPERIENCES.map((e) => e.type)),
];
