import { View, Text, StyleSheet } from 'react-native';
import { C, F } from '../../lib/theme';
import { HatchBg } from './HatchBg';
import type { EngagementLevel } from '../../lib/tapestry-api';

const TILE = 36;
const GAP = 4;

function tileStyle(level: EngagementLevel, isToday: boolean) {
  if (isToday) return { backgroundColor: C.accent };
  if (level === 0) return { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(245,240,232,0.06)' };
  // level 1 + 2 get HatchBg at different alphas — handled via the HatchBg child
  return { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(245,240,232,0.12)' };
}

function Tile({ level, isToday }: { level: EngagementLevel; isToday: boolean }) {
  const base = tileStyle(level, isToday);
  return (
    <View style={[styles.tile, base]}>
      {!isToday && level === 1 && <HatchBg variant="diagonal-up" alpha={0.28} />}
      {!isToday && level === 2 && <HatchBg variant="cross" alpha={0.28} />}
    </View>
  );
}

interface Props {
  month: Date;
  data: Record<string, EngagementLevel>;
  todayISO: string;
}

export function TapestryGrid({ month, data, todayISO }: Props) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const monthName = month.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  // JS getDay(): 0=Sun, prototype uses 0=Mon offset. Compute Mon-first offset:
  const firstDay = new Date(y, m, 1).getDay(); // 0=Sun
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // shift to Mon=0
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  return (
    <View style={styles.container}>
      <Text style={styles.monthName}>{monthName}</Text>
      <View style={styles.grid}>
        {Array.from({ length: totalCells }, (_, idx) => {
          const dayNum = idx - startOffset + 1;
          const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
          if (!inMonth) {
            return <View key={idx} style={styles.tile} />;
          }
          const dateISO = `${y}-${String(m + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const isToday = dateISO === todayISO;
          const level = (data[dateISO] ?? 0) as EngagementLevel;
          return <Tile key={idx} level={level} isToday={isToday} />;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 28 },
  monthName: {
    fontFamily: F.displayItalic,
    fontSize: 20,
    color: C.text,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  tile: {
    width: TILE,
    height: TILE,
    overflow: 'hidden',
  },
});
