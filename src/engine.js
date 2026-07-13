// Canvas Game Engine for Ragnarok-style 2D Action RPG
// Handles tilemap rendering, player & monster sprites, pathfinding, simulated players, combat, particles, and floating text

import { BIOMES, MONSTERS, ITEMS, CLASSES, SKILL_TREE } from './database.js';
import { audioSystem } from './audio.js';

export class GameEngine {
  constructor(canvas, state, onLogCallback, onQuestProgressCallback) {
    if (typeof window !== 'undefined') {
      window.gameEngine = this;
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.onLog = onLogCallback;
    this.onQuestProgress = onQuestProgressCallback;

    // Grid config
    this.tileSize = 40;
    this.cols = 28;
    this.rows = 18;

    this.canvas.width = this.cols * this.tileSize;
    this.canvas.height = this.rows * this.tileSize;

    // Entities
    this.player = {
      gridX: 5,
      gridY: 5,
      pixelX: 5 * this.tileSize + this.tileSize / 2,
      pixelY: 5 * this.tileSize + this.tileSize / 2,
      targetX: null,
      targetY: null,
      path: [],
      facing: 'down',
      isMoving: false,
      lastAttackTime: 0,
      attackTarget: null,
      harvestTarget: null,
      harvestProgress: 0, // 0 to 100
      buffs: {} // Blessing, Agi up
    };

    this.monsters = [];
    this.simulatedPlayers = [];
    this.gatheringNodes = [];
    this.particles = [];
    this.floatingTexts = [];
    this.projectiles = [];

    // Interaction states
    this.hoverTile = null;
    this.onNPCInteract = null; // callback: (npcName, biomeId) => void

    // Pathfinding map (0 = walkable, 1 = obstacle)
    this.obstacleGrid = Array(this.rows).fill(0).map(() => Array(this.cols).fill(0));
    this.generateObstacles();

    // Spawn initial entities
    this.changeBiome(this.state.currentBiome);

    // Bind event listeners
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));

    // Simulated chat generation rate
    this.lastChatTime = 0;
    this.chatInterval = 10000; // 10s base

