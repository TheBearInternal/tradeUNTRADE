// Top HUD: cash + daily net, students/capacity, stars, Apples, time, speed, meters.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { selectCapacity, selectDailyPnL, selectTimeLabel } from '../../engine/index.js';
import { SPEEDS, useControls, useGameSelector } from '../GameProvider.js';
import Meter from '../components/Meter.js';
import { formatMoney, formatSignedMoney } from '../util.js';
import { colors, font, HIT_SLOP, MIN_TOUCH } from '../theme.js';

const SPEED_ICONS = { 0: '⏸', 1: '▶', 2: '⏩', 4: '⏭' };
const SPEED_LABELS = { 0: 'Pause', 1: 'Normal speed', 2: 'Double speed', 4: 'Quadruple speed' };

const selectHud = (root) => {
  const g = root.game;
  const t = selectTimeLabel(root);
  return {
    cash: g.cash,
    net: selectDailyPnL(root).net,
    students: g.students,
    capacity: selectCapacity(root),
    stars: g.stars,
    apples: root.ledger.apples,
    happiness: Math.round(g.happiness),
    learning: Math.round(g.learning),
    cleanliness: Math.round(g.cleanliness),
    year: t.year,
    term: t.term,
    day: t.dayOfTerm,
  };
};

function Stat({ icon, children, color, label }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={label}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statText, color && { color }]} numberOfLines={1}>{children}</Text>
    </View>
  );
}

export default function TopBar({ topInset }) {
  const h = useGameSelector(selectHud);
  const { speed, setSpeed } = useControls();
  const netColor = h.net >= 0 ? '#9BE3B4' : '#FFB3B3';

  return (
    <View style={[styles.bar, { paddingTop: topInset + 4 }]}>
      <View style={styles.row}>
        <View style={styles.cashBox} accessible accessibilityLabel={`Cash ${formatMoney(h.cash)}, ${formatSignedMoney(h.net)} per day`}>
          <Text style={[styles.cash, h.cash < 0 && styles.cashNeg]} numberOfLines={1}>
            💵 {formatMoney(h.cash)}
          </Text>
          <Text style={[styles.net, { color: netColor }]} numberOfLines={1}>{formatSignedMoney(h.net)}/day</Text>
        </View>
        <Stat icon="👥" label={`${h.students} students of ${h.capacity} seats`}>{h.students}/{h.capacity}</Stat>
        <Stat icon="⭐" label={`${h.stars} stars`}>{h.stars}</Stat>
        <Stat icon="🍎" label={`${h.apples} Apples`} color={colors.busLight}>{h.apples}</Stat>
      </View>
      <View style={styles.row}>
        <Text style={styles.time} numberOfLines={1}>
          📅 Year {h.year} · Term {h.term} · Day {h.day}
        </Text>
        <View style={styles.speeds}>
          {SPEEDS.map((s) => (
            <Pressable
              key={s}
              onPress={() => setSpeed(s)}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={SPEED_LABELS[s]}
              accessibilityState={{ selected: speed === s }}
              style={[styles.speedBtn, speed === s && styles.speedActive]}
            >
              <Text style={[styles.speedText, speed === s && styles.speedTextActive]}>{SPEED_ICONS[s]}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.row}>
        <Meter icon="😊" label="Happiness" value={h.happiness} />
        <Meter icon="📚" label="Learning" value={h.learning} />
        <Meter icon="🧹" label="Cleanliness" value={h.cleanliness} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.chalk, paddingHorizontal: 8, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  cashBox: { flex: 1.6, paddingRight: 4 },
  cash: { fontSize: font.big, fontWeight: '800', color: colors.paper },
  cashNeg: { color: '#FF8A8A' },
  net: { fontSize: font.tiny, fontWeight: '700' },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  statIcon: { fontSize: 15, marginRight: 3 },
  statText: { fontSize: font.body, fontWeight: '800', color: colors.paper, flexShrink: 1 },
  time: { flex: 1, fontSize: font.small, fontWeight: '700', color: colors.chalkLight },
  speeds: { flexDirection: 'row' },
  speedBtn: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH - 4,
    marginLeft: 4,
    borderRadius: 8,
    backgroundColor: colors.chalkDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedActive: { backgroundColor: colors.bus },
  speedText: { fontSize: 17, color: colors.paper },
  speedTextActive: { color: colors.ink },
});
