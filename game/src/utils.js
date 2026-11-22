// Nightvault — geometry helpers: grid lookups, line of sight, cone tests.
// One job: pure functions the AI and the renderer both use. No game state here.

import { TILE } from './config.js';

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function dist(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Tile at pixel (px, py) in a level map (array of strings). Out of bounds = wall.
export function tileAt(map, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (ty < 0 || ty >= map.length || tx < 0 || tx >= map[0].length) return '#';
  return map[ty][tx];
}

export function isSolidTile(ch) {
  return ch === '#' || ch === 'C' || ch === 'D';
}

export function isWallTile(ch) {
  return ch === '#';
}

// Circle vs solid tiles: true when the circle overlaps a solid tile.
export function circleHitsSolid(map, x, y, r) {
  const x0 = Math.floor((x - r) / TILE);
  const x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE);
  const y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const ch = ty < 0 || ty >= map.length || tx < 0 || tx >= map[0].length ? '#' : map[ty][tx];
      if (!isSolidTile(ch)) continue;
      const cx = clamp(x, tx * TILE, tx * TILE + TILE);
      const cy = clamp(y, ty * TILE, ty * TILE + TILE);
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy < r * r) return true;
    }
  }
  return false;
}

// Line of sight: sample along the segment; blocked by walls and crates.
export function hasLineOfSight(map, ax, ay, bx, by) {
  const d = dist(ax, ay, bx, by);
  const steps = Math.max(1, Math.ceil(d / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    const ch = tileAt(map, x, y);
    if (ch === '#' || ch === 'C') return false;
  }
  return true;
}

// Is point (px,py) inside a vision cone from (ox,oy) facing `facing`
// with given range and half-angle, with line of sight?
export function inCone(map, ox, oy, facing, range, halfAngle, px, py) {
  const d = dist(ox, oy, px, py);
  if (d > range) return false;
  if (d < 4) return true;
  const a = angleTo(ox, oy, px, py);
  if (Math.abs(angleDiff(a, facing)) > halfAngle) return false;
  return hasLineOfSight(map, ox, oy, px, py);
}

// Move a circle with axis-separated collision so it slides along walls.
export function moveCircle(map, pos, dx, dy, r) {
  let nx = pos.x + dx;
  if (!circleHitsSolid(map, nx, pos.y, r)) pos.x = nx;
  let ny = pos.y + dy;
  if (!circleHitsSolid(map, pos.x, ny, r)) pos.y = ny;
}
