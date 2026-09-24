const STORAGE_KEY = 'darts-log-history-v1';

export function loadGames() {
  try {
    const records = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

export function saveGame(game) {
  const record = { id: crypto.randomUUID(), playedAt: new Date().toISOString(), throws: game.throws };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...loadGames()]));
  return record;
}

export function deleteGame(id) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loadGames().filter(game => game.id !== id)));
}
