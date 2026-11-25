// Dapur Ember — main: game loop, interactions, screenshot staging, self-test.
// Wiring only: the model lives in state.js, the pixels in render.js.

import { STATIONS, BINS, BIN_Y, BIN_H, TUNING, INGREDIENTS, recipeById, DAY_SECONDS } from './config.js';
import { newGame, startDay, update, tryServe, grillState, fryerState } from './state.js';
import { render, drawIngredient } from './render.js';
import { createInput } from './input.js';
import * as audio from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);

// Screenshots stay clean: the page-level hint bar would overlap the
// ingredient bins in an 800 px tall viewport, so hide it in staged shots.
if (params.has('shot') || params.has('selftest')) {
  const hint = document.getElementById('hint');
  if (hint) hint.style.display = 'none';
}

const state = newGame();
const input = createInput(canvas, {});

const sfx = {
  tick: () => audio.sfxTick(),
  newOrder: () => audio.sfxNewOrder(),
  burnt: () => audio.sfxBurnt(),
  sizzle: (on) => { if (on) audio.audioStartSizzle(); else audio.audioStopSizzle(); },
};

// --- nearest station / bin ----------------------------------------------------

function chefNear(rect, pad = 90) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const dx = state.chef.x - cx;
  const dy = state.chef.y - cy;
  return Math.abs(dx) < rect.w / 2 + pad && Math.abs(dy) < rect.h / 2 + pad;
}

function nearestTarget() {
  for (const key of Object.keys(STATIONS)) {
    if (chefNear(STATIONS[key])) return { type: 'station', id: key };
  }
  for (const bin of BINS) {
    if (chefNear({ x: bin.x, y: BIN_Y, w: bin.w, h: BIN_H }, 70)) return { type: 'bin', id: bin.id };
  }
  return null;
}

function stationCenter(id) {
  const st = STATIONS[id];
  return { x: st.x + st.w / 2, y: st.y + st.h + 46 };
}
function binCenter(id) {
  const bin = BINS.find((b) => b.id === id);
  return { x: bin.x + bin.w / 2, y: BIN_Y - 46 };
}

// --- interactions ---------------------------------------------------------------

function hintFor(target) {
  if (!target || state.phase !== 'playing') return '';
  const hold = state.chef.hold;
  if (target.type === 'bin') {
    const ing = INGREDIENTS[target.id];
    if (hold) return 'Tangan penuh — taruh dulu (Q buang)';
    return `E: Ambil ${ing.name}`;
  }
  const id = target.id;
  if (id === 'grill') {
    const free = state.grill.findIndex((s) => !s);
    const perfect = state.grill.findIndex((s) => s && grillState(s) === 'perfect');
    const burnt = state.grill.findIndex((s) => s && grillState(s) === 'burnt');
    if (hold && hold.id === 'patty' && !hold.cooked && free >= 0) return 'E: Panggang patty';
    if (!hold && perfect >= 0) return 'E: Angkat patty SIAP';
    if (!hold && burnt >= 0) return 'E: Buang patty gosong';
    if (hold && hold.id === 'patty' && !hold.cooked) return 'Panggangan penuh — tunggu';
    return 'Panggangan: patty mentah → SIAP (6 dtk)';
  }
  if (id === 'fryer') {
    const fs = fryerState(state.fryer);
    if (hold && hold.id === 'fries' && !hold.cooked && !state.fryer) return 'E: Goreng kentang';
    if (!hold && fs === 'ready') return 'E: Angkat kentang SIAP';
    if (!hold && fs === 'burnt') return 'E: Buang kentang gosong';
    return 'Penggoreng: kentang mentah → SIAP (8 dtk)';
  }
  if (id === 'board') {
    if (hold && (hold.id === 'tomato' || hold.id === 'lettuce') && !hold.chopped && !state.board) return `E: Taruh ${INGREDIENTS[hold.id].name} di talenan`;
    if (!hold && state.board && state.board.done) return 'E: Ambil hasil cincangan';
    if (state.board && !state.board.done) return 'Tahan SPASI untuk mencincang';
    return 'Talenan: cincang tomat & selada';
  }
  if (id === 'assembly') {
    if (hold && hold.kind === 'plate') return 'E: Taruh piring di meja rakitan';
    if (hold && hold.id && state.plate) return `E: Tambah ${INGREDIENTS[hold.id].name} ke piring`;
    if (!hold && state.plate) return 'E: Angkat piring';
    if (!hold && !state.plate) return 'E: Ambil piring kosong';
    return 'Meja rakitan';
  }
  if (id === 'window') {
    if (hold && hold.kind === 'plate' && hold.stack.length) return 'E: SAJIKAN!';
    return 'Jendela saji: bawa piring lengkap ke sini';
  }
  return '';
}

