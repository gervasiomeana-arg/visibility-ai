/** Safe, structured diagnostics. Never forward third-party bodies or raw error messages. */
export class PublicPageError extends Error {
  constructor(readonly reason: 'http' | 'content-type', readonly httpStatus?: number) {
    super(reason === 'http' ? 'Public page HTTP failure' : 'Public page is not HTML');
    this.name = 'PublicPageError';
  }
}
export type PublicReadReason = 'dns' | 'timeout' | 'access-denied' | 'rate-limited' | 'login-required' | 'not-found' | 'http-error' | 'unsupported-content' | 'response-too-large' | 'tls' | 'network';
export function publicReadFailure(error: unknown): { code: PublicReadReason; message: string; httpStatus?: number } {
  if (error instanceof PublicPageError) {
    if (error.reason === 'content-type') return { code: 'unsupported-content', message: 'La dirección respondió con un formato que no es HTML; no se extrajeron métricas.' };
    const status = error.httpStatus;
    const httpStatus = typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599 ? status : undefined;
    if (status === 429) return { code: 'rate-limited', httpStatus, message: 'La consulta recibió HTTP 429: límite de solicitudes. No se reintenta automáticamente ni se guardan cifras.' };
    if (status === 401) return { code: 'login-required', httpStatus, message: 'La consulta recibió HTTP 401: requiere autorización. No se utilizaron credenciales ni se guardaron cifras.' };
    if (status === 403) return { code: 'access-denied', httpStatus, message: 'La consulta recibió HTTP 403: acceso denegado. Ese código por sí solo no identifica la causa ni demuestra que el perfil no exista.' };
    if (status === 404) return { code: 'not-found', httpStatus, message: 'La consulta recibió HTTP 404. No se confirmó la disponibilidad de esa dirección; el perfil guardado se conserva.' };
    return { code: 'http-error', ...(httpStatus ? { httpStatus } : {}), message: `El sitio respondió con un error HTTP${httpStatus ? ` ${httpStatus}` : ''}. No se obtuvieron métricas.` };
  }
  let current: any = error;
  for (let depth = 0; current && depth < 4; depth++, current = current.cause) {
    if (['ENOTFOUND', 'EAI_AGAIN', 'EAI_FAIL'].includes(current.code)) return { code: 'dns', message: 'El servidor no pudo resolver el dominio (DNS). No se llegó a verificar qué datos entrega la red social.' };
    if (['ETIMEDOUT', 'ESOCKETTIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT'].includes(current.code) || ['AbortError', 'TimeoutError'].includes(current.name)) return { code: 'timeout', message: 'La consulta superó el tiempo máximo. No se obtuvieron métricas ni se confirmó la causa en la plataforma.' };
    if (['CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'ERR_TLS_CERT_ALTNAME_INVALID'].includes(current.code)) return { code: 'tls', message: 'No se pudo verificar la conexión HTTPS. Se mantuvieron las comprobaciones de seguridad y no se obtuvieron métricas.' };
    if (current.message === 'Response is too large to audit') return { code: 'response-too-large', message: 'La respuesta supera el límite seguro de lectura. No se procesó ni se guardó una medición.' };
  }
  return { code: 'network', message: 'No se completó la lectura pública. No hay evidencia suficiente para atribuirlo a un bloqueo de la plataforma; los datos guardados se conservan.' };
}
