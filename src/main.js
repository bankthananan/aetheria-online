// Game Main Entry Point
// Imports the styling system, database, state manager, canvas game loop engine, and UI components.

import '../style.css';
import { GameState } from './state.js';
import { GameEngine } from './engine.js';
import { GameUI } from './ui.js';

window.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize core state
  const state = new GameState();

  let engine = null;
  let ui = null;

  // 2. Initialize UI panel controller
  ui = new GameUI(
    state,
    () => engine,
    (biomeId) => {
      if (engine) {
        engine.changeBiome(biomeId);
        ui.updateHUD();
      }
    }
  );

  // 3. Setup canvas game loop engine
  const canvas = document.getElementById('game-canvas');
  if (canvas) {
    engine = new GameEngine(
      canvas,
      state,
      (text, type) => {
        if (ui) ui.addLogMessage(text, type);
      },
      () => {
        if (ui) {
          ui.updateHUD();
          ui.renderQuestsPanel();
        }
      }
    );

    // Global reference for debug / developer tools access
    window.gameEngine = engine;

    // Wire NPC dialogue callback
    engine.onNPCInteract = (npcName, biomeId) => {
      if (ui) ui.showNPCDialog(npcName, biomeId);
    };
  }

  // Hook dynamic engine updates back into the UI HUD refresh rate (1s)
  setInterval(() => {
    if (ui) {
      ui.updateHUD();
    }
  }, 1000);
});
