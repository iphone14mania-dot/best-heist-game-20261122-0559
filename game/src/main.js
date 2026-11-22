// Nightvault — bootstrap and frame loop. One job: wire input, sound, game
// state and renderer together, and run the screens (title → briefing → play).

import { Game } from './game.js';
import { Renderer, CANVAS_W, CANVAS_H } from './render.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { applyShot } from './shots.js';
import { TOOLS } from './config.js';

const canvas = document.getElementById('game');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
const ctx = canvas.getContext('2d');

const sound = new SoundBank();
const input = new Input(canvas);
const game = new Game(sound);
const renderer = new Renderer(ctx);

// Test/debug handle: the screenshot and play-test scripts drive the game
// through this (teleport, set alarm, read state). Part of the shipped game.
window.__heist = { game, input, sound };

// Stage a screenshot scene when the URL asks for one.
const params = new URLSearchParams(location.search);
applyShot(game, params);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  handleScreenKeys();
  game.update(dt, input);
  renderer.draw(game);
  input.endFrame();
  requestAnimationFrame(frame);
}

function handleScreenKeys() {
  if (input.wasPressed('Enter')) {
    sound.ensure();
    sound.click();
    game.confirm();
  }
  if (input.wasPressed('m', 'M')) {
    const muted = sound.toggleMute();
    game.say(muted ? 'Sound off.' : 'Sound on.');
  }
  if (input.wasPressed('p', 'P', 'Escape')) {
    if (game.screen === 'play') game.paused = !game.paused;
  }
  if (input.wasPressed('r', 'R')) {
    if (game.screen === 'play' || game.screen === 'caught') game.restartLevel();
  }
  if (game.screen === 'briefing') {
    const toolKeys = ['coin', 'smoke', 'emp', 'lockpick'];
    toolKeys.forEach((k, i) => {
      if (input.wasPressed(String(i + 1))) game.buyTool(k);
    });
    if (input.mouse.clicked) handleBriefingClick();
  } else if (game.screen === 'title' && input.mouse.clicked) {
    sound.ensure();
    game.confirm();
  } else if (game.screen === 'play' && input.mouse.clicked && !game.paused) {
    // Click the floor: throw a noisemaker coin at that spot.
    game.throwCoin(input.mouse.x, input.mouse.y);
  }
}

function handleBriefingClick() {
  // Shop rows: x 170..790, first row y 350, each 62 tall, 4 rows.
  const mx = input.mouse.x;
  const my = input.mouse.y;
  const keys = ['coin', 'smoke', 'emp', 'lockpick'];
  for (let i = 0; i < 4; i++) {
    const y = 350 + i * 62;
    if (mx >= 170 && mx <= 790 && my >= y && my <= y + 52) {
      game.buyTool(keys[i]);
      return;
    }
  }
}

requestAnimationFrame(frame);
