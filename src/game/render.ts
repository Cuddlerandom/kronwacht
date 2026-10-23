import { art, type Sheet } from "@/game/assets";
import { COLS, ROWS, TILE, WORLD_H, WORLD_W, props, tiles, type Prop } from "@/game/world";

export interface DrawActor {
  id: string;
  sprite: string;
  x: number;
  y: number;
  dir: number;
  frame: number;
  name: string;
  level?: number;
  hp: number;
  hpMax: number;
  hostile: boolean;
  dead: boolean;
  ghost?: boolean;
  showBar: boolean;
  mark: "!" | "?" | null;
  selected: boolean;
  hitH: number;
}

export interface DrawFloat {
  x: number;
  y: number;
  text: string;
  color: "gold" | "hurt" | "heal" | "info" | "mana";
  life: number;
}

export interface DrawModel {
  camX: number;
  camY: number;
  viewW: number;
  viewH: number;
  dpr: number;
  time: number;
  shake: number;
  actors: DrawActor[];
  herbsHidden: string[];
  click: { x: number; y: number } | null;
  floats: DrawFloat[];
  target: { x: number; y: number; hostile: boolean } | null;
  lowHp: boolean;
  sparkles: { x: number; y: number }[];
}

const INK = "#120e0a";
const GOLD = "#e4c27a";
const HP = "#3c9a45";
const HURT = "#c4483a";
const PARCHMENT = "#f3e6c8";
const MANA = "#8eb4ef";
const HEAL = "#8dcea0";

const FLOATS = { gold: GOLD, hurt: HURT, heal: HEAL, info: PARCHMENT, mana: MANA };

const HEIGHT: Record<string, number> = {
  hero: 112,
  wolf: 80,
  bandit: 98,
  mara: 114,
  vendor: 110,
  lira: 114,
  dummy: 102,
  tree: 178,
  cottage: 170,
  well: 100,
  fence: 54,
  rock: 72,
  herb: 66,
  barrel: 70,
  grave: 82,
};

let grassPat: CanvasPattern | null = null;
let dirtPat: CanvasPattern | null = null;
let waterPat: CanvasPattern | null = null;
let patCtx: CanvasRenderingContext2D | null = null;

function pattern(ctx: CanvasRenderingContext2D, sheet: Sheet | null | undefined) {
  if (!sheet) return null;
  try {
    return ctx.createPattern(sheet.img, "repeat");
  } catch {
    return null;
  }
}

function drawImagePart(
  ctx: CanvasRenderingContext2D,
  sheet: Sheet,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  footX: number,
  footY: number,
  height: number,
) {
  const dw = height * (sw / sh);
  ctx.drawImage(sheet.img, sx, sy, sw, sh, footX - dw / 2, footY - height, dw, height);
}

