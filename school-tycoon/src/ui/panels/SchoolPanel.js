// School panel: tuition, tier progress + upgrade, principal XP, achievements.
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { actions, selectDailyPnL, selectTierProgress, selectXpProgress } from '../../engine/index.js';
import { useGameSelector, useGameStore } from '../GameProvider.js';
import { ACHIEVEMENT_LIST, tierName } from '../catalog.js';
import { deepEqual, formatMoney } from '../util.js';
import Btn from '../components/Btn.js';
import { ProgressBar } from '../components/Meter.js';
import WeeklyGoalsCard from './WeeklyGoalsCard.js';
import { colors, font, shared } from '../theme.js';

const selectSchool = (root) => ({
  tier: root.game.tier,
  step: root.game.tuitionStep,
  tuitionIncome: selectDailyPnL(root).tuition,
  progress: selectTierProgress(root),
  xp: selectXpProgress(root),
  achievements: root.game.achievements || {},
});

function tuitionExplain(step) {
  if (step === 0) return 'Standard tuition. Raise it for more income per student, lower it to attract more applicants and happier students.';
  const p = Math.abs(step) * 10;
  if (step > 0) {
    return `+${p}% tuition: more money per student, but ${Math.abs(step) * 15}% fewer applicants and −${Math.abs(step) * 3} happiness.`;
  }
  return `−${p}% tuition: less money per student, but more applicants and +${Math.abs(step) * 3} happiness.`;
}

function Tuition({ step, income, onSet }) {
  return (
    <View style={shared.card}>
      <View style={styles.stepRow}>
        <Btn label="−" variant="chalk" disabled={step <= -2} onPress={() => onSet(step - 1)} accessibilityLabel="Lower tuition" />
        <View style={styles.stepMid}>
          <Text style={styles.stepValue}>{step === 0 ? 'Standard' : `${step > 0 ? '+' : '−'}${Math.abs(step) * 10}%`}</Text>
          <Text style={shared.tiny}>Tuition income: {formatMoney(income)}/day</Text>
        </View>
        <Btn label="+" variant="chalk" disabled={step >= 2} onPress={() => onSet(step + 1)} accessibilityLabel="Raise tuition" />
      </View>
      <Text style={[shared.small, styles.explain]}>{tuitionExplain(step)}</Text>
    </View>
  );
}

function TierProgress({ tier, progress, onUpgrade }) {
  if (!progress || !progress.nextTier) {
    return (
      <View style={shared.card}>
        <Text style={styles.big}>🎓 {tierName(tier)}</Text>
        <Text style={shared.small}>You run the top tier of school. Keep those stars shining!</Text>
      </View>
    );
  }
  const next = tierName(progress.nextTier);
  return (
    <View style={shared.card}>
      <Text style={styles.big}>{tierName(tier)} → {next}</Text>
      {(progress.requirements || []).map((r) => (
        <Text key={r.label} style={[styles.req, { color: r.met ? colors.good : colors.ink }]}>
          {r.met ? '✅' : '⬜'} {r.label}: {r.current} / {r.target}
        </Text>
      ))}
      {progress.eligible ? (
        <Btn label={`Upgrade to ${next} 🎉`} variant="primary" onPress={onUpgrade} style={styles.upgrade} textStyle={styles.upgradeText} />
      ) : (
        <Text style={shared.tiny}>Tier-ups are earned by running a great school. They can't be bought.</Text>
      )}
    </View>
  );
}

function XpBar({ xp }) {
  const span = Math.max(1, (xp.xpForNext || 0) - (xp.xpForThis || 0));
  const into = (xp.xp || 0) - (xp.xpForThis || 0);
  const maxed = !!xp.isMax || !xp.xpForNext || xp.xpForNext <= xp.xpForThis;
  return (
    <View style={shared.card}>
      <Text style={styles.big}>🧑‍💼 Principal level {xp.level}</Text>
      <ProgressBar value={maxed ? 1 : into / span} color={colors.chalk} height={12} />
      <Text style={shared.tiny}>
        {maxed ? 'Max level reached!' : `${Math.max(0, Math.round(into))} / ${Math.round(span)} XP to level ${xp.level + 1} · +20 🍎 each level`}
      </Text>
    </View>
  );
}

export default function SchoolPanel({ onOpenScenarios }) {
  const store = useGameStore();
  const s = useGameSelector(selectSchool, deepEqual);
  const doneCount = ACHIEVEMENT_LIST.filter((a) => s.achievements[a.id]).length;

  const header = (
    <View>
      <Text style={shared.sectionTitle}>Tuition</Text>
      <Tuition step={s.step} income={s.tuitionIncome} onSet={(v) => store.dispatch(actions.setTuition(v))} />
      <Text style={shared.sectionTitle}>Grow your school</Text>
      <TierProgress tier={s.tier} progress={s.progress} onUpgrade={() => store.dispatch(actions.tierUp())} />
      <Text style={shared.sectionTitle}>Weekly goals</Text>
      <WeeklyGoalsCard />
      <Text style={shared.sectionTitle}>New school</Text>
      <View style={shared.card}>
        <Text style={shared.small}>Try a scenario with goals and medals, a Sandbox, or a fresh Classic school.</Text>
        <Btn label="🏫 New School / Scenarios" variant="chalk" onPress={onOpenScenarios} style={styles.scen} />
      </View>
      <Text style={shared.sectionTitle}>Principal</Text>
      <XpBar xp={s.xp} />
      <Text style={shared.sectionTitle}>Achievements ({doneCount}/{ACHIEVEMENT_LIST.length})</Text>
    </View>
  );

  return (
    <FlatList
      data={ACHIEVEMENT_LIST}
      keyExtractor={(a) => a.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={header}
      renderItem={({ item }) => {
        const done = !!s.achievements[item.id];
        return (
          <View style={[shared.card, styles.ach, done && styles.achDone]}>
            <Text style={styles.achIcon}>{done ? '🏆' : '🔒'}</Text>
            <View style={styles.achInfo}>
              <Text style={styles.achName}>{item.name}</Text>
              {item.desc ? <Text style={shared.tiny}>{item.desc}</Text> : null}
            </View>
            <Text style={styles.achReward}>🍎 {item.apples}</Text>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, paddingBottom: 32 },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepMid: { flex: 1, alignItems: 'center' },
  stepValue: { fontSize: font.title, fontWeight: '800', color: colors.ink },
  explain: { marginTop: 8 },
  big: { fontSize: font.big, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  req: { fontSize: font.body, marginBottom: 4 },
  upgrade: { marginTop: 10, minHeight: 56 },
  scen: { marginTop: 8 },
  upgradeText: { fontSize: font.big },
  ach: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  achDone: { backgroundColor: colors.goodLight, borderColor: colors.good },
  achIcon: { fontSize: 22, width: 32 },
  achInfo: { flex: 1 },
  achName: { fontSize: font.body, fontWeight: '700', color: colors.ink },
  achReward: { fontSize: font.small, fontWeight: '800', color: colors.chalk },
});
