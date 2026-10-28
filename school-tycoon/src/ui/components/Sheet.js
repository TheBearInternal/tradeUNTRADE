// Bottom sheet panel drawn over the map (a plain View, not a Modal).
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, HIT_SLOP } from '../theme.js';

export default function Sheet({ title, onClose, children }) {
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [slide]);
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });

  return (
    <Animated.View style={[styles.sheet, { opacity: slide, transform: [{ translateY }] }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Pressable
          onPress={onClose}
          hitSlop={HIT_SLOP}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Close panel"
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
      <View style={styles.body}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '72%',
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 3,
    borderColor: colors.bus,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 6,
    paddingTop: 6,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  title: { flex: 1, fontSize: font.title, fontWeight: '800', color: colors.chalk },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 22, color: colors.inkSoft, fontWeight: '700' },
  body: { flex: 1 },
});
