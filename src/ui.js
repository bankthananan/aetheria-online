// Game UI Controller
// Handles UI windows, modals, character creation, HUD overlays, hotkeys, status distribution, and the Admin Panel.

import { CLASSES, ITEMS, QUESTS, SKILL_TREE, BIOMES, MONSTERS } from './database.js';
import { audioSystem } from './audio.js';
import { getBaseExpRequired, getJobExpRequired, getStatCost } from './state.js';

export class GameUI {
  constructor(state, engineGetter, onWarpCallback) {
    this.state = state;
    this.getEngine = engineGetter; // functional getter since engine might be initialized after UI
    this.onWarp = onWarpCallback;

    // Cache DOM references
    this.createCharacterScreen = document.getElementById('char-create-screen');
    this.gameScreen = document.getElementById('game-screen');
    this.chatLog = document.getElementById('chat-log-feed');
    this.hotkeysBar = document.getElementById('hotkeys-grid');

    // Navigation Panels
    this.panels = {
      status: document.getElementById('panel-status'),
      skills: document.getElementById('panel-skills'),
      inventory: document.getElementById('panel-inventory'),
      quests: document.getElementById('panel-quests'),
      party: document.getElementById('panel-party'),
      admin: document.getElementById('panel-admin')
    };

    // Hotkey bindings: array of items mapped to F1-F8
    this.hotkeyMaps = [
      { type: 'skill', id: 'first_aid', key: 'F1', label: 'First Aid' },
      { type: 'item', id: 'red_potion', key: 'F2', label: 'Red Potion' },
      { type: 'item', id: 'blue_potion', key: 'F3', label: 'Blue Potion' },
      { type: 'skill', id: 'bash', key: 'F4', label: 'Bash' },
      { type: 'skill', id: 'heal', key: 'F5', label: 'Heal' },
      { type: 'skill', id: 'double_strafe', key: 'F6', label: 'Dbl Strafe' },
      { type: 'skill', id: 'sonic_blow', key: 'F7', label: 'Sonic Blow' },
      { type: 'item', id: 'wing_fly', key: 'F8', label: 'Fly Wing' }
    ];

    // Initialize UI structures
    this.initEventListeners();
    this.initKeyboardHotkeys();
    this.initAdminControls();
    
    // Check if character already exists to bypass creation screen
    if (this.state.load()) {
      this.showGameScreen();
    } else {
      this.showCharacterCreation();
    }
  }

  showCharacterCreation() {
    this.createCharacterScreen.classList.remove('hidden');
    this.gameScreen.classList.add('hidden');
    this.renderCharacterCreationPreview();
  }

  showGameScreen() {
    this.createCharacterScreen.classList.add('hidden');
    this.gameScreen.classList.remove('hidden');
    
    // Trigger initial updates
    this.updateHUD();
    this.updateHotkeysUI();
    this.renderStatusPanel();
    this.renderSkillsPanel();
    this.renderInventoryPanel();
    this.renderQuestsPanel();
    this.renderPartyPanel();

    this.addLogMessage('Welcome to Isekai Guild Adventure Online! Click on the map to move and target monsters.', 'system');
  }

