const fs = require('fs');
const path = require('path');
const { ROLES } = require('../models/roles');

const NIGHT_ORDER = ['thief', 'cupid', 'werewolf', 'seer', 'witch'];
const SAVE_FILE = path.join(__dirname, '../../data/savegame.json');

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function autoRoleComposition(playerCount) {
  const wolves = Math.max(1, Math.floor(playerCount / 4));
  const specials = ['seer', 'witch', 'hunter', 'cupid', 'thief', 'littleGirl'].slice(0, Math.max(2, Math.floor(playerCount / 2) - 1));
  const villagers = Math.max(0, playerCount - wolves - specials.length);
  return [...Array(wolves).fill('werewolf'), ...specials, ...Array(villagers).fill('villager')].slice(0, playerCount);
}

function assignRoles(state, selectedRoles = []) {
  const pool = selectedRoles.length ? selectedRoles : autoRoleComposition(state.players.length);
  const shuffled = shuffle(pool);
  state.players.forEach((p, idx) => {
    p.role = shuffled[idx] || 'villager';
  });
}

function getAlivePlayers(state) {
  return state.players.filter((p) => p.alive);
}

function aliveByRole(state, role) {
  return getAlivePlayers(state).filter((p) => p.role === role);
}

function startGame(state, selectedRoles = []) {
  state.day = 1;
  state.phase = 'night';
  assignRoles(state, selectedRoles);
  state.nightActions = {};
  state.votes = {};
  return state;
}

function recordNightAction(state, actorId, action) {
  state.nightActions[actorId] = action;
}

function resolveNight(state) {
  const deaths = new Set();
  const actions = Object.values(state.nightActions);

  const wolfVotes = actions.filter((a) => a.type === 'wolfKill' && a.targetId);
  if (wolfVotes.length) {
    const tally = wolfVotes.reduce((acc, vote) => {
      acc[vote.targetId] = (acc[vote.targetId] || 0) + 1;
      return acc;
    }, {});
    const victim = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (victim) deaths.add(victim);
  }

  actions.filter((a) => a.type === 'witchSave').forEach((a) => deaths.delete(a.targetId));
  actions.filter((a) => a.type === 'witchPoison').forEach((a) => a.targetId && deaths.add(a.targetId));

  deaths.forEach((id) => {
    const p = state.players.find((player) => player.id === id);
    if (p && p.alive) {
      p.alive = false;
      state.history.cemetery.push({ day: state.day, playerId: p.id, role: p.role });
      if (p.lover) {
        const lover = state.players.find((lp) => lp.id === p.lover && lp.alive);
        if (lover) {
          lover.alive = false;
          state.history.cemetery.push({ day: state.day, playerId: lover.id, role: lover.role, reason: 'lover' });
        }
      }
    }
  });

  state.phase = 'day';
  state.nightActions = {};
  return [...deaths];
}

function recordVote(state, voterId, targetId) {
  const voter = state.players.find((p) => p.id === voterId && p.alive);
  if (!voter) return;
  state.votes[voterId] = targetId;
}

function resolveVote(state) {
  const tally = {};
  Object.values(state.votes).forEach((targetId) => {
    if (!targetId) return;
    tally[targetId] = (tally[targetId] || 0) + 1;
  });

  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const [eliminatedId, votes] = sorted[0] || [];
  const eliminated = state.players.find((p) => p.id === eliminatedId && p.alive);
  if (eliminated) {
    eliminated.alive = false;
    state.history.cemetery.push({ day: state.day, playerId: eliminated.id, role: eliminated.role, reason: 'vote', votes });
  }
  state.history.votes.push({ day: state.day, tally, eliminatedId: eliminatedId || null });
  state.votes = {};
  state.day += 1;
  state.phase = 'night';
  return { tally, eliminatedId: eliminatedId || null };
}

function checkVictory(state) {
  const alive = getAlivePlayers(state);
  const wolves = alive.filter((p) => ROLES[p.role]?.camp === 'wolves').length;
  const villagers = alive.length - wolves;
  if (wolves === 0) return { winner: 'village' };
  if (wolves >= villagers) return { winner: 'wolves' };
  return null;
}

function getBalanceScore(roleIds) {
  return roleIds.reduce((acc, id) => acc + (ROLES[id]?.weight ?? 0), 0);
}

function saveGame(state) {
  fs.writeFileSync(SAVE_FILE, JSON.stringify(state, null, 2));
}

function loadGame() {
  if (!fs.existsSync(SAVE_FILE)) return null;
  return JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
}

module.exports = {
  NIGHT_ORDER,
  ROLES,
  autoRoleComposition,
  startGame,
  recordNightAction,
  resolveNight,
  recordVote,
  resolveVote,
  checkVictory,
  getBalanceScore,
  saveGame,
  loadGame,
  aliveByRole
};
