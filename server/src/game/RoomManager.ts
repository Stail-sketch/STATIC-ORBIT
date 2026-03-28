// ===== STATIC ORBIT — Room Manager =====

import type { GameMode, Player, Role, Room } from '../../../shared/types.js';

const ROLE_ASSIGNMENT_ORDER: Role[] = ['observer', 'operator', 'navigator', 'hacker'];

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(hostId: string, hostName: string, gameMode: GameMode = 'story'): Room {
    let code = generateRoomCode();
    // Avoid collision (extremely unlikely but safe)
    while (this.rooms.has(code)) {
      code = generateRoomCode();
    }

    const host: Player = {
      id: hostId,
      name: hostName,
      role: ROLE_ASSIGNMENT_ORDER[0],
      ready: false,
      isHost: true,
    };

    const room: Room = {
      code,
      players: [host],
      phase: 'lobby',
      stagePhase: 'infiltration',
      currentStage: 0,
      totalStages: 0,
      scores: [],
      gameMode,
    };

    this.rooms.set(code, room);
    return room;
  }

  joinRoom(code: string, playerId: string, playerName: string): Room {
    const room = this.rooms.get(code);
    if (!room) {
      throw new Error('Room not found.');
    }
    if (room.phase !== 'lobby') {
      throw new Error('Game already in progress.');
    }
    if (room.players.length >= 4) {
      throw new Error('Room is full.');
    }
    if (room.players.some(p => p.id === playerId)) {
      throw new Error('Already in this room.');
    }

    const roleIndex = room.players.length;
    const role = ROLE_ASSIGNMENT_ORDER[roleIndex];

    const player: Player = {
      id: playerId,
      name: playerName,
      role,
      ready: false,
      isHost: false,
    };

    room.players.push(player);
    return room;
  }

  setReady(code: string, playerId: string): Room {
    const room = this.rooms.get(code);
    if (!room) {
      throw new Error('Room not found.');
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not in room.');
    }

    player.ready = !player.ready;
    return room;
  }

  selectRole(code: string, playerId: string, role: Role): Room {
    const room = this.rooms.get(code);
    if (!room) throw new Error('ルームが見つかりません。');

    const player = room.players.find(p => p.id === playerId);
    if (!player) throw new Error('プレイヤーがルームにいません。');

    // Check if role is available (not taken by another player)
    const roleTaken = room.players.some(p => p.id !== playerId && p.role === role);
    if (roleTaken) throw new Error('その役職は既に選択されています。');

    // Check if role is valid for this player count
    const maxRoles: Role[] = room.players.length <= 2
      ? ['observer', 'operator']
      : room.players.length === 3
        ? ['observer', 'operator', 'navigator']
        : ['observer', 'operator', 'navigator', 'hacker'];

    if (!maxRoles.includes(role)) throw new Error('この人数ではその役職は選択できません。');

    player.role = role;
    return room;
  }

  removePlayer(code: string, playerId: string): void {
    const room = this.rooms.get(code);
    if (!room) return;

    room.players = room.players.filter(p => p.id !== playerId);

    if (room.players.length === 0) {
      this.rooms.delete(code);
      return;
    }

    // If the host left, assign a new host
    if (!room.players.some(p => p.isHost)) {
      room.players[0].isHost = true;
    }

    // Re-assign roles based on new order
    room.players.forEach((p, i) => {
      p.role = ROLE_ASSIGNMENT_ORDER[i];
    });
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  /** Find the room code a player is in */
  findRoomByPlayer(playerId: string): string | undefined {
    for (const [code, room] of this.rooms) {
      if (room.players.some(p => p.id === playerId)) {
        return code;
      }
    }
    return undefined;
  }
}
