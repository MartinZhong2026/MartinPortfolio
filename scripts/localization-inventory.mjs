// Review the actual published copy, including accessible names and metadata.
import { parse } from 'parse5';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

export function copyNodes(node, visit) {
  if (['script', 'style'].includes(node.tagName)) return;
  if (node.nodeName === '#text') visit(node, 'value');
  for (const attr of node.attrs ?? []) {
    if (['alt', 'title', 'aria-label', 'placeholder'].includes(attr.name) ||
        (node.tagName === 'meta' && attr.name === 'content' && node.attrs.some(a => ['description', 'og:title', 'og:description'].includes(a.value)))) visit(attr, 'value');
  }
  for (const child of node.childNodes ?? []) copyNodes(child, visit);
}

const files = ['index.html', 'about/index.html', 'work/index.html', 'life/index.html',
  ...['adapt-to-china', 'meetfolio', 'abtrace', 'supplier-document-intelligence', 'fanscope'].map(s => `work/${s}/index.html`), '404.html'];
const entries = new Map();
for (const file of files) {
  copyNodes(parse(await readFile(`dist/${file}`, 'utf8')), (node, key) => {
    const text = node[key].replace(/\s+/g, ' ').trim();
    if (/[a-zA-Z]/.test(text)) {
      if (!entries.has(text)) entries.set(text, []);
      entries.get(text).push(file);
    }
  });
}
await mkdir('test-results', { recursive: true });
await writeFile('test-results/localization-inventory.json', JSON.stringify([...entries].map(([en, pages], id) => ({ id, en, pages: [...new Set(pages)] })), null, 2));
console.log(`${entries.size} distinct published strings → test-results/localization-inventory.json`);
