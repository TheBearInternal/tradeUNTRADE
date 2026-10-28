// Pannable / zoomable iso scene. A move under 8px is a tap, converted to a cell with unproject().
// The ghost and selection outlines live in small separate Svgs so the room drawing never re-renders for them.
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { footprintPolygon, unproject } from '../../engine/index.js';
import IsoRoomSvg from './IsoRoomSvg.js';
import { fitTileWidth, pts, sceneLayout } from './isoDraw.js';
import { clamp } from '../util.js';
import { colors, font, HIT_SLOP } from '../theme.js';

const ZOOMS = [1, 1.5, 2.2];
const TAP_SLOP = 8;

/** Footprint outline in its own tiny Svg, positioned over the scene. */
function FootprintOverlay({ cx, cy, w, h, L, fill, stroke, dashed }) {
  const poly = footprintPolygon(cx, cy, w, h, L.tw, L.th, L.ox, L.oy);
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const left = Math.min(...xs) - 3;
  const top = Math.min(...ys) - 3;
  const local = poly.map((p) => ({ x: p.x - left, y: p.y - top }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left, top }}>
      <Svg width={Math.max(...xs) - left + 3} height={Math.max(...ys) - top + 3}>
        <Polygon
          points={pts(local)}
          fill={fill}
          stroke={stroke}
          strokeWidth={2.5}
          strokeDasharray={dashed ? '6,4' : undefined}
        />
      </Svg>
    </View>
  );
}

/**
 * @param {{ view, palette, furnitureId, showWalkable, ghost?: {cx,cy,w,h,ok}, selected?: {cx,cy,w,h},
 *   onTapCell: (cx:number, cy:number) => void }} props
 */
export default function IsoScene({ view, palette, furnitureId, showWalkable, ghost, selected, onTapCell }) {
  const [box, setBox] = useState(null);
  const [zoom, setZoom] = useState(1);
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const offset = useRef({ x: 0, y: 0 });
  const grant = useRef({ x: 0, y: 0 });

  const fit = box ? fitTileWidth(view.cols, view.rows, box.w, box.h) : 0;
  const L = useMemo(() => (fit ? sceneLayout(view.cols, view.rows, fit * zoom) : null), [view.cols, view.rows, fit, zoom]);
  const live = useRef({});
  live.current = { L, box, onTapCell, view };

  const clampOffset = useCallback((o, lay = live.current.L) => {
    const b = live.current.box;
    if (!b || !lay) return o;
    return {
      x: clamp(o.x, Math.min(0, b.w - lay.width) - b.w * 0.25, Math.max(0, b.w - lay.width) + b.w * 0.25),
      y: clamp(o.y, Math.min(0, b.h - lay.height) - b.h * 0.25, Math.max(0, b.h - lay.height) + b.h * 0.25),
    };
  }, []);
  const setOffset = useCallback((o, lay) => {
    offset.current = clampOffset(o, lay);
    pan.setValue(offset.current);
  }, [clampOffset, pan]);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (evt) => {
      grant.current = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
    },
    onPanResponderMove: (_, g) => pan.setValue({ x: offset.current.x + g.dx, y: offset.current.y + g.dy }),
    onPanResponderRelease: (_, g) => {
      if (Math.hypot(g.dx, g.dy) >= TAP_SLOP) {
        setOffset({ x: offset.current.x + g.dx, y: offset.current.y + g.dy });
        return;
      }
      pan.setValue(offset.current);
      const { L: lay, onTapCell: tap, view: v } = live.current;
      if (!lay) return;
      const c = unproject(grant.current.x - offset.current.x, grant.current.y - offset.current.y, lay.tw, lay.th, lay.ox, lay.oy);
      if (c.cx >= 0 && c.cy >= 0 && c.cx < v.cols && c.cy < v.rows) tap(c.cx, c.cy);
    },
    onPanResponderTerminate: () => pan.setValue(offset.current),
  }), [pan, setOffset]);

  const onLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    const first = !live.current.box;
    live.current.box = { w: width, h: height };
    setBox({ w: width, h: height });
    if (first) {
      const lay = sceneLayout(view.cols, view.rows, fitTileWidth(view.cols, view.rows, width, height));
      setOffset({ x: (width - lay.width) / 2, y: (height - lay.height) / 2 }, lay);
    }
  };

  const changeZoom = (z) => {
    if (!box || z === zoom) return;
    const next = sceneLayout(view.cols, view.rows, fit * z);
    const ratio = next.width / L.width;
    const o = offset.current;
    setOffset({ x: box.w / 2 - (box.w / 2 - o.x) * ratio, y: box.h / 2 - (box.h / 2 - o.y) * ratio }, next);
    setZoom(z);
  };

  return (
    <View style={styles.wrap}>
      <View style={StyleSheet.absoluteFill} onLayout={onLayout} {...responder.panHandlers}>
        {L ? (
          <Animated.View pointerEvents="none" style={[styles.content, { transform: pan.getTranslateTransform() }]}>
            <IsoRoomSvg view={view} L={L} palette={palette} furnitureId={furnitureId} showWalkable={showWalkable} />
            {selected ? (
              <FootprintOverlay {...selected} L={L} fill="rgba(255,199,44,0.25)" stroke={colors.bus} />
            ) : null}
            {ghost ? (
              <FootprintOverlay
                {...ghost}
                L={L}
                dashed
                fill={ghost.ok ? 'rgba(46,158,91,0.45)' : 'rgba(214,69,69,0.45)'}
                stroke={ghost.ok ? '#1E7A44' : '#A32E2E'}
              />
            ) : null}
          </Animated.View>
        ) : null}
      </View>
      <View style={styles.zoomCol} pointerEvents="box-none">
        {ZOOMS.map((z) => (
          <Pressable
            key={z}
            onPress={() => changeZoom(z)}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`Room zoom ${z}x`}
            style={[styles.zoomBtn, z === zoom && styles.zoomActive]}
          >
            <Text style={styles.zoomText}>{z === 1 ? 'Fit' : `${z}×`}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden', backgroundColor: '#DCE9E2' },
  content: { position: 'absolute', left: 0, top: 0 },
  zoomCol: { position: 'absolute', right: 8, top: 8 },
  zoomBtn: {
    width: 48,
    height: 40,
    borderRadius: 20,
    marginBottom: 6,
    backgroundColor: 'rgba(255,251,240,0.95)',
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomActive: { backgroundColor: colors.bus, borderColor: colors.busDark },
  zoomText: { fontSize: font.small, fontWeight: '800', color: colors.ink },
});
