import { useState } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, ScrollView, StyleSheet,
} from 'react-native';
import type { FacetKey, FacetContent, FacetSynthesis, DailyFacetsResponse, FacetExpertResult } from '../lib/facets-api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FacetSectionProps {
  birthData: {
    name?: string | null;
    date?: string | null;
    time?: string | null;
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  date: string;
  accessToken: string;
  onFetch: (params: {
    birthData: FacetSectionProps['birthData'];
    date: string;
    accessToken: string;
  }) => Promise<DailyFacetsResponse>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FACET_KEYS: FacetKey[] = ['health', 'work', 'finances', 'relations', 'family'];
const FACET_LABELS: Record<FacetKey, string> = {
  health: 'HEALTH',
  work: 'WORK',
  finances: 'FINANCES',
  relations: 'RELATIONS',
  family: 'FAMILY',
};

const TRADITION_ORDER = ['stella', 'priya', 'master-wei', 'madame-crow', 'pythia'];

const TRADITIONS: Record<string, { label: string; color: string }> = {
  'stella':       { label: 'WESTERN', color: '#6366f1' },
  'priya':        { label: 'VEDIC',   color: '#d97706' },
  'master-wei':   { label: 'CHINESE', color: '#dc2626' },
  'madame-crow':  { label: 'TAROT',   color: '#7c3aed' },
  'pythia':       { label: 'NUMEROLOGY', color: '#059669' },
};

// ─── Expert row inside a facet tab ───────────────────────────────────────────

function FacetExpertRow({
  expert,
  facetKey,
}: {
  expert: FacetExpertResult;
  facetKey: FacetKey;
}) {
  const [expanded, setExpanded] = useState(false);
  const fc: FacetContent | undefined = expert.facets[facetKey];
  const trad = TRADITIONS[expert.expertId] ?? { label: expert.expertId.toUpperCase(), color: 'rgba(191,168,130,1)' };

  if (expert.error || !fc) {
    return (
      <View style={[s.expertRow, { borderLeftColor: trad.color }]}>
        <Text style={[s.tradLabel, { color: trad.color }]}>{trad.label}</Text>
        <Text style={s.oneLinerMissing}>Unable to reach this expert today.</Text>
      </View>
    );
  }

  return (
    <Pressable onPress={() => setExpanded(v => !v)}>
      <View style={[s.expertRow, { borderLeftColor: trad.color }]}>
        <View style={s.expertTop}>
          <Text style={[s.tradLabel, { color: trad.color }]}>{trad.label}</Text>
          <Text style={s.arrow}>{expanded ? '▲' : '▼'}</Text>
        </View>
        <Text style={s.oneLiner}>{fc.oneLiner || '—'}</Text>
        {expanded && (
          <View style={s.expandedContent}>
            {!!fc.summary && <Text style={s.expandedSummary}>{fc.summary}</Text>}
            {!!fc.analysis && <Text style={s.expandedAnalysis}>{fc.analysis}</Text>}
            {!!fc.facts && <Text style={s.expandedFacts}>{fc.facts}</Text>}
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Tab content (one facet) ──────────────────────────────────────────────────

function FacetTabContent({
  facetKey,
  synthesis,
  experts,
}: {
  facetKey: FacetKey;
  synthesis: FacetSynthesis;
  experts: FacetExpertResult[];
}) {
  const sorted = TRADITION_ORDER
    .map(id => experts.find(e => e.expertId === id))
    .filter((e): e is FacetExpertResult => Boolean(e));

  return (
    <View>
      {/* Key action headline */}
      <View style={s.keyActionBlock}>
        <Text style={s.keyActionText}>{synthesis.keyAction}</Text>
        <Text style={s.oracleSummary}>{synthesis.summary}</Text>
      </View>

      {/* Expert rows */}
      {sorted.map(expert => (
        <FacetExpertRow key={expert.expertId} expert={expert} facetKey={facetKey} />
      ))}
    </View>
  );
}

// ─── Locked placeholder ───────────────────────────────────────────────────────

function LockedTabContent() {
  return (
    <View style={s.lockedContainer}>
      {/* Blurred placeholder rows */}
      <View style={s.blurredBlock}>
        <View style={s.placeholderTitle} />
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={s.placeholderRow}>
            <View style={s.placeholderDot} />
            <View style={[s.placeholderLine, { width: `${60 + (i % 3) * 15}%` }]} />
          </View>
        ))}
      </View>
      <View style={s.lockOverlay}>
        <Text style={s.lockIcon}>⊙</Text>
        <Text style={s.lockText}>Reveal today's deeper readings.</Text>
      </View>
    </View>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function FacetSkeleton() {
  return (
    <View style={s.lockedContainer}>
      <ActivityIndicator color="rgba(191,168,130,1)" style={{ marginBottom: 12 }} />
      <Text style={s.lockText}>Consulting the traditions…</Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FacetSection({ birthData, date, accessToken, onFetch }: FacetSectionProps) {
  const [activeFacet, setActiveFacet] = useState<FacetKey>('health');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DailyFacetsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReveal() {
    setLoading(true);
    setError(null);
    try {
      const result = await onFetch({ birthData, date, accessToken });
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch facet readings');
    } finally {
      setLoading(false);
    }
  }

  const activeSynthesis = data?.oracle?.facets?.[activeFacet];

  return (
    <View style={s.container}>
      {/* Section header */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>AREAS OF LIFE</Text>
      </View>

      {/* Facet tab strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabStrip}
        contentContainerStyle={s.tabStripContent}
      >
        {FACET_KEYS.map(f => (
          <Pressable key={f} onPress={() => setActiveFacet(f)}>
            <View style={[s.tab, activeFacet === f && s.tabActive]}>
              <Text style={[s.tabText, activeFacet === f && s.tabTextActive]}>
                {FACET_LABELS[f]}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Tab body */}
      <View style={s.tabBody}>
        {loading && <FacetSkeleton />}

        {!loading && !data && <LockedTabContent />}

        {!loading && data && activeSynthesis && (
          <FacetTabContent
            facetKey={activeFacet}
            synthesis={activeSynthesis}
            experts={data.experts}
          />
        )}

        {!loading && error && (
          <Text style={s.errorText}>{error}</Text>
        )}
      </View>

      {/* CTA — only shown when not yet revealed */}
      {!data && !loading && (
        <Pressable style={s.revealButton} onPress={() => void handleReveal()}>
          <Text style={s.revealButtonText}>REVEAL DETAILED READINGS</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#1E2030',
    marginTop: 24,
    paddingBottom: 8,
  },

  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    color: '#6B7280',
    fontSize: 10,
    letterSpacing: 2,
  },

  // Tab strip
  tabStrip: { flexGrow: 0 },
  tabStripContent: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2D2F3E',
  },
  tabActive: {
    borderColor: 'rgba(191,168,130,0.7)',
  },
  tabText: {
    color: '#6B7280',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  tabTextActive: {
    color: 'rgba(191,168,130,1)',
  },

  // Tab body
  tabBody: {
    marginTop: 16,
    minHeight: 240,
  },

  // Key action block
  keyActionBlock: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2030',
    marginBottom: 4,
  },
  keyActionText: {
    fontStyle: 'italic',
    fontSize: 18,
    color: 'rgba(191,168,130,1)',
    lineHeight: 26,
    marginBottom: 8,
    fontFamily: 'Georgia',
  },
  oracleSummary: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 20,
  },

  // Expert row
  expertRow: {
    borderLeftWidth: 3,
    paddingLeft: 16,
    paddingRight: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2030',
    marginLeft: 20,
  },
  expertTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tradLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '500',
  },
  arrow: { color: '#6B7280', fontSize: 10 },
  oneLiner: {
    color: '#F5F0E8',
    fontSize: 13,
    lineHeight: 20,
  },
  oneLinerMissing: {
    color: '#4B5563',
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  expandedContent: { marginTop: 10, gap: 6 },
  expandedSummary: {
    color: '#E5DDD0',
    fontSize: 13,
    lineHeight: 20,
  },
  expandedAnalysis: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
  },
  expandedFacts: {
    color: '#6B7280',
    fontSize: 11,
    lineHeight: 17,
    fontFamily: 'Courier',
  },

  // Locked placeholder
  lockedContainer: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#2D2F3E',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  blurredBlock: {
    width: '100%',
    opacity: 0.18,
    gap: 10,
    marginBottom: 16,
  },
  placeholderTitle: {
    height: 14,
    backgroundColor: '#F5F0E8',
    width: '60%',
    marginBottom: 8,
  },
  placeholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  placeholderDot: {
    width: 8,
    height: 8,
    backgroundColor: '#9CA3AF',
  },
  placeholderLine: {
    height: 8,
    backgroundColor: '#9CA3AF',
  },
  lockOverlay: {
    alignItems: 'center',
    gap: 8,
  },
  lockIcon: {
    fontSize: 20,
    color: 'rgba(191,168,130,0.5)',
  },
  lockText: {
    color: '#6B7280',
    fontSize: 12,
    fontStyle: 'italic',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  // CTA
  revealButton: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(191,168,130,0.7)',
    padding: 14,
    alignItems: 'center',
  },
  revealButtonText: {
    color: 'rgba(191,168,130,1)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
  },

  // Error
  errorText: {
    color: '#F87171',
    padding: 20,
    fontSize: 13,
  },
});
