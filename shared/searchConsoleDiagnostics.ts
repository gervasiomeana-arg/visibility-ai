export function credentialState(
  status: { missing?: string[] } | null,
  variable: string,
): 'unknown' | 'missing' | 'configured' {
  if (!Array.isArray(status?.missing)) return 'unknown';
  return status.missing.includes(variable) ? 'missing' : 'configured';
}

export function propertyMatchesBusiness(siteUrl: string, businessUrl: string): boolean {
  try {
    const business = new URL(businessUrl);
    if (siteUrl.startsWith('sc-domain:')) {
      const domain = siteUrl.slice('sc-domain:'.length).toLowerCase();
      return Boolean(domain) && (business.hostname === domain || business.hostname.endsWith(`.${domain}`));
    }
    const site = new URL(siteUrl);
    return business.origin === site.origin && business.pathname.startsWith(site.pathname);
  } catch {
    return false;
  }
}
