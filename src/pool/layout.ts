import type { ProjectSlug } from '../data/projects';

export type PoolObjectId = ProjectSlug | 'about' | 'life';

/**
 * Object positions in *screen-normalised pool coordinates*:
 * sx = -1 (left edge of the water) … 1 (right edge), sy = -1 (top) … 1 (bottom).
 * The engine maps these to world space for either orientation, so the static
 * fallback (CSS) and the live WebGL scene share one source of truth.
 */
export interface Slot {
  sx: number;
  sy: number;
  /** yaw in radians, applied on top of the orientation correction */
  yaw: number;
  /** relative size multiplier */
  size: number;
}

export const landscapeLayout: Record<PoolObjectId, Slot> = {
  meetfolio: { sx: -0.46, sy: -0.56, yaw: -0.2, size: 1.0 },
  abtrace: { sx: 0.44, sy: -0.58, yaw: 0.16, size: 1.0 },
  fanscope: { sx: 0.89, sy: 0.04, yaw: 0.14, size: 1.0 },
  'adapt-to-china': { sx: 0.6, sy: 0.74, yaw: -0.1, size: 1.0 },
  'supplier-document-intelligence': { sx: -0.36, sy: 0.78, yaw: -0.14, size: 1.0 },
  about: { sx: -0.87, sy: 0.14, yaw: -0.3, size: 1.0 },
  life: { sx: -0.86, sy: 0.76, yaw: 0, size: 1.0 },
};

// At small screens keep all seven objects around a central open stripe for the
// underwater name.
export const portraitLayout: Record<PoolObjectId, Slot> = {
  meetfolio: { sx: -0.5, sy: -0.68, yaw: -0.16, size: 1.06 },
  abtrace: { sx: 0.48, sy: -0.7, yaw: 0.16, size: 1.06 },
  fanscope: { sx: 0.6, sy: 0.53, yaw: 0.12, size: 1.0 },
  'adapt-to-china': { sx: 0.34, sy: 0.86, yaw: 0.08, size: 0.88 },
  'supplier-document-intelligence': { sx: -0.56, sy: 0.86, yaw: -0.1, size: 1.0 },
  about: { sx: -0.6, sy: -0.34, yaw: 0.16, size: 1.0 },
  life: { sx: -0.66, sy: 0.5, yaw: 0, size: 0.92 },
};

/** Decorative toys: no links, just company. They wander around these. */
export const toySlots: { landscape: Slot; portrait: Slot }[] = [
  { landscape: { sx: -0.8, sy: -0.7, yaw: 0.9, size: 1 }, portrait: { sx: 0.02, sy: -0.86, yaw: 0.9, size: 1.1 } },
  { landscape: { sx: 0.0, sy: -0.72, yaw: -0.5, size: 1 }, portrait: { sx: 0.8, sy: -0.14, yaw: -0.5, size: 1.15 } },
  { landscape: { sx: 0.24, sy: 0.98, yaw: 2.5, size: 1 }, portrait: { sx: -0.1, sy: 0.66, yaw: 2.5, size: 1.05 } },
  { landscape: { sx: 0.84, sy: -0.66, yaw: 1.8, size: 1 }, portrait: { sx: 0.14, sy: -0.56, yaw: 1.8, size: 1.1 } },
  { landscape: { sx: 0.88, sy: 0.5, yaw: -2.2, size: 1 }, portrait: { sx: 0.84, sy: 0.74, yaw: 1.2, size: 0.92 } },
];

export const POOL = {
  /** half extents of the water opening (world units): x is the long axis */
  halfX: 1.6,
  halfZ: 1.0,
  depth: 0.5,
  /** height of the deck above the resting water level */
  rimH: 0.075,
  coping: 0.17,
} as const;
