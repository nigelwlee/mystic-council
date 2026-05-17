import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { recovery } from '../lib/recovery';

export default function ResetPasswordScreen() {
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function sendCode() {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      // Always advance — don't reveal whether the email exists.
      await supabase.auth.resetPasswordForEmail(email.trim());
      setStep('verify');
    } catch {
      // Supabase errors here are internal failures; still advance.
      setStep('verify');
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (!code.trim() || !newPassword) return;
    setLoading(true);
    setError('');
    recovery.active = true;
    try {
      const { error: vErr } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'recovery',
      });
      if (vErr) throw vErr;

      const { error: uErr } = await supabase.auth.updateUser({ password: newPassword });
      if (uErr) throw uErr;

      await supabase.auth.signOut();
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not reset password');
    } finally {
      recovery.active = false;
      setLoading(false);
    }
  }

  if (done) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Password updated</Text>
        <Text style={styles.subtitle}>Sign in with your new password.</Text>
        <Pressable style={styles.button} onPress={() => router.replace('/auth')}>
          <Text style={styles.buttonText}>Back to Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.subtitle}>
        {step === 'email'
          ? 'Enter your email to receive a reset code.'
          : 'Enter the code from your email and a new password.'}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {step === 'email' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#6B7280"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoFocus
          />
          <Pressable style={styles.button} onPress={sendCode} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#0A0B14" />
              : <Text style={styles.buttonText}>Send code</Text>}
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="6-digit code"
            placeholderTextColor="#6B7280"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor="#6B7280"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <Pressable style={styles.button} onPress={resetPassword} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#0A0B14" />
              : <Text style={styles.buttonText}>Reset password</Text>}
          </Pressable>
        </>
      )}

      <Pressable onPress={() => router.back()}>
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
