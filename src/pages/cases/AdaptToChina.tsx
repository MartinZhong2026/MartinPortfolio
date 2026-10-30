import { Testimonial } from '../../components/Testimonial';
import { projectBySlug } from '../../data/projects';
import { CasePage, ExternalArrow, ProjectSheet, Tag, type TagKind } from '../../components/case';

const p = projectBySlug('adapt-to-china');
const SITE = 'https://adapttochina.com/';
const STORY = 'https://adapttochina.com/blog/from-social-science-to-ai-products/';

const stages: { h: string; p: string; tag: [TagKind, string] }[] = [
  { h: 'Guides before features', p: 'Recurring questions became English explanations, checklists and city guidance.', tag: ['available', 'Live'] },
  { h: 'Structured local data', p: 'Hospital, halal and vegetarian / vegan finders built from real records.', tag: ['available', 'Live'] },
  { h: 'ATC AI assistant', p: 'Describe a real situation instead of navigating a decision tree.', tag: ['available', 'AI-assisted'] },
  { h: 'House Planner', p: 'Budget, commute, move-in date, pets, allergies → a search brief and checklist.', tag: ['testing', 'Testing'] },
  { h: 'Human support', p: 'Scoped paid help: Chinese phone calls, research, coordination, housing search.', tag: ['human', 'Human-delivered'] },
];

export function AdaptToChina() {
  return (
    <CasePage project={p} end={false}>
      {/* Page 1 — the project at a glance */}
      <ProjectSheet
        project={p}
        oneLiner="Making a new country feel a little less unfamiliar."
        what="A live platform for newcomers to China: practical guides, local directories (hospitals, halal and vegetarian food), the ATC AI assistant, a House Planner in testing, and optional paid human support when an answer is not enough."
        users="International students, professionals and people relocating, short-term visitors — and anyone with specific needs such as diet, healthcare access, pets or housing sensitivities."
        problems={[
          'Everyday services — payments, transport, healthcare, renting — assume you already know the system and read Chinese.',
          'Information is scattered across Chinese-language apps and group chats; translation alone does not tell you the next step.',
          'Some tasks need a phone call or real coordination, not just an answer — so there is scoped human help.',
        ]}
        role="Founder (since July 2026) · user research · product strategy · content · AI-assisted development · operations"
        links={[
          { href: SITE, label: 'Visit Adapt to China' },
          { href: STORY, label: "Read the founder's story" },
        ]}
        showNext={false}
        layout="desktop-phone"
        images={[
          { src: '/assets/adapt/live-homepage.jpg', width: 1700, height: 932, frame: 'desktop', label: 'adapttochina.com', alt: 'Adapt to China homepage: “What do you need to figure out today?” with a search box and quick topics.' },
          { src: '/assets/adapt/atc-ai-chat-20261027.webp', width: 900, height: 1671, frame: 'phone', alt: 'ATC AI on mobile: General and House Planner (Testing) modes, asking “What do you need help with in China?”' },
        ]}
        caption="Live product, October 2026: the website and the ATC AI assistant on mobile."
      />

      {/* Page 2 — how it works, the AI, proof and limits */}
      <section className="atc2" aria-labelledby="atc2-title">
        <div className="wrap">
          <div className="atc2__head" data-reveal>
            <p className="about-v6__section-label"><span>02</span> / How it works</p>
            <h2 id="atc2-title">From a social-science question to a product I operate.</h2>
          </div>

          <div className="atc2__grid">
            <div className="atc2__col" data-reveal>
              <h3>How it evolved</h3>
              <ol className="atc2__stages">
                {stages.map((s, i) => (
                  <li key={s.h}>
                    <span className="atc2__n">{i + 1}</span>
                    <div>
                      <h4>
                        {s.h} <Tag kind={s.tag[0]}>{s.tag[1]}</Tag>
                      </h4>
                      <p>{s.p}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="atc2__stats" aria-label="Local directory snapshot, October 2026">
                <div><b>61</b><span>hospitals</span></div>
                <div><b>40</b><span>halal</span></div>
                <div><b>31</b><span>vegetarian / vegan</span></div>
                <div><b>10</b><span>cities</span></div>
              </div>
              <p className="stats-note">Local directory, October 2026 snapshot — counts change as records are maintained.</p>
            </div>

            <div className="atc2__col atc2__ai" data-reveal>
              <h3>ATC AI</h3>
              <div className="atc2__ai-body">
                <div className="sheet__frame sheet__frame--phone atc2__phone">
                  <img src="/assets/adapt/atc-ai-chat-20261027.webp" width={900} height={1671} alt="ATC AI chat screen with General and House Planner (Testing) tabs, Thinking and Web Search toggles, file attachment and the note “AI can make mistakes. Check important details.”" />
                </div>
                <ul className="atc2__features">
                  <li><strong>Ask about a real situation.</strong> Renting, payments, transport, healthcare, Chinese apps — in your own words, or with a screenshot.</li>
                  <li><strong>Two modes.</strong> General for everyday questions; House Planner (testing) turns housing needs into a search brief.</li>
                  <li><strong>Thinking & Web Search.</strong> Deeper reasoning and a search step for time-sensitive facts.</li>
                  <li><strong>Honest by design.</strong> “AI can make mistakes. Check important details.” A person helps when an answer is not enough.</li>
                </ul>
              </div>
              <a className="btn btn--accent atc2__try" href="https://adapttochina.com/aichatbox" target="_blank" rel="noopener noreferrer">
                Try ATC AI <ExternalArrow />
              </a>
            </div>

            <div className="atc2__col atc2__proof" data-reveal>
              <h3>What people said</h3>
              <Testimonial id="hospital-navigation" compact />
              <Testimonial id="beijing-support" />
            </div>
          </div>

          <div className="atc2__foot" data-reveal>
            <p className="atc2__lesson">
              “Recommendations alone are insufficient. People need a sequence of decisions, checks and handoffs — and to
              know which part is guidance, which is AI, and which is a person.”
            </p>
            <p className="sheet__limits">
              <strong>Status &amp; limits</strong> Live and independently maintained; tools have different readiness
              levels. House Planner makes a search brief and checklist — it does not fetch listings, reserve homes or
              guarantee availability. AI answers and directory records need source and date checks; hospital help is
              navigation, not medical advice. Human services have an agreed scope and price, and decisions and payments
              stay with the customer. Six paid orders and about RMB 1,000 received (October 2026) are an early signal,
              not evidence of recurring revenue or scale.
            </p>
            <div className="sheet__links">
              <a className="btn btn--accent" href={SITE} target="_blank" rel="noopener noreferrer">
                Visit Adapt to China <ExternalArrow />
              </a>
              <a className="btn btn--ghost" href="/work/meetfolio/">
                Next: Meetfolio <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </CasePage>
  );
}
