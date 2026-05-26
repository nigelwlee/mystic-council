import { useState, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  StyleSheet, RefreshControl, useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { getDaily, type DailyReadingResponse, type ExpertReading, type AspectKey } from '../../lib/daily-api';
import { C, F, LUCK_COLOR } from '../../lib/theme';
import { EXPERT_PATTERN, TRADITION_ORDER, TRADITION_LABEL } from '../../lib/patterns';
import { LoomBar } from '../../components/primitives/LoomBar';
import { WarpDivider } from '../../components/primitives/WarpDivider';
import { SectionLabel } from '../../components/primitives/SectionLabel';
import { Medallion } from '../../components/primitives/Medallion';
import { HatchBg } from '../../components/primitives/HatchBg';

// ─── Data derivations ──────────────────────────────────────────────────────────

function deriveLuck(experts: ExpertReading[]): string {
  let strong = 0;
  for (const e of experts) {
    for (const s of e.content.aspectSignals ?? []) {
      if (s.strength === 'strong') strong++;
    }
  }
  if (strong >= 3) return 'Strong';
  if (strong === 2) return 'Fair';
  return 'Weak';
}

function deriveStatus(e: ExpertReading): 'Good' | 'Fair' | 'Caution' {
  if (e.error) return 'Caution';
  const sigs = e.content.aspectSignals ?? [];
  if (sigs.some(s => s.strength === 'strong')) return 'Good';
  return sigs.length > 0 ? 'Fair' : 'Good';
}

function firstSentence(text: string): string {
  const m = text?.match(/^[^.!?]+[.!?]/);
  return m ? m[0] : (text?.slice(0, 80) ?? '');
}

function deriveChecklist(experts: ExpertReading[]) {
  const items: Array<{ type: 'positive' | 'warning'; text: string }> = [];
  for (const e of experts) {
    const sigs = e.content.aspectSignals ?? [];
    if (sigs.some(s => s.strength === 'strong')) {
      items.push({ type: 'positive', text: e.content.oneLiner });
    }
  }
  if (experts.some(e => e.error)) {
    items.push({ type: 'warning', text: 'Some readings were unavailable today' });
  }
  return items.slice(0, 4);
}

function getAspectData(reading: DailyReadingResponse, aspect: AspectKey) {
  const callout = reading.oracle.aspectCallouts?.find(c => c.aspect === aspect);
  if (!callout) return null;
  return {
    headline: callout.keyAction,
    summary: callout.summary,
    sources: callout.excerpts.map(ex => ({
      tradition: TRADITION_LABEL[ex.traditionId] ?? ex.traditionId.toUpperCase(),
      text: ex.text,
    })),
  };
}

const STATUS_COLOR: Record<string, string> = {
  Good:    '#7EC89A',
  Fair:    '#C8A96E',
  Caution: '#C8846E',
};

const ASPECT_TABS: { id: AspectKey; label: string }[] = [
  { id: 'health',    label: 'Health' },
  { id: 'relations', label: 'Relations' },
  { id: 'finances',  label: 'Finances' },
  { id: 'family',    label: 'Family' },
  { id: 'work',      label: 'Work' },
];

const QUOTES = [
  'You build a successful life one day at a time.',
  'The quiet work is finishing itself — let it.',
  'Clear the lot before you pour the foundation.',
  'Speak from what you know.',
  'Careful work yields disproportionate results.',
];

// ─── Expert card ───────────────────────────────────────────────────────────────

const CARD_W = 220;
const CARD_H = 300;
const CARD_GAP = 12;

function ExpertCard({ expert }: { expert: ExpertReading }) {
  const pattern = EXPERT_PATTERN[expert.expertId] ?? 'cross';
  const status = deriveStatus(expert);
  const statusColor = STATUS_COLOR[status];
  const action = firstSentence(expert.content.summary);
  const tradLabel = TRADITION_LABEL[expert.expertId] ?? expert.expertId.toUpperCase();

  return (
    <View style={[s.card, { width: CARD_W, height: CARD_H }]}>
      {/* Hero zone */}
      <View style={s.cardHero}>
        <HatchBg variant={pattern} alpha={0.22} />
        <Medallion initial={expert.expertEmoji} size={56} />
        <Text style={s.cardTradLabel}>{tradLabel}</Text>
        <View style={[s.cardBadge, { borderColor: statusColor + '60' }]}>
          <Text style={[s.cardBadgeText, { color: statusColor }]}>{status}</Text>
        </View>
      </View>

      <View style={s.cardDivider} />

      {/* Content zone */}
      <View style={s.cardContent}>
        <Text style={s.cardOneLiner}>{expert.content.oneLiner}</Text>
        <Text style={s.cardAction}>{action}</Text>
      </View>
    </View>
  );
}

// ─── Aspect section ────────────────────────────────────────────────────────────

function AspectExplorer({ reading }: { reading: DailyReadingResponse }) {
  const [active, setActive] = useState<AspectKey>('health');
  const data = getAspectData(reading, active);

  return (
    <View style={{ paddingBottom: 28 }}>
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <SectionLabel text="Applying to aspects of life" />
      </View>

      {/* Tab strip */}
      <View style={s.aspectTabs}>
        {ASPECT_TABS.map(({ id, label }, i) => {
          const isActive = active === id;
          return (
            <Pressable key={id} onPress={() => setActive(id)} style={[
              s.aspectTab,
              { borderColor: isActive ? C.accent : 'rgba(245,240,232,0.1)' },
              i > 0 && { borderLeftWidth: isActive ? 1 : 0 },
            ]}>
              <Text style={[s.aspectTabText, { color: isActive ? C.accent : C.dim }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        {data ? (
          <>
            <Text style={s.aspectHeadline}>{data.headline}</Text>
            <Text style={s.aspectSummary}>{data.summary}</Text>
            <View style={{ gap: 8 }}>
              {data.sources.map((src, i) => (
                <View key={i} style={s.sourceCard}>
                  <Text style={s.sourceTradition}>{src.tradition}</Text>
                  <Text style={s.sourceText}>{src.text}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={s.aspectEmpty}>No signal for this area today.</Text>
        )}
      </View>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function ReadTab() {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reading, setReading] = useState<DailyReadingResponse | null>(null);
  const [streak, setStreak] = useState(0);
  const [error, setError] = useState('');
  const [cardIndex, setCardIndex] = useState(0);
  const cardScrollRef = useRef<ScrollView>(null);

  const todayDate = new Date().toLocaleDateString('en-CA');
  const dateLabel = new Date(todayDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  }).toUpperCase();

  async function fetchReading(force = false) {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [{ data: birthData }, { data: streakRow }] = await Promise.all([
        supabase.from('birth_data').select('*').maybeSingle(),
        supabase.from('daily_streaks').select('current_streak').eq('user_id', session.user.id).maybeSingle(),
      ]);

      if (!birthData) { setError('No birth data found. Set up your profile first.'); return; }
      setStreak(streakRow?.current_streak ?? 0);

      const json = await getDaily({
        accessToken: session.access_token,
        birthData: {
          name: birthData.name,
          date: birthData.birthdate,
          time: birthData.birthtime,
          location: birthData.birthplace,
          latitude: birthData.latitude,
          longitude: birthData.longitude,
        },
        date: todayDate,
        force,
      });
      setReading(json);
    } catch (e: any) {
      setReading(null);
      setError(e.message ?? 'Failed to fetch reading');
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    if (loading) return;
    setRefreshing(true);
    await fetchReading();
    setRefreshing(false);
  }

  // Fetch on mount
  useState(() => { fetchReading(); });

  const sortedExperts = reading
    ? TRADITION_ORDER.map(id => reading.experts.find(e => e.expertId === id)).filter(Boolean) as ExpertReading[]
    : [];
  const luck = reading ? deriveLuck(reading.experts) : null;
  const luckColor = luck ? (LUCK_COLOR[luck] ?? C.muted) : C.muted;
  const checklist = reading ? deriveChecklist(reading.experts) : [];
  const quote = QUOTES[new Date().getDay() % QUOTES.length];

  return (
    <View style={[s.container, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        <Text style={s.dateText}>{dateLabel}</Text>
        {streak > 0 && <Text style={s.streakText}>{streak} day streak</Text>}
      </View>

      <LoomBar />

      {loading && !reading && (
        <View style={s.center}>
          <ActivityIndicator color={C.accent} />
          <Text style={s.loadingText}>Consulting the council…</Text>
        </View>
      )}

      {!!error && !loading && (
        <Text style={s.error}>{error}</Text>
      )}

      {reading && (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accentDim} />}
        >
          {/* ── Section 1: Common Thread ── */}
          <View style={s.section}>
            <SectionLabel text="The common thread today" />
            <Text style={s.commonHeadline}>{reading.oracle.oneLiner}</Text>
            <Text style={s.commonSummary}>{reading.oracle.summary}</Text>

            {/* Luck badge (full width — charms/watchouts deferred until backend ships) */}
            {luck && (
              <View style={s.luckRow}>
                <View style={[s.luckDiamond, { borderColor: luckColor }]} />
                <Text style={[s.luckWord, { color: luckColor }]}>{luck}</Text>
                <Text style={s.luckLabel}>OVERALL LUCK</Text>
              </View>
            )}
          </View>

          <WarpDivider />

          {/* ── Section 2: Weaving Together the Experts ── */}
          <View style={{ paddingTop: 24, paddingBottom: 28 }}>
            <View style={{ paddingHorizontal: 20 }}>
              <SectionLabel text="Weaving together the experts" />
              <Text style={s.weavingSubtitle}>Most of the council agrees</Text>
              <Text style={s.weavingHeadline}>{firstSentence(reading.oracle.summary)}</Text>

              {checklist.length > 0 && (
                <View style={{ gap: 7, marginBottom: 26 }}>
                  {checklist.map((item, i) => (
                    <View key={i} style={s.checkRow}>
                      <View style={[
                        s.checkDot,
                        item.type === 'positive'
                          ? { backgroundColor: 'rgba(191,168,130,0.9)' }
                          : { borderWidth: 1.5, borderColor: '#C8A96E' },
                      ]} />
                      <Text style={s.checkText}>{item.text}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Horizontal expert card scroll */}
            <ScrollView
              ref={cardScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_W + CARD_GAP}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: 20, gap: CARD_GAP, paddingVertical: 4 }}
              onScroll={e => {
                const x = e.nativeEvent.contentOffset.x;
                setCardIndex(Math.round(x / (CARD_W + CARD_GAP)));
              }}
              scrollEventThrottle={16}
            >
              {sortedExperts.map(expert => (
                <ExpertCard key={expert.expertId} expert={expert} />
              ))}
            </ScrollView>

            {/* Pagination dots */}
            <View style={s.dots}>
              {sortedExperts.map((_, i) => (
                <View key={i} style={[
                  s.dot,
                  i === cardIndex
                    ? { width: 14, borderRadius: 2.5, backgroundColor: 'rgba(191,168,130,0.9)' }
                    : { width: 5, borderRadius: 2.5, backgroundColor: 'rgba(245,240,232,0.18)' },
                ]} />
              ))}
            </View>
          </View>

          <WarpDivider />

          {/* ── Section 3: Aspects of Life ── */}
          <AspectExplorer reading={reading} />

          <WarpDivider />

          {/* ── Footer ── */}
          <View style={s.footer}>
            <Text style={s.footerQuote}>"{quote}"</Text>
            <Pressable style={s.chatBtn} onPress={() => router.push('/(tabs)/chat')}>
              <Text style={s.chatBtnText}>CHAT WITH PY</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 0,
  },
  dateText:   { fontFamily: F.ui, fontSize: 10, letterSpacing: 1.8, color: C.dim },
  streakText: { fontFamily: F.ui, fontSize: 10, letterSpacing: 1.0, color: C.dim },

  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontFamily: F.ui, fontSize: 13, color: C.dim },
  error:       { fontFamily: F.ui, fontSize: 13, color: '#F87171', padding: 20 },

  // Common thread
  section:         { padding: 24, paddingBottom: 32 },
  commonHeadline:  { fontFamily: F.display, fontSize: 28, color: C.text, lineHeight: 34, marginBottom: 14 },
  commonSummary:   { fontFamily: F.ui, fontSize: 13, color: 'rgba(245,240,232,0.72)', lineHeight: 21, marginBottom: 28 },
  luckRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(245,240,232,0.08)' },
  luckDiamond:     { width: 18, height: 18, borderWidth: 1.5, transform: [{ rotate: '45deg' }] },
  luckWord:        { fontFamily: F.display, fontSize: 20 },
  luckLabel:       { fontFamily: F.ui, fontSize: 8, letterSpacing: 1.6, color: C.dim, flexShrink: 1 },

  // Weaving
  weavingSubtitle: { fontFamily: F.ui, fontSize: 10, color: C.dim, letterSpacing: 1.0, marginBottom: 6 },
  weavingHeadline: { fontFamily: F.display, fontSize: 24, color: C.text, lineHeight: 30, marginBottom: 16 },
  checkRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkDot:        { width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  checkText:       { fontFamily: F.ui, fontSize: 12, color: C.muted, lineHeight: 19, flex: 1 },

  // Expert card
  card:       { backgroundColor: 'rgba(245,240,232,0.025)', borderWidth: 1, borderColor: 'rgba(245,240,232,0.08)', overflow: 'hidden', flexShrink: 0 },
  cardHero:   { height: 180, alignItems: 'center', justifyContent: 'center', gap: 10, overflow: 'hidden', position: 'relative' },
  cardTradLabel: { fontFamily: F.ui, fontSize: 10, letterSpacing: 2.0, color: C.muted, textTransform: 'uppercase', backgroundColor: C.bg, paddingHorizontal: 10, paddingVertical: 3, textAlign: 'center' },
  cardBadge:  { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 2, backgroundColor: C.bg },
  cardBadgeText: { fontFamily: F.ui, fontSize: 8, letterSpacing: 1.2 },
  cardDivider: { height: 1, backgroundColor: 'rgba(245,240,232,0.1)' },
  cardContent: { flex: 1, padding: 18, gap: 8, backgroundColor: C.bg },
  cardOneLiner:{ fontFamily: F.display, fontSize: 17, color: C.text, lineHeight: 23 },
  cardAction:  { fontFamily: F.ui, fontSize: 11, color: C.muted, lineHeight: 17 },

  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 14, paddingHorizontal: 20 },
  dot:  { height: 5 },

  // Aspect explorer
  aspectTabs:     { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 24 },
  aspectTab:      { flex: 1, height: 30, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  aspectTabText:  { fontFamily: F.ui, fontSize: 9, letterSpacing: 0.8 },
  aspectHeadline: { fontFamily: F.display, fontSize: 22, color: C.accent, lineHeight: 28, marginBottom: 12 },
  aspectSummary:  { fontFamily: F.ui, fontSize: 12, color: 'rgba(245,240,232,0.72)', lineHeight: 20, marginBottom: 20 },
  aspectEmpty:    { fontFamily: F.ui, fontSize: 13, color: C.dimmer, fontStyle: 'italic' },
  sourceCard:     { borderWidth: 1, borderColor: 'rgba(245,240,232,0.08)', padding: 14 },
  sourceTradition:{ fontFamily: F.mono, fontSize: 9, letterSpacing: 1.4, color: C.dim, marginBottom: 4 },
  sourceText:     { fontFamily: F.ui, fontSize: 11, color: C.muted, lineHeight: 17 },

  // Footer
  footer:       { padding: 36, paddingBottom: 40, alignItems: 'center' },
  footerQuote:  { fontFamily: F.displayItalic, fontSize: 16, color: C.accent, lineHeight: 26, textAlign: 'center', marginBottom: 28 },
  chatBtn:      { width: '100%', backgroundColor: C.accent, paddingVertical: 15, alignItems: 'center' },
  chatBtnText:  { fontFamily: F.uiMedium, fontSize: 11, letterSpacing: 2.0, color: C.bg },
});
