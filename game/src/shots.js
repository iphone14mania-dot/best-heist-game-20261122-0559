// Nightvault — screenshot staging. ?shot=cover|loadout|chase|getaway stages a
// fixed, readable scene for the maker's screenshots (real renders of the game).
// One job: put the game into a known state; nothing here affects normal play.

import { TILE } from './config.js';

function place(game, tx, ty) {
  game.player.x = (tx + 0.5) * TILE;
  game.player.y = (ty + 0.5) * TILE;
}

function placeGuard(g, tx, ty, facing) {
  g.x = (tx + 0.5) * TILE;
  g.y = (ty + 0.5) * TILE;
  g.facing = facing;
  g.state = 'patrol';
  g.waitTimer = 99; // hold still for the shot
}

export function applyShot(game, params) {
  const shot = params.get('shot');
  if (!shot) return false;
  if (shot === 'loadout') {
    game.toBriefing(0);
    game.frozen = true;
    return true;
  }
  if (shot === 'cover') {
    // Level 1, mid-gallery: thief crossing the hall toward the Golden Mask,
    // two guards sweeping cones at him, a camera cone crossing, alarm at 38.
    // Frozen: the frame holds exactly as staged (no chase, no bust).
    game.startLevel(0);
    game.frozen = true;
    place(game, 17, 5);
    game.player.facing = -Math.PI / 2;
    placeGuard(game.guards[0], 20, 2, Math.PI * 0.75);
    placeGuard(game.guards[1], 4, 4, 0);
    placeGuard(game.guards[2], 19, 12, -Math.PI * 0.5);
    game.cameras[0].facing = Math.PI * 0.6;
    game.cameras[0].phase = 0;
    game.alarm = 38;
    game.peakAlarm = 38;
    game.levelScore = 350;
    return true;
  }
  if (shot === 'chase') {
    // Level 2, caught in the open: a guard is alert and closing in, the
    // alarm is at 72, and the thief just popped smoke. Frozen for the shot.
    game.startLevel(1);
    game.frozen = true;
    place(game, 12, 5);
    game.player.facing = Math.PI;
    const g = game.guards[0];
    g.x = (15.5) * TILE;
    g.y = (5.5) * TILE;
    g.state = 'alert';
    g.facing = Math.PI;
    placeGuard(game.guards[1], 3, 3, Math.PI * 0.5);
    game.smokes.push({ x: game.player.x, y: game.player.y, r: 95, t: 3.5 });
    game.alarm = 72;
    game.peakAlarm = 72;
    game.levelScore = 700;
    return true;
  }
  if (shot === 'getaway') {
    // Level 1, target secured: the Golden Mask is taken, the van is open,
    // the thief is one room from the exit, alarm cooling at 15. Frozen.
    game.startLevel(0);
    game.frozen = true;
    game.targetTaken = true;
    game.exitOpen = true;
    game.levelScore = 1850;
    place(game, 17, 12);
    game.player.facing = Math.PI / 2;
    placeGuard(game.guards[2], 20, 11, Math.PI);
    placeGuard(game.guards[0], 18, 3, -Math.PI * 0.5);
    game.alarm = 15;
    game.peakAlarm = 41;
    return true;
  }
  return false;
}
