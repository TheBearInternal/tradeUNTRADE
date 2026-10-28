// Main screen: HUD on top, pannable map in the middle, tab bar + sheet panels at the bottom.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameSelector, useGameStore } from './GameProvider.js';
import TopBar from './hud/TopBar.js';
import BubbleStrip from './hud/BubbleStrip.js';
import ToastHost from './hud/ToastHost.js';
import MapViewport from './map/MapViewport.js';
import MapContent from './map/MapContent.js';
import { ToolContextBar, ToolRail } from './map/ToolBar.js';
import { useMapTools } from './map/useMapTools.js';
import TabBar, { TABS } from './panels/TabBar.js';
import Sheet from './components/Sheet.js';
import BuildPanel from './panels/BuildPanel.js';
import StaffPanel from './panels/StaffPanel.js';
import SchoolPanel from './panels/SchoolPanel.js';
import ShopPanel from './panels/ShopPanel.js';
import SettingsPanel from './panels/SettingsPanel.js';
import ModalHost from './modals/ModalHost.js';
import { colors } from './theme.js';

const HIGHLIGHT_MS = 5000;
const selSize = (r) => r.game.size;

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const store = useGameStore();
  const size = useGameSelector(selSize);
  const tools = useMapTools();
  const [tab, setTab] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [focus, setFocus] = useState(null);
  const hiTimer = useRef(null);

  useEffect(() => () => hiTimer.current && clearTimeout(hiTimer.current), []);

  const onBubble = useCallback((roomId) => {
    const room = store.getState().game.rooms[roomId];
    if (!room) return;
    setTab(null);
    setHighlightId(roomId);
    setFocus({ x: room.x + room.w / 2 - 0.5, y: room.y + room.h / 2 - 0.5, key: Date.now() });
    if (hiTimer.current) clearTimeout(hiTimer.current);
    hiTimer.current = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
  }, [store]);

  const onPickRoom = useCallback((def) => {
    setTab(null);
    tools.setTool(def.kind === 'hall' || def.id === 'hall' ? { mode: 'hall' } : { mode: 'build', type: def.id });
  }, [tools]);

  const onTapTile = useCallback((x, y) => {
    if (tab) setTab(null);
    tools.onTapTile(x, y);
  }, [tab, tools]);

  const renderPanel = () => {
    switch (tab) {
      case 'build': return <BuildPanel onPick={onPickRoom} />;
      case 'staff': return <StaffPanel />;
      case 'school': return <SchoolPanel />;
      case 'shop': return <ShopPanel />;
      case 'settings': return <SettingsPanel />;
      default: return null;
    }
  };
  const tabTitle = (TABS.find((t) => t.id === tab) || {}).label;

  return (
    <View style={styles.screen}>
      <TopBar topInset={insets.top} />
      <BubbleStrip onBubble={onBubble} />
      <View style={styles.mapArea}>
        <MapViewport
          size={size}
          onTapTile={onTapTile}
          focus={focus}
          renderContent={(tile) => <MapContent tile={tile} tools={tools} highlightId={highlightId} />}
        />
        <ToolRail tool={tools.tool} onSelect={tools.setTool} />
        <View style={styles.contextBar} pointerEvents="box-none">
          <ToolContextBar tools={tools} />
        </View>
        <ToastHost />
        {tab ? (
          <Sheet title={tabTitle} onClose={() => setTab(null)}>
            {renderPanel()}
          </Sheet>
        ) : null}
      </View>
      <TabBar active={tab} onSelect={setTab} bottomInset={insets.bottom} />
      <ModalHost />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  mapArea: { flex: 1 },
  contextBar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
