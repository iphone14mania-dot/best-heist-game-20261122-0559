// Nightvault — game state and update loop. One job: own the rules.
// Screens: title → briefing (loadout) → play → caught / cleared → win.
// The renderer draws whatever this state says; the AI lives in guards.js.

import { TILE, PLAYER, ALARM, TOOLS, SCORE, GUARD } from './config.js';
import { LEVELS, findMarker } from './levels.js';
import { Guard, Camera, alarmRateFor } from './guards.js';
import { dist, tileAt, moveCircle, isSolidTile } from './utils.js';

export class Game {
  constructor(sound) {
    this.sound = sound;
    this.screen = 'title'; // title | briefing | play | caught | cleared | win
    this.levelIndex = 0;
    this.credits = 150;
    this.tools = { coin: TOOLS.coin.start, smoke: TOOLS.smoke.start, emp: TOOLS.emp.start, lockpick: TOOLS.lockpick.start };
    this.totalScore = 0;
    this.totalLoot = 0;
    this.best = 0;
    try { this.best = Number(localStorage.getItem('nightvault-best') || 0) || 0; } catch (e) { this.best = 0; }
    this.time = 0;
    this.message = '';
    this.messageTimer = 0;
    this.paused = false;
    this.shake = 0;
    this.level = null;
    this.resetLevelState();
  }

  resetLevelState() {
    this.player = { x: 0, y: 0, facing: 0, sneaking: false, sprinting: false, moving: false, hidden: false };
    this.guards = [];
    this.cameras = [];
    this.loot = [];
    this.coins = [];
    this.smokes = [];
    this.particles = [];
    this.alarm = 0;
    this.peakAlarm = 0;
    this.levelScore = 0;
    this.levelLoot = 0;
    this.targetTaken = false;
    this.exitOpen = false;
    this.levelTime = 0;
    this.doorProgress = 0;
    this.doorTarget = null;
    this.interactTarget = null;
    this.interactProgress = 0;
    this.caughtBy = '';
    this.busts = 0;
    this.frozen = false; // staged screenshots: render the frame, run no AI/alarm
  }

  get levelDef() {
    return LEVELS[this.levelIndex];
  }

  startLevel(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    this.resetLevelState();
    const start = findMarker(this.level.map, 'P');
    this.player.x = (start.tx + 0.5) * TILE;
    this.player.y = (start.ty + 0.5) * TILE;
    this.guards = this.level.guards.map((g) => {
      const guard = new Guard(g, this.level.map);
      guard.onAlert = () => this.sound.spotted();
      return guard;
    });
    this.cameras = this.level.cameras.map((c) => new Camera(c));
    this.loot = this.level.loot.map((l) => ({ ...l, x: (l.tx + 0.5) * TILE, y: (l.ty + 0.5) * TILE, taken: false }));
    this.screen = 'play';
    this.say(`Steal ${this.level.target}, then reach the getaway van.`);
  }

  toBriefing(index) {
    this.levelIndex = index;
    this.screen = 'briefing';
  }

  say(text, seconds) {
    this.message = text;
    this.messageTimer = seconds || 4;
  }

  buyTool(key) {
    const def = TOOLS[key];
    if (this.credits < def.price) {
      this.sound.denied();
      this.say(`Not enough credits for ${def.name}.`);
      return false;
    }
    this.credits -= def.price;
    this.tools[key] += 1;
    this.sound.buy();
    this.say(`Bought ${def.name}.`);
    return true;
  }

  tileUnderPlayer() {
    return tileAt(this.level.map, this.player.x, this.player.y);
  }

  nearestLoot() {
    let best = null;
    let bestD = 30;
    for (const l of this.loot) {
      if (l.taken) continue;
      const d = dist(this.player.x, this.player.y, l.x, l.y);
      if (d < bestD) { best = l; bestD = d; }
    }
    return best;
  }

