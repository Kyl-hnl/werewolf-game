const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { GameState } = require('./models/gameState');
const { createGameRouter } = require('./routes/gameRoutes');
const { attachGameSocket } = require('./sockets/gameSocket');

const app = express();
app.use(cors());
app.use(express.json());

const state = new GameState();
const stateRef = {
  getPublicState: () => ({
    ...state,
    players: state.players.map((p) => ({ id: p.id, name: p.name, alive: p.alive, mayor: p.mayor, lover: p.lover }))
  })
};

app.use('/api/game', createGameRouter(stateRef));
app.get('/health', (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
attachGameSocket(io, state);

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on ${PORT}`);
});
