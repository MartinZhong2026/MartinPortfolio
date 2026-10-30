import { projectBySlug } from '../../data/projects';
import { CasePage, ProjectSheet } from '../../components/case';

const p = projectBySlug('meetfolio');

export function Meetfolio() {
  return (
    <CasePage project={p} end={false}>
      <ProjectSheet
        project={p}
        oneLiner="Stay in the conversation. Find the important parts later."
        what="A local-first, open-source desktop workspace for interviews and meetings: prepare an outline, record and transcribe on your own computer, keep reference documents beside the transcript, then review and export."
        users="Interviewers, researchers, students, consultants and product teams who need an accurate record without losing attention during the conversation."
        problems={[
          'Listening, note-taking, documents and follow-up questions are spread across separate apps.',
          'Afterwards it is hard to reconstruct exactly what was said — and which notes came from you, the transcript or an AI.',
          'Many tools need an account and send recordings to the cloud; Meetfolio keeps the core workflow on the device.',
        ]}
        role="Product creator · workflow design · AI-assisted implementation (Electron, local sherpa-onnx speech recognition) · testing · documentation"
        links={[{ href: 'https://github.com/MartinZhong2026/meetfolio', label: 'Source code on GitHub' }]}
        layout="stack"
        images={[
          {
            src: '/assets/meetfolio/prepare-20261027.webp',
            width: 1800,
            height: 975,
            frame: 'desktop',
            label: 'Meetfolio · 01 Interview preparation',
            alt: 'Meetfolio interview preparation screen in Chinese: topic, participant and outline on the left, offline speech model status on the right.',
          },
          {
            src: '/assets/meetfolio/workspace-demo-20261027.webp',
            width: 1440,
            height: 780,
            frame: 'desktop',
            label: 'Meetfolio · 02 Live transcript',
            alt: 'Meetfolio live workspace: interview outline, live transcription and editable research notes side by side.',
          },
        ]}
        caption="Real screenshots of a local test session with a fictional (DEMO) participant."
        limits="Transcription quality depends on audio, language and hardware. Optional AI features need a configured provider. Long real-microphone sessions and signed public releases are still being validated; Meetfolio is not a certified recordkeeping system."
      />
    </CasePage>
  );
}
