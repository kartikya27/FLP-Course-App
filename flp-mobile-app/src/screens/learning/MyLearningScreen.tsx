import { Text } from 'react-native';
import { Screen } from '../../ui/Screen';
import { typography } from '../../ui/theme';

export function MyLearningScreen() {
  return (
    <Screen>
      <Text style={typography.title}>My Learning</Text>
      <Text style={typography.body}>Courses you buy will appear here.</Text>
    </Screen>
  );
}
