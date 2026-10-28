// Tool rail (left of the map) and the contextual bar for the active tool (bottom of the map).
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { selectCanBuild } from '../../engine/index.js';
import { useGameSelector } from '../GameProvider.js';
import { roomDef } from '../catalog.js';
import { formatMoney } from '../util.js';
import Btn from '../components/Btn.js';
import { colors, font, radius, HIT_SLOP } from '../theme.js';
import { REASON_TEXT } from './useMapTools.js';
import RoomInfoCard from './RoomInfoCard.js';

const RAIL = [
  { mode: 'inspect', icon: '🔍', label: 'Inspect' },
  { mode: 'hall', icon: '🛤️', label: 'Hallway' },
  { mode: 'bulldoze', icon: '🚜', label: 'Bulldoze' },
];

export function ToolRail({ tool, onSelect }) {
  return (
    <View style={styles.rail} pointerEvents="box-none">
      {RAIL.map((t) => {
        const active = tool.mode === t.mode;
        return (
          <Pressable
            key={t.mode}
            onPress={() => onSelect({ mode: t.mode })}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`${t.label} tool`}
            accessibilityState={{ selected: active }}
            style={[styles.railBtn, active && styles.railActive]}
          >
            <Text style={styles.railIcon}>{t.icon}</Text>
            <Text style={styles.railLabel}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function BuildBar({ type, ghost, onConfirm, onCancel }) {
  const def = roomDef(type);
  const check = useGameSelector((root) => (ghost ? selectCanBuild(root, type, ghost.x, ghost.y) : null));
  const ok = !!(check && check.ok);
  let hint = 'Tap the map to place it.';
  if (ghost) hint = ok ? 'Looks good! Tap elsewhere to move it.' : (REASON_TEXT[check && check.reason] || "Can't build here.");
  return (
    <View style={styles.bar}>
      <Text style={styles.barTitle}>
        {def.emoji} {def.name} · {formatMoney(def.cost)} · {def.w}×{def.h}
      </Text>
      <Text style={[styles.barHint, ghost && !ok && { color: colors.bad }]}>{hint}</Text>
      <View style={styles.barRow}>
        <Btn label="✕ Cancel" small onPress={onCancel} />
        <Btn label="✓ Build here" variant="good" small disabled={!ok} onPress={onConfirm} style={styles.gap} />
      </View>
    </View>
  );
}

function SimpleBar({ title, hint, children }) {
  return (
    <View style={styles.bar}>
      <Text style={styles.barTitle}>{title}</Text>
      <Text style={styles.barHint}>{hint}</Text>
      <View style={styles.barRow}>{children}</View>
    </View>
  );
}

/** Bottom bar for the active tool; returns null when nothing needs showing. */
export function ToolContextBar({ tools }) {
  const { tool, ghost, selected, anchor } = tools;
  const done = () => tools.setTool({ mode: 'inspect' });
  if (tool.mode === 'build') {
    return <BuildBar type={tool.type} ghost={ghost} onConfirm={tools.confirmBuild} onCancel={done} />;
  }
  if (tool.mode === 'hall') {
    return (
      <SimpleBar
        title={`🛤️ Hallway paint · ${formatMoney(roomDef('hall').cost)} per tile`}
        hint="Tap to add or remove a tile. Tap again on the same row or column to fill a straight line."
      >
        {anchor ? <Btn label="Lift pen" small onPress={tools.liftPen} /> : null}
        <Btn label="Done" variant="chalk" small onPress={done} style={styles.gap} />
      </SimpleBar>
    );
  }
  if (tool.mode === 'bulldoze') {
    return (
      <SimpleBar title="🚜 Bulldoze" hint="Tap a room or hallway to sell it for a 50% refund.">
        <Btn label="Done" variant="chalk" small onPress={done} />
      </SimpleBar>
    );
  }
  if (selected) {
    return <RoomInfoCard selection={selected} onSell={tools.sellSelected} onClose={tools.clearSelected} />;
  }
  return null;
}

const styles = StyleSheet.create({
  rail: { position: 'absolute', left: 8, top: 8 },
  railBtn: {
    width: 64,
    minHeight: 52,
    marginBottom: 6,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,251,240,0.92)',
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  railActive: { backgroundColor: colors.bus, borderColor: colors.busDark },
  railIcon: { fontSize: 20 },
  railLabel: { fontSize: 12, fontWeight: '700', color: colors.ink },
  bar: {
    margin: 8,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.bus,
  },
  barTitle: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  barHint: { fontSize: font.small, color: colors.inkSoft, marginTop: 2 },
  barRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  gap: { marginLeft: 8 },
});
