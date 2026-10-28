// Decorative student walkers that stroll along hallways, plus the equipped mascot.
// Purely cosmetic: never reads or writes simulation state.
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { mapTheme } from './mapColors.js';

const MAX_WALKERS = 20;
const STUDENTS_PER_WALKER = 6;
const MS_PER_TILE = 520;
const FACES = ['🧒', '👧', '🧑'];
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function isHall(grid, size, x, y) {
  return x >= 0 && y >= 0 && x < size && y < size && grid[y * size + x] === 'hall';
}

/** Walk straight along the hallway in a random open direction for 1..6 tiles. */
function nextStop(grid, size, from, halls) {
  const open = DIRS.filter(([dx, dy]) => isHall(grid, size, from.x + dx, from.y + dy));
  if (!open.length) {
    const i = halls[Math.floor(Math.random() * halls.length)];
    return { x: i % size, y: Math.floor(i / size), jump: true };
  }
  const [dx, dy] = open[Math.floor(Math.random() * open.length)];
  const steps = 1 + Math.floor(Math.random() * 6);
  let { x, y } = from;
  for (let s = 0; s < steps && isHall(grid, size, x + dx, y + dy); s += 1) {
    x += dx;
    y += dy;
  }
  return { x, y, jump: false };
}

function Walker({ grid, size, halls, tile, face, uniform, active }) {
  const start = useMemo(() => {
    const i = halls[Math.floor(Math.random() * halls.length)];
    return { x: i % size, y: Math.floor(i / size) };
    // Only pick a start once per walker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pos = useRef(new Animated.ValueXY(start)).current;
  const cur = useRef(start);

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    if (!isHall(grid, size, cur.current.x, cur.current.y)) {
      const i = halls[Math.floor(Math.random() * halls.length)];
      cur.current = { x: i % size, y: Math.floor(i / size) };
      pos.setValue(cur.current);
    }
    const step = () => {
      if (cancelled) return;
      const to = nextStop(grid, size, cur.current, halls);
      if (to.jump) {
        cur.current = { x: to.x, y: to.y };
        pos.setValue(cur.current);
      }
      const dist = Math.abs(to.x - cur.current.x) + Math.abs(to.y - cur.current.y);
      Animated.timing(pos, {
        toValue: { x: to.x, y: to.y },
        duration: Math.max(300, dist * MS_PER_TILE),
        delay: Math.random() < 0.3 ? 400 + Math.random() * 1200 : 0,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || cancelled) return;
        cur.current = { x: to.x, y: to.y };
        step();
      });
    };
    step();
    return () => {
      cancelled = true;
      pos.stopAnimation((v) => {
        cur.current = { x: Math.round(v.x), y: Math.round(v.y) };
      });
    };
  }, [active, grid, size, halls, pos]);

  const transform = [
    { translateX: Animated.multiply(pos.x, tile) },
    { translateY: Animated.multiply(pos.y, tile) },
  ];
  const fontSize = Math.max(10, tile * 0.55);
  return (
    <Animated.View style={[styles.walker, { width: tile, height: tile, transform }]}>
      {uniform ? <View style={[styles.uniform, { width: tile * 0.5, height: tile * 0.22, backgroundColor: uniform }]} /> : null}
      <Text style={{ fontSize }}>{face}</Text>
    </Animated.View>
  );
}

function AgentLayerImpl({ grid, size, rooms, students, equipped, tile, active }) {
  const theme = useMemo(() => mapTheme(equipped), [equipped]);
  const halls = useMemo(() => {
    const out = [];
    for (let i = 0; i < grid.length; i += 1) if (grid[i] === 'hall') out.push(i);
    return out;
  }, [grid]);
  const count = halls.length ? Math.min(MAX_WALKERS, Math.ceil((students || 0) / STUDENTS_PER_WALKER)) : 0;
  const office = useMemo(() => Object.values(rooms || {}).find((r) => r.type === 'office'), [rooms]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }).map((_, i) => (
        <Walker
          key={i}
          grid={grid}
          size={size}
          halls={halls}
          tile={tile}
          face={FACES[i % FACES.length]}
          uniform={theme.uniform}
          active={active}
        />
      ))}
      {office && theme.mascotEmoji ? (
        <View
          style={[styles.mascot, {
            left: Math.min(size - 1, office.x + office.w) * tile,
            top: (office.y + office.h - 1) * tile,
            width: tile,
            height: tile,
          }]}
        >
          <Text style={{ fontSize: Math.max(14, tile * 0.8) }}>{theme.mascotEmoji}</Text>
        </View>
      ) : null}
    </View>
  );
}

const AgentLayer = React.memo(AgentLayerImpl);
export default AgentLayer;

const styles = StyleSheet.create({
  walker: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
  uniform: { position: 'absolute', bottom: '12%', borderRadius: 4, opacity: 0.85 },
  mascot: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
