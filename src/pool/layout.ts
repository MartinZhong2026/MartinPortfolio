import type { ProjectSlug } from '../data/projects';

export type PoolObjectId = ProjectSlug | 'about';

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
  meetfolio: { sx: -0.48, sy: -0.67, yaw: -0.24, size: 1.0 },
  abtrace: { sx: 0.60, sy: -0.66, yaw: 0.18, size: 1.0 },
  fanscope: { sx: 0.77, sy: 0.07, yaw: 0.16, size: 1.0 },
  'adapt-to-china': { sx: 0.52, sy: 0.66, yaw: -0.10, size: 1.0 },
  'supplier-document-intelligence': { sx: -0.52, sy: 0.66, yaw: -0.15, size: 1.0 },
  about: { sx: -0.79, sy: 0.03, yaw: -0.14, size: 1.0 },
};

// Labels have their own collision avoidance. At small screens keep all six
// objects around a central open stripe for the underwater name.
export const portraitLayout: Record<PoolObjectId, Slot> = {
  meetfolio: { sx: -0.51, sy: -0.65, yaw: -0.18, size: 0.86 },
  abtrace: { sx: 0.50, sy: -0.65, yaw: 0.18, size: 0.86 },
  fanscope: { sx: 0.52, sy: 0.46, yaw: 0.14, size: 0.86 },
  'adapt-to-china': { sx: 0.28, sy: 0.78, yaw: 0.08, size: 0.78 },
  'supplier-document-intelligence': { sx: -0.5, sy: 0.74, yaw: -0.11, size: 0.86 },
  about: { sx: -0.5, sy: -0.33, yaw: 0.16, size: 0.82 },
};

export const POOL = {
  /** half extents of the water opening (world units): x is the long axis */
  halfX: 1.6,
  halfZ: 1.0,
  depth: 0.5,
  /** height of the deck above the resting water level */
  rimH: 0.075,
  coping: 0.085,
} as const;
