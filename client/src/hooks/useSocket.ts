import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@shared/types';
import { useGameStore } from '../stores/gameStore';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (window.location.hostname === 'localhost' ? 'http://localhost:3001' : '/');

export function getSocket(): TypedSocket {
  if (!socket) {
    socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function useSocket() {
  const initialized = useRef(false);
  const store = useGameStore;

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const s = getSocket();

    s.on('room:created', ({ roomCode, playerId }) => {
      store.getState().setPlayerId(playerId);
      store.getState().setRoomCode(roomCode);
      store.getState().setScreen('lobby');
    });

    s.on('room:joined', ({ playerId, players }) => {
      store.getState().setPlayerId(playerId);
      store.getState().setPlayers(players);
      store.getState().setScreen('lobby');
    });

    s.on('room:updated', ({ players }) => {
      store.getState().setPlayers(players);
    });

    s.on('room:error', ({ message }) => {
      console.error('[ROOM ERROR]', message);
      alert(message);
    });

    s.on('game:briefing', (data) => {
      store.getState().setBriefing(data);
    });

    s.on('game:start', (data) => {
      store.getState().startPuzzle(data);
    });

    s.on('game:timeUpdate', ({ remaining }) => {
      store.getState().setTimeRemaining(remaining);
    });

    s.on('game:actionResult', (result) => {
      store.getState().setActionResult(result);
    });

    s.on('game:solved', (data) => {
      store.getState().setSolved(data);
    });

    s.on('game:failed', ({ reason }) => {
      store.getState().setFailed(reason);
    });

    s.on('game:stageResult', (data) => {
      store.getState().setStageResult(data);
    });

    s.on('game:phaseChange', (data) => {
      store.getState().setPhaseChange(data);
    });

    s.on('game:finished', (result) => {
      store.getState().setGameFinished(result);
    });

    s.on('game:chat', ({ playerName, message }) => {
      store.getState().addChatMessage({ playerName, message, timestamp: Date.now() });
    });

    return () => {
      // Don't disconnect on unmount — we want persistent connection
    };
  }, [store]);
}
