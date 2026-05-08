import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type BirthDataRow = Database['public']['Tables']['birth_data']['Row'];

export default function MeTab() {
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<BirthDataRow | null>(null);
  const [streak, setStreak] = useState<{ current: number; longest: number } | null>(null);
  const [originalEmail, setOriginalEmail] = useState('');

  // Editable drafts
  const [draftEmail, setDraftEmail] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftDate, setDraftDate] = useState('');
  const [draftTime, setDraftTime] = useState('');
  const [draftPlace, setDraftPlace] = useState('');

  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [
        { data: birthData },
        { data: streakData },
        { data: { user } },
      ] = await Promise.all([
        supabase.from('birth_data').select('*').maybeSingle(),
        supabase.from('daily_streaks').select('current_streak, longest_streak').maybeSingle(),
        supabase.auth.getUser(),
      ]);

      if (birthData) {
        setProfile(birthData);
        setDraftName(birthData.name ?? '');
        setDraftDate(birthData.birthdate ?? '');
        setDraftTime(birthData.birthtime ?? '');
        setDraftPlace(birthData.birthplace ?? '');
      }
      if (streakData) {
        setStreak({ current: streakData.current_streak, longest: streakData.longest_streak });
      }
      const email = user?.email ?? '';
      setOriginalEmail(email);
      setDraftEmail(email);
      setLoading(false);
    }
    void load();
  }, []);

  const emailDirty = draftEmail.trim() !== originalEmail;
  const birthDirty =
    draftName.trim() !== (profile?.name ?? '') ||
    draftDate.trim() !== (profile?.birthdate ?? '') ||
    draftTime.trim() !== (profile?.birthtime ?? '') ||
    draftPlace.trim() !== (profile?.birthplace ?? '');
  const isDirty = emailDirty || birthDirty;

  async function handleSave() {
    if (!isDirty || saving) return;
    setSaving(true);
    setHint('');
    const hints: string[] = [];

    try {
      if (emailDirty && draftEmail.trim()) {
        const { error } = await supabase.auth.updateUser({ email: draftEmail.trim() });
        if (error) throw new Error(`Email: ${error.message}`);
        setOriginalEmail(draftEmail.trim());
        hints.push('Check your inbox to confirm the new email.');
      }

      if (birthDirty) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not signed in');
        const { error } = await supabase.from('birth_data').upsert(
          {
            user_id: user.id,
            name: draftName.trim(),
            birthdate: draftDate.trim(),
            birthtime: draftTime.trim() || null,
            birthplace: draftPlace.trim(),
            // Reset coords so /api/daily re-geocodes on next read
            latitude: draftPlace.trim() !== (profile?.birthplace ?? '') ? null : (profile?.latitude ?? null),
            longitude: draftPlace.trim() !== (profile?.birthplace ?? '') ? null : (profile?.longitude ?? null),
          },
          { onConflict: 'user_id' }
        );
        if (error) throw new Error(`Birth data: ${error.message}`);
        // Update local profile copy
        setProfile((prev) => prev ? {
          ...prev,
          name: draftName.trim(),
          birthdate: draftDate.trim(),
          birthtime: draftTime.trim() || null,
          birthplace: draftPlace.trim(),
          latitude: draftPlace.trim() !== (profile?.birthplace ?? '') ? null : prev.latitude,
          longitude: draftPlace.trim() !== (profile?.birthplace ?? '') ? null : prev.longitude,
        } : prev);
        if (!hints.length) hints.push('Saved.');
      }

      setHint(hints.join(' '));
    } catch (e) {
      setHint(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const lat = profile?.latitude;
  const lng = profile?.longitude;
  const latLngText = lat != null && lng != null
    ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    : null;

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="rgba(191,168,130,1)" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>Me</Text>
        </View>

        {/* Streak */}
        {streak && (
          <View style={styles.streakSection}>
            <Text style={styles.streakNumber}>{streak.current}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
            <Text style={styles.streakSub}>Longest: {streak.longest} days</Text>
          </View>
        )}

        {/* Account */}
        <SectionHeader label="Account" />
        <View style={styles.section}>
          <EditRow
            label="Email"
            value={draftEmail}
            onChangeText={setDraftEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="email@example.com"
          />
        </View>

        {/* Birth data */}
        <SectionHeader label="Birth Data" />
        <View style={styles.section}>
          <EditRow label="Name" value={draftName} onChangeText={setDraftName} autoCapitalize="words" placeholder="Full name" />
          <EditRow
            label="Born"
            value={draftDate}
            onChangeText={setDraftDate}
            keyboardType="numbers-and-punctuation"
            placeholder="YYYY-MM-DD"
          />
          <EditRow
            label="Time"
            value={draftTime}
            onChangeText={setDraftTime}
            keyboardType="numbers-and-punctuation"
            placeholder="HH:MM (24h)"
          />
          <EditRow label="Place" value={draftPlace} onChangeText={setDraftPlace} autoCapitalize="words" placeholder="City, Country" />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Lat / Lng</Text>
            <Text style={[styles.rowValue, !latLngText && styles.rowValueMuted]}>
              {latLngText ?? 'Computing…'}
            </Text>
          </View>
          {!latLngText && (
            <Text style={styles.latLngHint}>Updates after your next daily reading.</Text>
          )}
        </View>

        {/* Save feedback */}
        {!!hint && (
          <Text style={[styles.hint, hint.includes('failed') || hint.includes('Error') ? styles.hintError : styles.hintOk]}>
            {hint}
          </Text>
        )}

        {/* Save button */}
        {isDirty && (
          <Pressable
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#0A0B14" />
              : <Text style={styles.saveBtnText}>Save Changes</Text>}
          </Pressable>
        )}

        {/* Sign out */}
        <Pressable style={styles.signOut} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{label}</Text>
    </View>
  );
}

