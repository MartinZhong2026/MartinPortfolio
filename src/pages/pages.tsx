import { filterLabels, projects } from '../data/projects';
import { site } from '../data/site';
import { strengths, hikingRegions, lifeActivities, lifePhotos, storyCollage } from '../data/about';
import { story } from '../data/story';
import { ProjectCard } from '../components/ProjectCard';

/* ----------------------------------------------------------------- HOME */
export function Home({ islandHtml }: { islandHtml: string }) {
  return (
    <section className="home-stage" aria-label="Interactive pool">
      <div id="pool-island" dangerouslySetInnerHTML={{ __html: islandHtml }} />
    </section>
  );
}

/* ----------------------------------------------------------------- WORK */
export function Work() {
  return (
    <>
      <header className="page-top">
        <div className="wrap">
          <p className="eyebrow">Work</p>
          <h1>Selected work</h1>
          <p className="page-top__question">Five projects. <em>One question:</em> does this actually help someone?</p>
          <p className="lead">
            A collection of products, prototypes, and experiments. One is a live independent venture, another is an
            open-source desktop tool, two grew out of enterprise requirements, and one is an ongoing research
            intelligence experiment. These five projects reflect the problems I've tried to understand, the trade-offs
            I've made, and the software I've learned to build.
          </p>
          <div className="filters" role="group" aria-label="Filter projects" data-filters hidden>
            {filterLabels.map((f) => (
              <button key={f.id} type="button" data-filter={f.id} aria-pressed={f.id === 'all' ? 'true' : 'false'}>
                {f.label}
              </button>
            ))}
            <span className="filters__count" aria-live="polite" data-filter-count>
              5 projects
            </span>
          </div>
        </div>
      </header>
      <div className="wrap">
        <ul className="cards" data-filter-list>
          {projects.map((p) => (
            <li key={p.slug} data-groups={p.filters.join(' ')} style={p.featured ? { gridColumn: '1 / -1' } : undefined} data-reveal>
              <ProjectCard project={p} headingLevel={2} />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- ABOUT */
export function AboutHero() {
  return (
    <>
      <section className="about-v6__hero" id="about" aria-labelledby="about-v6-title">
        <div className="wrap about-v6__hero-grid">
          <div className="about-v6__hero-heading" data-reveal>
            <p className="about-v6__overline"><span className="about-v6__accent-dot" /> Hello, I'm Martin Zhong <span className="about-v6__overline-line" /> Shanghai, China</p>
            <h1 id="about-v6-title">Hi!<br />I am <em>Martin Zhong.</em></h1>
          </div>
          <figure className="about-v6__hero-portrait" data-reveal>
            <div className="about-v6__portrait-frame">
              <img
                src="/assets/about/martin-shanghai-night.jpg"
                width="1024"
                height="1536"
                fetchPriority="high"
                alt="Martin smiling at night on the Shanghai waterfront, the Oriental Pearl Tower illuminated behind him."
              />
              <div className="about-v6__portrait-stamp" aria-hidden="true">MZ<span>· 2026</span></div>
            </div>
            <figcaption><span>01 / Portrait</span><span>Shanghai after dark, a city I call home.</span></figcaption>
          </figure>
          <div className="about-v6__hero-copy" data-reveal>
            <p className="about-v6__statement">
              I connect an understanding of people and their needs with the ability to build practical software.
            </p>
            <div className="about-v6__education-brief" aria-label="Education, rankings and scholarships">
              <div className="about-v6__education-entry">
                <span className="about-v6__education-years">2025.09 — 2028.03 · Expected</span>
                <div className="about-v6__education-title"><strong>Shanghai Jiao Tong University</strong><a href="https://www.topuniversities.com/universities/shanghai-jiao-tong-university" target="_blank" rel="noopener noreferrer" aria-label="QS 2027 ranking for Shanghai Jiao Tong University">QS 2027 #36 ↗</a></div>
                <p>Master of Public Administration · School of International and Public Affairs</p>
                <span className="about-v6__education-award">First Prize Scholarship</span>
              </div>
              <div className="about-v6__education-entry">
                <span className="about-v6__education-years">2021.09 — 2025.06</span>
                <div className="about-v6__education-title"><strong>Sun Yat-sen University</strong><a href="https://www.topuniversities.com/universities/sun-yat-sen-university" target="_blank" rel="noopener noreferrer" aria-label="QS 2027 ranking for Sun Yat-sen University">QS 2027 =258 ↗</a></div>
                <p>Bachelor of Public Administration</p>
                <span className="about-v6__education-award">Second Prize Scholarship</span>
              </div>
              <p className="about-v6__ranking-note">Rankings: QS World University Rankings 2027 · University-wide, not subject-specific.</p>
            </div>
            <div className="about-v6__actions">
              <a className="btn btn--ink" href="/work/">Explore selected work <span aria-hidden="true">↗</span></a>
              <a className="about-v6__text-link" href="#my-story">Get to know me <span aria-hidden="true">↓</span></a>
              {site.contact.resume && <a className="about-v6__text-link" href={site.contact.resume}>Résumé <span aria-hidden="true">↗</span></a>}
            </div>
            <div className="about-v6__keywords" aria-label="Focus areas">
              <span>Product thinking</span><span>AI applications</span><span>Human-centered research</span>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}

export function AboutProof() {
  return (
    <>
      <section className="about-v6__proof wrap" aria-label="Selected work">
        <a href="/work/adapt-to-china/" className="about-v6__proof-item">
          <span className="about-v6__proof-index">01 / Venture</span>
          <strong>Adapt to China</strong>
          <span>Independent product · Real users & service delivery</span>
          <span className="about-v6__proof-arrow" aria-hidden="true">↗</span>
        </a>
        <a href="/work/meetfolio/" className="about-v6__proof-item">
          <span className="about-v6__proof-index">02 / Open source</span>
          <strong>Meetfolio</strong>
          <span>Research & meeting desktop workspace</span>
          <span className="about-v6__proof-arrow" aria-hidden="true">↗</span>
        </a>
        <a href="/work/abtrace/" className="about-v6__proof-item">
          <span className="about-v6__proof-index">03 / B2B prototype</span>
          <strong>Enterprise AI workflows</strong>
          <span>Business discovery · Reviewable systems</span>
          <span className="about-v6__proof-arrow" aria-hidden="true">↗</span>
        </a>
      </section>

    </>
  );
}

export function AboutStory() {
  return (
    <>
      <section className="about-v6__chapter wrap" id="my-story" aria-labelledby="about-v6-story">
        <div className="about-v6__section-label" data-reveal><span>01</span> / The story so far</div>
        <div className="story-grid">
          <aside className="story-collage" aria-label="Pictures from the projects and drawings mentioned in the story" data-reveal>
            {storyCollage.map((item) => {
              const figure = (
                <figure className={`sc sc--${item.kind}`}>
                  {item.kind === 'browser' && <div className="sc__bar" aria-hidden="true"><i /><i /><i /></div>}
                  <img src={item.src} width={item.width} height={item.height} alt={item.alt} loading="lazy" decoding="async" />
                  <figcaption>{item.caption}</figcaption>
                </figure>
              );
              const cls = `sc-link sc-link--${item.kind}${item.tuck ? ' sc-link--tuck' : ''}`;
              return item.href ? <a key={item.src} className={cls} href={item.href}>{figure}</a> : <div key={item.src} className={cls}>{figure}</div>;
            })}
          </aside>
          <div className="about-v6__chapter-main" data-reveal>
            <h2 id="about-v6-story">From studying systems <br />to <span>building solutions.</span></h2>
            <h3 className="story-question">{story.question}</h3>
            <div className="about-v6__story-copy">
              {story.paragraphs.map((text) => <p key={text}>{text}</p>)}
            </div>
          </div>
        </div>
      </section>

    </>
  );
}

export function AboutStrengths() {
  return (
    <>
      <section className="about-v6__principles" aria-labelledby="about-v6-way">
        <div className="wrap">
          <div className="about-v6__principles-heading" data-reveal>
            <p className="about-v6__section-label"><span>02</span> / What I bring</p>
            <h2 id="about-v6-way">A researcher's curiosity.<br /><em>A builder's instinct.</em></h2>
            <p>I am interested in work that joins human understanding with technical possibility — and takes responsibility for the result.</p>
          </div>
          <div className="about-v6__principle-grid">
            {strengths.map((strength, i) => <article key={strength.title} data-reveal>
              <span>0{i + 1}</span><h3>{strength.title}</h3><p>{strength.description}</p>
              <a className="strength-evidence" href={strength.href}>{strength.evidence} <span aria-hidden="true">↗</span></a>
            </article>)}
          </div>
        </div>
      </section>

    </>
  );
}

export function AboutClosing() {
  return (
    <>
      <section className="about-v6__closing" aria-labelledby="about-v6-closing">
        <div className="wrap about-v6__closing-inner">
          <div>
            <p className="about-v6__section-label"><span>03</span> / What's next</p>
            <h2 id="about-v6-closing">Good questions deserve<br /><em>useful answers.</em></h2>
            {site.lookingFor.roles && <p>I’m interested in {site.lookingFor.roles}.</p>}
            {site.lookingFor.locations && <p className="looking-for">{site.lookingFor.locations}</p>}
            {site.lookingFor.timing && <p className="looking-for">{site.lookingFor.timing}</p>}
            {site.lookingFor.availability && <p>{site.lookingFor.availability}</p>}
          </div>
          <div className="about-v6__closing-actions contact-block" id="contact">
            <p className="contact-block__label">Contact</p>
            {site.contact.email && (
              <a className="contact-block__email" href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
            )}
            <p className="contact-block__note">AI products, practical software, early-stage ideas and the messy details of making things work — I'd love to hear from you.</p>
            <div className="contact-block__links">
              {site.contact.email && <a className="btn btn--light" href={`mailto:${site.contact.email}`}>Email me</a>}
              {site.contact.github && <a className="btn btn--ghost" href={site.contact.github} rel="noopener">GitHub</a>}
              {site.contact.linkedin && <a className="btn btn--ghost" href={site.contact.linkedin} rel="noopener">LinkedIn</a>}
              {site.contact.resume && <a className="btn btn--ghost" href={site.contact.resume}>Résumé</a>}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function About() {
  return (
    <div className="about-v6">
      <AboutHero />
      <AboutProof />
      <AboutStory />
      <AboutStrengths />
      <AboutClosing />
    </div>
  );
}

/* ----------------------------------------------------------------- LIFE */
export function Life() {
  return (
    <div className="about-v6 life">
      <header className="life-hero">
        <div className="wrap">
          <p className="about-v6__overline"><span className="about-v6__accent-dot" /> Outside the screen</p>
          <h1>A little more <em>human.</em></h1>
          <p className="life-hero__lead">Life outside work is where I recharge and find new perspectives.</p>
          <nav className="life-hero__jump" aria-label="On this page">
            {lifeActivities.map((a) => <a key={a.id} href={`#${a.id}`}>{a.title}</a>)}
            <a href="#gallery">Gallery</a>
          </nav>
        </div>
      </header>

      <section className="wrap life-grid" aria-label="What I do outside work">
        {lifeActivities.map((a, i) => (
          <article key={a.id} id={a.id} className="life-card" data-reveal>
            <span className="life-card__index">0{i + 1}</span>
            <h2>{a.title}</h2>
            <p className="life-card__line">{a.line}</p>
            {a.notes.map((note) => <p key={note}>{note}</p>)}
            {a.id === 'hiking' && (
              <ul className="region-chips" aria-label="Places I have hiked">{hikingRegions.map((region) => <li key={region}>{region}</li>)}</ul>
            )}
          </article>
        ))}
      </section>

      <section id="gallery" className="about-v6__life wrap" aria-labelledby="life-gallery">
        <div className="about-v6__life-head" data-reveal>
          <div>
            <p className="about-v6__section-label"><span>05</span> / Photo gallery</p>
            <h2 id="life-gallery">Out and <em>about.</em></h2>
          </div>
        </div>
        <div className="about-v6__gallery about-v6__gallery--approved">
          {lifePhotos.filter(photo => photo.publicOk).map(photo => <figure key={photo.src} className={`about-v6__photo about-v6__photo--${photo.className}`} data-reveal>
            <img src={photo.src} width={photo.width} height={photo.height} alt={photo.alt} loading="lazy" />
            <figcaption><span>{photo.title}</span></figcaption>
          </figure>)}
        </div>
        <div className="life-next">
          <a className="btn btn--ink" href="/work/">See the work <span aria-hidden="true">↗</span></a>
          <a className="btn btn--ghost" href="/">Back to the pool</a>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ 404 */
export function NotFound() {
  return (
    <section className="lost">
      <div>
        <div className="lost__ring" aria-hidden="true" />
        <p className="eyebrow">404 · Out of the pool</p>
        <h1>This page drifted off.</h1>
        <p>The link may be old or mistyped. Grab the ring — the pool and every project are one click away.</p>
        <div className="lost__links">
          <a className="btn btn--ink" href="/">
            Back to the pool
          </a>
          <a className="btn btn--ghost" href="/work/">
            View all projects
          </a>
        </div>
      </div>
    </section>
  );
}
