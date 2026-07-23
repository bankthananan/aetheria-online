// Original 16-bit command-window design system for the medieval isekai RPG.
export const THEME = {
  palette: {
    bg: "#17110c",          // dark walnut field behind the canvas
    panelBg: "#342313",     // carved timber command window
    panelBorder: "#d6b66c", // warm brass frame
    textPrimary: "#f7edce",
    textMuted: "#d2c29b",
    accent: "#507344",      // moss-green action state
    accentAlt: "#e0bd61",   // selected-state gold
    hpRed: "#963741",       // oxblood
    mpBlue: "#416eaa",
    xpGold: "#c49c43",
    danger: "#c65356",
    success: "#6f9669",
    questPaper: "#f2e7c8",
    questInk: "#302619",
  },

  fonts: {
    ui: 'ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    heading: 'Georgia, Cambria, "Times New Roman", Times, serif',
  },

  hudLayout: {
    healthBar: { anchor: "top-left", notes: "HP bar, topmost of the three stat bars, red fill, shows current/max on hover." },
    manaBar: { anchor: "top-left", notes: "MP bar directly under HP, blue fill." },
    xpBar: { anchor: "bottom-center", notes: "Thin full-width gold bar pinned to the very bottom edge of the screen." },
    levelBadge: { anchor: "top-left", notes: "Circular Lv. badge left of the HP/MP stack, gilded ring." },
    minimap: { anchor: "top-right", notes: "Square minimap with gold frame; compass/zone name below it." },
    hotbar: { anchor: "bottom-center", notes: "Row of 4 skill buttons (keys 1-4) centered, sitting just above the XP bar." },
    questTracker: { anchor: "top-right", notes: "Under the minimap: active quest title + objective checklist, semi-transparent." },
    messageLog: { anchor: "bottom-left", notes: "Scrolling combat/system log; newest at bottom, fades old lines." },
  },

  panels: [
    { id: "character", title: "Character", contents: "Portrait, name, class, level, STR/AGI/VIT/INT/DEX/LUK, derived stats (ATK, DEF, crit), equipment slots." },
    { id: "inventory", title: "Inventory", contents: "Grid of item slots with icon + stack count, weight bar, gold total, use/equip/drop on click." },
    { id: "skills", title: "Skills", contents: "Skill tree by branch, skill icon + level, available points, drag-to-hotbar." },
    { id: "quests", title: "Quest Log", contents: "Active/completed tabs, quest title, description, objective progress, rewards preview." },
    { id: "shop", title: "Shop", contents: "Merchant item list with price + icon, buy/sell tabs, your gold, quantity selector." },
    { id: "dialogue", title: "Dialogue", contents: "NPC portrait + name, typed text body, response choice buttons, continue/close." },
  ],

  css: `
:root{
  --bg:#17110c;--panel-bg:#342313;--panel-border:#d6b66c;
  --text:#f7edce;--text-muted:#d2c29b;
  --accent:#507344;--accent-alt:#e0bd61;
  --hp:#963741;--mp:#416eaa;--xp:#c49c43;
  --danger:#c65356;--success:#6f9669;
  --iron:#1b2027;--iron-deep:#0d1219;--royal:#152743;--royal-light:#213b63;
  --oxblood:#782c35;--forest:#3f6048;--brass:#a98742;
  --wood-deep:#180d07;--wood:#342313;--wood-mid:#51351d;--wood-light:#74502d;
  --gold-deep:#74501d;--gold:#d6b45a;--gold-bright:#f2d88a;
  --parchment:#e3d4ad;--parchment-light:#f2e7c8;--parchment-shadow:#b7a273;--parchment-ink:#302619;
  --quest-paper:#f2e7c8;--quest-ink:#302619;--quest-muted:#66583f;
  --wood-grain:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0,rgba(255,255,255,.025) 1px,transparent 1px,transparent 5px);
  --paper-grain:repeating-linear-gradient(0deg,rgba(72,48,22,.035) 0,rgba(72,48,22,.035) 1px,transparent 1px,transparent 4px);
  --font-ui:ui-monospace,"SFMono-Regular",Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
  --font-head:Georgia,Cambria,"Times New Roman",Times,serif;
  --radius:2px;--panel-shadow:5px 6px 0 rgba(9,5,2,.72);
  color-scheme:dark;
}
*{box-sizing:border-box}
html,body{min-width:280px}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font-ui);line-height:1.4}
button,input,select,textarea{font:inherit;letter-spacing:0}
button:focus-visible,input:focus-visible,[tabindex]:focus-visible{outline:2px solid var(--accent-alt);outline-offset:2px}

/* HUD shell */
.hud{position:fixed;inset:0;pointer-events:none;z-index:10;font-size:12px}
.hud > *{pointer-events:auto}

/* Compact command bars */
.bar{position:relative;height:14px;border:1px solid #d4dbe2;border-radius:1px;
  background:#080d14;overflow:hidden;box-shadow:inset 0 0 0 1px #344254,2px 2px 0 rgba(0,0,0,.5)}
.bar > .fill{height:100%;width:0;border-radius:0;transition:width .2s steps(8,end);background:var(--accent)}
.bar > .label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  padding:0 4px;font-size:9px;font-weight:700;line-height:1;white-space:nowrap;text-shadow:1px 1px 0 #000}
.hp-bar .fill{background:var(--hp)}
.mp-bar .fill{background:var(--mp)}
.xp-bar{position:fixed;left:0;right:0;bottom:0;height:7px;border-radius:0;border-width:1px 0 0}
.xp-bar .fill{border-radius:0;background:var(--xp)}
.stat-stack{position:fixed;top:12px;left:66px;width:260px;display:flex;flex-direction:column;gap:4px;
  padding:5px 6px;background:rgba(10,17,28,.92);border:1px solid #738197;box-shadow:2px 2px 0 rgba(0,0,0,.55)}

/* Level seal */
.level-badge{position:fixed;top:12px;left:12px;width:48px;height:48px;border-radius:50%;display:flex;
  flex-direction:column;align-items:center;justify-content:center;background:var(--iron-deep);
  border:2px solid #d6dde4;box-shadow:inset 0 0 0 2px var(--royal-light),2px 2px 0 rgba(0,0,0,.65);
  font-family:var(--font-head);line-height:1}
.level-badge small{font-family:var(--font-ui);font-size:7px;color:var(--text-muted);letter-spacing:0}
.level-badge b{font-size:17px;color:var(--accent-alt)}
.level-badge .hud-crest{color:var(--accent-alt)}

/* Map and quest command windows */
.minimap{position:fixed;top:12px;right:12px;width:140px;height:140px;background:#0c1421;
  border:2px solid #d1d8df;border-radius:2px;box-shadow:inset 0 0 0 2px #31466a,var(--panel-shadow);image-rendering:pixelated}
#hud .quest-tracker{position:fixed;top:160px;right:12px;width:190px;max-height:180px;
  padding:7px 8px;background:rgba(15,31,54,.94);border:1px solid #bdc7d2;border-radius:2px;
  box-shadow:inset 0 0 0 1px #31466a,2px 2px 0 rgba(0,0,0,.55);font-size:10px;line-height:1.45;
  overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;
  scrollbar-width:thin;scrollbar-color:#8b9bb0 #0c1626;touch-action:pan-y}
#hud .quest-tracker:focus-visible{outline:2px solid var(--accent-alt);outline-offset:2px}

/* Command menu */
#hud .hud-menu{position:fixed;top:12px;right:160px;display:flex;align-items:center;justify-content:flex-end;
  gap:3px;max-width:calc(100vw - 452px);flex-wrap:wrap}
#hud .hud-menu .btn{padding:4px 7px;font-size:9px;white-space:nowrap}
.hud-identity{min-width:0;overflow:hidden;text-overflow:ellipsis}
.hud-identity #hud-job{color:#94bce7}
.hud-sep{color:#77879c}
.hud-coin{background:var(--accent-alt);color:#24200f;border-color:#f2dfa0}

/* Hotbar */
.hotbar{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);display:flex;gap:4px;
  padding:4px;background:rgba(9,15,24,.92);border:1px solid #8997aa;box-shadow:2px 2px 0 rgba(0,0,0,.55)}
.skill-btn{position:relative;width:46px;height:46px;border-radius:1px;background:#182a48;border:1px solid #c3ccd7;
  color:var(--text);cursor:pointer;transition:transform .08s steps(2,end),background .08s;display:flex;
  align-items:flex-end;justify-content:flex-end;overflow:hidden;box-shadow:inset 0 0 0 1px #334f78}
.skill-btn:hover{transform:translateY(-2px);background:#24436e;border-color:var(--accent-alt);box-shadow:inset 0 0 0 1px #6d5729}
.skill-btn:active{transform:translateY(0);background:#101c30}
.skill-btn .key{position:absolute;top:2px;left:4px;font-size:9px;color:var(--accent-alt);font-weight:700}
.skill-btn .cd{position:absolute;inset:0;border-radius:0;background:rgba(5,8,13,.78);display:flex;
  align-items:center;justify-content:center;font-weight:700;color:#fff}
.hotbar .skill-btn.item-slot{background:#1d342b;border-color:#9db9a2;box-shadow:inset 0 0 0 1px #3d6048}
.hotbar .skill-btn .sk-name{max-width:38px;white-space:nowrap;text-overflow:ellipsis}

/* Panels and command lists */
.panel{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);min-width:340px;max-width:92vw;
  max-height:82vh;overflow:auto;background:var(--panel-bg);border:2px solid #d3dae1;border-radius:2px;
  box-shadow:inset 0 0 0 2px #314b73,var(--panel-shadow);z-index:20;scrollbar-color:#8796a9 #0c1626}
.panel__head{display:flex;align-items:center;justify-content:space-between;min-height:34px;padding:7px 10px 7px 12px;
  border-bottom:1px solid #8190a4;background:#101d32;font-family:var(--font-head);font-size:16px;
  font-weight:700;color:var(--accent-alt);letter-spacing:0}
.panel__body{padding:10px 12px;color:var(--text);background:#172945}
.panel__close{width:24px;height:22px;padding:0;background:#1a2e4d;border:1px solid #8796a9;border-radius:1px;
  color:var(--text-muted);font-family:var(--font-ui);font-size:14px;cursor:pointer;line-height:18px}
.panel__close:hover{color:#fff;background:var(--oxblood);border-color:#e3b4b6}

.btn{display:inline-flex;align-items:center;justify-content:center;min-height:25px;padding:5px 10px;border:1px solid #c7d0da;
  border-radius:1px;background:#294c3a;color:#f6f0df;font-family:var(--font-ui);font-size:11px;font-weight:700;
  line-height:1.2;cursor:pointer;box-shadow:inset 0 0 0 1px #52775e;transition:background .08s,color .08s,border-color .08s}
.btn:hover{filter:none;background:#3a664b;border-color:var(--accent-alt);color:#fff7d6}
.btn:active{transform:translateY(1px)}
.btn--ghost{background:#172a47;border:1px solid #8f9caf;color:var(--text);box-shadow:inset 0 0 0 1px #2c4569}
.btn--ghost:hover{background:#233e66;color:#fff5cf;border-color:var(--accent-alt)}
.btn:disabled{opacity:.42;cursor:default;filter:grayscale(.35);transform:none}

/* Dialogue uses parchment as a focused medieval reading surface. */
.dialogue{position:fixed;left:50%;bottom:78px;transform:translateX(-50%);width:min(680px,92vw);
  background:#12213a;border:2px solid #d3dae1;border-radius:2px;box-shadow:inset 0 0 0 2px #314b73,var(--panel-shadow);
  padding:10px 12px;z-index:20}
.dialogue__name{font-family:var(--font-head);color:var(--accent-alt);font-size:15px;font-weight:700;margin:0 0 6px 4px}
.dialogue__text{min-height:48px;padding:9px 11px;border:1px solid var(--brass);background:var(--parchment);
  color:var(--parchment-ink);font-family:Georgia,Cambria,"Times New Roman",serif;font-size:14px;line-height:1.45}
.dialogue__choices{display:flex;flex-direction:column;gap:4px;margin-top:8px}
.dialogue__choices .btn{text-align:left;justify-content:flex-start;background:#172a47;border:1px solid #8f9caf;color:var(--text);font-weight:700}
.dialogue__choices .btn:hover{background:#604923;border-color:#f0d47d;color:#fff9de}

/* Log, toast, and combat numbers */
.msg-log{position:fixed;left:12px;bottom:16px;width:min(300px,42vw);max-height:140px;overflow:hidden;
  display:flex;flex-direction:column;justify-content:flex-end;gap:2px;padding-left:7px;border-left:2px solid #8392a5;
  font-size:10px;line-height:1.35;text-shadow:1px 1px 0 #000}
.msg-log .line{opacity:.9;animation:fadeIn .18s steps(3,end)}
.msg-log .line--sys{color:var(--text-muted)}
.msg-log .line--good,.toast.line--good{color:#b8d6ad}
.msg-log .line--bad,.toast.line--bad{color:#ef9b9e}
.toast{position:fixed;top:72px;left:50%;transform:translateX(-50%);width:max-content;max-width:min(560px,90vw);
  padding:7px 12px;background:#172a47;border:2px solid #d0d8e0;border-radius:2px;box-shadow:inset 0 0 0 1px #3b5680,3px 3px 0 rgba(0,0,0,.62);
  color:var(--text);font-size:11px;line-height:1.35;text-align:center;overflow-wrap:anywhere;z-index:30;animation:fadeIn .16s steps(3,end)}
.dmg-float{position:absolute;font-family:var(--font-ui);font-weight:800;font-size:17px;pointer-events:none;
  color:var(--accent-alt);text-shadow:1px 1px 0 #000,-1px 0 #000,0 -1px #000;animation:dmgRise .7s steps(7,end) forwards;z-index:15}
.dmg-float--crit{color:#fff0a4;font-size:22px}
.dmg-float--heal{color:#a9d29e}

/* Higher-specificity runtime component treatment. */
.panel .stat-row{padding:4px 2px;border-bottom:1px solid #405675}
.panel .tree-node{border-bottom-color:#405675}
.panel .tree-node.owned{background:#1d3a32}
.panel .doll-slot{border-color:#7f8da0;border-radius:1px;background:#111f35}
.panel .doll-slot[data-unequip]:hover{background:#43232b;border-color:#d77d81}
.panel .bag-cat,.panel .q-cat{color:var(--accent-alt);font-family:var(--font-head);letter-spacing:0}
.panel .bag-cat{border-bottom-color:#6f7e91}
.panel .bag-tab{border-color:#8d9bae;border-radius:1px;color:#c1cad5}
.panel .bag-tab:hover{border-color:var(--accent-alt);color:#fff2bb}
.panel .bag-tab.on{background:#8b6a29;color:#fff8d9;border-color:#f0d47d}
.panel .q-card{border:1px solid #8f7b4e;border-radius:1px;padding:8px 10px;background:var(--parchment);
  color:var(--parchment-ink);--text:#252823;--text-muted:#625e52;--accent-alt:#725719;--success:#3f6748;--panel-border:#8f7b4e}
.panel .q-card .btn{color:#f6f0df}
.panel .sk-scroll{border-top-color:#718095}
.panel .sk-node{border-radius:2px;border-color:#7f8da0;background:#111d31;box-shadow:2px 2px 0 rgba(0,0,0,.5)}
.panel .sk-node.owned{border-color:#b59a59;background:#1f385e}
.panel .sk-node.owned.can{border-color:#89ad8e}
.panel .sk-node.maxed{border-color:#f0d47d;background:#604923;box-shadow:0 0 0 1px #947338}
.panel .sk-node.ready{border-color:#9dc19f;box-shadow:0 0 0 2px rgba(111,150,105,.48);animation:none}
.panel .sk-node.can:hover{background:#2a4a77;outline:1px solid #f0d47d;transform:translateY(-1px)}
.panel .sk-node .sk-lv{border-radius:1px;background:#080d14}
.panel .sk-band{color:#9fc3ea}
.sk-tip,.slot-picker{background:#132440;border:2px solid #cbd4dd;border-radius:2px;
  box-shadow:inset 0 0 0 2px #314b73,3px 3px 0 rgba(0,0,0,.65)}
.sk-tip .tip-eff{color:#f1d675}
.sk-tip .tip-flav{color:#b8c1ce}
.slot-picker .sp-head{border-bottom-color:#7e8da1}
.slot-picker .sp-row{border-radius:1px}
.slot-picker .sp-row:hover{background:#6d5424;color:#fff4c2}
.hud .job-bar{background:#0a111d;border:none}
.hud .job-bar .fill{background:#638cc1}
#hud .momentum-pips .pip{width:10px;height:10px;border-radius:1px;background:#111925;border-color:#69778a}
#hud .momentum-pips .pip.on{background:#d2ad4e;border-color:#ffe59a;box-shadow:0 0 0 1px #725822}
#hud .momentum-pips .pip.on.ready{background:#963741;border-color:#efb2b5;box-shadow:0 0 0 1px #5d1f27}

/* Carved wood and parchment skin. Specificity keeps this skin authoritative over the runtime helpers. */
#hud .bar{height:16px;border:2px solid var(--gold);background:#130b07;
  box-shadow:inset 0 0 0 1px #080402,inset 0 2px 0 rgba(255,255,255,.06),2px 2px 0 rgba(9,5,2,.72)}
#hud .bar > .fill{box-shadow:inset 0 2px 0 rgba(255,255,255,.18),inset 0 -2px 0 rgba(0,0,0,.28)}
#hud .bar > .label{color:#fff8dc;font-size:9px;text-shadow:1px 1px 0 #120806,-1px 0 #120806}
#hud .hp-bar .fill{background:linear-gradient(90deg,#722a2e,#b64a43)}
#hud .mp-bar .fill{background:linear-gradient(90deg,#315789,#548bc0)}
#hud .xp-bar{height:9px;border-width:2px 0 0;border-color:var(--gold-deep);background:var(--wood-deep);box-shadow:inset 0 1px #070402}
#hud .xp-bar .fill{background:linear-gradient(90deg,#987128,#e1bd55,#f2d88a)}
#hud .stat-stack{gap:5px;padding:7px 8px 6px;background:var(--wood-grain),linear-gradient(135deg,var(--wood-mid),var(--wood-deep));
  border:2px solid var(--gold);outline:2px solid #1a0e07;box-shadow:inset 0 0 0 2px #76502d,4px 4px 0 rgba(9,5,2,.68)}
#hud .stat-stack .hud-identity{min-width:0;color:var(--gold-bright)}
#hud .stat-stack #hud-job{color:#b7d6df}
#hud .stat-stack #hud-zeny{overflow:hidden;text-overflow:ellipsis}
#hud .level-badge{background:radial-gradient(circle,#4c321d 0 52%,#211208 54%);border:3px solid var(--gold);
  outline:2px solid #1a0e07;box-shadow:inset 0 0 0 2px #8a6031,3px 3px 0 rgba(9,5,2,.72)}
#hud .level-badge small{color:#ead7a6}
#hud .level-badge b,#hud .level-badge .hud-crest{color:var(--gold-bright)}

#hud .minimap{overflow:hidden;background:#130d08;border:3px solid var(--gold);outline:3px solid #27150a;
  box-shadow:inset 0 0 0 2px #75502b,5px 5px 0 rgba(9,5,2,.68)}
#hud .minimap:after{content:"";position:absolute;inset:2px;border:1px solid rgba(255,239,185,.32);pointer-events:none}
#hud .minimap #minimap-name{right:4px!important;bottom:3px!important;left:4px!important;padding:2px 4px;background:rgba(31,17,8,.86);
  color:#f5e7bb!important;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-shadow:1px 1px #000}
#hud .quest-tracker{padding:9px 10px;color:#3a2b19;background:var(--paper-grain),linear-gradient(135deg,var(--parchment-light),var(--parchment));
  --text:#3a2b19;--text-muted:#69583b;--accent-alt:#5d4016;--success:#285a31;
  border:3px solid var(--gold);outline:2px solid #29170c;box-shadow:inset 0 0 0 1px var(--parchment-shadow),4px 4px 0 rgba(9,5,2,.65);
  font-size:10px;line-height:1.48;scrollbar-color:var(--wood-light) var(--parchment-shadow)}
#hud .quest-tracker b,#hud .quest-tracker strong{color:#3d2814}
#hud .quest-tracker .task-link--compact{border-top-color:rgba(84,57,26,.24)}
#hud .quest-tracker .task-link:hover,#hud .quest-tracker .task-link.active{background:rgba(124,84,35,.15);outline-color:rgba(94,59,21,.45)}

body #hud .hud-menu .btn{min-height:28px;padding:5px 8px;border:2px solid var(--gold-deep);background:var(--wood-grain),linear-gradient(#684624,#382111);
  color:#fff0bd;box-shadow:inset 0 0 0 1px #8c6637,2px 3px 0 rgba(9,5,2,.65);text-shadow:1px 1px #170c06}
body #hud .hud-menu .btn:hover{border-color:var(--gold-bright);background:var(--wood-grain),linear-gradient(#7a552d,#4a2d17);color:#fff8dc}
body #hud .hud-menu .btn:active{transform:translateY(2px);box-shadow:inset 0 0 0 1px #8c6637,1px 1px 0 rgba(9,5,2,.7)}

body #hud .hotbar-shell .hotbar{gap:4px;padding:6px;background:var(--wood-grain),linear-gradient(135deg,#5d3d21,#241308);
  border:3px solid var(--gold);outline:2px solid #1a0d06;box-shadow:inset 0 0 0 2px #7a5129,4px 5px 0 rgba(9,5,2,.7)}
body #hud .hotbar-shell .skill-btn{width:50px;height:50px;flex:0 0 50px;border:2px solid #b69455;background:linear-gradient(145deg,#263f4c,#13222a);
  box-shadow:inset 0 0 0 2px #0b1115,inset 0 2px 0 rgba(255,255,255,.12);color:#fff8df}
body #hud .hotbar-shell .skill-btn:hover{transform:translateY(-2px);border-color:var(--gold-bright);background:linear-gradient(145deg,#355565,#182e39)}
body #hud .hotbar-shell .skill-btn.item-slot{background:linear-gradient(145deg,#365238,#19291c);border-color:#a9c278}
body #hud .hotbar-shell .skill-btn .key{top:3px;left:4px;padding:0 2px;background:#1c1008;color:var(--gold-bright);line-height:12px}
body #hud .hotbar-shell .hotbar-config{width:36px;border:3px solid var(--gold);outline:2px solid #1a0d06;background:var(--wood-grain),linear-gradient(#62401f,#2c190d);
  color:var(--gold-bright);box-shadow:inset 0 0 0 1px #7d572d,3px 4px 0 rgba(9,5,2,.7)}
body #hud .hotbar-shell .hotbar-config:hover{border-color:var(--gold-bright);background:linear-gradient(#78512a,#432713)}
body #hud .hotbar-shell .momentum-pips{padding:4px 8px;background:var(--wood-grain),linear-gradient(#4d321b,#211208);
  border:2px solid var(--gold-deep);box-shadow:inset 0 0 0 1px #73502b,2px 3px 0 rgba(9,5,2,.62)}
body #hud .momentum-pips .momentum-label{color:#ead9ad}

body .panel{width:min(760px,92vw);min-width:340px;max-height:82vh;overflow:auto;background:var(--wood-grain),linear-gradient(135deg,var(--wood-mid),var(--wood-deep));
  border:4px solid var(--gold);outline:3px solid #1a0d06;box-shadow:inset 0 0 0 2px #7a522c,var(--panel-shadow);scrollbar-color:var(--wood-light) var(--parchment-shadow)}
body .panel .panel__head{position:sticky;top:0;z-index:3;min-height:40px;padding:8px 11px 8px 16px;border-bottom:3px solid var(--gold);
  background:var(--wood-grain),linear-gradient(90deg,#2a170b,#6a4524 48%,#2a170b);color:var(--gold-bright);
  font-size:17px;text-shadow:1px 2px #160b05;box-shadow:inset 0 -1px #8f6634}
body .panel .panel__head:before{content:"◆";margin-right:8px;color:#f4dc95;font:10px var(--font-ui)}
body .panel .panel__body{padding:13px 15px;color:var(--parchment-ink);background:var(--paper-grain),linear-gradient(135deg,var(--parchment-light),var(--parchment));
  --text:#302619;--text-muted:#67583f;--accent-alt:#785719;--panel-border:#92733c;--success:#3f6748;overflow-wrap:anywhere}
body .panel .panel__close{flex:0 0 27px;width:27px;height:25px;border:2px solid var(--gold);background:linear-gradient(#694625,#351e0f);
  color:#fff1bf;box-shadow:inset 0 0 0 1px #8b6030;line-height:19px}
body .panel .panel__close:hover{background:#782c35;border-color:#f0c988;color:#fff}
body .panel .stat-row{padding:6px 4px;border-bottom:1px solid rgba(78,52,24,.25)}
body .panel .doll-slot{border:2px solid #92733c;background:rgba(255,247,218,.42);box-shadow:inset 0 0 0 1px rgba(255,255,255,.28)}
body .panel .doll-slot[data-unequip]:hover{background:#e2c7a0;border-color:#963741}
body .panel .bag-cat,body .panel .q-cat{color:#684711;border-bottom-color:#9d7a3c;text-shadow:0 1px rgba(255,255,255,.45)}
body .panel .bag-tab{border:2px solid #92733c;background:rgba(255,248,220,.35);color:#55462f}
body .panel .bag-tab:hover{border-color:#6e4b1d;color:#382812}
body .panel .bag-tab.on{background:linear-gradient(#7b5928,#5d3e18);border-color:#3d270e;color:#fff3c0;box-shadow:inset 0 0 0 1px #c5a057}
body .panel .q-card{border:2px solid #92733c;background:var(--paper-grain),#eee0bb;box-shadow:2px 2px 0 rgba(80,51,21,.22)}
body .panel[data-kind="quest"] .panel__body,body .panel[data-kind="guild"] .panel__body{color:var(--quest-ink);background:var(--paper-grain),var(--quest-paper)}
body .panel[data-kind="quest"] .q-card,body .panel[data-kind="guild"] .q-card{color:var(--quest-ink);background:var(--paper-grain),#f7edcf;border-color:#846837}
body .panel[data-kind="quest"] .q-card small,body .panel[data-kind="guild"] .q-card small{color:var(--quest-muted)}
body .panel[data-kind="quest"] .task-card:hover,body .panel[data-kind="quest"] .task-card.active{background:var(--paper-grain),#fff3d4;border-color:#6b4b1f!important}
body .panel[data-kind="quest"] .story-phase{background:var(--paper-grain),#e5d5ad;border-color:#8a7044;border-top-color:var(--phase-color);box-shadow:1px 1px 0 rgba(76,48,20,.28)}
body .panel[data-kind="quest"] .story-phase.cleared{background:var(--paper-grain),#dce3c8;border-color:#6d815b;border-top-color:var(--phase-color)}
body .panel[data-kind="quest"] .story-phase.active{background:var(--paper-grain),#fff0c9;box-shadow:inset 0 0 0 1px #9a7940,1px 1px 0 rgba(76,48,20,.28)}
body .panel[data-kind="quest"] .story-phase.locked{background:var(--paper-grain),#d4c6a5;filter:saturate(.55);opacity:.78}
body .panel[data-kind="quest"] .story-phase__copy small{color:#66583f}
body .panel[data-kind="quest"] .story-phase__copy b{color:#302619;text-shadow:none}
body .panel[data-kind="quest"] .story-phase__copy em{color:#5d421c}
body .panel[data-kind="quest"] .story-phase__state{color:#4d391e}
body .panel[data-kind="quest"] .story-phase__sigil{background:#3a2918;color:#fff0c0;border-color:var(--phase-color)}
body .panel[data-kind="quest"] .story-phase-badge{background:#f8edcf;color:#3c2c18;border-color:#8b7040;border-left-color:var(--phase-color);text-shadow:none}
body .panel .difficulty-badge{color:#342718;border-color:var(--difficulty-color);background:#f0e2c2}
body .panel .bounty-actions{display:flex;align-items:center;justify-content:flex-end;gap:5px;flex-wrap:wrap}
body .panel[data-kind="quest"] .bounty-actions{margin-top:7px;padding-top:7px;border-top:1px solid rgba(91,62,28,.22)}
body .panel .bounty-actions .btn{min-height:25px;padding:4px 8px;font-size:10px}
body .bounty-level{display:inline-block;margin:3px 0;padding:2px 6px;border:1px solid #5e754e;background:rgba(72,105,63,.12);color:#31502f;font-size:10px;font-weight:800;line-height:1.25}
body .bounty-level--danger{border-color:#9b3e45;background:rgba(139,43,51,.13);color:#7b202c}
#hud .quest-tracker .bounty-level{margin:2px 0 0;padding:1px 4px;font-size:8px}
body .panel .guild-board-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
body .panel .guild-board-head .btn{min-height:25px;padding:4px 8px;font-size:10px}
body .btn--confirm{border-color:#f0b45f;box-shadow:inset 0 0 0 1px #d78a54,0 0 0 2px rgba(135,40,44,.28),2px 2px 0 rgba(34,18,8,.56)}
body .panel .sk-scroll{border-top-color:#9d7a3c}
body .panel .sk-node{color:#392b1b;background:var(--paper-grain),linear-gradient(#f3e7c5,#d9c492);border-color:#8b6835;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.38),2px 2px 0 rgba(51,30,12,.35)}
body .panel .sk-node.owned{color:#f5edcf;background:linear-gradient(#456148,#263c2b);border-color:#c19b51}
body .panel .sk-node.maxed{color:#fff1bc;background:linear-gradient(#73501f,#3f290e);border-color:var(--gold-bright)}
body .panel .sk-node .sk-nm{color:inherit;text-shadow:none}
body .panel .sk-node.owned .sk-lv,body .panel .sk-node.maxed .sk-lv{color:#fff0bd}

body .btn{min-height:29px;padding:6px 11px;border:2px solid var(--gold-deep);background:var(--wood-grain),linear-gradient(#5f4123,#33200f);
  color:#fff1c1;box-shadow:inset 0 0 0 1px #846039,2px 2px 0 rgba(34,18,8,.56);text-shadow:1px 1px #170c06}
body .btn:hover{background:var(--wood-grain),linear-gradient(#75502c,#472a15);border-color:var(--gold-bright);color:#fff9e0}
body .btn--ghost{background:var(--wood-grain),linear-gradient(#4d3520,#27180d);border-color:#a8874d;color:#f3e5bb}
body .btn--ghost:hover{background:var(--wood-grain),linear-gradient(#684725,#392211)}
body .btn--danger{background:var(--wood-grain),linear-gradient(#8d3d43,#542128);border-color:#a85255;color:#fff1df;box-shadow:inset 0 0 0 1px #b76568,2px 2px 0 rgba(34,18,8,.56)}
body .btn--danger:hover{background:var(--wood-grain),linear-gradient(#a84a4e,#6e292f);border-color:#d8847e;color:#fff}
body .btn:disabled{opacity:.48;filter:grayscale(.35);box-shadow:none}

/* Numeric resource labels and fills must describe the same instant. */
#hud .hp-bar .fill,#hud .mp-bar .fill{transition:none!important}

body .dialogue{max-height:calc(100vh - 98px);overflow:auto;padding:12px 14px;background:var(--wood-grain),linear-gradient(135deg,var(--wood-mid),var(--wood-deep));
  border:4px solid var(--gold);outline:3px solid #190d06;box-shadow:inset 0 0 0 2px #76502c,var(--panel-shadow)}
body .dialogue .dialogue__name{display:inline-block;margin:0 0 7px;padding:3px 10px;border:1px solid #d8b55e;background:#27150b;
  color:var(--gold-bright);font-size:16px;text-shadow:1px 1px #000}
body .dialogue .dialogue__text{min-height:54px;padding:11px 13px;border:2px solid #9c7b3e;background:var(--paper-grain),linear-gradient(135deg,var(--parchment-light),var(--parchment));
  color:var(--parchment-ink);box-shadow:inset 0 0 0 1px rgba(255,255,255,.35);font-size:14px;line-height:1.5;overflow-wrap:anywhere}
body .dialogue .dialogue__choices{gap:5px;margin-top:9px}
body .dialogue .dialogue__choices .btn{border-color:#bb9450;background:linear-gradient(#624222,#321d0e);color:#fff2c3}
body .dialogue .dialogue__choices .btn:hover{background:linear-gradient(#765126,#452a12);border-color:var(--gold-bright)}

body .toast{padding:9px 14px;border:3px solid var(--gold);outline:2px solid #1b0e07;background:var(--wood-grain),linear-gradient(#5a3a1d,#28160b);
  color:#fff2c8;box-shadow:inset 0 0 0 1px #7d562b,4px 4px 0 rgba(9,5,2,.68);font-size:11px;text-shadow:1px 1px #120906}
body .toast.line--good{color:#c9ecb9}
body .toast.line--bad{color:#ffc0b8}
body .sk-tip,body .slot-picker{max-width:min(300px,calc(100vw - 16px));border:3px solid var(--gold);outline:2px solid #1a0d06;border-radius:2px;
  background:var(--paper-grain),linear-gradient(135deg,var(--parchment-light),var(--parchment));color:var(--parchment-ink);
  box-shadow:inset 0 0 0 1px var(--parchment-shadow),4px 4px 0 rgba(9,5,2,.68)}
body .sk-tip{padding:10px 12px;line-height:1.5}
body .sk-tip .tip-name,body .slot-picker .sp-head{color:#67460f}
body .sk-tip .tip-eff{color:#6b4212}
body .sk-tip .tip-row,body .sk-tip .tip-flav{color:#65563d}
body .sk-tip .tip-row b{color:#302619}
body .sk-tip .tip-mastery{border-left-color:#5b7794;background:rgba(63,91,119,.11);color:#415f77}
body .sk-tip .tip-mechanics{background:rgba(255,249,224,.44);border-color:#a1834d}
body .slot-picker{min-width:200px;padding:7px;scrollbar-color:var(--wood-light) var(--parchment-shadow)}
body .slot-picker .sp-head{padding:3px 7px 7px;border-bottom:2px solid #a78443}
body .slot-picker .sp-row{padding:6px 8px;color:#3c2b19;overflow:hidden;text-overflow:ellipsis}
body .slot-picker .sp-row:hover{background:#6b4b23;color:#fff4c6}
body .slot-picker .sp-sep{background:#a2834c}
body .slot-picker kbd,body .sk-tip kbd{color:#6b4610}

/* Title and class selection stay game-like rather than promotional. */
body .title-screen{background:linear-gradient(rgba(23,17,12,.40),rgba(24,13,7,.68))}
body .title-inner{max-width:920px;padding:26px 24px;border:4px solid var(--gold);outline:3px solid #180c06;
  background:var(--wood-grain),linear-gradient(135deg,rgba(81,53,29,.96),rgba(24,13,7,.97));box-shadow:inset 0 0 0 2px #76502d,6px 7px 0 rgba(8,4,2,.68)}
body .title-h1{font-size:38px;color:#efd16f;text-shadow:2px 2px 0 #69252f;letter-spacing:0}
.title-screen .account-bar{border-color:#7f8da0;border-radius:2px;background:#13233c}
.title-screen .signin-panel{border-color:#cbd4dd;border-radius:2px;background:#142744;
  box-shadow:inset 0 0 0 2px #314b73,4px 5px 0 rgba(0,0,0,.65)}
.title-screen .signin-input,#hero-name{border-radius:1px!important;border-color:#9aa8b9!important;background:#090f18!important;color:var(--text)!important}
.title-screen .class-card{border-radius:2px;background:#172a47;border-color:#9ba8b8;outline-color:var(--accent-alt)!important;box-shadow:inset 0 0 0 1px #314b73,2px 2px 0 #080d14}
.title-screen .class-card:hover{background:#23416b;border-color:#efd16f;transform:translateY(-1px)}
.title-screen .cc-name{font-family:var(--font-head);color:#efd16f}

@keyframes dmgRise{
  0%{transform:translateY(0);opacity:0}
  14%{transform:translateY(-6px);opacity:1}
  100%{transform:translateY(-38px);opacity:0}
}
@keyframes fadeIn{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}

@media (max-width:680px){
  #hud .stat-stack{left:58px;width:min(176px,calc(100vw - 170px));padding:5px 6px;gap:4px}
  #hud .level-badge{left:8px;width:44px;height:44px}
  #hud .minimap{top:8px;right:8px;width:96px;height:96px}
  #hud .quest-tracker{top:110px;right:8px;width:min(168px,45vw);max-height:min(150px,calc(100vh - 198px));padding:7px;font-size:9px}
  #hud .hud-menu{top:auto;right:8px;bottom:76px;max-width:55vw;gap:3px}
  body #hud .hud-menu .btn{min-height:25px;padding:4px 5px;font-size:9px}
  body #hud .hotbar-shell{max-width:calc(100vw - 12px)}
  body #hud .hotbar-shell .hotbar{max-width:calc(100vw - 54px);overflow-x:auto;gap:3px;padding:4px}
  body #hud .hotbar-shell .skill-btn{width:42px;height:42px;flex:0 0 42px}
  body #hud .hotbar-shell .hotbar-config{width:32px;flex:0 0 32px}
  .msg-log{left:8px;width:42vw;max-height:100px;font-size:9px}
  body .panel{min-width:0;width:calc(100vw - 16px);max-width:calc(100vw - 16px);max-height:84vh;border-width:3px;outline-width:2px}
  body .panel .panel__head{min-height:36px;padding:6px 8px 6px 10px;font-size:15px}
  body .panel .panel__body{padding:9px}
  body .panel .q-card>div{align-items:flex-start!important;flex-direction:column}
  body .panel .bounty-actions{width:100%;justify-content:flex-start}
  body .dialogue{bottom:72px;width:calc(100vw - 16px);max-height:calc(100vh - 86px);padding:8px;border-width:3px;outline-width:2px}
  body .dialogue .dialogue__text{font-size:13px;min-height:42px;padding:9px}
  body .toast{max-width:calc(100vw - 16px);padding:7px 10px}
  body .slot-picker{min-width:min(200px,calc(100vw - 16px));max-height:min(300px,calc(100vh - 16px))}
  body .title-inner{padding:18px 10px}
  body .title-h1{font-size:28px}
}
@media (max-width:400px){
  .hud-identity{font-size:9px;gap:3px}
  #hud .hud-menu{max-width:58vw}
  #hud .hud-menu .btn{font-size:8px;padding:3px 4px}
  .toast{top:66px;font-size:10px}
  body .title-h1{font-size:23px}
}
@media (prefers-reduced-motion:reduce){
  .bar > .fill,.skill-btn,.btn{transition:none}
  .msg-log .line,.toast,.dmg-float{animation-duration:.01ms}
}

/* Touch Controls & Virtual Joystick */
.touch-controls{position:fixed;inset:0;pointer-events:none;z-index:25;display:flex;justify-content:space-between;align-items:flex-end;padding:20px}
.touch-controls > *{pointer-events:auto}
.touch-joystick{position:absolute;bottom:24px;left:20px;width:110px;height:110px;border-radius:50%;background:rgba(23,17,12,.65);border:2px solid var(--gold);box-shadow:inset 0 0 10px rgba(0,0,0,.8),0 4px 8px rgba(0,0,0,.6);touch-action:none;display:flex;align-items:center;justify-content:center}
.touch-joystick-base{position:relative;width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center}
.touch-joystick-knob{position:absolute;width:44px;height:44px;border-radius:50%;background:radial-gradient(circle,var(--gold-bright) 0%,var(--gold-deep) 100%);border:2px solid var(--gold);box-shadow:0 2px 6px rgba(0,0,0,.7);transform:translate(0px,0px);will-change:transform}
.touch-action-buttons{position:absolute;bottom:24px;right:20px;display:grid;grid-template-columns:repeat(3,48px);grid-template-rows:repeat(2,48px);gap:8px;touch-action:none}
.touch-action-btn{width:48px;height:48px;border-radius:50%;background:var(--wood-grain),linear-gradient(135deg,#5d3d21,#241308);border:2px solid var(--gold);color:var(--gold-bright);font-family:var(--font-ui);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:2px 3px 6px rgba(0,0,0,.6);user-select:none;-webkit-user-select:none;cursor:pointer}
.touch-action-btn:active{transform:scale(.92);background:var(--gold-deep);color:#fff}
.touch-action-btn.touch-btn-atk{grid-column:3;grid-row:2;background:linear-gradient(135deg,#963741,#5d1f27);border-color:#f2a0a5;width:56px;height:56px;font-size:12px;margin-top:-4px;margin-left:-4px}
.touch-action-btn.touch-btn-dodge{grid-column:2;grid-row:2;background:linear-gradient(135deg,#3f6048,#19291c);border-color:#a9c278}

/* Settings Sliders */
.setting-row{display:flex;justify-content:space-between;align-items:center;padding:8px 4px;border-bottom:1px solid rgba(120,90,50,.3)}
.setting-row input[type="range"]{accent-color:var(--gold-bright);cursor:pointer}

/* Stamina bar (dodge/parry fuel) — kept slim against the 16px #hud .bar default */
#hud .stamina-bar,.stamina-bar{height:7px;border-width:0 2px 2px;background:#131a10}
#hud .stamina-bar > .fill,.stamina-bar > .fill{background:linear-gradient(90deg,#8fbf5b,#d7e86a)}

/* Macro rule builder */
.macro-rule{display:flex;align-items:center;gap:8px;padding:4px 6px;border:1px solid rgba(120,90,50,.35);margin-bottom:4px;background:rgba(0,0,0,.25)}
.macro-rule code{flex:1;font-size:11px;color:var(--gold-bright)}
.macro-rule__del{background:none;border:none;color:#e08d8d;font-size:14px;cursor:pointer;padding:0 4px}
.macro-builder{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:11px;margin-top:6px}
.macro-builder select,.macro-builder input{background:#171712;color:var(--text,#e8dcc0);border:1px solid rgba(120,90,50,.5);font-size:11px;padding:2px 4px}
.macro-builder input{width:52px}
.macro-json{margin-top:8px;font-size:11px}
.macro-json textarea{width:100%;background:#12120d;color:#cfe3a8;border:1px solid rgba(120,90,50,.5);font-family:monospace;font-size:10px;margin:6px 0}

/* High-contrast / colorblind mode (Settings > Accessibility) */
body.hc-mode .hp-bar .fill,body.hc-mode #hud .hp-bar .fill{background:#ff9d3c}
body.hc-mode .mp-bar .fill,body.hc-mode #hud .mp-bar .fill{background:#6ec6ff}
body.hc-mode .stamina-bar > .fill,body.hc-mode #hud .stamina-bar > .fill{background:#e8ffd8}
body.hc-mode .bar{border-width:2px;border-color:#fff}
body.hc-mode #hud .bar{border-width:3px}
body.hc-mode .msg-log .line{color:#fff;text-shadow:1px 1px 0 #000,-1px -1px 0 #000}
body.hc-mode .toast{color:#fff;border-color:#fff}
`,
};
