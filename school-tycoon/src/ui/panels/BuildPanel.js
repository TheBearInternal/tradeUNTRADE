// Build panel: every room grouped by tier, with lock reasons and optional early unlock.
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { actions, selectEarlyUnlocksLeft, selectRoomAvailability } from '../../engine/index.js';
import { useGameSelector, useGameStore } from '../GameProvider.js';
import { useDialogs } from '../state/DialogContext.js';
import { useToast } from '../state/ToastContext.js';
import { ROOM_LIST, applesToUsdLabel, tierName } from '../catalog.js';
import { deepEqual, formatMoney } from '../util.js';
import Btn from '../components/Btn.js';
import { colors, font, shared } from '../theme.js';

const selectAvail = (root) => {
  const out = {};
  ROOM_LIST.forEach((d) => { out[d.id] = selectRoomAvailability(root, d.id); });
  return out;
};
const selectWallet = (root) => ({
  cash: root.game.cash,
  apples: root.ledger.apples,
  left: selectEarlyUnlocksLeft(root),
});

function lockText(def, a) {
  if (a.reason === 'tier') return `🔒 Reach ${tierName(def.tier)}`;
  if (a.reason === 'level') return `🔒 Level ${def.level}`;
  if (a.reason === 'banned') return '🚫 Not allowed in this scenario';
  return '🔒 Locked';
}

function RoomRow({ def, avail, wallet, onPick, onEarly }) {
  const a = avail || { available: false };
  const afford = wallet.cash >= def.cost;
  return (
    <View style={[shared.card, styles.row, !a.available && styles.locked]}>
      <Text style={styles.emoji}>{def.emoji}</Text>
      <View style={styles.info}>
        <Text style={styles.name}>{def.name}</Text>
        <Text style={shared.small}>
          <Text style={{ color: afford ? colors.good : colors.bad, fontWeight: '800' }}>{formatMoney(def.cost)}</Text>
          {`  ·  ${def.w}×${def.h}`}
        </Text>
        {def.desc ? <Text style={shared.tiny}>{def.desc}</Text> : null}
        {def.edge ? <Text style={styles.rule}>📏 Must touch the edge of the lot</Text> : null}
        {def.outdoor ? <Text style={styles.rule}>🌳 Outdoor: no hallway needed</Text> : null}
        {!a.available ? <Text style={styles.lock}>{lockText(def, a)}</Text> : null}
        {!a.available && a.canEarlyUnlock ? (
          <Btn
            small
            variant="secondary"
            label={`Unlock now 🍎 ${a.earlyCost} (${applesToUsdLabel(a.earlyCost)}) — saves ≈ ${Math.round(a.minutesSaved || 0)} min`}
            disabled={wallet.apples < a.earlyCost || wallet.left <= 0}
            onPress={() => onEarly(def, a)}
            style={styles.early}
          />
        ) : null}
        {!a.available && a.canEarlyUnlock && wallet.apples < a.earlyCost ? (
          <Text style={shared.tiny}>You have 🍎 {wallet.apples}. Apples come from daily visits, achievements and level-ups.</Text>
        ) : null}
      </View>
      {a.available ? (
        <Btn label={def.kind === 'hall' ? 'Paint' : 'Place'} variant="primary" small onPress={() => onPick(def)} />
      ) : null}
    </View>
  );
}

export default function BuildPanel({ onPick }) {
  const store = useGameStore();
  const dialogs = useDialogs();
  const toast = useToast();
  const avail = useGameSelector(selectAvail, deepEqual);
  const wallet = useGameSelector(selectWallet);

  const data = useMemo(() => {
    const items = [];
    let tier = null;
    ROOM_LIST.forEach((d) => {
      if (d.tier !== tier) {
        tier = d.tier;
        items.push({ key: `t${tier}`, header: tierName(tier) });
      }
      items.push({ key: d.id, def: d });
    });
    return items;
  }, []);

  const onEarly = async (def, a) => {
    const left = selectEarlyUnlocksLeft(store.getState());
    const ok = await dialogs.confirm({
      title: `Unlock ${def.name} early?`,
      message: `Price: 🍎 ${a.earlyCost} (${applesToUsdLabel(a.earlyCost)})\n`
        + `Apples after: 🍎 ${wallet.apples - a.earlyCost}\n`
        + `Saves ≈ ${Math.round(a.minutesSaved || 0)} min of play.\n`
        + `Early unlocks left this week: ${left}`,
      confirmLabel: `Unlock for 🍎 ${a.earlyCost}`,
    });
    if (!ok) return;
    const before = store.getState();
    const after = store.dispatch(actions.earlyUnlock(def.id));
    toast.show(after !== before ? `${def.emoji} ${def.name} unlocked!` : "Couldn't unlock that right now.", after !== before ? 'good' : 'bad');
  };

  return (
    <FlatList
      data={data}
      keyExtractor={(it) => it.key}
      contentContainerStyle={styles.list}
      ListHeaderComponent={(
        <Text style={shared.small}>
          Rooms must touch a hallway that leads to the Front Office. Early unlocks left this week: {wallet.left}
        </Text>
      )}
      renderItem={({ item }) => (item.header
        ? <Text style={shared.sectionTitle}>{item.header}</Text>
        : <RoomRow def={item.def} avail={avail[item.def.id]} wallet={wallet} onPick={onPick} onEarly={onEarly} />)}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  locked: { backgroundColor: colors.paperDark },
  emoji: { fontSize: 30, width: 44, textAlign: 'center' },
  info: { flex: 1, paddingHorizontal: 8 },
  name: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  lock: { fontSize: font.small, fontWeight: '700', color: colors.inkSoft, marginTop: 4 },
  early: { marginTop: 6, alignSelf: 'flex-start' },
  rule: { fontSize: font.tiny, fontWeight: '700', color: colors.info, marginTop: 2 },
});
