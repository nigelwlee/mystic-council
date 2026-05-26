import { View, type ViewStyle } from 'react-native';

export function WarpDivider({ style }: { style?: ViewStyle }) {
  return (
    <View style={[{ borderTopWidth: 1, borderTopColor: 'rgba(245,240,232,0.13)', borderStyle: 'dotted' }, style]} />
  );
}
