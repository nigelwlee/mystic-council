import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { AspectCalloutsSection } from '../../components/AspectCalloutsSection';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL!;

const TRADITION_ORDER = ['stella', 'priya', 'master-wei', 'madame-crow', 'pythia'];

const TRADITIONS: Record<string, { label: string; color: string }> = {
  'stella':       { label: 'WESTERN ASTROLOGY', color: '#6366f1' },
  'priya':        { label: 'VEDIC JYOTISH',     color: '#d97706' },
  'master-wei':   { label: 'CHINESE ASTROLOGY', color: '#dc2626' },
  'madame-crow':  { label: 'TAROT',             color: '#7c3aed' },
  'pythia':       { label: 'NUMEROLOGY',        color: '#059669' },
};

export default function ReadTab() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reading, setReading] = useState<any>(null);
  const [error, setError] = useState('');
  const [oracleCollapsed, setOracleCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const scrollViewRef = useRef<ScrollView>(null);

  const todayDate = new Date().toISOString().slice(0, 10);

  async function fetchReading(force = false) {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: birthData } = await supabase
        .from('birth_data')
        .select('*')
        .maybeSingle();

      if (!birthData) {
        setError('No birth data found. Please set up your profile.');
        return;
      }

      const mapped = {
        name: birthData.name,
        date: birthData.birthdate,
        time: birthData.birthtime,
        location: birthData.birthplace,
        latitude: birthData.latitude,
        longitude: birthData.longitude,
      };

      const url = force ? `${API_BASE}/api/daily?force=1` : `${API_BASE}/api/daily`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 95_000);
      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            birthData: mapped,
            date: todayDate,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const json = await res.json();
      setReading(json);
    } catch (e: any) {
      setReading(null);
      setError(e.message ?? 'Failed to fetch reading');
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchReading(true);
    setRefreshing(false);
  }

  useEffect(() => { fetchReading(); }, []);

  function toggleExpert(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const sortedExperts = reading?.experts
    ? TRADITION_ORDER
        .map((id: string) => reading.experts.find((e: any) => e.expertId === id))
        .filter(Boolean)
    : [];

  const dateLabel = new Date(todayDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  }).toUpperCase();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.dateText}>{dateLabel}</Text>
        <Pressable onPress={() => fetchReading(true)} disabled={loading}>
          <Text style={styles.refreshBtn}>Refresh</Text>
        </Pressable>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color="rgba(191,168,130,1)" />
          <Text style={styles.loadingText}>Consulting the council…</Text>
        </View>
      )}

      {!!error && !loading && (
        <Text style={styles.error}>{error}</Text>
      )}

      {reading && !loading && (
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="rgba(191,168,130,0.6)"
            />
          }
        >

          {/* Oracle */}
          <View style={styles.oracleSection}>
            <Pressable
              style={styles.collapseRow}
              onPress={() => setOracleCollapsed(c => !c)}
            >
              <Text style={styles.collapseLabel}>
                {oracleCollapsed ? '▼  EXPAND' : '▲  COLLAPSE'}
              </Text>
            </Pressable>

            {!oracleCollapsed && (
              <>
                <Text style={styles.oracleHeadline}>
                  {reading.oracle?.oneLiner}
                </Text>
                <Text style={styles.oracleSummary}>
                  {reading.oracle?.summary}
                </Text>
              </>
            )}
          </View>

          {/* Expert cards */}
          {sortedExperts.map((expert: any) => {
            const trad = TRADITIONS[expert.expertId] ?? {
              label: expert.expertId.toUpperCase(),
              color: 'rgba(191,168,130,1)',
            };
            const isExpanded = expanded.has(expert.expertId);
            return (
              <Pressable
                key={expert.expertId}
                onPress={() => toggleExpert(expert.expertId)}
              >
                <View style={[styles.expertCard, { borderLeftColor: trad.color }]}>
                  <View style={styles.expertTop}>
                    <View style={styles.expertMeta}>
                      <Text style={styles.expertEmoji}>{expert.expertEmoji}</Text>
                      <Text style={[styles.traditionLabel, { color: trad.color }]}>
                        {trad.label}
                      </Text>
                    </View>
                    <Text style={styles.arrow}>{isExpanded ? '▲' : '▼'}</Text>
                  </View>

                  <Text style={expert.content?.oneLiner ? styles.oneLiner : styles.oneLinerMissing}>
                    {expert.content?.oneLiner || 'Unable to reach this expert today.'}
                  </Text>

                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      {!!expert.content?.summary && (
                        <Text style={styles.expandedSummary}>
                          {expert.content.summary}
                        </Text>
                      )}
                      {!!expert.content?.analysis && (
                        <Text style={styles.expandedAnalysis}>
                          {expert.content.analysis}
                        </Text>
                      )}
                      {!!expert.content?.facts && (
                        <Text style={styles.expandedFacts}>
                          {expert.content.facts}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}

          {/* AREAS OF LIFE */}
          <AspectCalloutsSection
            aspectCallouts={reading?.oracle?.aspectCallouts ?? []}
            scrollViewRef={scrollViewRef}
          />

          {/* ASK THE COUNCIL */}
          <Pressable
            style={styles.askButton}
            onPress={() => router.push('/(tabs)/chat')}
          >
            <Text style={styles.askButtonText}>ASK THE COUNCIL →</Text>
          </Pressable>

        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0B14' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2F3E',
  },
  dateText: {
    color: '#6B7280',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  refreshBtn: {
    color: '#6B7280',
    fontSize: 13,
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#6B7280', fontSize: 13 },
  error: { color: '#F87171', padding: 20, fontSize: 13 },

  scroll: { paddingBottom: 48 },

  // Oracle
  oracleSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2030',
  },
  collapseRow: { marginBottom: 16 },
  collapseLabel: {
    fontSize: 10,
    color: '#6B7280',
    letterSpacing: 1.5,
  },
  oracleHeadline: {
    fontStyle: 'italic',
    fontSize: 22,
    color: 'rgba(191,168,130,1)',
    lineHeight: 32,
    marginBottom: 14,
    fontFamily: 'Georgia',
  },
  oracleSummary: {
    fontSize: 15,
    color: '#F5F0E8',
    lineHeight: 24,
  },

  // Expert cards
  expertCard: {
    borderLeftWidth: 3,
    paddingLeft: 16,
    paddingRight: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2030',
    marginLeft: 20,
  },
  expertTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  expertMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expertEmoji: { fontSize: 14 },
  traditionLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '500',
  },
  arrow: { color: '#6B7280', fontSize: 10 },
  oneLiner: {
    color: '#F5F0E8',
    fontSize: 14,
    lineHeight: 22,
  },
  oneLinerMissing: {
    color: '#4B5563',
    fontSize: 13,
    lineHeight: 22,
    fontStyle: 'italic',
  },

  // Expanded content
  expandedContent: { marginTop: 12, gap: 8 },
  expandedSummary: {
    color: '#E5DDD0',
    fontSize: 14,
    lineHeight: 22,
  },
  expandedAnalysis: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 20,
  },
  expandedFacts: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Courier',
  },

  // CTA
  askButton: {
    margin: 20,
    marginTop: 32,
    backgroundColor: 'rgba(191,168,130,1)',
    padding: 16,
    alignItems: 'center',
  },
  askButtonText: {
    color: '#0A0B14',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
});