  nearestDoor() {
    // A locked door tile adjacent to the player (within one tile).
    const px = Math.floor(this.player.x / TILE);
    const py = Math.floor(this.player.y / TILE);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = px + dx;
        const ty = py + dy;
        if (ty < 0 || ty >= this.level.map.length || tx < 0 || tx >= this.level.map[0].length) continue;
        if (this.level.map[ty][tx] === 'D') {
          const cx = (tx + 0.5) * TILE;
          const cy = (ty + 0.5) * TILE;
          if (dist(this.player.x, this.player.y, cx, cy) < TILE + 14) return { tx, ty, x: cx, y: cy };
        }
      }
    }
    return null;
  }

  targetPos() {
    const t = findMarker(this.level.map, 'T');
    return { x: (t.tx + 0.5) * TILE, y: (t.ty + 0.5) * TILE };
  }

  exitPos() {
    const t = findMarker(this.level.map, 'X');
    return { x: (t.tx + 0.5) * TILE, y: (t.ty + 0.5) * TILE };
  }

  openDoor(door) {
    const row = this.level.map[door.ty].split('');
    row[door.tx] = '.';
    this.level.map[door.ty] = row.join('');
    this.sound.door();
    this.say('Door open.');
  }

  throwCoin(tx, ty) {
    if (this.tools.coin <= 0) {
      this.sound.denied();
      this.say('No noisemaker coins left — buy more in the briefing.');
      return;
    }
    this.tools.coin -= 1;
    this.coins.push({ x: tx, y: ty, t: 0 });
    this.sound.coin();
    for (const g of this.guards) g.investigate(tx, ty);
    this.say('Coin thrown — they heard that.');
  }

  useSmoke() {
    if (this.tools.smoke <= 0) {
      this.sound.denied();
      this.say('No smoke pellets left.');
      return;
    }
    this.tools.smoke -= 1;
    this.smokes.push({ x: this.player.x, y: this.player.y, r: 95, t: 4 });
    this.sound.smoke();
  }

  useEmp() {
    if (this.tools.emp <= 0) {
      this.sound.denied();
      this.say('No EMP charges left.');
      return;
    }
    this.tools.emp -= 1;
    for (const c of this.cameras) c.disabled = 6;
    this.sound.emp();
    this.say('Cameras down for 6 seconds.');
  }

  grabLoot(l) {
    l.taken = true;
    this.levelScore += l.value;
    this.levelLoot += l.value;
    this.sound.pickup();
    this.burst(l.x, l.y, '#ffd94a', 10);
    this.say(`+${l.value} — ${l.kind} pocketed.`);
  }

  grabTarget() {
    this.targetTaken = true;
    this.exitOpen = true;
    this.levelScore += SCORE.target;
    this.levelLoot += SCORE.target;
    this.sound.win();
    const tp = this.targetPos();
    this.burst(tp.x, tp.y, '#ffd94a', 22);
    this.say(`${this.level.target} secured! Get to the getaway van.`, 5);
  }

  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 30 + Math.random() * 90;
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0.5 + Math.random() * 0.4, color });
    }
  }

  bust(cause) {
    this.caughtBy = cause;
    this.busts += 1;
    this.totalScore = Math.max(0, this.totalScore - SCORE.bustPenalty);
    this.sound.caught();
    this.shake = 0.5;
    this.screen = 'caught';
  }

  clearLevel() {
    const timeBonus = Math.max(0, Math.round((this.level.par - this.levelTime) * 10));
    const ghost = this.peakAlarm <= ALARM.ghostThreshold ? SCORE.ghostBonus : 0;
    const gained = this.levelScore + timeBonus + ghost;
    this.totalScore += gained;
    this.totalLoot += this.levelLoot;
    this.credits += this.levelLoot;
    this.clearBreakdown = { loot: this.levelScore, time: timeBonus, ghost, gained };
    this.sound.win();
    if (this.totalScore > this.best) {
      this.best = this.totalScore;
      try { localStorage.setItem('nightvault-best', String(this.best)); } catch (e) { /* private mode */ }
    }
    this.screen = 'cleared';
  }

  update(dt, input) {
    this.time += dt;
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (this.shake > 0) this.shake -= dt;
    for (const p of this.particles) {
      p.t -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.t > 0);

    // Staged screenshot: hold the frame exactly as staged (no AI, no alarm).
    if (this.frozen) return;
    if (this.screen !== 'play' || this.paused) return;
    this.levelTime += dt;
    const p = this.player;

    // --- movement ---
    const mv = input.moveVector();
    p.sneaking = input.held('Shift');
    p.sprinting = input.held(' ') && !p.sneaking && (mv.x !== 0 || mv.y !== 0);
    const speed = p.sneaking ? PLAYER.sneak : p.sprinting ? PLAYER.sprint : PLAYER.walk;
    p.moving = mv.x !== 0 || mv.y !== 0;
    if (p.moving) p.facing = Math.atan2(mv.y, mv.x);
    moveCircle(this.level.map, p, mv.x * speed * dt, mv.y * speed * dt, PLAYER.radius);
    p.hidden = this.tileUnderPlayer() === ',';

    // Sprinting is loud: nearby guards get curious.
    if (p.sprinting && p.moving) {
      for (const g of this.guards) {
        if (g.state === 'patrol' && dist(g.x, g.y, p.x, p.y) < 120) g.investigate(p.x, p.y);
      }
    }

    // --- tools ---
    if (input.wasPressed('q')) this.throwCoin(p.x + Math.cos(p.facing) * 70, p.y + Math.sin(p.facing) * 70);
    if (input.wasPressed('f')) this.useSmoke();
    if (input.wasPressed('g')) this.useEmp();

    // --- interaction: loot / target / doors ---
    const loot = this.nearestLoot();
    const door = this.nearestDoor();
    const tp = this.targetPos();
    const nearTarget = !this.targetTaken && dist(p.x, p.y, tp.x, tp.y) < 30;
    if (loot || nearTarget || door) {
      this.interactProgress += input.held('e') ? dt : -dt * 2;
      this.interactProgress = Math.max(0, Math.min(1, this.interactProgress));
    } else {
      this.interactProgress = 0;
    }
    if (input.wasPressed('e') && door && this.tools.lockpick > 0) {
      this.tools.lockpick -= 1;
      this.openDoor(door);
      this.interactProgress = 0;
    } else if (this.interactProgress >= 1) {
      if (loot) this.grabLoot(loot);
      else if (nearTarget) this.grabTarget();
      else if (door) this.openDoor(door);
      this.interactProgress = 0;
    }
    this.interactTarget = loot ? { kind: 'loot', name: loot.kind } : nearTarget ? { kind: 'target', name: this.level.target } : door ? { kind: 'door', name: 'Locked door' } : null;

    // --- smoke / coins decay ---
    for (const s of this.smokes) s.t -= dt;
    this.smokes = this.smokes.filter((s) => s.t > 0);
    for (const c of this.coins) c.t += dt;
    this.coins = this.coins.filter((c) => c.t < 1.2);

    // --- watchers + alarm ---
    let seenBy = null;
    let seenDist = Infinity;
    for (const g of this.guards) {
      g.update(dt, p, this.smokes);
      const d = dist(g.x, g.y, p.x, p.y);
      if (g.canSee(p, this.smokes.some((s) => dist(g.x, g.y, s.x, s.y) < s.r + 10)) && d < seenDist) {
        seenBy = 'guard';
        seenDist = d;
      }
      if (g.state === 'alert' && d < GUARD.catchDistance) {
        this.bust('A guard grabbed you in the open.');
        return;
      }
    }
    for (const c of this.cameras) {
      c.update(dt);
      const d = dist(c.x, c.y, p.x, p.y);
      if (c.canSee(this.level.map, p, this.smokes) && d < seenDist) {
        seenBy = 'camera';
        seenDist = d;
      }
    }
    const inShadow = p.hidden;
    if (seenBy) {
      this.alarm += alarmRateFor(seenDist, p.sneaking, inShadow) * dt;
    } else {
      this.alarm -= ALARM.decay * dt;
    }
    this.alarm = Math.max(0, Math.min(100, this.alarm));
    this.peakAlarm = Math.max(this.peakAlarm, this.alarm);
    if (this.alarm >= 100) {
      this.bust(seenBy === 'camera' ? 'The cameras held you in frame too long.' : 'A guard raised the alarm.');
      return;
    }
    this.sound.updateAlarm(dt, this.alarm);

    // --- exit ---
    if (this.exitOpen) {
      const ep = this.exitPos();
      if (dist(p.x, p.y, ep.x, ep.y) < 30) this.clearLevel();
    }
  }

  // --- screen flow helpers (called from main.js) ---
  confirm() {
    if (this.screen === 'title') {
      this.toBriefing(0);
    } else if (this.screen === 'briefing') {
      this.startLevel(this.levelIndex);
    } else if (this.screen === 'caught') {
      this.startLevel(this.levelIndex);
    } else if (this.screen === 'cleared') {
      if (this.levelIndex + 1 < LEVELS.length) this.toBriefing(this.levelIndex + 1);
      else this.screen = 'win';
    } else if (this.screen === 'win') {
      this.totalScore = 0;
      this.totalLoot = 0;
      this.credits = 150;
      this.tools = { coin: TOOLS.coin.start, smoke: TOOLS.smoke.start, emp: TOOLS.emp.start, lockpick: TOOLS.lockpick.start };
      this.toBriefing(0);
    }
  }

  restartLevel() {
    if (this.screen === 'play' || this.screen === 'caught') this.startLevel(this.levelIndex);
  }
}
