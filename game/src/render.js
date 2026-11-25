// Dapur Ember — render: every pixel the judge sees, drawn with canvas 2D.
// Warm warung palette, chunky readable food, no image files at all.

import { STATIONS, BINS, BIN_Y, BIN_H, INGREDIENTS, recipeById, VIEW_W, VIEW_H } from './config.js';
import { grillState, fryerState } from './state.js';

const WALL = '#f7e8c9';
const FLOOR_A = '#e9b47e';
const FLOOR_B = '#dfa26c';
const WOOD = '#8a5a33';
const WOOD_TOP = '#b07a45';
const STEEL = '#c9d2da';
const STEEL_DARK = '#9aa7b2';
const INK = '#33241a';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, weight = 'bold', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

// --- food icons ---------------------------------------------------------------

export function drawIngredient(ctx, id, cx, cy, s, extra) {
  ctx.save();
  ctx.translate(cx, cy);
  if (id === 'bun') {
    ctx.fillStyle = '#e8a54b';
    ctx.beginPath(); ctx.arc(0, 2, s * 0.52, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d98f2e';
    ctx.fillRect(-s * 0.52, 0, s * 1.04, s * 0.16);
    ctx.fillStyle = '#fff3d6';
    for (const dx of [-0.22, 0, 0.22]) { ctx.beginPath(); ctx.arc(dx * s, -s * 0.22, s * 0.045, 0, 7); ctx.fill(); }
  } else if (id === 'patty') {
    const cooked = extra === 'perfect' ? '#6e3b1e' : extra === 'burnt' ? '#241812' : extra === 'cooking' ? '#a05a34' : '#8a4b2a';
    ctx.fillStyle = cooked;
    rr(ctx, -s * 0.55, -s * 0.2, s * 1.1, s * 0.42, s * 0.18);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    rr(ctx, -s * 0.45, -s * 0.16, s * 0.9, s * 0.12, s * 0.06);
    ctx.fill();
    if (extra === 'perfect') { ctx.fillStyle = '#7dff6a'; ctx.font = `bold ${s * 0.34}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('✓', 0, -s * 0.42); }
    if (extra === 'burnt') { ctx.fillStyle = '#ff5a3c'; ctx.font = `bold ${s * 0.34}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('✕', 0, -s * 0.42); }
  } else if (id === 'lettuce') {
    ctx.fillStyle = '#5da244';
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = s * (0.42 + (i % 2 ? 0.14 : 0));
      const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.7;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3f7a2e'; ctx.lineWidth = s * 0.05;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.3); ctx.lineTo(0, s * 0.3); ctx.stroke();
  } else if (id === 'tomato') {
    ctx.fillStyle = '#d9392b';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#f2705f';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.34, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd9a0';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * s * 0.16, Math.sin(a) * s * 0.16, s * 0.1, s * 0.05, a, 0, 7); ctx.fill();
    }
  } else if (id === 'cheese') {
    ctx.fillStyle = '#f2c230';
    ctx.beginPath(); ctx.moveTo(-s * 0.5, s * 0.35); ctx.lineTo(s * 0.5, s * 0.35); ctx.lineTo(0, -s * 0.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8a91c';
    for (const [dx, dy] of [[-0.2, 0.1], [0.15, -0.05], [0.05, 0.2]]) {
      ctx.beginPath(); ctx.arc(dx * s, dy * s, s * 0.06, 0, 7); ctx.fill();
    }
  } else if (id === 'fries') {
    ctx.fillStyle = '#f6c945';
    for (let i = -2; i <= 2; i++) {
      ctx.save(); ctx.translate(i * s * 0.2, -s * 0.05); ctx.rotate(i * 0.08);
      ctx.fillRect(-s * 0.07, -s * 0.42, s * 0.14, s * 0.7); ctx.restore();
    }
    ctx.fillStyle = '#d9392b';
    ctx.beginPath(); ctx.moveTo(-s * 0.52, -s * 0.1); ctx.lineTo(s * 0.52, -s * 0.1);
    ctx.lineTo(s * 0.4, s * 0.42); ctx.lineTo(-s * 0.4, s * 0.42); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, s * 0.16, s * 0.14, 0, 7); ctx.fill();
    ctx.fillStyle = '#d9392b'; ctx.font = `bold ${s * 0.2}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('E', 0, s * 0.17);
  }
  ctx.restore();
}

function drawPlate(ctx, x, y, stack) {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(x, y, 52, 14, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#b9c4cc'; ctx.lineWidth = 2; ctx.stroke();
  let yy = y - 6;
  for (const id of stack) {
    drawIngredient(ctx, id, x, yy - 8, 34, id === 'patty' ? 'perfect' : undefined);
    yy -= 13;
  }
}

// --- kitchen ------------------------------------------------------------------

function drawFloor(ctx, t) {
  ctx.fillStyle = WALL;
  ctx.fillRect(0, 0, VIEW_W, 116);
  // wall tiles + hanging lamps
  ctx.fillStyle = '#f2dcae';
  for (let x = 0; x < VIEW_W; x += 64) ctx.fillRect(x, 104, 60, 4);
  for (let i = 0; i < 5; i++) {
    const lx = 140 + i * 260;
    ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, 26); ctx.stroke();
    ctx.fillStyle = '#ffdf8a';
    ctx.beginPath(); ctx.arc(lx, 36, 12 + Math.sin(t * 2 + i) * 1.5, 0, 7); ctx.fill();
  }
  text(ctx, '🍳 DAPUR EMBER', 24, 30, 26, '#6b4423', '900');
  text(ctx, 'warung masak kilat', 24, 58, 14, '#8a6a45', '600');

  ctx.fillStyle = FLOOR_A;
  ctx.fillRect(0, 116, VIEW_W, VIEW_H - 116);
  ctx.fillStyle = FLOOR_B;
  for (let y = 116; y < VIEW_H; y += 64) {
    for (let x = ((y / 64) % 2 ? 32 : 0); x < VIEW_W; x += 64) ctx.fillRect(x, y, 60, 60);
  }
  // woven rug in the middle of the kitchen floor
  ctx.fillStyle = '#c96f3f';
  rr(ctx, 460, 400, 360, 170, 14); ctx.fill();
  ctx.fillStyle = '#e08a52';
  for (let ry = 0; ry < 4; ry++) for (let rx = 0; rx < 8; rx++) {
    if ((rx + ry) % 2 === 0) ctx.fillRect(468 + rx * 44, 408 + ry * 41, 40, 37);
  }
  ctx.strokeStyle = '#a8542c'; ctx.lineWidth = 4;
  rr(ctx, 460, 400, 360, 170, 14); ctx.stroke();
  // potted plant by the right wall, out of the main walking lane
  ctx.fillStyle = '#b5502e';
  ctx.beginPath(); ctx.moveTo(1224, 300); ctx.lineTo(1256, 300); ctx.lineTo(1250, 330); ctx.lineTo(1230, 330); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3f7a2e';
  for (const [lx, ly, lr] of [[1240, 272, 16], [1228, 284, 12], [1252, 284, 12], [1240, 258, 12]]) {
    ctx.beginPath(); ctx.ellipse(lx, ly, lr * 0.55, lr, 0, 0, 7); ctx.fill();
  }
}

function drawStationBase(ctx, st, highlight) {
  ctx.fillStyle = highlight ? '#ffd98a' : WOOD;
  rr(ctx, st.x - 4, st.y - 4, st.w + 8, st.h + 8, 10);
  ctx.fill();
  ctx.fillStyle = WOOD_TOP;
  rr(ctx, st.x, st.y, st.w, st.h, 8);
  ctx.fill();
  text(ctx, st.label, st.x + st.w / 2, st.y + 14, 12, '#fff', '800', 'center');
}

function drawGrill(ctx, state, t, highlight) {
  const st = STATIONS.grill;
  drawStationBase(ctx, st, highlight);
  ctx.fillStyle = '#2e2e2e';
  rr(ctx, st.x + 14, st.y + 26, st.w - 28, 62, 8);
  ctx.fill();
  // grate lines
  ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath(); ctx.moveTo(st.x + 14 + (i * (st.w - 28)) / 6, st.y + 28); ctx.lineTo(st.x + 14 + (i * (st.w - 28)) / 6, st.y + 86); ctx.stroke();
  }
  state.grill.forEach((slot, i) => {
    const cx = st.x + 70 + i * 120;
    const cy = st.y + 57;
    const gs = grillState(slot);
    if (gs === 'cooking' || gs === 'perfect') {
      // flames licking under the patty
      for (let f = 0; f < 3; f++) {
        const fx = cx - 26 + f * 26 + Math.sin(t * 9 + f * 2 + i) * 3;
        const fh = 12 + Math.sin(t * 11 + f * 3) * 5;
        ctx.fillStyle = f % 2 ? '#ff9d2e' : '#ff5a1e';
        ctx.beginPath(); ctx.moveTo(fx - 8, cy + 16); ctx.quadraticCurveTo(fx, cy + 16 - fh - 8, fx + 8, cy + 16); ctx.closePath(); ctx.fill();
      }
    }
    if (slot) drawIngredient(ctx, 'patty', cx, cy, 52, gs);
    if (gs === 'perfect') text(ctx, 'SIAP!', cx, st.y - 12, 13, '#1d7a2e', '900', 'center');
    if (gs === 'burnt') text(ctx, 'GOSONG', cx, st.y - 12, 13, '#d9392b', '900', 'center');
  });
}

function drawFryer(ctx, state, t, highlight) {
  const st = STATIONS.fryer;
  drawStationBase(ctx, st, highlight);
  ctx.fillStyle = STEEL;
  rr(ctx, st.x + 16, st.y + 26, st.w - 32, 62, 8);
  ctx.fill();
  ctx.fillStyle = '#e8a91c';
  rr(ctx, st.x + 22, st.y + 34, st.w - 44, 46, 6);
  ctx.fill();
  // bubbling oil
  ctx.fillStyle = '#fff3b0';
  for (let i = 0; i < 6; i++) {
    const bx = st.x + 34 + ((i * 23 + Math.floor(t * 40)) % (st.w - 68));
    const by = st.y + 44 + ((i * 17) % 26);
    ctx.beginPath(); ctx.arc(bx, by, 3 + (i % 2), 0, 7); ctx.fill();
  }
  const fs = fryerState(state.fryer);
  if (state.fryer) drawIngredient(ctx, 'fries', st.x + st.w / 2, st.y + 56, 44);
  if (fs === 'ready') text(ctx, 'SIAP!', st.x + st.w / 2, st.y - 12, 13, '#1d7a2e', '900', 'center');
  if (fs === 'burnt') text(ctx, 'GOSONG', st.x + st.w / 2, st.y - 12, 13, '#d9392b', '900', 'center');
}

function drawBoard(ctx, state, highlight) {
  const st = STATIONS.board;
  drawStationBase(ctx, st, highlight);
  ctx.fillStyle = '#e8d5ae';
  rr(ctx, st.x + 18, st.y + 28, st.w - 36, 58, 6);
  ctx.fill();
  ctx.strokeStyle = '#c9b183'; ctx.lineWidth = 2; ctx.stroke();
  if (state.board) {
    drawIngredient(ctx, state.board.item, st.x + st.w / 2, st.y + 56, 46);
    if (!state.board.done) {
      // chop progress ring
      const p = state.board.progress;
      ctx.strokeStyle = '#1d7a2e'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(st.x + st.w / 2, st.y + 56, 34, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
      text(ctx, 'TAHAN SPASI!', st.x + st.w / 2, st.y - 12, 12, '#1d7a2e', '900', 'center');
    } else {
      text(ctx, 'SUDAH DICINCANG ✓', st.x + st.w / 2, st.y - 12, 12, '#1d7a2e', '900', 'center');
    }
  } else {
    text(ctx, 'taruh tomat / selada', st.x + st.w / 2, st.y + 56, 12, '#8a6a45', '600', 'center');
  }
}

function drawAssembly(ctx, state, highlight) {
  const st = STATIONS.assembly;
  drawStationBase(ctx, st, highlight);
  ctx.fillStyle = '#f3ead6';
  rr(ctx, st.x + 14, st.y + 26, st.w - 28, 62, 8);
  ctx.fill();
  if (state.plate) {
    drawPlate(ctx, st.x + st.w / 2, st.y + 66, state.plate.stack);
    text(ctx, state.plate.stack.length ? 'di atas piring…' : 'piring kosong', st.x + st.w / 2, st.y - 12, 12, '#8a6a45', '600', 'center');
  } else {
    text(ctx, 'taruh piring di sini (E)', st.x + st.w / 2, st.y + 56, 12, '#8a6a45', '600', 'center');
  }
}

function drawWindow(ctx, state, t, highlight) {
  const st = STATIONS.window;
  drawStationBase(ctx, st, highlight);
  ctx.fillStyle = '#fff8ea';
  rr(ctx, st.x + 14, st.y + 26, st.w - 28, 62, 8);
  ctx.fill();
  ctx.strokeStyle = '#d9c9a8'; ctx.lineWidth = 2; ctx.stroke();
  // service bell
  ctx.fillStyle = '#f2c230';
  ctx.beginPath(); ctx.arc(st.x + st.w - 42, st.y + 56, 16, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.fillRect(st.x + st.w - 58, st.y + 56, 32, 5);
  text(ctx, 'SAJIKAN (E)', st.x + st.w / 2 - 20, st.y + 56, 13, '#6b4423', '800', 'center');
  if (state.chef.hold && state.chef.hold.kind === 'plate' && state.chef.hold.stack.length) {
    const glow = 0.5 + Math.sin(t * 5) * 0.3;
    ctx.fillStyle = `rgba(125,255,106,${glow})`;
    rr(ctx, st.x + 8, st.y + 20, st.w - 16, 74, 10);
    ctx.fill();
    text(ctx, 'SIAP DISAJIKAN!', st.x + st.w / 2, st.y - 12, 12, '#1d7a2e', '900', 'center');
  }
}

function drawBins(ctx, state, highlightBin) {
  for (const bin of BINS) {
    const ing = INGREDIENTS[bin.id];
    const hot = highlightBin === bin.id;
    ctx.fillStyle = hot ? '#ffd98a' : '#fff8ea';
    rr(ctx, bin.x, BIN_Y, bin.w, BIN_H, 10);
    ctx.fill();
    ctx.strokeStyle = hot ? '#e8862e' : '#d9c9a8'; ctx.lineWidth = hot ? 4 : 2; ctx.stroke();
    drawIngredient(ctx, bin.id, bin.x + bin.w / 2, BIN_Y + 46, 52);
    text(ctx, ing.name.toUpperCase(), bin.x + bin.w / 2, BIN_Y + 92, 13, '#6b4423', '800', 'center');
  }
}

function drawChef(ctx, state, t) {
  const { x, y, dir, moving, hold } = state.chef;
  const bob = moving ? Math.sin(t * 12) * 3 : Math.sin(t * 2) * 1.5;
  ctx.save();
  ctx.translate(x, y + bob);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(0, 34 - bob, 30, 8, 0, 0, 7); ctx.fill();
  // body / apron
  ctx.fillStyle = '#ffffff';
  rr(ctx, -22, -6, 44, 40, 12); ctx.fill();
  ctx.fillStyle = '#3f7a2e';
  rr(ctx, -16, 6, 32, 28, 8); ctx.fill();
  // head + chef hat
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath(); ctx.arc(0, -20, 17, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-10, -32, 10, 0, 7); ctx.arc(0, -38, 12, 0, 7); ctx.arc(10, -32, 10, 0, 7); ctx.fill();
  ctx.fillRect(-18, -34, 36, 8);
  // eyes face the walking direction
  ctx.fillStyle = '#33241a';
  ctx.beginPath(); ctx.arc(dir * 5 - 5, -20, 2.2, 0, 7); ctx.arc(dir * 5 + 5, -20, 2.2, 0, 7); ctx.fill();
  ctx.strokeStyle = '#33241a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(dir * 5, -14, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  // held item floats above the hands
  if (hold) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(0, -58, 24, 0, 7); ctx.fill();
    if (hold.kind === 'plate') drawPlate(ctx, 0, -52, hold.stack);
    else drawIngredient(ctx, hold.id, 0, -58, 30);
  }
  ctx.restore();
}

// --- HUD: order rail, timer, coins ------------------------------------------------

function drawTicket(ctx, order, x, y, t) {
  const recipe = recipeById(order.recipeId);
  const ratio = Math.max(0, order.patience / order.maxPatience);
  const urgent = ratio < 0.35;
  const bg = urgent && Math.sin(t * 8) > 0 ? '#ffe1dc' : '#fffdf6';
  ctx.fillStyle = bg;
  rr(ctx, x, y, 204, 92, 8);
  ctx.fill();
  ctx.strokeStyle = urgent ? '#d9392b' : '#d9c9a8'; ctx.lineWidth = urgent ? 3 : 2; ctx.stroke();
  text(ctx, `#${order.id} ${recipe.name}`, x + 10, y + 16, 13, INK, '800');
  let ix = x + 12;
  for (const id of recipe.needs) {
    drawIngredient(ctx, id, ix + 14, y + 46, 24, id === 'patty' ? 'perfect' : undefined);
    ix += 30;
  }
  text(ctx, `$${recipe.price}`, x + 192, y + 16, 13, '#1d7a2e', '900', 'right');
  // patience bar
  ctx.fillStyle = '#e5d9c2';
  rr(ctx, x + 10, y + 74, 184, 9, 4); ctx.fill();
  ctx.fillStyle = ratio > 0.5 ? '#5da244' : ratio > 0.25 ? '#f2c230' : '#d9392b';
  rr(ctx, x + 10, y + 74, 184 * ratio, 9, 4); ctx.fill();
}

function drawHud(ctx, state, t) {
  // order rail lives on the wall band (y 8..104)
  ctx.fillStyle = 'rgba(51,36,26,0.08)';
  ctx.fillRect(0, 0, VIEW_W, 116);
  if (!state.orders.length) {
    text(ctx, 'menunggu pesanan pertama…', 300, 60, 15, '#8a6a45', '600');
  }
  state.orders.forEach((o, i) => drawTicket(ctx, o, 300 + i * 214, 10, t));

  // coins + combo, top-left under the title
  text(ctx, `💰 $${state.coins}`, 24, 92, 20, '#1d7a2e', '900');
  if (state.combo >= 2) text(ctx, `KOMBO x${state.combo}`, 150, 92, 16, '#e8862e', '900');

  // day timer, top-right
  const secs = Math.ceil(state.timeLeft);
  const mm = Math.floor(secs / 60);
  const ss = String(secs % 60).padStart(2, '0');
  const low = secs <= 30 && state.phase === 'playing';
  ctx.fillStyle = low ? '#d9392b' : INK;
  rr(ctx, VIEW_W - 190, 14, 176, 44, 10); ctx.fill();
  text(ctx, `⏱ ${mm}:${ss}`, VIEW_W - 102, 37, 24, '#fff', '900', 'center');
  // rush banner
  if (state.phase === 'playing' && state.elapsed >= 70) {
    text(ctx, '🔥 JAM SIBUK!', VIEW_W - 102, 76, 14, '#d9392b', '900', 'center');
  }
  text(ctx, `tersaji: ${state.served}`, VIEW_W - 102, 96, 13, '#8a6a45', '700', 'center');
}

function drawHint(ctx, hintText, state) {
  if (!hintText) return;
  // speech bubble beside the chef, so it never covers a station label
  const flip = state.chef.x > VIEW_W - 320;
  const bx = flip ? state.chef.x - 330 : state.chef.x + 34;
  const by = state.chef.y - 78;
  ctx.font = '700 14px system-ui, sans-serif';
  const w = Math.min(300, ctx.measureText(hintText).width + 24);
  ctx.fillStyle = 'rgba(51,36,26,0.92)';
  rr(ctx, bx, by, w, 30, 14);
  ctx.fill();
  ctx.fillStyle = '#ffe9b0';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(hintText, bx + 12, by + 16);
}

function drawFloaters(ctx, state) {
  for (const f of state.floaters) {
    const a = 1 - f.t / f.life;
    ctx.globalAlpha = a;
    text(ctx, f.text, f.x, f.y - f.t * 30, 18, f.color, '900', 'center');
    ctx.globalAlpha = 1;
  }
  if (state.flash) {
    const a = 1 - state.flash.t / 1.2;
    ctx.globalAlpha = Math.max(0, a);
    text(ctx, state.flash.text, VIEW_W / 2, 320, 44, state.flash.color, '900', 'center');
    ctx.globalAlpha = 1;
  }
}

function drawParticles(ctx, state) {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// --- screens --------------------------------------------------------------------

function drawTitle(ctx, state, t) {
  ctx.fillStyle = 'rgba(43,29,18,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#fff8ea';
  rr(ctx, 290, 170, 700, 460, 18); ctx.fill();
  ctx.strokeStyle = '#e8862e'; ctx.lineWidth = 4; ctx.stroke();
  text(ctx, '🍳 DAPUR EMBER', 640, 230, 52, '#6b4423', '900', 'center');
  text(ctx, 'Warung masak kilat — satu koki, lima resep, satu dapur yang panas.', 640, 280, 17, '#8a6a45', '600', 'center');
  const lines = [
    '1. Ambil bahan dari rak bawah (E di dekat rak).',
    '2. Panggang patty sampai SIAP — jangan sampai gosong!',
    '3. Cincang tomat & selada di talenan (tahan SPASI).',
    '4. Rakit di piring, sajikan di jendela sebelum pelanggan pergi.',
    '5. Tip besar kalau cepat — kombo naik kalau tak pernah gagal.',
  ];
  lines.forEach((l, i) => text(ctx, l, 640, 330 + i * 30, 16, INK, '600', 'center'));
  const pulse = 0.7 + Math.sin(t * 4) * 0.3;
  ctx.globalAlpha = pulse;
  text(ctx, 'Tekan ENTER untuk mulai memasak', 640, 540, 22, '#1d7a2e', '900', 'center');
  ctx.globalAlpha = 1;
  text(ctx, 'WASD / panah bergerak · E ambil/taruh · SPASI cincang · Q buang', 640, 580, 14, '#8a6a45', '600', 'center');
}

function drawOver(ctx, state) {
  ctx.fillStyle = 'rgba(43,29,18,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#fff8ea';
  rr(ctx, 340, 190, 600, 420, 18); ctx.fill();
  ctx.strokeStyle = '#e8862e'; ctx.lineWidth = 4; ctx.stroke();
  text(ctx, 'HARI SELESAI!', 640, 250, 46, '#6b4423', '900', 'center');
  text(ctx, `💰 Total koin: $${state.coins}`, 640, 320, 26, '#1d7a2e', '900', 'center');
  text(ctx, `🍽 Pesanan tersaji: ${state.served}   ·   Kombo terbaik: x${state.bestCombo}`, 640, 365, 18, INK, '700', 'center');
  text(ctx, `Gosong: ${state.stats.burnt}   ·   Salah saji: ${state.stats.wrong}   ·   Hangus: ${state.stats.expired}`, 640, 400, 16, '#8a6a45', '600', 'center');
  const verdict = state.coins >= 200 ? 'Koki Bintang Lima! ⭐⭐⭐⭐⭐'
    : state.coins >= 120 ? 'Dapurmu ramai — pelanggan pulang senang.'
    : state.coins >= 60 ? 'Lumayan! Besok lebih cepat lagi.'
    : 'Dapur masih berantakan… coba lagi, Chef!';
  text(ctx, verdict, 640, 450, 19, '#e8862e', '800', 'center');
  text(ctx, 'Tekan R untuk hari berikutnya', 640, 520, 20, '#1d7a2e', '900', 'center');
}

// --- main entry -------------------------------------------------------------------

export function render(ctx, state, t, hintText, highlight) {
  drawFloor(ctx, t);
  drawHud(ctx, state, t);
  drawGrill(ctx, state, t, highlight === 'grill');
  drawFryer(ctx, state, t, highlight === 'fryer');
  drawBoard(ctx, state, highlight === 'board');
  drawAssembly(ctx, state, highlight === 'assembly');
  drawWindow(ctx, state, t, highlight === 'window');
  drawBins(ctx, state, highlight && highlight.startsWith('bin:') ? highlight.slice(4) : null);
  drawParticles(ctx, state);
  drawChef(ctx, state, t);
  drawFloaters(ctx, state);
  if (state.phase === 'playing') drawHint(ctx, hintText, state);
  if (state.phase === 'title') drawTitle(ctx, state, t);
  if (state.phase === 'over') drawOver(ctx, state);
}
