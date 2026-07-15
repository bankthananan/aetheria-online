// Original 16-bit command-window design system for the medieval isekai RPG.
export const THEME = {
  palette: {
    bg: "#141a22",          // charcoal-blue field behind the canvas
    panelBg: "#152743",     // royal-blue command window
    panelBorder: "#c5ced8", // pale forged-metal frame
    textPrimary: "#f1eee3",
    textMuted: "#aeb9c8",
    accent: "#46684f",      // muted forest green
    accentAlt: "#d5b85d",   // selected-state gold
    hpRed: "#963741",       // oxblood
    mpBlue: "#416eaa",
    xpGold: "#c49c43",
    danger: "#c65356",
    success: "#6f9669",
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
  --bg:#141a22;--panel-bg:#152743;--panel-border:#c5ced8;
  --text:#f1eee3;--text-muted:#aeb9c8;
  --accent:#46684f;--accent-alt:#d5b85d;
  --hp:#963741;--mp:#416eaa;--xp:#c49c43;
  --danger:#c65356;--success:#6f9669;
  --iron:#1b2027;--iron-deep:#0d1219;--royal:#152743;--royal-light:#213b63;
  --oxblood:#782c35;--forest:#3f6048;--brass:#a98742;
  --parchment:#d8ccaa;--parchment-ink:#252823;
  --font-ui:ui-monospace,"SFMono-Regular",Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
  --font-head:Georgia,Cambria,"Times New Roman",Times,serif;
  --radius:2px;--panel-shadow:4px 5px 0 rgba(5,8,13,.72);
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
.bar > .fill{height:100%;width:50%;border-radius:0;transition:width .2s steps(8,end);background:var(--accent)}
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

/* Title and class selection stay game-like rather than promotional. */
body .title-screen{background:#101824;background-image:none}
body .title-inner{max-width:920px;padding:26px 24px;border-color:#aeb9c8;background:#0d1727}
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
  .stat-stack{left:58px;width:min(176px,calc(100vw - 170px));padding:4px}
  .level-badge{left:8px;width:44px;height:44px}
  .minimap{top:8px;right:8px;width:96px;height:96px}
  #hud .quest-tracker{top:110px;right:8px;width:min(168px,45vw);max-height:min(150px,calc(100vh - 198px));padding:6px;font-size:9px}
  #hud .hud-menu{top:auto;right:8px;bottom:76px;max-width:55vw;gap:3px}
  #hud .hud-menu .btn{padding:4px 5px;font-size:9px}
  .hotbar{max-width:96vw;overflow-x:auto;gap:3px;padding:3px}
  .hotbar .skill-btn{width:42px;height:42px;flex:0 0 42px}
  .msg-log{left:8px;width:42vw;max-height:100px;font-size:9px}
  .panel{min-width:0;width:94vw;max-height:84vh}
  .panel__body{padding:8px}
  .dialogue{bottom:72px;width:94vw;padding:8px}
  .dialogue__text{font-size:13px;min-height:42px}
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
`,
};
