// Strip of thought bubbles (top problems). Tapping one highlights its room.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { selectBubbles } from '../../engine/index.js';
import { useControls, useGameSelector } from '../GameProvider.js';
import { colors, font, radius, HIT_SLOP } from '../theme.js';
import { eventKey } from '../modals/ModalHost.js';

const bubblesEqual = (a, b) => a.length === b.length
  && a.every((x, i) => x.icon === b[i].icon && x.text === b[i].text && x.roomId === b[i].roomId);

const selectEventKey = (root) => {
  const e = root.game.event;
  return e && e.choices && e.choices.length ? eventKey(e) : null;
};

export default function BubbleStrip({ onBubble }) {
  const bubbles = useGameSelector((root) => selectBubbles(root) || [], bubblesEqual);
  const pendingKey = useGameSelector(selectEventKey);
  const { eventSnooze, setEventSnooze } = useControls();
  const showEvent = !!pendingKey && eventSnooze === pendingKey;

  if (!bubbles.length && !showEvent) {
    return (
      <View style={styles.strip}>
        <Text style={styles.calm}>💭 Everyone seems happy right now.</Text>
      </View>
    );
  }
  return (
    <View style={styles.strip}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {showEvent ? (
          <Pressable
            onPress={() => setEventSnooze(null)}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            style={[styles.bubble, styles.eventBubble]}
          >
            <Text style={styles.text}>❗ Decision needed</Text>
          </Pressable>
        ) : null}
        {bubbles.map((b, i) => (
          <Pressable
            key={`${b.icon}${b.text}${b.roomId || ''}${i}`}
            onPress={() => b.roomId && onBubble(b.roomId, b)}
            hitSlop={HIT_SLOP}
            accessibilityRole={b.roomId ? 'button' : 'text'}
            accessibilityLabel={b.text}
            style={styles.bubble}
          >
            <Text style={styles.text} numberOfLines={1}>{b.icon} {b.text}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    backgroundColor: colors.paperDark,
    borderBottomWidth: 1,
    borderColor: colors.line,
    minHeight: 48,
    justifyContent: 'center',
  },
  content: { paddingHorizontal: 6, alignItems: 'center' },
  calm: { fontSize: font.small, color: colors.inkSoft, paddingHorizontal: 12 },
  bubble: {
    minHeight: 40,
    paddingHorizontal: 12,
    marginHorizontal: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    justifyContent: 'center',
  },
  eventBubble: { backgroundColor: colors.busLight, borderColor: colors.bus },
  text: { fontSize: font.small, fontWeight: '700', color: colors.ink },
});
