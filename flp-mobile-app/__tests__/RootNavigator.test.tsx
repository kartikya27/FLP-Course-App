import { NavigationContainer } from '@react-navigation/native';
import { render, screen } from '@testing-library/react-native';
import { RootNavigator } from '../src/navigation/RootNavigator';
import { useSession, type SessionStatus } from '../src/state/session';
import { makeProfile } from './helpers/profile';

jest.mock('../src/lib/supabase', () => ({ supabase: { auth: {} } }));
jest.mock('../src/lib/api', () => ({ apiFetch: jest.fn() }));

function renderWithStatus(status: SessionStatus) {
  useSession.setState({
    status,
    profile: status === 'loading' || status === 'signedOut' ? null : makeProfile(),
  });
  return render(
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>,
  );
}

describe('RootNavigator', () => {
  it('shows a loading indicator while the session loads', async () => {
    await renderWithStatus('loading');

    expect(screen.getByLabelText('Loading')).toBeOnTheScreen();
  });

  it('shows the phone screen when signed out', async () => {
    await renderWithStatus('signedOut');

    expect(await screen.findByText('Enter your mobile number')).toBeOnTheScreen();
  });

  it('asks for a name when the profile is incomplete', async () => {
    await renderWithStatus('needsProfile');

    expect(await screen.findByText('Tell us your name')).toBeOnTheScreen();
  });

  it('shows the blocked screen for a blocked account', async () => {
    await renderWithStatus('blocked');

    expect(await screen.findByText('Your account is blocked')).toBeOnTheScreen();
  });

  it('shows Home with the four tabs when ready', async () => {
    await renderWithStatus('ready');

    expect(await screen.findByText('Hi, Asha Verma')).toBeOnTheScreen();
    for (const tab of ['Home', 'My Learning', 'Live', 'Profile']) {
      expect(screen.getByRole('button', { name: new RegExp(tab) })).toBeOnTheScreen();
    }
  });
});
