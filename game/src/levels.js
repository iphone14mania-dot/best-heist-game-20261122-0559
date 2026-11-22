// Nightvault — the three heists. Each level is a tile map plus its cast.
// Legend: # wall · . floor · , shadow floor (hard to see in) · C crate (blocks
// sight + movement) · D locked door (hold E, or instant with a lockpick) ·
// P player start · T target loot · L small loot · X getaway exit ·
// K camera post · G guard waypoint anchor (patrols are listed separately).
// Maps are validated by tools/validate-levels.mjs (row length, one P/T/X,
// flood-fill reachability, patrol tiles walkable) — never trust a hand count.

export const LEVELS = [
  {
    name: 'The Marble Gallery',
    sub: 'Museum of Fine Arts — midnight',
    target: 'The Golden Mask',
    targetValue: 1500,
    par: 150,
    tip: 'Shadow tiles hide you. Read the cones before you cross the hall.',
    map: [
      '########################',
      '#P.....,,......#.......#',
      '#......,,......#.......#',
      '#..C...,,...C..#.......#',
      '#......,,......D...T...#',
      '#......,,......#.......#',
      '#......,,...C..#.......#',
      '#......,,......#.......#',
      '####.##########.########',
      '#........#.............#',
      '#........#.....C.......#',
      '#........#.............#',
      '#...C....D.............#',
      '#........#.............#',
      '#........#........X....#',
      '########################',
    ],
    guards: [
      { waypoints: [[18, 2], [21, 2], [21, 6], [18, 6]], pause: 1.2 },
      { waypoints: [[2, 6], [7, 6], [7, 2], [2, 2]], pause: 1.0 },
      { waypoints: [[17, 13], [21, 13], [21, 10], [17, 10]], pause: 1.4 },
    ],
    cameras: [
      { tx: 21, ty: 1, base: Math.PI * 0.75, sweep: 0.9 },
      { tx: 17, ty: 10, base: 0, sweep: 1.1 },
    ],
    loot: [
      { tx: 19, ty: 2, value: 200, kind: 'painting' },
      { tx: 3, ty: 5, value: 150, kind: 'painting' },
      { tx: 4, ty: 10, value: 150, kind: 'vase' },
      { tx: 20, ty: 10, value: 250, kind: 'vase' },
      { tx: 4, ty: 14, value: 100, kind: 'vase' },
    ],
  },
  {
    name: 'The Iron Bank',
    sub: 'First National Vault — 2:00 AM',
    target: 'The Diamond Ledger',
    targetValue: 1500,
    par: 180,
    tip: 'The vault door is locked. Pick it fast, or hold E and hope no one walks by.',
    map: [
      '########################',
      '#P....#.......,,.......#',
      '#.....#.......,,...C...#',
      '#..C..#.......,,.......#',
      '#.....D....C..,,...T...#',
      '#.....#.......,,.......#',
      '#.....#.......,,.......#',
      '#.....#.......,,.......#',
      '####.####D#########.####',
      '#........#.............#',
      '#........#..C..........#',
      '#........#.............#',
      '#...C....D.............#',
      '#........#.............#',
      '#........#.......X.....#',
      '########################',
    ],
    guards: [
      { waypoints: [[18, 2], [21, 5], [18, 5], [21, 2]], pause: 0.8 },
      { waypoints: [[2, 6], [5, 6], [5, 2], [2, 2]], pause: 1.0 },
      { waypoints: [[11, 13], [21, 13], [21, 10], [11, 10]], pause: 1.2 },
      { waypoints: [[10, 2], [13, 2], [13, 6], [10, 6]], pause: 1.6 },
    ],
    cameras: [
      { tx: 20, ty: 6, base: Math.PI, sweep: 0.8 },
      { tx: 13, ty: 6, base: Math.PI * 0.5, sweep: 1.0 },
      { tx: 18, ty: 12, base: -Math.PI * 0.5, sweep: 1.2 },
    ],
    loot: [
      { tx: 10, ty: 2, value: 200, kind: 'gold' },
      { tx: 3, ty: 6, value: 150, kind: 'gold' },
      { tx: 4, ty: 10, value: 250, kind: 'gold' },
      { tx: 17, ty: 10, value: 200, kind: 'gold' },
      { tx: 4, ty: 14, value: 100, kind: 'gold' },
    ],
  },
  {
    name: 'The Sky Casino',
    sub: 'The Gilded Penthouse — 3:30 AM',
    target: 'The Star Sapphire',
    targetValue: 1500,
    par: 210,
    tip: 'Four cameras, five guards, one sapphire. Spend your credits — you earned them.',
    map: [
      '########################',
      '#P...,,....#.....C.....#',
      '#....,,....#...........#',
      '#.C..,,.C..#...........#',
      '#....,,....D.....T.....#',
      '#....,,....#..C........#',
      '#....,,....#...........#',
      '#....,,....#...........#',
      '##.#####D######.########',
      '#......#......#........#',
      '#......#..C...#........#',
      '#......#......D........#',
      '#......#......#........#',
      '#......#......#...C....#',
      '#......#......#....X...#',
      '########################',
    ],
    guards: [
      { waypoints: [[17, 2], [21, 2], [21, 6], [17, 6]], pause: 0.7 },
      { waypoints: [[2, 6], [5, 6], [5, 2], [2, 2]], pause: 0.9 },
      { waypoints: [[10, 13], [13, 13], [13, 10], [11, 10]], pause: 1.0 },
      { waypoints: [[17, 13], [21, 13], [21, 10], [17, 10]], pause: 0.8 },
      { waypoints: [[10, 2], [13, 6], [10, 6], [13, 2]], pause: 1.3 },
    ],
    cameras: [
      { tx: 20, ty: 2, base: Math.PI * 0.8, sweep: 0.9 },
      { tx: 19, ty: 6, base: Math.PI, sweep: 1.0 },
      { tx: 19, ty: 11, base: -Math.PI * 0.5, sweep: 1.1 },
      { tx: 12, ty: 13, base: 0, sweep: 0.9 },
    ],
    loot: [
      { tx: 15, ty: 2, value: 300, kind: 'chips' },
      { tx: 2, ty: 6, value: 200, kind: 'chips' },
      { tx: 3, ty: 10, value: 250, kind: 'chips' },
      { tx: 19, ty: 10, value: 300, kind: 'chips' },
      { tx: 3, ty: 14, value: 150, kind: 'chips' },
    ],
  },
];

// Scan a map for a marker char, return {tx, ty} (tile coords) or null.
export function findMarker(map, ch) {
  for (let y = 0; y < map.length; y++) {
    const x = map[y].indexOf(ch);
    if (x >= 0) return { tx: x, ty: y };
  }
  return null;
}

export function findAllMarkers(map, ch) {
  const out = [];
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] === ch) out.push({ tx: x, ty: y });
    }
  }
  return out;
}
