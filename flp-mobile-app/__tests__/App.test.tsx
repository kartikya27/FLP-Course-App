/**
 * @format
 */

import { render, screen } from '@testing-library/react-native';
import App from '../src/App';

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
}));
jest.mock('../src/lib/api', () => ({ apiFetch: jest.fn() }));

test('starts on the loading screen', async () => {
  await render(<App />);

  expect(screen.getByLabelText('Loading')).toBeOnTheScreen();
});
