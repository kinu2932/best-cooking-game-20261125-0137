// Dapur Ember — audio: tiny synthesised sound effects, no audio files.
// Everything is generated with WebAudio oscillators, so the game loads
// nothing over the network and stays silent until the player acts.

let ctx = null;
let muted = false;
let sizzleNodes = null;

export function audioUnlock() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch (_e) { /* headless / no audio: stay silent */ }
}

export function audioToggleMute() {
  muted = !muted;
  if (muted) audioStopSizzle();
  return muted;
}

function tone(freq, dur, type, vol, when = 0) {
  if (!ctx || muted) return;
  try {
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch (_e) { /* ignore */ }
}

export function sfxPickup() { tone(520, 0.09, 'sine', 0.12); }
export function sfxPlace() { tone(330, 0.08, 'triangle', 0.12); tone(220, 0.1, 'triangle', 0.08, 0.05); }
export function sfxChop() { tone(180, 0.06, 'square', 0.1); tone(90, 0.05, 'square', 0.08, 0.02); }
export function sfxChopDone() { tone(660, 0.1, 'sine', 0.12); tone(880, 0.14, 'sine', 0.12, 0.08); }
export function sfxDing() { tone(1046, 0.25, 'sine', 0.14); tone(1318, 0.3, 'sine', 0.1, 0.09); }
export function sfxServe() { tone(784, 0.12, 'sine', 0.14); tone(988, 0.12, 'sine', 0.14, 0.1); tone(1175, 0.22, 'sine', 0.14, 0.2); }
export function sfxWrong() { tone(160, 0.22, 'sawtooth', 0.1); tone(110, 0.28, 'sawtooth', 0.09, 0.12); }
export function sfxBurnt() { tone(220, 0.3, 'sawtooth', 0.1); tone(147, 0.35, 'sawtooth', 0.09, 0.15); }
export function sfxTick() { tone(1200, 0.04, 'sine', 0.06); }
export function sfxNewOrder() { tone(880, 0.08, 'triangle', 0.1); tone(1175, 0.1, 'triangle', 0.1, 0.07); }

export function audioStartSizzle() {
  if (!ctx || muted || sizzleNodes) return;
  try {
    const len = ctx.sampleRate * 1;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000;
    const gain = ctx.createGain();
    gain.gain.value = 0.035;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    sizzleNodes = { src, gain };
  } catch (_e) { /* ignore */ }
}

export function audioStopSizzle() {
  if (!sizzleNodes) return;
  try { sizzleNodes.src.stop(); } catch (_e) { /* ignore */ }
  sizzleNodes = null;
}
