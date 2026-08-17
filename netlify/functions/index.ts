import { app } from '../../src/app';

/**
 * Netlify Functions 适配器（手写，约 30 行）。
 * 把 Netlify 的 Lambda 风格 event 转成 Web Request，调用 Hono，再把 Response 转回。
 */

interface NetlifyEvent {
  rawUrl?: string;
  rawQuery?: string;
  path?: string;
  httpMethod?: string;
  headers?: Record<string, string>;
  queryStringParameters?: Record<string, string> | null;
  body?: string | null;
  isBase64Encoded?: boolean;
}

function buildUrl(event: NetlifyEvent): string {
  if (event.rawUrl) return event.rawUrl;
  const host = event.headers?.host ?? 'localhost';
  const path = event.path ?? '/';
  let qs = event.rawQuery;
  if (!qs && event.queryStringParameters) {
    qs = new URLSearchParams(event.queryStringParameters).toString();
  }
  return `https://${host}${path}${qs ? '?' + qs : ''}`;
}

export const handler = async (event: NetlifyEvent) => {
  const url = buildUrl(event);
  const method = (event.httpMethod ?? 'GET').toUpperCase();
  const headers = new Headers(event.headers ?? {});

  let body: string | Uint8Array | null = null;
  if (event.body != null) {
    body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
  }

  const request = new Request(url, { method, headers, body: body ?? undefined });
  const response = await app.fetch(request);

  const responseBody = Buffer.from(await response.arrayBuffer());
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return {
    statusCode: response.status,
    headers: responseHeaders,
    body: responseBody.toString('base64'),
    isBase64Encoded: true,
  };
};
