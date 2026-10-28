// Button with a guaranteed 40dp touch target.
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, font, radius, HIT_SLOP, MIN_TOUCH } from '../theme.js';

const VARIANTS = {
  primary: { bg: colors.bus, fg: colors.ink, border: colors.busDark },
  chalk: { bg: colors.chalk, fg: colors.paper, border: colors.chalkDark },
  secondary: { bg: colors.white, fg: colors.chalk, border: colors.line },
  danger: { bg: colors.bad, fg: colors.white, border: '#B33636' },
  good: { bg: colors.good, fg: colors.white, border: '#23804A' },
  ghost: { bg: 'transparent', fg: colors.chalk, border: 'transparent' },
};

/**
 * @param {{ label: string, onPress?: () => void, variant?: keyof VARIANTS, disabled?: boolean,
 *   small?: boolean, active?: boolean, style?: any, textStyle?: any, accessibilityLabel?: string }} props
 */
export default function Btn({
  label, onPress, variant = 'secondary', disabled, small, active, style, textStyle, accessibilityLabel,
}) {
  const v = active ? VARIANTS.primary : VARIANTS[variant] || VARIANTS.secondary;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: !!disabled, selected: !!active }}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        { backgroundColor: v.bg, borderColor: v.border },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[styles.text, small && styles.textSmall, { color: v.fg }, textStyle]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { paddingHorizontal: 10, paddingVertical: 6 },
  text: { fontSize: font.body, fontWeight: '700', textAlign: 'center' },
  textSmall: { fontSize: font.small },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
});
