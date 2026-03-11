class GameState {
  constructor() {
    this.phase = 'lobby';
    this.day = 0;
    this.players = [];
    this.votes = {};
    this.nightActions = {};
    this.history = { votes: [], cemetery: [] };
    this.settings = {
      discussionDuration: 120,
      voteDuration: 60,
      enableMayor: true,
      revealDeadRoles: true
    };
    this.hostSocketId = null;
    this.roomCode = Math.random().toString(36).slice(2, 7).toUpperCase();
    this.musicVolume = 0.5;
    this.sfxVolume = 0.8;
  }
}

module.exports = { GameState };