function doInteract() {
  if (state.phase !== 'playing') return;
  const target = nearestTarget();
  if (!target) return;
  const hold = state.chef.hold;

  if (target.type === 'bin') {
    if (hold) return;
    state.chef.hold = { id: target.id, cooked: false, chopped: false };
    audio.sfxPickup();
    return;
  }

  const id = target.id;
  if (id === 'grill') {
    if (hold && hold.id === 'patty' && !hold.cooked) {
      const free = state.grill.findIndex((s) => !s);
      if (free >= 0) {
        state.grill[free] = { item: 'patty', t: 0 };
        state.chef.hold = null;
        audio.sfxPlace();
      }
      return;
    }
    if (!hold) {
      const perfect = state.grill.findIndex((s) => s && grillState(s) === 'perfect');
      if (perfect >= 0) {
        state.grill[perfect] = null;
        state.chef.hold = { id: 'patty', cooked: true, chopped: false };
        audio.sfxPickup();
        return;
      }
      const burnt = state.grill.findIndex((s) => s && grillState(s) === 'burnt');
      if (burnt >= 0) {
        state.grill[burnt] = null;
        audio.sfxPlace();
        return;
      }
    }
    return;
  }

  if (id === 'fryer') {
    if (hold && hold.id === 'fries' && !hold.cooked && !state.fryer) {
      state.fryer = { item: 'fries', t: 0 };
      state.chef.hold = null;
      audio.sfxPlace();
      return;
    }
    if (!hold && state.fryer) {
      const fs = fryerState(state.fryer);
      if (fs === 'ready') {
        state.fryer = null;
        state.chef.hold = { id: 'fries', cooked: true, chopped: false };
        audio.sfxPickup();
      } else if (fs === 'burnt') {
        state.fryer = null;
        audio.sfxPlace();
      }
    }
    return;
  }

  if (id === 'board') {
    if (hold && (hold.id === 'tomato' || hold.id === 'lettuce') && !hold.chopped && !state.board) {
      state.board = { item: hold.id, progress: 0, done: false };
      state.chef.hold = null;
      audio.sfxPlace();
      return;
    }
    if (!hold && state.board && state.board.done) {
      state.chef.hold = { id: state.board.item, cooked: false, chopped: true };
      state.board = null;
      state.stats.chopped++;
      audio.sfxPickup();
    }
    return;
  }

  if (id === 'assembly') {
    if (hold && hold.kind === 'plate') {
      if (!state.plate) { state.plate = hold; state.chef.hold = null; audio.sfxPlace(); }
      return;
    }
    if (hold && hold.id) {
      if (!state.plate) return;
      if (state.plate.stack.includes(hold.id)) {
        state.floaters.push({ x: 810, y: 140, text: 'SUDAH ADA DI PIRING', color: '#d9392b', t: 0, life: 1.2 });
        audio.sfxWrong();
        return;
      }
      state.plate.stack.push(hold.id);
      state.chef.hold = null;
      audio.sfxPlace();
      return;
    }
    if (!hold) {
      if (state.plate) {
        state.chef.hold = state.plate;
        state.plate = null;
        audio.sfxPickup();
      } else {
        state.chef.hold = { kind: 'plate', stack: [] };
        audio.sfxPickup();
      }
    }
    return;
  }

  if (id === 'window') {
    if (hold && hold.kind === 'plate' && hold.stack.length) {
      const res = tryServe(state);
      if (res.ok) audio.sfxServe();
      else audio.sfxWrong();
    }
  }
}

function doTrash() {
  if (state.phase !== 'playing') return;
  if (state.chef.hold) {
    state.chef.hold = null;
    audio.sfxPlace();
  }
}

// --- movement -------------------------------------------------------------------

let walkTarget = null;

function stepMovement(dt) {
  const c = state.chef;
  let vx = 0, vy = 0;
  if (input.isDown('left')) vx -= 1;
  if (input.isDown('right')) vx += 1;
  if (input.isDown('up')) vy -= 1;
  if (input.isDown('down')) vy += 1;
  if (vx || vy) {
    walkTarget = null;
    const len = Math.hypot(vx, vy);
    c.x += (vx / len) * TUNING.chefSpeed * dt;
    c.y += (vy / len) * TUNING.chefSpeed * dt;
    c.dir = vx !== 0 ? Math.sign(vx) : c.dir;
    c.moving = true;
  } else if (walkTarget) {
    const dx = walkTarget.x - c.x;
    const dy = walkTarget.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d < 8) { walkTarget = null; c.moving = false; }
    else {
      c.x += (dx / d) * TUNING.chefSpeed * dt;
      c.y += (dy / d) * TUNING.chefSpeed * dt;
      c.dir = dx !== 0 ? Math.sign(dx) : c.dir;
      c.moving = true;
    }
  } else {
    c.moving = false;
  }
  c.x = Math.max(30, Math.min(1250, c.x));
  c.y = Math.max(285, Math.min(640, c.y));
}

