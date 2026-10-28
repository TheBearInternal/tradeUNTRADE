// Static map layer: lot, grid lines, hallways, rooms. Memoized; never re-renders on ticks.
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { roomDef, shortName } from '../catalog.js';
import { shallowEqual } from '../util.js';
import { mapTheme, shade } from './mapColors.js';

const UNCONNECTED = '#BDBDBD';

function GridLines({ size, tile, color }) {
  const px = size * tile;
  const lines = [];
  for (let i = 1; i < size; i += 1) {
    lines.push(<View key={`v${i}`} style={[styles.line, { left: i * tile, top: 0, width: 1, height: px, backgroundColor: color }]} />);
    lines.push(<View key={`h${i}`} style={[styles.line, { top: i * tile, left: 0, height: 1, width: px, backgroundColor: color }]} />);
  }
  return lines;
}

function RoomBlock({ room, index, tile, theme, connected }) {
  const def = roomDef(room.type);
  const w = (room.w || def.w) * tile;
  const h = (room.h || def.h) * tile;
  const isDecor = def.kind === 'decor';
  const isOffice = def.kind === 'office';
  const inert = !isDecor && !isOffice && connected === false;
  let fill = theme.roomColor(def.color, index);
  if (isOffice && theme.officeColor) fill = theme.officeColor;
  if (inert) fill = UNCONNECTED;
  const showName = !isDecor && tile >= 24;
  const emojiSize = Math.max(12, Math.min(tile * (isDecor ? 0.7 : 0.75), 30));

  return (
    <View
      style={[
        styles.room,
        {
          left: room.x * tile,
          top: room.y * tile,
          width: w,
          height: h,
          backgroundColor: isDecor ? 'transparent' : fill,
          borderColor: isDecor ? 'transparent' : inert ? '#8A8A8A' : theme.border,
          borderWidth: isDecor ? 0 : Math.max(1.5, tile / 14),
          opacity: inert ? 0.8 : 1,
        },
      ]}
    >
      <Text style={{ fontSize: emojiSize }}>{def.emoji}</Text>
      {showName ? (
        <Text numberOfLines={1} style={[styles.name, { fontSize: Math.max(10, tile * 0.3), color: shade(fill, -0.65) }]}>
          {shortName(def)}
        </Text>
      ) : null}
      {inert ? <Text style={[styles.warn, { fontSize: Math.max(11, tile * 0.4) }]}>⚠️</Text> : null}
    </View>
  );
}

function MapLayerImpl({ size, grid, rooms, equipped, connected, tile }) {
  const theme = useMemo(() => mapTheme(equipped), [equipped]);
  const halls = useMemo(() => {
    const out = [];
    for (let i = 0; i < grid.length; i += 1) if (grid[i] === 'hall') out.push(i);
    return out;
  }, [grid]);
  const roomList = useMemo(() => Object.values(rooms || {}), [rooms]);
  const px = size * tile;

  return (
    <View style={{ width: px, height: px, backgroundColor: theme.lot }}>
      {halls.map((i) => (
        <View
          key={i}
          style={[styles.hall, {
            left: (i % size) * tile, top: Math.floor(i / size) * tile, width: tile, height: tile, backgroundColor: theme.hall,
          }]}
        />
      ))}
      <GridLines size={size} tile={tile} color={theme.gridLine} />
      {roomList.map((room, index) => (
        <RoomBlock
          key={room.id}
          room={room}
          index={index}
          tile={tile}
          theme={theme}
          connected={connected ? connected[room.id] : true}
        />
      ))}
    </View>
  );
}

function propsEqual(a, b) {
  return a.size === b.size && a.grid === b.grid && a.rooms === b.rooms && a.tile === b.tile
    && shallowEqual(a.equipped, b.equipped) && shallowEqual(a.connected, b.connected);
}

/** Re-renders only when grid / rooms / size / equipped / connectivity / zoom change. */
const MapLayer = React.memo(MapLayerImpl, propsEqual);
export default MapLayer;

const styles = StyleSheet.create({
  line: { position: 'absolute' },
  hall: { position: 'absolute' },
  room: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    overflow: 'hidden',
  },
  name: { fontWeight: '700', marginTop: -2, paddingHorizontal: 2 },
  warn: { position: 'absolute', top: 1, right: 2 },
});
