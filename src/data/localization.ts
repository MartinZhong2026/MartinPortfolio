import poolChinese from './locales/pool.zh-CN.json';

export type Locale = 'en' | 'zh';
export const localeFromPath = (path: string): Locale => /^\/zh(?:\/|$)/.test(path) ? 'zh' : 'en';
export const englishPath = (path: string) => path.replace(/^\/zh(?=\/|$)/, '') || '/';

/** Only page URLs are localized; assets and external destinations stay shared. */
export function localizedPath(path: string, locale: Locale): string {
  const base = englishPath(path);
  return locale === 'zh' ? `/zh${base}` : base;
}

export function poolText(text: string, locale: Locale): string {
  if (locale === 'en') return text;
  const value = (poolChinese as Record<string, string>)[text];
  if (value === undefined) throw new Error(`Missing Chinese pool copy: ${text}`);
  return value;
}
