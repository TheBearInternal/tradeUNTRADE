// Compact 0..100 meter with an icon and value.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../theme.js';

function meterColor(v) {
  if (v >= 65) return colors.good;
  if (v >= 35) return colors.bus;
  return colors.bad;
}

export default function Meter({ icon, value, label }) {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <View style={styles.wrap} accessible accessibilityLabel={`${label} ${v} out of 100`}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.col}>
        <Text style={styles.value}>{v}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${v}%`, backgroundColor: meterColor(v) }]} />
        </View>
      </View>
    </View>
  );
}

/** Generic progress bar 0..1. */
export function ProgressBar({ value, color = colors.bus, height = 10 }) {
  const w = Math.max(0, Math.min(1, value || 0)) * 100;
  return (
    <View style={[styles.bigTrack, { height, borderRadius: height / 2 }]}>
      <View style={{ width: `${w}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingHorizontal: 4 },
  icon: { fontSize: 16, marginRight: 4 },
  col: { flex: 1 },
  value: { fontSize: font.tiny, fontWeight: '700', color: colors.paper },
  track: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
  bigTrack: { backgroundColor: colors.paperDark, overflow: 'hidden', width: '100%' },
});
