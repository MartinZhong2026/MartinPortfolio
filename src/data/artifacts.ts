export interface ArtifactImage { src: string; width: number; height: number; alt: string }
export const medicalGuide = {
  title: 'How to See a Doctor in China — Shanghai Edition (看病指南)',
  cover: null as ArtifactImage | null, // TODO(Martin): original watermark-free cover.
  spreads: [] as ArtifactImage[], // TODO(Martin): original inside-page images if available.
  verificationSource: null as string | null, // TODO(Martin): no “official 2026 standards” claim without a source.
};
