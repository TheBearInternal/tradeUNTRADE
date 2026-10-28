// Bottom tab bar; each tab toggles a sheet panel over the map.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, HIT_SLOP } from '../theme.js';

export const TABS = [
  { id: 'build', icon: '🏗️', label: 'Build' },
  { id: 'staff', icon: '👩‍🏫', label: 'Staff' },
  { id: 'school', icon: '🏫', label: 'School' },
  { id: 'shop', icon: '🍎', label: 'Shop' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
];

export default function TabBar({ active, onSelect, bottomInset }) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(bottomInset, 4) }]}>
      {TABS.map((t) => {
        const on = active === t.id;
        return (
          <Pressable
            key={t.id}
            onPress={() => onSelect(on ? null : t.id)}
            hitSlop={HIT_SLOP}
            accessibilityRole="tab"
            accessibilityLabel={t.label}
            accessibilityState={{ selected: on }}
            style={[styles.tab, on && styles.tabOn]}
          >
            <Text style={styles.icon}>{t.icon}</Text>
            <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.chalk,
    paddingTop: 4,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    minHeight: 52,
    marginHorizontal: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabOn: { backgroundColor: colors.bus },
  icon: { fontSize: 20 },
  label: { fontSize: 12, fontWeight: '700', color: colors.paper, marginTop: 1 },
  labelOn: { color: colors.ink },
});
