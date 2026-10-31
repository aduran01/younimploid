// hiring.cafe redirects to hiringcafe.com, so both count (D-022).
// Keep in step with content_scripts in manifest.config.ts.
const HOSTS = new Set(['hiring.cafe', 'www.hiring.cafe', 'hiringcafe.com', 'www.hiringcafe.com']);

export function isHiringCafeUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}
