import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { BlockedScreen } from '../screens/BlockedScreen';
import { OtpScreen } from '../screens/auth/OtpScreen';
import { PhoneScreen } from '../screens/auth/PhoneScreen';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';
import { useSession } from '../state/session';
import { colors } from '../ui/theme';
import { MainTabs } from './MainTabs';
import type { AuthStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

export function RootNavigator() {
  const status = useSession(s => s.status);

  switch (status) {
    case 'loading':
      return (
        <View style={styles.center}>
          <ActivityIndicator accessibilityLabel="Loading" color={colors.primary} />
        </View>
      );
    case 'signedOut':
      return (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Phone" component={PhoneScreen} />
          <AuthStack.Screen name="Otp" component={OtpScreen} />
        </AuthStack.Navigator>
      );
    case 'needsProfile':
      return <ProfileSetupScreen />;
    case 'blocked':
      return <BlockedScreen />;
    case 'ready':
      return <MainTabs />;
  }
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
