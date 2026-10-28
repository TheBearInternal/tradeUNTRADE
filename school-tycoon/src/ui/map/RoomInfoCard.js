// Inspect card for the tapped room: connectivity, distances, lateness, upkeep, Sell.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { selectDerived } from '../../engine/index.js';
import { useGameSelector } from '../GameProvider.js';
import { roomDef } from '../catalog.js';
import { formatMoney, pct } from '../util.js';
import Btn from '../components/Btn.js';
import { colors, font, shared } from '../theme.js';

const dist = (d) => (d == null || d >= 99 ? 'none reachable' : `${d} tiles`);

export default function RoomInfoCard({ selection, onSell, onClose }) {
  const info = useGameSelector((root) => {
    if (selection.hall) return { hall: true };
    const room = root.game.rooms[selection.roomId];
    if (!room) return null;
    const d = selectDerived(root);
    return { room, connected: d.connected[room.id], stats: d.roomStats[room.id] || null };
  });
  if (!info) return null;

  if (info.hall) {
    return (
      <View style={[shared.card, styles.card]}>
        <Text style={styles.title}>🟫 Hallway</Text>
        <Text style={shared.small}>Connects rooms to the Front Office. Students walk here.</Text>
        <View style={styles.actions}>
          <Btn label="Sell" variant="danger" small onPress={onSell} />
          <Btn label="Close" small onPress={onClose} style={styles.gap} />
        </View>
      </View>
    );
  }

  const { room, connected, stats } = info;
  const def = roomDef(room.type);
  const isOffice = def.kind === 'office';
  const isDecor = def.kind === 'decor';
  const cost = room.cost ?? def.cost ?? 0;
  const upkeep = Math.max(1, Math.round(cost * 0.002));

  return (
    <View style={[shared.card, styles.card]}>
      <Text style={styles.title}>{def.emoji} {def.name}</Text>
      <Text style={shared.small}>{def.desc}</Text>
      {!isDecor && !isOffice ? (
        <Text style={[styles.line, { color: connected ? colors.good : colors.bad }]}>
          {connected ? '✅ Connected to the office' : '⚠️ Not connected — add a hallway to the office'}
        </Text>
      ) : null}
      {stats ? (
        <View style={styles.stats}>
          <Text style={styles.stat}>🚽 Restroom: {dist(stats.dR)}</Text>
          <Text style={styles.stat}>🍔 Cafeteria: {dist(stats.dC)}</Text>
          <Text style={styles.stat}>⏰ Late to class: {pct(stats.late)}</Text>
        </View>
      ) : null}
      {!isOffice ? <Text style={shared.tiny}>Upkeep ≈ {formatMoney(upkeep)}/day · Size {def.w}×{def.h}</Text> : null}
      <View style={styles.actions}>
        {!isOffice ? (
          <Btn label={`Sell for ${formatMoney(Math.floor(cost / 2))}`} variant="danger" small onPress={onSell} />
        ) : null}
        <Btn label="Close" small onPress={onClose} style={styles.gap} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: 8 },
  title: { fontSize: font.big, fontWeight: '800', color: colors.ink, marginBottom: 2 },
  line: { fontSize: font.small, fontWeight: '700', marginTop: 6 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  stat: { fontSize: font.small, color: colors.ink, marginRight: 12, marginBottom: 2 },
  actions: { flexDirection: 'row', marginTop: 8, justifyContent: 'flex-end' },
  gap: { marginLeft: 8 },
});
