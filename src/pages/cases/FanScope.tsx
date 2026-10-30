import { projectBySlug } from '../../data/projects';
import { CasePage, ProjectSheet } from '../../components/case';

const p = projectBySlug('fanscope');

export function FanScope() {
  return (
    <CasePage project={p} end={false}>
      <ProjectSheet
        project={p}
        oneLiner="Research trends should be easier to investigate — and harder to misunderstand."
        what="A research-intelligence workbench for finding new papers, following topic and method trends, profiling Chinese and English-language journals, and keeping a research group's projects in one place."
        users="Researchers and research teams — especially in the social sciences — who are planning studies and choosing where to publish."
        problems={[
          'Thousands of articles, but no quick view of which topics and methods are rising or fading.',
          'Chinese C-journals and international journals live in separate systems with different coverage and rules.',
          'Trend charts usually hide what is missing; FanScope shows sample size, missing data and coverage next to every chart.',
        ]}
        role="Product direction · research workflow design · data modelling · source investigation · AI-assisted development"
        layout="desktop-phones"
        images={[
          {
            src: '/assets/fanscope/research-trends-20261027.webp',
            width: 1660,
            height: 923,
            frame: 'desktop',
            label: 'FanScope · Research trends',
            alt: 'FanScope desktop research-trends dashboard with papers by month, topics and research methods.',
          },
          {
            src: '/assets/fanscope/mobile-home-20261027.webp',
            width: 900,
            height: 1661,
            frame: 'phone',
            alt: 'FanScope mobile home: find papers, research trends, journal profiles and research-group projects.',
          },
          {
            src: '/assets/fanscope/mobile-trends-20261027.webp',
            width: 900,
            height: 1647,
            frame: 'phone',
            alt: 'FanScope mobile research-trends view: monthly topic lines with sample size, missing data and coverage notes.',
          },
        ]}
        caption="Real screenshots of the development build, October 2026. Figures reflect the captured development dataset and its displayed coverage."
        limits="Research-stage. Chinese-journal coverage is incomplete; FanScope is not a comprehensive journal database, does not track journals in real time and does not offer validated research-gap recommendations."
      />
    </CasePage>
  );
}