function stepChopping(dt) {
  if (state.phase !== 'playing') return;
  if (!state.board || state.board.done) return;
  if (!chefNear(STATIONS.board, 90)) return;
  if (!input.isDown('chop')) return;
  state.board.progress += dt / TUNING.chopSeconds;
  if (Math.random() < dt * 8) audio.sfxChop();
  if (state.board.progress >= 1) {
    state.board.progress = 1;
    state.board.done = true;
    audio.sfxChopDone();
  }
}

// --- screenshot staging (?shot=...) ----------------------------------------------
// Real game states, rendered by the same code — used only to take the
// competition screenshots. Not a cheat: every element is the live game.

function stageShot(name) {
  startDay(state);
  const o = (id, recipeId, ratio) => ({
    id, recipeId,
    patience: TUNING.orderPatienceSeconds * ratio,
    maxPatience: TUNING.orderPatienceSeconds,
  });
  if (name === 'cover') {
    state.elapsed = DAY_SECONDS - 84;
    state.coins = 210; state.served = 7; state.combo = 3; state.bestCombo = 4;
    state.orders = [o(11, 'klasik', 0.62), o(12, 'keju', 0.8), o(13, 'komplit', 0.38)];
    state.grill = [{ item: 'patty', t: 8 }, { item: 'patty', t: 2.5 }];
    state.fryer = { item: 'fries', t: 4 };
    state.board = { item: 'tomato', progress: 0.55, done: false };
    state.plate = { kind: 'plate', stack: ['bun', 'patty', 'lettuce'] };
    state.chef.x = 810; state.chef.y = 330; state.chef.hold = { id: 'cheese', cooked: false, chopped: false };
  } else if (name === 'orders') {
    state.elapsed = DAY_SECONDS - 138;
    state.orders = [o(21, 'klasik', 0.95), o(22, 'keju', 0.9), o(23, 'sayur', 0.85), o(24, 'kentang', 0.92)];
    state.chef.x = 340; state.chef.y = 560;
  } else if (name === 'serve') {
    state.elapsed = DAY_SECONDS - 96;
    state.coins = 340; state.served = 11; state.combo = 4; state.bestCombo = 5;
    state.orders = [o(31, 'keju', 0.72), o(32, 'klasik', 0.5)];
    state.chef.x = 1090; state.chef.y = 330;
    state.chef.hold = { kind: 'plate', stack: ['bun', 'patty', 'cheese', 'tomato'] };
  } else if (name === 'rush') {
    state.elapsed = DAY_SECONDS - 22;
    state.coins = 410; state.served = 15; state.combo = 5; state.bestCombo = 6;
    state.orders = [o(41, 'komplit', 0.22), o(42, 'keju', 0.3), o(43, 'klasik', 0.15), o(44, 'kentang', 0.4)];
    state.grill = [{ item: 'patty', t: 13 }, null];
    state.fryer = { item: 'fries', t: 11 };
    state.chef.x = 640; state.chef.y = 480;
    state.chef.hold = { kind: 'plate', stack: ['bun', 'patty'] };
  }
}

// --- self-test bot (?selftest=1) ---------------------------------------------------
// Plays one full Klasik order with the same interact() calls a player uses.
// Runs as a synchronous fixed-step simulation at load (no rAF timing), then
// reports the result into the DOM for headless verification.

const bot = { on: params.has('selftest'), step: 0, waitUntil: 0, done: false };

function teleportNear(target) {
  if (target.type === 'station') {
    const c = stationCenter(target.id);
    state.chef.x = c.x; state.chef.y = c.y;
  } else {
    const c = binCenter(target.id);
    state.chef.x = c.x; state.chef.y = c.y;
  }
}

