// Settings: restore purchases, age setting, developer mock-store outcome, reset, about.
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getSavedAt } from '../../platform/storage.js';
import { MOCK_OUTCOMES } from '../../platform/store/index.js';
import { useControls, useGameSelector } from '../GameProvider.js';
import Btn from '../components/Btn.js';
import { colors, font, shared } from '../theme.js';

const AGE_LABEL = { under13: 'Under 13 (grown-up check before purchases)', adult: '13 or older' };
const OUTCOME_LABEL = { success: 'Success', cancel: 'Cancel', fail: 'Fail', pending: 'Pending (3s)' };
const selectAge = (root) => root.ledger.ageGate;

function savedAtText() {
  const t = getSavedAt();
  if (!t) return 'Not saved yet';
  const d = new Date(t);
  return `Last saved ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function SettingsPanel({ onOpenScenarios }) {
  const controls = useControls();
  const age = useGameSelector(selectAge);

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <Text style={shared.sectionTitle}>Purchases</Text>
      <View style={shared.card}>
        <Text style={shared.small}>Bought something on another device or reinstalled? Restore it here.</Text>
        <Btn label="Restore Purchases" variant="chalk" onPress={controls.restorePurchases} style={styles.gapTop} />
      </View>

      <Text style={shared.sectionTitle}>Age setting</Text>
      <View style={shared.card}>
        <Text style={shared.body}>{AGE_LABEL[age] || 'Not set'}</Text>
        <Text style={shared.tiny}>We only store this setting, never your birth year.</Text>
        <Btn label="Change (grown-ups)" onPress={controls.requestAgeChange} style={styles.gapTop} />
      </View>

      {controls.hasMockStore ? (
        <>
          <Text style={shared.sectionTitle}>Developer: mock store outcome</Text>
          <View style={shared.card}>
            <Text style={shared.tiny}>Payments are simulated. Pick what the next purchase does.</Text>
            <View style={styles.chips}>
              {MOCK_OUTCOMES.map((o) => (
                <Btn
                  key={o}
                  small
                  label={OUTCOME_LABEL[o] || o}
                  active={controls.mockOutcome === o}
                  onPress={() => controls.setMockOutcome(o)}
                  style={styles.chip}
                />
              ))}
            </View>
          </View>
        </>
      ) : null}

      <Text style={shared.sectionTitle}>School</Text>
      <View style={shared.card}>
        <Text style={shared.tiny}>{savedAtText()}</Text>
        <Text style={shared.small}>Start over with a Classic school, a scenario or the Sandbox. Apples, cosmetics and medals are kept.</Text>
        <Btn label="🏫 New School / Scenarios…" variant="chalk" onPress={onOpenScenarios} style={styles.gapTop} />
      </View>

      <Text style={[shared.tiny, styles.about]}>
        School Tycoon v0.1 · Built with React Native & Expo.{'\n'}
        No ads, no loot boxes, no timers. Have fun running your school! 🍎
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, paddingBottom: 40 },
  gapTop: { marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  chip: { marginRight: 6, marginBottom: 6 },
  about: { marginTop: 20, textAlign: 'center', fontSize: font.tiny, color: colors.muted },
});
