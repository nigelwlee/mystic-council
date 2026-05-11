import { useState } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet,
} from 'react-native';
import type { AspectKey, AspectCallout } from '../lib/daily-api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AspectCalloutsSectionProps {
  aspectCallouts: AspectCallout[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ASPECT_KEYS: AspectKey[] = ['health', 'work', 'finances', 'relations', 'family'];
const ASPECT_LABELS: Record<AspectKey, string> = {
  health: 'HEALTH',
  work: 'WORK',
  finances: 'FINANCES',
  relations: 'RELATIONS',
  family: 'FAMILY',
};

const TRADITION_COLORS: Record<string, { label: string; color: string }> = {
  'western-astrology': { label: 'WESTERN',     color: '#8B7EC8' },
  'vedic-astrology':   { label: 'VEDIC',       color: '#C8A96E' },
  'chinese-astrology': { label: 'CHINESE',     color: '#C8846E' },
  'tarot':             { label: 'TAROT',       color: '#6E8BC8' },
  'numerology':        { label: 'NUMEROLOGY',  color: '#7EC89A' },
};

// ─── Locked placeholder ───────────────────────────────────────────────────────

function LockedTabContent() {
  return (
    <View style={s.lockedContainer}>
      <View style={s.blurredBlock}>
        <View style={s.placeholderTitle} />
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={s.placeholderRow}>
            <View style={s.placeholderDot} />
            <View style={[s.placeholderLine, { width: `${60 + (i % 3) * 15}%` as `${number}%` }]} />
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

// ─── Active tab content ───────────────────────────────────────────────────────

function CalloutTabContent({ callout }: { callout: AspectCallout }) {
  return (
    <View>
      <View style={s.keyActionBlock}>
        <Text style={s.keyActionText}>{callout.keyAction}</Text>
        <Text style={s.oracleSummary}>{callout.summary}</Text>
      </View>
      {callout.excerpts.map((exc) => {
        const trad = TRADITION_COLORS[exc.traditionId] ?? { label: exc.traditionId.toUpperCase(), color: 'rgba(191,168,130,1)' };
        return (
          <View key={exc.traditionId} style={[s.excerptRow, { borderLeftColor: trad.color }]}>
            <Text style={[s.tradLabel, { color: trad.color }]}>{trad.label}</Text>
            <Text style={s.excerptText}>{exc.text}</Text>
          </View>
        );
      })}
    </View>
  );
}

function EmptyTabContent() {
  return (
    <View style={s.emptyContainer}>
      <Text style={s.emptyText}>No strong signal from any tradition today.</Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AspectCalloutsSection({ aspectCallouts }: AspectCalloutsSectionProps) {
  const [activeAspect, setActiveAspect] = useState<AspectKey>('health');
  const [revealed, setRevealed] = useState(false);

  const calloutMap = new Map<AspectKey, AspectCallout>();
  for (const c of aspectCallouts) {
    calloutMap.set(c.aspect, c);
  }

  const activeCallout = calloutMap.get(activeAspect);

  return (
    <View style={s.container}>
      {/* Section header */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>AREAS OF LIFE</Text>
      </View>

      {/* Aspect tab strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabStrip}
        contentContainerStyle={s.tabStripContent}
      >
        {ASPECT_KEYS.map((k) => (
          <Pressable key={k} onPress={() => setActiveAspect(k)}>
            <View style={[s.tab, activeAspect === k && s.tabActive]}>
              <Text style={[s.tabText, activeAspect === k && s.tabTextActive]}>
                {ASPECT_LABELS[k]}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Tab body */}
      <View style={s.tabBody}>
        {!revealed && <LockedTabContent />}
        {revealed && activeCallout && <CalloutTabContent callout={activeCallout} />}
        {revealed && !activeCallout && <EmptyTabContent />}
      </View>

      {/* CTA — only shown when not yet revealed */}
      {!revealed && (
        <Pressable style={s.revealButton} onPress={() => setRevealed(true)}>
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
    minHeight: 200,
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

  // Excerpt row
  excerptRow: {
    borderLeftWidth: 3,
    paddingLeft: 16,
    paddingRight: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2030',
    marginLeft: 20,
  },
  tradLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '500',
    marginBottom: 4,
  },
  excerptText: {
    color: '#F5F0E8',
    fontSize: 13,
    lineHeight: 20,
  },

  // Empty state
  emptyContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#4B5563',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
    textAlign: 'center',
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
});
