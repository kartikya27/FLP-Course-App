import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Text } from 'react-native';
import { normalizeIndianPhone } from '../../lib/phone';
import { supabase } from '../../lib/supabase';
import type { AuthStackParamList } from '../../navigation/types';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { TextField } from '../../ui/TextField';
import { typography } from '../../ui/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Phone'>;

export function PhoneScreen({ navigation }: Props) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function sendOtp() {
    const phone = normalizeIndianPhone(input);
    if (!phone) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setError(null);
    setSending(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone });
      if (otpError) {
        setError('Could not send the OTP. Please try again.');
        return;
      }
      navigation.navigate('Otp', { phone });
    } catch {
      setError('Could not send the OTP. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen>
      <Text style={typography.title}>Enter your mobile number</Text>
      <Text style={typography.body}>We will send a 6-digit code by SMS.</Text>
      <TextField
        label="Mobile number"
        prefix="+91"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        maxLength={16}
        value={input}
        onChangeText={setInput}
        error={error}
      />
      <Button title="Send OTP" onPress={sendOtp} loading={sending} />
    </Screen>
  );
}
