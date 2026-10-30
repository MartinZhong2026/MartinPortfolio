import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { projects } from '../data/projects';
import { Glyph } from '../components/Glyph';
import { landscapeLayout, portraitLayout, type PoolObjectId } from './layout';
import type { PoolEngine } from './PoolEngine';
import { placeLabel, type LabelBox } from './labels';

const fallbackArt: Partial<Record<PoolObjectId, { file: string; width: number; height: number }>> = {
  'adapt-to-china': { file: 'adapt-to-china', width: 410, height: 316 },
  meetfolio: { file: 'meetfolio', width: 98, height: 114 },
  abtrace: { file: 'abtrace', width: 142, height: 127 },
  'supplier-document-intelligence': { file: 'document-ai', width: 183, height: 171 },
  fanscope: { file: 'fanscope', width: 138, height: 132 },
};

type Mode = 'static' | 'loading' | 'live' | 'unsupported';

interface PoolItem {
  id: PoolObjectId;
  href: string;
  label: string;
  caption: string;
  status?: string;
  flagship?: boolean;
}

export const poolItems: PoolItem[] = [
  ...projects.map((p) => ({
    id: p.slug as PoolObjectId,
    href: `/work/${p.slug}/`,
    label: p.poolLabel,
    caption: `${p.caption} ${p.objectName}.`,
    status: p.status,
    flagship: p.featured,
  })),
];

/**
 * The homepage pool. Server-rendered as an accessible, illustrated static pool
 * (works without JavaScript or WebGL) and hydrated into the live WebGL scene.
 */
