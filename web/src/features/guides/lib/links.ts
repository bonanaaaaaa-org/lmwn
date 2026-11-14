/**
 * Outbound links for a Restaurant. The gateway passes social accounts through as the
 * editor stored them: usually a handle ("@rise.bkk", "onibuscoffee_bkk"), sometimes a URL.
 */

const isUrl = (value: string) => /^https?:\/\//i.test(value);

/** Google Maps at the Restaurant's location. */
export function mapUrl(lat: number, lng: number): string {
  const params = new URLSearchParams({ api: "1", query: `${lat},${lng}` });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

export function telHref(phoneNo: string): string {
  return `tel:${phoneNo.replaceAll(/[^\d+]/g, "")}`;
}

/** A LINE Official Account: "@rise.bkk" → https://line.me/R/ti/p/%40rise.bkk */
export function lineUrl(account: string): string {
  if (isUrl(account)) return account;
  const id = account.startsWith("@") ? account : `@${account}`;
  return `https://line.me/R/ti/p/${encodeURIComponent(id)}`;
}

export function instagramUrl(account: string): string {
  if (isUrl(account)) return account;
  return `https://www.instagram.com/${encodeURIComponent(account.replace(/^@/, ""))}/`;
}

export function facebookUrl(account: string): string {
  if (isUrl(account)) return account;
  return `https://www.facebook.com/${encodeURIComponent(account.replace(/^@/, ""))}`;
}