    // Map time loops
    this.lastLoopTime = performance.now();
    this.gameLoop = this.gameLoop.bind(this);
    this.running = true;
    requestAnimationFrame(this.gameLoop);
  }

  destroy() {
    this.running = false;
  }

  // Populate map layout
  generateObstacles() {
    this.obstacleGrid = Array(this.rows).fill(0).map(() => Array(this.cols).fill(0));
    
    // Add border walls
    for (let r = 0; r < this.rows; r++) {
      this.obstacleGrid[r][0] = 1;
      this.obstacleGrid[r][this.cols - 1] = 1;
    }
    for (let c = 0; c < this.cols; c++) {
      this.obstacleGrid[0][c] = 1;
      this.obstacleGrid[this.rows - 1][c] = 1;
    }

    // Add some random static structures/rocks
    // Seeded-like so it looks consistent per map
    let seed = 4;
    for (let i = 0; i < 15; i++) {
      const x = Math.floor(Math.abs(Math.sin(seed++)) * (this.cols - 4)) + 2;
      const y = Math.floor(Math.abs(Math.cos(seed++)) * (this.rows - 4)) + 2;
      // Do not block player spawn zone
      if (Math.abs(x - 5) > 2 || Math.abs(y - 5) > 2) {
        this.obstacleGrid[y][x] = 1;
      }
    }
  }

  changeBiome(biomeId) {
    this.state.currentBiome = biomeId;
    this.generateObstacles();

    // Stamp biome-specific obstacle tiles (lava / cloud)
    const biome = BIOMES[biomeId];
    if (biome && biome.obstacles) {
      for (const group of biome.obstacles) {
        for (const [col, row] of group.positions) {
          if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            // Store tile type so render can color it, block movement
            this.obstacleGrid[row][col] = group.type === 'lava' ? 2 : 3; // 2=lava 3=cloud
          }
        }
      }
    }

    this.player.gridX = 5;
    this.player.gridY = 5;
    this.player.pixelX = 5 * this.tileSize + this.tileSize / 2;
    this.player.pixelY = 5 * this.tileSize + this.tileSize / 2;
    this.player.path = [];
    this.player.attackTarget = null;
    this.player.harvestTarget = null;

    this.monsters = [];
    this.simulatedPlayers = [];
    this.gatheringNodes = [];
    this.particles = [];
    this.floatingTexts = [];
    this.projectiles = [];
    this.mvpBossAlive = false;
    this.lastLavaDmgTime = 0;

    // Spawn monsters
    const mobCount = biomeId === 'geffen' ? 12 : 8;
    for (let i = 0; i < mobCount; i++) {
      this.spawnMonster(false);
    }

    // Spawn hardcoded MVPs
    if (biomeId === 'sograt') {
      this.spawnMVP('golden_bug', 15, 9);
    } else if (biomeId === 'geffen') {
      this.spawnMVP('baphomet', 16, 10);
    } else if (biome && biome.mvpBoss) {
      // Spawn inline biome MVP boss
      this.spawnBiomeMVP(biome.mvpBoss, 14, 8);
    }

    // Spawn simulated players
    for (let i = 0; i < 4; i++) this.spawnSimulatedPlayer();

    // Spawn gathering nodes
    for (let i = 0; i < 5; i++) this.spawnGatheringNode();

    this.onLog(`System: WARPED to map [${biome.name}]. Recommended: ${biome.difficulty}.`, 'system');
    if (biome && biome.musicTheme) audioSystem.playBGM(biome.musicTheme);
  }

  spawnMonster(isBoss = false) {
    const biome = BIOMES[this.state.currentBiome];
    let mobPool = biome.monsterSpawns;
    
    if (isBoss) return; // Handled separately
    
    const mobId = mobPool[Math.floor(Math.random() * mobPool.length)];
    const proto = MONSTERS[mobId];
    if (!proto) return;

    // Find a free spot
    let spawnSpot = this.getRandomFreeSpot();
    if (!spawnSpot) return;

    this.monsters.push({
      ...proto,
      id: mobId + '_' + Math.random().toString(36).substr(2, 5),
      mobTypeId: mobId,
      gridX: spawnSpot.x,
      gridY: spawnSpot.y,
      pixelX: spawnSpot.x * this.tileSize + this.tileSize / 2,
      pixelY: spawnSpot.y * this.tileSize + this.tileSize / 2,
      hp: proto.maxHp,
      facing: 'down',
      path: [],
      lastWander: 0,
      lastAttackTime: 0,
      aggroTarget: null,
      isBoss: false
    });
  }

  spawnMVP(bossId, x, y) {
    const proto = MONSTERS[bossId];
    if (!proto) return;
    this.monsters.push({
      ...proto,
      id: bossId + '_mvp',
      mobTypeId: bossId,
      gridX: x,
      gridY: y,
      pixelX: x * this.tileSize + this.tileSize / 2,
      pixelY: y * this.tileSize + this.tileSize / 2,
      hp: proto.maxHp,
      facing: 'down',
      path: [],
      lastWander: 0,
      lastAttackTime: 0,
      aggroTarget: null,
      isBoss: true
    });
    this.mvpBossAlive = true;
    this.onLog(`📢 WORLD ANNOUNCEMENT: MVP Boss ${proto.name} has spawned in the area!`, 'world-boss');
  }

  // Spawn an inline MVP boss defined directly in the biome config
  spawnBiomeMVP(bossConfig, x, y) {
    const spot = this.getRandomFreeSpot() || { x, y };
    const px = spot.x * this.tileSize + this.tileSize / 2;
    const py = spot.y * this.tileSize + this.tileSize / 2;
    this.monsters.push({
      ...bossConfig,
      id: bossConfig.id + '_mvp',
      mobTypeId: bossConfig.id,
      gridX: spot.x,
      gridY: spot.y,
      pixelX: px,
      pixelY: py,
      hp: bossConfig.maxHp,
      facing: 'down',
      path: [],
      lastWander: 0,
      lastAttackTime: 0,
      aggroTarget: null,
      isBoss: true
    });
    this.mvpBossAlive = true;
    this.onLog(`📢 WORLD ANNOUNCEMENT: MVP Boss [${bossConfig.name}] has appeared in ${BIOMES[this.state.currentBiome]?.name}!`, 'world-boss');
  }

  spawnSimulatedPlayer() {
    const classes = ['swordman', 'mage', 'acolyte', 'thief', 'archer', 'knight', 'wizard', 'priest', 'assassin', 'hunter'];
    const selectedClass = classes[Math.floor(Math.random() * classes.length)];
    const hairColors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899', '#ffffff'];
    const clothColors = ['#1e3a8a', '#14532d', '#701a75', '#7c2d12', '#0f172a', '#e2e8f0'];
    const biome = BIOMES[this.state.currentBiome];
    const name = biome.npcNames[Math.floor(Math.random() * biome.npcNames.length)] + '_' + Math.floor(Math.random()*100);

    const spawnSpot = this.getRandomFreeSpot();
    if (!spawnSpot) return;

    this.simulatedPlayers.push({
      name,
      classId: selectedClass,
      gender: Math.random() > 0.5 ? 'male' : 'female',
      appearance: {
        hair: Math.floor(Math.random() * 4) + 1,
        hairColor: hairColors[Math.floor(Math.random() * hairColors.length)],
        clothColor: clothColors[Math.floor(Math.random() * clothColors.length)]
      },
      gridX: spawnSpot.x,
      gridY: spawnSpot.y,
      pixelX: spawnSpot.x * this.tileSize + this.tileSize / 2,
      pixelY: spawnSpot.y * this.tileSize + this.tileSize / 2,
      path: [],
      targetX: null,
      targetY: null,
      facing: 'down',
      isMoving: false,
      lastAction: 0,
      actionCooldown: 2000 + Math.random() * 3000,
      combatTarget: null,
      hp: 500 + Math.random() * 2000,
      maxHp: 2500,
      buffs: {}
    });
  }

  spawnGatheringNode() {
    const biome = BIOMES[this.state.currentBiome];
    const nodeId = biome.gatheringNodes[Math.floor(Math.random() * biome.gatheringNodes.length)];
    
    // Config names
    let nodeName = 'Gathering Node';
    let nodeColor = '#3b82f6';
    if (nodeId === 'wood_log' || nodeId === 'bamboo_shoot') {
      nodeName = 'Timber Logs';
      nodeColor = '#78350f';
    } else if (nodeId.endsWith('_herb')) {
      nodeName = nodeId === 'blue_herb' ? 'Blue Herbs' : nodeId === 'red_herb' ? 'Red Herbs' : 'Herbs';
      nodeColor = nodeId === 'blue_herb' ? '#3b82f6' : nodeId === 'red_herb' ? '#ef4444' : '#facc15';
    } else if (nodeId === 'iron_ore' || nodeId === 'gold_ore') {
      nodeName = nodeId === 'gold_ore' ? 'Gold Vein' : 'Iron Ore Vein';
      nodeColor = nodeId === 'gold_ore' ? '#facc15' : '#64748b';
    } else if (nodeId === 'frost_crystal') {
      nodeName = 'Frost Crystal';
      nodeColor = '#a5f3fc';
    }

    const spawnSpot = this.getRandomFreeSpot();
    if (!spawnSpot) return;

    this.gatheringNodes.push({
      id: nodeId + '_' + Math.random().toString(36).substr(2, 5),
      nodeTypeId: nodeId,
      name: nodeName,
      color: nodeColor,
      gridX: spawnSpot.x,
      gridY: spawnSpot.y,
      pixelX: spawnSpot.x * this.tileSize + this.tileSize / 2,
      pixelY: spawnSpot.y * this.tileSize + this.tileSize / 2,
      health: 100 // takes clicks
    });
  }

  getRandomFreeSpot() {
    for (let attempts = 0; attempts < 50; attempts++) {
      const x = Math.floor(Math.random() * (this.cols - 2)) + 1;
      const y = Math.floor(Math.random() * (this.rows - 2)) + 1;
      
      if (this.obstacleGrid[y][x] !== 0) continue;

      // Check overlap with other monsters/nodes
      const matches = [
        ...this.monsters, 
        ...this.gatheringNodes, 
        ...this.simulatedPlayers,
        this.player
      ].some(e => e.gridX === x && e.gridY === y);
      
      if (!matches) {
        return { x, y };
      }
    }
    return null;
  }

  // Pathfinding: Simple BFS algorithm for clean grid movement
  findPath(startX, startY, endX, endY) {
    if (endX < 0 || endX >= this.cols || endY < 0 || endY >= this.rows) return [];
    if (this.obstacleGrid[endY][endX] !== 0) return [];

    const queue = [[startX, startY]];
    const visited = Array(this.rows).fill(null).map(() => Array(this.cols).fill(false));
    visited[startY][startX] = true;
    
    const parent = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));

    let found = false;
    while (queue.length > 0) {
      const [cx, cy] = queue.shift();
      if (cx === endX && cy === endY) {
        found = true;
        break;
      }

      // Directions: Orthogonal grid movement
      const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        
        if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
          if (!visited[ny][nx] && this.obstacleGrid[ny][nx] === 0) {
            visited[ny][nx] = true;
            parent[ny][nx] = [cx, cy];
            queue.push([nx, ny]);
          }
        }
      }
    }

    if (!found) return [];

    // Reconstruct path
    const path = [];
    let curr = [endX, endY];
    while (curr[0] !== startX || curr[1] !== startY) {
      path.push(curr);
      curr = parent[curr[1]][curr[0]];
    }
    path.reverse();
    return path;
  }

  // Clicks & Actions
  handleCanvasClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const gridX = Math.floor(x / this.tileSize);
    const gridY = Math.floor(y / this.tileSize);

    // Cancel current interactions
    this.player.attackTarget = null;
    this.player.harvestTarget = null;

    // Check click on monsters
    const targetMonster = this.monsters.find(m => m.gridX === gridX && m.gridY === gridY);
    if (targetMonster) {
      this.player.attackTarget = targetMonster;
      this.onLog(`Targeting monster: [${targetMonster.name}] Base Level ${targetMonster.level}`, 'combat-log');
      
      // Calculate path to monster (or adjacent)
      const path = this.findPath(this.player.gridX, this.player.gridY, gridX, gridY);
      if (path.length > 0) {
        // Pop the final node so we stop just in front of it
        path.pop();
        this.player.path = path;
      }
      return;
    }

    // Check click on gathering node
    const targetNode = this.gatheringNodes.find(n => n.gridX === gridX && n.gridY === gridY);
    if (targetNode) {
      this.player.harvestTarget = targetNode;
      this.player.harvestProgress = 0;
      this.onLog(`Targeting resource: [${targetNode.name}]`, 'gather-log');

      const path = this.findPath(this.player.gridX, this.player.gridY, gridX, gridY);
      if (path.length > 0) {
        path.pop(); // stand next to it
        this.player.path = path;
      }
      return;
    }

    // Check click on NPC (simulated player) within 2 tiles — open dialogue
    const biome = BIOMES[this.state.currentBiome];
    const nearbyNPC = this.simulatedPlayers.find(sp =>
      Math.abs(sp.gridX - gridX) <= 1 && Math.abs(sp.gridY - gridY) <= 1
    );
    if (nearbyNPC && this.onNPCInteract) {
      // Resolve canonical NPC name from biome npcNames list
      const npcNames = biome?.npcNames || [];
      const matchedName = npcNames.find(n => nearbyNPC.name.startsWith(n.replace(/ /g, '_'))) ||
                          nearbyNPC.name.replace(/_\d+$/, '').replace(/_/g, ' ');
      this.onNPCInteract(matchedName, this.state.currentBiome);
      this.onLog(`[NPC] Talking to ${matchedName}...`, 'system');
      return;
    }

    // Standard ground move
    const path = this.findPath(this.player.gridX, this.player.gridY, gridX, gridY);
    if (path.length > 0) {
      this.player.path = path;
      
      // Spawn simple click indicator particle
      this.spawnGridClickEffect(gridX, gridY);
    }
  }

  handleCanvasMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const gridX = Math.floor(x / this.tileSize);
    const gridY = Math.floor(y / this.tileSize);

    if (gridX >= 0 && gridX < this.cols && gridY >= 0 && gridY < this.rows) {
      this.hoverTile = { x: gridX, y: gridY };
    } else {
      this.hoverTile = null;
    }
  }

  // Active skill usage via hotkeys
  castSkill(skillIndex) {
    const c = this.state.character;
    const activeSkills = (SKILL_TREE[c.classId] || []).filter(s => s.type === 'active');
    const skill = activeSkills[skillIndex];
    
    if (!skill) {
      this.onLog('System: No skill mapped to this slot.', 'error');
      return;
    }

    const skillLvl = c.skills[skill.id] || 0;
    if (skillLvl <= 0) {
      this.onLog(`System: You have not unlocked ${skill.name} yet!`, 'error');
      return;
    }

    // Cost verification
    const spCost = (skill.baseSpCost || 5) + (skillLvl * 2);
    if (this.state.playerSp < spCost) {
      this.onLog('System: Insufficient SP!', 'error');
      return;
    }

    const mountedSkills = ['dragon_breath', 'mounted_barrage', 'draconic_shield'];
    if (mountedSkills.includes(skill.id) && !c.mounted) {
      this.onLog(`System: You must be mounted to cast [${skill.name}]!`, 'error');
      return;
    }

    // Skill targeting & effect triggers
    if (skill.id === 'first_aid' || skill.id === 'heal') {
      // Self heals
      this.state.playerSp -= spCost;
      let healAmt = 0;
      if (skill.id === 'first_aid') {
        healAmt = 15 + skillLvl * 5;
      } else {
        // Heal based on INT
        healAmt = Math.floor(100 + skillLvl * 35 + c.stats.int * 5);
      }
      
      this.state.playerHp = Math.min(this.state.maxHp, this.state.playerHp + healAmt);
      this.addFloatingText(this.player.pixelX, this.player.pixelY - 20, `+${healAmt}`, '#22c55e', 22);
      this.spawnParticleEffect(this.player.pixelX, this.player.pixelY, '#a7f3d0', 20);
      this.onLog(`Cast: ${skill.name} Lv.${skillLvl}! Recovered +${healAmt} HP.`, 'spell-log');
      audioSystem.playSFX('heal');
    } 
    else if (skill.id === 'play_dead') {
      this.state.playerSp -= spCost;
      this.player.attackTarget = null;
      this.player.path = [];
      this.addFloatingText(this.player.pixelX, this.player.pixelY - 20, 'PLAY DEAD!', '#64748b', 16);
      this.spawnParticleEffect(this.player.pixelX, this.player.pixelY, '#cbd5e1', 10);
      this.onLog('Cast: Played Dead. Monsters ignored you.', 'spell-log');
      audioSystem.playSFX('cast');
    }
    else if (skill.id === 'blessing' || skill.id === 'increase_agi') {
      this.state.playerSp -= spCost;
      this.player.buffs[skill.id] = {
        lvl: skillLvl,
        expiry: Date.now() + 60000 // 60s buff
      };
      
      // Calculate buffs immediately
      this.state.recalculateStats();

      const color = skill.id === 'blessing' ? '#facc15' : '#60a5fa';
      this.addFloatingText(this.player.pixelX, this.player.pixelY - 20, skill.id.toUpperCase(), color, 16);
      this.spawnParticleEffect(this.player.pixelX, this.player.pixelY, color, 15);
      this.onLog(`Cast: Applied [${skill.name} Lv.${skillLvl}] buff for 60s!`, 'spell-log');
      audioSystem.playSFX('heal');
    }
    else if (skill.id === 'draconic_shield') {
      this.state.playerSp -= spCost;
      this.player.buffs[skill.id] = {
        lvl: skillLvl,
        expiry: Date.now() + 30000 // 30s shield duration
      };
      this.state.recalculateStats();
      
      const healAmt = Math.floor(150 + skillLvl * 45 + c.stats.vit * 3);
      this.state.playerHp = Math.min(this.state.maxHp, this.state.playerHp + healAmt);
      
      this.addFloatingText(this.player.pixelX, this.player.pixelY - 20, 'DRACONIC SHIELD', '#10b981', 16);
      this.spawnParticleEffect(this.player.pixelX, this.player.pixelY, '#10b981', 15);
      this.onLog(`Cast: Summoned [Draconic Shield Lv.${skillLvl}] (+DEF & healed +${healAmt} HP).`, 'spell-log');
      audioSystem.playSFX('heal');
    }
    else {
      // Offensive spells (bash, magnum_break, fire_bolt, double_strafe, sonic_blow, bowling_bash, storm_gust)
      // Requires target
      let target = this.player.attackTarget;
      if (!target && this.monsters.length > 0) {
        // Pick nearest monster
        let minDist = Infinity;
        for (const mob of this.monsters) {
          const d = Math.abs(mob.gridX - this.player.gridX) + Math.abs(mob.gridY - this.player.gridY);
          if (d < minDist) {
            minDist = d;
            target = mob;
          }
        }
        this.player.attackTarget = target;
      }

      if (!target) {
        this.onLog('System: No target for offensive skill.', 'error');
        return;
      }

      // Check distance
      const dist = Math.abs(target.gridX - this.player.gridX) + Math.abs(target.gridY - this.player.gridY);
      const isSpellRanged = skill.id.includes('bolt') || skill.id.includes('strafe') || skill.id.includes('storm') || skill.id.includes('gust');
      const maxDist = isSpellRanged ? 6 : 2;

      if (dist > maxDist) {
        this.onLog(`System: Target too far away for ${skill.name}. Walk closer.`, 'error');
        return;
      }

      // Execute attack
      this.state.playerSp -= spCost;
      this.executeOffensiveSkill(skill, skillLvl, target);
    }
    
    this.state.save();
  }

  executeOffensiveSkill(skill, lvl, target) {
    const c = this.state.character;
    audioSystem.playSFX('cast');
    
    // Spell casting delay animation
    let damage = 0;
    let spellColor = '#ffffff';
    let isCritical = false;

    if (skill.id === 'bash') {
      const multiplier = 1.3 + lvl * 0.2; // 130% - 330% ATK
      damage = Math.floor(this.state.atk * multiplier);
      spellColor = '#ef4444';
    } 
    else if (skill.id === 'magnum_break') {
      // Area slam
      damage = Math.floor(this.state.atk * (1.5 + lvl * 0.15));
      spellColor = '#ea580c'; // Orange fire
      // Splash damage on adjacent mobs
      this.spawnParticleEffect(this.player.pixelX, this.player.pixelY, '#ea580c', 35);
      for (const m of this.monsters) {
        if (m.id !== target.id && Math.abs(m.gridX - this.player.gridX) <= 1 && Math.abs(m.gridY - this.player.gridY) <= 1) {
          const spl = Math.floor(damage * 0.7);
          m.hp -= Math.max(1, spl - m.def);
          this.addFloatingText(m.pixelX, m.pixelY, `${spl}`, '#f97316', 15);
        }
      }
    }
    else if (skill.id === 'fire_bolt' || skill.id === 'cold_bolt') {
      const bolts = lvl;
      const baseDmg = Math.floor(this.state.matk * 1.2);
      damage = baseDmg * bolts;
      spellColor = skill.id === 'fire_bolt' ? '#f97316' : '#3b82f6';
      
      // Projectiles visually fired
      for (let i = 0; i < bolts; i++) {
        this.projectiles.push({
          startX: this.player.pixelX,
          startY: this.player.pixelY,
          endX: target.pixelX,
          endY: target.pixelY,
          color: spellColor,
          delay: i * 150,
          speed: 8,
          progress: 0
        });
      }
    }
    else if (skill.id === 'double_strafe') {
      damage = Math.floor(this.state.atk * (1.8 + lvl * 0.2));
      spellColor = '#facc15';
      // Fire 2 rapid arrows
      for (let i = 0; i < 2; i++) {
        this.projectiles.push({
          startX: this.player.pixelX,
          startY: this.player.pixelY,
          endX: target.pixelX,
          endY: target.pixelY,
          color: '#e2e8f0',
          delay: i * 100,
          speed: 12,
          progress: 0
        });
      }
    }
    else if (skill.id === 'sonic_blow') {
      damage = Math.floor(this.state.atk * (6.0 + lvl * 0.6));
      spellColor = '#701a75'; // Poison purple
      isCritical = true;
      // Many slashing lines on target
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          if (target && target.hp > 0) {
            this.spawnSlashEffect(target.pixelX, target.pixelY, '#a21caf');
          }
        }, i * 80);
      }
    }
    else if (skill.id === 'bowling_bash') {
      damage = Math.floor(this.state.atk * (5.0 + lvl * 0.5));
      spellColor = '#dc2626';
      // Knockback target grid
      const dx = Math.sign(target.gridX - this.player.gridX);
      const dy = Math.sign(target.gridY - this.player.gridY);
      this.knockbackEntity(target, dx, dy, 2);
    }
    else if (skill.id === 'storm_gust' || skill.id === 'meteor_storm') {
      // Large heavy AOE spells
      damage = Math.floor(this.state.matk * (3.0 + lvl * 0.4));
      spellColor = skill.id === 'storm_gust' ? '#a5f3fc' : '#ea580c';
      this.spawnParticleEffect(target.pixelX, target.pixelY, spellColor, 40);
    }
    else if (skill.id === 'dragon_breath') {
      audioSystem.playFireBreath();
      damage = Math.floor(this.state.atk * (2.0 + lvl * 0.5));
      spellColor = '#ea580c';
      this.spawnParticleEffect(target.pixelX, target.pixelY, '#ea580c', 25);
      
      // Adjacent splash damage within 1 tile — iterate a snapshot to avoid mutating while iterating
      const splashTargets = this.monsters.filter(m =>
        m.id !== target.id &&
        Math.abs(m.gridX - target.gridX) <= 1 &&
        Math.abs(m.gridY - target.gridY) <= 1
      );
      for (const m of splashTargets) {
        const splashDmg = Math.floor(damage * 0.5);
        m.hp -= Math.max(1, splashDmg - m.def);
        this.addFloatingText(m.pixelX, m.pixelY, `${splashDmg}`, '#f97316', 15);
        if (m.hp <= 0) {
          this.handleMonsterDeath(m);
        }
      }
    }
    else if (skill.id === 'mounted_barrage') {
      const hits = 5;
      const baseDmg = Math.floor(this.state.atk * (0.6 + lvl * 0.15));
      damage = baseDmg * hits;
      spellColor = '#facc15';
      for (let i = 0; i < hits; i++) {
        this.projectiles.push({
          startX: this.player.pixelX,
          startY: this.player.pixelY,
          endX: target.pixelX,
          endY: target.pixelY,
          color: '#facc15',
          delay: i * 80,
          speed: 14,
          progress: 0
        });
      }
    }
    else {
      // General fallbacks
      damage = Math.floor(this.state.atk * 1.5);
    }

    // Apply defenses
    let finalDmg = damage;
    if (skill.id.includes('bolt') || skill.id === 'storm_gust' || skill.id === 'meteor_storm') {
      finalDmg = Math.max(1, finalDmg - (target.mdef || 0));
    } else {
      finalDmg = Math.max(1, finalDmg - target.def);
    }

    // Scale damage dealt by Dragon Slayer classes against dragon monsters (+50%)
    if (['dragon_knight', 'wyvern_hunter', 'dragon_shaman', 'dragon_arcanist', 'dragon_executioner'].includes(this.state.character.classId) && target.type === 'dragon') {
      finalDmg = Math.floor(finalDmg * 1.5);
    }

    target.hp -= finalDmg;
    audioSystem.playSFX('slash');
    
    // Add floating text
    const txtColor = isCritical ? '#dc2626' : '#ffffff';
    const txtSize = isCritical ? 24 : 18;
    this.addFloatingText(target.pixelX, target.pixelY - 15, `${finalDmg}${isCritical ? ' (CRIT!)' : ''}`, txtColor, txtSize);
    this.spawnParticleEffect(target.pixelX, target.pixelY, spellColor, 15);
    this.onLog(`[Combat] Cast ${skill.name} dealing ${finalDmg} damage to ${target.name}.`, 'combat-log');

    // Trigger target aggro on player
    target.aggroTarget = this.player;

    if (target.hp <= 0) {
      this.handleMonsterDeath(target);
    }
  }

  knockbackEntity(entity, dx, dy, distance) {
    let targetX = entity.gridX + dx * distance;
    let targetY = entity.gridY + dy * distance;
    
    // Clamp to map boundaries
    targetX = Math.max(1, Math.min(this.cols - 2, targetX));
    targetY = Math.max(1, Math.min(this.rows - 2, targetY));

    if (this.obstacleGrid[targetY][targetX] === 0) {
      entity.gridX = targetX;
      entity.gridY = targetY;
      entity.pixelX = targetX * this.tileSize + this.tileSize / 2;
      entity.pixelY = targetY * this.tileSize + this.tileSize / 2;
    }
  }

  // Combat Attack hits
  performPhysicalAttack() {
    const target = this.player.attackTarget;
    if (!target || target.hp <= 0) {
      this.player.attackTarget = null;
      return;
    }

    // Hit check using hit vs flee
    const hitChance = Math.max(5, Math.min(95, this.state.hit - target.flee));
    const roll = Math.random() * 100;
    
    if (roll > hitChance) {
      // Missed
      this.addFloatingText(target.pixelX, target.pixelY - 10, 'MISS', '#94a3b8', 16);
      this.onLog(`[Combat] You attacked ${target.name} but MISSED.`, 'combat-log');
      audioSystem.playSFX('gather'); // miss sound
      return;
    }

    // Critical rate check
    const isCrit = Math.random() * 100 < this.state.critical;
    
    let baseDamage = this.state.atk;
    
    // Double Attack Passive for Thief/Assassin using Daggers
    const isDagger = ITEMS[this.state.character.equipment.weapon]?.reqClass === 'thief' || this.state.character.classId === 'novice';
    let isDouble = false;
    if (isDagger && this.state.character.skills.double_attack) {
      const doubleChance = this.state.character.skills.double_attack * 5;
      if (Math.random() * 100 < doubleChance) {
        isDouble = true;
      }
    }

    if (isCrit) {
      baseDamage = Math.floor(baseDamage * 1.5);
    }

    if (this.state.character.mounted && this.state.character.equipment.mount) {
      const mountId = typeof this.state.character.equipment.mount === 'string'
        ? this.state.character.equipment.mount
        : this.state.character.equipment.mount.id;
      if (mountId === 'fire_drake') {
        baseDamage = Math.floor(baseDamage * 1.15);
        // Spawn orange fire particles on hit
        this.spawnParticleEffect(target.pixelX, target.pixelY, '#ea580c', 3);
      }
    }

    let finalDmg = Math.max(1, baseDamage - target.def);
    if (isDouble) {
      finalDmg *= 2;
    }

    // Scale damage dealt by Dragon Slayer classes against dragon monsters (+50%)
    if (['dragon_knight', 'wyvern_hunter', 'dragon_shaman', 'dragon_arcanist', 'dragon_executioner'].includes(this.state.character.classId) && target.type === 'dragon') {
      finalDmg = Math.floor(finalDmg * 1.5);
    }

    target.hp -= finalDmg;
    audioSystem.playSFX('slash');

    // Show floating number
    const dmgTxt = isDouble ? `${finalDmg} (Double!)` : isCrit ? `${finalDmg} (CRIT!)` : `${finalDmg}`;
    const dmgColor = isCrit ? '#eab308' : '#ffffff';
    this.addFloatingText(target.pixelX, target.pixelY - 15, dmgTxt, dmgColor, isCrit ? 22 : 17);
    this.spawnSlashEffect(target.pixelX, target.pixelY, isCrit ? '#facc15' : '#cbd5e1');

    this.onLog(`[Combat] You hit ${target.name} for ${finalDmg} damage.`, 'combat-log');

    // Draw simple projectile if ranged
    const weaponId = this.state.character.equipment.weapon;
    const isRanged = weaponId && ITEMS[weaponId]?.reqClass === 'archer';
    if (isRanged) {
      this.projectiles.push({
        startX: this.player.pixelX,
        startY: this.player.pixelY,
        endX: target.pixelX,
        endY: target.pixelY,
        color: '#e2e8f0',
        delay: 0,
        speed: 14,
        progress: 0
      });
    }

    // Aggro target
    target.aggroTarget = this.player;

    if (target.hp <= 0) {
      this.handleMonsterDeath(target);
    }
  }

  handleMonsterDeath(mob) {
    this.onLog(`[Combat] Defeated ${mob.name}! Gained +${mob.exp} Base EXP, +${mob.jobExp} Job EXP.`, 'combat-log');
    
    // Exp gain
    const levels = this.state.gainExp(mob.exp, mob.jobExp);
    if (levels.levelUp) {
      this.onLog(`🎉 LEVEL UP! You reached Base Level ${levels.newLevel}! Received Stat Points.`, 'lvl-up');
      this.addFloatingText(this.player.pixelX, this.player.pixelY - 30, 'LEVEL UP!', '#eab308', 26);
      this.spawnParticleEffect(this.player.pixelX, this.player.pixelY, '#facc15', 30);
      audioSystem.playSFX('levelup');
    }
    if (levels.jobLevelUp) {
      this.onLog(`✨ JOB LEVEL UP! You reached Job Level ${levels.newJobLevel}! Received Skill Point.`, 'lvl-up');
      this.addFloatingText(this.player.pixelX, this.player.pixelY - 25, 'JOB UP!', '#3b82f6', 22);
      this.spawnParticleEffect(this.player.pixelX, this.player.pixelY, '#60a5fa', 20);
      if (!levels.levelUp) {
        audioSystem.playSFX('levelup');
      }
    }

    // Quest monster tracking
    this.state.trackQuestProgress('monsters', mob.mobTypeId, 1);
    if (this.onQuestProgress) this.onQuestProgress();

    // Spawn drops
    mob.drops.forEach(drop => {
      if (Math.random() < drop.chance) {
        const itemInfo = ITEMS[drop.item];
        this.state.addItem(drop.item, 1);
        this.onLog(`[Loot] Found: ${itemInfo.name}! (Added to inventory)`, 'loot-log');
        this.addFloatingText(mob.pixelX, mob.pixelY - 5, `Loot: ${itemInfo.name}`, '#fcd34d', 14);
      }
    });

    // Remove monster and clear any stale target references
    this.monsters = this.monsters.filter(m => m.id !== mob.id);
    if (this.player.attackTarget && this.player.attackTarget.id === mob.id) {
      this.player.attackTarget = null;
    }
    // Also clear aggro references in surviving monsters
    for (const m of this.monsters) {
      if (m.aggroTarget && m.aggroTarget.id === mob.id) m.aggroTarget = null;
    }

    // MVP Boss kill — special handling
    if (mob.isBoss) {
      this.mvpBossAlive = false;
      this.onLog(`🏆 WORLD: MVP Boss [${mob.name}] has been slain! Great Hero!`, 'world-boss');
      // Dragon bosses play roar on death
      if (mob.type === 'dragon') {
        audioSystem.playDragonRoar();
      }
      // No respawn for MVP bosses — they're per-map
      return;
    }

    // Respawn after 4 seconds
    setTimeout(() => {
      if (this.running) {
        this.spawnMonster(false);
      }
    }, 4000);
  }

  performMonsterAttack(mob) {
    // Attack roll
    const roll = Math.random() * 100;
    const hitChance = Math.max(5, Math.min(95, mob.hit - this.state.flee));
    
    // Play Dead check: ignore if active
    if (this.state.character.skills.play_dead && this.player.isMoving === false && this.player.attackTarget === null) {
      mob.aggroTarget = null;
      return;
    }

    if (roll > hitChance) {
      this.addFloatingText(this.player.pixelX, this.player.pixelY - 10, 'MISS', '#94a3b8', 15);
      audioSystem.playSFX('gather'); // miss sound
      return;
    }

    // Damage calculations
    let damage = Math.max(1, mob.atk - this.state.def);

    // Scale damage received from dragon monsters by 0.7 if player has a dragon slayer class
    if (['dragon_knight', 'wyvern_hunter', 'dragon_shaman', 'dragon_arcanist', 'dragon_executioner'].includes(this.state.character.classId) && mob.type === 'dragon') {
      damage = Math.floor(damage * 0.7);
    }
    
    // Assumptio buff: halves damage taken!
    if (this.player.buffs.assumptio && Date.now() < this.player.buffs.assumptio.expiry) {
      damage = Math.floor(damage * 0.5);
    }

    if (this.player.buffs.draconic_shield && Date.now() < this.player.buffs.draconic_shield.expiry) {
      const shieldLvl = this.player.buffs.draconic_shield.lvl;
      const reduction = 0.20 + 0.02 * shieldLvl; // 22% to 30% reduction
      damage = Math.floor(damage * (1.0 - reduction));
    }

    this.state.playerHp = Math.max(0, this.state.playerHp - damage);
    audioSystem.playSFX('slash');
    this.addFloatingText(this.player.pixelX, this.player.pixelY - 15, `${damage}`, '#ef4444', 18);
    this.spawnSlashEffect(this.player.pixelX, this.player.pixelY, '#f87171');

    this.onLog(`[Combat] ${mob.name} hit you for ${damage} damage.`, 'damage-taken');

    if (this.state.playerHp <= 0) {
      this.handlePlayerDeath();
    }
  }

  handlePlayerDeath() {
    this.onLog('💀 You died! Recovering at Prontera fields. Lost 1% Exp.', 'error');
    this.state.character.baseExp = Math.max(0, this.state.character.baseExp - Math.floor(getBaseExpRequired(this.state.character.baseLevel) * 0.01));
    this.state.reset();
    this.changeBiome('prontera');
  }

  // Simulated player actions (bots)
  updateSimulatedPlayers(deltaTime) {
    const now = Date.now();
    
    for (const bot of this.simulatedPlayers) {
      const dist = Math.abs(bot.gridX - this.player.gridX) + Math.abs(bot.gridY - this.player.gridY);
      // Buff player if priest/acolyte and player stands nearby
      if ((bot.classId === 'acolyte' || bot.classId === 'priest' || bot.classId === 'high_priest' || bot.classId === 'dragon_shaman') && now - bot.lastAction > bot.actionCooldown) {
        const dist = Math.abs(bot.gridX - this.player.gridX) + Math.abs(bot.gridY - this.player.gridY);
        if (dist <= 3 && Math.random() > 0.5) {
          // Cast blessing or agi-up on player!
          const castHeal = this.state.playerHp < this.state.maxHp * 0.5;
          if (castHeal) {
            this.state.playerHp = Math.min(this.state.maxHp, this.state.playerHp + 250);
            this.addFloatingText(this.player.pixelX, this.player.pixelY - 20, `Heal!`, '#22c55e', 18);
            this.spawnParticleEffect(this.player.pixelX, this.player.pixelY, '#a7f3d0', 15);
            this.onLog(`${bot.name}: Casting Heal on you!`, 'chat-sim');
          } else {
            this.player.buffs['blessing'] = { lvl: 5, expiry: now + 60000 };
            this.state.recalculateStats();
            this.addFloatingText(this.player.pixelX, this.player.pixelY - 20, `BLESSING`, '#facc15', 15);
            this.spawnParticleEffect(this.player.pixelX, this.player.pixelY, '#facc15', 10);
            this.onLog(`${bot.name}: Buffed you with Blessing!`, 'chat-sim');
          }
          bot.lastAction = now;
          continue;
        }
      }

      // Wander around or fight random monsters
      if (now - bot.lastAction > bot.actionCooldown) {
        if (!bot.combatTarget) {
          // Find target monster
          const nearestMob = this.monsters.find(m => Math.abs(m.gridX - bot.gridX) + Math.abs(m.gridY - bot.gridY) < 5);
          if (nearestMob && Math.random() > 0.3) {
            bot.combatTarget = nearestMob;
            bot.path = this.findPath(bot.gridX, bot.gridY, nearestMob.gridX, nearestMob.gridY);
            if (bot.path.length > 0) bot.path.pop(); // stand near
          } else {
            // Just wander
            const rx = Math.max(1, Math.min(this.cols - 2, bot.gridX + Math.floor(Math.random() * 5) - 2));
            const ry = Math.max(1, Math.min(this.rows - 2, bot.gridY + Math.floor(Math.random() * 5) - 2));
            bot.path = this.findPath(bot.gridX, bot.gridY, rx, ry);
          }
        } else {
          // Attack combat target
          const mob = bot.combatTarget;
          if (mob && mob.hp > 0) {
            const dist = Math.abs(mob.gridX - bot.gridX) + Math.abs(mob.gridY - bot.gridY);
            if (dist <= 1.5) {
              // Slash
              mob.hp -= Math.max(1, 35 - mob.def);
              this.addFloatingText(mob.pixelX, mob.pixelY - 10, `${Math.max(1, 35 - mob.def)}`, '#cbd5e1', 14);
              this.spawnSlashEffect(mob.pixelX, mob.pixelY, '#e2e8f0');
              if (mob.hp <= 0) {
                // Kill credit
                this.monsters = this.monsters.filter(m => m.id !== mob.id);
                bot.combatTarget = null;
                setTimeout(() => { if (this.running) this.spawnMonster(false); }, 4000);
              }
            } else {
              // Move closer
              bot.path = this.findPath(bot.gridX, bot.gridY, mob.gridX, mob.gridY);
              if (bot.path.length > 0) bot.path.pop();
            }
          } else {
            bot.combatTarget = null;
          }
        }
        bot.lastAction = now;
      }

      // Perform movement
      this.moveBot(bot, deltaTime);
    }
  }

  moveBot(bot, deltaTime) {
    if (bot.path.length > 0) {
      const nextNode = bot.path[0];
      const targetPixelX = nextNode[0] * this.tileSize + this.tileSize / 2;
      const targetPixelY = nextNode[1] * this.tileSize + this.tileSize / 2;

      const speed = 2.0 * this.tileSize; // 2 tiles/sec
      const dx = targetPixelX - bot.pixelX;
      const dy = targetPixelY - bot.pixelY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 4) {
        // Snapped
        bot.pixelX = targetPixelX;
        bot.pixelY = targetPixelY;
        bot.gridX = nextNode[0];
        bot.gridY = nextNode[1];
        bot.path.shift();
      } else {
        bot.pixelX += (dx / dist) * speed * (deltaTime / 1000);
        bot.pixelY += (dy / dist) * speed * (deltaTime / 1000);
        bot.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      }
    }
  }

  // Update loop
  update(deltaTime, currentTime) {
    const time = currentTime || performance.now();
    this.updatePlayer(deltaTime);
    this.updateMonsters(deltaTime);
    this.updateSimulatedPlayers(deltaTime);
    this.updateProjectiles(deltaTime);
    this.updateParticles(deltaTime);
    this.updateFloatingTexts(deltaTime);
    this.updateSimulatedChat(time);
  }

  gameLoop(currentTime) {
    if (!this.running) return;

    const deltaTime = currentTime - this.lastLoopTime;
    this.lastLoopTime = currentTime;

    this.update(deltaTime, currentTime);

    this.render();
    this.renderMinimap();

    requestAnimationFrame(this.gameLoop);
  }

  updatePlayer(deltaTime) {
    const now = Date.now();

    // Buff expiry check
    for (const [buffId, buffData] of Object.entries(this.player.buffs)) {
      if (now > buffData.expiry) {
        delete this.player.buffs[buffId];
        if (buffId === 'draconic_shield') {
          delete this.player.lastShieldDrainTime;
        }
        this.state.recalculateStats();
        this.onLog(`System: Buff [${buffId.toUpperCase()}] has expired.`, 'system');
      }
    }

    // Draconic Shield Dismount Cleanup
    if (!this.state.character.mounted && this.player.buffs.draconic_shield) {
      delete this.player.buffs.draconic_shield;
      delete this.player.lastShieldDrainTime;
      this.state.recalculateStats();
    }

    // SP Drain for Draconic Shield
    if (this.player.buffs.draconic_shield) {
      if (!this.player.lastShieldDrainTime) this.player.lastShieldDrainTime = now;
      if (now - this.player.lastShieldDrainTime >= 1000) {
        this.player.lastShieldDrainTime = now;
        const drain = 2 + this.player.buffs.draconic_shield.lvl;
        this.state.playerSp = Math.max(0, this.state.playerSp - drain);
        if (this.state.playerSp === 0) {
          delete this.player.buffs.draconic_shield;
          delete this.player.lastShieldDrainTime;
          this.state.recalculateStats();
          this.onLog("System: Draconic Shield deactivated due to lack of SP.", "system");
        }
      }
    }

    // Lava / Cloud obstacle tile damage
    const tileVal = this.obstacleGrid?.[this.player.gridY]?.[this.player.gridX];
    if (tileVal === 2 || tileVal === 3) {
      const lavaInterval = tileVal === 2 ? 2000 : 3000;
      const lavaDmg = tileVal === 2 ? 80 : 40;
      const lavaColor = tileVal === 2 ? '#ef4444' : '#7dd3fc';
      const lavaLabel = tileVal === 2 ? '🔥 LAVA' : '💨 WIND';
      if (!this.lastLavaDmgTime) this.lastLavaDmgTime = now;
      if (now - this.lastLavaDmgTime >= lavaInterval) {
        this.lastLavaDmgTime = now;
        this.state.playerHp = Math.max(0, this.state.playerHp - lavaDmg);
        this.addFloatingText(this.player.pixelX, this.player.pixelY - 20, `-${lavaDmg} ${lavaLabel}`, lavaColor, 16);
        this.spawnParticleEffect(this.player.pixelX, this.player.pixelY, lavaColor, 6);
        if (this.state.playerHp <= 0) {
          this.onLog('⚠️ You were defeated by the environment! Warping to safety...', 'danger');
          this.changeBiome('prontera');
        }
      }
    } else {
      this.lastLavaDmgTime = now;
    }

    // Healing tick passive: Increase HP Recovery / SP Recovery
    if (!this.lastRegenTick) this.lastRegenTick = now;
    if (now - this.lastRegenTick > 8000) {
      this.lastRegenTick = now;
      let hpRegen = Math.floor(5 + this.state.character.stats.vit * 1.5);
      let spRegen = Math.floor(2 + this.state.character.stats.int * 0.8);
      
      // Skills
      if (this.state.character.skills.hp_rec) {
        hpRegen += this.state.character.skills.hp_rec * 5;
      }
      if (this.state.character.skills.sp_rec) {
        spRegen += this.state.character.skills.sp_rec * 2;
      }
      if (this.state.character.skills.meditatio) {
        spRegen = Math.floor(spRegen * (1 + this.state.character.skills.meditatio * 0.05));
      }
      if (this.player.buffs.magnificat && now < this.player.buffs.magnificat.expiry) {
        spRegen *= 2;
      }

      if (this.state.playerHp < this.state.maxHp) {
        this.state.playerHp = Math.min(this.state.maxHp, this.state.playerHp + hpRegen);
        this.addFloatingText(this.player.pixelX, this.player.pixelY - 10, `+${hpRegen}`, '#22c55e', 14);
      }
      if (this.state.playerSp < this.state.maxSp) {
        this.state.playerSp = Math.min(this.state.maxSp, this.state.playerSp + spRegen);
        this.addFloatingText(this.player.pixelX - 10, this.player.pixelY - 10, `+${spRegen}`, '#3b82f6', 14);
      }
      this.state.save();
    }

    // Standard path movement
    if (this.player.path.length > 0) {
      const nextNode = this.player.path[0];
      const targetPixelX = nextNode[0] * this.tileSize + this.tileSize / 2;
      const targetPixelY = nextNode[1] * this.tileSize + this.tileSize / 2;

      // Base move speed (agi increases speed slightly)
      let movespeed = (2.2 + this.state.character.stats.agi * 0.015) * this.tileSize;
      
      // Inc Agi buff
      if (this.player.buffs.increase_agi && now < this.player.buffs.increase_agi.expiry) {
        movespeed *= 1.35;
      }

      if (this.state.character.mounted && this.state.character.equipment.mount) {
        const mountId = typeof this.state.character.equipment.mount === 'string' ? this.state.character.equipment.mount : this.state.character.equipment.mount.id;
        if (mountId === 'fire_drake') movespeed *= 1.50;
        else if (mountId === 'wind_wyvern') movespeed *= 1.80;
        else if (mountId === 'earth_wyrm') movespeed *= 1.30;
      }

      const dx = targetPixelX - this.player.pixelX;
      const dy = targetPixelY - this.player.pixelY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 4) {
        // Snap to node
        this.player.pixelX = targetPixelX;
        this.player.pixelY = targetPixelY;
        this.player.gridX = nextNode[0];
        this.player.gridY = nextNode[1];
        this.player.path.shift();
      } else {
        this.player.pixelX += (dx / dist) * movespeed * (deltaTime / 1000);
        this.player.pixelY += (dy / dist) * movespeed * (deltaTime / 1000);
        this.player.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      }
      this.player.isMoving = true;

      if (this.state.character.mounted && this.state.character.equipment.mount) {
        if (!this.player.lastMountParticleTime) this.player.lastMountParticleTime = 0;
        if (now - this.player.lastMountParticleTime > 200) {
          this.player.lastMountParticleTime = now;
          const mountId = typeof this.state.character.equipment.mount === 'string' ? this.state.character.equipment.mount : this.state.character.equipment.mount.id;
          if (mountId === 'fire_drake') {
            this.particles.push({
              x: this.player.pixelX + (Math.random() * 8 - 4),
              y: this.player.pixelY + 12 + (Math.random() * 4 - 2),
              vx: 0,
              vy: 0,
              color: '',
              size: 6,
              life: 800,
              maxLife: 800,
              isFireFootprint: true
            });
          } else if (mountId === 'wind_wyvern') {
            let vx = 0, vy = 0;
            if (this.player.facing === 'left') vx = 80;
            else if (this.player.facing === 'right') vx = -80;
            else if (this.player.facing === 'up') vy = 80;
            else if (this.player.facing === 'down') vy = -80;
            
            const ox = (this.player.facing === 'up' || this.player.facing === 'down') ? (Math.random() * 20 - 10) : 0;
            const oy = (this.player.facing === 'left' || this.player.facing === 'right') ? (Math.random() * 20 - 10) : 0;
            
            this.particles.push({
              x: this.player.pixelX + ox,
              y: this.player.pixelY + oy,
              vx: vx,
              vy: vy,
              color: 'rgba(226, 232, 240, 0.4)',
              size: 2,
              life: 300,
              maxLife: 300,
              isWindLine: true
            });
          }
        }
      }
    } else {
      this.player.isMoving = false;
    }

    // Interaction checks
    if (!this.player.isMoving) {
      // 1. Melee Combat Attack loop
      if (this.player.attackTarget) {
        const target = this.player.attackTarget;
        // Guard: target may have been removed from monsters array (already dead)
        if (target.hp <= 0 || !this.monsters.find(m => m.id === target.id)) {
          this.player.attackTarget = null;
          return;
        }

        const weaponId = this.state.character.equipment.weapon;
        const isRanged = weaponId && ITEMS[weaponId]?.reqClass === 'archer';
        const maxRange = isRanged ? 5 : 1.5;

        const dist = Math.abs(target.gridX - this.player.gridX) + Math.abs(target.gridY - this.player.gridY);
        if (dist <= maxRange) {
          // Perform auto attack
          if (now - this.player.lastAttackTime >= this.state.attackCooldown) {
            this.player.lastAttackTime = now;
            this.performPhysicalAttack();
          }
        } else {
          // Repath to follow
          this.player.path = this.findPath(this.player.gridX, this.player.gridY, target.gridX, target.gridY);
          if (this.player.path.length > 0) this.player.path.pop();
        }
      }

      // 2. Resource Harvesting
      if (this.player.harvestTarget) {
        const target = this.player.harvestTarget;
        const dist = Math.abs(target.gridX - this.player.gridX) + Math.abs(target.gridY - this.player.gridY);
        if (dist <= 1.5) {
          this.player.harvestProgress += deltaTime * 0.08; // takes 1.25s
          if (this.player.harvestProgress >= 100) {
            this.executeHarvest(target);
            this.player.harvestTarget = null;
            this.player.harvestProgress = 0;
          }
        }
      }
    }
  }

  executeHarvest(node) {
    this.onLog(`[Gather] Successfully gathered: ${node.name}!`, 'gather-log');
    
    // Give item
    this.state.addItem(node.nodeTypeId, 1);
    this.addFloatingText(node.pixelX, node.pixelY - 15, `+1 ${node.name}`, '#4ade80', 16);
    this.spawnParticleEffect(node.pixelX, node.pixelY, node.color, 12);
    audioSystem.playSFX('gather');

    // Remove node
    this.gatheringNodes = this.gatheringNodes.filter(n => n.id !== node.id);

    // Respawn after 8 seconds
    setTimeout(() => {
      if (this.running) {
        this.spawnGatheringNode();
      }
    }, 8000);
  }

  updateMonsters(deltaTime) {
    const now = Date.now();
    
    for (const mob of this.monsters) {
      // Aggro tracking
      if (mob.behavior === 'aggressive' && !mob.aggroTarget) {
        // Track player if in range (4 tiles)
        const dist = Math.abs(this.player.gridX - mob.gridX) + Math.abs(this.player.gridY - mob.gridY);
        // Play Dead active bypass
        const isPlayingDead = this.state.character.skills.play_dead && !this.player.isMoving && !this.player.attackTarget;
        
        if (dist <= 4 && !isPlayingDead) {
          mob.aggroTarget = this.player;
        }
      }

      // Perform wander or chase path
      if (!mob.aggroTarget) {
        // Wandering
        if (now - mob.lastWander > 3000 + Math.random() * 2000) {
          mob.lastWander = now;
          if (Math.random() > 0.5) {
            const rx = Math.max(1, Math.min(this.cols - 2, mob.gridX + Math.floor(Math.random() * 3) - 1));
            const ry = Math.max(1, Math.min(this.rows - 2, mob.gridY + Math.floor(Math.random() * 3) - 1));
            mob.path = this.findPath(mob.gridX, mob.gridY, rx, ry);
          }
        }
      } else {
        // Chasing aggro target (player)
        const target = mob.aggroTarget;
        const dist = Math.abs(target.gridX - mob.gridX) + Math.abs(target.gridY - mob.gridY);
        
        const isRanged = mob.isRanged;
        const attackRange = isRanged ? 4 : 1.5;

        if (dist <= attackRange) {
          // Stop moving and attack
          mob.path = [];
          
          // Attack cooldown: 2000ms base
          if (now - mob.lastAttackTime > 2000) {
            mob.lastAttackTime = now;
            this.performMonsterAttack(mob);
          }
        } else {
          // Update chase path every 1 second
          if (!mob.lastRepath) mob.lastRepath = 0;
          if (now - mob.lastRepath > 1000) {
            mob.lastRepath = now;
            mob.path = this.findPath(mob.gridX, mob.gridY, target.gridX, target.gridY);
            if (mob.path.length > 0) mob.path.pop(); // stand adjacent
          }
        }
      }

      // Move monster
      if (mob.path.length > 0) {
        const nextNode = mob.path[0];
        const targetPixelX = nextNode[0] * this.tileSize + this.tileSize / 2;
        const targetPixelY = nextNode[1] * this.tileSize + this.tileSize / 2;

        const speed = 1.0 * this.tileSize; // 1 tile per second
        const dx = targetPixelX - mob.pixelX;
        const dy = targetPixelY - mob.pixelY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 4) {
          mob.pixelX = targetPixelX;
          mob.pixelY = targetPixelY;
          mob.gridX = nextNode[0];
          mob.gridY = nextNode[1];
          mob.path.shift();
        } else {
          mob.pixelX += (dx / dist) * speed * (deltaTime / 1000);
          mob.pixelY += (dy / dist) * speed * (deltaTime / 1000);
          mob.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        }
      }
    }
  }

  updateProjectiles(deltaTime) {
    for (const proj of this.projectiles) {
      if (proj.delay > 0) {
        proj.delay -= deltaTime;
        continue;
      }

      proj.progress += proj.speed * (deltaTime / 100);
      if (proj.progress >= 1.0) {
        proj.progress = 1.0;
      }
    }

    // Clean up finished projectiles
    this.projectiles = this.projectiles.filter(p => p.progress < 1.0);
  }

  updateParticles(deltaTime) {
    for (const p of this.particles) {
      p.x += p.vx * (deltaTime / 1000);
      p.y += p.vy * (deltaTime / 1000);
      p.life -= deltaTime;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  updateFloatingTexts(deltaTime) {
    for (const t of this.floatingTexts) {
      t.y -= 15 * (deltaTime / 1000); // float up
      t.life -= deltaTime;
    }
    this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);
  }

  // Simulated MMO Guild area chat
  updateSimulatedChat(currentTime) {
    if (currentTime - this.lastChatTime > this.chatInterval) {
      this.lastChatTime = currentTime;
      this.chatInterval = 6000 + Math.random() * 10000; // random next trigger

      const messages = [
        "LF party Payon fields lvl 15+",
        "Wow scorpions are dealing high damage, need AGI!",
        "Just looted a rare Four-Leaf Clover in Prontera!",
        "Any Priest online? Need blessing buffs near entrance",
        "Selling broadsword and wooden shield, pm me",
        "Warping to Geffen dungeon, wish me luck!",
        "Baphomet MVP is too strong... we need a full 10-man party",
        "The up-class system is amazing, I just promoted to Lord Knight!",
        "Novices, do the Trial quest on the board to unlock Tier 1!",
        "Buff rates are set to high on this server",
        "Isekai guild board has a quest with nice steel rewards",
        "Hunter falcon build is insanely fast",
        "Wizard Meteor Storm is beautiful in payon skeleton field"
      ];
      const selected = messages[Math.floor(Math.random() * messages.length)];
      
      const botNames = ["X_Ragnaman_X", "IsekaiHero", "FallenAngel", "Kafra_Lover", "SlashMaster", "Megumin_V1", "GuildPoro"];
      const bot = botNames[Math.floor(Math.random() * botNames.length)];

      this.onLog(`[GuildChat] ${bot}: ${selected}`, 'guild-chat');
    }
  }

  addFloatingText(x, y, text, color, size = 18) {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      size,
      life: 1200 // 1.2s life
    });
  }

  spawnParticleEffect(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 40;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 2 + Math.random() * 4,
        life: 500 + Math.random() * 500
      });
    }
  }

  spawnSlashEffect(x, y, color) {
    // Slash particle: creates floating angled line
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: -5,
      color,
      isSlash: true,
      angle: Math.random() * Math.PI * 2,
      size: 15,
      life: 200
    });
  }

  spawnGridClickEffect(gridX, gridY) {
    const x = gridX * this.tileSize + this.tileSize / 2;
    const y = gridY * this.tileSize + this.tileSize / 2;
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: x + (i%2 === 0 ? -10 : 10),
        y: y + (i > 1 ? -10 : 10),
        vx: (i%2 === 0 ? -15 : 15),
        vy: (i > 1 ? -15 : 15),
        color: '#60a5fa',
        size: 3,
        life: 300
      });
    }
  }

  // Teleport cheat/potion trigger
  teleportRandom() {
    const spot = this.getRandomFreeSpot();
    if (spot) {
      this.player.gridX = spot.x;
      this.player.gridY = spot.y;
      this.player.pixelX = spot.x * this.tileSize + this.tileSize / 2;
      this.player.pixelY = spot.y * this.tileSize + this.tileSize / 2;
      this.player.path = [];
      this.player.attackTarget = null;
      this.spawnParticleEffect(this.player.pixelX, this.player.pixelY, '#a5f3fc', 25);
      this.onLog('System: Teleported randomly using Fly Wing.', 'system');
    }
  }

  // Renderer
  render() {
    const biome = BIOMES[this.state.currentBiome];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Draw Ground Base
    this.ctx.fillStyle = biome.bgColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 2. Draw Grid Lines
    this.ctx.strokeStyle = biome.gridColor;
    this.ctx.lineWidth = 1;
    for (let c = 0; c < this.cols; c++) {
      this.ctx.beginPath();
      this.ctx.moveTo(c * this.tileSize, 0);
      this.ctx.lineTo(c * this.tileSize, this.canvas.height);
      this.ctx.stroke();
    }
    for (let r = 0; r < this.rows; r++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, r * this.tileSize);
      this.ctx.lineTo(this.canvas.width, r * this.tileSize);
      this.ctx.stroke();
    }

    // 3. Draw Obstacles / Walls
    const now2 = Date.now();
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tile = this.obstacleGrid[r][c];
        if (tile === 1) {
          // Border walls look darker and textured
          if (r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1) {
            this.ctx.fillStyle = '#0f172a';
          } else {
            // Internal rocks/obstacles
            this.ctx.fillStyle = '#475569';
          }
          this.ctx.fillRect(c * this.tileSize + 2, r * this.tileSize + 2, this.tileSize - 4, this.tileSize - 4);
          // Rock texture details
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          this.ctx.fillRect(c * this.tileSize + 6, r * this.tileSize + 6, 8, 8);
        } else if (tile === 2) {
          // Lava tile — pulsing orange-red
          const pulse = 0.6 + 0.4 * Math.sin(now2 / 400 + r + c);
          this.ctx.fillStyle = `rgba(220, 38, 38, ${pulse})`;
          this.ctx.fillRect(c * this.tileSize, r * this.tileSize, this.tileSize, this.tileSize);
          this.ctx.fillStyle = `rgba(251, 146, 60, ${pulse * 0.6})`;
          this.ctx.fillRect(c * this.tileSize + 4, r * this.tileSize + 4, this.tileSize - 8, this.tileSize - 8);
        } else if (tile === 3) {
          // Cloud tile — shimmering pale blue
          const shine = 0.5 + 0.5 * Math.sin(now2 / 600 + r * 2 + c);
          this.ctx.fillStyle = `rgba(125, 211, 252, ${shine * 0.7})`;
          this.ctx.fillRect(c * this.tileSize, r * this.tileSize, this.tileSize, this.tileSize);
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          this.ctx.fillRect(c * this.tileSize + 6, r * this.tileSize + 6, this.tileSize - 12, this.tileSize - 12);
        }
      }
    }

    // 4. Draw Hover Highlight
    if (this.hoverTile) {
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(this.hoverTile.x * this.tileSize, this.hoverTile.y * this.tileSize, this.tileSize, this.tileSize);
    }

    // 5. Draw Path Line
    if (this.player.path.length > 0) {
      this.ctx.strokeStyle = 'rgba(96, 165, 250, 0.4)';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(this.player.pixelX, this.player.pixelY);
      for (const node of this.player.path) {
        this.ctx.lineTo(node[0] * this.tileSize + this.tileSize / 2, node[1] * this.tileSize + this.tileSize / 2);
      }
      this.ctx.stroke();
    }

    // 6. Draw Gathering Nodes
    for (const node of this.gatheringNodes) {
      this.ctx.fillStyle = node.color;
      this.ctx.beginPath();
      this.ctx.arc(node.pixelX, node.pixelY, 12, 0, Math.PI * 2);
      this.ctx.fill();

      // Gleam effect
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.beginPath();
      this.ctx.arc(node.pixelX - 4, node.pixelY - 4, 3, 0, Math.PI * 2);
      this.ctx.fill();

      // Resource Text
      this.ctx.fillStyle = '#f8fafc';
      this.ctx.font = '10px "Inter", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(node.name, node.pixelX, node.pixelY + 24);
    }

    // 7. Draw Monsters
    for (const mob of this.monsters) {
      const size = mob.size || 15;
      
      // Shadow
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      this.ctx.beginPath();
      this.ctx.arc(mob.pixelX, mob.pixelY + size * 0.7, size * 0.8, 0, Math.PI * 2);
      this.ctx.fill();

      // Body (Slime/Sprite representation)
      this.ctx.fillStyle = mob.color;
      this.ctx.beginPath();
      if (mob.id.includes('poring') || mob.id.includes('bug')) {
        // Blob shape
        this.ctx.ellipse(mob.pixelX, mob.pixelY, size, size * 0.8, 0, 0, Math.PI * 2);
      } else {
        // Standard circle
        this.ctx.arc(mob.pixelX, mob.pixelY, size, 0, Math.PI * 2);
      }
      this.ctx.fill();

      // Eyes/Face details
      this.ctx.fillStyle = '#000000';
      const eyeOffset = mob.facing === 'left' ? -4 : mob.facing === 'right' ? 4 : 0;
      this.ctx.beginPath();
      this.ctx.arc(mob.pixelX - 4 + eyeOffset, mob.pixelY - 2, 2, 0, Math.PI * 2);
      this.ctx.arc(mob.pixelX + 4 + eyeOffset, mob.pixelY - 2, 2, 0, Math.PI * 2);
      this.ctx.fill();

      // Boss crown/horns decoration
      if (mob.isBoss) {
        this.ctx.strokeStyle = '#facc15';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(mob.pixelX - 10, mob.pixelY - size);
        this.ctx.lineTo(mob.pixelX, mob.pixelY - size - 12);
        this.ctx.lineTo(mob.pixelX + 10, mob.pixelY - size);
        this.ctx.stroke();
      }

      // Name & HP Bar
      this.ctx.fillStyle = mob.isBoss ? '#facc15' : '#f8fafc';
      this.ctx.font = mob.isBoss ? 'bold 12px "Inter"' : '10px "Inter"';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(mob.name, mob.pixelX, mob.pixelY - size - 6);

      // HP Bar background
      const barW = size * 1.8;
      const barH = 3;
      this.ctx.fillStyle = '#ef4444';
      this.ctx.fillRect(mob.pixelX - barW/2, mob.pixelY - size - 4, barW, barH);
      // HP Bar fill
      this.ctx.fillStyle = '#22c55e';
      const pct = Math.max(0, mob.hp / mob.maxHp);
      this.ctx.fillRect(mob.pixelX - barW/2, mob.pixelY - size - 4, barW * pct, barH);
    }

    // 8. Draw Simulated Players (Bots)
    for (const bot of this.simulatedPlayers) {
      this.drawCharacterSprite(bot, false);
    }

    // 9. Draw Main Player
    this.drawCharacterSprite(this.player, true);

    // 10. Draw Harvest Progress Bar
    if (this.player.harvestTarget) {
      const pct = this.player.harvestProgress / 100;
      this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this.ctx.fillRect(this.player.pixelX - 25, this.player.pixelY - 45, 50, 6);
      this.ctx.fillStyle = '#4ade80';
      this.ctx.fillRect(this.player.pixelX - 25, this.player.pixelY - 45, 50 * pct, 6);
    }

    // 11. Draw Projectiles
    for (const proj of this.projectiles) {
      if (proj.delay > 0) continue;
      const cx = proj.startX + (proj.endX - proj.startX) * proj.progress;
      const cy = proj.startY + (proj.endY - proj.startY) * proj.progress;

      this.ctx.fillStyle = proj.color;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // 12. Draw Particle Effects
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      if (p.isSlash) {
        // Draw custom slash line
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(p.x - 8, p.y + 8);
        this.ctx.lineTo(p.x + 8, p.y - 8);
        this.ctx.stroke();
      } else if (p.isFireFootprint) {
        const alpha = Math.max(0, p.life / p.maxLife);
        this.ctx.fillStyle = `rgba(249, 115, 22, ${alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = `rgba(254, 240, 138, ${alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.isWindLine) {
        const alpha = Math.max(0, p.life / p.maxLife);
        this.ctx.strokeStyle = `rgba(226, 232, 240, ${alpha * 0.6})`;
        this.ctx.lineWidth = p.size;
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, p.y);
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
        this.ctx.lineTo(p.x - (p.vx / speed) * 15, p.y - (p.vy / speed) * 15);
        this.ctx.stroke();
      } else {
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // 13. Draw Floating combat numbers
    for (const t of this.floatingTexts) {
      this.ctx.fillStyle = t.color;
      this.ctx.font = `bold ${t.size}px "Inter", sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(t.text, t.x, t.y);
    }
  }

  // Draw Male/Female character base on canvas
  drawCharacterSprite(char, isPlayer = true) {
    const size = 16;
    
    // Hair style, colors and custom outfits based on class
    const gender = isPlayer ? this.state.character.gender : char.gender;
    const classId = isPlayer ? this.state.character.classId : char.classId;
    const appearance = isPlayer ? this.state.character.appearance : char.appearance;

    const isMounted = isPlayer && this.state.character.mounted && this.state.character.equipment.mount;
    const rideOffset = isMounted ? 8 : 0;
    const py = char.pixelY - rideOffset;

    // Shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    this.ctx.beginPath();
    this.ctx.arc(char.pixelX, char.pixelY + size * 0.8, size * 0.9, 0, Math.PI * 2);
    this.ctx.fill();

    if (isMounted) {
      const mountId = typeof this.state.character.equipment.mount === 'string' ? this.state.character.equipment.mount : this.state.character.equipment.mount.id;
      let mountColor = '#ef4444'; // Red for Fire Drake
      let wingColor = 'rgba(239, 68, 68, 0.6)';
      let hasWings = true;
      
      if (mountId === 'wind_wyvern') {
        mountColor = '#38bdf8'; // Sky-blue
        wingColor = 'rgba(56, 189, 248, 0.6)';
      } else if (mountId === 'earth_wyrm') {
        mountColor = '#15803d'; // Green
        wingColor = 'rgba(21, 128, 61, 0.6)';
        hasWings = false; // Wyrm has no wings
      }
      
      this.ctx.fillStyle = mountColor;
      
      // 1. Dragon Body ellipse
      this.ctx.beginPath();
      this.ctx.ellipse(char.pixelX, char.pixelY + 10, 20, 10, 0, 0, Math.PI * 2);
      this.ctx.fill();
      
      // 2. Dragon Head and neck
      let headX = char.pixelX;
      let headY = char.pixelY + 4;
      if (char.facing === 'left') headX -= 16;
      else if (char.facing === 'right') headX += 16;
      else if (char.facing === 'down') headY += 14;
      else if (char.facing === 'up') headY -= 10;
      
      this.ctx.beginPath();
      this.ctx.arc(headX, headY, 6, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Dragon Eyes
      this.ctx.fillStyle = '#facc15';
      this.ctx.beginPath();
      this.ctx.arc(headX + (char.facing === 'left' ? -2 : char.facing === 'right' ? 2 : -2), headY - 1, 1.5, 0, Math.PI * 2);
      if (char.facing === 'up' || char.facing === 'down') {
        this.ctx.arc(headX + 2, headY - 1, 1.5, 0, Math.PI * 2);
      }
      this.ctx.fill();
      
      // 3. Dragon Wings (flapping using sine wave of time)
      if (hasWings) {
        const timeScale = char.isMoving ? 150 : 300;
        const flap = Math.sin(Date.now() / timeScale) * 6;
        this.ctx.fillStyle = wingColor;
        
        // Left Wing
        this.ctx.beginPath();
        this.ctx.moveTo(char.pixelX - 6, char.pixelY + 4);
        this.ctx.lineTo(char.pixelX - 22, char.pixelY - 4 + flap);
        this.ctx.lineTo(char.pixelX - 14, char.pixelY + 8 + flap);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Right Wing
        this.ctx.beginPath();
        this.ctx.moveTo(char.pixelX + 6, char.pixelY + 4);
        this.ctx.lineTo(char.pixelX + 22, char.pixelY - 4 + flap);
        this.ctx.lineTo(char.pixelX + 14, char.pixelY + 8 + flap);
        this.ctx.closePath();
        this.ctx.fill();
      } else {
        // Spikes for Earth Wyrm
        this.ctx.fillStyle = '#166534'; // Darker green spikes
        this.ctx.beginPath();
        this.ctx.moveTo(char.pixelX - 8, char.pixelY + 12);
        this.ctx.lineTo(char.pixelX - 12, char.pixelY + 6);
        this.ctx.lineTo(char.pixelX - 4, char.pixelY + 14);
        this.ctx.moveTo(char.pixelX + 8, char.pixelY + 12);
        this.ctx.lineTo(char.pixelX + 12, char.pixelY + 6);
        this.ctx.lineTo(char.pixelX + 4, char.pixelY + 14);
        this.ctx.fill();
      }
      
      // 4. Claws
      this.ctx.fillStyle = '#1e293b';
      this.ctx.beginPath();
      this.ctx.arc(char.pixelX - 6, char.pixelY + 14, 3, 0, Math.PI * 2);
      this.ctx.arc(char.pixelX + 6, char.pixelY + 14, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Body Outfit base color
    this.ctx.fillStyle = appearance.clothColor;
    this.ctx.beginPath();
    this.ctx.arc(char.pixelX, py + 4, size * 0.9, 0, Math.PI * 2);
    this.ctx.fill();

    // Armor shoulders (Knight/Swordman gets steel chest colors)
    if (classId.includes('knight') || classId.includes('swordman') || classId.includes('priest')) {
      this.ctx.fillStyle = '#cbd5e1'; // Silver plate armor
      this.ctx.fillRect(char.pixelX - 8, py + 2, 16, 6);
    }

    // Head / Face
    this.ctx.fillStyle = '#ffedd5'; // Skin color
    this.ctx.beginPath();
    this.ctx.arc(char.pixelX, py - 10, size * 0.7, 0, Math.PI * 2);
    this.ctx.fill();

    // Hair drawing based on gender & selection
    this.ctx.fillStyle = appearance.hairColor;
    const hair = appearance.hair || 1;
    if (gender === 'female') {
      if (hair === 1) {
        // Ponytail
        this.ctx.beginPath();
        this.ctx.arc(char.pixelX, py - 14, size * 0.75, 0, Math.PI, true);
        this.ctx.fill();
        this.ctx.fillRect(char.pixelX - 16, py - 12, 6, 12);
        this.ctx.fillRect(char.pixelX + 10, py - 12, 6, 12);
      } else {
        // Short hair bob
        this.ctx.beginPath();
        this.ctx.arc(char.pixelX, py - 13, size * 0.8, 0, Math.PI, true);
        this.ctx.fill();
      }
    } else {
      // Male spiked hair
      this.ctx.beginPath();
      this.ctx.moveTo(char.pixelX - 12, py - 10);
      this.ctx.lineTo(char.pixelX - 6, py - 22);
      this.ctx.lineTo(char.pixelX, py - 16);
      this.ctx.lineTo(char.pixelX + 6, py - 22);
      this.ctx.lineTo(char.pixelX + 12, py - 10);
      this.ctx.fill();
    }

    // Eyes
    this.ctx.fillStyle = '#000000';
    const faceDirection = char.facing === 'left' ? -3 : char.facing === 'right' ? 3 : 0;
    this.ctx.beginPath();
    this.ctx.arc(char.pixelX - 3 + faceDirection, py - 10, 1.5, 0, Math.PI * 2);
    this.ctx.arc(char.pixelX + 3 + faceDirection, py - 10, 1.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw active headgear
    let activeHeadgear = appearance.headgear;
    if (isPlayer && this.state.character.equipment.headgear) {
      activeHeadgear = this.state.character.equipment.headgear;
    }

    if (activeHeadgear) {
      if (activeHeadgear === 'ribbon') {
        this.ctx.fillStyle = '#ef4444';
        this.ctx.fillRect(char.pixelX - 12, py - 23, 24, 6);
      } else if (activeHeadgear === 'goggles') {
        this.ctx.fillStyle = '#3b82f6';
        this.ctx.fillRect(char.pixelX - 10, py - 14, 20, 4);
      } else if (activeHeadgear === 'majestic_goat') {
        this.ctx.strokeStyle = '#475569';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(char.pixelX - 8, py - 18);
        this.ctx.quadraticCurveTo(char.pixelX - 18, py - 26, char.pixelX - 12, py - 12);
        this.ctx.moveTo(char.pixelX + 8, py - 18);
        this.ctx.quadraticCurveTo(char.pixelX + 18, py - 26, char.pixelX + 12, py - 12);
        this.ctx.stroke();
      }
    }

    // Draw visual buffs (Blessing aura/Inc Agi speed lines)
    if (char.buffs.blessing && Date.now() < char.buffs.blessing.expiry) {
      this.ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(char.pixelX - size, py - 22, size * 2, size * 2.2);
    }

    // Draw Draconic Shield visual indicator (green border circle around player)
    if (char.buffs.draconic_shield && Date.now() < char.buffs.draconic_shield.expiry) {
      this.ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(char.pixelX, py + 4, size * 1.3, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // Hover Selection Indicator
    if (isPlayer && this.hoverTile && this.hoverTile.x === char.gridX && this.hoverTile.y === char.gridY) {
      this.ctx.strokeStyle = '#22c55e';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(char.gridX * this.tileSize, char.gridY * this.tileSize, this.tileSize, this.tileSize);
    }

    // Name Tag
    this.ctx.fillStyle = isPlayer ? '#fcd34d' : '#ffffff';
    this.ctx.font = 'bold 11px "Inter", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(char.name, char.pixelX, py - 24);

    // HP Bar for simulated bots / players
    const barW = 30;
    const barH = 3;
    const max = isPlayer ? this.state.maxHp : char.maxHp;
    const cur = isPlayer ? this.state.playerHp : char.hp;
    const pct = Math.max(0, cur / max);
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.fillRect(char.pixelX - barW/2, py - 21, barW, barH);
    this.ctx.fillStyle = isPlayer ? '#22c55e' : '#60a5fa';
    this.ctx.fillRect(char.pixelX - barW/2, py - 21, barW * pct, barH);
  }

  // ─── Minimap Overlay ──────────────────────────────────────────────────────
  renderMinimap() {
    const mc = document.getElementById('minimap-canvas');
    if (!mc) return;
    const mctx = mc.getContext('2d');
    const W = mc.width;   // 108
    const H = mc.height;  // 108
    const scaleX = W / this.cols;
    const scaleY = H / this.rows;

    // Background — biome colour
    const biome = BIOMES[this.state.currentBiome];
    mctx.fillStyle = biome?.bgColor || '#0f172a';
    mctx.fillRect(0, 0, W, H);

    // Obstacles
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const t = this.obstacleGrid[r][c];
        if (t === 1) mctx.fillStyle = '#334155';
        else if (t === 2) mctx.fillStyle = 'rgba(220,38,38,0.7)';
        else if (t === 3) mctx.fillStyle = 'rgba(125,211,252,0.5)';
        else continue;
        mctx.fillRect(c * scaleX, r * scaleY, scaleX, scaleY);
      }
    }

    // Gathering nodes — green dots
    mctx.fillStyle = '#4ade80';
    for (const n of this.gatheringNodes) {
      mctx.fillRect(n.gridX * scaleX + 1, n.gridY * scaleY + 1, scaleX - 2, scaleY - 2);
    }

    // Monsters — red dots
    for (const m of this.monsters) {
      mctx.fillStyle = m.isBoss ? '#facc15' : '#ef4444';
      const mx = m.gridX * scaleX + scaleX / 2;
      const my = m.gridY * scaleY + scaleY / 2;
      mctx.beginPath();
      mctx.arc(mx, my, m.isBoss ? 4 : 2, 0, Math.PI * 2);
      mctx.fill();
    }

    // Simulated players — sky blue
    mctx.fillStyle = '#7dd3fc';
    for (const sp of this.simulatedPlayers) {
      const sx = sp.gridX * scaleX + scaleX / 2;
      const sy = sp.gridY * scaleY + scaleY / 2;
      mctx.beginPath();
      mctx.arc(sx, sy, 2, 0, Math.PI * 2);
      mctx.fill();
    }

    // Player — bright green, larger
    const px = this.player.gridX * scaleX + scaleX / 2;
    const py = this.player.gridY * scaleY + scaleY / 2;
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 250);
    mctx.fillStyle = `rgba(74,222,128,${pulse})`;
    mctx.beginPath();
    mctx.arc(px, py, 3.5, 0, Math.PI * 2);
    mctx.fill();
    mctx.strokeStyle = '#fff';
    mctx.lineWidth = 1;
    mctx.stroke();

    // Border
    mctx.strokeStyle = 'rgba(250,204,21,0.4)';
    mctx.lineWidth = 1;
    mctx.strokeRect(0, 0, W, H);
  }
}
