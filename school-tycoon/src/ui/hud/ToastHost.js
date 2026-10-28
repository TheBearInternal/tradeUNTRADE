// Renders toasts and turns new good/bad game.log entries into toasts.
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useGameSelector } from '../GameProvider.js';
import { useToast, useToastList } from '../state/ToastContext.js';
import { colors, font, radius } from '../theme.js';

const KIND_BG = { good: colors.good, bad: colors.bad, info: colors.chalk };
const entryKey = (e) => `${e.day}|${e.kind}|${e.text}`;
const selectLog = (root) => root.game.log;

/** Watches game.log and toasts entries that were not there before. */
function useLogToasts() {
  const log = useGameSelector(selectLog);
  const toast = useToast();
  const seen = useRef(null);

  useEffect(() => {
    const list = Array.isArray(log) ? log : [];
    if (!seen.current) {
      seen.current = new Set(list.map(entryKey)); // don't replay old messages at startup
      return;
    }
    list.forEach((e) => {
      const k = entryKey(e);
      if (seen.current.has(k)) return;
      seen.current.add(k);
      if (e.kind === 'good' || e.kind === 'bad') toast.show(e.text, e.kind);
    });
    if (seen.current.size > 200) seen.current = new Set(list.map(entryKey));
  }, [log, toast]);
}

function ToastItem({ text, kind }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [a]);
  const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] });
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[styles.toast, { backgroundColor: KIND_BG[kind] || colors.chalk, opacity: a, transform: [{ translateY }] }]}
    >
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

export default function ToastHost() {
  useLogToasts();
  const toasts = useToastList();
  if (!toasts.length) return null;
  return (
    <View pointerEvents="none" style={styles.host}>
      {toasts.map((t) => <ToastItem key={t.id} text={t.text} kind={t.kind} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', top: 8, left: 76, right: 60, alignItems: 'center' },
  toast: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginBottom: 6,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  text: { color: colors.white, fontSize: font.small, fontWeight: '700', textAlign: 'center' },
});
