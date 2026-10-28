// Static isometric drawing of one room interior: floor, walls, door, walkable tint, item boxes.
// Emoji are RN Text views laid over the Svg (never SVG text).
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path, Polygon } from 'react-native-svg';
import { ITEMS, depthSort, footprintPolygon } from '../../engine/index.js';
import {
  boxFaces, cellPolygon, cellsPath, gridPath, itemColors, itemHeightUnits, itemLabelPoint, pts, wallPolygons,
} from './isoDraw.js';

function ItemBoxImpl({ it, L, furnitureId }) {
  const def = ITEMS[it.itemType] || {};
  const f = boxFaces(it.cx, it.cy, it.w, it.h, itemHeightUnits(def) * L.th, L);
  const c = itemColors(def, furnitureId);
  return (
    <G>
      <Polygon points={pts(f.left)} fill={c.left} stroke={c.stroke} strokeWidth={0.6} />
      <Polygon points={pts(f.right)} fill={c.right} stroke={c.stroke} strokeWidth={0.6} />
      <Polygon points={pts(f.top)} fill={c.top} stroke={c.stroke} strokeWidth={0.6} />
    </G>
  );
}

const sameItem = (a, b) => a.it.id === b.it.id && a.it.cx === b.it.cx && a.it.cy === b.it.cy
  && a.it.w === b.it.w && a.it.h === b.it.h && a.it.itemType === b.it.itemType
  && a.L === b.L && a.furnitureId === b.furnitureId;

/** One extruded item; re-renders only when its own placement, the zoom or the skin changes. */
export const ItemBox = React.memo(ItemBoxImpl, sameItem);

function EmojiLabels({ items, counted, L }) {
  const size = Math.max(11, Math.min(L.tw * 0.55, 30));
  return items.map((it) => {
    const def = ITEMS[it.itemType] || {};
    const p = itemLabelPoint(it.cx, it.cy, it.w, it.h, itemHeightUnits(def) * L.th, L);
    const warn = counted[it.id] === false;
    return (
      <View key={it.id} style={[styles.label, { left: p.x - size, top: p.y - size * 0.75, width: size * 2 }]}>
        <Text style={{ fontSize: size, textAlign: 'center' }}>{def.emoji}</Text>
        {warn ? <Text style={[styles.warn, { fontSize: size * 0.6 }]}>⚠️</Text> : null}
      </View>
    );
  });
}

function IsoRoomSvgImpl({ view, L, palette, furnitureId, showWalkable }) {
  const { cols, rows, door } = view;
  const floor = useMemo(() => {
    const odd = [];
    for (let i = 0; i < cols * rows; i += 1) if (((i % cols) + Math.floor(i / cols)) % 2) odd.push(i);
    return {
      base: pts(footprintPolygon(0, 0, cols, rows, L.tw, L.th, L.ox, L.oy)),
      checker: cellsPath(odd, cols, L),
      grid: gridPath(cols, rows, L),
      walls: wallPolygons(cols, rows, L),
      door: pts(cellPolygon(door.cx, door.cy, L)),
    };
  }, [cols, rows, door.cx, door.cy, L]);

  const blocked = useMemo(() => {
    if (!showWalkable) return '';
    const cells = [];
    for (let i = 0; i < cols * rows; i += 1) {
      if (!view.occupancy[i] && !view.reachable[i]) cells.push(i);
    }
    return cellsPath(cells, cols, L);
  }, [showWalkable, view.occupancy, view.reachable, cols, rows, L]);

  const sorted = useMemo(() => depthSort(view.items), [view.items]);
  const doorPt = itemLabelPoint(door.cx, door.cy, 1, 1, 0, L);

  return (
    <View style={{ width: L.width, height: L.height }}>
      <Svg width={L.width} height={L.height}>
        <Polygon points={pts(floor.walls.left)} fill={palette.wallLeft} stroke={palette.wallTop} strokeWidth={1} />
        <Polygon points={pts(floor.walls.right)} fill={palette.wallRight} stroke={palette.wallTop} strokeWidth={1} />
        <Polygon points={floor.base} fill={palette.floorA} />
        <Path d={floor.checker} fill={palette.floorB} />
        <Path d={floor.grid} stroke={palette.grid} strokeWidth={1} fill="none" />
        {blocked ? <Path d={blocked} fill="rgba(214,69,69,0.22)" /> : null}
        <Polygon points={floor.door} fill={palette.door} opacity={0.85} />
        {sorted.map((it) => <ItemBox key={it.id} it={it} L={L} furnitureId={furnitureId} />)}
      </Svg>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Text style={[styles.door, { left: doorPt.x - 12, top: doorPt.y - 10, fontSize: Math.max(12, L.tw * 0.45) }]}>🚪</Text>
        <EmojiLabels items={sorted} counted={view.counted} L={L} />
      </View>
    </View>
  );
}

/** Re-renders only when the interior view, zoom, palette, skin or walkable toggle changes. */
const IsoRoomSvg = React.memo(IsoRoomSvgImpl);
export default IsoRoomSvg;

const styles = StyleSheet.create({
  label: { position: 'absolute', alignItems: 'center' },
  warn: { position: 'absolute', right: 0, top: -4 },
  door: { position: 'absolute' },
});
