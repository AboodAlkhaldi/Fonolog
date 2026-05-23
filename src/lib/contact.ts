/**
 * Single source of truth for user-facing contact strings.
 * Anything that opens a mailto: or shows a support email must use these.
 */
export const SUPPORT_EMAIL = 'fonologpro@gmail.com';

/** Build a mailto: URL with a Fonolog-prefixed subject. */
export function supportMailto(topic: string): string {
  const subject = encodeURIComponent(`Fonolog - ${topic}`);
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}`;
}
