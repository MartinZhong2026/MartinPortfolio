# Bilingual QA — 5 November 2026

English remains at the existing URLs; Simplified Chinese mirrors every page under
`/zh/`. The confirmed canonical origin is `https://martin.adapttochina.com`.
Implementation details and authoring rules are in [LOCALIZATION.md](LOCALIZATION.md).

## Editorial review

Chinese copy was reviewed page by page for natural phrasing, factual parity and
terminology. Personal and product names remain recognizable; ordinary interface
copy is localized. Real product screenshots and logos retain their original
language, with Chinese captions and descriptions.

| Pages | Review focus |
| --- | --- |
| Home | Floor greeting, CTA, printed lettering, all seven destinations, tooltips, loading and unavailable-device messages |
| About | Nine essay paragraphs against the approved English; education dates, qualifications, both scholarships and QS 2027 rankings; contact and focus areas |
| Work | Exactly five projects, flagship first; statuses, summaries, tags and dynamic filter counts |
| Life | Four activities, ten hiking regions, five photos, captions and June 2024 sketch date |
| Adapt to China | Live vs testing features; 61/40/31/10 directory snapshot; six orders and about RMB 1,000, dated October 2026; both consented testimonials marked as translations; service and AI limits |
| Meetfolio | Local-first workflow; optional AI provider; microphone-session and signed-release validation caveats |
| AbTrace | Antibody research stages; provisional scientific rules, formal confirmation and prototype limits; invented mock data |
| Supplier Document Intelligence | Evidence, approval and ERP draft boundaries; synthetic data; no unsupported accuracy claims or automatic transactions |
| FanScope | Research-stage status, incomplete coverage, development dataset and recommendation limits |
| 404 | Chinese error message, local navigation and noindex metadata |

The English essay fixture, generated English story, case-study copy, five
projects, pool layout and water shaders have no content changes. The English
testimonials still pass the verbatim, consent-revocation checks.

## Automated verification

| Command | Result |
| --- | --- |
| `npm test` | Pass: TypeScript, 20-page build, content rules and localization checks |
| `npm run test:localization` | Pass: every page and every language switch at 320, 390, 820 and 1440 px; default language, saved selection, dynamic filters, deep links, query/hash, refresh, Back/Forward, old links, localized HTTP 404, no-JS, denied storage and no-WebGL |
| `npm run test:e2e` | Pass: live pool at 1440/1024/390 px, water/name pixel guards, float hover/click, keyboard, reduced motion, routes, static fallback, filters and console |
| `npm run test:about` | Pass: both languages at 375, 390, 768 and 1440 px; reading order, full portrait, education, overflow and console |
| `npm run test:mobile` | Pass: seven phone sizes, dragging, taps on every float and label; analytic touch-caustic path; flicker gate reports zero streak marks |
| `node scripts/mobile-layout.mjs --zh` | Pass: the same seven sizes, dragging and all 14 float/label taps in Chinese |
| `npm run test:v62:source` | Pass: existing approved-content source checks |

The original four-link header assertion now targets the primary navigation;
two language controls are asserted separately. A baseline check confirmed the
new two-control assertion rejects the previous build. New coverage also rejects
unknown English text and image descriptions during localization, checks the
exact CSP boot hash, and verifies static label placement for both URL prefixes.

## Visual verification and limits

Both language editions were captured at desktop, tablet and mobile sizes using
the machine's GPU, including all case studies and error pages. Captures were
inspected for readable Chinese text, heading wrapping, navigation, spacing and
pool composition. Full captures remain under `test-results/capture/` and
`test-results/capture-zh/`; selected review images are in [bilingual/](bilingual/).

Real phones and the deployed Cloudflare site were not tested. Software WebGL
results do not establish real-device frame rate or resolve the existing
real-phone flicker incident. No shader, simulation, float geometry or composition
change was made. No production deployment, merge or hosting configuration change
is part of this work.
