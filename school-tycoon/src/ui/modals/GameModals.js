// Content for game-driven modals: event decision, report card, offline summary, tier-up.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EVENTS } from '../../engine/index.js';
import Btn from '../components/Btn.js';
import { tierName } from '../catalog.js';
import { formatMoney, formatSignedMoney } from '../util.js';
import { colors, font, radius } from '../theme.js';

const EVENT_COPY = {
  inspection: {
    icon: '🏛️',
    title: 'Inspection coming up!',
    body: 'The school inspector visits in a few days. How will you prepare?',
  },
  flu: {
    icon: '🤒',
    title: 'Flu outbreak!',
    body: 'A flu bug is going around. What should the school do?',
  },
};

export function EventContent({ event, onChoose, onLater }) {
  const pack = EVENTS && EVENTS[event.id];
  const copy = EVENT_COPY[event.id] || { icon: (pack && pack.emoji) || '📣', title: (pack && pack.name) || 'Something happened!', body: '' };
  const choices = event.choices || [];
  const titleHasEmoji = pack && event.title && event.title.includes(pack.emoji);
  return (
    <View>
      {titleHasEmoji ? null : <Text style={styles.icon}>{copy.icon}</Text>}
      <Text style={styles.title}>{event.title || copy.title}</Text>
      <Text style={styles.body}>{event.text || event.description || copy.body}</Text>
      {choices.map((c, i) => (
        <View key={c.id} style={styles.choice}>
          <Btn label={c.label} variant={i === 0 ? 'primary' : 'chalk'} onPress={() => onChoose(c.id)} />
          {c.desc || c.description ? <Text style={styles.choiceDesc}>{c.desc || c.description}</Text> : null}
        </View>
      ))}
      {choices.length > 1 ? (
        <>
          <Text style={styles.hint}>If you don't decide within 2 days, the first option is picked.</Text>
          <Btn label="Decide later" variant="ghost" small onPress={onLater} />
        </>
      ) : null}
    </View>
  );
}

function Line({ label, value, color }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={[styles.lineValue, color && { color }]}>{value}</Text>
    </View>
  );
}

export function ReportCardContent({ report, onClose }) {
  const gradeColor = { A: colors.good, B: colors.good, C: colors.busDark, D: colors.bad, F: colors.bad }[report.grade] || colors.ink;
  const costs = (report.salaries || 0) + (report.upkeep || 0);
  return (
    <View>
      <Text style={styles.kicker}>Year {report.year} · Term {report.term}</Text>
      <Text style={styles.title}>📝 Report Card</Text>
      <View style={styles.gradeRow}>
        <View style={[styles.gradeBadge, { borderColor: gradeColor }]}>
          <Text style={[styles.grade, { color: gradeColor }]}>{report.grade}</Text>
        </View>
        <View style={styles.gradeInfo}>
          <Text style={styles.stars}>{'⭐'.repeat(report.stars || 0) || 'No stars yet'}</Text>
          <Text style={styles.body}>
            😊 {Math.round(report.happiness)} · 📚 {Math.round(report.learning)}
          </Text>
        </View>
      </View>
      <Line label="Income" value={formatMoney(report.income)} color={colors.good} />
      <Line label="Salaries" value={formatMoney(-(report.salaries || 0))} />
      <Line label="Upkeep" value={formatMoney(-(report.upkeep || 0))} />
      <Line label="Total costs" value={formatMoney(-costs)} />
      <Line label="Net" value={formatSignedMoney(report.net)} color={report.net >= 0 ? colors.good : colors.bad} />
      <Line label="Students" value={`${report.studentsStart} → ${report.studentsEnd}`} />
      {report.suggestBreak ? (
        <View style={styles.breakBox}>
          <Text style={styles.breakText}>🌈 {report.breakMessage || 'Great term — good time for a break!'}</Text>
          <Text style={styles.breakSub}>Your school is saved and nothing gets worse while you're away.</Text>
        </View>
      ) : null}
      <Btn label="Back to school" variant="primary" onPress={onClose} style={styles.cta} />
    </View>
  );
}

