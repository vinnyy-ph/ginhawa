// frontend/src/lib/api-client.ts

/**
 * Centralised HTTP client for all NestJS backend calls.
 *
 * Both `apiRequest` and `apiUpload` resolve against `NEXT_PUBLIC_API_URL`
 * (falls back to `http://localhost:3001`). On a non-2xx response both helpers
 * throw an `ApiError` — callers should catch and narrow on `error.status`.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Options accepted by `apiRequest`. Extends the native `RequestInit` but
 *  replaces `body` with `unknown` (the helper JSON-stringifies internally) and
 *  adds a `token` shortcut for the Bearer auth header. */
type FetchOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
};

/** Thrown by `apiRequest` / `apiUpload` whenever the backend returns a
 *  non-2xx status. Includes the raw HTTP `status` code and the parsed JSON
 *  response body (`data`) for fine-grained error handling by callers. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Generic JSON fetch wrapper for all backend API calls.
 *
 * - Callers pass a plain object as `options.body`; this function
 *   JSON-stringifies it and sets `Content-Type: application/json` automatically.
 *   Never pre-stringify the body before passing it in.
 * - If `options.token` is provided it is forwarded as `Authorization: Bearer <token>`.
 * - On a non-2xx response an `ApiError` is thrown with the HTTP status and the
 *   parsed error payload from the backend.
 *
 * @param path - Backend path beginning with `/` (e.g. `"/appointments"`).
 * @param options - Fetch options extended with `body`, `token`, and extra `headers`.
 * @returns Parsed JSON response cast to `T`.
 */
export async function apiRequest<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { body, token, headers: extraHeaders = {}, ...rest } = options;

  const headers: Record<string, string> = {
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...extraHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data as { message?: string })?.message ??
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}

/**
 * Upload a file or Blob to the backend via `multipart/form-data` (POST).
 *
 * The file is appended under `fieldName`. If `filename` is omitted the
 * original `File.name` is used; bare `Blob` values fall back to `"upload.webm"`.
 * Throws `ApiError` on non-2xx responses, identical to `apiRequest`.
 *
 * @param path - Backend path beginning with `/`.
 * @param fieldName - Form field name the server expects (e.g. `"file"`).
 * @param file - The file or blob to upload.
 * @param token - Optional Bearer token.
 * @param filename - Override the filename sent to the server.
 */
export async function apiUpload<T>(
  path: string,
  fieldName: string,
  file: File | Blob,
  token?: string,
  filename?: string,
): Promise<T> {
  const formData = new FormData();
  
  if (filename) {
    formData.append(fieldName, file, filename);
  } else if (file instanceof File) {
    formData.append(fieldName, file, file.name);
  } else {
    // Fallback for Blob if no filename is provided
    formData.append(fieldName, file, 'upload.webm'); 
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data as { message?: string })?.message ??
      `Upload failed with status ${response.status}`;
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}
