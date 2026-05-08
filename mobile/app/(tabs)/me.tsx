import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function MeTab() {
  const [profile, setProfile] = useState<any>(null);
  const [streak, setStreak] = useState<{ current: number; longest: number } | null>(null);

  useEffect(() => {
    async function load() {
      const { data: birthData } = await supabase.from('birth_data').select('*').single();
      setProfile(birthData);

      const { data: streakData } = await supabase
        .from('daily_streaks')
        .select('current_streak, longest_streak')
        .single();
      if (streakData) setStreak({ current: streakData.current_streak, longest: streakData.longest_streak });
    }
    load();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Me</Text>
      </View>

      {streak && (
        <View style={styles.streakSection}>
          <Text style={styles.streakNumber}>{streak.current}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
          <Text style={styles.streakSub}>Longest: {streak.longest} days</Text>
        </View>
      )}

      {profile && (
        <View style={styles.profileSection}>
          <Row label="Name" value={profile.name} />
          <Row label="Born" value={profile.birthdate} />
          <Row label="Time" value={profile.birthtime} />
          <Row label="Place" value={profile.birthplace} />
        </View>
      )}

      <Pressable style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0B14' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2F3E',
  },
  headerTitle: { color: '#F5F0E8', fontSize: 22, fontWeight: '300', letterSpacing: 1 },
  streakSection: { alignItems: 'center', paddingVertical: 32, borderBottomWidth: 1, borderBottomColor: '#1E2030' },
  streakNumber: { color: 'rgba(191,168,130,1)', fontSize: 64, fontWeight: '200' },
  streakLabel: { color: '#F5F0E8', fontSize: 14, letterSpacing: 2, marginTop: -8 },
  streakSub: { color: '#6B7280', fontSize: 12, marginTop: 8 },
  profileSection: { paddingHorizontal: 20, paddingTop: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2030',
  },
  rowLabel: { color: '#6B7280', fontSize: 13 },
  rowValue: { color: '#F5F0E8', fontSize: 13 },
  signOut: { margin: 20, marginTop: 'auto', padding: 14, borderWidth: 1, borderColor: '#2D2F3E', alignItems: 'center' },
  signOutText: { color: '#6B7280', fontSize: 13 },
});
