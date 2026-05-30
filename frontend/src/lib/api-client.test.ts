import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiRequest, ApiError } from './api-client';

const BASE = 'http://localhost:3001';

function stubFetch(data: unknown, ok = true, status = 200) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response);
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('apiRequest', () => {
  it('returns parsed JSON and targets BASE_URL + path', async () => {
    const fetchMock = stubFetch({ ok: true, value: 42 });
    const res = await apiRequest<{ value: number }>('/things');
    expect(res).toEqual({ ok: true, value: 42 });
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/things`, expect.any(Object));
  });

  it('sends a Bearer token when provided', async () => {
    const fetchMock = stubFetch({});
    await apiRequest('/things', { token: 'abc' });
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers.Authorization).toBe('Bearer abc');
  });

  it('JSON-encodes a body and sets Content-Type', async () => {
    const fetchMock = stubFetch({});
    await apiRequest('/things', { method: 'POST', body: { a: 1 } });
    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('throws ApiError carrying status + server message on non-2xx', async () => {
    stubFetch({ message: 'Not allowed' }, false, 403);
    let err: unknown;
    try {
      await apiRequest('/things');
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(403);
    expect((err as ApiError).message).toBe('Not allowed');
  });

  it('falls back to a generic message when none is provided', async () => {
    stubFetch(null, false, 500);
    await expect(apiRequest('/things')).rejects.toThrow('Request failed with status 500');
  });
});
