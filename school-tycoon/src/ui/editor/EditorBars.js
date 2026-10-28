// Room editor chrome: header (name, quality badge, capacity, missing items) and the action bar.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BALANCE, ITEMS } from '../../engine/index.js';
import Btn from '../components/Btn.js';
import { formatMoney } from '../util.js';
import { colors, font, radius } from '../theme.js';

export const PLACE_REASON = {
  room: 'This room has no interior.',
  item: 'Unknown item.',
  wrongRoom: "That item doesn't belong in this room.",
  locked: 'Not unlocked yet.',
  limit: 'This room is full (40 items max).',
  rot: "It can't turn that way.",
  bounds: "Doesn't fit inside the room.",
  door: 'Keep the doorway clear.',
  wall: 'Wall items must touch a back wall.',
  occupied: "Something's already there.",
  cash: 'Not enough cash.',
};

const REFUND = Number(BALANCE.itemRefund ?? 0.5);
export const refundFor = (itemType) => Math.floor(((ITEMS[itemType] && ITEMS[itemType].cost) || 0) * REFUND);

function scoreColor(s) {
  if (s >= 75) return colors.good;
  if (s >= 45) return colors.busDark;
  return colors.bad;
}

function capacityText(q, view) {
  if (!q) return '';
  if (q.category === 'seat' || q.category === 'cafeteria') return `🪑 ${q.seats} seats`;
  if (q.category === 'restroom') return `🚽 serves ${q.capacity}`;
  return `📦 ${view.itemCount}/${view.maxItems} items`;
}

export function EditorHeader({ def, quality, view, cash, onClose, showWalkable, onToggleWalkable, onAutoArrange, topInset }) {
  const score = quality ? Math.round(quality.score) : 0;
  return (
    <View style={[styles.header, { paddingTop: topInset + 6 }]}>
      <View style={styles.row}>
        <Btn label="← Done" variant="secondary" small onPress={onClose} />
        <Text style={styles.title} numberOfLines={1}>{def.emoji} {def.name}</Text>
        <View style={[styles.badge, { borderColor: scoreColor(score) }]} accessible accessibilityLabel={`Quality ${score}`}>
          <Text style={[styles.badgeNum, { color: scoreColor(score) }]}>{score}</Text>
          <Text style={styles.badgeLbl}>quality</Text>
        </View>
      </View>
      <Text style={styles.sub}>
        {capacityText(quality, view)} · 💵 {formatMoney(cash)}
        {view.itemCount >= view.maxItems ? ' · room is full' : ''}
      </Text>
      {quality && quality.missing && quality.missing.length ? (
        <Text style={styles.missing}>⚠️ Missing: {quality.missing.join(', ')}</Text>
      ) : null}
      <View style={styles.row}>
        <Btn small label={showWalkable ? '👣 Walkable: on' : '👣 Walkable: off'} active={showWalkable} onPress={onToggleWalkable} />
        <Btn small label="✨ Auto-arrange" onPress={onAutoArrange} style={styles.gap} />
      </View>
    </View>
  );
}

/** Contextual bar: selected item (Rotate / Move / Sell), ghost placement, or a hint. */
export function EditorActionBar({ mode, selectedItem, ghost, ghostReason, paletteType, onRotate, onMove, onSell, onPlace, onCancel, onRotateGhost }) {
  if (mode === 'move' && selectedItem) {
    return (
      <View style={styles.bar}>
        <Text style={styles.barTitle}>Moving {ITEMS[selectedItem.itemType].emoji} {ITEMS[selectedItem.itemType].name}</Text>
        <Text style={[styles.hint, ghost && !ghost.ok && styles.bad]}>
          {ghost ? (ghost.ok ? 'Looks good!' : ghostReason) : 'Tap where it should go.'}
        </Text>
        <View style={styles.row}>
          <Btn small label="✕ Cancel" onPress={onCancel} />
          <Btn small label="⟳" onPress={onRotateGhost} accessibilityLabel="Rotate ghost" style={styles.gap} />
          <Btn small label="✔ Move here" variant="good" disabled={!ghost || !ghost.ok} onPress={onPlace} style={styles.gap} />
        </View>
      </View>
    );
  }
  if (selectedItem) {
    const def = ITEMS[selectedItem.itemType];
    const refund = refundFor(selectedItem.itemType);
    return (
      <View style={styles.bar}>
        <Text style={styles.barTitle}>{def.emoji} {def.name}{selectedItem.counted === false ? '  ⚠️ not reachable from the door' : ''}</Text>
        <View style={styles.row}>
          <Btn small label="⟳ Rotate" onPress={onRotate} />
          <Btn small label="✥ Move" onPress={onMove} style={styles.gap} />
          <Btn small variant="danger" label={refund > 0 ? `Sell +${formatMoney(refund)}` : 'Remove (free)'} onPress={onSell} style={styles.gap} />
          <Btn small label="✕" accessibilityLabel="Deselect" onPress={onCancel} style={styles.gap} />
        </View>
      </View>
    );
  }
  if (paletteType) {
    const def = ITEMS[paletteType];
    return (
      <View style={styles.bar}>
        <Text style={styles.barTitle}>{def.emoji} {def.name} · {def.cost > 0 ? formatMoney(def.cost) : 'Free'}</Text>
        <Text style={[styles.hint, ghost && !ghost.ok && styles.bad]}>
          {ghost ? (ghost.ok ? 'Looks good! Tap elsewhere to move it.' : ghostReason) : 'Tap an empty spot in the room.'}
        </Text>
        <View style={styles.row}>
          <Btn small label="✕ Cancel" onPress={onCancel} />
          <Btn small label="⟳" onPress={onRotateGhost} accessibilityLabel="Rotate ghost" style={styles.gap} />
          <Btn small label="✔ Place" variant="good" disabled={!ghost || !ghost.ok} onPress={onPlace} style={styles.gap} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.bar}>
      <Text style={styles.hint}>Tap an item to edit it, or pick something from the palette below.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.chalk, paddingHorizontal: 10, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' },
  title: { flex: 1, fontSize: font.big, fontWeight: '800', color: colors.paper, marginHorizontal: 8 },
  badge: {
    minWidth: 56, paddingVertical: 2, borderRadius: radius.md, borderWidth: 3, backgroundColor: colors.paper, alignItems: 'center',
  },
  badgeNum: { fontSize: font.big, fontWeight: '900' },
  badgeLbl: { fontSize: 11, fontWeight: '700', color: colors.inkSoft, marginTop: -3 },
  sub: { fontSize: font.small, color: colors.chalkLight, marginTop: 6, fontWeight: '700' },
  missing: {
    fontSize: font.small, color: colors.white, fontWeight: '800', marginTop: 6, backgroundColor: colors.bad,
    borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden', alignSelf: 'flex-start',
  },
  gap: { marginLeft: 8 },
  bar: { backgroundColor: colors.paper, padding: 8, borderTopWidth: 1, borderColor: colors.line },
  barTitle: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  hint: { fontSize: font.small, color: colors.inkSoft, marginTop: 2 },
  bad: { color: colors.bad, fontWeight: '700' },
});
