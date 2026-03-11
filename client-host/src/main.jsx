import React from 'react';
import { createRoot } from 'react-dom/client';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import './styles.css';

const socket = io('http://localhost:3001');
const ROLES = ['werewolf', 'seer', 'witch', 'hunter', 'cupid', 'thief', 'littleGirl', 'villager'];
const randomName = () => `Joueur-${Math.floor(Math.random() * 999)}`;

function App() {
  const [isHost, setIsHost] = React.useState(window.location.pathname !== '/player');
  const [name, setName] = React.useState('');
  const [playerId, setPlayerId] = React.useState(null);
  const [privateData, setPrivateData] = React.useState(null);
  const [state, setState] = React.useState({ players: [], phase: 'lobby', day: 0, roomCode: '-----', history: { votes: [], cemetery: [] }, votes: {}, settings: { discussionDuration: 120, voteDuration: 60 } });
  const [selectedRoles, setSelectedRoles] = React.useState([]);
  const [composition, setComposition] = React.useState({ composition: [], balance: 0 });

  React.useEffect(() => {
    socket.on('connect', () => { if (isHost) socket.emit('host:join'); });
    socket.on('game:state', setState);
    socket.on('player:joined', ({ playerId: id }) => setPlayerId(id));
    socket.on('player:private', setPrivateData);
    socket.on('host:composition', setComposition);
    return () => {
      socket.off('game:state');
      socket.off('player:joined');
      socket.off('player:private');
      socket.off('host:composition');
    };
  }, [isHost]);

  const localIpUrl = `${window.location.origin}/player`;

  if (!isHost) {
    const me = state.players.find((p) => p.id === playerId);
    return (
      <div className="player-ui">
        {!playerId ? (
          <div className="card">
            <h2>Rejoindre la partie</h2>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" />
            <button onClick={() => socket.emit('player:join', { name: name || randomName() })}>Connexion</button>
          </div>
        ) : (
          <div className="card">
            <h2>{me?.name}</h2>
            <p>Statut: <b>{me?.alive ? 'Vivant' : 'Mort'}</b></p>
            <p>Phase: {state.phase}</p>
            <p>Rôle: <b>{privateData?.role || '...'}</b></p>
            {state.phase === 'night' && <NightActions me={me} players={state.players} role={privateData?.role} />}
            {state.phase === 'day' && <DayVote me={me} players={state.players} />}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="host-ui">
      <header>
        <h1>🐺 Loup-Garou Numérique</h1>
        <button onClick={() => setIsHost(false)}>Mode téléphone</button>
      </header>

      <section className="grid">
        <div className="card">
          <h2>Lobby & Connexion</h2>
          <p>Code salon: <b>{state.roomCode}</b></p>
          <QRCodeSVG value={localIpUrl} size={130} />
          <p>{localIpUrl}</p>
          <p>Joueurs connectés: {state.players.length}</p>
          <ul>{state.players.map((p) => <li key={p.id}>{p.name} {p.alive ? '🟢' : '⚫'}</li>)}</ul>
        </div>

        <div className="card">
          <h2>Paramètres partie</h2>
          <label>Discussion (s) <input type="number" value={state.settings.discussionDuration} onChange={(e) => socket.emit('host:updateSettings', { discussionDuration: Number(e.target.value) })} /></label>
          <label>Vote (s) <input type="number" value={state.settings.voteDuration} onChange={(e) => socket.emit('host:updateSettings', { voteDuration: Number(e.target.value) })} /></label>
          <button onClick={() => socket.emit('host:previewComposition', { playerCount: state.players.length || 8 })}>Auto-composition</button>
          <div className="roles">{ROLES.map((r) => <button key={r} onClick={() => setSelectedRoles((prev) => [...prev, r])}>{r}</button>)}</div>
          <p>Composition: {composition.composition.join(', ')}</p>
          <BalanceBar score={composition.balance} />
          <button className="primary" onClick={() => socket.emit('host:startGame', { selectedRoles })}>PLAY</button>
        </div>

        <div className="card">
          <h2>Cycle du jeu</h2>
          <p>Jour: {state.day}</p>
          <p>Phase: <b>{state.phase}</b></p>
          <button onClick={() => socket.emit('host:resolveNight')}>Résoudre Nuit</button>
          <button onClick={() => socket.emit('host:resolveVote')}>Résoudre Vote</button>
          <button onClick={() => socket.emit('host:save')}>Sauvegarder</button>
          <button onClick={() => socket.emit('host:load')}>Reprendre</button>
          <h3>Votes en temps réel</h3>
          <VoteBars votes={state.votes} players={state.players} />
          <h3>Cimetière</h3>
          <ul>{state.history.cemetery.map((c, i) => <li key={i}>{c.playerId} ({c.role})</li>)}</ul>
        </div>
      </section>
    </div>
  );
}

function NightActions({ me, players, role }) {
  if (!me?.alive) return <p>Vous êtes mort.</p>;
  const aliveOthers = players.filter((p) => p.id !== me.id && p.alive);
  if (role === 'werewolf') return <SelectAction title="Victime" options={aliveOthers} onPick={(targetId) => socket.emit('night:action', { action: { type: 'wolfKill', targetId } })} />;
  if (role === 'seer') return <SelectAction title="Révéler" options={aliveOthers} onPick={(targetId) => socket.emit('night:action', { action: { type: 'seerReveal', targetId } })} />;
  if (role === 'witch') return <div><SelectAction title="Sauver" options={players} onPick={(targetId) => socket.emit('night:action', { action: { type: 'witchSave', targetId } })} /><SelectAction title="Empoisonner" options={aliveOthers} onPick={(targetId) => socket.emit('night:action', { action: { type: 'witchPoison', targetId } })} /></div>;
  if (role === 'cupid') return <SelectAction title="Amoureux" options={aliveOthers} onPick={(targetId) => socket.emit('night:action', { action: { type: 'cupidLove', targetId } })} />;
  return <p>Aucune action nocturne.</p>;
}

function DayVote({ me, players }) {
  if (!me?.alive) return null;
  return <SelectAction title="Vote public" options={players.filter((p) => p.id !== me.id && p.alive)} onPick={(targetId) => socket.emit('day:vote', { targetId })} />;
}

function SelectAction({ title, options, onPick }) {
  return <div><h4>{title}</h4>{options.map((p) => <button key={p.id} onClick={() => onPick(p.id)}>{p.name}</button>)}</div>;
}

function VoteBars({ votes, players }) {
  const tally = {};
  Object.values(votes).forEach((v) => { tally[v] = (tally[v] || 0) + 1; });
  return <div>{players.filter((p) => p.alive).map((p) => <div key={p.id}>{p.name}<div className="bar" style={{ width: `${(tally[p.id] || 0) * 25}px` }} /></div>)}</div>;
}

function BalanceBar({ score }) {
  const pos = Math.max(0, Math.min(100, 50 + score * 10));
  return <div><p>[ Loups favorisés ] ---- [ Équilibré ] ---- [ Village favorisé ]</p><div className="balance"><span style={{ left: `${pos}%` }} /></div></div>;
}

createRoot(document.getElementById('root')).render(<App />);
