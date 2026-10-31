/** Small screen-space packing pass. Keeps labels inside the water and apart
 * even while a pointer pushes floats away from their initial slots. */
export interface LabelBox { x: number; y: number; w: number; h: number }
const overlap = (a: LabelBox, b: LabelBox) => a.x < b.x + b.w + 6 && a.x + a.w + 6 > b.x && a.y < b.y + b.h + 6 && a.y + a.h + 6 > b.y;
export function placeLabel(x: number, y: number, r: number, w: number, h: number, width: number, height: number, placed: LabelBox[], avoid: LabelBox[] = []): LabelBox {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const near = r * 0.86;
  const candidates = [[x-w/2,y+near+5], [x-w/2,y-near-h-5], [x+near+6,y-h/2], [x-near-w-6,y-h/2]];
  for (let k=1; k<=6; k++) { candidates.push([x-w/2,y+near+5+k*(h+6)], [x-w/2,y-near-h-5-k*(h+6)]); }
  let best: LabelBox | undefined;
  let score = Infinity;
  for (const [cx,cy] of candidates) {
    const box = { x:clamp(cx,8,width-w-8), y:clamp(cy,8,height-h-8), w, h };
    const conflicts = [...placed, ...avoid].filter(p=>overlap(box,p)).length;
    const cost = conflicts*100000 + Math.abs(box.x-cx)+Math.abs(box.y-cy);
    if (cost < score) { best=box; score=cost; }
    if (cost===0) break;
  }
  placed.push(best!); return best!;
}

/** Portrait: a label is pinned to one side of its float, and kept inside the water. */
export function pinLabel(side: 'below' | 'left' | 'right', x: number, y: number, r: number, w: number, h: number, width: number) {
  const reach = r * 0.92 + 4;
  const px = side === 'below' ? x - w / 2 : side === 'right' ? x + reach : x - reach - w;
  const py = side === 'below' ? y + reach : y - h / 2;
  return { x: Math.max(6, Math.min(width - w - 6, px)), y: py };
}
