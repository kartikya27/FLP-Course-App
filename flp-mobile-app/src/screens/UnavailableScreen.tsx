import { Text } from 'react-native';
import { useSession } from '../state/session';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { typography } from '../ui/theme';

export function UnavailableScreen() {
  const refreshProfile = useSession(s => s.refreshProfile);
  const signOut = useSession(s => s.signOut);

  return (
    <Screen>
      <Text style={typography.title}>Can't reach FLP right now</Text>
      <Text style={typography.body}>Check your internet connection and try again.</Text>
      <Button title="Try again" onPress={refreshProfile} />
      <Button title="Log out" variant="secondary" onPress={signOut} />
    </Screen>
  );
}
