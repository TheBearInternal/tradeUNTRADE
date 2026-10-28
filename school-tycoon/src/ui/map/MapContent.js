// Everything drawn inside the pannable viewport. Subscribes to the narrow slices it needs.
import React from 'react';
import { selectDerived } from '../../engine/index.js';
import { useControls, useGameSelector } from '../GameProvider.js';
import MapLayer from './MapLayer.js';
import AgentLayer from './AgentLayer.js';
import { BuildGhost, Outline, Pulse } from './MapOverlays.js';

const selGrid = (r) => r.game.grid;
const selRooms = (r) => r.game.rooms;
const selSize = (r) => r.game.size;
const selEquipped = (r) => r.ledger.equipped;
const selConnected = (r) => selectDerived(r).connected;
const selStudents = (r) => r.game.students;

export default function MapContent({ tile, tools, highlightId }) {
  const grid = useGameSelector(selGrid);
  const rooms = useGameSelector(selRooms);
  const size = useGameSelector(selSize);
  const equipped = useGameSelector(selEquipped);
  const connected = useGameSelector(selConnected);
  const students = useGameSelector(selStudents);
  const { speed } = useControls();

  const { tool, ghost, selected, anchor } = tools;
  const selRoom = selected && selected.roomId ? rooms[selected.roomId] : null;
  const hiRoom = highlightId ? rooms[highlightId] : null;

  return (
    <>
      <MapLayer size={size} grid={grid} rooms={rooms} equipped={equipped} connected={connected} tile={tile} />
      <AgentLayer
        grid={grid}
        size={size}
        rooms={rooms}
        students={students}
        equipped={equipped}
        tile={tile}
        active={speed > 0}
      />
      {selRoom ? <Outline x={selRoom.x} y={selRoom.y} w={selRoom.w} h={selRoom.h} tile={tile} /> : null}
      {selected && selected.hall ? <Outline x={selected.hall.x} y={selected.hall.y} tile={tile} /> : null}
      {tool.mode === 'hall' && anchor ? <Outline x={anchor.x} y={anchor.y} tile={tile} color="#3A6EA5" /> : null}
      {hiRoom ? <Pulse x={hiRoom.x} y={hiRoom.y} w={hiRoom.w} h={hiRoom.h} tile={tile} /> : null}
      {tool.mode === 'build' && ghost ? <BuildGhost type={tool.type} x={ghost.x} y={ghost.y} tile={tile} /> : null}
    </>
  );
}
