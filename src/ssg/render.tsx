/**
 * Build-time renderer. Bundled for Node by scripts/build.mjs and called once per
 * route to produce static, crawlable HTML. The pool island is rendered with
 * renderToString so the client can hydrate it.
 */
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import type { ReactElement } from 'react';
import { Document, type Assets, type PageMeta } from '../components/Layout';
import { About, Home, Life, NotFound, Work } from '../pages/pages';
import { AdaptToChina } from '../pages/cases/AdaptToChina';
import { Meetfolio } from '../pages/cases/Meetfolio';
import { AbTrace } from '../pages/cases/AbTrace';
import { SupplierDocAI } from '../pages/cases/SupplierDocAI';
import { FanScope } from '../pages/cases/FanScope';
import { PoolStage } from '../pool/PoolStage';
import { projectBySlug, projects, type ProjectSlug } from '../data/projects';
import { localizeHtml } from './localize';
import { localizedPath, type Locale } from '../data/localization';
export { site } from '../data/site';
export { INLINE_BOOT } from '../components/Layout';

export interface Route {
  meta: PageMeta;
  /** output file relative to dist */
  file: string;
  /** which client entry the page needs */
  entry: 'home' | 'site';
  render: (locale: Locale) => ReactElement;
}

const caseComponents: Record<ProjectSlug, () => ReactElement> = {
  'adapt-to-china': AdaptToChina,
  meetfolio: Meetfolio,
  abtrace: AbTrace,
  'supplier-document-intelligence': SupplierDocAI,
  fanscope: FanScope,
};

const englishRoutes: Route[] = [
  {
    meta: {
      path: '/',
      title: 'Martin Zhong — AI Product Builder & Selected Work',
      description:
        'Discover Adapt to China, Meetfolio, and AI workflow projects by Martin Zhong — a Shanghai-based product builder working across independent software, research tools, and enterprise prototypes.',
      bodyClass: 'page-home',
    },
    file: 'index.html',
    entry: 'home',
    render: (locale) => <Home islandHtml={renderToString(<PoolStage locale={locale} />)} />,
  },
  {
    meta: {
      path: '/work/',
      title: 'Selected Work — Martin Zhong',
      description:
        'Independent products, open-source software, and B2B AI workflow case studies focused on practical problems.',
    },
    file: 'work/index.html',
    entry: 'site',
    render: () => <Work />,
  },
  ...projects.map<Route>((p) => {
    const C = caseComponents[p.slug];
    const proj = projectBySlug(p.slug);
    return {
      meta: { path: `/work/${p.slug}/`, title: `${proj.title} — Martin Zhong`, description: proj.seoDescription },
      file: `work/${p.slug}/index.html`,
      entry: 'site',
      render: () => <C />,
    };
  }),
  {
    meta: {
      path: '/about/',
      title: 'About Martin Zhong — Product Builder & AI Applications',
      bodyClass: 'about-landing',
      description:
        'Meet Martin Zhong, a Shanghai-based product builder combining consumer insights, public administration, AI applications, and hands-on product delivery.',
    },
    file: 'about/index.html',
    entry: 'site',
    render: () => <About />,
  },
  {
    meta: {
      path: '/life/',
      title: 'Life — Martin Zhong',
      bodyClass: 'about-landing page-life',
      description: 'Running, fitness, hiking, drawing and a photo gallery: Martin Zhong outside the screen.',
    },
    file: 'life/index.html',
    entry: 'site',
    render: () => <Life />,
  },
  {
    meta: {
      path: '/404',
      title: 'Page not found — Martin Zhong',
      description: 'This page drifted off. Head back to the pool.',
      index: false,
    },
    file: '404.html',
    entry: 'site',
    render: () => <NotFound />,
  },
];

export const routes: Route[] = [...englishRoutes, ...englishRoutes.map(route => ({
  ...route,
  meta: { ...route.meta, path: localizedPath(route.meta.path, 'zh'), locale: 'zh' as const },
  file: `zh/${route.file}`,
}))];

export function renderRoute(route: Route, assets: Assets): string {
  const locale = route.meta.locale ?? 'en';
  const html = '<!doctype html>' + renderToStaticMarkup(<Document meta={route.meta} assets={assets}>{route.render(locale)}</Document>);
  return locale === 'zh' ? localizeHtml(html) : html;
}
