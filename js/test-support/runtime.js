// Browser boundary fixture; assertions exercise the real game module.
// Installs the shared headless browser environment, boots js/game.js, and
// starts a player on a map. See ./browser-env.js for the mocked surface.
import { installBrowserEnv } from './browser-env.js';

export async function createRuntime({ classId = 'reborn_blade', mapId = 'town_awakening', ...envOptions } = {}) {
  const env = installBrowserEnv(envOptions);
  await import('../game.js');
  const A = window.__AWO;
  A.G.player = A.makePlayer(classId, 'Regression');
  A.G.running = true;
  A.loadMap(mapId);
  return { A, ...env };
}
