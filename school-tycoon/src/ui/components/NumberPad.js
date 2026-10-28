// On-screen digit pad (avoids keyboard quirks inside modals).
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, HIT_SLOP } from '../theme.js';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'];

/** Shows `value` in boxes of `length` and edits it with a 3x4 pad. Never pre-filled by itself. */
export default function NumberPad({ value, onChange, length }) {
  const press = (k) => {
    if (k === 'back') onChange(value.slice(0, -1));
    else if (k === 'clear') onChange('');
    else if (value.length < length) onChange(value + k);
  };
  return (
    <View>
      <View style={styles.display} accessible accessibilityLabel={`Entered ${value || 'nothing'}`}>
        {Array.from({ length }).map((_, i) => (
          <View key={i} style={[styles.box, i === value.length && styles.boxActive]}>
            <Text style={styles.digit}>{value[i] || ''}</Text>
          </View>
        ))}
      </View>
      <View style={styles.grid}>
        {KEYS.map((k) => (
          <Pressable
            key={k}
            onPress={() => press(k)}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={k === 'back' ? 'Delete' : k === 'clear' ? 'Clear' : k}
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
          >
            <Text style={[styles.keyText, k.length > 1 && styles.keyTextSmall]}>
              {k === 'back' ? '⌫' : k === 'clear' ? 'Clear' : k}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  display: { flexDirection: 'row', justifyContent: 'center', marginVertical: 12 },
  box: {
    width: 44,
    height: 52,
    marginHorizontal: 4,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: colors.bus },
  digit: { fontSize: 26, fontWeight: '800', color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  key: {
    width: '30%',
    minHeight: 48,
    margin: '1.5%',
    borderRadius: radius.sm,
    backgroundColor: colors.paperDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { backgroundColor: colors.busLight },
  keyText: { fontSize: 24, fontWeight: '700', color: colors.ink },
  keyTextSmall: { fontSize: font.body },
});
