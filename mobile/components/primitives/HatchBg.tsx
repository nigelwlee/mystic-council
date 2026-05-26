import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Line, Rect } from 'react-native-svg';
import type { PatternVariant } from '../../lib/patterns';

type Props = {
  variant?: PatternVariant;
  alpha?: number;
};

function strokeColor(alpha: number) {
  return `rgba(191,168,130,${alpha})`;
}

function PatternLines({ variant, alpha }: Required<Props>) {
  const s = strokeColor(alpha);
  const s2 = strokeColor(alpha * 1.4);
  const id = `hatch_${variant}`;

  switch (variant) {
    case 'cross':
      return (
        <Defs>
          <Pattern id={id} x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <Line x1="0" y1="0" x2="0" y2="9" stroke={s} strokeWidth="1" />
          </Pattern>
          <Pattern id={`${id}b`} x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <Line x1="0" y1="0" x2="0" y2="9" stroke={s2} strokeWidth="1" />
          </Pattern>
        </Defs>
      );

    case 'diagonal-up':
      return (
        <Defs>
          <Pattern id={id} x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <Line x1="0" y1="0" x2="0" y2="9" stroke={s} strokeWidth="1" />
          </Pattern>
        </Defs>
      );

    case 'horizontal':
      return (
        <Defs>
          <Pattern id={id} x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse">
            <Line x1="0" y1="0" x2="9" y2="0" stroke={s} strokeWidth="1" />
          </Pattern>
        </Defs>
      );

    case 'vertical':
      return (
        <Defs>
          <Pattern id={id} x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse">
            <Line x1="0" y1="0" x2="0" y2="9" stroke={s} strokeWidth="1" />
          </Pattern>
        </Defs>
      );

    case 'triple':
      return (
        <Defs>
          <Pattern id={id} x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(60)">
            <Line x1="0" y1="0" x2="0" y2="9" stroke={s} strokeWidth="1" />
          </Pattern>
          <Pattern id={`${id}b`} x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(120)">
            <Line x1="0" y1="0" x2="0" y2="9" stroke={s} strokeWidth="1" />
          </Pattern>
          <Pattern id={`${id}c`} x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
            <Line x1="0" y1="0" x2="18" y2="0" stroke={strokeColor(alpha * 0.6)} strokeWidth="1" />
          </Pattern>
        </Defs>
      );
  }
}

export function HatchBg({ variant = 'cross', alpha = 0.22 }: Props) {
  const id = `hatch_${variant}`;
  const isMulti = variant === 'cross' || variant === 'triple';

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Svg width="100%" height="100%">
        <PatternLines variant={variant} alpha={alpha} />
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
        {isMulti && <Rect width="100%" height="100%" fill={`url(#${id}b)`} />}
        {variant === 'triple' && <Rect width="100%" height="100%" fill={`url(#${id}c)`} />}
      </Svg>
    </View>
  );
}
