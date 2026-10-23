let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(v: boolean) {
  muted = v;
}

export function isMuted() {
  return muted;
}

export function unlock() {
  const AC = window.AudioContext;
  if (!AC) return;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  ui() {
    tone(520, 0.05, "square", 0.03);
  },
  hit() {
    tone(180, 0.08, "sawtooth", 0.04);
    tone(90, 0.1, "square", 0.03);
  },
  hurt() {
    tone(120, 0.14, "triangle", 0.05);
  },
  spell() {
    tone(440, 0.08, "sine", 0.04);
    tone(660, 0.12, "sine", 0.03, 0.05);
  },
  heal() {
    tone(523, 0.1, "sine", 0.04);
    tone(659, 0.14, "sine", 0.03, 0.06);
  },
  quest() {
    tone(392, 0.1, "triangle", 0.04);
    tone(523, 0.16, "triangle", 0.04, 0.09);
  },
  coin() {
    tone(880, 0.06, "square", 0.03);
  },
  level() {
    tone(523, 0.1, "triangle", 0.05);
    tone(659, 0.1, "triangle", 0.05, 0.1);
    tone(784, 0.2, "triangle", 0.05, 0.2);
  },
  death() {
    tone(196, 0.3, "sine", 0.05);
    tone(98, 0.4, "sine", 0.04, 0.12);
  },
};