interface EditRowProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'email-address' | 'numbers-and-punctuation' | 'numeric';
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  placeholder?: string;
}

function EditRow({ label, value, onChangeText, keyboardType = 'default', autoCapitalize = 'none', placeholder }: EditRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <TextInput
        style={styles.rowInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholder={placeholder}
        placeholderTextColor="#4B5563"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0B14' },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { flexGrow: 1 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2F3E',
  },
  headerTitle: { color: '#F5F0E8', fontSize: 22, fontWeight: '300', letterSpacing: 1 },

  streakSection: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2030',
  },
  streakNumber: { color: 'rgba(191,168,130,1)', fontSize: 64, fontWeight: '200' },
  streakLabel: { color: '#F5F0E8', fontSize: 14, letterSpacing: 2, marginTop: -8 },
  streakSub: { color: '#6B7280', fontSize: 12, marginTop: 8 },

  sectionHeader: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 6 },
  sectionHeaderText: {
    fontSize: 10,
    color: 'rgba(191,168,130,0.7)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  section: { paddingHorizontal: 20 },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2030',
  },
  rowLabel: { color: '#6B7280', fontSize: 13, width: 72 },
  rowValue: { color: '#F5F0E8', fontSize: 13, flex: 1, textAlign: 'right' },
  rowValueMuted: { color: '#4B5563' },
  rowInput: {
    flex: 1,
    color: '#F5F0E8',
    fontSize: 13,
    textAlign: 'right',
    paddingVertical: 0,
  },

  latLngHint: {
    color: '#4B5563',
    fontSize: 11,
    marginBottom: 8,
  },

  hint: { marginHorizontal: 20, marginTop: 12, fontSize: 12 },
  hintOk: { color: 'rgba(191,168,130,0.8)' },
  hintError: { color: '#F87171' },

  saveBtn: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: 'rgba(191,168,130,1)',
    padding: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: 'rgba(191,168,130,0.4)' },
  saveBtnText: { color: '#0A0B14', fontWeight: '600', fontSize: 14, letterSpacing: 0.5 },

  signOut: {
    margin: 20,
    marginTop: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2D2F3E',
    alignItems: 'center',
  },
  signOutText: { color: '#6B7280', fontSize: 13 },
});
