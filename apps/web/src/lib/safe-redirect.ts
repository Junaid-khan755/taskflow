/**
 * After login we send people back to the page they wanted (?next=/boards/123).
 * An attacker could send someone a link like /login?next=https://evil.com,
 * hoping to bounce them to a fake site after a real login (an "open redirect").
 *
 * So only accept paths inside this app. Note "//evil.com" and "/\evil.com"
 * start with "/" but browsers treat them as other websites, so block those too.
 */
export function safeNextPath(next: string | null) {
  if (!next) {
    return '/';
  }
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return '/';
  }
  return next;
}
