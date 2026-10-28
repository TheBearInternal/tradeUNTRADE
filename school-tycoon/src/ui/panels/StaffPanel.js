// Staff panel: hire buttons per role/grade, and the roster with Fire.
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { actions } from '../../engine/index.js';
import { useGameSelector, useGameStore } from '../GameProvider.js';
import { useToast } from '../state/ToastContext.js';
import { ROLE_EMOJI, STAFF_OPTIONS, tierName } from '../catalog.js';
import { formatMoney } from '../util.js';
import Btn from '../components/Btn.js';
import { colors, font, shared } from '../theme.js';

const selectStaff = (root) => root.game.staff;
const selectGate = (root) => ({ level: root.game.level, tier: root.game.tier });

function HireRow({ opt, gate, onHire }) {
  const locked = opt.tier > gate.tier ? `Reach ${tierName(opt.tier)}` : opt.level > gate.level ? `Level ${opt.level}` : null;
  return (
    <View style={[shared.card, styles.row, locked && styles.locked]}>
      <Text style={styles.emoji}>{ROLE_EMOJI[opt.role] || '🧑'}</Text>
      <View style={styles.info}>
        <Text style={styles.name}>{opt.label}</Text>
        <Text style={shared.small}>
          {formatMoney(opt.salary)}/day{opt.role === 'teacher' ? ` · skill ${'★'.repeat(opt.skill)}` : ''}
        </Text>
        {locked ? <Text style={styles.lock}>🔒 {locked}</Text> : null}
      </View>
      <Btn label="Hire" variant="primary" small disabled={!!locked} onPress={() => onHire(opt)} />
    </View>
  );
}

export default function StaffPanel() {
  const store = useGameStore();
  const toast = useToast();
  const staff = useGameSelector(selectStaff);
  const gate = useGameSelector(selectGate);
  const roster = useMemo(() => Object.values(staff || {}), [staff]);
  const payroll = roster.reduce((s, m) => s + (m.salary || 0), 0);

  const hire = (opt) => {
    const before = store.getState();
    const after = store.dispatch(actions.hire(opt.role, opt.grade || undefined));
    if (after === before) toast.show(`Couldn't hire a ${opt.label.toLowerCase()} right now.`, 'bad');
    else toast.show(`${ROLE_EMOJI[opt.role] || ''} Welcome aboard, new ${opt.label.toLowerCase()}!`, 'good');
  };
  const fire = (member) => {
    store.dispatch(actions.fire(member.id));
    toast.show(`${member.name} has left the school.`, 'info');
  };

  const header = (
    <View>
      <Text style={shared.small}>
        Teachers are assigned to classrooms automatically, best teacher to the best room. Janitors keep things clean.
        Nurses work in the Nurse's Office; Counselors in the Counselor's Office (half as many students leave).
      </Text>
      <Text style={shared.sectionTitle}>Hire</Text>
      {STAFF_OPTIONS.map((opt) => (
        <HireRow key={`${opt.role}:${opt.grade || ''}`} opt={opt} gate={gate} onHire={hire} />
      ))}
      <Text style={shared.sectionTitle}>Your team ({roster.length}) · {formatMoney(payroll)}/day</Text>
    </View>
  );

  return (
    <FlatList
      data={roster}
      keyExtractor={(m) => m.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={shared.small}>No staff yet. Hire a teacher for your first classroom!</Text>}
      renderItem={({ item }) => (
        <View style={[shared.card, styles.row]}>
          <Text style={styles.emoji}>{ROLE_EMOJI[item.role] || '🧑'}</Text>
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={shared.small}>
              {item.role}{item.role === 'teacher' ? ` · skill ${'★'.repeat(item.skill || 0)}` : ''} · {formatMoney(item.salary)}/day
            </Text>
          </View>
          <Btn label="Fire" variant="danger" small onPress={() => fire(item)} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  locked: { backgroundColor: colors.paperDark },
  emoji: { fontSize: 28, width: 40, textAlign: 'center' },
  info: { flex: 1, paddingHorizontal: 8 },
  name: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  lock: { fontSize: font.small, fontWeight: '700', color: colors.inkSoft, marginTop: 2 },
});
