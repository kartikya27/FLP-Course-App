import { Text } from 'react-native';
import { useSession } from '../../state/session';
import { Screen } from '../../ui/Screen';
import { typography } from '../../ui/theme';

export function HomeScreen() {
  const fullName = useSession(s => s.profile?.fullName);

  return (
    <Screen>
      <Text style={typography.title}>Hi, {fullName}</Text>
      <Text style={typography.body}>Courses and upcoming live classes will appear here.</Text>
    </Screen>
  );
}
