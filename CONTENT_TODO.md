# Content and launch checklist — V6 refresh

Updated 27 October 2026. The approved V6 design and routes remain the baseline.

## Supplied and integrated

- About presents education, scholarships and rankings plus Martin's approved essay (`scripts/fixtures/about-story.md`). It carries no employer or internship history; the Work case studies keep their own project status and role lines.
- The TWO authorized anonymous quotations are verbatim excerpts in `src/data/testimonials.ts`, with `consent: true`. No other comments or raw chat screenshots are displayed.
- The supplied real ATC homepage and historical poster are included with distinct captions. The poster is historical, including its earlier domain.
- Personal running, Jing’an 10 km and original June 2024 Victoria Peak sketch are displayed. Group photos remain disabled until consent is confirmed.
- Public Administration is retained as education; government/CCTV-related work is excluded.
- Early commercial figures are explicitly dated snapshots. Enterprise work remains labelled as prototypes.

## Still requires Martin’s input

1. Public email confirmed and configured: **adapttochina@163.com**. The Contact page displays the address and every footer links to it. GitHub, LinkedIn and résumé URLs remain hidden until confirmed.
2. Set the final `site.origin` to enable absolute canonical URLs and the sitemap.
3. Add an approved résumé PDF if wanted, then set `site.contact.resume`.
4. Supply watermark-free original medical-guide cover/inside pages, if these should appear. Fields are in `src/data/artifacts.ts`; they remain null/empty. Do not repeat “Checked against official 2026 standards” without evidence.
5. Confirm the original channels of the two quotations if channel attribution is desired. Permission is already confirmed; it is not being requested again.
6. Clarify the hospital “X ray section” only if more specific wording is wanted. The page currently keeps the conservative original meaning and claims no medical outcome.
7. Group-photo permissions: both group photos are visible on the Life page (`publicOk: true`). Confirm permission before public launch, and set `publicOk: false` on any that is not cleared.
8. Confirm role-specific start dates; `site.lookingFor.availability` is null. The supplied internship/2027 search/2028 graduation timeline is used without inventing an availability date.
9. Approve or replace the proposed panda metaphor in the source comment at `poolMetaphor`; it is null and hidden until approved.
10. Check publication permission for the AbTrace name, prototype descriptions and the commercial snapshots before public launch.
11. Supply real current Meetfolio and individual ATC tool screenshots to replace the remaining labelled editorial placeholders.

## Optional float assets

V11 note: pool floats use the brand icons in `public/assets/icons/`, printed on modelled cushions. Rubber ducks are procedural and decorative. Older float textures in `public/assets/floats/` are no longer used at runtime. Adapt to China and FanScope cases now include dated user-supplied screenshots. Document AI uses a clearly identified **reference-inspired temporary icon**, not a supplied formal brand mark. Replace it when an official mark is available. Do not regenerate unused V6.3 SDF images.

## V8
- FanScope mobile trend screenshot shows sample counts and missingness; replace it if these figures should stay internal.
