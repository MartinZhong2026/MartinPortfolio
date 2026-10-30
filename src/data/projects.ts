/**
 * The exact five-project roster. Order matters: Adapt to China is the flagship
 * and is always first. Do not add a sixth entry.
 */
export type ProjectSlug =
  | 'adapt-to-china'
  | 'meetfolio'
  | 'abtrace'
  | 'supplier-document-intelligence'
  | 'fanscope';

export type StatusLabel =
  | 'Live independent product'
  | 'Open-source desktop project'
  | 'Client prototype'
  | 'Research-stage project';

export type FilterGroup = 'independent' | 'open-source' | 'client' | 'research';

export interface Project {
  slug: ProjectSlug;
  title: string;
  /** Short label printed under the object in the pool. */
  poolLabel: string;
  /** Hover / focus caption in the pool. */
  caption: string;
  /** Card summary on /work. */
  summary: string;
  tags: string[];
  status: StatusLabel;
  category: string;
  period: string;
  filters: FilterGroup[];
  /** Accent colour used by the 3D object and the case-study page. */
  accent: string;
  accentInk: string;
  objectName: string;
  featured?: boolean;
  cardArt?: { src: string; alt: string; kind?: 'screenshot' | 'icon'; width?: number; height?: number };
  seoDescription: string;
}

export const projects: Project[] = [
  {
    slug: 'adapt-to-china',
    title: 'Adapt to China',
    poolLabel: 'Adapt to China',
    caption: 'A real-world service and AI guide for newcomers to China.',
    summary:
      'A live platform connecting guides, practical local data, AI assistance, and human support for newcomers to China.',
    tags: ['Product', 'Entrepreneurship', 'AI', 'User Research'],
    status: 'Live independent product',
    category: 'Independent venture · Live product and services',
    period: '2026 – Present',
    filters: ['independent'],
    accent: '#ef6f53',
    accentInk: '#9c3520',
    objectName: 'Round Adapt to China brand float',
    featured: true,
    cardArt: {
      src: '/assets/adapt/founder-blog-20261027.webp',
      alt: 'Adapt to China blog page shown on the portfolio project card.',
      kind: 'screenshot',
      width: 1660,
      height: 926,
    },
    seoDescription:
      'How Martin Zhong founded and built Adapt to China: guides, local directories, an AI assistant, House Planner, and scoped human support for newcomers to China.',
  },
  {
    slug: 'meetfolio',
    title: 'Meetfolio',
    poolLabel: 'Meetfolio',
    caption: 'An open-source workspace for interviews, transcription, and notes.',
    summary:
      'An open-source desktop workspace for recording, transcribing, referencing documents, and making sense of conversations.',
    tags: ['Desktop App', 'Open Source', 'Speech-to-Text'],
    status: 'Open-source desktop project',
    category: 'Independent · Open-source desktop application',
    period: '2026 – Present',
    filters: ['independent', 'open-source'],
    accent: '#2f8f5b',
    accentInk: '#1c5c39',
    objectName: 'Emerald-green Meetfolio book app icon',
    seoDescription:
      'Meetfolio: a local-first, open-source desktop workspace for recording interviews, transcribing speech, consulting reference documents, and organizing notes.',
  },
  {
    slug: 'abtrace',
    title: 'AbTrace',
    poolLabel: 'AbTrace',
    caption: 'Turning complex R&D processes into a navigable software prototype.',
    summary:
      'A scientific-workflow prototype connecting experimental stages, role-specific tasks, reviews, and traceable project changes.',
    tags: ['B2B', 'Product Discovery', 'Workflow Design'],
    status: 'Client prototype',
    category: 'B2B · Client-oriented discovery and prototype',
    period: '2026',
    filters: ['client'],
    accent: '#7a5ae0',
    accentInk: '#4b31a8',
    objectName: 'Dark-green AbTrace app icon',
    seoDescription:
      'AbTrace: an anonymized case study of a scientific-workflow prototype for antibody R&D teams — staged workflows, role views, reviews, and traceable changes.',
  },
  {
    slug: 'supplier-document-intelligence',
    title: 'Supplier Document Intelligence',
    poolLabel: 'Document AI',
    caption: 'Extract, check, review, and prepare supplier data with evidence.',
    summary:
      'An evidence-first workflow that turns messy quotations and specifications into reviewable procurement data and ERP drafts.',
    tags: ['Document AI', 'Evidence', 'Human Review'],
    status: 'Client prototype',
    category: 'B2B · AI document-processing prototype',
    period: '2026',
    filters: ['client'],
    accent: '#e9a030',
    accentInk: '#8a5a0b',
    objectName: 'White Document AI app icon',
    seoDescription:
      'Supplier Document Intelligence: an anonymized procurement-review prototype with source evidence, consistency checks, human approval, and controlled ERP drafts.',
  },
  {
    slug: 'fanscope',
    title: 'FanScope',
    poolLabel: 'FanScope',
    caption: 'Exploring research trends and smarter journal intelligence.',
    summary:
      'A research-intelligence workbench examining journal trends, methodological patterns, and source coverage across publishing systems.',
    tags: ['Research Tech', 'Data', 'AI'],
    status: 'Research-stage project',
    category: 'Research intelligence · Early-stage prototype',
    period: '2026 – Present',
    filters: ['research'],
    accent: '#14928f',
    accentInk: '#0b5c5a',
    objectName: 'Teal FanScope research app icon',
    seoDescription:
      'FanScope: a research-stage workbench for exploring journal patterns, research methods, and data provenance — with honest coverage limits.',
  },
];

export const projectBySlug = (slug: ProjectSlug): Project => {
  const p = projects.find((x) => x.slug === slug);
  if (!p) throw new Error(`Unknown project ${slug}`);
  return p;
};

export const nextProject = (slug: ProjectSlug): Project => {
  const i = projects.findIndex((x) => x.slug === slug);
  return projects[(i + 1) % projects.length];
};

export const filterLabels: { id: 'all' | FilterGroup; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'independent', label: 'Independent' },
  { id: 'open-source', label: 'Open Source' },
  { id: 'client', label: 'Client Work' },
  { id: 'research', label: 'Research' },
];
