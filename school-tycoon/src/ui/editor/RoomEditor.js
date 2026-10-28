// Full-screen Sims-style interior editor for one room.
// Subscribes only to this room's interior, quality, the room itself, cash and equipped cosmetics.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ITEMS, actions, itemSize, selectCanPlaceItem, selectEarlyUnlocksLeft, selectInterior, selectRoomQuality,
} from '../../engine/index.js';
import { useGameSelector, useGameStore } from '../GameProvider.js';
import { useDialogs } from '../state/DialogContext.js';
import { useToast } from '../state/ToastContext.js';
import { applesToUsdLabel, roomDef } from '../catalog.js';
import { deepEqual, formatMoney } from '../util.js';
import IsoScene from './IsoScene.js';
import ItemPalette from './ItemPalette.js';
import { EditorActionBar, EditorHeader, PLACE_REASON, refundFor } from './EditorBars.js';
import { roomPalette } from './isoDraw.js';
import { colors } from '../theme.js';

/** Move validity checked locally (moveItem ignores the item itself and cash). */
function moveReason(view, item, cx, cy, rot) {
  const def = ITEMS[item.itemType];
  const { w, h } = itemSize(def, rot);
  if (cx < 0 || cy < 0 || cx + w > view.cols || cy + h > view.rows) return 'bounds';
  if (def.wall && cx !== 0 && cy !== 0) return 'wall';
  for (let y = cy; y < cy + h; y += 1) {
    for (let x = cx; x < cx + w; x += 1) {
      if (x === view.door.cx && y === view.door.cy) return 'door';
      const occ = view.occupancy[y * view.cols + x];
      if (occ && occ !== item.id) return 'occupied';
    }
  }
  return null;
}

