// Bottom item palette for the room editor: Free / Furniture (coins) / Locked tabs.
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { selectItemsForRoom } from '../../engine/index.js';
import { useGameSelector } from '../GameProvider.js';
import { applesToUsdLabel, tierName } from '../catalog.js';
import { formatMoney } from '../util.js';
import Btn from '../components/Btn.js';
import { colors, font, radius, HIT_SLOP } from '../theme.js';

const TABS = [
  { id: 'free', label: 'Free' },
  { id: 'paid', label: 'Furniture' },
  { id: 'locked', label: 'Locked' },
];

const FIELDS = ['itemType', 'available', 'reason', 'canEarlyUnlock', 'earlyCost', 'minutesSaved', 'affordable', 'canAffordCoins'];
const listEqual = (a, b) => a.length === b.length && a.every((x, i) => FIELDS.every((k) => x[k] === b[i][k]));

const tabOf = (e) => (!e.available ? 'locked' : e.item.cost > 0 ? 'paid' : 'free');

/** Stat chips: 📚 focus, 😊 comfort, 🧼 hygiene, seats, plus rep / mess when present. */
export function statChips(item) {
  const s = item.stats || {};
  const chips = [];
  if (s.F) chips.push(`📚F+${s.F}`);
  if (s.Cf) chips.push(`😊Cf+${s.Cf}`);
  if (s.Hy) chips.push(`🧼Hy+${s.Hy}`);
  if (s.rep) chips.push(`⭐rep+${s.rep}`);
  if (item.seats) chips.push(`🪑${item.seats} seats`);
  if (item.stalls) chips.push(`🚽${item.stalls * 10} cap`);
  if (item.clean) chips.push(`🧹${item.clean > 0 ? '+' : ''}${item.clean}/day`);
  if (item.required) chips.push('★ required');
  if (item.wall) chips.push('🧱 wall');
  return chips;
}

function Card({ entry, selected, onSelect, onEarlyUnlock }) {
  const { item } = entry;
  const locked = !entry.available;
  const lockText = entry.reason === 'tier' ? `🔒 Reach ${tierName(item.tier)}` : `🔒 Level ${item.level}`;
  return (
    <Pressable
      onPress={() => !locked && onSelect(entry.itemType)}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={`Item ${item.name}`}
      accessibilityState={{ selected, disabled: locked }}
      style={[styles.card, selected && styles.cardOn, locked && styles.cardLocked]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.emoji}>{item.emoji}</Text>
        <View style={styles.cardHead}>
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          <Text style={[styles.price, item.cost > 0 && !entry.canAffordCoins && { color: colors.bad }]}>
            {item.cost > 0 ? formatMoney(item.cost) : 'Free'} · {item.w}×{item.h}
          </Text>
        </View>
      </View>
      <View style={styles.chips}>
        {statChips(item).map((c) => <Text key={c} style={styles.chip}>{c}</Text>)}
      </View>
      {locked ? <Text style={styles.lock}>{lockText}</Text> : null}
      {locked && entry.canEarlyUnlock ? (
        <Btn
          small
          label={`Unlock now 🍎${entry.earlyCost} (${applesToUsdLabel(entry.earlyCost)})`}
          disabled={!entry.affordable}
          onPress={() => onEarlyUnlock(entry)}
          style={styles.unlock}
        />
      ) : null}
    </Pressable>
  );
}

export default function ItemPalette({ roomType, selectedType, onSelect, onEarlyUnlock }) {
  const [tab, setTab] = useState('free');
  const entries = useGameSelector((root) => selectItemsForRoom(root, roomType), listEqual);
  const byTab = useMemo(() => {
    const out = { free: [], paid: [], locked: [] };
    entries.forEach((e) => out[tabOf(e)].push(e));
    return out;
  }, [entries]);

  return (
    <View style={styles.wrap}>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            hitSlop={HIT_SLOP}
            accessibilityRole="tab"
            accessibilityLabel={`${t.label} items`}
            accessibilityState={{ selected: tab === t.id }}
            style={[styles.tab, tab === t.id && styles.tabOn]}
          >
            <Text style={[styles.tabText, tab === t.id && styles.tabTextOn]}>{t.label} ({byTab[t.id].length})</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        horizontal
        data={byTab[tab]}
        keyExtractor={(e) => e.itemType}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nothing here for this room.</Text>}
        renderItem={({ item }) => (
          <Card entry={item} selected={item.itemType === selectedType} onSelect={onSelect} onEarlyUnlock={onEarlyUnlock} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.paper, borderTopWidth: 2, borderColor: colors.bus },
  tabs: { flexDirection: 'row', paddingHorizontal: 6, paddingTop: 6 },
  tab: {
    flex: 1, minHeight: 40, marginHorizontal: 3, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.paperDark,
  },
  tabOn: { backgroundColor: colors.chalk },
  tabText: { fontSize: font.small, fontWeight: '800', color: colors.ink },
  tabTextOn: { color: colors.paper },
  list: { padding: 6 },
  empty: { fontSize: font.small, color: colors.inkSoft, padding: 12 },
  card: {
    width: 156, minHeight: 120, marginHorizontal: 4, padding: 8, borderRadius: radius.md,
    backgroundColor: colors.white, borderWidth: 2, borderColor: colors.line,
  },
  cardOn: { borderColor: colors.bus, backgroundColor: colors.busLight },
  cardLocked: { backgroundColor: colors.paperDark },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  emoji: { fontSize: 26, marginRight: 6 },
  cardHead: { flex: 1 },
  name: { fontSize: font.small, fontWeight: '800', color: colors.ink },
  price: { fontSize: font.tiny, fontWeight: '700', color: colors.good },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  chip: {
    fontSize: 12, color: colors.ink, backgroundColor: colors.chalkLight, borderRadius: 6,
    paddingHorizontal: 4, paddingVertical: 1, marginRight: 3, marginTop: 3, overflow: 'hidden',
  },
  lock: { fontSize: font.tiny, fontWeight: '700', color: colors.inkSoft, marginTop: 4 },
  unlock: { marginTop: 4 },
});
