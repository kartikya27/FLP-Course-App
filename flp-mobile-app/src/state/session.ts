import { create } from 'zustand';
import { apiFetch, type ProfileDto } from '../lib/api';
import { supabase } from '../lib/supabase';

export type SessionStatus = 'loading' | 'signedOut' | 'needsProfile' | 'blocked' | 'ready';

interface SessionState {
  status: SessionStatus;
  profile: ProfileDto | null;
  refreshProfile(): Promise<void>;
  setProfile(profile: ProfileDto): void;
  signOut(): Promise<void>;
}

function statusFor(profile: ProfileDto): SessionStatus {
  if (profile.status === 'blocked') return 'blocked';
  if (!profile.fullName) return 'needsProfile';
  return 'ready';
}

export const useSession = create<SessionState>()(set => ({
  status: 'loading',
  profile: null,
  refreshProfile: async () => {
    const profile = await apiFetch<ProfileDto>('/v1/me');
    set({ profile, status: statusFor(profile) });
  },
  setProfile: profile => set({ profile, status: statusFor(profile) }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ profile: null, status: 'signedOut' });
  },
}));

// Follows the stored Supabase session on app start and on sign-out.
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
      useSession
        .getState()
        .refreshProfile()
        .catch(() => useSession.setState({ status: 'signedOut', profile: null }));
    }, 0);
  });
  return () => data.subscription.unsubscribe();
}
