// Dapur Ember — state: the whole game model (orders, stations, chef, score).
// No drawing here; render.js reads this state and main.js drives it.

import { TUNING, RECIPES, stacksMatch, recipeById } from './config.js';

let nextOrderId = 1;

export function makePlate() {
  return { kind: 'plate', stack: [] };
}

export function newGame() {
  return {
    phase: 'title', // title | playing | over
    timeLeft: TUNING_DAY_SECONDS(),
    elapsed: 0,
    coins: 0,
    served: 0,
    combo: 0,
    bestCombo: 0,
    orders: [], // {id, recipeId, patience, maxPatience}
    orderTimer: TUNING.firstOrderDelaySeconds,
    chef: { x: 640, y: 480, dir: 1, moving: false, hold: null },
    grill: [null, null], // slots: null | {item:'patty', t: seconds on grill}
    fryer: null, // null | {item:'fries', t}
    board: null, // null | {item:'tomato'|'lettuce', progress 0..1, done}
    plate: null, // plate resting on the assembly counter
    floaters: [], // {x, y, text, color, t, life}
    particles: [], // {x, y, vx, vy, t, life, color, size}
    flash: null, // {text, color, t}
    muted: false,
    stats: { burnt: 0, wrong: 0, expired: 0, chopped: 0 },
    lastTickSecond: -1,
  };
}

function TUNING_DAY_SECONDS() {
  return 150;
}

export function startDay(state) {
  const fresh = newGame();
  fresh.phase = 'playing';
  Object.assign(state, fresh);
  spawnOrder(state);
}

export function spawnOrder(state) {
  if (state.orders.length >= TUNING.maxTickets) return;
  const recipe = RECIPES[Math.floor(Math.random() * RECIPES.length)];
  const patience = TUNING.orderPatienceSeconds;
  state.orders.push({ id: nextOrderId++, recipeId: recipe.id, patience, maxPatience: patience });
}

function addFloater(state, x, y, text, color) {
  state.floaters.push({ x, y, text, color, t: 0, life: 1.4 });
}

function addFlash(state, text, color) {
  state.flash = { text, color, t: 0 };
}

function burst(state, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.6);
    state.particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30,
      t: 0, life: 0.6 + Math.random() * 0.5, color, size: 2 + Math.random() * 3,
    });
  }
}

// --- cooking progress -------------------------------------------------------

export function grillState(slot) {
  if (!slot) return 'empty';
  if (slot.t < TUNING.grillCookSeconds) return 'cooking';
  if (slot.t < TUNING.grillBurnSeconds) return 'perfect';
  return 'burnt';
}

export function fryerState(slot) {
  if (!slot) return 'empty';
  if (slot.t < TUNING.fryerCookSeconds) return 'cooking';
  if (slot.t < TUNING.fryerBurnSeconds) return 'ready';
  return 'burnt';
}

// --- serving ----------------------------------------------------------------

export function tryServe(state) {
  const held = state.chef.hold;
  if (!held || held.kind !== 'plate') return { ok: false, why: 'no-plate' };
  const idx = state.orders.findIndex((o) => stacksMatch(held.stack, recipeById(o.recipeId).needs));
  if (idx < 0) {
    state.combo = 0;
    state.stats.wrong++;
    addFloater(state, 1100, 200, 'BUKAN PESANAN!', '#d9392b');
    return { ok: false, why: 'no-match' };
  }
  const order = state.orders[idx];
  const recipe = recipeById(order.recipeId);
  const patienceRatio = Math.max(0, order.patience / order.maxPatience);
  const tip = Math.round(recipe.price * TUNING.tipPerPatienceSecond * patienceRatio * 10) / 10;
  const mult = Math.min(TUNING.comboCap, 1 + TUNING.comboStep * state.combo);
  const earned = Math.round((recipe.price + tip) * mult);
  state.coins += earned;
  state.served++;
  state.combo++;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.orders.splice(idx, 1);
  state.chef.hold = null;
  addFloater(state, 1100, 200, `+${earned} KOİN`, '#1d7a2e');
  if (state.combo >= 3) addFlash(state, `KOMBO x${state.combo}!`, '#e8862e');
  burst(state, 1100, 240, '#f2c230', 22, 160);
  return { ok: true, earned, recipe: recipe.name };
}

// --- per-frame update ---------------------------------------------------------

export function update(state, dt, sfx) {
  // particles and floaters always animate
  for (const p of state.particles) {
    p.t += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 160 * dt;
  }
  state.particles = state.particles.filter((p) => p.t < p.life);
  for (const f of state.floaters) f.t += dt;
  state.floaters = state.floaters.filter((f) => f.t < f.life);
  if (state.flash) {
    state.flash.t += dt;
    if (state.flash.t > 1.2) state.flash = null;
  }
  if (state.phase !== 'playing') return;

  state.elapsed += dt;
  state.timeLeft = Math.max(0, TUNING_DAY_SECONDS() - state.elapsed);

  // last-10-seconds tick
  const sec = Math.ceil(state.timeLeft);
  if (sec <= 10 && sec !== state.lastTickSecond) {
    state.lastTickSecond = sec;
    if (sfx) sfx.tick();
  }

  // grill + fryer cook on
  for (const slot of state.grill) if (slot) slot.t += dt;
  if (state.fryer) state.fryer.t += dt;
  const anyCooking = state.grill.some((s) => s) || state.fryer;
  if (sfx) sfx.sizzle(anyCooking);

  // burnt warnings
  for (let i = 0; i < state.grill.length; i++) {
    const slot = state.grill[i];
    if (slot && slot.t >= TUNING.grillBurnSeconds && !slot.warned) {
      slot.warned = true;
      state.stats.burnt++;
      addFloater(state, 170, 150, 'PATTY GOSONG!', '#d9392b');
      if (sfx) sfx.burnt();
    }
  }
  if (state.fryer && state.fryer.t >= TUNING.fryerBurnSeconds && !state.fryer.warned) {
    state.fryer.warned = true;
    state.stats.burnt++;
    addFloater(state, 400, 150, 'KENTANG GOSONG!', '#d9392b');
    if (sfx) sfx.burnt();
  }

  // orders arrive; rush hour speeds them up
  state.orderTimer -= dt;
  if (state.orderTimer <= 0) {
    spawnOrder(state);
    if (sfx) sfx.newOrder();
    const interval = state.elapsed >= TUNING.rushAfterSeconds
      ? TUNING.rushOrderEverySeconds
      : TUNING.orderEverySeconds;
    state.orderTimer = interval;
  }

  // patience drains; expired tickets walk out
  for (let i = state.orders.length - 1; i >= 0; i--) {
    const o = state.orders[i];
    o.patience -= dt;
    if (o.patience <= 0) {
      state.orders.splice(i, 1);
      state.combo = 0;
      state.stats.expired++;
      addFloater(state, 300, 120, 'PESANAN HANGUS', '#d9392b');
    }
  }

  // steam puffs above the grill while something cooks
  if (anyCooking && Math.random() < dt * 6) {
    state.particles.push({
      x: 120 + Math.random() * 120, y: 165, vx: (Math.random() - 0.5) * 12,
      vy: -45 - Math.random() * 20, t: 0, life: 0.9, color: 'rgba(255,255,255,0.7)', size: 3 + Math.random() * 3,
    });
  }

  if (state.timeLeft <= 0) {
    state.phase = 'over';
    if (sfx) sfx.sizzle(false);
  }
}
