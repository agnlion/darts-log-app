export const ROUNDS = 8;
export const DARTS_PER_ROUND = 3;

export function createGame() {
  return { throws: [] };
}

export function addThrow(game, score, hit = `S${score}`, position = null) {
  if (game.throws.length >= ROUNDS * DARTS_PER_ROUND) return game;
  return { ...game, throws: [...game.throws, { score, hit, position }] };
}

export function undoThrow(game) {
  return { ...game, throws: game.throws.slice(0, -1) };
}

export function gameView(game) {
  const rounds = Array.from({ length: ROUNDS }, (_, index) => {
    const throws = game.throws.slice(index * DARTS_PER_ROUND, (index + 1) * DARTS_PER_ROUND);
    return { number: index + 1, throws, subtotal: throws.reduce((sum, dart) => sum + dart.score, 0) };
  });
  return {
    rounds,
    total: game.throws.reduce((sum, dart) => sum + dart.score, 0),
    currentRound: Math.min(Math.floor(game.throws.length / DARTS_PER_ROUND) + 1, ROUNDS),
    currentDart: (game.throws.length % DARTS_PER_ROUND) + 1,
    isComplete: game.throws.length === ROUNDS * DARTS_PER_ROUND,
  };
}
