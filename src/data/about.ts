export const strengths = [
  { title: 'Find the real problem', description: 'Start with people, evidence and context. Discover the constraint that actually matters.', evidence: 'Housing needs become a budget, commute and service brief.', href: '/work/adapt-to-china/#journey' },
  { title: 'Make ideas tangible', description: 'Turn ambiguous requests into something people can try, question and improve.', evidence: 'AbTrace turns a module list into role-based research tasks.', href: '/work/abtrace/' },
  { title: 'Build with judgment', description: 'Use AI-assisted development with sources, failure paths and explicit human review.', evidence: 'A 20-question evaluation set shaped evidence-oriented AI answers.', href: '/work/adapt-to-china/#reliability' },
  { title: 'Stay with the details', description: 'Treat installation, recovery and the handoff as part of the product.', evidence: 'Meetfolio adds model checks, repair and a Windows installer.', href: '/work/meetfolio/' },
];
export const hikingRegions = ['Henan', 'Liaoning', 'Guangdong', 'Zhejiang', 'Jiangsu', 'Anhui', 'Hunan', 'Shandong', 'Hong Kong', 'Macau'];
export const lifePhotos = [
  { src: '/assets/about/salomon-city-run.jpg', width: 1024, height: 1536, title: 'Salomon City Run', detail: 'Running in Shanghai, one city route at a time.', alt: 'Martin taking part in Salomon City Run in Shanghai.', className: 'portrait', publicOk: true },
  { src: '/assets/about/jingan-10k.jpg', width: 1536, height: 1258, title: 'Jing’an 10 km · Shanghai', detail: 'A race, a medal, and a reason to keep running.', alt: 'Martin holding his medal at the Jing’an 10 km event.', className: 'race', publicOk: true },
  { src: '/assets/about/hong-kong-sketch.jpg', width: 1536, height: 957, title: 'Victoria Peak · June 2024', detail: 'My own pen sketch of Hong Kong. A way to look a little longer.', alt: 'Martin’s original ink sketch of the Hong Kong skyline at Victoria Peak in June 2024.', className: 'sketch', publicOk: true },
  { src: '/assets/about/shanghai-run-group.jpg', width: 1536, height: 1152, title: 'Running together', detail: null, alt: 'A running group at the Shanghai waterfront.', className: 'wide', publicOk: true }, // User-requested About gallery; confirm group-photo permission before public deployment.
  { src: '/assets/about/hiking-group.jpg', width: 1536, height: 1152, title: 'On the trail', detail: null, alt: 'A hiking group in a mountain valley.', className: 'hiking', publicOk: true }, // User-requested About gallery; confirm group-photo permission before public deployment.
];
export const lifeActivities = [
  { id: 'running', title: 'Running', line: 'Running gives me rhythm.', notes: ['Running in Shanghai, one city route at a time.', 'A race, a medal, and a reason to keep running.'] },
  { id: 'fitness', title: 'Fitness', line: 'I also enjoy strength training.', notes: [] },
  { id: 'hiking', title: 'Hiking', line: 'Hiking takes me somewhere unfamiliar.', notes: [`Trails across ${hikingRegions.length} provinces & regions, and the feeling of being a beginner somewhere unfamiliar.`] },
  { id: 'drawing', title: 'Drawing', line: 'Drawing makes me pay attention.', notes: ['My own pen sketch of Hong Kong. A way to look a little longer.'] },
];
/**
 * Layered visuals beside the story on About. Every image is a real project
 * screenshot, logo or personal drawing from public/. To add one, append an entry:
 * the collage reflows by itself. `kind` sets how it is framed and how wide it is.
 */
export interface CollageItem {
  kind: 'browser' | 'phone' | 'photo' | 'logo';
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  href?: string;
}
export const storyCollage: CollageItem[] = [
  { kind: 'browser', src: '/assets/adapt/live-homepage.jpg', width: 1700, height: 932, alt: 'Adapt to China homepage: “What do you need to figure out today?” with a search box and quick topics.', caption: 'Adapt to China · the live site', href: '/work/adapt-to-china/' },
  { kind: 'phone', src: '/assets/adapt/atc-ai-chat-20261027.webp', width: 900, height: 1671, alt: 'ATC AI on mobile: General and House Planner (Testing) modes, asking “What do you need help with in China?”', caption: 'The ATC AI assistant', href: '/work/adapt-to-china/' },
  { kind: 'photo', src: '/assets/about/hong-kong-sketch.jpg', width: 1536, height: 957, alt: 'Martin’s original ink sketch of the Hong Kong skyline at Victoria Peak in June 2024.', caption: 'My sketch · Victoria Peak', href: '/life/#gallery' },
  { kind: 'logo', src: '/assets/icons/adapt-to-china.png', width: 512, height: 512, alt: 'Adapt to China logo: the Oriental Pearl Tower and Shanghai skyline above the words Live, Learn, Belong.', caption: 'Live · Learn · Belong', href: '/work/adapt-to-china/' },
];
export const poolMetaphor = null as string | null; // TODO(Martin): approve “Learning a new place, with a little support.”
