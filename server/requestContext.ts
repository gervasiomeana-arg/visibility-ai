import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export function apiRequestContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 'no-store');

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const safePath = `${req.baseUrl}${req.path}`;

    console.log(
      JSON.stringify({
        type: 'api_request',
        requestId,
        method: req.method,
        path: safePath,
        status: res.statusCode,
        durationMs,
      })
    );
  });

  next();
}
