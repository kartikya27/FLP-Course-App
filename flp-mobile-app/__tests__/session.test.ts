import { apiFetch } from '../src/lib/api';
import { ApiError } from '../src/lib/api-error';
import { AppState } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { startSessionListener, useSession } from '../src/state/session';
import { makeProfile } from './helpers/profile';

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest.fn(),
    },
  },
}));
jest.mock('../src/lib/api', () => ({ apiFetch: jest.fn() }));

const apiFetchMock = apiFetch as jest.Mock;
const onAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;

describe('useSession.refreshProfile', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    (supabase.auth.signOut as jest.Mock).mockClear();
    useSession.setState({ status: 'loading', profile: null });
  });

  it('is ready for an active student with a name', async () => {
    apiFetchMock.mockResolvedValue(makeProfile());

    await useSession.getState().refreshProfile();

    expect(apiFetchMock).toHaveBeenCalledWith('/v1/me');
    expect(useSession.getState().status).toBe('ready');
  });

  it('needs a profile when the name is missing', async () => {
    apiFetchMock.mockResolvedValue(makeProfile({ fullName: null }));

    await useSession.getState().refreshProfile();

    expect(useSession.getState().status).toBe('needsProfile');
  });

  it('is blocked for a blocked user, even without a name', async () => {
    apiFetchMock.mockResolvedValue(makeProfile({ fullName: null, status: 'blocked' }));

    await useSession.getState().refreshProfile();

    expect(useSession.getState().status).toBe('blocked');
  });

  it('is unavailable, without throwing, when the API cannot be reached', async () => {
    apiFetchMock.mockRejectedValue(new TypeError('Network request failed'));

    await expect(useSession.getState().refreshProfile()).resolves.toBeUndefined();

    expect(useSession.getState().status).toBe('unavailable');
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it('signs out when the API rejects the session', async () => {
    apiFetchMock.mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Please log in again'));

    await useSession.getState().refreshProfile();

    expect(useSession.getState().status).toBe('signedOut');
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('signOut clears the profile', async () => {
    useSession.setState({ status: 'ready', profile: makeProfile() });

    await useSession.getState().signOut();

    expect(useSession.getState()).toMatchObject({ status: 'signedOut', profile: null });
  });
});

describe('startSessionListener', () => {
  type Listener = (event: string, session: unknown) => void;
  let emit: Listener;

  beforeEach(() => {
    jest.useFakeTimers();
    apiFetchMock.mockReset();
    useSession.setState({ status: 'loading', profile: null });
    onAuthStateChange.mockImplementation((cb: Listener) => {
      emit = cb;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function flush() {
    jest.runOnlyPendingTimers();
    await Promise.resolve();
    await Promise.resolve();
  }

  it('is signedOut when the app starts without a stored session', async () => {
    startSessionListener();

    emit('INITIAL_SESSION', null);
    await flush();

    expect(useSession.getState().status).toBe('signedOut');
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it('loads the profile when the app starts with a stored session', async () => {
    apiFetchMock.mockResolvedValue(makeProfile());
    startSessionListener();

    emit('INITIAL_SESSION', { access_token: 't' });
    await flush();

    expect(useSession.getState().status).toBe('ready');
  });

  it('keeps the session and shows unavailable when the profile cannot be loaded', async () => {
    apiFetchMock.mockRejectedValue(new TypeError('Network request failed'));
    startSessionListener();

    emit('INITIAL_SESSION', { access_token: 't' });
    await flush();

    expect(useSession.getState().status).toBe('unavailable');
  });

  it('retries when the app comes back to the foreground while unavailable', async () => {
    let onAppState: (state: string) => void = () => {};
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_type: string, cb: (state: string) => void) => {
      onAppState = cb;
      return { remove: jest.fn() };
    }) as never);
    apiFetchMock.mockResolvedValue(makeProfile());
    useSession.setState({ status: 'unavailable', profile: null });
    startSessionListener();

    onAppState('active');
    await flush();

    expect(apiFetchMock).toHaveBeenCalledWith('/v1/me');
    expect(useSession.getState().status).toBe('ready');
  });

  it('ignores token refreshes', async () => {
    useSession.setState({ status: 'ready', profile: makeProfile() });
    startSessionListener();

    emit('TOKEN_REFRESHED', { access_token: 't2' });
    await flush();

    expect(apiFetchMock).not.toHaveBeenCalled();
    expect(useSession.getState().status).toBe('ready');
  });
});
