// Pannable map viewport. PanResponder drives an Animated.ValueXY; a move under 8px is a tap.
// Zoom is a button choice (0.5 / 0.75 / 1.0) of a 36dp base tile.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, HIT_SLOP } from '../theme.js';
import { clamp } from '../util.js';

export const BASE_TILE = 36;
export const ZOOMS = [0.5, 0.75, 1.0];
const TAP_SLOP = 8;

/**
 * @param {{ size: number, onTapTile: (x:number, y:number) => void,
 *   focus?: { x:number, y:number, key:any } | null, renderContent: (tile:number) => React.ReactNode }} props
 */
export default function MapViewport({ size, onTapTile, focus, renderContent }) {
  const [zoom, setZoom] = useState(1);
  const tile = BASE_TILE * zoom;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const offset = useRef({ x: 0, y: 0 });
  const view = useRef({ w: 0, h: 0 });
  const grant = useRef({ x: 0, y: 0 });
  const live = useRef({ tile, size, onTapTile });
  live.current = { tile, size, onTapTile };

  const clampOffset = useCallback((o, t = live.current.tile, s = live.current.size) => {
    const px = s * t;
    const { w, h } = view.current;
    return {
      x: clamp(o.x, -px + w * 0.33, w * 0.67),
      y: clamp(o.y, -px + h * 0.33, h * 0.67),
    };
  }, []);

  const setOffset = useCallback((o) => {
    offset.current = clampOffset(o);
    pan.setValue(offset.current);
  }, [clampOffset, pan]);

  /** Center the lot; if it is taller than the view, show the bottom (where the office is). */
  const recenter = useCallback(() => {
    const { w, h } = view.current;
    const px = live.current.size * live.current.tile;
    setOffset({ x: (w - px) / 2, y: px > h ? h - px - 8 : (h - px) / 2 });
  }, [setOffset]);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (evt) => {
      grant.current = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
    },
    onPanResponderMove: (_, g) => {
      pan.setValue({ x: offset.current.x + g.dx, y: offset.current.y + g.dy });
    },
    onPanResponderRelease: (_, g) => {
      if (Math.hypot(g.dx, g.dy) < TAP_SLOP) {
        pan.setValue(offset.current);
        const { tile: t, size: s, onTapTile: tap } = live.current;
        const tx = Math.floor((grant.current.x - offset.current.x) / t);
        const ty = Math.floor((grant.current.y - offset.current.y) / t);
        if (tx >= 0 && ty >= 0 && tx < s && ty < s && tap) tap(tx, ty);
        return;
      }
      setOffset({ x: offset.current.x + g.dx, y: offset.current.y + g.dy });
    },
    onPanResponderTerminate: () => pan.setValue(offset.current),
  }), [pan, setOffset]);

  const onLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    const first = view.current.w === 0;
    view.current = { w: width, h: height };
    if (first) recenter();
    else setOffset(offset.current);
  };

  // Lot grew (tier-up) or reset: recenter.
  useEffect(() => {
    if (view.current.w) recenter();
  }, [size, recenter]);

  // Pan so the focused tile sits in the middle of the view.
  useEffect(() => {
    if (!focus || !view.current.w) return;
    const t = live.current.tile;
    setOffset({ x: view.current.w / 2 - (focus.x + 0.5) * t, y: view.current.h / 2 - (focus.y + 0.5) * t });
  }, [focus, setOffset]);

  const changeZoom = (z) => {
    if (z === zoom) return;
    const { w, h } = view.current;
    const ratio = z / zoom;
    const o = offset.current;
    // Keep the view center fixed while zooming.
    const next = { x: w / 2 - (w / 2 - o.x) * ratio, y: h / 2 - (h / 2 - o.y) * ratio };
    offset.current = clampOffset(next, BASE_TILE * z, size);
    pan.setValue(offset.current);
    setZoom(z);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.touch} onLayout={onLayout} {...responder.panHandlers}>
        <Animated.View pointerEvents="none" style={[styles.content, { transform: pan.getTranslateTransform() }]}>
          {renderContent(tile)}
        </Animated.View>
      </View>
      <View style={styles.zoomCol} pointerEvents="box-none">
        {ZOOMS.slice().reverse().map((z) => (
          <Pressable
            key={z}
            onPress={() => changeZoom(z)}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`Zoom ${Math.round(z * 100)} percent`}
            style={[styles.zoomBtn, z === zoom && styles.zoomActive]}
          >
            <Text style={styles.zoomText}>{z === 1 ? '1×' : z === 0.75 ? '¾×' : '½×'}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden', backgroundColor: '#9CC58A' },
  touch: { ...StyleSheet.absoluteFillObject },
  content: { position: 'absolute', left: 0, top: 0 },
  zoomCol: { position: 'absolute', right: 8, top: 8 },
  zoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 6,
    backgroundColor: 'rgba(255,251,240,0.92)',
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomActive: { backgroundColor: colors.bus, borderColor: colors.busDark },
  zoomText: { fontSize: font.body, fontWeight: '800', color: colors.ink },
});
