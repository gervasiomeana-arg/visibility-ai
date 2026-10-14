export function reportPdfName(businessName: string, date: string): string {
  const safe = businessName.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'negocio';
  return `Visibility-${safe}-${date.replace(/[^0-9-]/g, '').slice(0, 10)}.pdf`;
}
