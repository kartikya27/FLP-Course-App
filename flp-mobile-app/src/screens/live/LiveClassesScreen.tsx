import { Text } from 'react-native';
import { Screen } from '../../ui/Screen';
import { typography } from '../../ui/theme';

export function LiveClassesScreen() {
  return (
    <Screen>
      <Text style={typography.title}>Live classes</Text>
      <Text style={typography.body}>Your upcoming live classes will appear here.</Text>
    </Screen>
  );
}
