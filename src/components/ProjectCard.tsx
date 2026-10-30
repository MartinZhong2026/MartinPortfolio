import type { CSSProperties } from 'react';
import type { Project } from '../data/projects';
import { Glyph } from './Glyph';
import { Status } from './case';

export function ProjectCard({ project, headingLevel = 3 }: { project: Project; headingLevel?: 2 | 3 }) {
  const H = `h${headingLevel}` as 'h2' | 'h3';
  return (
    <a
      className={`card${project.featured ? ' card--featured' : ''}`}
      href={`/work/${project.slug}/`}
      style={{ '--accent': project.accentInk } as CSSProperties}
    >
      <div className="card__body">
        <div>
          <Status s={project.status} />
        </div>
        <H className="card__title">{project.title}</H>
        <p className="card__summary">{project.summary}</p>
        <div className="card__tags">
          {project.tags.map((t) => (
            <span className="chip" key={t}>
              {t}
            </span>
          ))}
        </div>
        <span className="card__more">
          {project.featured ? 'Read the flagship case study' : 'Read the case study'} <span aria-hidden="true">→</span>
        </span>
      </div>
      <div className={`card__art${project.cardArt?.kind === 'screenshot' ? ' card__art--shot' : ''}`} aria-hidden="true">
        {project.cardArt ? (
          <img src={project.cardArt.src} width={project.cardArt.width ?? 1600} height={project.cardArt.height ?? 900} alt="" decoding="async" loading="lazy" />
        ) : (
          <Glyph id={project.slug} />
        )}
      </div>
    </a>
  );
}
