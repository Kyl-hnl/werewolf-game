# Werewolf Game (Loup-Garou numérique)

Jeu multijoueur local avec écran hôte (TV/PC) et téléphones joueurs.

## Stack
- Backend: Node.js + Express + Socket.IO
- Frontend: React + Vite (hôte + mode mobile `/player`)
- Stockage: JSON local (`data/savegame.json`)

## Démarrage
```bash
npm install
npm run dev
```

- Interface hôte: http://localhost:3000
- Interface mobile: http://localhost:3000/player
- API/socket backend: http://localhost:3001

## Fonctionnalités V1
- Lobby avec QR code et code salon
- Attribution automatique ou personnalisée des rôles
- Cycle jour/nuit
- Actions nocturnes de base (loups, voyante, sorcière, cupidon)
- Vote de jour en temps réel
- Cimetière + historique des votes
- Sauvegarde / reprise de partie
- Vérification des conditions de victoire
