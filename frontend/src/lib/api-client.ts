// frontend/src/lib/api-client.ts

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type FetchOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
};

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

/** Upload a file or blob via multipart/form-data */
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
