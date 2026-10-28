// Row components for the Shop panel.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  LOGIN_REWARDS, applesToUsdLabel, cosmeticColors, cosmeticEarnHint, cosmeticEmoji, productGranting,
} from '../catalog.js';
import { formatMoney } from '../util.js';
import Btn from '../components/Btn.js';
import { colors, font, radius, shared } from '../theme.js';

/** 7-day login cycle. Missing a day pauses the streak; it never resets. */
export function LoginStreak({ reward, doubled }) {
  const idx = reward ? reward.streakIndex : 0;
  return (
    <View style={shared.card}>
      <Text style={styles.title}>🗓️ Daily visit gifts{doubled ? ' · Supporter ×2' : ''}</Text>
      <View style={styles.boxes}>
        {LOGIN_REWARDS.map((amt, i) => {
          const past = i < idx;
          const current = i === idx;
          return (
            <View key={i} style={[styles.box, past && styles.boxPast, current && styles.boxNow]}>
              <Text style={styles.boxDay}>Day {i + 1}</Text>
              <Text style={styles.boxAmt}>{past ? '✓' : `🍎${doubled ? amt * 2 : amt}`}</Text>
            </View>
          );
        })}
      </View>
      <Text style={shared.tiny}>
        {reward && reward.claimable ? "Today's gift is ready and will be collected automatically."
          : "Today's gift is collected. Missing a day just pauses your streak."}
      </Text>
    </View>
  );
}

function priceLabel(c) {
  if (c.currency === 'apples') return `🍎 ${c.price} (${applesToUsdLabel(c.price)})`;
  if (c.currency === 'coins') return `${formatMoney(c.price)} school cash`;
  return null;
}

/** One cosmetic: equip if owned, buy if priced, or explain how to earn it. */
export function CosmeticRow({ c, owned, equipped, onEquip, onBuy }) {
  const swatch = cosmeticColors(c)[0];
  const emoji = cosmeticEmoji(c);
  let action;
  if (equipped) action = <Text style={styles.equipped}>Equipped ✓</Text>;
  else if (owned) action = <Btn label="Equip" variant="chalk" small onPress={() => onEquip(c)} />;
  else if (c.currency === 'apples' || c.currency === 'coins') action = <Btn label="Buy" variant="primary" small onPress={() => onBuy(c)} />;
  else action = null;

  let note = owned ? 'Owned' : priceLabel(c);
  if (!owned && c.currency === 'achievement') note = `🏆 ${cosmeticEarnHint(c)}`;
  if (!owned && c.currency === 'product') {
    const p = productGranting(c.id);
    note = `🎁 Included in ${p ? p.title : 'a pack'}`;
  } else if (!owned && c.product) {
    const p = productGranting(c.id);
    if (p) note = `${note} · also in ${p.title}`;
  }

  return (
    <View style={[shared.card, styles.row]}>
      <View style={[styles.swatch, swatch && { backgroundColor: swatch }]}>
        {emoji ? <Text style={styles.swatchEmoji}>{emoji}</Text> : null}
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{c.name}</Text>
        {note ? <Text style={shared.small}>{note}</Text> : null}
      </View>
      {action}
    </View>
  );
}

/** A real-money product; price string comes from StoreService.getProducts(). */
export function ProductRow({ p, owned, onBuy }) {
  return (
    <View style={[shared.card, styles.row]}>
      <Text style={styles.productIcon}>{/^apples_/.test(p.id) ? '🍎' : '🎁'}</Text>
      <View style={styles.info}>
        <Text style={styles.name}>{p.title}</Text>
        <Text style={shared.small}>{p.description}</Text>
      </View>
      {owned ? <Text style={styles.equipped}>Owned ✓</Text>
        : <Btn label={p.price} variant="primary" small onPress={() => onBuy(p.id)} accessibilityLabel={`Buy ${p.title} for ${p.price}`} />}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.body, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  boxes: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  box: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.paperDark,
    alignItems: 'center',
  },
  boxPast: { backgroundColor: colors.goodLight },
  boxNow: { backgroundColor: colors.busLight, borderWidth: 2, borderColor: colors.bus },
  boxDay: { fontSize: 12, color: colors.inkSoft, fontWeight: '700' },
  boxAmt: { fontSize: font.tiny, fontWeight: '800', color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.paperDark,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchEmoji: { fontSize: 22 },
  info: { flex: 1, paddingHorizontal: 10 },
  name: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  equipped: { fontSize: font.small, fontWeight: '800', color: colors.good },
  productIcon: { fontSize: 28, width: 40, textAlign: 'center' },
});
