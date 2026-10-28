// Main screen: HUD on top, pannable map in the middle, tab bar + sheet panels at the bottom.
// Full-screen overlays: the isometric room editor and the New School / Scenarios screen.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hasInterior } from '../engine/index.js';
import { useGameSelector, useGameStore } from './GameProvider.js';
import TopBar from './hud/TopBar.js';
import BubbleStrip from './hud/BubbleStrip.js';
import ScenarioChip from './hud/ScenarioChip.js';
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
import ScenarioScreen from './panels/ScenarioScreen.js';
import RoomEditor from './editor/RoomEditor.js';
import ModalHost from './modals/ModalHost.js';
import { colors } from './theme.js';

const HIGHLIGHT_MS = 5000;
const selSize = (r) => r.game.size;

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const store = useGameStore();
  const size = useGameSelector(selSize);
  const [editorRoomId, setEditorRoomId] = useState(null);
  const [scenariosOpen, setScenariosOpen] = useState(false);
  const [mapTop, setMapTop] = useState(160);
  const openEditor = useCallback((roomId) => {
    const room = store.getState().game.rooms[roomId];
    if (room && hasInterior(room.type)) setEditorRoomId(roomId);
  }, [store]);
  const closeEditor = useCallback(() => setEditorRoomId(null), []);
  const tools = useMapTools({ onOpenEditor: openEditor });
  const [tab, setTab] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [focus, setFocus] = useState(null);
  const hiTimer = useRef(null);

  useEffect(() => () => hiTimer.current && clearTimeout(hiTimer.current), []);

  const onBubble = useCallback((roomId, bubble) => {
    const room = store.getState().game.rooms[roomId];
    if (!room) return;
    setTab(null);
    if (bubble && bubble.icon === '🪑' && hasInterior(room.type)) {
      setEditorRoomId(roomId);
      return;
    }
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

  const openScenarios = useCallback(() => {
    setTab(null);
    setEditorRoomId(null);
    tools.setTool({ mode: 'inspect' });
    setScenariosOpen(true);
  }, [tools]);

  const renderPanel = () => {
    switch (tab) {
      case 'build': return <BuildPanel onPick={onPickRoom} />;
      case 'staff': return <StaffPanel />;
      case 'school': return <SchoolPanel onOpenScenarios={openScenarios} />;
      case 'shop': return <ShopPanel />;
      case 'settings': return <SettingsPanel onOpenScenarios={openScenarios} />;
      default: return null;
    }
  };
  const tabTitle = (TABS.find((t) => t.id === tab) || {}).label;
  const overlayOpen = !!editorRoomId || scenariosOpen;

  return (
    <View style={styles.screen}>
      <TopBar topInset={insets.top} />
      <ScenarioChip onPress={openScenarios} />
      <BubbleStrip onBubble={onBubble} />
      <View style={styles.mapArea} onLayout={(e) => setMapTop(e.nativeEvent.layout.y)}>
        <MapViewport
          size={size}
          onTapTile={onTapTile}
          focus={focus}
          renderContent={(tile) => <MapContent tile={tile} tools={tools} highlightId={highlightId} />}
        />
        <ToolRail tool={tools.tool} onSelect={tools.setTool} />
        <View style={styles.contextBar} pointerEvents="box-none">
          <ToolContextBar tools={tools} onDesign={openEditor} />
        </View>
        {tab ? (
          <Sheet title={tabTitle} onClose={() => setTab(null)}>
            {renderPanel()}
          </Sheet>
        ) : null}
      </View>
      <TabBar active={tab} onSelect={setTab} bottomInset={insets.bottom} />
      {editorRoomId ? <RoomEditor roomId={editorRoomId} onClose={closeEditor} /> : null}
      {scenariosOpen ? <ScenarioScreen onClose={() => setScenariosOpen(false)} /> : null}
      <ToastHost top={overlayOpen ? insets.top + 64 : mapTop + 8} />
      <ModalHost onOpenScenarios={openScenarios} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  mapArea: { flex: 1 },
  contextBar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
