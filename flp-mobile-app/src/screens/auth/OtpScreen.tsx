import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { supabase } from '../../lib/supabase';
import type { AuthStackParamList } from '../../navigation/types';
import { useSession } from '../../state/session';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { TextField } from '../../ui/TextField';
import { colors, typography } from '../../ui/theme';

const RESEND_SECONDS = 30;

type Props = NativeStackScreenProps<AuthStackParamList, 'Otp'>;

export function OtpScreen({ route, navigation }: Props) {
  const { phone } = route.params;
  const refreshProfile = useSession(s => s.refreshProfile);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    const id = setInterval(() => setCooldown(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  async function verify() {
    setError(null);
    setVerifying(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token: code,
        type: 'sms',
      });
      if (verifyError) {
        setError('Wrong or expired code. Please try again.');
        return;
      }
      await refreshProfile();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setVerifying(false);
    }
  }

  async function resend() {
    setCooldown(RESEND_SECONDS);
    setError(null);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone });
      if (otpError) setError('Could not resend the OTP. Please try again.');
    } catch {
      setError('Could not resend the OTP. Please try again.');
    }
  }

  return (
    <Screen>
      <Text style={typography.title}>Enter the code</Text>
      <Text style={typography.body}>We sent a 6-digit code to {phone}.</Text>
      <TextField
        label="OTP code"
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={6}
        value={code}
        onChangeText={text => setCode(text.replace(/\D/g, ''))}
        error={error}
      />
      <Button
        title="Verify"
        onPress={verify}
        disabled={!/^\d{6}$/.test(code)}
        loading={verifying}
      />
      <Button title="Resend OTP" variant="secondary" onPress={resend} disabled={cooldown > 0} />
      {cooldown > 0 ? (
        <Text style={styles.hint}>You can resend the code in {cooldown}s</Text>
      ) : null}
      <Button title="Change number" variant="secondary" onPress={() => navigation.goBack()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 8 },
});
