// Tool modes for map taps: inspect, build <type> (ghost + confirm), hallway paint, bulldoze.
import { useCallback, useRef, useState } from 'react';
import { actions, hasInterior, selectCanBuild } from '../../engine/index.js';
import { useGameStore } from '../GameProvider.js';
import { useToast } from '../state/ToastContext.js';
import { roomDef } from '../catalog.js';
import { clamp, formatMoney } from '../util.js';

export const REASON_TEXT = {
  bounds: "That doesn't fit on the lot.",
  occupied: "Something's already there.",
  cash: 'Not enough cash.',
  locked: "That isn't unlocked yet.",
  banned: "That room isn't allowed in this scenario.",
  edge: 'The Bus Stop must touch the edge of the lot.',
};

/** Cells strictly after `from` up to and including `to` on one row or column. */
function lineCells(from, to) {
  const cells = [];
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  let { x, y } = from;
  while (x !== to.x || y !== to.y) {
    x += dx;
    y += dy;
    cells.push({ x, y });
  }
  return cells;
}

const DOUBLE_TAP_MS = 400;

export function useMapTools({ onOpenEditor } = {}) {
  const store = useGameStore();
  const toast = useToast();
  const [tool, setToolState] = useState({ mode: 'inspect' });
  const [ghost, setGhost] = useState(null); // { x, y } top-left for build mode
  const [selected, setSelected] = useState(null); // { roomId } | { hall: {x,y} }
  const [anchor, setAnchor] = useState(null); // last hallway paint tap
  const anchorRef = useRef(null);
  const lastTap = useRef({ id: null, t: 0 });

  const setAnchorBoth = (a) => {
    anchorRef.current = a;
    setAnchor(a);
  };

  const setTool = useCallback((next) => {
    setToolState(next);
    setGhost(null);
    setSelected(null);
    setAnchorBoth(null);
  }, []);

  const sellAt = useCallback((x, y, cellId) => {
    const before = store.getState();
    const room = before.game.rooms[cellId];
    if (room && roomDef(room.type).kind === 'office') {
      toast.show("The Front Office can't be sold.", 'info');
      return false;
    }
    const after = store.dispatch(actions.sell(x, y));
    if (after === before) return false;
    toast.show(`Sold for ${formatMoney(after.game.cash - before.game.cash)}`, 'info');
    return true;
  }, [store, toast]);

  const paintHall = useCallback((x, y, cell) => {
    if (cell === 'hall') {
      // Toggle: tapping an existing hallway removes it.
      sellAt(x, y, cell);
      setAnchorBoth(null);
      return;
    }
    if (cell) {
      toast.show("Can't paint a hallway over a room.", 'info');
      setAnchorBoth(null);
      return;
    }
    const a = anchorRef.current;
    const before = store.getState();
    let after;
    if (a && (a.x === x || a.y === y) && !(a.x === x && a.y === y)) {
      after = store.dispatch(actions.buildHallLine(lineCells(a, { x, y })));
    } else {
      after = store.dispatch(actions.build('hall', x, y));
    }
    if (after === before) {
      const why = selectCanBuild(before, 'hall', x, y).reason;
      toast.show(REASON_TEXT[why] || "Couldn't build a hallway there.", 'bad');
      return;
    }
    setAnchorBoth({ x, y });
  }, [store, toast, sellAt]);

  const onTapTile = useCallback((x, y) => {
    const { game } = store.getState();
    const cell = game.grid[y * game.size + x];
    switch (tool.mode) {
      case 'build': {
        const def = roomDef(tool.type);
        setGhost({
          x: clamp(x - Math.floor((def.w - 1) / 2), 0, Math.max(0, game.size - def.w)),
          y: clamp(y - Math.floor((def.h - 1) / 2), 0, Math.max(0, game.size - def.h)),
        });
        break;
      }
      case 'hall':
        paintHall(x, y, cell);
        break;
      case 'bulldoze':
        if (cell) sellAt(x, y, cell);
        break;
      default:
        if (cell === 'hall') setSelected({ hall: { x, y } });
        else if (cell) {
          const now = Date.now();
          const room = game.rooms[cell];
          if (lastTap.current.id === cell && now - lastTap.current.t < DOUBLE_TAP_MS && room && hasInterior(room.type) && onOpenEditor) {
            lastTap.current = { id: null, t: 0 };
            onOpenEditor(cell);
            return;
          }
          lastTap.current = { id: cell, t: now };
          setSelected({ roomId: cell });
        } else setSelected(null);
    }
  }, [store, tool, paintHall, sellAt, onOpenEditor]);

  const confirmBuild = useCallback(() => {
    if (tool.mode !== 'build' || !ghost) return;
    const before = store.getState();
    const after = store.dispatch(actions.build(tool.type, ghost.x, ghost.y));
    if (after === before) {
      const why = selectCanBuild(before, tool.type, ghost.x, ghost.y).reason;
      toast.show(REASON_TEXT[why] || "Couldn't build there.", 'bad');
      return;
    }
    toast.show(`${roomDef(tool.type).emoji} ${roomDef(tool.type).name} built!`, 'good');
    setGhost(null);
  }, [store, toast, tool, ghost]);

  const sellSelected = useCallback(() => {
    if (!selected) return;
    const { game } = store.getState();
    if (selected.roomId) {
      const room = game.rooms[selected.roomId];
      if (room && sellAt(room.x, room.y, room.id)) setSelected(null);
    } else if (selected.hall && sellAt(selected.hall.x, selected.hall.y, 'hall')) {
      setSelected(null);
    }
  }, [store, selected, sellAt]);

  return {
    tool,
    setTool,
    ghost,
    clearGhost: () => setGhost(null),
    selected,
    clearSelected: () => setSelected(null),
    anchor,
    liftPen: () => setAnchorBoth(null),
    onTapTile,
    confirmBuild,
    sellSelected,
  };
}
