import { AppState } from 'react-native';
import { create } from 'zustand';
import { devStudentProfile } from '../dev/devAuth';
import { apiFetch, type ProfileDto } from '../lib/api';
import { ApiError } from '../lib/api-error';
import { supabase } from '../lib/supabase';

// unavailable: signed in to Supabase, but the FLP API could not be reached. The session is kept.
export type SessionStatus =
  | 'loading'
  | 'signedOut'
  | 'needsProfile'
  | 'blocked'
  | 'ready'
  | 'unavailable';

interface SessionState {
  status: SessionStatus;
  profile: ProfileDto | null;
  // A development login (see src/dev/devAuth.ts): the profile lives on the device only.
  devSession: boolean;
  startDevSession(phone: string): void;
  // Never throws: failures end in 'signedOut' (session rejected) or 'unavailable' (anything else).
  refreshProfile(): Promise<void>;
  setProfile(profile: ProfileDto): void;
  signOut(): Promise<void>;
}

function statusFor(profile: ProfileDto): SessionStatus {
  if (profile.status === 'blocked') return 'blocked';
  if (!profile.fullName) return 'needsProfile';
  return 'ready';
}

export const useSession = create<SessionState>()((set, get) => ({
  status: 'loading',
  profile: null,
  devSession: false,
  startDevSession: phone =>
    set({ devSession: true, profile: devStudentProfile(phone), status: 'needsProfile' }),
  refreshProfile: async () => {
    try {
      const profile = await apiFetch<ProfileDto>('/v1/me');
      set({ profile, status: statusFor(profile) });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        set({ profile: null, status: 'signedOut' });
        await supabase.auth.signOut().catch(() => {});
        return;
      }
      set({ status: 'unavailable' });
    }
  },
  setProfile: profile => set({ profile, status: statusFor(profile) }),
  signOut: async () => {
    if (get().devSession) {
      set({ devSession: false, profile: null, status: 'signedOut' });
      return;
    }
    await supabase.auth.signOut();
    set({ profile: null, status: 'signedOut' });
  },
}));

// Follows the stored Supabase session on app start and on sign-out, and retries a failed
// profile load when the app returns to the foreground.
// Sign-in is handled by the OTP screen, which loads the profile itself.
export function startSessionListener(): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_OUT') return;
    // supabase-js can deadlock if another auth call runs inside this callback, so defer it.
    setTimeout(() => {
      if (!session) {
        useSession.setState({ status: 'signedOut', profile: null });
        return;
      }
      useSession.getState().refreshProfile();
    }, 0);
  });

  const appState = AppState.addEventListener('change', state => {
    if (state === 'active' && useSession.getState().status === 'unavailable') {
      useSession.getState().refreshProfile();
    }
  });

  return () => {
    data.subscription.unsubscribe();
    appState.remove();
  };
}
