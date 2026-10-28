// Dynamic overlays drawn above the static map layer: build ghost, selection, highlight, paint anchor.
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { selectCanBuild } from '../../engine/index.js';
import { useGameSelector } from '../GameProvider.js';
import { roomDef } from '../catalog.js';

/** Translucent footprint, green when buildable, red otherwise. */
export function BuildGhost({ type, x, y, tile }) {
  const ok = useGameSelector((root) => !!selectCanBuild(root, type, x, y).ok);
  const def = roomDef(type);
  return (
    <View
      style={[
        styles.box,
        {
          left: x * tile,
          top: y * tile,
          width: def.w * tile,
          height: def.h * tile,
          backgroundColor: ok ? 'rgba(46,158,91,0.40)' : 'rgba(214,69,69,0.40)',
          borderColor: ok ? '#1E7A44' : '#A32E2E',
          borderStyle: 'dashed',
        },
      ]}
    />
  );
}

/** Solid outline around a room or tile. */
export function Outline({ x, y, w = 1, h = 1, tile, color = '#FFC72C' }) {
  return (
    <View
      style={[styles.box, {
        left: x * tile - 2, top: y * tile - 2, width: w * tile + 4, height: h * tile + 4, borderColor: color,
      }]}
    />
  );
}

/** Pulsing outline used when a thought bubble points at a room. */
export function Pulse({ x, y, w, h, tile }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return (
    <Animated.View
      style={[styles.box, {
        left: x * tile - 4,
        top: y * tile - 4,
        width: w * tile + 8,
        height: h * tile + 8,
        borderColor: '#D64545',
        borderWidth: 4,
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
      }]}
    />
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', borderWidth: 3, borderRadius: 5 },
});
