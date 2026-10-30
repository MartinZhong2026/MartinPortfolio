export type PoolSupport = { ok: true } | { ok: false; reason: string };

/**
 * Decide whether the live WebGL pool should run on this device.
 * The water simulation needs WebGL2 and a renderable half/float colour buffer.
 */
export function detectPoolSupport(): PoolSupport {
  if (typeof window === 'undefined') return { ok: false, reason: 'ssr' };
  const params = new URLSearchParams(window.location.search);
  if (params.get('pool') === 'static') return { ok: false, reason: 'forced-static' };
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false });
    if (!gl) return { ok: false, reason: 'no-webgl2' };
    const floatOk = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    if (!floatOk) return { ok: false, reason: 'no-float-buffers' };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'webgl-error' };
  }
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const isCoarsePointer = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
