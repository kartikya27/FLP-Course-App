import { useState } from 'react';
import { Text } from 'react-native';
import { apiFetch, type ProfileDto } from '../../lib/api';
import { useSession } from '../../state/session';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { TextField } from '../../ui/TextField';
import { colors, typography } from '../../ui/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormErrors {
  fullName?: string;
  email?: string;
  form?: string;
}

export function ProfileSetupScreen() {
  const setProfile = useSession(s => s.setProfile);
  const devSession = useSession(s => s.devSession);
  const currentProfile = useSession(s => s.profile);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  async function save() {
    const name = fullName.trim();
    const mail = email.trim();
    const next: FormErrors = {};
    if (name.length < 2) next.fullName = 'Enter your full name';
    if (mail && !EMAIL_RE.test(mail)) next.email = 'Enter a valid email or leave it empty';
    setErrors(next);
    if (next.fullName || next.email) return;

    if (devSession && currentProfile) {
      setProfile({ ...currentProfile, fullName: name, email: mail || null });
      return;
    }

    setSaving(true);
    try {
      const profile = await apiFetch<ProfileDto>('/v1/me', {
        method: 'PATCH',
        body: JSON.stringify({ fullName: name, email: mail || null }),
      });
      setProfile(profile);
    } catch {
      setErrors({ form: 'Could not save your details. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Text style={typography.title}>Tell us your name</Text>
      <Text style={typography.body}>This is how your name appears in classes.</Text>
      <TextField
        label="Full name"
        autoComplete="name"
        textContentType="name"
        maxLength={80}
        value={fullName}
        onChangeText={setFullName}
        error={errors.fullName}
      />
      <TextField
        label="Email (optional)"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
      />
      {errors.form ? <Text style={{ color: colors.danger }}>{errors.form}</Text> : null}
      <Button title="Continue" onPress={save} loading={saving} />
    </Screen>
  );
}
