// Nightvault — shared constants: tile size, speeds, detection tuning, tool prices.
// One job: every magic number the rest of the game reads lives here.

export const TILE = 40;
export const VIEW_W = 960;
export const VIEW_H = 640;

export const COLORS = {
  floor: '#1c2436',
  floorAlt: '#202a40',
  shadow: '#14291f',
  shadowEdge: '#1e4d38',
  wall: '#4a5468',
  wallTop: '#6b7a94',
  crate: '#6b4f2a',
  crateEdge: '#8a6a3c',
  door: '#c9a227',
  doorLocked: '#8a6d1f',
  gold: '#ffd94a',
  goldDim: '#b8932a',
  guard: '#3a5a8c',
  guardAlert: '#c0392b',
  cone: 'rgba(231, 76, 60, 0.28)',
  coneEdge: 'rgba(231, 76, 60, 0.55)',
  camCone: 'rgba(241, 196, 15, 0.20)',
  camConeEdge: 'rgba(241, 196, 15, 0.45)',
  player: '#20242e',
  playerTrim: '#ffd94a',
  exit: '#2ecc71',
  text: '#e8ecf4',
  textDim: '#9aa5bd',
  alarm: '#e74c3c',
  alarmLow: '#f39c12',
};

export const PLAYER = {
  walk: 148,
  sneak: 76,
  sprint: 208,
  radius: 13,
};

export const GUARD = {
  patrolSpeed: 56,
  suspiciousSpeed: 84,
  chaseSpeed: 128,
  radius: 13,
  viewRange: 176,
  viewHalfAngle: 0.56, // ~32 degrees each side
  sneakRange: 112,
  catchDistance: 26,
};

export const CAMERA = {
  viewRange: 190,
  viewHalfAngle: 0.42,
  sweepSpeed: 0.55, // radians per second
};

export const ALARM = {
  riseClose: 30, // per second while seen up close
  riseFar: 13, // per second while seen at range
  decay: 9, // per second while hidden
  sneakFactor: 0.5,
  shadowFactor: 0.5,
  ghostThreshold: 30, // stay under this all level for the ghost bonus
};

export const TOOLS = {
  coin: { key: 'coin', name: 'Noisemaker Coin', price: 40, start: 2, hotkey: 'Q', desc: 'Throw it: guards walk to the clink.' },
  smoke: { key: 'smoke', name: 'Smoke Pellet', price: 90, start: 1, hotkey: 'F', desc: 'A 4s cloud that blocks every cone.' },
  emp: { key: 'emp', name: 'EMP Charge', price: 130, start: 0, hotkey: 'G', desc: 'Kills every camera for 6 seconds.' },
  lockpick: { key: 'lockpick', name: 'Lockpick Set', price: 60, start: 1, hotkey: 'E', desc: 'Locked doors open instantly.' },
};

export const SCORE = {
  target: 1500,
  ghostBonus: 500,
  bustPenalty: 100,
};

export const GAME_NAME = 'NIGHTVAULT';
export const GAME_SUB = 'The Gilded Heist';
