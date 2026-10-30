import { testimonials, type Testimonial as Quote } from '../data/testimonials';
export function Testimonial({ id, compact = false }: { id: string; compact?: boolean }) {
  const t: Quote | undefined = testimonials.find(t => t.id === id);
  if (!t || t.consent !== true) return null;
  return <figure className={`testimonial${compact ? ' testimonial--compact' : ''}`} data-testimonial={t.id} data-consent="true" data-reveal>
    <figcaption><span className="eyebrow">{t.context}</span></figcaption>
    <blockquote><p>{t.quote}</p></blockquote>
    <figcaption><span>{t.attribution}</span><small>Shared with permission. Lightly trimmed; names and photos removed.</small></figcaption>
  </figure>;
}
