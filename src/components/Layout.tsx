import type { ReactNode } from 'react';
import { nav, site } from '../data/site';
import { englishPath, localizedPath, type Locale } from '../data/localization';

export interface PageMeta {
  locale?: Locale;
  path: string;
  title: string;
  description: string;
  /** extra class on <body> */
  bodyClass?: string;
  /** set false for 404 */
  index?: boolean;
}

export interface Assets {
  css: string;
  scripts: string[];
  preload: string[];
}

export const INLINE_BOOT = "document.documentElement.classList.add('js');try{if(location.pathname==='/'&&localStorage.getItem('portfolio-language')==='zh'&&!document.referrer.startsWith(location.origin+'/')&&performance.getEntriesByType('navigation').every(e=>e.type!=='back_forward'))location.replace('/zh/'+location.search+location.hash)}catch{}";

export function Document({ meta, assets, children }: { meta: PageMeta; assets: Assets; children: ReactNode }) {
  const locale = meta.locale ?? 'en';
  const basePath = englishPath(meta.path);
  const canonical = meta.index === false ? undefined : `${site.origin}${meta.path}`;
  const og = `${site.origin}/${locale === 'zh' ? 'og-zh.png' : 'og.png'}`;
  return (
    <html lang={locale === 'zh' ? 'zh-Hans' : 'en'}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        {canonical && <link rel="canonical" href={canonical} />}
        {meta.index !== false && <>
          <link rel="alternate" hrefLang="en" href={`${site.origin}${basePath}`} />
          <link rel="alternate" hrefLang="zh-Hans" href={`${site.origin}${localizedPath(basePath, 'zh')}`} />
          <link rel="alternate" hrefLang="x-default" href={`${site.origin}${basePath}`} />
        </>}
        {meta.index === false && <meta name="robots" content="noindex" />}
        <meta name="theme-color" content="#f6f2ea" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content={locale === 'zh' ? 'zh_CN' : 'en_US'} />
        <meta property="og:locale:alternate" content={locale === 'zh' ? 'en_US' : 'zh_CN'} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:image" content={og} />
        {canonical && <meta property="og:url" content={canonical} />}
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {assets.preload.map((href) => (
          <link key={href} rel="preload" href={href} as="font" type={href.endsWith('.woff2') ? 'font/woff2' : 'font/woff'} crossOrigin="anonymous" />
        ))}
        <link rel="stylesheet" href={assets.css} />
        <script dangerouslySetInnerHTML={{ __html: INLINE_BOOT }} />
        {assets.scripts.map((src) => (
          <script key={src} type="module" src={src} />
        ))}
      </head>
      <body className={meta.bodyClass}>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <Header path={basePath} locale={locale} />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

export function Header({ path, locale = 'en' }: { path: string; locale?: Locale }) {
  return (
    <header className="site-header">
      <div className="wrap site-header__inner">
        <a className="brand" href="/" aria-label="Martin Zhong — back to the pool">
          <span className="brand__mark" aria-hidden="true">
            M
          </span>
          <span className="brand__name">Martin Zhong</span>
        </a>
        <nav className="nav" aria-label="Primary">
          {nav.map((n) => (
            <a key={n.href} href={n.href} aria-current={(n.href === '/' ? path === '/' : path.startsWith(n.href)) ? 'page' : undefined}>
              {n.label}
            </a>
          ))}
        </nav>
        <nav className="language-switch" data-language-switch="" aria-label={locale === 'zh' ? '切换语言' : 'Language'}>
          <a href={localizedPath(path, 'zh')} hrefLang="zh-Hans" lang="zh-Hans" data-language="zh" aria-current={locale === 'zh' ? 'true' : undefined} aria-label="切换为中文">中文</a>
          <span aria-hidden="true">/</span>
          <a href={path} hrefLang="en" lang="en" data-language="en" aria-current={locale === 'en' ? 'true' : undefined} aria-label="Switch to English">EN</a>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  const c = site.contact;
  const links = [
    c.email && { href: `mailto:${c.email}`, label: 'Email' },
    c.github && { href: c.github, label: 'GitHub' },
    c.linkedin && { href: c.linkedin, label: 'LinkedIn' },
    c.resume && { href: c.resume, label: 'Résumé' },
  ].filter(Boolean) as { href: string; label: string }[];
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__inner">
        <p style={{ margin: 0 }}>{site.footer}</p>
        <nav aria-label="Footer">
          <a href="/">Home</a>
          <a href="/about/">About</a>
          <a href="/work/">Work</a>
          <a href="/life/">Life</a>
          <a href="/about/#contact">Contact</a>
          {links.map((l) => (
            <a key={l.href} href={l.href} rel="noopener">
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
