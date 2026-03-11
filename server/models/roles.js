const ROLES = {
  villager: { name: 'Villageois', camp: 'village', description: 'Aucun pouvoir particulier.', nightAction: false, priority: 99, weight: 0 },
  seer: { name: 'Voyante', camp: 'village', description: 'Révèle le rôle d’un joueur chaque nuit.', nightAction: true, priority: 30, weight: 2 },
  witch: { name: 'Sorcière', camp: 'village', description: 'Peut sauver une victime et/ou empoisonner un joueur.', nightAction: true, priority: 40, weight: 3 },
  hunter: { name: 'Chasseur', camp: 'village', description: 'Peut éliminer un joueur en mourant.', nightAction: false, priority: 98, weight: 2 },
  cupid: { name: 'Cupidon', camp: 'village', description: 'Lie deux amoureux la première nuit.', nightAction: true, priority: 10, weight: 2 },
  thief: { name: 'Voleur', camp: 'village', description: 'Peut échanger son rôle au début de la partie.', nightAction: true, priority: 5, weight: 1 },
  littleGirl: { name: 'Petite Fille', camp: 'village', description: 'Observe discrètement les loups.', nightAction: false, priority: 97, weight: 1 },
  werewolf: { name: 'Loup-Garou', camp: 'wolves', description: 'Choisit une victime chaque nuit avec les autres loups.', nightAction: true, priority: 20, weight: -3 }
};

module.exports = { ROLES };
