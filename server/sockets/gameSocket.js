const { v4: uuid } = require('uuid');
const { Player } = require('../models/player');
const {
  NIGHT_ORDER,
  startGame,
  recordNightAction,
  resolveNight,
  recordVote,
  resolveVote,
  checkVictory,
  saveGame,
  loadGame,
  getBalanceScore,
  autoRoleComposition
} = require('../game-engine');

function attachGameSocket(io, state) {
  const broadcast = () => {
    io.emit('game:state', {
      phase: state.phase,
      day: state.day,
      roomCode: state.roomCode,
      players: state.players.map((p) => ({
        id: p.id,
        name: p.name,
        alive: p.alive,
        mayor: p.mayor,
        lover: p.lover,
        role: state.phase === 'ended' ? p.role : undefined
      })),
      history: state.history,
      votes: state.votes,
      settings: state.settings
    });
  };

  const emitPrivateRole = (player) => {
    if (!player?.socketId) return;
    io.to(player.socketId).emit('player:private', { role: player.role, playerId: player.id });
  };

  io.on('connection', (socket) => {
    socket.on('host:join', () => {
      state.hostSocketId = socket.id;
      socket.emit('host:ready', { roomCode: state.roomCode });
      broadcast();
    });

    socket.on('player:join', ({ name }) => {
      const player = new Player({ id: uuid(), name: name?.trim() || `Joueur-${state.players.length + 1}`, socketId: socket.id });
      state.players.push(player);
      socket.data.playerId = player.id;
      socket.emit('player:joined', { playerId: player.id, roomCode: state.roomCode });
      broadcast();
    });

    socket.on('host:updateSettings', (settings) => {
      state.settings = { ...state.settings, ...settings };
      broadcast();
    });

    socket.on('host:startGame', ({ selectedRoles }) => {
      startGame(state, selectedRoles);
      state.players.forEach(emitPrivateRole);
      io.emit('phase:night', { order: NIGHT_ORDER, day: state.day });
      broadcast();
    });

    socket.on('night:action', ({ action }) => {
      const actorId = socket.data.playerId;
      if (!actorId || state.phase !== 'night') return;
      recordNightAction(state, actorId, action);
      socket.emit('night:ack', { ok: true });
    });

    socket.on('host:resolveNight', () => {
      const deaths = resolveNight(state);
      io.emit('night:resolved', { deaths });
      const victory = checkVictory(state);
      if (victory) {
        state.phase = 'ended';
        io.emit('game:ended', victory);
      }
      broadcast();
    });

    socket.on('day:vote', ({ targetId }) => {
      const voterId = socket.data.playerId;
      if (!voterId || state.phase !== 'day') return;
      recordVote(state, voterId, targetId);
      io.emit('vote:update', state.votes);
      broadcast();
    });

    socket.on('host:resolveVote', () => {
      const result = resolveVote(state);
      io.emit('vote:resolved', result);
      const victory = checkVictory(state);
      if (victory) {
        state.phase = 'ended';
        io.emit('game:ended', victory);
      }
      broadcast();
    });

    socket.on('host:save', () => {
      saveGame(state);
      socket.emit('host:saved');
    });

    socket.on('host:load', () => {
      const loaded = loadGame();
      if (!loaded) return socket.emit('host:error', 'Aucune sauvegarde trouvée');
      Object.assign(state, loaded);
      broadcast();
    });

    socket.on('host:previewComposition', ({ playerCount }) => {
      const composition = autoRoleComposition(playerCount);
      socket.emit('host:composition', { composition, balance: getBalanceScore(composition) });
    });

    socket.on('disconnect', () => {
      const idx = state.players.findIndex((p) => p.socketId === socket.id);
      if (idx >= 0 && state.phase === 'lobby') state.players.splice(idx, 1);
      broadcast();
    });
  });

  return { broadcast };
}

module.exports = { attachGameSocket };
