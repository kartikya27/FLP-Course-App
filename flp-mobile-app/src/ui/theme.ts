import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#1D4ED8',
  text: '#111827',
  muted: '#6B7280',
  border: '#D1D5DB',
  danger: '#B91C1C',
  background: '#FFFFFF',
};

export const typography = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 },
  body: { fontSize: 15, color: colors.muted, marginBottom: 24, lineHeight: 21 },
});
