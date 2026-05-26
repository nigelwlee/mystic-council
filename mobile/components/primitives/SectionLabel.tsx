import { View, Text } from 'react-native';
import { C, F } from '../../lib/theme';

export function SectionLabel({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 18 }}>
      <View style={{
        width: 11, height: 11,
        borderWidth: 1, borderColor: 'rgba(245,240,232,0.2)', borderStyle: 'dashed',
      }} />
      <Text style={{
        fontFamily: F.ui, fontSize: 10, letterSpacing: 1.4,
        color: C.dim, textTransform: 'uppercase',
      }}>
        {text}
      </Text>
    </View>
  );
}
