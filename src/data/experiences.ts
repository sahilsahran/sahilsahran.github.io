import rawData from "./experiences.json";

export type ExperienceFile = {
  name: string;
  path: string;
  type: "pdf" | "image" | "video" | "youtube";
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

/** Turns any YouTube link (watch, youtu.be, shorts) into a privacy-friendly embed URL */
export function toYouTubeEmbed(url: string): string {
  const match = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  const id = match ? match[1] : url;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}

export const EXPERIENCES: Experience[] = rawData as Experience[];

/** Deduplicated, sorted list of all skills across experiences */
export const ALL_SKILLS: string[] = [
  ...new Set(EXPERIENCES.flatMap((e) => e.skills)),
].sort();

/** All unique experience types */
export const ALL_TYPES: string[] = [
  ...new Set(EXPERIENCES.map((e) => e.type)),
];
