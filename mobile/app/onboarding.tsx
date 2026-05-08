import { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function OnboardingScreen() {
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');
  const [birthplace, setBirthplace] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const monthRef = useRef<TextInput>(null);
  const dayRef = useRef<TextInput>(null);
  const minuteRef = useRef<TextInput>(null);

  function buildDateStr() {
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  function buildTimeStr() {
    let h = parseInt(hour || '0');
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }

  function validate() {
    if (!name.trim()) return 'Name is required.';
    if (year.length !== 4 || month.length < 1 || day.length < 1) return 'Enter a complete birth date.';
    const d = new Date(buildDateStr());
    if (isNaN(d.getTime()) || d >= new Date()) return 'Enter a valid birth date in the past.';
    const h = parseInt(hour || '0');
    const m = parseInt(minute || '0');
    if (!hour || h < 1 || h > 12) return 'Enter a valid hour (1–12).';
    if (!minute || m < 0 || m > 59) return 'Enter a valid minute (00–59).';
    if (!birthplace.trim()) return 'Birth place is required.';
    return null;
  }

  async function handleSave() {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error: insertError } = await supabase.from('birth_data').upsert(
        {
          user_id: session!.user.id,
          name: name.trim(),
          birthdate: buildDateStr(),
          birthtime: buildTimeStr(),
          birthplace: birthplace.trim(),
        },
        { onConflict: 'user_id' }
      );
      if (insertError) throw insertError;
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message ?? 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.outer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Your Chart</Text>
        <Text style={styles.subtitle}>Tell the council when and where you arrived</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor="#6B7280"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Birth Date</Text>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.fieldHint}>YEAR</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY"
              placeholderTextColor="#6B7280"
              value={year}
              onChangeText={v => {
                setYear(v);
                if (v.length === 4) monthRef.current?.focus();
              }}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.fieldHint}>MONTH</Text>
            <TextInput
              ref={monthRef}
              style={styles.input}
              placeholder="MM"
              placeholderTextColor="#6B7280"
              value={month}
              onChangeText={v => {
                setMonth(v);
                if (v.length === 2) dayRef.current?.focus();
              }}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.fieldHint}>DAY</Text>
            <TextInput
              ref={dayRef}
              style={styles.input}
              placeholder="DD"
              placeholderTextColor="#6B7280"
              value={day}
              onChangeText={setDay}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>

        <Text style={styles.label}>Birth Time</Text>
        <View style={styles.timeRow}>
          <View style={[styles.dateField, { flex: 2 }]}>
            <Text style={styles.fieldHint}>HOUR</Text>
            <TextInput
              style={styles.input}
              placeholder="HH"
              placeholderTextColor="#6B7280"
              value={hour}
              onChangeText={v => {
                setHour(v);
                if (v.length === 2) minuteRef.current?.focus();
              }}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <View style={[styles.dateField, { flex: 2 }]}>
            <Text style={styles.fieldHint}>MINUTE</Text>
            <TextInput
              ref={minuteRef}
              style={styles.input}
              placeholder="MM"
              placeholderTextColor="#6B7280"
              value={minute}
              onChangeText={setMinute}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <View style={[styles.dateField, { flex: 3 }]}>
            <Text style={styles.fieldHint}>AM / PM</Text>
            <View style={styles.ampmRow}>
              <Pressable
                style={[styles.ampmBtn, ampm === 'AM' && styles.ampmActive]}
                onPress={() => setAmpm('AM')}
              >
                <Text style={[styles.ampmText, ampm === 'AM' && styles.ampmTextActive]}>AM</Text>
              </Pressable>
              <Pressable
                style={[styles.ampmBtn, ampm === 'PM' && styles.ampmActive]}
                onPress={() => setAmpm('PM')}
              >
                <Text style={[styles.ampmText, ampm === 'PM' && styles.ampmTextActive]}>PM</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Text style={styles.label}>Birth Place</Text>
        <TextInput
          style={styles.input}
          placeholder="City, Country"
          placeholderTextColor="#6B7280"
          value={birthplace}
          onChangeText={setBirthplace}
          autoCapitalize="words"
        />

        <Pressable style={styles.button} onPress={handleSave} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#0A0B14" />
            : <Text style={styles.buttonText}>Save & Continue</Text>
          }
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#0A0B14' },
  container: { paddingHorizontal: 24, paddingTop: 72, paddingBottom: 48, gap: 8 },
  title: { fontSize: 28, color: '#F5F0E8', fontWeight: '300', letterSpacing: 2, marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#9CA3AF', marginBottom: 20 },
  label: {
    fontSize: 11, color: 'rgba(191,168,130,0.7)', letterSpacing: 1.5,
    textTransform: 'uppercase', marginTop: 12, marginBottom: 4,
  },
  input: {
    borderWidth: 1, borderColor: '#2D2F3E', backgroundColor: '#13141F',
    color: '#F5F0E8', padding: 14, fontSize: 15,
  },
  fieldHint: { fontSize: 9, color: '#6B7280', letterSpacing: 1, marginBottom: 4 },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateField: { flex: 1 },
  timeRow: { flexDirection: 'row', gap: 8 },
  ampmRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#2D2F3E' },
  ampmBtn: {
    flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: '#13141F',
  },
  ampmActive: { backgroundColor: 'rgba(191,168,130,0.15)' },
  ampmText: { color: '#6B7280', fontSize: 13, fontWeight: '500' },
  ampmTextActive: { color: 'rgba(191,168,130,1)' },
  button: {
    backgroundColor: 'rgba(191,168,130,1)', padding: 14, alignItems: 'center', marginTop: 24,
  },
  buttonText: { color: '#0A0B14', fontWeight: '600', fontSize: 15 },
  error: { color: '#F87171', fontSize: 13, marginBottom: 8 },
});
