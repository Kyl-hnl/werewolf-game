const express = require('express');
const { ROLES, autoRoleComposition, getBalanceScore } = require('../game-engine');

function createGameRouter(stateRef) {
  const router = express.Router();

  router.get('/roles', (_req, res) => res.json(ROLES));

  router.get('/state', (_req, res) => {
    res.json(stateRef.getPublicState());
  });

  router.get('/suggested-composition/:count', (req, res) => {
    const count = Number(req.params.count || 0);
    const composition = autoRoleComposition(count);
    res.json({ composition, balance: getBalanceScore(composition) });
  });

  return router;
}

module.exports = { createGameRouter };
