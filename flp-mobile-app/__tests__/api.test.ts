import { ApiError } from '../src/lib/api-error';
import { apiFetch } from '../src/lib/api';

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest
        .fn()
        .mockResolvedValue({ data: { session: { access_token: 'token-123' } }, error: null }),
    },
  },
}));

describe('apiFetch', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends the Supabase access token to the configured API', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await expect(apiFetch('/v1/me')).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://api.test/v1/me');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token-123');
  });

  it('throws ApiError with the server error code', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'ACCOUNT_BLOCKED', message: 'Blocked' } }), {
        status: 403,
      }),
    );

    await expect(apiFetch('/v1/me')).rejects.toMatchObject({ status: 403, code: 'ACCOUNT_BLOCKED' });
  });

  it('gives up after 15 seconds with a TIMEOUT error', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
        }),
    );

    const result = apiFetch('/v1/me').catch((e: unknown) => e);
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(15_000);

    const error = await result;
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'TIMEOUT' });
  });
});