export function OfflineContent({ summary, onClose }) {
  return (
    <View>
      <Text style={styles.icon}>🌙</Text>
      <Text style={styles.title}>While you were away</Text>
      <Text style={styles.body}>Your staff kept the school running.</Text>
      <Line label="Days passed" value={String(summary.days)} />
      <Line label="Cash" value={formatSignedMoney(summary.cashDelta)} color={summary.cashDelta >= 0 ? colors.good : colors.bad} />
      <Line label="Students" value={`${summary.studentsDelta >= 0 ? '+' : ''}${summary.studentsDelta}`} />
      <Btn label="Let's go!" variant="primary" onPress={onClose} style={styles.cta} />
    </View>
  );
}

export function TierUpContent({ tier, size, onClose }) {
  return (
    <View>
      <Text style={styles.bigIcon}>🎉🏫🎉</Text>
      <Text style={styles.title}>Welcome to {tierName(tier)}!</Text>
      <Text style={styles.body}>
        Your lot grew to {size}×{size}, tuition went up, and new rooms are on the Build list.
      </Text>
      <Btn label="Hooray!" variant="primary" onPress={onClose} style={styles.cta} />
    </View>
  );
}

const MEDALS = { bronze: '🥉', silver: '🥈', gold: '🥇' };

export function ScenarioResultContent({ scenario, onClose, onScenarios }) {
  const failed = scenario.result === 'failed';
  return (
    <View>
      <Text style={styles.bigIcon}>{failed ? '🏁' : MEDALS[scenario.result]}</Text>
      <Text style={styles.title}>{scenario.name} complete!</Text>
      <Text style={styles.body}>
        {failed ? 'No medal this time, but every run teaches something. Try again whenever you like.'
          : `You earned a ${scenario.result} medal!`}
      </Text>
      {scenario.goals.map((g) => (
        <Text key={g.label} style={styles.goalLine}>{g.met ? '✅' : '⬜'} {g.label}</Text>
      ))}
      {scenario.bestMedal ? <Text style={styles.hint}>Best medal: {MEDALS[scenario.bestMedal]} {scenario.bestMedal}</Text> : null}
      <Text style={styles.hint}>Your school keeps running, so feel free to keep playing.</Text>
      <Btn label="Keep playing" variant="primary" onPress={onClose} style={styles.cta} />
      <Btn label="Pick another scenario" variant="ghost" small onPress={onScenarios} />
    </View>
  );
}

const styles = StyleSheet.create({
  goalLine: { fontSize: font.body, color: colors.ink, marginBottom: 4 },
  icon: { fontSize: 44, textAlign: 'center' },
  bigIcon: { fontSize: 48, textAlign: 'center' },
  kicker: { fontSize: font.small, color: colors.inkSoft, textAlign: 'center', fontWeight: '700' },
  title: { fontSize: font.title, fontWeight: '800', color: colors.ink, textAlign: 'center', marginTop: 4 },
  body: { fontSize: font.body, color: colors.inkSoft, textAlign: 'center', marginVertical: 8 },
  choice: { marginTop: 8 },
  choiceDesc: { fontSize: font.small, color: colors.inkSoft, marginTop: 3, textAlign: 'center' },
  hint: { fontSize: font.tiny, color: colors.muted, textAlign: 'center', marginTop: 10 },
  line: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderColor: colors.line,
  },
  lineLabel: { fontSize: font.body, color: colors.inkSoft },
  lineValue: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  gradeRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  gradeBadge: {
    width: 72, height: 72, borderRadius: radius.lg, borderWidth: 4, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white,
  },
  grade: { fontSize: font.hero + 6, fontWeight: '900' },
  gradeInfo: { flex: 1, marginLeft: 12 },
  stars: { fontSize: font.big },
  cta: { marginTop: 14, minHeight: 48 },
  breakBox: { marginTop: 12, padding: 10, borderRadius: radius.md, backgroundColor: colors.chalkLight },
  breakText: { fontSize: font.body, fontWeight: '800', color: colors.chalk, textAlign: 'center' },
  breakSub: { fontSize: font.small, color: colors.inkSoft, textAlign: 'center', marginTop: 2 },
});