  initEventListeners() {
    // Character creation customizer triggers
    const inputs = ['char-name', 'char-gender', 'char-hair', 'char-hair-color', 'char-cloth-color'];
    inputs.forEach(id => {
      document.getElementById(id).addEventListener('change', () => this.renderCharacterCreationPreview());
      document.getElementById(id).addEventListener('input', () => this.renderCharacterCreationPreview());
    });

    document.getElementById('btn-create-char').addEventListener('click', () => {
      const name = document.getElementById('char-name').value.trim() || 'Isekai Rookie';
      const gender = document.getElementById('char-gender').value;
      const hair = parseInt(document.getElementById('char-hair').value);
      const hairColor = document.getElementById('char-hair-color').value;
      const clothColor = document.getElementById('char-cloth-color').value;

      this.state.character.name = name;
      this.state.character.gender = gender;
      this.state.character.appearance = { hair, hairColor, clothColor, headgear: null };
      
      this.state.recalculateStats();
      this.state.playerHp = this.state.maxHp;
      this.state.playerSp = this.state.maxSp;
      this.state.save();

      this.showGameScreen();
      
      // Force engine warp to prontera
      if (this.onWarp) this.onWarp('prontera');
    });

    // Sidebar panel toggle tabs
    const tabs = document.querySelectorAll('.nav-tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetPanel = e.target.dataset.panel;
        
        // Toggle tab active style
        tabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');

        // Toggle panel views
        Object.entries(this.panels).forEach(([name, el]) => {
          if (name === targetPanel) {
            el.classList.remove('hidden');
          } else {
            el.classList.add('hidden');
          }
        });

        // Re-render requested panel
        if (targetPanel === 'status') this.renderStatusPanel();
        if (targetPanel === 'skills') this.renderSkillsPanel();
        if (targetPanel === 'inventory') this.renderInventoryPanel();
        if (targetPanel === 'quests') this.renderQuestsPanel();
        if (targetPanel === 'party') this.renderPartyPanel();
      });
    });

    // Admin Toggle button
    document.getElementById('admin-toggle-btn').addEventListener('click', () => {
      const adminPanel = this.panels.admin;
      adminPanel.classList.toggle('hidden');
      
      // Update toggle button highlight
      document.getElementById('admin-toggle-btn').classList.toggle('active');
    });

    // Audio control listeners
    const soundToggle = document.getElementById('hud-sound-toggle');
    const musicToggle = document.getElementById('hud-music-toggle');
    if (soundToggle) {
      soundToggle.addEventListener('change', (e) => {
        audioSystem.toggleSound(e.target.checked);
      });
    }
    if (musicToggle) {
      musicToggle.addEventListener('change', (e) => {
        audioSystem.toggleMusic(e.target.checked);
      });
    }
  }

  initKeyboardHotkeys() {
    window.addEventListener('keydown', (e) => {
      // Ignore if user is writing in inputs
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') {
        return;
      }

      // Check F1-F8 keys
      if (e.key.match(/^F[1-8]$/)) {
        e.preventDefault();
        const index = parseInt(e.key.substring(1)) - 1;
        this.triggerHotkey(index);
      }
    });
  }

  // Draw local avatar preview inside SVG creation container
  renderCharacterCreationPreview() {
    const gender = document.getElementById('char-gender').value;
    const hair = parseInt(document.getElementById('char-hair').value);
    const hairColor = document.getElementById('char-hair-color').value;
    const clothColor = document.getElementById('char-cloth-color').value;

    const preview = document.getElementById('char-preview-svg');
    
    // Simple dynamic SVG character generator
    preview.innerHTML = `
      <rect width="160" height="160" fill="rgba(30, 41, 59, 0.4)" rx="10" />
      <!-- Shadow -->
      <ellipse cx="80" cy="130" rx="35" ry="10" fill="rgba(0,0,0,0.3)" />
      <!-- Body Outfit -->
      <circle cx="80" cy="100" r="30" fill="${clothColor}" />
      <!-- Head -->
      <circle cx="80" cy="65" r="22" fill="#ffedd5" />
      <!-- Eyes -->
      <circle cx="73" cy="63" r="2.5" fill="#000" />
      <circle cx="87" cy="63" r="2.5" fill="#000" />
      <!-- Hair rendering -->
      ${gender === 'female' 
        ? (hair === 1 
          ? `<path d="M 52 65 Q 80 32 108 65" fill="${hairColor}" />
             <rect x="44" y="65" width="8" height="25" fill="${hairColor}" rx="2" />
             <rect x="108" y="65" width="8" height="25" fill="${hairColor}" rx="2" />` 
          : `<path d="M 55 60 Q 80 30 105 60" fill="${hairColor}" />
             <rect x="54" y="58" width="52" height="15" fill="${hairColor}" rx="4" />`) 
        : `<polygon points="56,65 62,35 72,48 80,32 88,48 98,35 104,65" fill="${hairColor}" />`
      }
    `;
  }

  updateHUD() {
    const c = this.state.character;
    const cls = CLASSES[c.classId];
    
    document.getElementById('hud-player-name').innerText = c.name;
    document.getElementById('hud-class-title').innerText = `${cls.name} (${c.guildRank}-Rank)`;
    document.getElementById('hud-base-lvl').innerText = c.baseLevel;
    document.getElementById('hud-job-lvl').innerText = c.jobLevel;
    document.getElementById('hud-zenny').innerText = c.zenny.toLocaleString();

    // HP Bar values
    const hpPct = Math.max(0, this.state.playerHp / this.maxHpVal() * 100);
    document.getElementById('hud-hp-fill').style.width = `${hpPct}%`;
    document.getElementById('hud-hp-text').innerText = `${this.state.playerHp} / ${this.maxHpVal()}`;

    // SP Bar values
    const spPct = Math.max(0, this.state.playerSp / this.maxSpVal() * 100);
    document.getElementById('hud-sp-fill').style.width = `${spPct}%`;
    document.getElementById('hud-sp-text').innerText = `${this.state.playerSp} / ${this.maxSpVal()}`;

    // Base Exp Bar
    const baseExpReq = getBaseExpRequired(c.baseLevel);
    const expPct = Math.min(100, (c.baseExp / baseExpReq) * 100);
    document.getElementById('hud-exp-fill').style.width = `${expPct}%`;
    document.getElementById('hud-exp-text').innerText = `Base EXP: ${expPct.toFixed(1)}%`;

    // Job Exp Bar
    const jobExpReq = getJobExpRequired(c.jobLevel, c.classId);
    const jexpPct = jobExpReq === Infinity ? 100 : Math.min(100, (c.jobExp / jobExpReq) * 100);
    document.getElementById('hud-jexp-fill').style.width = `${jexpPct}%`;
    document.getElementById('hud-jexp-text').innerText = `Job EXP: ${jobExpReq === Infinity ? 'MAX' : jexpPct.toFixed(1) + '%'}`;

    // Render active buff items in HUD
    const buffContainer = document.getElementById('hud-active-buffs');
    buffContainer.innerHTML = '';
    const engine = this.getEngine();
    if (engine && engine.player) {
      for (const [buffId, data] of Object.entries(engine.player.buffs)) {
        const timeRemaining = Math.max(0, Math.ceil((data.expiry - Date.now()) / 1000));
        const badge = document.createElement('span');
        badge.className = `px-2 py-0.5 text-xs font-semibold rounded bg-slate-800 border text-yellow-400 ${buffId === 'blessing' ? 'border-yellow-500' : 'border-blue-500 text-blue-300'}`;
        badge.innerText = `${buffId.toUpperCase()} (${timeRemaining}s)`;
        buffContainer.appendChild(badge);
      }
    }
  }

  // Hotkey activations
  triggerHotkey(index) {
    const bind = this.hotkeyMaps[index];
    if (!bind) return;

    if (bind.type === 'skill') {
      const engine = this.getEngine();
      if (engine) {
        // Map the skill index in active skills list
        const c = this.state.character;
        const activeSkills = (SKILL_TREE[c.classId] || []).filter(s => s.type === 'active');
        const skillIdx = activeSkills.findIndex(s => s.id === bind.id);
        if (skillIdx !== -1) {
          engine.castSkill(skillIdx);
        } else {
          // Fallback check: check if first aid or play dead is available in novice tree
          const noviceActiveIdx = SKILL_TREE.novice.filter(s => s.type === 'active').findIndex(s => s.id === bind.id);
          if (noviceActiveIdx !== -1 && c.classId !== 'novice') {
            // Give novices access to first aid / play dead
            engine.castSkill(noviceActiveIdx);
          } else {
            this.addLogMessage(`System: Skill ${bind.label} is not available for this class.`, 'error');
          }
        }
      }
    } else if (bind.type === 'item') {
      const used = this.state.useItem(bind.id);
      if (used) {
        this.addLogMessage(`Use: Restored stats using ${ITEMS[bind.id].name}.`, 'spell-log');
        this.updateHUD();
        this.renderInventoryPanel();
      } else {
        this.addLogMessage(`System: Cannot use ${ITEMS[bind.id].name}. None in inventory or full stats.`, 'error');
      }
    }
  }

  updateHotkeysUI() {
    this.hotkeysBar.innerHTML = '';
    const c = this.state.character;

    this.hotkeyMaps.forEach((map, index) => {
      const btn = document.createElement('button');
      btn.className = 'hotkey-btn relative p-1 bg-slate-800/80 border border-slate-700 rounded hover:border-slate-500 transition flex flex-col items-center justify-between h-14';
      
      const count = c.inventory[map.id] || 0;
      const isSkill = map.type === 'skill';
      
      // Label text
      btn.innerHTML = `
        <span class="absolute top-0.5 left-1 text-[9px] font-bold text-slate-400">${map.key}</span>
        <span class="text-xs font-semibold mt-3.5 text-center text-slate-100 overflow-hidden text-ellipsis whitespace-nowrap w-full">${map.label}</span>
        <span class="text-[10px] font-bold text-amber-500">${isSkill ? 'SP' : 'x' + count}</span>
      `;
      
      btn.addEventListener('click', () => this.triggerHotkey(index));
      this.hotkeysBar.appendChild(btn);
    });
  }

  // Helpers
  getAvatarSvgHtml(c) {
    const hairColor = c.appearance?.hairColor || '#eab308';
    const clothColor = c.appearance?.clothColor || '#3b82f6';
    const gender = c.gender || 'male';
    return `
      <svg class="w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="12" fill="#0f172a" stroke="#334155" stroke-width="2"/>
        <circle cx="50" cy="45" r="20" fill="#fed7aa" />
        ${gender === 'male' 
          ? `<path d="M30 35 Q50 15 70 35 Q50 25 30 35 Z" fill="${hairColor}"/>`
          : `<path d="M25 30 Q50 10 75 30 Q50 20 25 30 Z M25 30 C20 40 22 60 25 65 M75 30 C80 40 78 60 75 65" fill="${hairColor}" stroke="${hairColor}" stroke-width="3"/>`
        }
        <path d="M20 90 C20 70 35 65 50 65 C65 65 80 70 80 90 Z" fill="${clothColor}" />
        <circle cx="43" cy="43" r="2" fill="#020617"/>
        <circle cx="57" cy="43" r="2" fill="#020617"/>
        <path d="M46 52 Q50 55 54 52" stroke="#020617" stroke-width="1.5" fill="none"/>
      </svg>
    `;
  }

  getClassTierBadgeHtml(classId) {
    const cls = CLASSES[classId];
    if (!cls) return '';
    const colors = {
      0: 'bg-slate-700 text-slate-300 border-slate-600',
      1: 'bg-blue-900/60 text-blue-300 border-blue-800',
      2: 'bg-purple-900/60 text-purple-300 border-purple-800',
      3: 'bg-amber-900/60 text-amber-300 border-amber-800',
      4: 'bg-rose-900/60 text-rose-300 border-rose-800'
    };
    const colorClass = colors[cls.tier] || 'bg-slate-700 text-slate-300';
    return `<span class="px-2 py-0.5 text-[9px] font-extrabold uppercase border rounded ${colorClass}">T${cls.tier} ${cls.name}</span>`;
  }

  // Tab: Stats
  renderStatusPanel() {
    const p = this.panels.status;
    const c = this.state.character;
    
    const baseExpReq = getBaseExpRequired(c.baseLevel);
    const expPct = Math.min(100, (c.baseExp / baseExpReq) * 100);
    
    const jobExpReq = getJobExpRequired(c.jobLevel, c.classId);
    const jexpPct = jobExpReq === Infinity ? 100 : Math.min(100, (c.jobExp / jobExpReq) * 100);
    
    const dossierHtml = `
      <div class="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 flex flex-col items-center space-y-4">
        <div class="w-32 h-32 rounded-xl overflow-hidden shadow-lg border border-slate-700">
          ${this.getAvatarSvgHtml(c)}
        </div>
        <div class="text-center space-y-1">
          <h4 class="text-sm font-bold text-slate-100">${c.name}</h4>
          <div class="flex justify-center items-center gap-1.5">
            ${this.getClassTierBadgeHtml(c.classId)}
          </div>
          <p class="text-[10px] text-slate-400">Base Lv. ${c.baseLevel} | Job Lv. ${c.jobLevel}</p>
        </div>
        <!-- Progression EXP bar (Base & Job EXP) -->
        <div class="w-full space-y-2.5 pt-2 border-t border-slate-700/40">
          <div class="space-y-1">
            <div class="flex justify-between text-[9px] text-slate-400 font-bold">
              <span>Base EXP</span>
              <span>${c.baseExp} / ${baseExpReq === Infinity ? 'MAX' : baseExpReq} (${expPct.toFixed(1)}%)</span>
            </div>
            <div class="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div class="h-full bg-gradient-to-r from-blue-500 to-sky-400 transition-all duration-300" style="width: ${expPct}%"></div>
            </div>
          </div>
          <div class="space-y-1">
            <div class="flex justify-between text-[9px] text-slate-400 font-bold">
              <span>Job EXP</span>
              <span>${jobExpReq === Infinity ? 'MAX' : `${c.jobExp} / ${jobExpReq} (${jexpPct.toFixed(1)}%)`}</span>
            </div>
            <div class="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div class="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300" style="width: ${jexpPct}%"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Left side: stats distribution
    let statsHtml = `
      <div class="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 space-y-3">
        <div class="flex justify-between items-center border-b border-slate-700/60 pb-1.5">
          <h3 class="text-sm font-bold text-yellow-400">Attribute Points</h3>
          <span class="text-xs font-bold text-slate-200 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">Pool: ${c.statPoints}</span>
        </div>
        <div class="space-y-2">
    `;

    for (const [stat, val] of Object.entries(c.stats)) {
      const cost = getStatCost(val);
      const isMax = val >= 99;
      
      statsHtml += `
        <div class="flex items-center justify-between bg-slate-900/60 p-2 rounded border border-slate-800">
          <div class="flex flex-col">
            <span class="text-xs font-bold uppercase text-slate-100">${stat}</span>
            <span class="text-[9px] text-slate-400 font-mono">${val} ${isMax ? '(MAX)' : '-> Cost: ' + cost}</span>
          </div>
          <div class="flex gap-1.5">
            <button class="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-black text-xs transition border border-slate-700 ${val <= 1 ? 'opacity-40 pointer-events-none' : ''}" data-stat-down="${stat}">
              -
            </button>
            <button class="w-7 h-7 flex items-center justify-center bg-amber-500 hover:bg-amber-600 text-slate-950 rounded font-black text-xs transition ${c.statPoints < cost || isMax ? 'opacity-40 pointer-events-none' : ''}" data-stat-up="${stat}">
              +
            </button>
          </div>
        </div>
      `;
    }

    statsHtml += `
        </div>
      </div>
    `;

    // Derived Stats
    const mountObj = c.equipment.mount;
    const mountId = mountObj ? (typeof mountObj === 'string' ? mountObj : mountObj.id) : null;
    const mountMultiplier = c.mounted && mountId ? (mountId === 'wind_wyvern' ? 1.8 : (mountId === 'fire_drake' ? 1.5 : 1.3)) : 1.0;
    const moveSpeed = Math.round((2.2 + c.stats.agi * 0.015) * mountMultiplier * 40);

    const derivedStatsHtml = `
      <div class="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 space-y-3">
        <h3 class="text-sm font-bold text-yellow-400 border-b border-slate-700/60 pb-1.5">Derived Stats</h3>
        <div class="grid grid-cols-1 gap-1.5 text-xs text-slate-300">
          <div class="flex justify-between bg-slate-900/40 p-2 rounded border border-slate-800/50">
            <span>ATK (Attack Power)</span>
            <span class="text-slate-100 font-bold">${this.state.atk}</span>
          </div>
          <div class="flex justify-between bg-slate-900/40 p-2 rounded border border-slate-800/50">
            <span>MATK (Magic Attack)</span>
            <span class="text-slate-100 font-bold">${this.state.matk}</span>
          </div>
          <div class="flex justify-between bg-slate-900/40 p-2 rounded border border-slate-800/50">
            <span>DEF (Physical Defense)</span>
            <span class="text-slate-100 font-bold">${this.state.def}</span>
          </div>
          <div class="flex justify-between bg-slate-900/40 p-2 rounded border border-slate-800/50">
            <span>MDEF (Magic Defense)</span>
            <span class="text-slate-100 font-bold">${this.state.mdef}</span>
          </div>
          <div class="flex justify-between bg-slate-900/40 p-2 rounded border border-slate-800/50">
            <span>HIT (Accuracy)</span>
            <span class="text-slate-100 font-bold">${this.state.hit}</span>
          </div>
          <div class="flex justify-between bg-slate-900/40 p-2 rounded border border-slate-800/50">
            <span>FLEE (Dodge Rate)</span>
            <span class="text-slate-100 font-bold">${this.state.flee}</span>
          </div>
          <div class="flex justify-between bg-slate-900/40 p-2 rounded border border-slate-800/50">
            <span>CRIT (Critical Chance)</span>
            <span class="text-slate-100 font-bold">${this.state.critical}%</span>
          </div>
          <div class="flex justify-between bg-slate-900/40 p-2 rounded border border-slate-800/50">
            <span>ASPD (Attack Speed)</span>
            <span class="text-slate-100 font-bold">${this.state.aspd}</span>
          </div>
          <div class="flex justify-between bg-slate-900/40 p-2 rounded border border-slate-800/50">
            <span>Max HP</span>
            <span class="text-slate-100 font-bold">${this.state.maxHp}</span>
          </div>
          <div class="flex justify-between bg-slate-900/40 p-2 rounded border border-slate-800/50">
            <span>Max SP</span>
            <span class="text-slate-100 font-bold">${this.state.maxSp}</span>
          </div>
          <div class="flex justify-between bg-slate-900/40 p-2 rounded border border-slate-800/50">
            <span>Move Speed</span>
            <span class="text-slate-100 font-bold">${moveSpeed} px/s</span>
          </div>
        </div>
      </div>
    `;

    p.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${dossierHtml}
        ${statsHtml}
        ${derivedStatsHtml}
      </div>
    `;

    // Add button listeners
    p.querySelectorAll('button[data-stat-up]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const stat = e.currentTarget.dataset.statUp;
        if (this.state.upgradeStat(stat)) {
          this.updateHUD();
          this.renderStatusPanel();
          this.addLogMessage(`System: Upgraded ${stat.toUpperCase()} to ${c.stats[stat]}.`, 'system');
        }
      });
    });

    p.querySelectorAll('button[data-stat-down]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const stat = e.currentTarget.dataset.statDown;
        if (this.state.downgradeStat(stat)) {
          this.updateHUD();
          this.renderStatusPanel();
          this.addLogMessage(`System: Downgraded ${stat.toUpperCase()} to ${c.stats[stat]}.`, 'system');
        }
      });
    });
  }

  // Tab: Skills
  renderSkillsPanel() {
    const p = this.panels.skills;
    const c = this.state.character;

    // Available skills list — novice base tree + class-specific tree, no duplicates
    const classSkills = SKILL_TREE[c.classId] || [];
    const combined = c.classId === 'novice'
      ? classSkills
      : [...SKILL_TREE.novice, ...classSkills];
    // Deduplicate by id (guard against any overlap)
    const seen = new Set();
    const skillsList = combined.filter(s => seen.has(s.id) ? false : seen.add(s.id));

    const SKILL_EMOJIS = {
      first_aid: '🩹',
      play_dead: '💀',
      bash: '⚔️',
      hp_rec: '❤️',
      magnum_break: '💥',
      fire_bolt: '🔥',
      cold_bolt: '❄️',
      sp_rec: '💙',
      heal: '✨',
      blessing: '🙏',
      increase_agi: '🏃',
      double_attack: '🗡️',
      improve_dodge: '💨',
      hiding: '👥',
      double_strafe: '🏹',
      owls_eye: '👁️',
      vultures_eye: '🎯',
      bowling_bash: '🎳',
      pierce: '🪡',
      spear_quicken: '⚡',
      dragon_breath: '🐲',
      storm_gust: '🌪️',
      meteor_storm: '☄️',
      jupitel_thunder: '⚡',
      sanctuary: '⛪',
      magnificat: '🎶',
      resurrection: '👼',
      draconic_shield: '🛡️',
      sonic_blow: '⚡',
      grimtooth: '🦷',
      cloaking: '🧥',
      blitz_beat: '🦅',
      falconry: '🦉',
      claymore_trap: '🕸️',
      mounted_barrage: '🏹',
      frenzy: '😡',
      clashing_spiral: '🌀',
      mystical_amp: '🔮',
      grav_field: '🌌',
      assumptio: '🛡️',
      meditatio: '🧘',
      edp: '☠️',
      soul_destroyer: '👻',
      sharp_shooting: '🎯',
      falcon_assault: '🦅'
    };

    const SUPPORT_SKILLS = [
      'first_aid', 'heal', 'blessing', 'increase_agi', 'sanctuary', 
      'magnificat', 'resurrection', 'draconic_shield', 'assumptio', 'meditatio'
    ];

    const getSkillGroup = (skill) => {
      if (SUPPORT_SKILLS.includes(skill.id)) return 'Support';
      if (skill.type === 'passive') return 'Passive';
      return 'Active';
    };

    let html = `
      <div class="space-y-6">
        <div class="flex items-center justify-between border-b border-slate-700 pb-2">
          <h3 class="text-sm font-extrabold text-yellow-400">Class Skill Tree</h3>
          <span class="text-xs font-bold text-slate-200 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">Skill Points: ${c.skillPoints}</span>
        </div>
    `;

    const groups = ['Active', 'Passive', 'Support'];
    groups.forEach(group => {
      const groupSkills = skillsList.filter(s => getSkillGroup(s) === group);
      if (groupSkills.length === 0) return;

      html += `
        <div class="space-y-3">
          <h4 class="text-xs font-black uppercase tracking-wider text-amber-400 skill-cat-header">${group} Skills</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      `;

      groupSkills.forEach(s => {
        const level = c.skills[s.id] || 0;
        const isMax = level >= s.maxLevel;
        const requiresMount = ['dragon_breath', 'mounted_barrage', 'draconic_shield'].includes(s.id);
        const isDismountedMountSkill = requiresMount && !c.mounted;
        const emoji = SKILL_EMOJIS[s.id] || '🔮';
        const spCost = s.type === 'active' ? ((s.baseSpCost || 5) + (Math.max(1, level) * 2)) : 0;
        const progressPct = (level / s.maxLevel) * 100;

        let locked = false;
        let reqMsg = '';
        if (s.req) {
          for (const [reqId, reqLvl] of Object.entries(s.req)) {
            if ((c.skills[reqId] || 0) < reqLvl) {
              locked = true;
              const reqName = skillsList.find(sk => sk.id === reqId)?.name || reqId;
              reqMsg += `${reqName} Lv.${reqLvl} `;
            }
          }
        }

        html += `
          <div class="bg-slate-800/40 p-3 rounded-xl border border-slate-700/60 flex flex-col justify-between space-y-2.5 transition-all ${
            locked ? 'opacity-40' : ''
          } ${
            isDismountedMountSkill ? 'border-rose-900 bg-rose-950/10' : ''
          }">
            <div class="space-y-1.5">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="text-base flex-shrink-0">${emoji}</span>
                  <span class="text-xs font-bold text-slate-100 truncate">${s.name}</span>
                </div>
                <span class="text-[10px] text-amber-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono">Lv. ${level} / ${s.maxLevel}</span>
              </div>
              
              <!-- Progress Bar -->
              <div class="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                <div class="h-full bg-gradient-to-r from-blue-500 to-sky-400 transition-all duration-300" style="width: ${progressPct}%"></div>
              </div>

              <p class="text-[10px] text-slate-400 leading-normal">${s.desc}</p>
              
              ${s.type === 'active' ? `<div class="text-[9px] text-blue-400 font-bold font-mono">SP Cost: ${spCost}</div>` : ''}
              
              ${locked ? `<div class="text-[9px] font-bold text-rose-400">Requires: ${reqMsg}</div>` : ''}

              <!-- Mount Warning Banner -->
              ${isDismountedMountSkill ? `
                <div class="text-[9px] font-black text-rose-400 bg-rose-950/40 border border-rose-800/50 rounded px-2 py-1 flex items-center gap-1">
                  <span>⚠️</span> Requires Mount (Dismounted)
                </div>
              ` : ''}
            </div>

            <button class="w-full py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition border border-blue-500/20 disabled:opacity-40 disabled:pointer-events-none" 
                    ${locked || isMax || c.skillPoints <= 0 ? 'disabled' : ''} 
                    data-skill="${s.id}">
              ${isMax ? 'MAXED' : 'Invest 1 Point'}
            </button>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += `</div>`;
    p.innerHTML = html;

    p.querySelectorAll('button[data-skill]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const skillId = e.currentTarget.dataset.skill;
        if (this.state.upgradeSkill(skillId)) {
          this.updateHUD();
          this.updateHotkeysUI();
          this.renderSkillsPanel();
          this.addLogMessage(`System: Upgraded skill ${skillsList.find(s=>s.id===skillId)?.name || skillId}.`, 'system');
        }
      });
    });
  }

  // Tab: Inventory
  // Tab: Inventory & Equipment & Blacksmith
  renderInventoryPanel() {
    const p = this.panels.inventory;
    const c = this.state.character;

    this.inventorySortType = this.inventorySortType || 'default';

    // Items list sorted
    let inventoryEntries = Object.entries(c.inventory);
    if (this.inventorySortType === 'name') {
      inventoryEntries.sort((a, b) => {
        const itemA = ITEMS[a[0]];
        const itemB = ITEMS[b[0]];
        if (!itemA) return 1;
        if (!itemB) return -1;
        return itemA.name.localeCompare(itemB.name);
      });
    } else if (this.inventorySortType === 'type') {
      inventoryEntries.sort((a, b) => {
        const itemA = ITEMS[a[0]];
        const itemB = ITEMS[b[0]];
        if (!itemA) return 1;
        if (!itemB) return -1;
        return itemA.type.localeCompare(itemB.type);
      });
    }

    let itemGrid = `
      <div class="space-y-4">
        <div class="flex justify-between items-center border-b border-slate-700 pb-1.5">
          <h3 class="text-sm font-bold text-yellow-400">Items Bag</h3>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-slate-400 font-bold">Sort:</span>
            <select id="inv-sort-select" class="bg-slate-900 border border-slate-700 text-[10px] rounded px-1.5 py-0.5 text-slate-200 font-bold">
              <option value="default" ${this.inventorySortType === 'default' ? 'selected' : ''}>Default</option>
              <option value="name" ${this.inventorySortType === 'name' ? 'selected' : ''}>Name</option>
              <option value="type" ${this.inventorySortType === 'type' ? 'selected' : ''}>Type</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
    `;

    if (inventoryEntries.length === 0) {
      itemGrid += `<div class="col-span-4 text-xs text-slate-500 text-center py-4">Your bag is empty.</div>`;
    } else {
      inventoryEntries.forEach(([itemId, count]) => {
        const item = ITEMS[itemId];
        if (!item) return;

        let actionLabel = 'Use';
        if (item.type === 'weapon' || item.type === 'shield' || item.type === 'armor' || item.type === 'headgear' || item.type === 'mount') {
          const isEquipped = Object.values(c.equipment).some(eq => eq && (typeof eq === 'string' ? eq === itemId : eq.id === itemId));
          actionLabel = isEquipped ? 'Unequip' : 'Equip';
        } else if (item.type === 'etc' || item.type === 'quest' || item.type === 'card') {
          actionLabel = 'Info';
        }

        itemGrid += `
          <div class="rpg-tooltip-container bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/60 flex flex-col justify-between h-24 transition-all hover:bg-slate-800/60">
            <div>
              <div class="flex justify-between items-start gap-1">
                <span class="text-[11px] font-bold text-slate-100 overflow-hidden text-ellipsis whitespace-nowrap flex-1">${item.name}</span>
                <span class="text-[10px] text-amber-500 font-extrabold flex-shrink-0">x${count}</span>
              </div>
              <p class="text-[9px] text-slate-400 mt-1 line-clamp-2">${item.desc || ''}</p>
            </div>
            <button class="w-full py-0.5 ${actionLabel === 'Unequip' ? 'bg-red-900/60 text-red-300 hover:bg-red-900' : 'bg-slate-700 text-slate-100 hover:bg-slate-650'} rounded-lg text-[10px] font-semibold transition" data-item="${itemId}" data-action="${actionLabel}">
              ${actionLabel}
            </button>
            ${this.getItemTooltipHtml(item)}
          </div>
        `;
      });
    }

    itemGrid += `
        </div>
      </div>
    `;

    // Active Equipment Slots Panel with 8 slots
    let equipGrid = `
      <div class="space-y-4">
        <h3 class="text-sm font-bold text-yellow-400 border-b border-slate-700 pb-1">Equipped Gear</h3>
        <div class="grid grid-cols-1 gap-2 text-xs">
    `;

    const gearSlots = [
      { key: 'weapon', label: 'Weapon' },
      { key: 'shield', label: 'Shield' },
      { key: 'armor', label: 'Armor' },
      { key: 'headgear', label: 'Helm' },
      { key: 'boots', label: 'Boots' },
      { key: 'accessory1', label: 'Accessory 1' },
      { key: 'accessory2', label: 'Accessory 2' },
      { key: 'mount', label: 'Mount' }
    ];

    gearSlots.forEach(slot => {
      const key = slot.key;
      const label = slot.label;
      const equip = c.equipment[key];
      const itemId = equip ? (typeof equip === 'string' ? equip : equip.id) : null;
      const refine = equip ? (typeof equip === 'string' ? 0 : (equip.refine || 0)) : 0;
      const socketedCards = equip ? (typeof equip === 'string' ? [] : (equip.socketedCards || [])) : [];
      const item = itemId ? ITEMS[itemId] : null;

      let nameText = 'Empty';
      let slotDetailsText = '';
      if (item) {
        if (key === 'mount') {
          nameText = item.name;
        } else {
          nameText = (refine > 0 ? `+${refine} ` : '') + item.name;
        }
      }

      let mountButtonHtml = '';
      if (key === 'mount' && item) {
        mountButtonHtml = `
          <button class="px-2 py-0.5 rounded text-[10px] ${c.mounted ? 'bg-green-700 hover:bg-green-600 text-white font-bold animate-pulse' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'} ml-2" data-toggle-mount>
            ${c.mounted ? 'Mounted' : 'Dismounted'}
          </button>
        `;
      }

      // Socket dots below slots (Weapon: 2, Shield/Armor/Headgear: 1)
      const maxSlots = key === 'weapon' ? 2 : (['shield', 'armor', 'headgear'].includes(key) ? 1 : 0);
      let dotsHtml = '';
      if (maxSlots > 0) {
        dotsHtml += `<div class="flex gap-1 mt-1.5">`;
        for (let i = 0; i < maxSlots; i++) {
          const cardId = socketedCards[i];
          if (cardId) {
            const cardItem = ITEMS[cardId];
            const cardName = cardItem ? cardItem.name : 'Card';
            dotsHtml += `
              <div class="rpg-tooltip-container flex items-center">
                <span class="gear-socket-dot gear-socket-filled cursor-pointer" data-unsocket-slot="${key}" data-unsocket-idx="${i}"></span>
                <div class="rpg-tooltip font-sans">
                  <div class="font-bold text-blue-400">${cardName}</div>
                  <div class="text-[9px] text-slate-400 mt-0.5">Click to unsocket card.</div>
                </div>
              </div>
            `;
          } else {
            dotsHtml += `<span class="gear-socket-dot gear-socket-empty"></span>`;
          }
        }
        dotsHtml += `</div>`;
      }

      equipGrid += `
        <div class="rpg-tooltip-container bg-slate-800/60 p-2.5 rounded-xl border border-slate-700 flex justify-between items-center transition-all hover:bg-slate-850">
          <div class="flex-1 min-w-0">
            <div class="flex items-center">
              <span class="text-[9px] text-slate-500 uppercase font-bold tracking-wider">${label}</span>
              ${mountButtonHtml}
            </div>
            <span class="text-xs font-semibold ${item ? 'text-amber-400' : 'text-slate-400'} truncate block">${nameText}</span>
            ${dotsHtml}
          </div>
          ${item ? `<button class="text-[9px] text-red-400 hover:text-red-300 ml-2" data-unequip-slot="${key}">Remove</button>` : ''}
          ${item ? this.getItemTooltipHtml(item, refine) : ''}
        </div>
      `;
    });

    equipGrid += `
        </div>
      </div>
    `;

    // Sub-panels options lists
    let socketCardOptions = '<option value="">-- Choose Card --</option>';
    Object.entries(c.inventory).forEach(([itemId, count]) => {
      const item = ITEMS[itemId];
      if (item && item.type === 'card') {
        socketCardOptions += `<option value="${itemId}">${item.name} (${count} owned)</option>`;
      }
    });

    let socketGearOptions = '<option value="">-- Choose Equipped Gear --</option>';
    for (const [slot, equip] of Object.entries(c.equipment)) {
      if (slot === 'mount') continue;
      const itemId = equip ? (typeof equip === 'string' ? equip : equip.id) : null;
      if (itemId) {
        const item = ITEMS[itemId];
        const refine = equip && typeof equip !== 'string' ? (equip.refine || 0) : 0;
        const socketedCards = equip && typeof equip !== 'string' ? (equip.socketedCards || []) : [];
        const maxSlots = slot === 'weapon' ? 2 : 1;
        socketGearOptions += `<option value="${slot}">${slot.toUpperCase()}: +${refine} ${item.name} (${socketedCards.length}/${maxSlots} slots used)</option>`;
      }
    }

    let forgeHtml = `
      <div class="space-y-6 mt-6 border-t border-slate-700/60 pt-6">
        <!-- 1. Refinement Forge -->
        <div class="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
          <h4 class="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
            <span>🔨</span> Blacksmith Forge
          </h4>
          <p class="text-[10px] text-slate-400 leading-normal">
            Refine equipped gear up to +10. Safe limit is +4. Going past +4 has a chance to break/destroy the item!
          </p>
          
          <div class="flex flex-col gap-2">
            <div class="flex flex-col gap-1">
              <label class="text-[9px] uppercase font-bold text-slate-400">Select Gear</label>
              <select id="forge-gear-select" class="bg-slate-900 border border-slate-700 text-xs rounded p-1 w-full text-slate-200">
                <option value="">-- Choose Gear --</option>
    `;
    
    for (const [slot, equip] of Object.entries(c.equipment)) {
      if (slot === 'mount') continue;
      const itemId = equip ? (typeof equip === 'string' ? equip : equip.id) : null;
      if (itemId) {
        const item = ITEMS[itemId];
        const refine = equip && typeof equip !== 'string' ? (equip.refine || 0) : 0;
        forgeHtml += `<option value="${slot}">${slot.toUpperCase()}: +${refine} ${item.name}</option>`;
      }
    }
    
    forgeHtml += `
              </select>
            </div>
            
            <div id="forge-info-area" class="text-[10px] bg-slate-900/50 p-2 rounded border border-slate-800/80 hidden space-y-1"></div>
            
            <button id="btn-forge-refine" disabled class="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded text-xs font-black transition disabled:opacity-50 disabled:cursor-not-allowed">
              Forge Refinement
            </button>
          </div>
        </div>

        <!-- 2. Card Socketing -->
        <div class="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
          <h4 class="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1">
            <span>🎴</span> Card Socketing
          </h4>
          <p class="text-[10px] text-slate-400 leading-normal">
            Insert cards into equipped gear slots. Weapons have 2 slots, others have 1.
          </p>
          
          <div class="flex flex-col gap-2">
            <div class="flex flex-col gap-1">
              <label class="text-[9px] uppercase font-bold text-slate-400">Select Card</label>
              <select id="socket-card-select" class="bg-slate-900 border border-slate-700 text-xs rounded p-1 w-full text-slate-200">
                ${socketCardOptions}
              </select>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-[9px] uppercase font-bold text-slate-400">Select Target Gear</label>
              <select id="socket-gear-select" class="bg-slate-900 border border-slate-700 text-xs rounded p-1 w-full text-slate-200">
                ${socketGearOptions}
              </select>
            </div>

            <button id="btn-socket-card" class="w-full py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-black transition disabled:opacity-50 disabled:cursor-not-allowed">
              Socket Card
            </button>
          </div>
        </div>
      </div>
    `;

    p.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">${itemGrid}</div>
        <div>
          ${equipGrid}
          ${forgeHtml}
        </div>
      </div>
    `;

    // Unsocket dot click listener
    p.querySelectorAll('[data-unsocket-slot]').forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        const slot = e.currentTarget.dataset.unsocketSlot;
        const idx = parseInt(e.currentTarget.dataset.unsocketIdx);
        const res = this.state.unsocketCard(slot, idx);
        if (res.success) {
          audioSystem.playSFX('refine_success');
          this.addLogMessage(`Unsocket: Removed card from equipped ${slot}.`, 'system');
          this.updateHUD();
          this.renderInventoryPanel();
        } else {
          this.addLogMessage(`Unsocket Error: ${res.reason}`, 'error');
        }
      });
    });

    // Sort select change listener
    const sortSelect = p.querySelector('#inv-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.inventorySortType = e.target.value;
        this.renderInventoryPanel();
      });
    }

    const updateForgeInfo = () => {
      const select = p.querySelector('#forge-gear-select');
      const infoArea = p.querySelector('#forge-info-area');
      const btn = p.querySelector('#btn-forge-refine');
      
      if (!select || !infoArea || !btn) return;
      
      const slot = select.value;
      if (!slot) {
        infoArea.classList.add('hidden');
        btn.disabled = true;
        return;
      }
      
      const equip = c.equipment[slot];
      if (!equip) {
        infoArea.classList.add('hidden');
        btn.disabled = true;
        return;
      }
      
      const itemId = typeof equip === 'string' ? equip : equip.id;
      const currentRefine = typeof equip === 'string' ? 0 : (equip.refine || 0);
      const item = ITEMS[itemId];
      
      if (currentRefine >= 10) {
        infoArea.innerHTML = `<span class="text-green-400 font-bold">Item is fully refined to +10!</span>`;
        infoArea.classList.remove('hidden');
        btn.disabled = true;
        return;
      }
      
      const targetRefine = currentRefine + 1;
      const rates = {
        1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0,
        5: 0.80, 6: 0.65, 7: 0.50, 8: 0.35,
        9: 0.20, 10: 0.10
      };
      const successRate = rates[targetRefine] || 0.10;
      const successText = successRate === 1.0 ? '100% (Safe)' : `${successRate * 100}% (Risk of Break)`;
      
      const matId = slot === 'weapon' ? 'oridecon' : 'elunium';
      const matName = ITEMS[matId]?.name || matId;
      const ownedMats = c.inventory[matId] || 0;
      
      const hasEnough = ownedMats >= 1;
      btn.disabled = !hasEnough;
      
      infoArea.innerHTML = `
        <div class="flex justify-between"><span>Current:</span> <span class="font-bold text-amber-400">+${currentRefine}</span></div>
        <div class="flex justify-between"><span>Target:</span> <span class="font-bold text-amber-300">+${targetRefine}</span></div>
        <div class="flex justify-between"><span>Success Chance:</span> <span class="font-bold ${successRate === 1.0 ? 'text-green-400' : 'text-rose-400'}">${successText}</span></div>
        <div class="flex justify-between"><span>Material:</span> <span class="font-bold ${hasEnough ? 'text-green-400' : 'text-red-400'}">${matName} (${ownedMats}/1)</span></div>
      `;
      infoArea.classList.remove('hidden');
    };

    const forgeSelect = p.querySelector('#forge-gear-select');
    if (forgeSelect) {
      forgeSelect.addEventListener('change', updateForgeInfo);
    }

    const forgeBtn = p.querySelector('#btn-forge-refine');
    if (forgeBtn) {
      forgeBtn.addEventListener('click', () => {
        const select = p.querySelector('#forge-gear-select');
        if (!select) return;
        const slot = select.value;
        if (!slot) return;
        
        const result = this.state.refineItem(slot);
        if (result.success) {
          audioSystem.playSFX('refine_success');
          this.addLogMessage(`Forge Success: Upgraded ${ITEMS[result.itemId].name} to +${result.newRefine}!`, 'system');
        } else {
          if (result.broken) {
            audioSystem.playSFX('refine_break');
            this.addLogMessage(`Forge Failure: Oh no! The equipment broke and was destroyed!`, 'error');
          } else {
            this.addLogMessage(`Forge Error: ${result.reason}`, 'error');
          }
        }
        this.updateHUD();
        this.renderInventoryPanel();
      });
    }

    const socketBtn = p.querySelector('#btn-socket-card');
    if (socketBtn) {
      socketBtn.addEventListener('click', () => {
        const cardSelect = p.querySelector('#socket-card-select');
        const gearSelect = p.querySelector('#socket-gear-select');
        if (!cardSelect || !gearSelect) return;
        
        const cardId = cardSelect.value;
        const slot = gearSelect.value;
        if (!cardId || !slot) {
          this.addLogMessage(`System: Please select both a card and target equipment slot.`, 'error');
          return;
        }
        
        const result = this.state.socketCard(cardId, slot);
        if (result.success) {
          audioSystem.playSFX('heal');
          this.addLogMessage(`Socket Success: Placed card into equipped slot!`, 'system');
        } else {
          this.addLogMessage(`Socket Error: ${result.reason}`, 'error');
        }
        this.updateHUD();
        this.renderInventoryPanel();
      });
    }

    p.querySelectorAll('button[data-item]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemId = e.target.dataset.item;
        const action = e.target.dataset.action;

        if (action === 'Use') {
          if (this.state.useItem(itemId)) {
            this.addLogMessage(`Use: Restored stats using ${ITEMS[itemId].name}.`, 'spell-log');
            this.updateHUD();
            this.updateHotkeysUI();
            this.renderInventoryPanel();
          } else {
            this.addLogMessage(`System: Cannot use ${ITEMS[itemId].name}. Stats are full.`, 'error');
          }
        } 
        else if (action === 'Equip') {
          if (this.state.equipItem(itemId)) {
            this.addLogMessage(`Equip: Put on ${ITEMS[itemId].name}.`, 'system');
            this.updateHUD();
            this.renderInventoryPanel();
          } else {
            this.addLogMessage(`System: Cannot equip ${ITEMS[itemId].name}. Class requirement mismatch!`, 'error');
          }
        } 
        else if (action === 'Unequip') {
          const item = ITEMS[itemId];
          if (item) {
            this.state.unequipItem(item.slot);
            this.addLogMessage(`Equip: Unequipped ${item.name}.`, 'system');
            this.updateHUD();
            this.renderInventoryPanel();
          }
        }
      });
    });

    p.querySelectorAll('button[data-unequip-slot]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slot = e.target.dataset.unequipSlot;
        this.state.unequipItem(slot);
        this.updateHUD();
        this.renderInventoryPanel();
      });
    });

    p.querySelectorAll('button[data-toggle-mount]').forEach(btn => {
      btn.addEventListener('click', () => {
        c.mounted = !c.mounted;
        this.state.recalculateStats();
        this.state.save();
        this.addLogMessage(`System: You are now ${c.mounted ? 'mounted' : 'dismounted'}.`, 'system');
        this.updateHUD();
        this.renderInventoryPanel();
      });
    });
  }

  getItemTooltipHtml(item, refine = 0) {
    if (!item) return '';
    let stats = [];
    if (item.atk) stats.push(`ATK: +${item.atk}`);
    if (item.matk) stats.push(`MATK: +${item.matk}`);
    if (item.def) stats.push(`DEF: +${item.def}`);
    if (item.mdef) stats.push(`MDEF: +${item.mdef}`);
    if (item.critChance) stats.push(`CRIT: +${item.critChance}%`);
    if (item.vitBonus) stats.push(`VIT: +${item.vitBonus}`);
    if (item.strBonus) stats.push(`STR: +${item.strBonus}`);
    if (item.dexBonus) stats.push(`DEX: +${item.dexBonus}`);
    
    return `
      <div class="rpg-tooltip font-sans space-y-1">
        <div class="flex justify-between items-center">
          <span class="font-bold text-yellow-400">${refine > 0 ? `+${refine} ` : ''}${item.name}</span>
          <span class="text-[9px] uppercase font-bold text-slate-500">${item.type}</span>
        </div>
        <p class="text-[10px] text-slate-300">${item.desc || ''}</p>
        ${stats.length > 0 ? `<div class="text-[9px] text-green-400 font-bold">${stats.join(' | ')}</div>` : ''}
        ${item.price ? `<div class="text-[9px] text-amber-500 font-bold">Value: ${item.price} Z</div>` : ''}
      </div>
    `;
  }

  // Tab: Adventure Board Quests
  renderQuestsPanel() {
    const p = this.panels.quests;
    const c = this.state.character;

    const activeQuests = [];
    const availableQuests = [];

    QUESTS.forEach(q => {
      const isActive = c.activeQuests[q.id] !== undefined;
      const isCompleted = c.completedQuests[q.id] !== undefined;

      if (isActive) {
        activeQuests.push(q);
      } else {
        if (!isCompleted || q.id !== 'novice_trial') {
          availableQuests.push(q);
        }
      }
    });

    const renderQuestCard = (q, isActive) => {
      const isCompleted = c.completedQuests[q.id] !== undefined;
      const isDragonQuest = q.id.includes('dragon') || q.name.toLowerCase().includes('dragon');
      
      let questState = 'Available';
      let btnLabel = 'Accept Quest';
      let btnClass = 'bg-amber-500 hover:bg-amber-600 text-slate-900';
      
      if (isActive) {
        const ready = this.state.checkQuestReadyToHandIn(q.id);
        questState = ready ? 'Ready to Hand In' : 'In Progress';
        btnLabel = ready ? 'Complete Quest' : 'In Progress';
        btnClass = ready ? 'bg-green-600 hover:bg-green-700 text-white animate-pulse' : 'bg-slate-700 text-slate-400 pointer-events-none';
      } else if (isCompleted && q.id === 'novice_trial') {
        questState = 'Completed';
        btnLabel = 'Completed';
        btnClass = 'bg-slate-800 text-slate-600 pointer-events-none';
      }

      const isLvlLock = c.baseLevel < q.minLevel;
      if (isLvlLock && !isActive) {
        btnLabel = `Level ${q.minLevel} Required`;
        btnClass = 'bg-slate-800 text-slate-600 pointer-events-none';
      }

      const isClassLock = q.reqClass !== 'any' && q.reqClass !== c.classId;
      if (isClassLock && !isActive && !isLvlLock) {
        btnLabel = `${q.reqClass.toUpperCase()} Only`;
        btnClass = 'bg-slate-800 text-slate-600 pointer-events-none';
      }

      const borderClass = isDragonQuest ? 'dragon-trial-border' : 'border-slate-700/60 bg-slate-800/40';

      return `
        <div class="p-3 rounded-xl border flex flex-col justify-between space-y-2.5 transition-all ${borderClass}">
          <div>
            <div class="flex justify-between items-center gap-1.5">
              <span class="text-xs font-bold text-slate-100 truncate">${q.name}</span>
              <span class="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                questState === 'Ready to Hand In' ? 'bg-green-950/80 text-green-400 border border-green-800/40' : 'bg-slate-900 text-slate-400'
              }">${questState}</span>
            </div>
            
            ${this.parseNarrativeDesc(q.desc)}
            
            <div class="mt-2 space-y-1">
              <span class="text-[9px] text-slate-400 font-bold block">Rewards:</span>
              <div class="flex flex-wrap gap-2 text-[9px] text-slate-300">
                <span>EXP: +${q.rewards.exp}</span>
                <span>Job: +${q.rewards.jobExp}</span>
                <span>Z: +${q.rewards.zenny}</span>
                ${q.rewards.items ? Object.entries(q.rewards.items).map(([itm, count]) => `<span>+${count} ${ITEMS[itm]?.name || itm}</span>`).join('') : ''}
              </div>
            </div>

            ${isActive ? this.getQuestTrackerHtml(q) : ''}
          </div>
          
          <button class="w-full py-1 rounded-lg font-bold text-xs transition ${btnClass}" data-quest-btn="${q.id}" data-action="${btnLabel}">
            ${btnLabel}
          </button>
        </div>
      `;
    };

    let availableListHtml = '';
    if (availableQuests.length === 0) {
      availableListHtml = `<div class="text-xs text-slate-500 italic py-2">No available quests.</div>`;
    } else {
      availableQuests.forEach(q => {
        availableListHtml += renderQuestCard(q, false);
      });
    }

    let activeListHtml = '';
    if (activeQuests.length === 0) {
      activeListHtml = `<div class="text-xs text-slate-500 italic py-2">No active quests. Accept them from the available list.</div>`;
    } else {
      activeQuests.forEach(q => {
        activeListHtml += renderQuestCard(q, true);
      });
    }

    const classPromoteHtml = this.getClassPromotePanelHtml();

    p.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-4">
            <h3 class="text-sm font-extrabold text-yellow-400 border-b border-slate-700 pb-2">Available Quests</h3>
            <div class="space-y-3">${availableListHtml}</div>
          </div>
          <div class="space-y-4">
            <h3 class="text-sm font-extrabold text-yellow-400 border-b border-slate-700 pb-2">Active Quests</h3>
            <div class="space-y-3">${activeListHtml}</div>
          </div>
        </div>
        <div>${classPromoteHtml}</div>
      </div>
    `;

    p.querySelectorAll('button[data-quest-btn]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const questId = e.currentTarget.dataset.questBtn;
        const action = e.currentTarget.dataset.action;

        if (action === 'Accept Quest') {
          if (this.state.acceptQuest(questId)) {
            this.addLogMessage(`Quest: Accepted [${QUESTS.find(q=>q.id===questId).name}]`, 'system');
            this.renderQuestsPanel();
          }
        } 
        else if (action === 'Complete Quest') {
          const quest = QUESTS.find(q=>q.id===questId);
          if (this.state.completeQuest(questId)) {
            this.addLogMessage(`Quest: Completed [${quest.name}]! Obtained rewards.`, 'loot-log');
            this.updateHUD();
            this.renderQuestsPanel();
            this.renderInventoryPanel();
          }
        }
      });
    });

    p.querySelectorAll('button[data-promote-class]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const classId = e.currentTarget.dataset.promoteClass;
        const res = this.state.promoteClass(classId);
        if (res.success) {
          this.addLogMessage(`🎉 UP-CLASS SUCCESS! You promoted to [${CLASSES[classId].name}]! Attributes enhanced, starter gear equipped.`, 'lvl-up');
          this.updateHUD();
          this.updateHotkeysUI();
          this.renderQuestsPanel();
        } else {
          this.addLogMessage(`System: Promotion failed. ${res.reason}`, 'error');
        }
      });
    });
  }

  getQuestTrackerHtml(q) {
    const progress = this.state.character.activeQuests[q.id];
    if (!progress) return '';

    let tracker = `<div class="mt-2.5 p-2 bg-slate-900/60 rounded-lg text-[9px] space-y-2">`;
    
    // Render monster goals
    if (q.targets.monsters) {
      for (const [mobId, reqCount] of Object.entries(q.targets.monsters)) {
        const curCount = progress.monsters[mobId] || 0;
        const name = MONSTERS[mobId]?.name || mobId;
        const isDone = curCount >= reqCount;
        const pct = Math.min(100, (curCount / reqCount) * 100);
        tracker += `
          <div class="space-y-1">
            <div class="flex justify-between ${isDone ? 'text-green-400 font-bold' : 'text-slate-300'}">
              <span>Hunt: ${name}</span>
              <span>${curCount} / ${reqCount}</span>
            </div>
            <div class="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
              <div class="h-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-300" style="width: ${pct}%"></div>
            </div>
          </div>
        `;
      }
    }

    // Render items goals
    if (q.targets.items) {
      for (const [itemId, reqCount] of Object.entries(q.targets.items)) {
        const curCount = this.state.character.inventory[itemId] || 0;
        const name = ITEMS[itemId]?.name || itemId;
        const isDone = curCount >= reqCount;
        const pct = Math.min(100, (curCount / reqCount) * 100);
        tracker += `
          <div class="space-y-1">
            <div class="flex justify-between ${isDone ? 'text-green-400 font-bold' : 'text-slate-300'}">
              <span>Gather: ${name}</span>
              <span>${curCount} / ${reqCount}</span>
            </div>
            <div class="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
              <div class="h-full bg-gradient-to-r from-blue-500 to-sky-400 transition-all duration-300" style="width: ${pct}%"></div>
            </div>
          </div>
        `;
      }
    }

    tracker += `</div>`;
    return tracker;
  }

  getClassPromotePanelHtml() {
    const c = this.state.character;
    const currentClass = CLASSES[c.classId];
    
    let html = `
      <div class="bg-slate-800/40 p-4 rounded border border-slate-700/60 space-y-4">
        <h3 class="text-sm font-bold text-yellow-400 border-b border-slate-700 pb-1">Ascension Guild Promote</h3>
    `;

    if (currentClass.tier === 4) {
      html += `
        <div class="text-xs text-slate-400 text-center py-4">
          🎉 You have reached the pinnacle of growth as a <strong class="text-yellow-400">${currentClass.name}</strong>!
        </div>
      `;
    } else {
      const targetTiers = currentClass.tier === 0 
        ? currentClass.upClassTier 
        : currentClass.upClassTier || [];

      html += `
        <p class="text-[10px] text-slate-300 leading-relaxed">
          Upgrade your character to a higher class. Meet the Level, Job Level, and board item conditions to unlock.
        </p>
        <div class="space-y-3 mt-2">
      `;

      targetTiers.forEach(targetId => {
        const tCls = CLASSES[targetId];
        const canWarp = this.state.canUpClass(targetId);
        
        let reqMsg = '';
        if (currentClass.tier === 0) {
          reqMsg = 'Base Lv.10, Job Lv.10, "Guild Novice Trial" Quest badge.';
        } else if (currentClass.tier === 1) {
          reqMsg = 'Base Lv.40, Job Lv.40, "Sograt Desert Survey" Quest license.';
        } else if (currentClass.tier === 2) {
          reqMsg = 'Base Lv.70, Job Lv.50, "Mjolnir Icy Ascent" Quest sigil.';
        } else if (currentClass.tier === 3) {
          reqMsg = 'Base Lv.75, Job Lv.50, "Dragon Hunt Trial" Quest proof.';
        }

        html += `
          <div class="bg-slate-900/60 p-2.5 rounded border border-slate-800">
            <span class="text-xs font-bold text-slate-100">${tCls.name} (Tier ${tCls.tier})</span>
            <p class="text-[9px] text-slate-400 mt-1">${tCls.description}</p>
            <span class="text-[9px] font-bold text-amber-500 block mt-1">Requires: ${reqMsg}</span>
            <button class="mt-2.5 w-full py-1 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded font-bold text-xs transition ${!canWarp.success ? 'opacity-40 pointer-events-none' : 'animate-pulse'}" data-promote-class="${targetId}">
              Ascend to ${tCls.name}
            </button>
          </div>
        `;
      });

      html += `
        </div>
      `;
    }

    html += `</div>`;
    return html;
  }

  parseNarrativeDesc(desc) {
    if (!desc) return '';
    const regex = /"([^"]+)"/g;
    if (regex.test(desc)) {
      return desc.replace(regex, (match, p1) => {
        return `<blockquote class="border-l-2 border-amber-500 pl-2.5 py-1 italic text-slate-400 my-2 bg-slate-950/40 rounded-r text-[10px] leading-relaxed">"${p1}"</blockquote>`;
      });
    }
    return `<p class="text-[10px] text-slate-400 mt-1">${desc}</p>`;
  }

  // Toggled Admin Suite controls
  initAdminControls() {
    const state = this.state;
    
    // Set Levels Form
    document.getElementById('admin-btn-set-lvl').addEventListener('click', () => {
      const base = parseInt(document.getElementById('admin-input-base-lvl').value) || 1;
      const job = parseInt(document.getElementById('admin-input-job-lvl').value) || 1;
      
      state.character.baseLevel = Math.max(1, Math.min(99, base));
      state.character.jobLevel = Math.max(1, Math.min(50, job));
      
      // Grant arbitrary pool points
      state.character.statPoints = 200;
      state.character.skillPoints = 80;

      state.recalculateStats();
      this.updateHUD();
      this.renderStatusPanel();
      this.renderSkillsPanel();
      this.addLogMessage(`ADMIN: Level modified to Base ${base}, Job ${job}. Granted Stat/Skill pools.`, 'world-boss');
    });

    // Max Zenny cheat
    document.getElementById('admin-btn-zenny').addEventListener('click', () => {
      state.character.zenny = 9999999;
      this.updateHUD();
      this.addLogMessage('ADMIN: Wallet set to 9,999,999 Zenny.', 'world-boss');
    });

    // Teleport Biome selection
    const warpSelect = document.getElementById('admin-warp-select');
    warpSelect.addEventListener('change', (e) => {
      const targetBiome = e.target.value;
      if (BIOMES[targetBiome]) {
        if (this.onWarp) this.onWarp(targetBiome);
      }
    });

    // Class promote override selector
    const classSelect = document.getElementById('admin-class-select');
    // Populate
    classSelect.innerHTML = '<option value="">-- Warp Class Instantly --</option>';
    Object.entries(CLASSES).forEach(([id, info]) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.innerText = `${info.name} (Tier ${info.tier})`;
      classSelect.appendChild(opt);
    });

    classSelect.addEventListener('change', (e) => {
      const targetClass = e.target.value;
      if (CLASSES[targetClass]) {
        state.character.classId = targetClass;
        state.character.jobLevel = 1;
        state.character.jobExp = 0;
        state.recalculateStats();
        
        // Spawn default weapon
        const startWeapon = CLASSES[targetClass].allowedWeapons[0];
        if (startWeapon) {
          state.addItem(startWeapon, 1);
          state.equipItem(startWeapon);
        }

        this.updateHUD();
        this.updateHotkeysUI();
        this.renderQuestsPanel();
        this.renderInventoryPanel();
        this.addLogMessage(`ADMIN: Forced class promotional shift to [${CLASSES[targetClass].name}].`, 'world-boss');
      }
    });

    // Potion/Items spawner dropdown
    const itemSelect = document.getElementById('admin-item-select');
    itemSelect.innerHTML = '<option value="">-- Spawn Item --</option>';
    Object.entries(ITEMS).forEach(([id, info]) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.innerText = `${info.name} (${info.type})`;
      itemSelect.appendChild(opt);
    });

    document.getElementById('admin-btn-spawn-item').addEventListener('click', () => {
      const id = itemSelect.value;
      if (id && ITEMS[id]) {
        state.addItem(id, 5);
        this.updateHotkeysUI();
        this.renderInventoryPanel();
        this.addLogMessage(`ADMIN: Spawned 5 units of [${ITEMS[id].name}] in inventory.`, 'system');
      }
    });

    // Boss/Mob spawner dropdown
    const mobSelect = document.getElementById('admin-mob-select');
    mobSelect.innerHTML = '<option value="">-- Select Monster --</option>';
    Object.entries(MONSTERS).forEach(([id, info]) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.innerText = `${info.name} (Lv. ${info.level})`;
      mobSelect.appendChild(opt);
    });

    document.getElementById('admin-btn-spawn-mob').addEventListener('click', () => {
      const mobTypeId = mobSelect.value;
      const engine = this.getEngine();
      if (mobTypeId && MONSTERS[mobTypeId] && engine) {
        // Spawn at player adjacent grid position
        const rx = Math.max(1, Math.min(engine.cols - 2, engine.player.gridX + 1));
        const ry = Math.max(1, Math.min(engine.rows - 2, engine.player.gridY));
        
        const proto = MONSTERS[mobTypeId];
        
        engine.monsters.push({
          ...proto,
          id: mobTypeId + '_' + Math.random().toString(36).substr(2, 5),
          mobTypeId,
          gridX: rx,
          gridY: ry,
          pixelX: rx * engine.tileSize + engine.tileSize / 2,
          pixelY: ry * engine.tileSize + engine.tileSize / 2,
          hp: proto.maxHp,
          facing: 'down',
          path: [],
          lastWander: 0,
          lastAttackTime: 0,
          aggroTarget: null,
          isBoss: proto.isBoss || false
        });

        this.addLogMessage(`ADMIN: Spawned monster ${proto.name} adjacent to your coordinate.`, 'world-boss');
      }
    });

    // God mode / One punch cheats
    document.getElementById('admin-cheat-god').addEventListener('change', (e) => {
      const checked = e.target.checked;
      if (checked) {
        this.maxHpVal = () => 999999;
        this.state.playerHp = 999999;
        this.addLogMessage('ADMIN CHEAT: GOD MODE ENABLED. HP Locked.', 'world-boss');
      } else {
        this.maxHpVal = () => this.state.maxHp;
        this.state.playerHp = this.state.maxHp;
        this.addLogMessage('ADMIN CHEAT: GOD MODE DISABLED.', 'system');
      }
      this.updateHUD();
    });

    document.getElementById('admin-cheat-kill').addEventListener('change', (e) => {
      const checked = e.target.checked;
      if (checked) {
        this.originalAtkVal = this.state.atk;
        this.state.atk = 999999;
        this.addLogMessage('ADMIN CHEAT: INSTANT KILL ENABLED. ATK boosted to 999,999.', 'world-boss');
      } else {
        this.state.atk = this.originalAtkVal || this.state.atk;
        this.addLogMessage('ADMIN CHEAT: INSTANT KILL DISABLED.', 'system');
      }
      this.renderStatusPanel();
    });
  }

  // Getters for proxy overrides in cheat modes
  maxHpVal() {
    return this.state.maxHp;
  }

  maxSpVal() {
    return this.state.maxSp;
  }

  // Add customized chat message feeds
  addLogMessage(text, type = 'system') {
    const el = document.createElement('div');
    el.className = `chat-line text-xs font-semibold py-0.5 leading-relaxed overflow-hidden text-ellipsis whitespace-nowrap`;
    
    // Color style classes
    if (type === 'system') {
      el.className += ' text-slate-400';
    } else if (type === 'combat-log') {
      el.className += ' text-amber-100';
    } else if (type === 'damage-taken') {
      el.className += ' text-red-400';
    } else if (type === 'loot-log') {
      el.className += ' text-green-400';
    } else if (type === 'spell-log') {
      el.className += ' text-blue-400';
    } else if (type === 'lvl-up') {
      el.className += ' text-yellow-400 font-bold';
    } else if (type === 'guild-chat') {
      el.className += ' text-slate-300';
    } else if (type === 'chat-sim') {
      el.className += ' text-cyan-300';
    } else if (type === 'world-boss') {
      el.className += ' text-yellow-500 font-extrabold animate-pulse';
    } else if (type === 'error') {
      el.className += ' text-rose-500';
    }

    el.innerText = text;
    this.chatLog.appendChild(el);
    
    // Auto-scroll
    this.chatLog.scrollTop = this.chatLog.scrollHeight;
  }

  // ─── Party Panel ────────────────────────────────────────────────────────────
  // ─── Party Panel ────────────────────────────────────────────────────────────
  renderPartyPanel() {
    const p = this.panels.party;
    if (!p) return;
    const engine = this.getEngine();
    const c = this.state.character;
    const cls = CLASSES[c.classId];

    const bots = engine ? engine.simulatedPlayers : [];
    const playerHpPct = engine
      ? Math.round((this.state.playerHp / (this.state.maxHp || 1)) * 100)
      : 100;

    const isPlayerInCombat = engine && engine.player && engine.player.attackTarget;

    const memberRow = (avatar, name, className, hpPct, status, color, inCombat) => `
      <div class="flex items-center gap-3 bg-slate-800/50 rounded-xl p-2.5 border ${
        inCombat ? 'combat-glow-border' : 'border-slate-700/50'
      }">
        <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-inner flex-shrink-0"
             style="background:${color};color:#0f172a">${avatar}</div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-center">
            <span class="text-xs font-bold text-slate-100 truncate">${name}</span>
            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${
              status === 'COMBAT' ? 'bg-red-900/70 text-red-300' : 'bg-slate-700 text-slate-400'
            }">${status}</span>
          </div>
          <div class="text-[9px] text-slate-400 mb-1">${className}</div>
          <div class="w-full h-1.5 bg-slate-950 rounded overflow-hidden">
            <div class="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                 style="width:${hpPct}%"></div>
          </div>
        </div>
      </div>`;

    const botRows = bots.map(bot => {
      const botCls = CLASSES[bot.classId];
      const status = bot.combatTarget ? 'COMBAT' : 'IDLE';
      const botHpPct = Math.max(0, Math.round((bot.hp / (bot.maxHp || 1)) * 100));
      return memberRow('🤖', bot.name.replace(/_\d+$/, ''), botCls?.name || bot.classId, botHpPct, status, bot.appearance?.clothColor || '#1e3a8a', !!bot.combatTarget);
    }).join('');

    p.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-between border-b border-slate-700 pb-2">
          <h3 class="text-sm font-extrabold text-amber-400">⚔️ Dragon Squad</h3>
          <span class="text-[9px] font-mono text-slate-500">${1 + bots.length}/5 Members</span>
        </div>

        ${memberRow('👤', c.name + ' (You)', cls?.name || c.classId, playerHpPct, this.state.playerHp > 0 ? (isPlayerInCombat ? 'COMBAT' : 'ACTIVE') : 'DEAD', c.appearance?.clothColor || '#3b82f6', isPlayerInCombat)}
        ${botRows || '<p class="text-xs text-slate-500 italic text-center py-2">No party members on current map.</p>'}

        <div class="flex gap-2 mt-2">
          <button id="party-ping-btn" class="flex-1 py-2 bg-amber-600/20 hover:bg-amber-600/40 border border-amber-700/50 text-amber-300 rounded-xl text-xs font-bold transition">
            📣 Ping Party
          </button>
          <button id="party-leave-btn" class="flex-1 py-2 bg-rose-600/20 hover:bg-rose-600/40 border border-rose-700/50 text-rose-300 rounded-xl text-xs font-bold transition">
            Leave Party
          </button>
        </div>
      </div>`;

    document.getElementById('party-ping-btn')?.addEventListener('click', () => {
      this.addLogMessage(`[Party] ${c.name} pinged the party! 📣`, 'world');
      audioSystem.playSFX('cast');
    });

    document.getElementById('party-leave-btn')?.addEventListener('click', () => {
      if (engine) {
        engine.simulatedPlayers = [];
        this.addLogMessage(`[Party] You left the party.`, 'system');
        audioSystem.playSFX('refine_break');
        this.renderPartyPanel();
      }
    });
  }

  // ─── NPC Dialogue Modal ──────────────────────────────────────────────────────
  showNPCDialog(npcName, biomeId) {
    // Remove any existing modal
    document.getElementById('npc-dialog-modal')?.remove();

    const NPC_DIALOGUES = {
      'Explorer Tira': [
        '"Hero! The Volcanic Hatchery is swarming with hatchlings. The Red Fire Dragon hasn\'t been spotted in days... but I can feel the heat rising."',
        '"Be careful of the lava flows near the eastern wall. One wrong step and you\'ll be ash before you can scream."',
        '"Bring me proof you\'ve faced the Red Fire Dragon, and I\'ll share the secret passage to the Dragon Peak summit."'
      ],
      'Fire Sage Brun': [
        '"The dragon eggs here burn with primordial fire. To tame one, you must first prove your strength by defeating the Red Fire Dragon!"',
        '"I have walked these volcanic halls for twenty years. The lava speaks to those who listen — and right now it screams of a great battle to come."',
        '"Bring me 5 Dragon Scales and I\'ll teach you the ancient art of Dragon Bonding. Power beyond your wildest dreams awaits."'
      ],
      'Sky Warden Kara': [
        '"The Golden Drake has been silent for three suns. But last night, the mountain itself trembled. Something stirs at the summit."',
        '"Only the strongest adventurers have ever reached Dragon Peak. Turn back while you still can — or proceed and claim eternal glory."',
        '"I\'ve seen a hundred warriors ascend this peak. Only three ever returned. You look like you could be the fourth."'
      ],
      'Veteran Dragon Hunter Zenn': [
        '"I\'ve hunted dragons for forty years. The Golden Drake is unlike anything I\'ve faced. Its scales deflect steel like paper."',
        '"If you\'re heading to fight it, equip Dragon Slayer gear. You\'ll need every advantage the gods can grant you."',
        '"This is it," he says, placing a scarred hand on your shoulder. "The Golden Drake awaits at the summit. Bring glory to the Guild — or join the countless who came before you."'
      ],
    };

    const cleanName = Object.keys(NPC_DIALOGUES).find(k =>
      npcName.toLowerCase().includes(k.toLowerCase().split(' ')[0].toLowerCase())
    ) || null;

    const lines = cleanName
      ? NPC_DIALOGUES[cleanName]
      : [
          `"Greetings, adventurer! The road ahead is dangerous — stay vigilant."`,
          `"If you\'re looking for work, check the Adventure Guild Board in town."`,
          `"Safe travels. May your blade stay sharp and your heart stay courageous."`
        ];

    let lineIndex = 0;

    const modal = document.createElement('div');
    modal.id = 'npc-dialog-modal';
    modal.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;width:min(600px,90vw)';
    modal.innerHTML = `
      <div style="background:linear-gradient(135deg,#0f172a 80%,#1e293b);border:2px solid rgba(234,179,8,0.5);border-radius:16px;padding:20px 24px;box-shadow:0 20px 60px rgba(0,0,0,0.8);position:relative">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#92400e,#b45309);border:2px solid rgba(234,179,8,0.6);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">🧙</div>
          <div>
            <div style="font-size:13px;font-weight:800;color:#fcd34d;letter-spacing:0.05em">${cleanName || npcName}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px">${BIOMES[biomeId]?.name || biomeId}</div>
          </div>
          <button id="npc-dialog-close" style="position:absolute;top:12px;right:14px;background:none;border:none;color:#64748b;font-size:18px;cursor:pointer;line-height:1">✕</button>
        </div>
        <p id="npc-dialog-text" style="font-size:13px;color:#e2e8f0;line-height:1.7;min-height:60px;font-style:italic"></p>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px">
          <span id="npc-dialog-counter" style="font-size:10px;color:#475569">1 / ${lines.length}</span>
          <button id="npc-dialog-next" style="background:linear-gradient(90deg,#b45309,#d97706);border:none;color:#0f172a;font-weight:800;font-size:12px;padding:7px 20px;border-radius:8px;cursor:pointer;letter-spacing:0.06em">NEXT ▶</button>
        </div>
      </div>`;

    document.body.appendChild(modal);

    const textEl = document.getElementById('npc-dialog-text');
    const counterEl = document.getElementById('npc-dialog-counter');
    const nextBtn = document.getElementById('npc-dialog-next');
    const closeBtn = document.getElementById('npc-dialog-close');

    const showLine = (i) => {
      textEl.textContent = lines[i];
      counterEl.textContent = `${i + 1} / ${lines.length}`;
      nextBtn.textContent = i < lines.length - 1 ? 'NEXT ▶' : 'FAREWELL';
    };

    showLine(0);

    nextBtn.addEventListener('click', () => {
      lineIndex++;
      if (lineIndex >= lines.length) {
        modal.remove();
      } else {
        showLine(lineIndex);
      }
    });

    closeBtn.addEventListener('click', () => modal.remove());
  }
}
