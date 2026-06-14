export type Experience = {
  id: string;
  title: string;
  company: string;
  type: 'Work' | 'Project' | 'Research';
  skills: string[];
  date: string;
  summary: string;
  details: string;
  files: { name: string; type: 'pdf' | 'image' }[];
};

export const EXPERIENCES: Experience[] = [
  {
    id: '1',
    title: 'Frontend Engineer Intern',
    company: 'Acme Corp',
    type: 'Work',
    skills: ['React', 'TypeScript', 'Node.js'],
    date: 'May – Aug 2024',
    summary: 'Built internal tooling dashboards serving 200+ daily users.',
    details: 'Led development of three internal dashboard applications using React and TypeScript. Reduced page load time by 40% through code splitting and lazy loading. Collaborated with the design team to implement a new component library, improving consistency across 12 product surfaces.',
    files: [{ name: 'internship-report.pdf', type: 'pdf' }],
  },
  {
    id: '2',
    title: 'ML Research Assistant',
    company: 'University of Toronto',
    type: 'Research',
    skills: ['Python', 'Machine Learning', 'PyTorch'],
    date: 'Sep 2023 – Apr 2024',
    summary: 'Researched transformer attention mechanisms for time-series data.',
    details: 'Assisted in a lab studying efficient attention mechanisms for long-sequence time-series forecasting. Implemented three baseline models from scratch in PyTorch, ran ablation studies across 6 datasets, and contributed to a workshop paper submitted to NeurIPS. Managed a dataset pipeline processing 50GB of sensor data.',
    files: [{ name: 'research-paper-draft.pdf', type: 'pdf' }, { name: 'poster.pdf', type: 'pdf' }],
  },
  {
    id: '3',
    title: 'Portfolio Website',
    company: 'Personal Project',
    type: 'Project',
    skills: ['React', 'TypeScript', 'Design'],
    date: 'Jun 2025',
    summary: 'This website — built with Vite, React 19, and Tailwind CSS v4.',
    details: 'Designed and engineered a personal portfolio with a focus on motion design and 3D web aesthetics. Features a custom 3D card component with mouse-tracking parallax, a physics-based panel transition system, and a responsive experience browser. Built with Vite, React 19, TypeScript, and Tailwind CSS v4.',
    files: [{ name: 'design-mockup.png', type: 'image' }],
  },
  {
    id: '4',
    title: 'Full-stack Developer',
    company: 'Startup XYZ',
    type: 'Work',
    skills: ['React', 'Node.js', 'TypeScript'],
    date: 'Jan – Apr 2024',
    summary: 'Shipped a B2B SaaS MVP from zero to 50 paying customers in 4 months.',
    details: 'Co-developed a B2B SaaS application for logistics routing optimization. Owned the full frontend and contributed to the Node.js API. Integrated Stripe for billing, built a real-time map interface using Mapbox GL, and set up a CI/CD pipeline on GitHub Actions. The product reached 50 paying customers within 4 months of launch.',
    files: [{ name: 'case-study.pdf', type: 'pdf' }],
  },
  {
    id: '5',
    title: 'Design Systems Library',
    company: 'Open Source',
    type: 'Project',
    skills: ['React', 'TypeScript', 'Design'],
    date: 'Aug 2023',
    summary: 'A composable component library with 40+ components and full a11y support.',
    details: 'Created and published an open-source React component library to npm, reaching 800+ downloads per month. Built with TypeScript, Radix UI primitives, and Tailwind CSS. Includes full keyboard navigation, ARIA compliance, and a Storybook documentation site. Components are used across 3 internal projects.',
    files: [{ name: 'docs-screenshot.png', type: 'image' }, { name: 'npm-stats.pdf', type: 'pdf' }],
  },
  {
    id: '6',
    title: 'NLP Sentiment Analysis Tool',
    company: 'Hackathon Project',
    type: 'Project',
    skills: ['Python', 'Machine Learning', 'React'],
    date: 'Nov 2023',
    summary: 'Won 2nd place at HackTheNorth. Real-time social media sentiment dashboard.',
    details: 'Built over 36 hours at HackTheNorth 2023 with a team of 3. A real-time sentiment analysis dashboard that ingests Twitter/X data, classifies posts using a fine-tuned DistilBERT model, and displays trends on an interactive React frontend. Placed 2nd overall out of 200+ teams.',
    files: [{ name: 'demo-video.pdf', type: 'pdf' }],
  },
];
