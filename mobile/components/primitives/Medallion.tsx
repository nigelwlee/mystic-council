import { View, Text } from 'react-native';
import { C, F } from '../../lib/theme';

export function Medallion({ initial, size = 44 }: { initial: string; size?: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      borderWidth: 1, borderColor: 'rgba(191,168,130,0.55)', borderStyle: 'dashed',
      backgroundColor: C.bg,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{
        fontFamily: F.display,
        fontSize: size * 0.44,
        color: 'rgba(191,168,130,0.85)',
        lineHeight: size * 0.5,
        includeFontPadding: false,
      }}>
        {initial}
      </Text>
    </View>
  );
}