export function PoolStage() {
  const [mode, setMode] = useState<Mode>('static');
  const [active, setActive] = useState<PoolObjectId | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const wipeRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef(new Map<PoolObjectId, HTMLAnchorElement>());
  const engineRef = useRef<PoolEngine | null>(null);
  const navigating = useRef(false);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let engine: PoolEngine | null = null;
    (async () => {
      const { detectPoolSupport, prefersReducedMotion, isCoarsePointer } = await import('./capability');
      const support = detectPoolSupport();
      if (!support.ok) {
        setMode('unsupported');
        document.documentElement.dataset.pool = 'unsupported';
        document.documentElement.dataset.poolReason = support.reason;
        return;
      }
      setMode('loading');
      try {
        const { PoolEngine } = await import('./PoolEngine');
        if (cancelled || !canvasRef.current || !frameRef.current) return;
        const frame = frameRef.current;
        engine = new PoolEngine(canvasRef.current, frame, {
          reducedMotion: prefersReducedMotion(),
          coarse: isCoarsePointer(),
          ids: poolItems.map((i) => i.id),
          onHover: (id) => setActive(id),
          onActivate: (id) => go(id),
          onFirstFrame: () => {
            if (!cancelled) {
              setMode('live');
              document.documentElement.dataset.pool = 'live';
            }
          },
          onContextLost: () => {
            setMode('unsupported');
            document.documentElement.dataset.pool = 'unsupported';
          },
          onFrame: (anchors) => {
            const fr = frame.getBoundingClientRect();
            const cr = canvasRef.current!.getBoundingClientRect();
            const ox = fr.left - cr.left;
            const oy = fr.top - cr.top;
            const placed: LabelBox[] = [];
            const avoided: LabelBox[] = [];
            // Batch layout reads before per-label style writes.
            const dimensions = new Map([...linkRefs.current].map(([id, el]) => {
              const label = el.querySelector<HTMLElement>('.pool-obj__label');
              return [id, { width: label?.offsetWidth ?? 0, height: label?.offsetHeight ?? 0 }];
            }));
            anchors.forEach((a, id) => {
              const el = linkRefs.current.get(id);
              if (!el) return;
              el.style.transform = `translate3d(${(a.x - ox).toFixed(1)}px, ${(a.y - oy).toFixed(1)}px, 0)`;
              el.style.setProperty('--r', `${a.r.toFixed(1)}px`);
              const label = el.querySelector<HTMLElement>('.pool-obj__label');
              if (label) {
                const x = a.x - ox, y = a.y - oy;
                const box = placeLabel(x, y, a.r, dimensions.get(id)!.width, dimensions.get(id)!.height, fr.width, fr.height, placed, avoided);
                label.style.left = `${box.x + box.w / 2 - x}px`;
                label.style.top = `${box.y - y}px`;
                const tip = el.querySelector<HTMLElement>('.pool-obj__tip');
                if (tip) tip.style.left = `${Math.max(110, Math.min(fr.width - 110, x)) - x}px`;
              }
            });
          },
        });
        engineRef.current = engine;
        engine.start();
      } catch (err) {
        console.warn('[pool] falling back to static pool:', err);
        setMode('unsupported');
        document.documentElement.dataset.pool = 'unsupported';
      }
    })();

    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        navigating.current = false;
        wipeRef.current?.classList.remove('is-on');
        engineRef.current?.reset();
      }
    };
    window.addEventListener('pageshow', onShow);
    return () => {
      cancelled = true;
      window.removeEventListener('pageshow', onShow);
      engine?.dispose();
      engineRef.current = null;
    };
    // `generation` lets a lost context rebuild the engine.
  }, [generation]);

  // Rebuild after a restored WebGL context.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const restored = () => setGeneration((g) => g + 1);
    c.addEventListener('webglcontextrestored', restored);
    return () => c.removeEventListener('webglcontextrestored', restored);
  }, []);

  const go = async (id: PoolObjectId) => {
    if (navigating.current) return;
    const item = poolItems.find((i) => i.id === id);
    if (!item) return;
    navigating.current = true;
    const engine = engineRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!engine || reduce) {
      window.location.assign(item.href);
      return;
    }
    const link = linkRefs.current.get(id);
    const wipe = wipeRef.current;
    if (link && wipe) {
      const r = link.getBoundingClientRect();
      wipe.style.setProperty('--wx', `${r.left + r.width / 2}px`);
      wipe.style.setProperty('--wy', `${r.top + r.height / 2}px`);
    }
    const dive = engine.activate(id);
    setTimeout(() => wipe?.classList.add('is-on'), 160);
    await dive;
    window.location.assign(item.href);
  };

  const onLinkClick = (e: MouseEvent<HTMLAnchorElement>, id: PoolObjectId) => {
    if (mode !== 'live' || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    go(id);
  };

  const setFocus = (id: PoolObjectId | null) => {
    setActive(id);
    engineRef.current?.setFocus(id);
  };

  return (
    <div className={`pool pool--${mode}`} data-active={active ?? undefined}>
      <canvas ref={canvasRef} className="pool__canvas" aria-hidden="true" />
      <div className="pool__layout">
        <div className="pool__frame" ref={frameRef}>
          <div className="pool__static" aria-hidden="true">
            <div className="pool__static-water" />
            <div className="pool__floor-type" aria-label="Martin Zhong — welcome to my world">
              <strong>Martin Zhong</strong><span>welcome to my world</span>
            </div>
          </div>
          <div className="pool__center">
            <h1 className="sr-only">Martin Zhong — welcome to my world</h1>
            <div className="pool__center-ctas">
              <a className="btn btn--ink" href="#projects">
                Dive into my work <span aria-hidden="true">↓</span>
              </a>
              <a className="btn btn--light" href="#about">
                About me
              </a>
            </div>
          </div>
          <ul className="pool__objects" aria-label="Projects floating in the pool">
            {poolItems.map((item) => {
              const l = landscapeLayout[item.id];
              const p = portraitLayout[item.id];
              const style = {
                '--lx': l.sx,
                '--ly': l.sy,
                '--px': p.sx,
                '--py': p.sy,
              } as CSSProperties;
              return (
                <li key={item.id} className="pool__item" style={style}>
                  <a
                    ref={(el) => {
                      if (el) linkRefs.current.set(item.id, el);
                    }}
                    href={item.href}
                    className={`pool-obj${item.flagship ? ' pool-obj--flagship' : ''}${active === item.id ? ' is-active' : ''}${item.id === 'about' ? ' pool-obj--about' : ''}`}
                    onClick={(e) => onLinkClick(e, item.id)}
                    onFocus={() => setFocus(item.id)}
                    onBlur={() => setFocus(null)}
                    onMouseEnter={() => setActive(item.id)}
                    onMouseLeave={() => setActive(null)}
                  >
                    <span className="pool-obj__glyph">
                      {fallbackArt[item.id] ? <img src={`/assets/floats/${fallbackArt[item.id]!.file}.png`} width={fallbackArt[item.id]!.width} height={fallbackArt[item.id]!.height} alt="" /> : <Glyph id={item.id} />}
                    </span>
                    <span className="pool-obj__label">{item.label}</span>
                    <span className="pool-obj__tip" role="tooltip">
                      {item.status && <span className="pool-obj__status">{item.status}</span>}
                      {item.caption}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="pool__bar">
          <p className="pool__hint">
            <span className="hint-fine">Nudge the floats with your cursor. Click to explore a project.</span>
            <span className="hint-coarse">Tap a float to explore. Drag to make a ripple.</span>
          </p>
          <p className="pool__status" role="status" aria-live="polite">
            {mode === 'loading' && 'Getting the pool ready…'}
            {mode === 'unsupported' &&
              "The interactive pool isn't available on this device. You can still explore every project below."}
          </p>
          <a className="pool__list-link" href="#projects">
            View projects as a list <span aria-hidden="true">↓</span>
          </a>
        </div>
      </div>
      <div className="pool__wipe" ref={wipeRef} aria-hidden="true" />
    </div>
  );
}