function botStep(now) {
  if (bot.done || now < bot.waitUntil) return;
  const go = (type, id) => { teleportNear({ type, id }); doInteract(); };
  const grillReady = () => state.grill.some((s) => s && grillState(s) === 'perfect');
  const boardDone = () => state.board && state.board.done;
  switch (bot.step) {
    case 0: go('station', 'assembly'); bot.step++; break; // take empty plate
    case 1: go('station', 'assembly'); bot.step++; break; // place plate on counter
    case 2: go('bin', 'bun'); bot.step++; break; // hold bun
    case 3: go('station', 'assembly'); bot.step++; break; // bun onto plate
    case 4: go('bin', 'patty'); bot.step++; break; // hold raw patty
    case 5: go('station', 'grill'); bot.step++; bot.waitUntil = now + 0.5; break; // patty on grill
    case 6: if (grillReady()) { go('station', 'grill'); bot.step++; } break; // take perfect patty
    case 7: go('station', 'assembly'); bot.step++; break; // patty onto plate
    case 8: go('bin', 'lettuce'); bot.step++; break; // hold lettuce
    case 9: go('station', 'board'); bot.step++; break; // lettuce on board
    case 10: // hold-to-chop: simulate the Space key by chopping directly
      teleportNear({ type: 'station', id: 'board' });
      if (state.board) { state.board.progress += 0.5; if (state.board.progress >= 1) { state.board.progress = 1; state.board.done = true; bot.step++; } }
      break;
    case 11: go('station', 'board'); bot.step++; break; // take chopped lettuce
    case 12: go('station', 'assembly'); bot.step++; break; // lettuce onto plate
    case 13: go('station', 'assembly'); bot.step++; break; // pick plate up
    case 14: go('station', 'window'); bot.step++; break; // serve!
    case 15: {
      bot.done = true;
      const result = {
        served: state.served, coins: state.coins, combo: state.combo,
        ordersLeft: state.orders.length, phase: state.phase,
      };
      window.__selftest = result;
      const div = document.createElement('div');
      div.id = 'selftest-result';
      div.textContent = `SELFTEST served=${result.served} coins=${result.coins} combo=${result.combo} ordersLeft=${result.ordersLeft} phase=${result.phase}`;
      document.body.appendChild(div);
      document.title = div.textContent;
      break;
    }
    default: break;
  }
}

function runSelfTestSync() {
  // Fixed 60 Hz steps through the real update() + botStep() path.
  let simTime = 0;
  const DT = 1 / 60;
  for (let i = 0; i < 60 * 120 && !bot.done; i++) {
    botStep(simTime);
    update(state, DT, null);
    simTime += DT;
  }
  if (!bot.done) {
    const div = document.createElement('div');
    div.id = 'selftest-result';
    div.textContent = `SELFTEST TIMEOUT step=${bot.step} served=${state.served} coins=${state.coins} phase=${state.phase}`;
    document.body.appendChild(div);
    document.title = div.textContent;
  }
}

// --- boot -------------------------------------------------------------------------

const shot = params.get('shot');
if (shot) {
  stageShot(shot);
} else if (bot.on) {
  startDay(state);
  // keep only one Klasik order so the bot's serve always matches
  state.orders = [{ id: 99, recipeId: 'klasik', patience: TUNING.orderPatienceSeconds, maxPatience: TUNING.orderPatienceSeconds }];
  state.orderTimer = 9999;
  runSelfTestSync();
}

window.__ember = { state, doInteract, teleportNear, nearestTarget };

let last = performance.now();
let tGlobal = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  tGlobal += dt;

  const edges = input.pollEdges();
  if (edges.mute) { state.muted = audio.audioToggleMute(); }
  if (state.phase === 'title' && edges.start) { audio.audioUnlock(); startDay(state); }
  else if (state.phase === 'over' && edges.restart) { startDay(state); }
  if (state.phase === 'playing') {
    if (edges.action) { audio.audioUnlock(); doInteract(); }
    if (edges.trash) doTrash();
    stepMovement(dt);
    stepChopping(dt);
    const click = input.consumeClick();
    if (click) {
      audio.audioUnlock();
      const target = nearestTarget();
      const nearClick = target && chefNear(
        target.type === 'station' ? STATIONS[target.id] : { x: BINS.find((b) => b.id === target.id).x, y: BIN_Y, w: BINS.find((b) => b.id === target.id).w, h: BIN_H }, 120);
      if (nearClick && click.y < 660) doInteract();
      else if (click.y > 280 && click.y < 660) walkTarget = { x: click.x, y: click.y };
    }
  }
  if (bot.on) botStep(tGlobal);
  update(state, dt, sfx);
  const target = state.phase === 'playing' ? nearestTarget() : null;
  const highlight = target ? (target.type === 'station' ? target.id : `bin:${target.id}`) : null;
  render(ctx, state, tGlobal, hintFor(target), highlight);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
