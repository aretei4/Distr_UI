import { authHeaders } from "./authService";

/**
 * Common API client — every backend call goes through here so headers,
 * error handling, and future cross-cutting parameters (tracing, locale,
 * company context, timeouts) live in ONE place.
 *
 * Usage:
 *   api.get<Delivery[]>(url)
 *   api.post<ApiResponse>(url, body)
 *   api.put / api.del
 */

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name   = "ApiError";
    this.status = status;
    this.body   = body;
  }
}

/** Central place to add/adjust headers for every request. */
function buildHeaders(extra?: HeadersInit): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...authHeaders(),          // Authorization: Bearer <token>
    ...extra,
  };
}

/** Parses a body as JSON when possible; falls back to the raw text (some endpoints return plain strings). */
function parseBody(text: string): unknown {
  if (!text) return undefined;
  try { return JSON.parse(text); }
  catch { return text; }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: buildHeaders(options.headers),
  });

  const text = await res.text();
  const body = parseBody(text);

  if (!res.ok) {
    const msg = (body as any)?.message ?? (body as any)?.error
      ?? (typeof body === "string" && body ? body : `Request failed: ${res.status}`);
    throw new ApiError(res.status, msg, body);
  }

  return body as T;
}

export const api = {
  get<T>(url: string): Promise<T> {
    return request<T>(url);
  },

  post<T>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
  },

  put<T>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined });
  },

  patch<T>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined });
  },

  del<T = void>(url: string): Promise<T> {
    return request<T>(url, { method: "DELETE" });
  },

  /** multipart/form-data upload — browser sets the Content-Type boundary itself. */
  async postForm<T>(url: string, form: FormData): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: { ...authHeaders() },   // NO Content-Type — the browser adds the multipart boundary
      body: form,
    });
    const body = parseBody(await res.text());
    if (!res.ok) {
      const msg = (body as any)?.message ?? (body as any)?.error
        ?? (typeof body === "string" && body ? body : `Request failed: ${res.status}`);
      throw new ApiError(res.status, msg, body);
    }
    return body as T;
  },
};
