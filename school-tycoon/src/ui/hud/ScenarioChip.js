// Compact HUD chip while playing a scenario (goals met, days left) or Sandbox.
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { selectScenario } from '../../engine/index.js';
import { useGameSelector } from '../GameProvider.js';
import { deepEqual } from '../util.js';
import { MEDAL_EMOJI } from '../panels/ScenarioScreen.js';
import { colors, font, HIT_SLOP } from '../theme.js';

const pick = (root) => {
  const s = selectScenario(root);
  if (!s) return null;
  return {
    sandbox: s.sandbox,
    emoji: s.emoji,
    name: s.name,
    met: s.goalsMet,
    total: s.goals.length,
    daysLeft: s.daysLeft,
    result: s.result,
  };
};

function chipText(s) {
  if (s.sandbox) return '🏖️ Sandbox · unlimited cash';
  if (s.result) {
    return s.result === 'failed'
      ? `${s.emoji} ${s.name} · finished — try again anytime`
      : `${MEDAL_EMOJI[s.result]} ${s.name} · ${s.result} medal earned`;
  }
  return `${s.emoji} ${s.name} · 🎯 ${s.met}/${s.total} goals · ${s.daysLeft} days left`;
}

export default function ScenarioChip({ onPress }) {
  const s = useGameSelector(pick, deepEqual);
  if (!s) return null;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel="Scenario status"
      style={styles.chip}
    >
      <Text style={styles.text} numberOfLines={1}>{chipText(s)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: colors.busLight,
    borderBottomWidth: 1,
    borderColor: colors.bus,
  },
  text: { fontSize: font.small, fontWeight: '800', color: colors.ink },
});
