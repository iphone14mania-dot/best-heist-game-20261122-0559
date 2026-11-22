// Nightvault — guard patrol AI and sweeping security cameras.
// Guards: patrol → suspicious (heard a noise / glimpsed the thief) → alert
// (chasing). Cameras: fixed posts sweeping a cone; EMP kills them briefly.
// One job: decide where every watcher looks and how fast the alarm rises.

import { TILE, GUARD, CAMERA, ALARM } from './config.js';
import { dist, angleTo, angleDiff, inCone, hasLineOfSight, moveCircle, clamp } from './utils.js';

export class Guard {
  constructor(def, map) {
    this.map = map;
    this.waypoints = def.waypoints.map(([tx, ty]) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }));
    this.pause = def.pause || 1;
    this.wp = 0;
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.facing = 0;
    this.state = 'patrol'; // patrol | suspicious | alert
    this.waitTimer = 0;
    this.searchTimer = 0;
    this.lookX = this.x;
    this.lookY = this.y;
    this.seenTimer = 0; // how long the thief has been continuously visible
  }

  // Go look at a point (noise). Used for coin throws.
  investigate(x, y) {
    if (this.state === 'alert') return;
    this.state = 'suspicious';
    this.lookX = x;
    this.lookY = y;
    this.searchTimer = 0;
  }

  update(dt, player, smokeClouds) {
    const inSmoke = smokeClouds.some((s) => dist(this.x, this.y, s.x, s.y) < s.r + 10);
    const seen = this.canSee(player, inSmoke);
    if (seen) {
      this.seenTimer += dt;
      if (this.seenTimer > 0.45 && this.state !== 'alert') {
        this.state = 'alert';
        this.onAlert && this.onAlert();
      }
    } else {
      this.seenTimer = Math.max(0, this.seenTimer - dt * 2);
      if (this.state === 'alert') {
        // Lost the thief: search where they were last seen, then give up.
        this.state = 'suspicious';
        this.searchTimer = 0;
      }
    }

    if (this.state === 'patrol') {
      const target = this.waypoints[this.wp];
      if (this.waitTimer > 0) {
        this.waitTimer -= dt;
      } else if (dist(this.x, this.y, target.x, target.y) < 6) {
        this.wp = (this.wp + 1) % this.waypoints.length;
        this.waitTimer = this.pause;
      } else {
        this.facing = angleTo(this.x, this.y, target.x, target.y);
        this.stepToward(target.x, target.y, GUARD.patrolSpeed * dt);
      }
    } else if (this.state === 'suspicious') {
      const d = dist(this.x, this.y, this.lookX, this.lookY);
      if (d > 8) {
        this.facing = angleTo(this.x, this.y, this.lookX, this.lookY);
        this.stepToward(this.lookX, this.lookY, GUARD.suspiciousSpeed * dt);
      } else {
        // Arrived: look around, then return to patrol.
        this.searchTimer += dt;
        this.facing += dt * 1.6;
        if (this.searchTimer > 3) {
          this.state = 'patrol';
          this.searchTimer = 0;
        }
      }
    } else if (this.state === 'alert') {
      // Chase the thief's current position.
      this.facing = angleTo(this.x, this.y, player.x, player.y);
      this.stepToward(player.x, player.y, GUARD.chaseSpeed * dt);
    }
  }

  stepToward(tx, ty, amount) {
    const a = angleTo(this.x, this.y, tx, ty);
    moveCircle(this.map, this, Math.cos(a) * amount, Math.sin(a) * amount, GUARD.radius);
  }

  canSee(player, inSmoke) {
    if (inSmoke) return false;
    if (player.hidden) return false;
    const range = player.sneaking ? GUARD.sneakRange : GUARD.viewRange;
    return inCone(this.map, this.x, this.y, this.facing, range, GUARD.viewHalfAngle, player.x, player.y);
  }
}

export class Camera {
  constructor(def) {
    this.x = (def.tx + 0.5) * TILE;
    this.y = (def.ty + 0.5) * TILE;
    this.base = def.base;
    this.sweep = def.sweep || 1;
    this.phase = 0;
    this.facing = this.base;
    this.disabled = 0; // seconds left of EMP shutdown
  }

  update(dt) {
    if (this.disabled > 0) {
      this.disabled -= dt;
      return;
    }
    this.phase += dt * CAMERA.sweepSpeed;
    this.facing = this.base + Math.sin(this.phase) * this.sweep;
  }

  canSee(map, player, smokeClouds) {
    if (this.disabled > 0) return false;
    if (player.hidden) return false;
    if (smokeClouds.some((s) => dist(this.x, this.y, s.x, s.y) < s.r + 10)) return false;
    const range = player.sneaking ? CAMERA.viewRange * 0.62 : CAMERA.viewRange;
    return inCone(map, this.x, this.y, this.facing, range, CAMERA.viewHalfAngle, player.x, player.y);
  }
}

// Shared alarm math: how fast the meter moves when watchers see the thief.
export function alarmRateFor(distance, sneaking, inShadow) {
  let rate = distance < 110 ? ALARM.riseClose : ALARM.riseFar;
  if (sneaking) rate *= ALARM.sneakFactor;
  if (inShadow) rate *= ALARM.shadowFactor;
  return rate;
}

export { hasLineOfSight, angleDiff, clamp };