export default function RoomEditor({ roomId, onClose }) {
  const insets = useSafeAreaInsets();
  const store = useGameStore();
  const dialogs = useDialogs();
  const toast = useToast();
  const view = useGameSelector((r) => selectInterior(r, roomId));
  const quality = useGameSelector((r) => selectRoomQuality(r, roomId), deepEqual);
  const roomType = useGameSelector((r) => (r.game.rooms[roomId] ? r.game.rooms[roomId].type : null));
  const cash = useGameSelector((r) => r.game.cash);
  const equipped = useGameSelector((r) => r.ledger.equipped);

  const [selectedId, setSelectedId] = useState(null);
  const [paletteType, setPaletteType] = useState(null);
  const [ghost, setGhost] = useState(null); // { cx, cy, rot }
  const [mode, setMode] = useState('idle'); // 'idle' | 'move'
  const [showWalkable, setShowWalkable] = useState(true);

  const palette = useMemo(() => roomPalette(equipped), [equipped]);
  const selectedItem = view && selectedId ? view.items.find((i) => i.id === selectedId) : null;

  useEffect(() => {
    if (!view) onClose();
  }, [view, onClose]);

  const clear = useCallback(() => {
    setSelectedId(null);
    setPaletteType(null);
    setGhost(null);
    setMode('idle');
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedId || paletteType || ghost) clear();
      else onClose();
      return true;
    });
    return () => sub.remove();
  }, [selectedId, paletteType, ghost, clear, onClose]);

  const placeCheck = useGameSelector((r) => (paletteType && ghost && mode === 'idle'
    ? selectCanPlaceItem(r, roomId, paletteType, ghost.cx, ghost.cy, ghost.rot) : null));

  if (!view || !roomType) return null;
  const def = roomDef(roomType);

  let ghostView = null;
  let ghostReason = null;
  if (ghost && mode === 'move' && selectedItem) {
    const why = moveReason(view, selectedItem, ghost.cx, ghost.cy, ghost.rot);
    ghostReason = PLACE_REASON[why] || null;
    ghostView = { cx: ghost.cx, cy: ghost.cy, ...itemSize(ITEMS[selectedItem.itemType], ghost.rot), ok: !why };
  } else if (ghost && paletteType && placeCheck) {
    ghostReason = PLACE_REASON[placeCheck.reason] || "Can't place it here.";
    ghostView = { cx: ghost.cx, cy: ghost.cy, ...itemSize(ITEMS[paletteType], ghost.rot), ok: !!placeCheck.ok };
  }

  const onTapCell = (cx, cy) => {
    if (mode === 'move' && selectedItem) {
      setGhost((g) => ({ cx, cy, rot: g ? g.rot : selectedItem.rot }));
      return;
    }
    const occ = view.occupancy[cy * view.cols + cx];
    if (occ) {
      setSelectedId(occ);
      setPaletteType(null);
      setGhost(null);
    } else if (paletteType) {
      setGhost((g) => ({ cx, cy, rot: g ? g.rot : 0 }));
    } else {
      setSelectedId(null);
    }
  };

  const tryDispatch = (action, failText) => {
    const before = store.getState();
    const after = store.dispatch(action);
    if (after === before) toast.show(failText, 'bad');
    return after !== before ? after : null;
  };

  const place = () => {
    if (mode === 'move' && selectedItem && ghost) {
      if (tryDispatch(actions.moveItem(roomId, selectedItem.id, ghost.cx, ghost.cy, ghost.rot), ghostReason || "Can't move it there.")) {
        setMode('idle');
        setGhost(null);
      }
      return;
    }
    if (!paletteType || !ghost) return;
    const item = ITEMS[paletteType];
    if (tryDispatch(actions.placeItem(roomId, paletteType, ghost.cx, ghost.cy, ghost.rot), ghostReason || "Can't place it here.")) {
      toast.show(`${item.emoji} ${item.name} placed${item.cost > 0 ? ` (−${formatMoney(item.cost)})` : ''}`, 'good');
      setGhost(null);
    }
  };

  const rotate = () => {
    if (!selectedItem) return;
    tryDispatch(actions.moveItem(roomId, selectedItem.id, selectedItem.cx, selectedItem.cy, selectedItem.rot ? 0 : 1),
      'No space to rotate it here. Try moving it first.');
  };

  const sell = async () => {
    if (!selectedItem) return;
    const item = ITEMS[selectedItem.itemType];
    if (item.required) {
      const ok = await dialogs.confirm({
        title: `Remove ${item.name}?`,
        message: `This room needs a ${item.name} to work. You can place a new one from the Free tab.`,
        confirmLabel: 'Remove it',
        destructive: true,
      });
      if (!ok) return;
    }
    const refund = refundFor(selectedItem.itemType);
    if (tryDispatch(actions.removeItem(roomId, selectedItem.id), "Couldn't remove that.")) {
      toast.show(refund > 0 ? `Sold ${item.name} for ${formatMoney(refund)}` : `${item.name} removed`, 'info');
      clear();
    }
  };

  const autoArrange = async () => {
    const paid = view.items.filter((i) => (ITEMS[i.itemType].cost || 0) > 0);
    const refund = paid.reduce((s, i) => s + refundFor(i.itemType), 0);
    const ok = await dialogs.confirm({
      title: 'Auto-arrange this room?',
      message: 'The room goes back to its free starter layout.'
        + (paid.length ? `\n\n${paid.length} paid item${paid.length > 1 ? 's are' : ' is'} removed and refunded at 50% (+${formatMoney(refund)}).` : ''),
      confirmLabel: 'Auto-arrange',
    });
    if (!ok) return;
    if (tryDispatch(actions.autoArrange(roomId), 'Already in the starter layout.')) {
      toast.show('✨ Room re-arranged', 'good');
      clear();
    }
  };

  const earlyUnlock = async (entry) => {
    const root = store.getState();
    const ok = await dialogs.confirm({
      title: `Unlock ${entry.item.name} early?`,
      message: `Price: 🍎 ${entry.earlyCost} (${applesToUsdLabel(entry.earlyCost)})\n`
        + `Apples after: 🍎 ${root.ledger.apples - entry.earlyCost}\n`
        + `Saves ≈ ${Math.round(entry.minutesSaved || 0)} min of play.\n`
        + `Early unlocks left this week: ${selectEarlyUnlocksLeft(root)}\n`
        + `Placing it still costs ${formatMoney(entry.item.cost)} school cash.`,
      confirmLabel: `Unlock for 🍎 ${entry.earlyCost}`,
    });
    if (ok && tryDispatch(actions.earlyUnlockItem(entry.itemType), "Couldn't unlock that right now.")) {
      toast.show(`${entry.item.emoji} ${entry.item.name} unlocked!`, 'good');
    }
  };

  const pickPalette = (t) => {
    setSelectedId(null);
    setMode('idle');
    setGhost(null);
    setPaletteType((cur) => (cur === t ? null : t));
  };

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <EditorHeader
        def={def}
        quality={quality}
        view={view}
        cash={cash}
        onClose={onClose}
        showWalkable={showWalkable}
        onToggleWalkable={() => setShowWalkable((v) => !v)}
        onAutoArrange={autoArrange}
        topInset={insets.top}
      />
      <IsoScene
        view={view}
        palette={palette}
        furnitureId={equipped.furniture}
        showWalkable={showWalkable}
        ghost={ghostView}
        selected={selectedItem && mode === 'idle' ? selectedItem : null}
        onTapCell={onTapCell}
      />
      <EditorActionBar
        mode={mode}
        selectedItem={selectedItem ? { ...selectedItem, counted: view.counted[selectedItem.id] } : null}
        ghost={ghostView}
        ghostReason={ghostReason}
        paletteType={paletteType}
        onRotate={rotate}
        onMove={() => { setMode('move'); setGhost(null); }}
        onSell={sell}
        onPlace={place}
        onCancel={clear}
        onRotateGhost={() => setGhost((g) => (g ? { ...g, rot: g.rot ? 0 : 1 } : g))}
      />
      <ItemPalette roomType={roomType} selectedType={paletteType} onSelect={pickPalette} onEarlyUnlock={earlyUnlock} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.paper, zIndex: 20, elevation: 20 },
});
