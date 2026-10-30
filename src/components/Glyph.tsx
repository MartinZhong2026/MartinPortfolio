import type { PoolObjectId } from '../pool/layout';

/** Brand images for project cards and the 3D pool's static fallback.
 * The About link retains its accessible folded-paper boat symbol. */
export function Glyph({ id, className }: { id: PoolObjectId; className?: string }) {
  const common = { viewBox: '0 0 120 120', className, 'aria-hidden': true as const, focusable: 'false' as const };
  if (id !== 'about') {
    const file = id === 'supplier-document-intelligence' ? 'document-ai' : id;
    return <img src={`/assets/icons/${file}.png`} className={className} width={512} height={512} alt="" aria-hidden="true" decoding="async" />;
  }
  return (
    <svg {...common}>
      <ellipse cx="60" cy="84" rx="36" ry="7" fill="#0b3d52" opacity=".16" />
      <path d="M18 62h84l-14 16H32z" fill="#fbf8f1" />
      <path d="M36 62l24-30 24 30z" fill="#efe9dc" />
      <path d="M60 32v30" stroke="#d9d1c0" strokeWidth="1.5" />
    </svg>
  );
}
