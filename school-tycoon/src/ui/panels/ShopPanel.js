// Shop: Apples balance, daily visit streak, cosmetics by slot, and Apple packs.
// Compliance: no timers, no scarcity, two-step confirm with balance after.
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { actions, selectLoginReward } from '../../engine/index.js';
import { useControls, useGameSelector, useGameStore } from '../GameProvider.js';
import { useDialogs } from '../state/DialogContext.js';
import { useToast } from '../state/ToastContext.js';
import { COSMETIC_LIST, PRODUCT_LIST, SLOTS, applesToUsdLabel } from '../catalog.js';
import { deepEqual, formatMoney, localDayKey } from '../util.js';
import { CosmeticRow, LoginStreak, ProductRow } from './shopRows.js';
import { colors, font, shared } from '../theme.js';

const selectShop = (root) => ({
  apples: root.ledger.apples,
  cash: root.game.cash,
  owned: root.ledger.owned || {},
  equipped: root.ledger.equipped || {},
  reward: selectLoginReward(root, localDayKey()),
});

const isOwned = (c, owned) => !!owned[c.id] || c.currency === 'free' || c.price === 0;

export default function ShopPanel() {
  const store = useGameStore();
  const dialogs = useDialogs();
  const toast = useToast();
  const { products, buyProduct } = useControls();
  const s = useGameSelector(selectShop, deepEqual);

  const data = useMemo(() => {
    const items = [{ key: 'balance' }, { key: 'login' }];
    SLOTS.forEach((slot) => {
      const list = COSMETIC_LIST.filter((c) => c.slot === slot.id);
      if (!list.length) return;
      items.push({ key: `h-${slot.id}`, header: slot.label });
      list.forEach((c) => items.push({ key: c.id, cosmetic: c }));
    });
    items.push({ key: 'h-iap', header: 'Apple packs & bundles' });
    products.forEach((p) => items.push({ key: `p-${p.id}`, product: p }));
    if (!products.length) items.push({ key: 'p-none', empty: true });
    return items;
  }, [products]);

  const equip = (c) => store.dispatch(actions.equipCosmetic(c.id));

  const buyCosmetic = async (c) => {
    const apples = c.currency === 'apples';
    const balance = apples ? s.apples : s.cash;
    if (balance < c.price) {
      toast.show(apples ? `You need 🍎 ${c.price - balance} more Apples.` : `You need ${formatMoney(c.price - balance)} more cash.`, 'info');
      return;
    }
    const ok = await dialogs.confirm({
      title: `Buy ${c.name}?`,
      message: apples
        ? `Price: 🍎 ${c.price} (${applesToUsdLabel(c.price)})\nApples after: 🍎 ${s.apples - c.price}`
        : `Price: ${formatMoney(c.price)} school cash\nCash after: ${formatMoney(s.cash - c.price)}`,
      confirmLabel: apples ? `Buy for 🍎 ${c.price}` : `Buy for ${formatMoney(c.price)}`,
    });
    if (!ok) return;
    const before = store.getState();
    const after = store.dispatch(actions.buyCosmetic(c.id));
    if (after === before) {
      toast.show("Couldn't buy that right now.", 'bad');
      return;
    }
    store.dispatch(actions.equipCosmetic(c.id));
    toast.show(`✨ ${c.name} is yours and equipped!`, 'good');
  };

  const renderItem = ({ item }) => {
    if (item.key === 'balance') {
      return (
        <View style={[shared.card, styles.balance]}>
          <Text style={styles.balanceText}>🍎 {s.apples} Apples</Text>
          <Text style={shared.tiny}>
            Earn Apples free from daily visits, achievements and level-ups. 100 🍎 ≈ $0.99. Apples never buy stars, rating or tier-ups.
          </Text>
        </View>
      );
    }
    if (item.key === 'login') {
      return <LoginStreak reward={s.reward} doubled={!!s.owned.supporter_pack} />;
    }
    if (item.header) return <Text style={shared.sectionTitle}>{item.header}</Text>;
    if (item.cosmetic) {
      const c = item.cosmetic;
      return (
        <CosmeticRow
          c={c}
          owned={isOwned(c, s.owned)}
          equipped={s.equipped[c.slot] === c.id}
          onEquip={equip}
          onBuy={buyCosmetic}
        />
      );
    }
    if (item.product) {
      const p = item.product;
      const meta = PRODUCT_LIST.find((x) => x.id === p.id);
      const nonConsumable = meta ? !meta.consumable : !/^apples_/.test(p.id);
      return <ProductRow p={p} owned={nonConsumable && !!s.owned[p.id]} onBuy={buyProduct} />;
    }
    return <Text style={shared.small}>The store isn't available right now.</Text>;
  };

  return (
    <FlatList
      data={data}
      keyExtractor={(it) => it.key}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      ListFooterComponent={<Text style={[shared.tiny, styles.footer]}>Cosmetics are just for looks. They never change how your school performs.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, paddingBottom: 32 },
  balance: { marginBottom: 8, backgroundColor: colors.busLight, borderColor: colors.bus },
  balanceText: { fontSize: font.title, fontWeight: '800', color: colors.ink, marginBottom: 4 },
  footer: { marginTop: 8, textAlign: 'center' },
});
