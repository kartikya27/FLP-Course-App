import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { apiFetch } from '../src/lib/api';
import { ProfileSetupScreen } from '../src/screens/auth/ProfileSetupScreen';
import { useSession } from '../src/state/session';
import { makeProfile } from './helpers/profile';

jest.mock('../src/lib/supabase', () => ({ supabase: { auth: {} } }));
jest.mock('../src/lib/api', () => ({ apiFetch: jest.fn() }));

const apiFetchMock = apiFetch as jest.Mock;

describe('ProfileSetupScreen', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    useSession.setState({
      status: 'needsProfile',
      profile: makeProfile({ fullName: null }),
      devSession: false,
    });
  });

  it('requires a name of at least 2 characters', async () => {
    await render(<ProfileSetupScreen />);

    await fireEvent.changeText(screen.getByLabelText('Full name'), ' A ');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Enter your full name')).toBeOnTheScreen();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid email', async () => {
    await render(<ProfileSetupScreen />);

    await fireEvent.changeText(screen.getByLabelText('Full name'), 'Asha Verma');
    await fireEvent.changeText(screen.getByLabelText('Email (optional)'), 'asha@');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Enter a valid email or leave it empty')).toBeOnTheScreen();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it('saves the trimmed name and moves to ready', async () => {
    apiFetchMock.mockResolvedValue(makeProfile({ fullName: 'Asha Verma' }));
    await render(<ProfileSetupScreen />);

    await fireEvent.changeText(screen.getByLabelText('Full name'), '  Asha Verma  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(useSession.getState().status).toBe('ready'));
    expect(apiFetchMock).toHaveBeenCalledWith('/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ fullName: 'Asha Verma', email: null }),
    });
  });

  it('saves on the device during a development login, without the API', async () => {
    useSession.setState({
      status: 'needsProfile',
      devSession: true,
      profile: makeProfile({ fullName: null }),
    });
    await render(<ProfileSetupScreen />);

    await fireEvent.changeText(screen.getByLabelText('Full name'), 'Asha Verma');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(apiFetchMock).not.toHaveBeenCalled();
    expect(useSession.getState()).toMatchObject({
      status: 'ready',
      profile: { fullName: 'Asha Verma' },
    });
  });
});
