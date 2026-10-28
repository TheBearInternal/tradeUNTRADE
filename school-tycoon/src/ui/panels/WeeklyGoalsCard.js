// Weekly goals: 3 seeded goals with progress and rewards. Calm copy — goals carry over, no penalty.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { selectWeeklyGoals } from '../../engine/index.js';
import { useGameSelector } from '../GameProvider.js';
import { ProgressBar } from '../components/Meter.js';
import { deepEqual, formatMoney } from '../util.js';
import { colors, font, shared } from '../theme.js';

const pick = (root) => (selectWeeklyGoals(root) || { goals: [] }).goals.map((g) => ({
  key: g.key, label: g.label, progress: g.progress, target: g.target, done: g.done, carriedOver: g.carriedOver, reward: g.reward,
}));

function rewardText(r) {
  const parts = [];
  if (r.xp) parts.push(`+${r.xp} XP`);
  if (r.cash) parts.push(`+${formatMoney(r.cash)}`);
  if (r.apples) parts.push(`+${r.apples} 🍎`);
  return parts.join(' · ');
}

export default function WeeklyGoalsCard() {
  const goals = useGameSelector(pick, deepEqual);
  if (!goals.length) {
    return (
      <View style={shared.card}>
        <Text style={shared.small}>No weekly goals in this mode. Enjoy building!</Text>
      </View>
    );
  }
  return (
    <View style={shared.card}>
      {goals.map((g) => (
        <View key={g.key} style={styles.goal}>
          <View style={styles.row}>
            <Text style={[styles.label, g.done && styles.done]}>{g.done ? '✅' : '🎯'} {g.label}</Text>
            {g.carriedOver ? <Text style={styles.carry}>from earlier</Text> : null}
          </View>
          <ProgressBar value={g.target ? g.progress / g.target : 0} color={g.done ? colors.good : colors.bus} height={8} />
          <Text style={shared.tiny}>
            {Math.min(g.progress, g.target)} / {g.target} · Reward {rewardText(g.reward || {})}
          </Text>
        </View>
      ))}
      <Text style={shared.tiny}>Goals carry over, so there's no rush. Unfinished ones stay for a few weeks.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  goal: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  label: { flex: 1, fontSize: font.body, fontWeight: '700', color: colors.ink },
  done: { color: colors.good },
  carry: { fontSize: font.tiny, color: colors.inkSoft, fontStyle: 'italic' },
});
