import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { supabase } from '../src/lib/supabase';
import { PhoneScreen } from '../src/screens/auth/PhoneScreen';

jest.mock('../src/lib/supabase', () => ({
  supabase: { auth: { signInWithOtp: jest.fn() } },
}));

const signInWithOtp = supabase.auth.signInWithOtp as jest.Mock;
const navigate = jest.fn();

function renderPhone() {
  const props = {
    navigation: { navigate },
    route: { key: 'Phone', name: 'Phone', params: undefined },
  } as unknown as React.ComponentProps<typeof PhoneScreen>;
  return render(<PhoneScreen {...props} />);
}

describe('PhoneScreen', () => {
  beforeEach(() => {
    signInWithOtp.mockReset();
    navigate.mockReset();
  });

  it('rejects an invalid number without calling Supabase', async () => {
    await renderPhone();

    await fireEvent.changeText(screen.getByLabelText('Mobile number'), '12345');
    await fireEvent.press(screen.getByRole('button', { name: 'Send OTP' }));

    expect(screen.getByText('Enter a valid 10-digit mobile number')).toBeOnTheScreen();
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it('sends the OTP to the normalized number and opens the OTP screen', async () => {
    signInWithOtp.mockResolvedValue({ data: {}, error: null });
    await renderPhone();

    await fireEvent.changeText(screen.getByLabelText('Mobile number'), '098765 43210');
    await fireEvent.press(screen.getByRole('button', { name: 'Send OTP' }));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('Otp', { phone: '+919876543210' }),
    );
    expect(signInWithOtp).toHaveBeenCalledWith({ phone: '+919876543210' });
  });

  it('shows an error when the OTP cannot be sent', async () => {
    signInWithOtp.mockResolvedValue({ data: {}, error: { message: 'SMS provider down' } });
    await renderPhone();

    await fireEvent.changeText(screen.getByLabelText('Mobile number'), '9876543210');
    await fireEvent.press(screen.getByRole('button', { name: 'Send OTP' }));

    expect(await screen.findByText('Could not send the OTP. Please try again.')).toBeOnTheScreen();
    expect(navigate).not.toHaveBeenCalled();
  });
});
