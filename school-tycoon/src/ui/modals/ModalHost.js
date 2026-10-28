// One RN <Modal> for the whole app; shows the highest-priority content:
// dialog (confirm / parental gate) > age screen > offline summary > tier-up > event > report card.
import React, { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { actions } from '../../engine/index.js';
import { useControls, useGameSelector, useGameStore } from '../GameProvider.js';
import { useDialogState } from '../state/DialogContext.js';
import Btn from '../components/Btn.js';
import { AgeGate, ParentalGate } from './GateModals.js';
import { EventContent, OfflineContent, ReportCardContent, TierUpContent } from './GameModals.js';
import { colors, font, radius } from '../theme.js';

const selectModalState = (root) => ({
  ageGate: root.ledger.ageGate,
  event: root.game.event,
  report: root.game.lastReport,
  tier: root.game.tier,
  size: root.game.size,
});

export const eventKey = (e) => (e ? `${e.id}:${e.startedDay}:${e.phase}` : null);

function ConfirmContent({ dialog, onClose }) {
  return (
    <View>
      <Text style={styles.title}>{dialog.title}</Text>
      {dialog.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
      <View style={styles.row}>
        {dialog.kind === 'confirm' ? (
          <Btn label={dialog.cancelLabel || 'Cancel'} onPress={() => onClose(false)} style={styles.flex} />
        ) : null}
        <Btn
          label={dialog.confirmLabel || 'OK'}
          variant={dialog.destructive ? 'danger' : 'primary'}
          onPress={() => onClose(true)}
          style={[styles.flex, dialog.kind === 'confirm' && styles.gap]}
        />
      </View>
    </View>
  );
}

export default function ModalHost() {
  const store = useGameStore();
  const controls = useControls();
  const { current: dialog, close } = useDialogState();
  const s = useGameSelector(selectModalState);
  const [celebrate, setCelebrate] = useState(null);
  const prevTier = useRef(s.tier);

  useEffect(() => {
    if (s.tier > prevTier.current) setCelebrate({ tier: s.tier, size: s.size });
    prevTier.current = s.tier;
  }, [s.tier, s.size]);

  const hasChoices = !!(s.event && s.event.choices && s.event.choices.length);
  const snoozed = hasChoices && controls.eventSnooze === eventKey(s.event);

  let content = null;
  let onBack = () => {};
  if (dialog) {
    if (dialog.kind === 'parental') {
      content = <ParentalGate key={dialog.id} onResult={(ok) => close(dialog.id, ok)} />;
    } else {
      content = <ConfirmContent dialog={dialog} onClose={(v) => close(dialog.id, v)} />;
    }
    onBack = () => close(dialog.id, false);
  } else if (!s.ageGate || controls.ageScreenForced) {
    content = (
      <AgeGate
        onDone={(value) => {
          store.dispatch(actions.setAgeGate(value));
          controls.finishAgeScreen();
          controls.saveNow();
        }}
      />
    );
  } else if (controls.offlineSummary) {
    content = <OfflineContent summary={controls.offlineSummary} onClose={controls.dismissOffline} />;
    onBack = controls.dismissOffline;
  } else if (celebrate) {
    content = <TierUpContent tier={celebrate.tier} size={celebrate.size} onClose={() => setCelebrate(null)} />;
    onBack = () => setCelebrate(null);
  } else if (hasChoices && !snoozed) {
    const later = () => controls.setEventSnooze(eventKey(s.event));
    content = (
      <EventContent
        event={s.event}
        onChoose={(id) => store.dispatch(actions.resolveEvent(id))}
        onLater={later}
      />
    );
    onBack = later;
  } else if (s.report) {
    const dismiss = () => store.dispatch(actions.dismissReport());
    content = <ReportCardContent report={s.report} onClose={dismiss} />;
    onBack = dismiss;
  }

  return (
    <Modal
      visible={!!content}
      transparent
      animationType="fade"
      onRequestClose={onBack}
      supportedOrientations={['portrait']}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
            {content}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: colors.backdrop, alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '92%',
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    borderTopWidth: 6,
    borderColor: colors.bus,
  },
  scroll: { padding: 18 },
  title: { fontSize: font.title, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  message: { fontSize: font.body, color: colors.ink, marginTop: 10, lineHeight: 22, textAlign: 'center' },
  row: { flexDirection: 'row', marginTop: 16 },
  flex: { flex: 1 },
  gap: { marginLeft: 8 },
});
