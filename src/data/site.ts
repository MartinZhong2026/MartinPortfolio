/**
 * Site-wide settings.
 *
 * Contact links are deliberately `null` until Martin confirms them.
 * The content brief says not to show dead buttons, so a `null` link is
 * never rendered. Fill these in to make them appear in the footer and in the About page contact block.
 */
export const site = {
  name: 'Martin Zhong',
  descriptor: 'Product Builder · AI Applications · Real-World Problems',
  tagline: 'I build useful things with AI.',
  intro:
    'I turn real-world problems into working products, from early discovery to prototypes, software, and real users.',
  /** Set to the production origin (no trailing slash) before deploying, e.g. 'https://martinzhong.com'. */
  origin: '',
  contact: {
    email: 'adapttochina@163.com' as string | null, // Public contact confirmed by Martin, 27 October 2026.
    github: null as string | null, // [VERIFY ACTIVE PROFILE URL]
    linkedin: null as string | null, // [PLACEHOLDER]
    resume: null as string | null, // e.g. '/resume.pdf' once an approved PDF exists in /public
  },
  lookingFor: {
    roles: 'AI product, enterprise software, product strategy and customer-facing technical solutions',
    locations: 'Shanghai · Hong Kong · International teams',
    timing: 'Summer internships in 2027 · Graduation expected March 2028',
    availability: null as string | null, // TODO(Martin): role-specific start date; current internship is four days a week.
  },
  footer:
    '© 2026 Martin Zhong. Designed and built with AI-assisted tools, iteration, and plenty of debugging.',
} as const;

export const nav = [
  { href: '/work/', label: 'Work' },
  { href: '/about/', label: 'About' },
] as const;