function drawNamed(
  ctx: CanvasRenderingContext2D,
  name: string,
  footX: number,
  footY: number,
  height: number,
  col = 0,
  row = 0,
) {
  const sheet = art[name];
  if (!sheet) {
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.ellipse(footX, footY - height * 0.45, 14, height * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (sheet.trim && sheet.bbox) {
    const b = sheet.bbox;
    drawImagePart(ctx, sheet, b.x, b.y, b.w, b.h, footX, footY, height);
    return;
  }
  const cw = sheet.img.width / sheet.cols;
  const ch = sheet.img.height / sheet.rows;
  drawImagePart(ctx, sheet, col * cw, row * ch, cw, ch, footX, footY, height);
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size = 13) {
  ctx.font = `600 ${size}px "Source Sans 3", Georgia, sans-serif`;
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(12,8,6,0.88)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function drawWorld(ctx: CanvasRenderingContext2D, m: DrawModel) {
  const { viewW: w, viewH: h } = m;
  ctx.setTransform(m.dpr, 0, 0, m.dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const reduce =
    typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sx = reduce ? 0 : Math.sin(m.time * 40) * m.shake;
  const sy = reduce ? 0 : Math.cos(m.time * 33) * m.shake;
  ctx.save();
  ctx.translate(-m.camX + sx, -m.camY + sy);

  if (patCtx !== ctx) {
    grassPat = pattern(ctx, art.grass);
    dirtPat = pattern(ctx, art.dirt);
    waterPat = pattern(ctx, art.water);
    patCtx = ctx;
  }

  ctx.fillStyle = grassPat ?? "#2c5a32";
  ctx.fillRect(m.camX - 4, m.camY - 4, w + 8, h + 8);

  const x0 = Math.max(0, Math.floor(m.camX / TILE) - 1);
  const y0 = Math.max(0, Math.floor(m.camY / TILE) - 1);
  const x1 = Math.min(COLS - 1, Math.floor((m.camX + w) / TILE) + 1);
  const y1 = Math.min(ROWS - 1, Math.floor((m.camY + h) / TILE) + 1);
  const shift = reduce ? 0 : (m.time * 14) % 256;

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const tile = tiles[y]![x];
      if (tile !== "d" && tile !== "w") continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x * TILE, y * TILE, TILE + 0.5, TILE + 0.5);
      ctx.clip();
      if (tile === "w" && waterPat) {
        ctx.fillStyle = waterPat;
        ctx.translate(0, shift);
        ctx.fillRect(x * TILE, y * TILE - shift, TILE + 0.5, TILE + 0.5 + 40);
      } else if (tile === "d" && dirtPat) {
        ctx.fillStyle = dirtPat;
        ctx.fillRect(x * TILE - 2, y * TILE - 2, TILE + 4, TILE + 4);
      } else {
        ctx.fillStyle = tile === "w" ? "#1c6274" : "#8a5a32";
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
      ctx.restore();
    }
  }

  if (m.click) {
    const p = 1 + Math.sin(m.time * 6) * 0.15;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(m.click.x, m.click.y, 12 * p, 6 * p, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (m.target) {
    ctx.strokeStyle = m.target.hostile ? HURT : HP;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(m.target.x, m.target.y + 2, 18, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  const hidden = new Set(m.herbsHidden);
  type Layer = { y: number; paint: () => void };
  const layers: Layer[] = [];

  for (const p of props) {
    if (p.kind === "herb" && p.id && hidden.has(p.id)) continue;
    layers.push({
      y: p.y,
      paint: () => paintProp(ctx, p),
    });
  }
  for (const s of m.sparkles) {
    layers.push({
      y: s.y,
      paint: () => {
        ctx.strokeStyle = GOLD;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, 8 + Math.sin(m.time * 5) * 2, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      },
    });
  }
  for (const a of m.actors) {
    layers.push({
      y: a.y,
      paint: () => paintActor(ctx, a, m.time),
    });
  }
  layers.sort((a, b) => a.y - b.y);
  for (const layer of layers) layer.paint();

  for (const a of m.actors) {
    if (a.dead && !a.selected) continue;
    if (a.id === "player" && !a.ghost) continue;
    const top = a.y - a.hitH - 8;
    if (a.mark) {
      const bob = Math.sin(m.time * 4 + a.x) * 3;
      label(ctx, a.mark, a.x, top + bob, GOLD, 18);
    }
    const nameY = a.mark ? top + 16 : top;
    label(ctx, a.name, a.x, nameY, a.hostile ? "#f0c2b4" : PARCHMENT, 13);
    if (a.level) label(ctx, String(a.level), a.x + ctx.measureText(a.name).width / 2 + 12, nameY, GOLD, 12);
    if (a.showBar) {
      const bw = 46;
      const by = nameY + 5;
      ctx.fillStyle = INK;
      ctx.fillRect(a.x - bw / 2, by, bw, 5);
      ctx.fillStyle = a.hostile ? HURT : HP;
      ctx.fillRect(a.x - bw / 2, by, bw * Math.max(0, a.hp / a.hpMax), 5);
    }
  }

  for (const f of m.floats) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
    label(ctx, f.text, f.x, f.y, FLOATS[f.color], f.text.length > 12 ? 13 : 15);
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.28, w / 2, h / 2, w * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  if (m.lowHp) {
    ctx.fillStyle = "rgba(120,20,16,0.28)";
    ctx.fillRect(0, 0, w, h);
  }
}

function paintProp(ctx: CanvasRenderingContext2D, p: Prop) {
  if (p.kind === "rock" || p.kind === "herb" || p.kind === "barrel" || p.kind === "grave") {
    const index = { rock: 0, herb: 1, barrel: 2, grave: 3 }[p.kind];
    drawNamed(ctx, "props", p.x, p.y, HEIGHT[p.kind] ?? 70, index % 2, Math.floor(index / 2));
    return;
  }
  drawNamed(ctx, p.kind, p.x, p.y, HEIGHT[p.kind] ?? 80);
}

function paintActor(ctx: CanvasRenderingContext2D, a: DrawActor, time: number) {
  ctx.save();
  const bob = a.sprite === "hero" || a.dead ? 0 : Math.sin(time * 2.2 + a.x) * 1.5;
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(a.x, a.y + 2, a.dead ? 20 : 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  if (a.dead) {
    ctx.translate(a.x, a.y);
    ctx.scale(1.2, 0.42);
    ctx.translate(-a.x, -a.y);
  }
  if (a.ghost) ctx.globalAlpha = 0.5;
  const y = a.y + bob;
  if (a.sprite === "hero") drawNamed(ctx, "hero", a.x, y, HEIGHT.hero ?? 112, a.frame % 4, a.dir);
  else if (a.sprite === "wolf") {
    drawNamed(ctx, "wolf", a.x, y, HEIGHT.wolf ?? 80, a.frame % 2, Math.floor(a.frame / 2) % 2);
  } else drawNamed(ctx, a.sprite, a.x, y, HEIGHT[a.sprite] ?? 100);
  ctx.restore();
}

export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  m: DrawModel,
  player: { x: number; y: number; dir: number } | null,
) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const sx = w / WORLD_W;
  const sy = h / WORLD_H;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const tile = tiles[y]![x]!;
      ctx.fillStyle =
        tile === "w" ? "#1d6478" : tile === "d" ? "#8d6844" : tile === "t" ? "#214828" : tile === "h" ? "#6d5340" : "#356838";
      ctx.fillRect(x * TILE * sx, y * TILE * sy, Math.ceil(TILE * sx), Math.ceil(TILE * sy));
    }
  }
  ctx.fillStyle = HURT;
  for (const a of m.actors) {
    if (!a.hostile || a.dead || a.sprite === "dummy") continue;
    ctx.fillRect(a.x * sx - 1.5, a.y * sy - 1.5, 3, 3);
  }
  ctx.fillStyle = GOLD;
  for (const a of m.actors) {
    if (a.hostile || a.sprite === "hero") continue;
    ctx.fillRect(a.x * sx - 1.5, a.y * sy - 1.5, 3, 3);
  }
  if (player) {
    ctx.save();
    ctx.translate(player.x * sx, player.y * sy);
    const rot = player.dir === 1 ? -Math.PI / 2 : player.dir === 2 ? Math.PI / 2 : player.dir === 3 ? Math.PI : 0;
    ctx.rotate(rot);
    ctx.fillStyle = PARCHMENT;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(-3, -3);
    ctx.lineTo(3, -3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export function drawPortrait(canvas: HTMLCanvasElement, sprite: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#2a1c12";
  ctx.fillRect(0, 0, w, h);
  const sheet = art[sprite];
  if (sheet) {
    if (sheet.trim && sheet.bbox) {
      const b = sheet.bbox;
      const sh = b.h * 0.58;
      ctx.drawImage(sheet.img, b.x, b.y, b.w, sh, 0, 4, w, h);
    } else {
      const cw = sheet.img.width / sheet.cols;
      const ch = sheet.img.height / sheet.rows;
      ctx.drawImage(sheet.img, 0, 0, cw, ch * 0.62, -6, 0, w + 12, h);
    }
  }
  ctx.restore();
}
