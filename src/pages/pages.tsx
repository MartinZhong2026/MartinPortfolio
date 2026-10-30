import { filterLabels, projects } from '../data/projects';
import { site } from '../data/site';
import { career, strengths, hikingRegions, lifePhotos } from '../data/about';
import { ProjectCard } from '../components/ProjectCard';

/* ----------------------------------------------------------------- HOME */
export function Home({ islandHtml }: { islandHtml: string }) {
  return (
    <>
      <section className="home-stage" aria-label="Interactive pool">
        <div id="pool-island" dangerouslySetInnerHTML={{ __html: islandHtml }} />
      </section>
      <div className="about-v6 home-flow">
        <AboutHero onHome />
        <AboutStory />
        <section className="home-work" id="projects" aria-labelledby="projects-h">
          <div className="wrap">
            <div className="home-work__head" data-reveal>
              <p className="about-v6__section-label"><span>02</span> / Selected work</p>
              <h2 id="projects-h">Five projects. <em>One question:</em> does this actually help someone?</h2>
            </div>
            <ul className="cards">
              {projects.map((p) => (
                <li key={p.slug} style={p.featured ? { gridColumn: '1 / -1' } : undefined} data-reveal>
                  <ProjectCard project={p} />
                </li>
              ))}
            </ul>
          </div>
        </section>
        <AboutLife />
        <AboutClosing />
      </div>
    </>
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
export function AboutHero({ onHome = false }: { onHome?: boolean }) {
  const H = onHome ? 'h2' : 'h1';
  return (
    <>
      <section className="about-v6__hero" id="about" aria-labelledby="about-v6-title">
        <div className="wrap about-v6__hero-grid">
          <div className="about-v6__hero-copy" data-reveal>
            <p className="about-v6__overline"><span className="about-v6__accent-dot" /> Hello, I'm Martin Zhong <span className="about-v6__overline-line" /> Shanghai, China</p>
            <H id="about-v6-title">Hi!<br />I am <em>Martin Zhong.</em></H>
            <p className="about-v6__statement">
              I turn real-world problems into practical AI products — from understanding people to building, testing,
              and improving what they use.
            </p>
            <div className="about-v6__education-brief" aria-label="Education, rankings and scholarships">
              <div className="about-v6__education-entry">
                <span className="about-v6__education-years">2025.09 — 2028.03 · Expected</span>
                <div className="about-v6__education-title"><strong>Shanghai Jiao Tong University</strong><a href="https://www.topuniversities.com/universities/shanghai-jiao-tong-university" target="_blank" rel="noopener noreferrer" aria-label="QS 2027 ranking for Shanghai Jiao Tong University">QS 2027 #36 ↗</a></div>
                <p>Master of Public Administration · School of International and Public Affairs</p>
                <span className="about-v6__education-award">First-Class Freshman Academic Scholarship</span>
              </div>
              <div className="about-v6__education-entry">
                <span className="about-v6__education-years">2021.09 — 2025.06</span>
                <div className="about-v6__education-title"><strong>Sun Yat-sen University</strong><a href="https://www.topuniversities.com/universities/sun-yat-sen-university" target="_blank" rel="noopener noreferrer" aria-label="QS 2027 ranking for Sun Yat-sen University">QS 2027 =258 ↗</a></div>
                <p>Bachelor of Public Administration · GPA 3.73 / 4.0</p>
                <span className="about-v6__education-award">Second-Class Outstanding Student Scholarship · Academic Progress Award</span>
              </div>
              <p className="about-v6__ranking-note">Rankings: QS World University Rankings 2027 · University-wide, not subject-specific.</p>
            </div>
            <div className="about-v6__actions">
              <a className="btn btn--ink" href={onHome ? "#projects" : "/work/"}>Explore selected work <span aria-hidden="true">{onHome ? "↓" : "↗"}</span></a>
              <a className="about-v6__text-link" href="#my-story">Get to know me <span aria-hidden="true">↓</span></a>
              {site.contact.resume && <a className="about-v6__text-link" href={site.contact.resume}>Résumé <span aria-hidden="true">↗</span></a>}
            </div>
            <div className="about-v6__keywords" aria-label="Focus areas">
              <span>Product thinking</span><span>AI applications</span><span>Human-centered research</span>
            </div>
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
        </div>
      </section>

    </>
  );
}

export function AboutProof() {
  return (
    <>
      <section className="about-v6__proof wrap" aria-label="Selected experience and work">
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
        <div className="about-v6__chapter-main" data-reveal>
          <h2 id="about-v6-story">From studying systems<br />to <span>building solutions.</span></h2>
          <div className="about-v6__story-copy">
            <p>
              I started in public administration, learning to ask how institutions, services, and incentives affect
              everyday life. At Sun Yat-sen University and now as a master’s student at Shanghai Jiao Tong University,
              that interest grew into a habit of looking past assumptions and asking what people actually need.
            </p>
            <p>
              Working in consumer insights at Mintel trained me to organize messy information, notice meaningful
              patterns, and communicate findings clearly. But I wanted to go beyond understanding the problem.
              I wanted to build something that could help.
            </p>
            <p>
              That shift led to <a href="/work/adapt-to-china/">Adapt to China</a>, a platform combining practical
              information, AI assistance, and human support for people navigating life in China. It also led to
              <a href="/work/meetfolio/"> Meetfolio</a> and enterprise prototypes, where I have had to confront the
              unglamorous details behind useful software: unreliable outputs, unclear requirements, approval steps,
              and the difference between a good demo and a dependable workflow.
            </p>
          </div>
          <p className="about-v6__story-copy">
            At YBBE TECH, I’m extending that learning into enterprise settings: clarifying workflows, communicating
            across roles and languages, and prototyping AI tools for real business conversations.
          </p>
          <div className="about-v6__path" aria-label="Education and career timeline">
            {career.map(item => <div key={item.organization}>
              <span className="about-v6__path-label">{item.years}</span><strong>{item.organization}</strong>
              <small>{item.role}</small><p>{item.detail}</p>
              {item.transition && <small className="career-transition">{item.transition}</small>}
            </div>)}
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

export function AboutLife() {
  return (
    <>
      <section id="outside" className="about-v6__life wrap" aria-labelledby="about-v6-life">
        <div className="about-v6__life-head" data-reveal>
          <div><p className="about-v6__section-label"><span>03</span> / Outside the screen</p><h2 id="about-v6-life">A little more <em>human.</em></h2></div>
          <p>
            Running gives me rhythm. Hiking takes me somewhere unfamiliar. Drawing makes me pay attention.
            Life outside work is where I recharge and find new perspectives.
          </p>
        </div>

        <div className="about-v6__gallery about-v6__gallery--approved">
          {lifePhotos.filter(photo => photo.publicOk).map(photo => <figure key={photo.src} className={`about-v6__photo about-v6__photo--${photo.className}`} data-reveal>
            <img src={photo.src} width={photo.width} height={photo.height} alt={photo.alt} loading="lazy" />
            <figcaption><span>{photo.title}</span></figcaption>
          </figure>)}
        </div>
        <div className="about-v6__life-note" data-reveal>
          <p><strong>Trails across {hikingRegions.length} provinces & regions.</strong> I also enjoy strength training and the feeling of being a beginner somewhere unfamiliar.</p>
          <ul className="region-chips" aria-label="Places I have hiked">{hikingRegions.map(region => <li key={region}>{region}</li>)}</ul>
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
            <p className="about-v6__section-label"><span>04</span> / What's next</p>
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
      <AboutLife />
      <AboutClosing />
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
