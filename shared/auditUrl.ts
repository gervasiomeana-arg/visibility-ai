/** Normalize user input only. Server DNS/IP and redirect checks still apply. */
export function normalizeAuditUrl(input: string): string {
  if (typeof input !== 'string' || !input.trim()) throw new Error('Ingresá la dirección web que querés auditar.');
  const value = input.trim();
  if (value.length > 2048) throw new Error('La dirección web supera los 2048 caracteres.');
  if (/[\s\\\u0000-\u001f\u007f]/.test(value)) throw new Error('La dirección web contiene espacios o caracteres no válidos.');
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
  const bareHostWithPort = /^[a-z0-9.-]+:\d+(?:[/?#]|$)/i.test(value);
  if (hasScheme && !/^https:\/\//i.test(value) && !bareHostWithPort) {
    throw new Error('La auditoría requiere una dirección HTTPS. Usá https:// seguido del dominio.');
  }
  let url: URL;
  try {
    url = new URL(/^https:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    throw new Error('La dirección web no es válida. Por ejemplo: https://tu-negocio.com.');
  }
  if (url.protocol !== 'https:') throw new Error('La auditoría requiere una dirección HTTPS.');
  if (url.username || url.password) throw new Error('Ingresá una dirección sin usuario ni contraseña incluidos.');
  if (!url.hostname.includes('.') && !url.hostname.startsWith('[')) throw new Error('Ingresá un dominio completo, por ejemplo https://tu-negocio.com.');
  if (url.href.length > 2048) throw new Error('La dirección web supera los 2048 caracteres.');
  return url.href;
}
