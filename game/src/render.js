// Nightvault — everything the player sees. One job: draw the state.
// Map fills the top 640px; the HUD strip (alarm, loot, tools, timer) sits
// below it so one frame always shows the room AND the alarm meter.

import { TILE, VIEW_W, VIEW_H, COLORS, TOOLS, GUARD, CAMERA } from './config.js';
import { dist, angleDiff } from './utils.js';

export const HUD_H = 80;
export const CANVAS_W = VIEW_W;
export const CANVAS_H = VIEW_H + HUD_H;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
  }

  draw(game) {
    const ctx = this.ctx;
    ctx.save();
    if (game.shake > 0) {
      const s = game.shake * 14;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
    ctx.fillStyle = '#0b0f18';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    if (game.screen === 'title') this.drawTitle(game);
    else if (game.screen === 'briefing') this.drawBriefing(game);
    else if (game.screen === 'caught') { this.drawWorld(game); this.drawCaught(game); }
    else if (game.screen === 'cleared') { this.drawWorld(game); this.drawCleared(game); }
    else if (game.screen === 'win') this.drawWin(game);
    else { this.drawWorld(game); this.drawHud(game); }
    if (game.paused && game.screen === 'play') this.drawPaused(game);
    ctx.restore();
  }

  // ---------- world ----------
  drawWorld(game) {
    const ctx = this.ctx;
    const map = game.level.map;
    // Floor + shadow + walls + crates + doors.
    for (let ty = 0; ty < map.length; ty++) {
      for (let tx = 0; tx < map[0].length; tx++) {
        const ch = map[ty][tx];
        const x = tx * TILE;
        const y = ty * TILE;
        if (ch === '#') {
          ctx.fillStyle = COLORS.wall;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = COLORS.wallTop;
          ctx.fillRect(x, y, TILE, 5);
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.fillRect(x, y + TILE - 4, TILE, 4);
        } else if (ch === ',') {
          ctx.fillStyle = COLORS.shadow;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = COLORS.shadowEdge;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        } else {
          ctx.fillStyle = (tx + ty) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
          ctx.fillRect(x, y, TILE, TILE);
        }
        if (ch === 'C') {
          ctx.fillStyle = COLORS.crate;
          ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
          ctx.strokeStyle = COLORS.crateEdge;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
          ctx.beginPath();
          ctx.moveTo(x + 4, y + 4);
          ctx.lineTo(x + TILE - 4, y + TILE - 4);
          ctx.moveTo(x + TILE - 4, y + 4);
          ctx.lineTo(x + 4, y + TILE - 4);
          ctx.stroke();
        }
        if (ch === 'D') {
          ctx.fillStyle = COLORS.doorLocked;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = COLORS.door;
          ctx.fillRect(x + 6, y + 4, TILE - 12, TILE - 8);
          ctx.fillStyle = '#20242e';
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + TILE / 2 - 2, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(x + TILE / 2 - 1.5, y + TILE / 2, 3, 7);
        }
      }
    }
    this.drawExit(game);
    this.drawLoot(game);
    this.drawCones(game);
    this.drawCameras(game);
    this.drawGuards(game);
    this.drawCoins(game);
    this.drawSmoke(game);
    this.drawPlayer(game);
    this.drawParticles(game);
    this.drawInteractRing(game);
  }

  drawCone(ctx, x, y, facing, range, halfAngle, fill, edge) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  drawCones(game) {
    const ctx = this.ctx;
    for (const g of game.guards) {
      const range = game.player.sneaking ? GUARD.sneakRange : GUARD.viewRange;
      const alert = g.state === 'alert';
      this.drawCone(ctx, g.x, g.y, g.facing, range, GUARD.viewHalfAngle,
        alert ? 'rgba(231, 76, 60, 0.40)' : COLORS.cone,
        alert ? 'rgba(255, 90, 70, 0.8)' : COLORS.coneEdge);
    }
    for (const c of game.cameras) {
      if (c.disabled > 0) continue;
      const range = game.player.sneaking ? CAMERA.viewRange * 0.62 : CAMERA.viewRange;
      this.drawCone(ctx, c.x, c.y, c.facing, range, CAMERA.viewHalfAngle, COLORS.camCone, COLORS.camConeEdge);
    }
  }

  drawLoot(game) {
    const ctx = this.ctx;
    const t = game.time;
    for (const l of game.loot) {
      if (l.taken) continue;
      const pulse = 0.6 + Math.sin(t * 3 + l.x) * 0.25;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.arc(l.x, l.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#7a5c00';
      if (l.kind === 'painting') {
        ctx.fillRect(l.x - 9, l.y - 6, 18, 12);
        ctx.strokeStyle = COLORS.gold;
        ctx.lineWidth = 2;
        ctx.strokeRect(l.x - 9, l.y - 6, 18, 12);
      } else if (l.kind === 'gold') {
        ctx.beginPath();
        ctx.moveTo(l.x - 9, l.y + 5);
        ctx.lineTo(l.x - 5, l.y - 5);
        ctx.lineTo(l.x + 5, l.y - 5);
        ctx.lineTo(l.x + 9, l.y + 5);
        ctx.closePath();
        ctx.fill();
      } else if (l.kind === 'chips') {
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.arc(l.x + i * 7, l.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = i === 0 ? COLORS.gold : '#e74c3c';
          ctx.fill();
        }
      } else {
        ctx.beginPath();
        ctx.arc(l.x, l.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#1c2436';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      // Loot near the floor's bottom edge gets its price above it, not clipped.
      ctx.fillText('$' + l.value, l.x, l.ty >= 13 ? l.y - 20 : l.y + 22);
    }
    // Target loot: big pulsing diamond, always readable.
    if (!game.targetTaken) {
      const tp = game.targetPos();
      const pulse = 1 + Math.sin(t * 4) * 0.12;
      ctx.save();
      ctx.translate(tp.x, tp.y);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = 'rgba(255, 217, 74, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(11, 0);
      ctx.lineTo(0, 14);
      ctx.lineTo(-11, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff6c9';
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = COLORS.gold;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(game.level.target.toUpperCase(), tp.x, tp.y - 32);
    }
  }

  drawExit(game) {
    const ctx = this.ctx;
    const ep = game.exitPos();
    const open = game.exitOpen;
    ctx.save();
    if (open) {
      ctx.fillStyle = 'rgba(46, 204, 113, 0.22)';
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, 30 + Math.sin(game.time * 4) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Getaway van.
    ctx.fillStyle = open ? COLORS.exit : '#5a6b52';
    roundRect(ctx, ep.x - 17, ep.y - 10, 34, 20, 5);
    ctx.fill();
    ctx.fillStyle = '#20242e';
    ctx.fillRect(ep.x - 11, ep.y - 6, 10, 8);
    ctx.fillStyle = open ? '#fff' : '#9aa5bd';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(open ? 'GO!' : 'VAN', ep.x, ep.y + 22);
    ctx.restore();
  }

  drawGuards(game) {
    const ctx = this.ctx;
    for (const g of game.guards) {
      ctx.save();
      ctx.translate(g.x, g.y);
      const body = g.state === 'alert' ? COLORS.guardAlert : g.state === 'suspicious' ? '#d35400' : COLORS.guard;
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, GUARD.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Cap brim shows facing.
      ctx.rotate(g.facing);
      ctx.fillStyle = '#0b0f18';
      ctx.fillRect(4, -3, 10, 6);
      ctx.fillStyle = '#e8ecf4';
      ctx.beginPath();
      ctx.arc(7, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (g.state !== 'patrol') {
        ctx.fillStyle = g.state === 'alert' ? '#ff5a46' : '#f39c12';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(g.state === 'alert' ? '!' : '?', g.x, g.y - 20);
      }
    }
  }

  drawCameras(game) {
    const ctx = this.ctx;
    for (const c of game.cameras) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.fillStyle = c.disabled > 0 ? '#5a6b52' : '#2c3e50';
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = c.disabled > 0 ? '#7a8a72' : COLORS.gold;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (c.disabled <= 0) {
        ctx.rotate(c.facing);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(6, -2, 8, 4);
      } else {
        ctx.fillStyle = '#e8ecf4';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('×', 0, 4);
      }
      ctx.restore();
    }
  }

  drawPlayer(game) {
    const ctx = this.ctx;
    const p = game.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.hidden) ctx.globalAlpha = 0.75;
    // Cloak.
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.playerTrim;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Hood direction.
    ctx.rotate(p.facing);
    ctx.fillStyle = COLORS.playerTrim;
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(5, -6);
    ctx.lineTo(5, 6);
    ctx.closePath();
    ctx.fill();
    // Eyes.
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(5, -3, 1.8, 0, Math.PI * 2);
    ctx.arc(5, 3, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (p.sneaking) {
      ctx.fillStyle = '#9aa5bd';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('sneaking', p.x, p.y - 20);
    }
  }

  drawCoins(game) {
    const ctx = this.ctx;
    for (const c of game.coins) {
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 6 + c.t * 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawSmoke(game) {
    const ctx = this.ctx;
    for (const s of game.smokes) {
      ctx.fillStyle = `rgba(200, 200, 210, ${Math.min(0.55, s.t * 0.2)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawParticles(game) {
    const ctx = this.ctx;
    for (const pt of game.particles) {
      ctx.globalAlpha = Math.max(0, pt.t * 2);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  drawInteractRing(game) {
    const ctx = this.ctx;
    if (game.interactProgress > 0 && game.interactTarget) {
      const p = game.player;
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20, -Math.PI / 2, -Math.PI / 2 + game.interactProgress * Math.PI * 2);
      ctx.stroke();
    }
  }

  // ---------- HUD ----------
  drawHud(game) {
    const ctx = this.ctx;
    const y0 = VIEW_H;
    ctx.fillStyle = '#10141f';
    ctx.fillRect(0, y0, VIEW_W, HUD_H);
    ctx.fillStyle = '#2a3348';
    ctx.fillRect(0, y0, VIEW_W, 2);

    // Alarm meter.
    const ax = 16;
    const ay = y0 + 14;
    const aw = 300;
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ALARM', ax, ay - 4);
    ctx.fillStyle = '#1c2436';
    roundRect(ctx, ax, ay, aw, 18, 4);
    ctx.fill();
    const frac = game.alarm / 100;
    ctx.fillStyle = frac > 0.66 ? COLORS.alarm : frac > 0.33 ? COLORS.alarmLow : '#2ecc71';
    if (frac > 0.01) {
      roundRect(ctx, ax, ay, Math.max(8, aw * frac), 18, 4);
      ctx.fill();
    }
    ctx.strokeStyle = '#4a5468';
    ctx.lineWidth = 1;
    roundRect(ctx, ax, ay, aw, 18, 4);
    ctx.stroke();
    ctx.fillStyle = COLORS.text;
    ctx.font = '12px monospace';
    ctx.fillText(Math.round(game.alarm) + '%', ax + aw + 8, ay + 14);

    // Loot + score + timer.
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`LOOT $${game.levelScore}`, 380, y0 + 26);
    ctx.fillStyle = COLORS.text;
    ctx.font = '13px monospace';
    ctx.fillText(`SCORE ${game.totalScore}`, 380, y0 + 48);
    ctx.fillStyle = game.levelTime > game.level.par ? COLORS.alarm : COLORS.textDim;
    ctx.fillText(`TIME ${Math.floor(game.levelTime)}s / par ${game.level.par}s`, 540, y0 + 26);
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText(game.exitOpen ? '→ Reach the van!' : `→ Steal ${game.level.target}`, 540, y0 + 48);

    // Tools.
    const tools = [
      ['Q', 'Coin', game.tools.coin],
      ['F', 'Smoke', game.tools.smoke],
      ['G', 'EMP', game.tools.emp],
      ['E', 'Pick', game.tools.lockpick],
    ];
    let tx = 760;
    for (const [key, name, n] of tools) {
      ctx.fillStyle = n > 0 ? '#1c2436' : '#12161f';
      roundRect(ctx, tx, y0 + 12, 44, 34, 5);
      ctx.fill();
      ctx.strokeStyle = n > 0 ? COLORS.gold : '#333d52';
      ctx.stroke();
      ctx.fillStyle = n > 0 ? COLORS.text : '#5a6b52';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(key, tx + 22, y0 + 26);
      ctx.font = '10px monospace';
      ctx.fillText(`${name} ×${n}`, tx + 22, y0 + 40);
      tx += 48;
    }

    // Bottom line: the event message replaces the controls hint while it shows,
    // so the two never print on top of each other.
    ctx.textAlign = 'left';
    if (game.messageTimer > 0) {
      ctx.fillStyle = COLORS.gold;
      ctx.font = 'bold 13px monospace';
      ctx.fillText(game.message, 16, y0 + HUD_H - 8);
    } else {
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '12px monospace';
      const hint = game.interactTarget
        ? `Hold E — ${game.interactTarget.kind === 'door' ? 'pick the lock (or use a lockpick)' : 'grab ' + game.interactTarget.name}`
        : 'WASD move · Shift sneak · Space sprint · Q coin · F smoke · G EMP · E grab · P pause · M mute';
      ctx.fillText(hint, 16, y0 + HUD_H - 8);
    }
  }

  // ---------- screens ----------
  panel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(10, 14, 24, 0.92)';
    roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = '#3a4763';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawTitle(game) {
    const ctx = this.ctx;
    // Backdrop: faint cones + a thief silhouette for mood.
    ctx.fillStyle = '#0b0f18';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = 'rgba(231, 76, 60, 0.10)';
    ctx.beginPath();
    ctx.moveTo(180, 420);
    ctx.lineTo(420, 180);
    ctx.lineTo(620, 420);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(241, 196, 15, 0.08)';
    ctx.beginPath();
    ctx.moveTo(700, 420);
    ctx.lineTo(830, 220);
    ctx.lineTo(940, 420);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 64px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NIGHTVAULT', CANVAS_W / 2, 200);
    ctx.fillStyle = COLORS.text;
    ctx.font = '24px monospace';
    ctx.fillText('The Gilded Heist', CANVAS_W / 2, 244);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '15px monospace';
    ctx.fillText('Three heists. One crew: you. Steal the target, dodge the cones,', CANVAS_W / 2, 300);
    ctx.fillText('and make the getaway before the alarm hits 100%.', CANVAS_W / 2, 324);
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 18px monospace';
    ctx.fillText('Press ENTER to plan the first heist', CANVAS_W / 2, 400);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '13px monospace';
    ctx.fillText('WASD / arrows move · Shift sneak · Space sprint · Q coin · F smoke · G EMP · E grab · M mute', CANVAS_W / 2, 460);
    if (game.best > 0) {
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`Best score: ${game.best}`, CANVAS_W / 2, 500);
    }
    ctx.fillStyle = '#5a6b52';
    ctx.font = '12px monospace';
    ctx.fillText('An original game — no borrowed names, art or music.', CANVAS_W / 2, 680);
  }

  drawBriefing(game) {
    const ctx = this.ctx;
    const lv = game.levelDef;
    ctx.fillStyle = '#0b0f18';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    this.panel(ctx, 130, 70, 700, 580);
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`HEIST ${game.levelIndex + 1} OF 3`, CANVAS_W / 2, 120);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 26px monospace';
    ctx.fillText(lv.name, CANVAS_W / 2, 158);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '15px monospace';
    ctx.fillText(lv.sub, CANVAS_W / 2, 186);
    ctx.fillStyle = COLORS.text;
    ctx.font = '15px monospace';
    ctx.fillText(`Target: ${lv.target}  ($${lv.targetValue})    Par: ${lv.par}s`, CANVAS_W / 2, 222);
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText(lv.tip, CANVAS_W / 2, 248);
    // Loadout shop.
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 17px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`KIT — credits: ${game.credits}`, 170, 300);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '13px monospace';
    ctx.fillText('Click a tool or press 1-4 to buy. Tools cost credits — loot earns them back.', 170, 324);
    const keys = ['coin', 'smoke', 'emp', 'lockpick'];
    let y = 350;
    keys.forEach((k, i) => {
      const def = TOOLS[k];
      const afford = game.credits >= def.price;
      ctx.fillStyle = afford ? '#1c2436' : '#12161f';
      roundRect(ctx, 170, y, 620, 52, 8);
      ctx.fill();
      ctx.strokeStyle = afford ? COLORS.gold : '#333d52';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = afford ? COLORS.text : '#5a6b52';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`${i + 1} · ${def.name}  [${def.hotkey}]`, 188, y + 22);
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '13px monospace';
      ctx.fillText(def.desc, 188, y + 42);
      ctx.fillStyle = afford ? COLORS.gold : '#5a6b52';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`$${def.price} · owned ×${game.tools[k]}`, 772, y + 30);
      ctx.textAlign = 'left';
      y += 62;
    });
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press ENTER to start the heist', CANVAS_W / 2, 622);
  }

  drawCaught(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(10, 8, 8, 0.72)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    this.panel(ctx, 230, 220, 500, 220);
    ctx.fillStyle = COLORS.alarm;
    ctx.font = 'bold 34px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BUSTED', CANVAS_W / 2, 280);
    ctx.fillStyle = COLORS.text;
    ctx.font = '15px monospace';
    ctx.fillText(game.caughtBy, CANVAS_W / 2, 316);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '13px monospace';
    ctx.fillText(`Alarm hit 100%. The crew loses $${100} and the room resets.`, CANVAS_W / 2, 344);
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 16px monospace';
    ctx.fillText('Press R to run it back', CANVAS_W / 2, 392);
  }

  drawCleared(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(8, 12, 8, 0.72)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const b = game.clearBreakdown;
    this.panel(ctx, 230, 180, 500, 300);
    ctx.fillStyle = COLORS.exit;
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CLEAN GETAWAY', CANVAS_W / 2, 236);
    ctx.fillStyle = COLORS.text;
    ctx.font = '15px monospace';
    ctx.fillText(`Loot this heist: $${b.loot}`, CANVAS_W / 2, 282);
    ctx.fillText(`Time bonus: $${b.time}`, CANVAS_W / 2, 308);
    ctx.fillText(`Ghost bonus: $${b.ghost} ${b.ghost ? '(never raised the alarm past 30%)' : ''}`, CANVAS_W / 2, 334);
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`Heist total: $${b.gained}   ·   Score: ${game.totalScore}`, CANVAS_W / 2, 372);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '14px monospace';
    ctx.fillText(game.levelIndex + 1 < 3 ? 'Press ENTER for the next heist' : 'Press ENTER for the final score', CANVAS_W / 2, 420);
  }

  drawWin(game) {
    const ctx = this.ctx;
    ctx.fillStyle = '#0b0f18';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 44px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ALL THREE HEISTS DONE', CANVAS_W / 2, 220);
    ctx.fillStyle = COLORS.text;
    ctx.font = '20px monospace';
    ctx.fillText(`Total loot: $${game.totalLoot}      Final score: ${game.totalScore}`, CANVAS_W / 2, 280);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '15px monospace';
    ctx.fillText(`Best score: ${game.best}      Busts: ${game.busts}`, CANVAS_W / 2, 316);
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 18px monospace';
    ctx.fillText('Press ENTER to plan the next crew run', CANVAS_W / 2, 380);
  }

  drawPaused(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(8, 10, 16, 0.7)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', CANVAS_W / 2, CANVAS_H / 2);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '14px monospace';
    ctx.fillText('Press P to keep moving', CANVAS_W / 2, CANVAS_H / 2 + 30);
  }
}
