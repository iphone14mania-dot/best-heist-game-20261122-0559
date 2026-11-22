// Nightvault — keyboard + mouse state. One job: turn raw events into a
// clean, debounced input snapshot the game loop reads each frame.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set(); // edge-triggered: consumed by the game each frame
    this.mouse = { x: 0, y: 0, clicked: false, down: false };
    this._onKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      this.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    };
    this._onKeyUp = (e) => {
      this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    };
    this._onMouseMove = (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    };
    this._onMouseDown = (e) => {
      this._onMouseMove(e);
      this.mouse.down = true;
      this.mouse.clicked = true;
    };
    this._onMouseUp = () => { this.mouse.down = false; };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  held(...names) {
    return names.some((n) => this.keys.has(n));
  }

  // Edge: true once for the frame the key went down.
  wasPressed(...names) {
    return names.some((n) => this.pressed.has(n));
  }

  moveVector() {
    let x = 0;
    let y = 0;
    if (this.held('a', 'ArrowLeft')) x -= 1;
    if (this.held('d', 'ArrowRight')) x += 1;
    if (this.held('w', 'ArrowUp')) y -= 1;
    if (this.held('s', 'ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.sqrt(2);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
