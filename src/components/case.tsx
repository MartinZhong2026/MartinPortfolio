import type { CSSProperties, ReactNode } from 'react';
import { nextProject, type Project, type StatusLabel } from '../data/projects';
import { Glyph } from './Glyph';

export const statusClass = (s: StatusLabel) =>
  ({
    'Live independent product': 'status--live',
    'Open-source desktop project': 'status--oss',
    'Client prototype': 'status--client',
    'Research-stage project': 'status--research',
  })[s];

export function Status({ s }: { s: StatusLabel }) {
  return <span className={`status ${statusClass(s)}`}>{s}</span>;
}

export function CasePage({ project, children, end = true }: { project: Project; children: ReactNode; end?: boolean }) {
  const style = { '--accent': project.accent, '--accent-ink': project.accentInk } as CSSProperties;
  return (
    <article className="case" style={style}>
      {children}
      {end && <CaseEnd project={project} />}
    </article>
  );
}

export interface SheetImage {
  src: string;
  width: number;
  height: number;
  alt: string;
  frame: 'desktop' | 'phone' | 'logo';
  label?: string;
}

/**
 * One-screen project sheet: name, time, what it is, who it's for, the problems
 * it solves and where to go next — with the real product images beside it.
 */
export function ProjectSheet({
  project,
  title,
  oneLiner,
  what,
  users,
  problems,
  role,
  links = [],
  images = [],
  visual,
  layout = 'stack',
  limits,
  caption,
  showNext = true,
}: {
  project: Project;
  title?: string;
  oneLiner: string;
  what: string;
  users: string;
  problems: string[];
  role: string;
  links?: { href: string; label: string }[];
  images?: SheetImage[];
  visual?: ReactNode;
  layout?: 'stack' | 'phones' | 'desktop-phone' | 'desktop-phones' | 'logo-visual';
  limits?: string;
  caption?: string;
  showNext?: boolean;
}) {
  const next = nextProject(project.slug);
  return (
    <section className="sheet" aria-labelledby="sheet-title">
      <div className="wrap sheet__grid">
        <div className="sheet__info">
          <a className="back-link" href="/">
            <span className="back-link__ring" aria-hidden="true" />
            Back to the pool
          </a>
          <div className="sheet__chips">
            <Status s={project.status} />
            <span className="chip">{project.period}</span>
          </div>
          <h1 id="sheet-title">{title ?? project.title}</h1>
          <p className="sheet__oneliner">{oneLiner}</p>
          <dl className="sheet__facts">
            <div>
              <dt>What it is</dt>
              <dd>{what}</dd>
            </div>
            <div>
              <dt>Who it's for</dt>
              <dd>{users}</dd>
            </div>
            <div>
              <dt>Problems it solves</dt>
              <dd>
                <ul>
                  {problems.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt>My role</dt>
              <dd>{role}</dd>
            </div>
          </dl>
          <div className="sheet__links">
            {links.map((l) => (
              <a key={l.href} className="btn btn--accent" href={l.href} target="_blank" rel="noopener noreferrer">
                {l.label} <ExternalArrow />
              </a>
            ))}
            {showNext && (
              <a className="btn btn--ghost" href={`/work/${next.slug}/`}>
                Next: {next.title} <span aria-hidden="true">→</span>
              </a>
            )}
          </div>
          {limits && (
            <p className="sheet__limits">
              <strong>Status &amp; limits</strong> {limits}
            </p>
          )}
        </div>
        <figure className={`sheet__media sheet__media--${layout}`}>
          {images.map((im, i) => (
            <div key={im.src} className={`sheet__frame sheet__frame--${im.frame} sheet__frame--n${i}`}>
              {im.frame === 'desktop' && (
                <div className="sheet__bar" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  {im.label && <span>{im.label}</span>}
                </div>
              )}
              <img src={im.src} width={im.width} height={im.height} alt={im.alt} decoding="async" fetchPriority={i === 0 ? 'high' : 'auto'} />
            </div>
          ))}
          {visual && <div className="sheet__visual">{visual}</div>}
          {caption && <figcaption>{caption}</figcaption>}
        </figure>
      </div>
    </section>
  );
}

export function CaseHero({
  project,
  title,
  headline,
  deck,
  role,
  extraChips,
  ctas,
}: {
  project: Project;
  title?: string;
  headline: string;
  deck: string;
  role: string;
  extraChips?: string[];
  ctas?: ReactNode;
}) {
  return (
    <header className="case-hero">
      <div className="wrap">
        <a className="back-link" href="/">
          <span className="back-link__ring" aria-hidden="true" />
          Back to the pool
        </a>
        <div className="case-hero__grid">
          <div>
            <div className="case-hero__meta-top">
              <Status s={project.status} />
              {extraChips?.map((c) => (
                <span key={c} className="chip">
                  {c}
                </span>
              ))}
            </div>
            <h1>{title ?? project.title}</h1>
            <p className="case-hero__headline">{headline}</p>
            <p className="case-hero__deck">{deck}</p>
            {ctas && <div className="case-hero__ctas">{ctas}</div>}
          </div>
          <div className="case-hero__art" aria-hidden="true">
            <Glyph id={project.slug} />
          </div>
        </div>
        <dl className="meta">
          <div>
            <dt>Category</dt>
            <dd>{project.category}</dd>
          </div>
          <div>
            <dt>My role</dt>
            <dd>{role}</dd>
          </div>
          <div>
            <dt>Period</dt>
            <dd>{project.period}</dd>
          </div>
        </dl>
      </div>
    </header>
  );
}

export function Skim({ items }: { items: { h: string; p: string }[] }) {
  return (
    <div className="wrap">
      <div className="skim" data-reveal>
        {items.map((i) => (
          <div key={i.h}>
            <h3>{i.h}</h3>
            <p>{i.p}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Section({
  num,
  title,
  id,
  wide,
  children,
}: {
  num: string;
  title: string;
  id?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="section" id={id} aria-labelledby={id ? `${id}-h` : undefined}>
      <div className="wrap">
        <div className="section__head" data-reveal>
          <div className="section__num">{num}</div>
          <h2 id={id ? `${id}-h` : undefined}>{title}</h2>
        </div>
        <div className={`section__body${wide ? ' section__body--wide' : ''}`}>{children}</div>
      </div>
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="prose" data-reveal>
      {children}
    </div>
  );
}

export function Pull({ children, center }: { children: ReactNode; center?: boolean }) {
  return (
    <blockquote className={`pull${center ? ' pull--center' : ''}`} data-reveal>
      {children}
    </blockquote>
  );
}

export function Callout({ label, children }: { label: string; children: ReactNode }) {
  return (
    <aside className="callout" data-reveal>
      <strong>{label}</strong>
      {children}
    </aside>
  );
}

export type TagKind = 'available' | 'testing' | 'human' | 'concept' | 'illustrative';
export function Tag({ kind, children }: { kind: TagKind; children: ReactNode }) {
  return <span className={`tag tag--${kind}`}>{children}</span>;
}

export function Flow({
  steps,
  n,
  label,
}: {
  steps: { h: string; p?: string; tag?: { kind: TagKind; text: string }; human?: boolean }[];
  n?: number;
  label: string;
}) {
  return (
    <ol className="flow flow--human" style={{ '--n': n ?? steps.length } as CSSProperties} aria-label={label} data-reveal>
      {steps.map((s) => (
        <li key={s.h} className={s.human ? 'is-human' : undefined}>
          <h3>{s.h}</h3>
          {s.p && <p>{s.p}</p>}
          {s.tag && <Tag kind={s.tag.kind}>{s.tag.text}</Tag>}
        </li>
      ))}
    </ol>
  );
}

export function Placeholder({ title, note, ratio }: { title: string; note: string; ratio?: string }) {
  return (
    <figure className="figure" data-reveal>
      <div className="placeholder" style={ratio ? { aspectRatio: ratio } : undefined}>
        <div className="placeholder__inner">
          <b>Editorial placeholder</b>
          <p>
            <strong>{title}</strong> — {note}
          </p>
        </div>
      </div>
    </figure>
  );
}

export function Mock({
  title,
  label = 'Illustrative mockup',
  caption,
  children,
}: {
  title: string;
  label?: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <figure className="figure" data-reveal>
      <div className="mock" role="img" aria-label={`${label}: ${title}`}>
        <div className="mock__bar">
          <span>{title}</span>
          <Tag kind="illustrative">{label}</Tag>
        </div>
        <div aria-hidden="true">{children}</div>
      </div>
      <figcaption>
        <Tag kind="illustrative">{label}</Tag>
        {caption}
      </figcaption>
    </figure>
  );
}

function CaseEnd({ project }: { project: Project }) {
  const next = nextProject(project.slug);
  return (
    <div className="wrap case-end">
      <div className="case-end__band" data-reveal>
        <div>
          <p className="eyebrow">Built with curiosity. Tested against reality.</p>
          <h2>Have a real problem worth solving? Let's talk.</h2>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <a className="btn btn--light" href="/about/#contact">
            Get in touch
          </a>
          <a className="btn btn--ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.35)' }} href="/">
            Back to the pool
          </a>
        </div>
      </div>
      <a className="next-link" href={`/work/${next.slug}/`} data-reveal>
        <span className={`card__art${next.cardArt?.kind === 'screenshot' ? ' card__art--shot' : ''}`} aria-hidden="true">
          {next.cardArt ? (
            <img src={next.cardArt.src} width={next.cardArt.width ?? 1600} height={next.cardArt.height ?? 900} alt="" decoding="async" loading="lazy" />
          ) : (
            <Glyph id={next.slug} />
          )}
        </span>
        <span>
          <small>Next project</small>
          <b>{next.title}</b>
        </span>
        <span aria-hidden="true" style={{ fontSize: 24 }}>
          →
        </span>
      </a>
    </div>
  );
}

export const ExternalArrow = () => (
  <span className="ext" aria-hidden="true">
    ↗
  </span>
);
