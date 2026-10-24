import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/home/HomeScreen';
import { MyLearningScreen } from '../screens/learning/MyLearningScreen';
import { LiveClassesScreen } from '../screens/live/LiveClassesScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { colors } from '../ui/theme';

const Tab = createBottomTabNavigator();

export function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="MyLearning" component={MyLearningScreen} options={{ title: 'My Learning' }} />
      <Tab.Screen name="Live" component={LiveClassesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
