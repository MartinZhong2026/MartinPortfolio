import { parse, serialize, type DefaultTreeAdapterTypes } from 'parse5';
import chinese from '../data/locales/zh-CN.json';
import poolChinese from '../data/locales/pool.zh-CN.json';
import { localizedPath } from '../data/localization';

const messages: Record<string, string> = { ...chinese, ...poolChinese };
type Node = DefaultTreeAdapterTypes.Node;

function translate(value: string): string {
  const key = value.replace(/\s+/g, ' ').trim();
  if (!/[a-zA-Z]/.test(key)) return value;
  const translated = messages[key];
  if (translated === undefined) throw new Error(`Missing Chinese translation: ${key}`);
  return value.replace(/\S[\s\S]*\S|\S/, () => translated);
}

/** Localize parsed copy, never raw markup. Unreviewed English fails the build. */
export function localizeHtml(html: string): string {
  const doc = parse(html);
  const walk = (node: Node) => {
    if ('tagName' in node) {
      if (['script', 'style'].includes(node.tagName)) return;
      const attr = (name: string) => node.attrs.find(a => a.name === name);
      // The hydrated island renders from the same small catalog on both sides.
      if (attr('id')?.value === 'pool-island' || attr('data-language-switch')) return;
      for (const a of node.attrs) {
        if (['alt', 'title', 'aria-label', 'placeholder'].includes(a.name) ||
            (node.tagName === 'meta' && a.name === 'content' && node.attrs.some(x => ['description', 'og:title', 'og:description'].includes(x.value)))) a.value = translate(a.value);
        if (node.tagName === 'a' && a.name === 'href' && /^\/(?!\/)/.test(a.value) && !/^\/zh(?:\/|$)/.test(a.value)) {
          // Internal document links, not downloads or assets.
          if (!/\.[a-z0-9]+(?:[?#]|$)/i.test(a.value)) a.value = localizedPath(a.value, 'zh');
        }
      }
    }
    if (node.nodeName === '#text' && 'value' in node) node.value = translate(node.value);
    if ('childNodes' in node) node.childNodes.forEach(walk);
  };
  walk(doc);
  return serialize(doc);
}
