import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
  LayoutAnimation, UIManager, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import {
  fetchChart, fetchProfile,
  westernHeadline, vedicHeadline, chineseHeadline, numerologyHeadline,
  computeTarotBirthCards, tarotHeadline,
} from '../../lib/chart-api';
import type { Database } from '../../lib/database.types';
import type { MobileChartData, ProfileReading } from '../../lib/chart-api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

  const [chart, setChart] = useState<MobileChartData | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(false);

  const [profileReading, setProfileReading] = useState<ProfileReading | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [profileGenerating, setProfileGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isPullRefresh = false) => {
    if (!isPullRefresh) setLoading(true);
    const [
      { data: birthData },
      { data: streakData },
      { data: { user } },
      { data: { session } },
    ] = await Promise.all([
      supabase.from('birth_data').select('*').maybeSingle(),
      supabase.from('daily_streaks').select('current_streak, longest_streak').maybeSingle(),
      supabase.auth.getUser(),
      supabase.auth.getSession(),
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
    setRefreshing(false);

    // Fetch chart + profile if we have birth data + session
    if (birthData?.birthdate && session?.access_token) {
      const bd = {
        name: birthData.name,
        date: birthData.birthdate,
        time: birthData.birthtime,
        location: birthData.birthplace,
        latitude: birthData.latitude,
        longitude: birthData.longitude,
      };
      setChartLoading(true);
      setChartError(false);
      fetchChart({ birthData: bd, date: new Date().toISOString().slice(0, 10), accessToken: session.access_token })
        .then((c) => setChart(c))
        .catch(() => setChartError(true))
        .finally(() => setChartLoading(false));
      setProfileError(false);
      setProfileGenerating(true);
      fetchProfile({ birthData: bd, accessToken: session.access_token })
        .then((p) => setProfileReading(p))
        .catch(() => setProfileError(true))
        .finally(() => setProfileGenerating(false));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

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
        // Invalidate profile reading so it regenerates on next fetch
        setProfileReading(null);
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
        if (!hints.length) hints.push('Saved. Generating your readings…');
        // Await profile generation so the user knows when it's done
        const { data: { session: sess } } = await supabase.auth.getSession();
        if (sess?.access_token) {
          setProfileGenerating(true);
          const bd = {
            date: draftDate.trim(), time: draftTime.trim() || null,
            location: draftPlace.trim(), name: draftName.trim(),
          };
          fetchProfile({ birthData: bd, accessToken: sess.access_token, force: true })
            .then((p) => {
              setProfileReading(p);
              setProfileError(false);
              setHint('Readings updated.');
            })
            .catch(() => {
              setProfileError(true);
              setHint('Readings could not be generated. Pull down to retry.');
            })
            .finally(() => setProfileGenerating(false));
        }
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

  const tarotCards = profile?.birthdate ? computeTarotBirthCards(profile.birthdate) : null;

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); void load(true); }}
            tintColor="rgba(191,168,130,0.6)"
          />
        }
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

        {/* Charts */}
        {profile?.birthdate && (
          <>
            <SectionHeader label="Your Charts" />
            {chartLoading && (
              <View style={styles.chartLoading}>
                <ActivityIndicator color="rgba(191,168,130,0.6)" size="small" />
              </View>
            )}
            {chartError && !chartLoading && (
              <Text style={styles.chartError}>Charts unavailable. Pull to refresh.</Text>
            )}
            {chart && !chartLoading && (
              <View style={styles.section}>
                <ChartRow
                  emoji="⭐"
                  label="Western Astrology"
                  headline={chart.traditions.western ? westernHeadline(chart.traditions.western) : null}
                  data={chart.traditions.western ?? null}
                  atGlance={profileReading?.traditions.western?.atGlance}
                  profileStatus={profileReading?.traditions.western?.status ?? (profileGenerating ? 'loading' : undefined)}
                />
                <ChartRow
                  emoji="🔱"
                  label="Vedic Jyotish"
                  headline={chart.traditions.vedic ? vedicHeadline(chart.traditions.vedic) : null}
                  data={chart.traditions.vedic ?? null}
                  atGlance={profileReading?.traditions.vedic?.atGlance}
                  profileStatus={profileReading?.traditions.vedic?.status ?? (profileGenerating ? 'loading' : undefined)}
                />
                <ChartRow
                  emoji="🐉"
                  label="Chinese Astrology"
                  headline={chart.traditions.chinese ? chineseHeadline(chart.traditions.chinese) : null}
                  data={chart.traditions.chinese ?? null}
                  atGlance={profileReading?.traditions.chinese?.atGlance}
                  profileStatus={profileReading?.traditions.chinese?.status ?? (profileGenerating ? 'loading' : undefined)}
                />
                <ChartRow
                  emoji="🔢"
                  label="Numerology"
                  headline={chart.traditions.numerology ? numerologyHeadline(chart.traditions.numerology) : null}
                  data={chart.traditions.numerology ?? null}
                  atGlance={profileReading?.traditions.numerology?.atGlance}
                  profileStatus={profileReading?.traditions.numerology?.status ?? (profileGenerating ? 'loading' : undefined)}
                />
                {tarotCards && (
                  <ChartRow
                    emoji="🃏"
                    label="Tarot"
                    headline={tarotHeadline(tarotCards)}
                    data={{
                      'Soul Card': `${tarotCards.soul.name} (${tarotCards.soul.number})`,
                      'Personality Card': `${tarotCards.personality.name} (${tarotCards.personality.number})`,
                    }}
                    atGlance={profileReading?.traditions.tarot?.atGlance}
                    profileStatus={profileReading?.traditions.tarot?.status ?? (profileGenerating ? 'loading' : undefined)}
                  />
                )}
              </View>
            )}
          </>
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

function KVList({ data, depth = 0 }: { data: Record<string, unknown>; depth?: number }) {
  if (depth > 2) return null;
  return (
    <>
      {Object.entries(data).map(([k, v]) => {
        if (v == null) return null;
        if (typeof v === 'object' && !Array.isArray(v)) {
          return (
            <View key={k}>
              <Text style={[styles.kvKey, { color: 'rgba(191,168,130,0.5)', marginTop: 4 }]}>
                {k.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}
              </Text>
              <KVList data={v as Record<string, unknown>} depth={depth + 1} />
            </View>
          );
        }
        if (Array.isArray(v)) return null;
        return (
          <View key={k} style={styles.kvRow}>
            <Text style={styles.kvKey}>{k.replace(/([A-Z])/g, ' $1').trim()}</Text>
            <Text style={styles.kvVal}>{String(v)}</Text>
          </View>
        );
      })}
    </>
  );
}

function ChartRow({
  emoji, label, headline, data, atGlance, profileStatus,
}: {
  emoji: string;
  label: string;
  headline: string | null;
  data: Record<string, unknown> | null;
  atGlance?: string | null;
  profileStatus?: 'ready' | 'failed' | 'loading';
}) {
  const [open, setOpen] = useState(false);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  }

  function renderAtGlance() {
    if (profileStatus === 'loading') {
      return <Text style={styles.atGlancePending}>Generating your reading…</Text>;
    }
    if (profileStatus === 'failed') {
      return <Text style={styles.atGlancePending}>Couldn't reach this expert. Pull down to retry.</Text>;
    }
    if (atGlance) {
      return <Text style={styles.atGlance}>{atGlance}</Text>;
    }
    return <Text style={styles.atGlancePending}>Your reading is being prepared…</Text>;
  }

  return (
    <Pressable onPress={data ? toggle : undefined} style={styles.chartRow}>
      <View style={styles.chartRowHeader}>
        <View style={styles.chartRowLeft}>
          <Text style={styles.chartEmoji}>{emoji}</Text>
          <View>
            <Text style={styles.chartLabel}>{label.toUpperCase()}</Text>
            <Text style={[styles.chartHeadline, !headline && styles.chartHeadlineMuted]}>
              {headline ?? 'No data'}
            </Text>
          </View>
        </View>
        {data && <Text style={styles.chartToggle}>{open ? '▲' : '▼'}</Text>}
      </View>
      {open && data && (
        <View style={styles.chartDetail}>
          {renderAtGlance()}
          <KVList data={data} />
        </View>
      )}
    </Pressable>
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

  // Charts
  chartLoading: { paddingVertical: 20, alignItems: 'center' },
  chartError: { marginHorizontal: 20, color: '#4B5563', fontSize: 12, paddingVertical: 12 },
  chartRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2030',
  },
  chartRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  chartRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  chartEmoji: { fontSize: 13 },
  chartLabel: { color: '#6B7280', fontSize: 11, letterSpacing: 0.5 },
  chartHeadline: { color: '#F5F0E8', fontSize: 13, marginTop: 2, lineHeight: 18 },
  chartHeadlineMuted: { color: '#4B5563', fontStyle: 'italic' },
  chartToggle: { color: '#6B7280', fontSize: 10, paddingTop: 2 },
  chartDetail: { marginTop: 10, gap: 4 },
  atGlance: {
    color: '#F5F0E8',
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  atGlancePending: {
    color: '#4B5563',
    fontSize: 12,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  kvRow: { flexDirection: 'row', gap: 8 },
  kvKey: { color: '#6B7280', fontSize: 11, width: 120 },
  kvVal: { color: '#9CA3AF', fontSize: 11, flex: 1 },
});
