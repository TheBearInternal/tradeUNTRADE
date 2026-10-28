// New School / Scenarios: Classic campaign, the 8 scenarios, and Sandbox.
// Starting one replaces the current school; Apples, cosmetics and medals are kept.
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SANDBOX_ID, SCENARIOS, SCENARIO_ORDER, actions } from '../../engine/index.js';
import { useControls, useGameSelector, useGameStore } from '../GameProvider.js';
import { useDialogs } from '../state/DialogContext.js';
import { useToast } from '../state/ToastContext.js';
import { tierName } from '../catalog.js';
import { formatMoney, shallowEqual } from '../util.js';
import Btn from '../components/Btn.js';
import { colors, font, radius, shared } from '../theme.js';

export const MEDAL_EMOJI = { bronze: '🥉', silver: '🥈', gold: '🥇' };

const CLASSIC = {
  key: 'classic',
  emoji: '🏫',
  name: 'Classic campaign',
  desc: 'Start a fresh Elementary School and grow it all the way to High School at your own pace.',
};
const SANDBOX = {
  key: SANDBOX_ID,
  emoji: '🏖️',
  name: 'Sandbox',
  desc: 'Unlimited cash, every room and item unlocked, biggest lot. Just build and decorate — no ratings, medals or rewards.',
};

const selectCurrent = (root) => ({
  mode: root.game.mode || 'normal',
  scenarioId: root.game.scenario ? root.game.scenario.id : null,
  medals: root.ledger.medals || {},
});

function ScenarioCard({ entry, medal, playing, onStart }) {
  const sc = entry.scenario;
  return (
    <View style={[shared.card, styles.card, playing && styles.playing]}>
      <View style={styles.head}>
        <Text style={styles.emoji}>{entry.emoji}</Text>
        <View style={styles.headText}>
          <Text style={styles.name}>{entry.name}</Text>
          {sc ? (
            <Text style={shared.tiny}>
              {sc.size}×{sc.size} lot · {tierName(sc.tier)} · {formatMoney(sc.cash)} · {sc.timeLimitDays} days
            </Text>
          ) : null}
        </View>
        {sc ? <Text style={styles.medal}>{medal ? MEDAL_EMOJI[medal] : '—'}</Text> : null}
      </View>
      <Text style={[shared.small, styles.desc]}>{entry.desc}</Text>
      {sc ? (
        <View style={styles.goals}>
          {sc.goals.map((g, i) => (
            <Text key={g.label} style={styles.goal}>{i + 1}. {g.label}</Text>
          ))}
          <Text style={shared.tiny}>Meet 1 goal for bronze, 2 for silver, 3 for gold. Medals are earned only.</Text>
        </View>
      ) : null}
      <Btn
        label={playing ? 'Playing now · restart' : 'Start'}
        variant={playing ? 'secondary' : 'primary'}
        onPress={() => onStart(entry)}
        style={styles.start}
      />
    </View>
  );
}

export default function ScenarioScreen({ onClose }) {
  const insets = useSafeAreaInsets();
  const store = useGameStore();
  const dialogs = useDialogs();
  const toast = useToast();
  const { saveNow } = useControls();
  const cur = useGameSelector(selectCurrent, (a, b) => a.mode === b.mode && a.scenarioId === b.scenarioId && shallowEqual(a.medals, b.medals));

  const data = useMemo(() => [
    CLASSIC,
    ...SCENARIO_ORDER.filter((id) => SCENARIOS[id]).map((id) => ({
      key: id, emoji: SCENARIOS[id].emoji, name: SCENARIOS[id].name, desc: SCENARIOS[id].desc, scenario: SCENARIOS[id],
    })),
    SANDBOX,
  ], []);

  const isPlaying = (e) => (e.key === 'classic' ? cur.mode === 'normal'
    : e.key === SANDBOX_ID ? cur.mode === 'sandbox' : cur.scenarioId === e.key);

  const start = async (entry) => {
    const ok = await dialogs.confirm({
      title: `Start ${entry.name}?`,
      message: 'This replaces your current school.\n\nYour Apples, cosmetics, purchases and medals are kept.',
      confirmLabel: 'Start new school',
      destructive: true,
    });
    if (!ok) return;
    const seed = (Date.now() % 2147483647) | 0;
    const id = entry.key === 'classic' ? null : entry.key;
    const before = store.getState();
    const after = store.dispatch(actions.resetSchool(seed, id));
    if (after === before) {
      toast.show("Couldn't start that school.", 'bad');
      return;
    }
    await saveNow();
    toast.show(`${entry.emoji} ${entry.name}: welcome, Principal!`, 'good');
    onClose();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Btn label="← Back" small onPress={onClose} />
        <Text style={styles.title}>New School</Text>
      </View>
      <FlatList
        data={data}
        keyExtractor={(e) => e.key}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ScenarioCard entry={item} medal={cur.medals[item.key]} playing={isPlaying(item)} onStart={start} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.paper, zIndex: 20, elevation: 20 },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.chalk, padding: 10 },
  title: { fontSize: font.title, fontWeight: '800', color: colors.paper, marginLeft: 12 },
  list: { padding: 12, paddingBottom: 32 },
  card: { marginBottom: 10 },
  playing: { borderColor: colors.bus, borderWidth: 2 },
  head: { flexDirection: 'row', alignItems: 'center' },
  emoji: { fontSize: 32, width: 44 },
  headText: { flex: 1 },
  name: { fontSize: font.big, fontWeight: '800', color: colors.ink },
  medal: { fontSize: 28, minWidth: 36, textAlign: 'center', color: colors.muted },
  desc: { marginTop: 6 },
  goals: { marginTop: 6, padding: 8, borderRadius: radius.sm, backgroundColor: colors.paperDark },
  goal: { fontSize: font.small, color: colors.ink, marginBottom: 2 },
  start: { marginTop: 8 },
});
