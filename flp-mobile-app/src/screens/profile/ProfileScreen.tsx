import { Text } from 'react-native';
import { useSession } from '../../state/session';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { typography } from '../../ui/theme';

export function ProfileScreen() {
  const profile = useSession(s => s.profile);
  const signOut = useSession(s => s.signOut);

  return (
    <Screen>
      <Text style={typography.title}>{profile?.fullName}</Text>
      <Text style={typography.body}>
        {[profile?.phone, profile?.email].filter(Boolean).join('\n')}
      </Text>
      <Button title="Log out" variant="secondary" onPress={signOut} />
    </Screen>
  );
}
