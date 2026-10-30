export interface Testimonial {
  id: string;
  quote: string;
  attribution: string;
  context: string;
  consent: boolean;
  source: 'WeChat' | 'Instagram' | 'Email' | null;
}
/** Only the two excerpts explicitly authorized in the supplied content package.
 * Preserve punctuation and wording. Authorization does not cover other comments.
 */
export const testimonials: Testimonial[] = [
  {
    id: 'beijing-support',
    quote: 'The help from Martin at Adapt to China has been absolutely invaluable since I moved to Beijing. … He then completes the assistance quickly and thoroughly, and won’t accept the fee until he ensures his solution or service is able to satisfy the need. … He has provided me with assistance in finding services for my pet, myself, has helped me to resolve problems with utilities and housing, made calls for me (since I don’t speak Mandarin this is particularly challenging for me) … I wouldn’t have had nearly as successful or seamless of a start here without Martin’s support.',
    attribution: 'Anonymous international resident · Beijing',
    context: 'Pet services, housing & local coordination',
    consent: true,
    source: null, // TODO(Martin): confirm original channel; no source channel is claimed publicly.
  },
  {
    id: 'hospital-navigation',
    quote: "I spent an hour yesterday looking for that X ray section even with wechat translate I couldn't find it. … your guidelines are really straight forward and detailed which I really appreciate. you made things smoother and easier",
    attribution: 'Anonymous international user',
    context: 'Hospital X-ray section / information navigation',
    consent: true,
    source: null, // TODO(Martin): confirm original channel.
  },
];
