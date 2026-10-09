export class ApiError extends Error {
  status: number;
  requestId?: string;
  retryAfterSeconds?: number;
  details?: unknown;

  constructor(
    message: string,
    options: {
      status: number;
      requestId?: string;
      retryAfterSeconds?: number;
      details?: unknown;
    }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.requestId = options.requestId;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.details = options.details;
  }
}

function parseRetryAfter(response: Response, body: any): number | undefined {
  const header = response.headers.get('retry-after');
  const headerSeconds = header ? Number(header) : NaN;
  const bodySeconds = Number(body?.retryAfterSeconds);

  if (Number.isFinite(bodySeconds) && bodySeconds > 0) {
    return Math.ceil(bodySeconds);
  }

  if (Number.isFinite(headerSeconds) && headerSeconds > 0) {
    return Math.ceil(headerSeconds);
  }

  return undefined;
}

async function parseResponseBody(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json().catch(() => ({}));
  }

  const text = await response.text().catch(() => '');
  return text ? { message: text } : {};
}

function friendlyRateLimitMessage(retryAfterSeconds?: number): string {
  if (!retryAfterSeconds) {
    return 'Alcanzaste el límite temporal de uso. Probá nuevamente en unos minutos.';
  }

  if (retryAfterSeconds < 60) {
    return `Alcanzaste el límite temporal de uso. Probá nuevamente en ${retryAfterSeconds} segundos.`;
  }

  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Alcanzaste el límite temporal de uso. Probá nuevamente en aproximadamente ${minutes} minuto${minutes === 1 ? '' : 's'}.`;
}

export async function apiFetchJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('accept')) {
    headers.set('accept', 'application/json');
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  const requestId = response.headers.get('x-request-id') || undefined;
  const body = await parseResponseBody(response);

  if (!response.ok) {
    const retryAfterSeconds = parseRetryAfter(response, body);

    let message =
      body?.error ||
      body?.message ||
      `La solicitud falló con código ${response.status}.`;

    if (response.status === 429) {
      message = friendlyRateLimitMessage(retryAfterSeconds);
    } else if (response.status >= 500 && requestId) {
      message = `${message} Referencia: ${requestId}.`;
    }

    throw new ApiError(message, {
      status: response.status,
      requestId,
      retryAfterSeconds,
      details: body,
    });
  }

  return body as T;
}
