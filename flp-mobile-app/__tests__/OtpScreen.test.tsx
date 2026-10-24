import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { supabase } from '../src/lib/supabase';
import { OtpScreen } from '../src/screens/auth/OtpScreen';
import { useSession } from '../src/state/session';

jest.mock('../src/lib/supabase', () => ({
  supabase: { auth: { signInWithOtp: jest.fn(), verifyOtp: jest.fn() } },
}));
jest.mock('../src/lib/api', () => ({ apiFetch: jest.fn() }));

const auth = supabase.auth as unknown as { signInWithOtp: jest.Mock; verifyOtp: jest.Mock };
const PHONE = '+919876543210';

function renderOtp() {
  const props = {
    navigation: { navigate: jest.fn(), goBack: jest.fn() },
    route: { key: 'Otp', name: 'Otp', params: { phone: PHONE } },
  } as unknown as React.ComponentProps<typeof OtpScreen>;
  return render(<OtpScreen {...props} />);
}

describe('OtpScreen', () => {
  const refreshProfile = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    auth.signInWithOtp.mockReset().mockResolvedValue({ data: {}, error: null });
    auth.verifyOtp.mockReset();
    refreshProfile.mockReset().mockResolvedValue(undefined);
    useSession.setState({ refreshProfile });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps Resend OTP disabled for 30 seconds, then enables it', async () => {
    await renderOtp();

    expect(screen.getByRole('button', { name: 'Resend OTP' })).toBeDisabled();
    await act(async () => {
      jest.advanceTimersByTime(29_000);
    });
    expect(screen.getByRole('button', { name: 'Resend OTP' })).toBeDisabled();
    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });
    expect(screen.getByRole('button', { name: 'Resend OTP' })).toBeEnabled();
  });

  it('resending sends a new OTP and restarts the wait', async () => {
    await renderOtp();
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Resend OTP' }));

    await waitFor(() => expect(auth.signInWithOtp).toHaveBeenCalledWith({ phone: PHONE }));
    expect(screen.getByRole('button', { name: 'Resend OTP' })).toBeDisabled();
  });

  it('verifies the 6-digit code and then loads the profile', async () => {
    auth.verifyOtp.mockResolvedValue({ data: {}, error: null });
    await renderOtp();

    await fireEvent.changeText(screen.getByLabelText('OTP code'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() => expect(refreshProfile).toHaveBeenCalledTimes(1));
    expect(auth.verifyOtp).toHaveBeenCalledWith({ phone: PHONE, token: '123456', type: 'sms' });
  });

  it('keeps Verify disabled until 6 digits are entered', async () => {
    await renderOtp();

    await fireEvent.changeText(screen.getByLabelText('OTP code'), '12345');

    expect(screen.getByRole('button', { name: 'Verify' })).toBeDisabled();
  });

  it('shows an error for a wrong or expired code', async () => {
    auth.verifyOtp.mockResolvedValue({
      data: {},
      error: { message: 'Token has expired or is invalid' },
    });
    await renderOtp();

    await fireEvent.changeText(screen.getByLabelText('OTP code'), '000000');
    await fireEvent.press(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText('Wrong or expired code. Please try again.')).toBeOnTheScreen();
    expect(refreshProfile).not.toHaveBeenCalled();
  });
});
