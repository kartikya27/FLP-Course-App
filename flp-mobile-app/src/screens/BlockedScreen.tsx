import { Text } from 'react-native';
import { useSession } from '../state/session';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { typography } from '../ui/theme';

export function BlockedScreen() {
  const signOut = useSession(s => s.signOut);

  return (
    <Screen>
      <Text style={typography.title}>Your account is blocked</Text>
      <Text style={typography.body}>Please contact FLP support for help.</Text>
      <Button title="Log out" variant="secondary" onPress={signOut} />
    </Screen>
  );
}
