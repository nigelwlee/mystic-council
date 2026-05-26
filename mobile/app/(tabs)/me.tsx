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
import { C, F } from '../../lib/theme';
import { LoomBar } from '../../components/primitives/LoomBar';
import { WarpDivider } from '../../components/primitives/WarpDivider';
import { SectionLabel } from '../../components/primitives/SectionLabel';
import { TapestryGrid } from '../../components/primitives/TapestryGrid';
import { fetchTapestry, monthBounds, isoDate, type EngagementLevel } from '../../lib/tapestry-api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type BirthDataRow = Database['public']['Tables']['birth_data']['Row'];

export default function MeTab() {
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<BirthDataRow | null>(null);
  const [streak, setStreak] = useState<{ current: number; longest: number } | null>(null);
  const [originalEmail, setOriginalEmail] = useState('');

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

  const [activeTab, setActiveTab] = useState<'tapestry' | 'profile'>('tapestry');
  const [tapestryNow, setTapestryNow] = useState<Record<string, EngagementLevel>>({});
  const [tapestryPrev, setTapestryPrev] = useState<Record<string, EngagementLevel>>({});
  const todayISO = new Date().toLocaleDateString('en-CA');
  const nowMonth = new Date();
  const prevMonth = new Date(nowMonth.getFullYear(), nowMonth.getMonth() - 1, 1);

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

    // Tapestry engagement data
    if (session?.user.id) {
      const uid = session.user.id;
      const nowBounds = monthBounds(nowMonth);
      const prevBounds = monthBounds(prevMonth);
      void Promise.all([
        fetchTapestry(uid, nowBounds.fromDate, nowBounds.toDate),
        fetchTapestry(uid, prevBounds.fromDate, prevBounds.toDate),
      ]).then(([now, prev]) => { setTapestryNow(now); setTapestryPrev(prev); });
    }

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
      fetchChart({ birthData: bd, date: new Date().toLocaleDateString('en-CA'), accessToken: session.access_token })
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
            latitude: draftPlace.trim() !== (profile?.birthplace ?? '') ? null : (profile?.latitude ?? null),
            longitude: draftPlace.trim() !== (profile?.birthplace ?? '') ? null : (profile?.longitude ?? null),
          },
          { onConflict: 'user_id' }
        );
        if (error) throw new Error(`Birth data: ${error.message}`);
        setProfileReading(null);
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
        const { data: { session: sess } } = await supabase.auth.getSession();
        if (sess?.access_token) {
          setProfileGenerating(true);
          const bd = {
            date: draftDate.trim(), time: draftTime.trim() || null,
            location: draftPlace.trim(), name: draftName.trim(),
          };
          fetchProfile({ birthData: bd, accessToken: sess.access_token, force: true })
            .then((p) => { setProfileReading(p); setProfileError(false); setHint('Readings updated.'); })
            .catch(() => { setProfileError(true); setHint('Readings could not be generated. Pull down to retry.'); })
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
  const latLngText = lat != null && lng != null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : null;

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); void load(true); }}
            tintColor={C.accentDim}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <Text style={styles.headerLabel}>{activeTab === 'tapestry' ? 'MY TAPESTRY' : 'MY PROFILE'}</Text>
          {streak && (
            <View style={styles.headerStreak}>
              <Text style={styles.headerStreakNum}>{streak.current}</Text>
              <Text style={styles.headerStreakLabel}> day streak</Text>
            </View>
          )}
        </View>

        <LoomBar />

        {/* Display name + longest streak */}
        <View style={styles.nameSection}>
          {profile?.name ? (
            <Text style={styles.displayName}>{profile.name}</Text>
          ) : (
            <Text style={styles.displayNameMuted}>Your name</Text>
          )}
          {streak && (
            <Text style={styles.longestStreak}>
              Longest streak {streak.longest} days
            </Text>
          )}
        </View>

        {/* Tapestry · Profile tab strip */}
        <View style={styles.tabStrip}>
          {(['tapestry', 'profile'] as const).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabItemText, activeTab === tab && styles.tabItemTextActive]}>
                {tab === 'tapestry' ? 'Tapestry' : 'Profile'}
              </Text>
            </Pressable>
          ))}
        </View>

        <WarpDivider />

        {/* Tapestry view */}
        {activeTab === 'tapestry' && (
          <View style={[styles.section, { marginTop: 24 }]}>
            <TapestryGrid month={nowMonth} data={tapestryNow} todayISO={todayISO} />
            <TapestryGrid month={prevMonth} data={tapestryPrev} todayISO={todayISO} />
            <Pressable
              style={styles.shareBtn}
              onPress={() => console.log('Share Tapestry — coming soon')}
            >
              <Text style={styles.shareBtnText}>SHARE TAPESTRY</Text>
            </Pressable>
          </View>
        )}

        {/* Profile view */}
        {activeTab === 'profile' && <>

        {/* Birth data */}
        <View style={styles.section}>
          <SectionLabel text="Birth Data" />
          <ProfileRow label="Name">
            <TextInput
              style={styles.profileInput}
              value={draftName}
              onChangeText={setDraftName}
              autoCapitalize="words"
              placeholder="Full name"
              placeholderTextColor={C.dimmer}
            />
          </ProfileRow>
          <ProfileRow label="Born">
            <TextInput
              style={styles.profileInput}
              value={draftDate}
              onChangeText={setDraftDate}
              keyboardType="numbers-and-punctuation"
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.dimmer}
            />
          </ProfileRow>
          <ProfileRow label="Time">
            <TextInput
              style={styles.profileInput}
              value={draftTime}
              onChangeText={setDraftTime}
              keyboardType="numbers-and-punctuation"
              placeholder="HH:MM (24h)"
              placeholderTextColor={C.dimmer}
            />
          </ProfileRow>
          <ProfileRow label="Place">
            <TextInput
              style={styles.profileInput}
              value={draftPlace}
              onChangeText={setDraftPlace}
              autoCapitalize="words"
              placeholder="City, Country"
              placeholderTextColor={C.dimmer}
            />
          </ProfileRow>
          <ProfileRow label="Lat / Lng" isLast>
            <Text style={[styles.profileValue, !latLngText && { color: C.dimmer }]}>
              {latLngText ?? 'Computing…'}
            </Text>
          </ProfileRow>
        </View>

        {/* Account */}
        <View style={[styles.section, { marginTop: 24 }]}>
          <SectionLabel text="Account" />
          <ProfileRow label="Email" isLast>
            <TextInput
              style={styles.profileInput}
              value={draftEmail}
              onChangeText={setDraftEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="email@example.com"
              placeholderTextColor={C.dimmer}
            />
          </ProfileRow>
        </View>

        {/* Hint */}
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
              ? <ActivityIndicator color={C.bg} />
              : <Text style={styles.saveBtnText}>SAVE CHANGES</Text>}
          </Pressable>
        )}

        <WarpDivider style={{ marginTop: 32 }} />

        {/* Charts */}
        {profile?.birthdate && (
          <View style={styles.section}>
            <SectionLabel text="Your Charts" />
            {chartLoading && (
              <View style={styles.chartLoading}>
                <ActivityIndicator color={C.accentDim} size="small" />
              </View>
            )}
            {chartError && !chartLoading && (
              <Text style={styles.chartError}>Charts unavailable. Pull to refresh.</Text>
            )}
            {chart && !chartLoading && (
              <>
                <ChartRow
                  label="Western Astrology"
                  headline={chart.traditions.western ? westernHeadline(chart.traditions.western) : null}
                  data={chart.traditions.western ?? null}
                  atGlance={profileReading?.traditions.western?.atGlance}
                  profileStatus={profileReading?.traditions.western?.status ?? (profileGenerating ? 'loading' : undefined)}
                  fallbackSummary={chart.traditions.western ? westernHeadline(chart.traditions.western) : null}
                />
                <ChartRow
                  label="Vedic Jyotish"
                  headline={chart.traditions.vedic ? vedicHeadline(chart.traditions.vedic) : null}
                  data={chart.traditions.vedic ?? null}
                  atGlance={profileReading?.traditions.vedic?.atGlance}
                  profileStatus={profileReading?.traditions.vedic?.status ?? (profileGenerating ? 'loading' : undefined)}
                  fallbackSummary={chart.traditions.vedic ? vedicHeadline(chart.traditions.vedic) : null}
                />
                <ChartRow
                  label="Chinese Astrology"
                  headline={chart.traditions.chinese ? chineseHeadline(chart.traditions.chinese) : null}
                  data={chart.traditions.chinese ?? null}
                  atGlance={profileReading?.traditions.chinese?.atGlance}
                  profileStatus={profileReading?.traditions.chinese?.status ?? (profileGenerating ? 'loading' : undefined)}
                  fallbackSummary={chart.traditions.chinese ? chineseHeadline(chart.traditions.chinese) : null}
                />
                <ChartRow
                  label="Numerology"
                  headline={chart.traditions.numerology ? numerologyHeadline(chart.traditions.numerology) : null}
                  data={chart.traditions.numerology ?? null}
                  atGlance={profileReading?.traditions.numerology?.atGlance}
                  profileStatus={profileReading?.traditions.numerology?.status ?? (profileGenerating ? 'loading' : undefined)}
                  fallbackSummary={chart.traditions.numerology ? numerologyHeadline(chart.traditions.numerology) : null}
                />
                {tarotCards && (
                  <ChartRow
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
              </>
            )}
          </View>
        )}

        <WarpDivider style={{ marginTop: 32 }} />

        {/* Sign out */}
        <Pressable style={styles.signOut} onPress={signOut}>
          <Text style={styles.signOutText}>SIGN OUT</Text>
        </Pressable>

        {/* Refer a Friend */}
        <Pressable
          style={styles.referBtn}
          onPress={() => console.log('Refer a Friend — coming soon')}
        >
          <Text style={styles.referBtnText}>REFER A FRIEND</Text>
        </Pressable>

        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ProfileRow({
  label, children, isLast = false,
}: {
  label: string;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.profileRow, !isLast && styles.profileRowBorder]}>
      <Text style={styles.profileLabel}>{label}</Text>
      <View style={styles.profileValueWrap}>{children}</View>
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
  label, headline, data, atGlance, profileStatus, fallbackSummary,
}: {
  label: string;
  headline: string | null;
  data: Record<string, unknown> | null;
  atGlance?: string | null;
  profileStatus?: 'ready' | 'failed' | 'loading';
  fallbackSummary?: string | null;
}) {
  const [open, setOpen] = useState(false);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  }

  function renderAtGlance() {
    if (profileStatus === 'loading') return <Text style={styles.atGlancePending}>Generating your reading…</Text>;
    if (profileStatus === 'failed') {
      if (fallbackSummary) {
        return (
          <View>
            <Text style={styles.atGlance}>{fallbackSummary}</Text>
            <Text style={[styles.atGlancePending, { marginTop: 6 }]}>Full reading will generate on next visit.</Text>
          </View>
        );
      }
      return <Text style={styles.atGlancePending}>Couldn't reach this expert. Pull down to retry.</Text>;
    }
    if (atGlance) return <Text style={styles.atGlance}>{atGlance}</Text>;
    return <Text style={styles.atGlancePending}>Your reading is being prepared…</Text>;
  }

  return (
    <Pressable onPress={data ? toggle : undefined} style={styles.chartRow}>
      <View style={styles.chartRowHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.chartLabel}>{label.toUpperCase()}</Text>
          <Text style={[styles.chartHeadline, !headline && styles.chartHeadlineMuted]}>
            {headline ?? 'No data'}
          </Text>
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
  container: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { flexGrow: 1 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerLabel: { fontFamily: F.ui, fontSize: 10, letterSpacing: 2, color: C.dim },
  headerStreak: { flexDirection: 'row', alignItems: 'baseline' },
  headerStreakNum: { fontFamily: F.display, fontSize: 20, color: C.accent },
  headerStreakLabel: { fontFamily: F.ui, fontSize: 10, color: C.muted, letterSpacing: 0.5 },

  nameSection: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 },
  displayName: { fontFamily: F.display, fontSize: 36, color: C.text, marginBottom: 6 },
  displayNameMuted: { fontFamily: F.display, fontSize: 36, color: C.dimmer, marginBottom: 6 },
  longestStreak: { fontFamily: F.ui, fontSize: 11, color: C.dim, letterSpacing: 0.5 },

  // Tapestry / Profile tab strip
  tabStrip: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 8 },
  tabItem: {
    flex: 1, paddingVertical: 8,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center',
  },
  tabItemActive: { borderColor: C.accentDim },
  tabItemText: { fontFamily: F.ui, fontSize: 10, letterSpacing: 1.4, color: C.dim, textTransform: 'uppercase' },
  tabItemTextActive: { color: C.accent },

  // SHARE TAPESTRY
  shareBtn: {
    marginTop: 8, marginBottom: 4,
    paddingVertical: 14,
    borderWidth: 1, borderColor: C.accentDim,
    alignItems: 'center',
  },
  shareBtnText: { fontFamily: F.ui, color: C.accentDim, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase' },

  section: { paddingHorizontal: 20, marginTop: 20 },

  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  profileRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.borderSubtle,
    borderStyle: 'dotted',
  },
  profileLabel: { fontFamily: F.ui, color: C.dim, fontSize: 12, width: 68 },
  profileValueWrap: { flex: 1, alignItems: 'flex-end' },
  profileInput: {
    fontFamily: F.ui, color: C.text, fontSize: 13,
    textAlign: 'right', paddingVertical: 0, width: '100%',
  },
  profileValue: { fontFamily: F.ui, color: C.text, fontSize: 13, textAlign: 'right' },

  hint: { marginHorizontal: 20, marginTop: 12, fontFamily: F.ui, fontSize: 11 },
  hintOk: { color: 'rgba(191,168,130,0.8)' },
  hintError: { color: '#F87171' },

  saveBtn: {
    marginHorizontal: 20, marginTop: 20,
    backgroundColor: C.accent,
    padding: 14, alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: C.accentDim },
  saveBtnText: { fontFamily: F.uiMedium, color: C.bg, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase' },

  signOut: {
    marginHorizontal: 20, marginTop: 20,
    paddingVertical: 14,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center',
  },
  signOutText: { fontFamily: F.ui, color: C.dim, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase' },

  referBtn: {
    marginHorizontal: 20, marginTop: 10, marginBottom: 8,
    paddingVertical: 14,
    borderWidth: 1, borderColor: C.accentDim,
    alignItems: 'center',
  },
  referBtnText: { fontFamily: F.ui, color: C.accentDim, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase' },

  chartLoading: { paddingVertical: 20, alignItems: 'center' },
  chartError: { fontFamily: F.ui, color: C.dimmer, fontSize: 11, paddingVertical: 12 },
  chartRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSubtle,
  },
  chartRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chartLabel: { fontFamily: F.ui, color: C.dim, fontSize: 9, letterSpacing: 1.2, marginBottom: 3 },
  chartHeadline: { fontFamily: F.ui, color: C.text, fontSize: 13, lineHeight: 19 },
  chartHeadlineMuted: { color: C.dimmer, fontStyle: 'italic' },
  chartToggle: { fontFamily: F.ui, color: C.dim, fontSize: 9, paddingTop: 2 },
  chartDetail: { marginTop: 10, gap: 4 },
  atGlance: { fontFamily: F.displayItalic, color: C.text, fontSize: 14, lineHeight: 22, marginBottom: 12 },
  atGlancePending: { fontFamily: F.ui, color: C.dimmer, fontSize: 11, marginBottom: 10, fontStyle: 'italic' },
  kvRow: { flexDirection: 'row', gap: 8 },
  kvKey: { fontFamily: F.ui, color: C.dim, fontSize: 11, width: 120 },
  kvVal: { fontFamily: F.ui, color: C.muted, fontSize: 11, flex: 1 },
});
