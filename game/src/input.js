// Dapur Ember — input: keyboard state plus mouse clicks on the canvas.
// Movement keys are polled each frame; action keys fire edge callbacks.

export function createInput(canvas, handlers) {
  const keys = new Set();
  const pressed = new Set(); // edge-triggered, consumed each frame
  let mouse = { x: 0, y: 0, clicked: false };

  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    KeyE: 'action', Space: 'chop',
    KeyQ: 'trash', KeyM: 'mute', KeyR: 'restart', Enter: 'start',
  };

  function onKeyDown(e) {
    const name = KEYMAP[e.code];
    if (!name) return;
    e.preventDefault();
    if (!e.repeat) pressed.add(name);
    keys.add(name);
  }
  function onKeyUp(e) {
    const name = KEYMAP[e.code];
    if (!name) return;
    keys.delete(name);
  }
  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    mouse.y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  }
  function onClick(e) {
    onMouseMove(e);
    mouse.clicked = true;
  }
  function onBlur() {
    keys.clear();
    pressed.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click', onClick);

  return {
    isDown(name) { return keys.has(name); },
    // Returns true once per physical press; main.js calls it every frame.
    wasPressed(name) {
      if (pressed.has(name)) { pressed.delete(name); return true; }
      return false;
    },
    consumeClick() {
      const c = mouse.clicked;
      mouse.clicked = false;
      return c ? { x: mouse.x, y: mouse.y } : null;
    },
    mousePos() { return { x: mouse.x, y: mouse.y }; },
    // Edge keys that are not movement: main.js polls these too.
    pollEdges() {
      const out = {};
      for (const name of ['action', 'trash', 'mute', 'restart', 'start']) {
        out[name] = this.wasPressed(name);
      }
      return out;
    },
  };
}
