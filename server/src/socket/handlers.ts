// ===== STATIC ORBIT — Socket Event Handlers =====

import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types.js';
import { RoomManager } from '../game/RoomManager.js';
import { GameEngine } from '../game/GameEngine.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const roomManager = new RoomManager();
let gameEngine: GameEngine;

export function initHandlers(io: TypedServer): void {
  gameEngine = new GameEngine(io);
  gameEngine.setRoomLookup((code) => roomManager.getRoom(code));

  io.on('connection', (socket: TypedSocket) => {
    console.log(`[CONNECT] ${socket.id}`);

    socket.on('room:create', ({ playerName, gameMode }) => {
      try {
        const room = roomManager.createRoom(socket.id, playerName, gameMode ?? 'story');
        socket.join(room.code);

        socket.emit('room:created', {
          roomCode: room.code,
          playerId: socket.id,
          gameMode: room.gameMode,
        });

        io.to(room.code).emit('room:updated', {
          players: room.players,
          phase: room.phase,
          gameMode: room.gameMode,
        });

        console.log(`[ROOM:CREATE] ${playerName} created room ${room.code} (${room.gameMode})`);
      } catch (err) {
        socket.emit('room:error', { message: (err as Error).message });
      }
    });

    socket.on('room:join', ({ roomCode, playerName }) => {
      try {
        const room = roomManager.joinRoom(roomCode, socket.id, playerName);
        socket.join(room.code);

        socket.emit('room:joined', {
          playerId: socket.id,
          players: room.players,
          gameMode: room.gameMode,
        });

        io.to(room.code).emit('room:updated', {
          players: room.players,
          phase: room.phase,
          gameMode: room.gameMode,
        });

        console.log(`[ROOM:JOIN] ${playerName} joined room ${roomCode}`);
      } catch (err) {
        socket.emit('room:error', { message: (err as Error).message });
      }
    });

    socket.on('room:selectRole', ({ role }) => {
      const roomCode = roomManager.findRoomByPlayer(socket.id);
      if (!roomCode) return;
      try {
        const room = roomManager.selectRole(roomCode, socket.id, role);
        io.to(roomCode).emit('room:updated', { players: room.players, phase: room.phase, gameMode: room.gameMode });
      } catch (err: any) {
        socket.emit('room:error', { message: err.message });
      }
    });

    socket.on('room:ready', ({ playerId }) => {
      try {
        const roomCode = roomManager.findRoomByPlayer(playerId);
        if (!roomCode) {
          socket.emit('room:error', { message: 'Not in a room.' });
          return;
        }

        const room = roomManager.setReady(roomCode, playerId);

        io.to(roomCode).emit('room:updated', {
          players: room.players,
          phase: room.phase,
          gameMode: room.gameMode,
        });
      } catch (err) {
        socket.emit('room:error', { message: (err as Error).message });
      }
    });

    socket.on('room:start', ({ roomCode }) => {
      try {
        const room = roomManager.getRoom(roomCode);
        if (!room) {
          socket.emit('room:error', { message: 'Room not found.' });
          return;
        }

        // Only the host can start the game
        const host = room.players.find(p => p.isHost);
        if (!host || host.id !== socket.id) {
          socket.emit('room:error', { message: 'Only the host can start the game.' });
          return;
        }

        // Need at least 2 players
        if (room.players.length < 2) {
          socket.emit('room:error', { message: 'Need at least 2 players to start.' });
          return;
        }

        // All non-host players must be ready
        const allReady = room.players
          .filter(p => !p.isHost)
          .every(p => p.ready);

        if (!allReady) {
          socket.emit('room:error', { message: 'All players must be ready.' });
          return;
        }

        gameEngine.startGame(room);

        io.to(roomCode).emit('room:updated', {
          players: room.players,
          phase: room.phase,
          gameMode: room.gameMode,
        });

        console.log(`[GAME:START] Room ${roomCode}`);
      } catch (err) {
        socket.emit('room:error', { message: (err as Error).message });
      }
    });

    socket.on('game:ready', ({ roomCode }) => {
      try {
        gameEngine.playerReady(roomCode, socket.id);
      } catch (err) {
        socket.emit('room:error', { message: (err as Error).message });
      }
    });

    socket.on('game:action', (action) => {
      try {
        const roomCode = roomManager.findRoomByPlayer(socket.id);
        if (!roomCode) {
          socket.emit('room:error', { message: 'Not in a room.' });
          return;
        }

        gameEngine.handleAction(roomCode, action);
      } catch (err) {
        socket.emit('room:error', { message: (err as Error).message });
      }
    });

    socket.on('game:chat', ({ message }) => {
      const roomCode = roomManager.findRoomByPlayer(socket.id);
      if (!roomCode) return;

      const room = roomManager.getRoom(roomCode);
      if (!room) return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      io.to(roomCode).emit('game:chat', {
        playerName: player.name,
        message,
      });
    });

    socket.on('game:requestHint', ({ roomCode }) => {
      try {
        gameEngine.handleRequestHint(roomCode, socket.id);
      } catch (err) {
        socket.emit('room:error', { message: (err as Error).message });
      }
    });

    socket.on('game:defendAttack', ({ roomCode, defenseCode }) => {
      try {
        gameEngine.handleDefendAttack(roomCode, socket.id, defenseCode);
      } catch (err) {
        socket.emit('room:error', { message: (err as Error).message });
      }
    });

    socket.on('game:scan', ({ roomCode }) => {
      try {
        gameEngine.handleScan(roomCode, socket.id);
      } catch (err) {
        socket.emit('room:error', { message: (err as Error).message });
      }
    });

    socket.on('game:chapterDone', ({ roomCode }) => {
      try {
        gameEngine.handleChapterDone(roomCode, socket.id);
      } catch (err) {
        socket.emit('room:error', { message: (err as Error).message });
      }
    });

    socket.on('disconnect', () => {
      const roomCode = roomManager.findRoomByPlayer(socket.id);
      if (roomCode) {
        roomManager.removePlayer(roomCode, socket.id);

        const room = roomManager.getRoom(roomCode);
        if (room) {
          io.to(roomCode).emit('room:updated', {
            players: room.players,
            phase: room.phase,
            gameMode: room.gameMode,
          });
        } else {
          // Room was destroyed (last player left)
          gameEngine.destroySession(roomCode);
        }
      }

      console.log(`[DISCONNECT] ${socket.id}`);
    });
  });
}
