import { useState } from 'react';
import {
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function VerifyEmailScreen() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const [email] = useState(emailParam ?? '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resentAt, setResentAt] = useState<number | null>(null);

  async function verify() {
    if (!code.trim() || !email) return;
    setLoading(true);
    setError('');
    try {
      const { error: vErr } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'signup',
      });
      if (vErr) throw vErr;
      // SIGNED_IN fires; _layout.tsx routes to /onboarding (or /(tabs)) automatically.
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not verify code');
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!email) return;
    setResending(true);
    setError('');
    try {
      const { error: rErr } = await supabase.auth.resend({ type: 'signup', email });
      if (rErr) throw rErr;
      setResentAt(Date.now());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not resend code');
    } finally {
      setResending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to {email || 'your inbox'}. Enter it below to confirm your account.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {resentAt ? <Text style={styles.info}>New code sent.</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="6-digit code"
        placeholderTextColor="#6B7280"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        autoFocus
        maxLength={6}
      />

      <Pressable style={styles.button} onPress={verify} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#0A0B14" />
          : <Text style={styles.buttonText}>Confirm</Text>}
      </Pressable>

      <Pressable onPress={resend} disabled={resending}>
        <Text style={styles.toggle}>
          {resending ? 'Sending…' : 'Resend code'}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.replace('/auth')}>
        <Text style={styles.toggle}>Back to Sign In</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0B14',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 36,
    color: '#F5F0E8',
    marginBottom: 4,
    fontWeight: '300',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  error: {
    color: '#F87171',
    fontSize: 13,
  },
  info: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: '#2D2F3E',
    backgroundColor: '#13141F',
    color: '#F5F0E8',
    padding: 14,
    fontSize: 15,
  },
  button: {
    backgroundColor: 'rgba(191,168,130,1)',
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#0A0B14',
    fontWeight: '600',
    fontSize: 15,
  },
  toggle: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
});
