import { readyArt } from "@/game/assets";
import { sfx, setMuted } from "@/game/audio";
import {
  GREEN_WEAPON,
  ITEMS,
  QUESTS,
  SPEC_META,
  SPEC_SPELLS,
  STARTER_WEAPON,
  WHITE_WEAPON,
  armorOf,
  maxHp,
  maxResource,
  spellPower,
  weaponDamage,
  xpToNext,
  type ItemDef,
  type QuestDef,
  type Spec,
  type SpellDef,
} from "@/game/content";
import type { DrawActor, DrawFloat, DrawModel } from "@/game/render";
import {
  BANDIT_TILES,
  DUMMY,
  GRAVE,
  HERB_TILES,
  NPCS,
  SPAWN,
  WOLF_TILES,
  canStand,
  findPath,
  lineClear,
  nearestWalkable,
  tileCenter,
  zoneName,
} from "@/game/world";

export type Panel = null | "bag" | "char" | "quest" | "vendor" | "dialog" | "loot" | "death";
type QuestId = QuestDef["id"];
type QStore = Partial<Record<QuestId, "active" | "done">>;

export interface HudSpell {
  name: string;
  icon: number;
  cd: number;
  cdMax: number;
  gcd: number;
  cost: number;
  oom: boolean;
  desc: string;
  ready: boolean;
}

export interface Hud {
  phase: "title" | "play";
  hasSave: boolean;
  savedName: string;
  art: boolean;
  name: string;
  spec: Spec;
  specName: string;
  resourceName: string;
  level: number;
  hp: number;
  hpMax: number;
  rp: number;
  rpMax: number;
  xp: number;
  xpMax: number;
  gold: number;
  inCombat: boolean;
  dead: boolean;
  ghost: boolean;
  lowHp: boolean;
  casting: { name: string; pct: number } | null;
  target: null | {
    name: string;
    level: number;
    hp: number;
    hpMax: number;
    hostile: boolean;
    sprite: string;
  };
  spells: HudSpell[];
  tracker: { title: string; lines: string[]; ready: boolean }[];
  log: { text: string; kind: string }[];
  panel: Panel;
  dialog: null | { name: string; text: string; buttons: { id: string; label: string }[] };
  bag: ({ name: string; qty: number; quality: string; desc: string; kind: string } | null)[];
  weapon: string | null;
  chest: string | null;
  stats: { dmg: string; power: string; armor: number; speed: string };
  loot: null | { name: string; gold: number; items: { name: string; qty: number; quality: string }[] };
  wares: { id: string; name: string; price: number; quality: string }[];
  banner: string | null;
  hint: boolean;
  sound: boolean;
  zone: string;
}

interface BagStack {
  id: string;
  qty: number;
}
interface Mob {
  id: string;
  name: string;
  kind: "wolf" | "bandit" | "dummy";
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hp: number;
  hpMax: number;
  level: number;
  dmg0: number;
  dmg1: number;
  speed: number;
  aggroR: number;
  xp: number;
  swing: number;
  attack: number;
  dead: boolean;
  respawn: number;
  evade: number;
  flash: number;
  moving: boolean;
  wander: number;
  wx: number;
  wy: number;
}
interface Corpse {
  id: string;
  name: string;
  x: number;
  y: number;
  gold: number;
  items: BagStack[];
  ttl: number;
}
interface Cast {
  spell: SpellDef;
  t: number;
  dur: number;
  cost: number;
  targetId: string | null;
}

const SAVE_KEY = "kronwacht-save-v1";
const listeners = new Set<() => void>();

let phase: "title" | "play" = "title";
let hasSave = false;
let savedName = "";
let name = "Aren";
let spec: Spec = "klinge";
let level = 1;
let xp = 0;
let hp = 60;
let rp = 30;
let gold = 0;
let px = SPAWN.x;
let py = SPAWN.y;
let dir = 0;
let frame = 0;
let anim = 0;
let weaponId: string | null = "stumpf";
let chestId: string | null = null;
let bag: (BagStack | null)[] = Array.from({ length: 16 }, () => null);
let quests: QStore = {};
let kills = { wolf: 0, bandit: 0 };
let dead = false;
let ghost = false;
let hint = true;
let soundOn = true;
let toldFreeKill = false;

let panel: Panel = null;
let dialogNpc: string | null = null;
let dialogMode: "root" | "offer" | "progress" | "turnin" = "root";
let dialogQuest: QuestId | null = null;
let lootId: string | null = null;

let mobs: Mob[] = [];
let corpses: Corpse[] = [];
let herbs: { id: string; x: number; y: number; down: number }[] = [];
let targetId: string | null = null;
let attackId: string | null = null;
let chase: { kind: "talk" | "gather" | "loot"; id: string } | null = null;
let path: { x: number; y: number }[] = [];
let click: { x: number; y: number } | null = null;
let pending: number | null = null;
let casting: Cast | null = null;
let gcd = 0;
let cds: Record<string, number> = {};
let swing = 0;
let combat = 0;
let absorb = 0;
let armorBuff = 0;
let dmgBuff = 0;
let dot: { id: string; target: string; left: number; tick: number; amount: number } | null = null;
let hotLeft = 0;
let hotTick = 0;
let hotAmt = 0;
let potionCd = 0;
let immune = 0;
let floats: (DrawFloat & { vy: number })[] = [];
let log: { text: string; kind: string }[] = [];
let banner: string | null = null;
let bannerT = 0;
let zone = "Lindenhain";
let time = 0;
let hintT = 0;
let saveT = 0;
let dirty = false;
let hudT = 0;
let viewW = 400;
let viewH = 700;
let dpr = 1;
let camX = SPAWN.x - 200;
let camY = SPAWN.y - 280;
let shake = 0;
let lastSpeed = 0;
let stickX = 0;
let stickY = 0;
let held = new Set<string>();
let qa: Set<string> | null = null;
let artOn = false;

let hud: Hud = blankHud();

function blankHud(): Hud {
  return {
    phase: "title",
    hasSave: false,
    savedName: "",
    art: false,
    name: "Aren",
    spec: "klinge",
    specName: "Klinge",
    resourceName: "Wut",
    level: 1,
    hp: 1,
    hpMax: 1,
    rp: 0,
    rpMax: 100,
    xp: 0,
    xpMax: 55,
    gold: 0,
    inCombat: false,
    dead: false,
    ghost: false,
    lowHp: false,
    casting: null,
    target: null,
    spells: [],
    tracker: [],
    log: [],
    panel: null,
    dialog: null,
    bag: Array.from({ length: 16 }, () => null),
    weapon: null,
    chest: null,
    stats: { dmg: "1", power: "1", armor: 0, speed: "2.0s" },
    loot: null,
    wares: [],
    banner: null,
    hint: false,
    sound: true,
    zone: "Lindenhain",
  };
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function getHud() {
  return hud;
}
function publish() {
  hud = buildHud();
  listeners.forEach((fn) => fn());
}

function item(id: string | null): ItemDef | null {
  return id ? (ITEMS[id] ?? null) : null;
}
function hpMax() {
  return maxHp(level, spec);
}
function rpMax() {
  return maxResource(level, spec);
}
function dist(x: number, y: number) {
  return Math.hypot(x - px, y - py);
}
function say(text: string, kind = "sys") {
  log.unshift({ text, kind });
  if (log.length > 30) log.length = 30;
}
function pop(text: string, x: number, y: number, color: DrawFloat["color"]) {
  floats.push({ text, x, y: y - 64, color, life: 1.05, vy: -36 });
  if (floats.length > 24) floats.shift();
}
function popSelf(text: string, color: DrawFloat["color"]) {
  pop(text, px, py, color);
}
function markDirty() {
  dirty = true;
}

function countItem(id: string) {
  return bag.reduce((n, s) => n + (s?.id === id ? s.qty : 0), 0);
}
function addItem(id: string, qty: number) {
  const max = ITEMS[id]?.stack ?? 1;
  let left = qty;
  for (const s of bag) {
    if (!s || s.id !== id || s.qty >= max) continue;
    const put = Math.min(max - s.qty, left);
    s.qty += put;
    left -= put;
  }
  while (left > 0) {
    const slot = bag.findIndex((s) => !s);
    if (slot < 0) return left;
    const put = Math.min(max, left);
    bag[slot] = { id, qty: put };
    left -= put;
  }
  return 0;
}
function removeItem(id: string, qty: number) {
  let left = qty;
  for (let i = 0; i < bag.length && left > 0; i++) {
    const s = bag[i];
    if (!s || s.id !== id) continue;
    const take = Math.min(s.qty, left);
    s.qty -= take;
    left -= take;
    if (s.qty <= 0) bag[i] = null;
  }
}

function questBy(id: string) {
  return QUESTS.find((q) => q.id === id)!;
}
function met(q: QuestDef) {
  if (q.id === "wolves") return kills.wolf >= q.count;
  if (q.id === "bandits") return kills.bandit >= q.count;
  return countItem("silberblatt") >= q.count;
}
function qState(id: QuestId): "locked" | "available" | "active" | "ready" | "done" {
  const q = questBy(id);
  if (quests[id] === "done") return "done";
  if (q.requires && quests[q.requires] !== "done") return "locked";
  if (quests[id] === "active") return met(q) ? "ready" : "active";
  return "available";
}
function markFor(npc: string): "!" | "?" | null {
  let bang = false;
  for (const q of QUESTS) {
    if (q.giver !== npc) continue;
    const s = qState(q.id);
    if (s === "ready") return "?";
    if (s === "available") bang = true;
  }
  return bang ? "!" : null;
}

function powerBase(spell: SpellDef) {
  const w = item(weaponId);
  if (spec === "klinge" && (spell.shape === "strike" || spell.shape === "aoe")) return weaponDamage(level, w);
  return spellPower(level, w);
}
function estimate(spell: SpellDef) {
  if (spell.id === "schildwall") return "erleidest weniger Schaden";
  if (spell.id === "kampfschrei") return "dein Schaden steigt";
  const n = Math.round(powerBase(spell) * spell.coef);
  if (spell.shape === "heal" || spell.shape === "hot") return `etwa ${n} Heilung`;
  if (spell.shape === "shield") return `etwa ${n} Schild`;
  return `etwa ${n} Schaden`;
}

function spawnMobs() {
  mobs = [
    ...WOLF_TILES.map(([tx, ty], i) => makeMob(`wolf-${i}`, "Dornenwolf", "wolf", tx, ty, 46, 4, 6, 108, 126, 26, 2, 1.75)),
    ...BANDIT_TILES.map(([tx, ty], i) => makeMob(`bandit-${i}`, "Rotschärpe", "bandit", tx, ty, 88, 6, 9, 94, 148, 46, 4, 1.95)),
    makeMob("dummy", "Übungspuppe", "dummy", 12, 33, 500, 0, 0, 0, 0, 0, 1, 9),
  ];
  herbs = HERB_TILES.map(([tx, ty], i) => ({ id: `herb-${i}`, ...tileCenter(tx, ty), down: 0 }));
  corpses = [];
}
function makeMob(
  id: string,
  name: string,
  kind: Mob["kind"],
  tx: number,
  ty: number,
  hp0: number,
  d0: number,
  d1: number,
  speed: number,
  aggroR: number,
  xp0: number,
  lv: number,
  attack: number,
): Mob {
  const c = tileCenter(tx, ty);
  return {
    id,
    name,
    kind,
    x: c.x,
    y: c.y,
    homeX: c.x,
    homeY: c.y,
    hp: hp0,
    hpMax: hp0,
    level: lv,
    dmg0: d0,
    dmg1: d1,
    speed,
    aggroR: aggroR,
    xp: xp0,
    swing: Math.random(),
    attack,
    dead: false,
    respawn: 0,
    evade: 0,
    flash: 0,
    moving: false,
    wander: 1 + Math.random() * 2,
    wx: c.x,
    wy: c.y,
  };
}

function freshPlayer(nextName: string, nextSpec: Spec) {
  name = nextName.trim().slice(0, 16) || "Aren";
  spec = nextSpec;
  level = 1;
  xp = 0;
  weaponId = STARTER_WEAPON[spec];
  chestId = null;
  bag = Array.from({ length: 16 }, () => null);
  quests = {};
  kills = { wolf: 0, bandit: 0 };
  gold = 0;
  hp = hpMax();
  rp = spec === "klinge" ? 30 : rpMax();
  dead = false;
  ghost = false;
  hint = true;
  hintT = 0;
  toldFreeKill = false;
  px = SPAWN.x;
  py = SPAWN.y;
  dir = 3;
  resetCombat();
  log = [];
  say("Lindenhain. Die Straße hält, solange jemand sie geht.", "say");
  enterZone(zoneName(px, py), true);
}

function resetCombat() {
  targetId = null;
  attackId = null;
  chase = null;
  path = [];
  click = null;
  pending = null;
  casting = null;
  gcd = 0;
  cds = {};
  swing = 0;
  combat = 0;
  absorb = 0;
  armorBuff = 0;
  dmgBuff = 0;
  dot = null;
  hotLeft = 0;
  panel = null;
  dialogNpc = null;
}

function enterZone(next: string, force = false) {
  if (!force && next === zone) return;
  zone = next;
  banner = next;
  bannerT = 2.3;
}

export function boot() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const p = JSON.parse(raw) as { v?: number; name?: string };
    if (p.v !== 1 || typeof p.name !== "string") return;
    hasSave = true;
    savedName = p.name;
  } catch {
    hasSave = false;
  }
  publish();
}

export function noteArt() {
  artOn = readyArt();
  publish();
}

export function setView(w: number, h: number, ratio: number) {
  viewW = w;
  viewH = h;
  dpr = ratio;
}
export function setStick(x: number, y: number) {
  stickX = x;
  stickY = y;
}
export function setHeld(keys: Set<string>) {
  held = keys;
}
export function setQAKeys(codes: string[]) {
  qa = codes.length ? new Set(codes) : null;
}
export function getX() {
  return px;
}
export function getY() {
  return py;
}
export function getSpeed() {
  return lastSpeed;
}
export function getYaw() {
  return dir === 1 ? 1 : dir === 2 ? -1 : 0;
}

export function newGame(nextName: string, nextSpec: Spec) {
  freshPlayer(nextName, nextSpec);
  spawnMobs();
  phase = "play";
  sfx.ui();
  saveNow();
  publish();
}

export function continueGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const p = JSON.parse(raw) as SaveFile;
    if (p.v !== 1) return;
    applySave(p);
    spawnMobs();
    if (!canStand(px, py)) {
      px = SPAWN.x;
      py = SPAWN.y;
    }
    if (dead || ghost) {
      dead = false;
      ghost = false;
      hp = Math.round(hpMax() * 0.6);
      px = GRAVE.x;
      py = GRAVE.y;
    }
    phase = "play";
    enterZone(zoneName(px, py), true);
    publish();
  } catch {
    say("Der alte Weg ist unleserlich.", "bad");
  }
}

export function abandon() {
  localStorage.removeItem(SAVE_KEY);
  hasSave = false;
  savedName = "";
  phase = "title";
  publish();
}

export function leave() {
  saveNow();
  phase = "title";
  panel = null;
  publish();
}

interface SaveFile {
  v: 1;
  name: string;
  spec: Spec;
  level: number;
  xp: number;
  hp: number;
  rp: number;
  gold: number;
  x: number;
  y: number;
  bag: (BagStack | null)[];
  weapon: string | null;
  chest: string | null;
  quests: QStore;
  kills: { wolf: number; bandit: number };
  dead: boolean;
  ghost: boolean;
  hint: boolean;
  sound: boolean;
}

function snapshot(): SaveFile {
  return {
    v: 1,
    name,
    spec,
    level,
    xp,
    hp,
    rp,
    gold,
    x: px,
    y: py,
    bag,
    weapon: weaponId,
    chest: chestId,
    quests,
    kills,
    dead,
    ghost,
    hint,
    sound: soundOn,
  };
}
function applySave(p: SaveFile) {
  name = p.name;
  spec = p.spec === "flamme" || p.spec === "licht" ? p.spec : "klinge";
  level = p.level || 1;
  xp = p.xp || 0;
  hp = p.hp;
  rp = p.rp;
  gold = p.gold || 0;
  px = p.x;
  py = p.y;
  weaponId = p.weapon;
  chestId = p.chest;
  bag = Array.from({ length: 16 }, (_, i) => p.bag?.[i] ?? null);
  quests = p.quests ?? {};
  kills = p.kills ?? { wolf: 0, bandit: 0 };
  dead = Boolean(p.dead);
  ghost = Boolean(p.ghost);
  hint = p.hint !== false;
  soundOn = p.sound !== false;
  setMuted(!soundOn);
  hp = Math.min(hpMax(), Math.max(0, hp));
  rp = Math.min(rpMax(), Math.max(0, rp));
  savedName = name;
  hasSave = true;
}
function saveNow() {
  if (phase !== "play") return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot()));
    hasSave = true;
    savedName = name;
    dirty = false;
  } catch {
    /* ignore quota */
  }
}

function moveToward(tx: number, ty: number, dt: number, speed: number) {
  const dx = tx - px;
  const dy = ty - py;
  const d = Math.hypot(dx, dy) || 1;
  const step = Math.min(d, speed * dt);
  const nx = px + (dx / d) * step;
  const ny = py + (dy / d) * step;
  if (canStand(nx, py)) px = nx;
  if (canStand(px, ny)) py = ny;
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dir = face(dx, dy);
  return d;
}
function face(dx: number, dy: number) {
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 1 : 2;
  return dy < 0 ? 3 : 0;
}
function steerVec() {
  const src = qa ?? held;
  let x = 0;
  let y = 0;
  if (src.has("KeyA") || src.has("ArrowLeft")) x -= 1;
  if (src.has("KeyD") || src.has("ArrowRight")) x += 1;
  if (src.has("KeyW") || src.has("ArrowUp")) y -= 1;
  if (src.has("KeyS") || src.has("ArrowDown")) y += 1;
  x += stickX;
  y += stickY;
  const mag = Math.hypot(x, y);
  if (mag > 1) {
    x /= mag;
    y /= mag;
  }
  return { x, y, mag: Math.min(1, mag) };
}

function mobBy(id: string | null) {
  return id ? (mobs.find((m) => m.id === id) ?? null) : null;
}
function npcBy(id: string | null) {
  return id ? (NPCS.find((n) => n.id === id) ?? null) : null;
}

export function clickWorld(x: number, y: number) {
  if (phase !== "play" || dead) return;
  if (panel && panel !== "death") panel = null;
  const actor = pickActor(x, y);
  if (actor) {
    if (actor.kind === "npc") {
      targetId = actor.id;
      attackId = null;
      pending = null;
      chase = { kind: "talk", id: actor.id };
      path = [];
      publish();
      return;
    }
    targetId = actor.id;
    if (!ghost && actor.kind !== "friendly") {
      attackId = actor.id;
      chase = null;
      pending = null;
    }
    publish();
    return;
  }
  const herb = herbs.find((h) => h.down <= 0 && Math.hypot(h.x - x, h.y - y) < 36);
  if (herb && !ghost) {
    chase = { kind: "gather", id: herb.id };
    attackId = null;
    path = [];
    publish();
    return;
  }
  const corpse = corpses.find((c) => Math.hypot(c.x - x, c.y - y) < 36);
  if (corpse) {
    chase = { kind: "loot", id: corpse.id };
    path = [];
    publish();
    return;
  }
  if (ghost && dist(GRAVE.x, GRAVE.y) < 70 && Math.hypot(x - GRAVE.x, y - GRAVE.y) < 50) {
    rez();
    return;
  }
  attackId = null;
  pending = null;
  chase = null;
  const dest = nearestWalkable(x, y);
  path = findPath(px, py, dest.x, dest.y) ?? [];
  click = path.length ? (path[path.length - 1] ?? dest) : dest;
  if (!path.length && dist(dest.x, dest.y) > 20) popSelf("Dahin führt kein Weg", "info");
  publish();
}

function pickActor(x: number, y: number) {
  let best: { id: string; kind: "npc" | "mob" | "friendly"; d: number } | null = null;
  for (const n of NPCS) {
    if (x < n.x - 36 || x > n.x + 36 || y < n.y - 100 || y > n.y + 14) continue;
    const d = Math.hypot(n.x - x, n.y - y);
    if (!best || d < best.d) best = { id: n.id, kind: "npc", d };
  }
  for (const m of mobs) {
    if (m.dead) continue;
    const h = m.kind === "dummy" ? 100 : 78;
    if (x < m.x - 36 || x > m.x + 36 || y < m.y - h || y > m.y + 14) continue;
    const d = Math.hypot(m.x - x, m.y - y);
    if (!best || d < best.d) best = { id: m.id, kind: "mob", d };
  }
  return best;
}

export function tabTarget() {
  const list = mobs.filter((m) => !m.dead && m.kind !== "dummy" && dist(m.x, m.y) < 460);
  if (!list.length) return;
  list.sort((a, b) => dist(a.x, a.y) - dist(b.x, b.y));
  const idx = list.findIndex((m) => m.id === targetId);
  const next = list[(idx + 1) % list.length]!;
  targetId = next.id;
  publish();
}

export function interactNearest() {
  let best: { d: number; run: () => void } | null = null;
  for (const n of NPCS) {
    const d = dist(n.x, n.y);
    if (d < 280 && (!best || d < best.d)) best = { d, run: () => clickWorld(n.x, n.y - 20) };
  }
  if (best && best.d < 70) best.run();
  else if (best) best.run();
}

export function pressSpell(index: number) {
  if (phase !== "play" || dead || ghost) {
    if (ghost) popSelf("Als Geist geht das nicht", "info");
    return;
  }
  const spell = SPEC_SPELLS[spec][index];
  if (!spell) return;
  if ((cds[spell.id] ?? 0) > 0 || gcd > 0) {
    popSelf("Noch nicht bereit", "info");
    return;
  }
  if (rp < spell.cost) {
    popSelf(spec === "klinge" ? "Nicht genug Wut" : "Nicht genug Mana", "mana");
    return;
  }
  if (spell.range > 0) {
    const tgt = mobBy(targetId);
    if (!tgt || tgt.dead) {
      popSelf("Kein Ziel", "info");
      return;
    }
    if (dist(tgt.x, tgt.y) > spell.range) {
      pending = index;
      attackId = tgt.id;
      chase = null;
      path = [];
      return;
    }
  }
  beginSpell(spell, spell.range > 0 ? targetId : null);
}

function beginSpell(spell: SpellDef, target: string | null) {
  if (rp < spell.cost) return;
  rp -= spell.cost;
  cds[spell.id] = spell.cd;
  gcd = Math.max(1, spell.cast || 0.9);
  pending = null;
  if (spell.cast > 0) {
    casting = { spell, t: 0, dur: spell.cast, cost: spell.cost, targetId: target };
    path = [];
    chase = null;
    click = null;
    publish();
    return;
  }
  resolveSpell(spell, target);
  publish();
}

function resolveSpell(spell: SpellDef, target: string | null) {
  sfx.spell();
  if (spell.id === "schildwall") {
    armorBuff = spell.duration ?? 8;
    popSelf("Schildwall", "info");
    return;
  }
  if (spell.id === "kampfschrei") {
    dmgBuff = spell.duration ?? 10;
    popSelf("Kampfschrei", "gold");
    return;
  }
  if (spell.shape === "heal") {
    const n = roll(powerBase(spell) * spell.coef);
    hp = Math.min(hpMax(), hp + n);
    popSelf(`+${n}`, "heal");
    sfx.heal();
    return;
  }
  if (spell.shape === "hot") {
    hotLeft = spell.duration ?? 8;
    hotTick = 0;
    hotAmt = Math.max(1, Math.round((powerBase(spell) * spell.coef) / (spell.duration ?? 8)));
    popSelf("Erquickung", "heal");
    return;
  }
  if (spell.shape === "shield") {
    absorb = Math.round(powerBase(spell) * spell.coef);
    popSelf(`Schild ${absorb}`, "mana");
    return;
  }
  if (spell.shape === "nova") {
    const hits = mobs.filter((m) => !m.dead && m.kind !== "dummy" ? dist(m.x, m.y) < (spell.radius ?? 110) : !m.dead && dist(m.x, m.y) < (spell.radius ?? 110));
    const list = mobs.filter((m) => !m.dead && dist(m.x, m.y) <= (spell.radius ?? 110));
    if (!list.length) popSelf("Verfehlt", "info");
    for (const m of list) hurtMob(m, roll(powerBase(spell) * spell.coef), false);
    combat = 5;
    return;
  }
  const tgt = mobBy(target);
  if (!tgt || tgt.dead) {
    popSelf("Ziel verloren", "info");
    rp = Math.min(rpMax(), rp + spell.cost);
    return;
  }
  faceTarget(tgt.x, tgt.y);
  if (spell.shape === "dot") {
    const total = powerBase(spell) * spell.coef;
    const dur = spell.duration ?? 8;
    dot = { id: spell.id, target: tgt.id, left: dur, tick: 0.2, amount: Math.max(1, Math.round(total / dur)) };
    pop("Versengt", tgt.x, tgt.y, "gold");
    combat = 5;
    return;
  }
  const list =
    spell.shape === "aoe"
      ? mobs.filter((m) => !m.dead && Math.hypot(m.x - tgt.x, m.y - tgt.y) <= (spell.radius ?? 70))
      : [tgt];
  for (const m of list) hurtMob(m, roll(powerBase(spell) * spell.coef * (m === tgt ? 1 : 0.85)), true);
  combat = 5;
}

function roll(n: number) {
  return Math.max(1, Math.round(n * (0.92 + Math.random() * 0.16)));
}
function faceTarget(x: number, y: number) {
  dir = face(x - px, y - py);
}

function hurtMob(m: Mob, amount: number, canCrit: boolean) {
  if (m.dead) return;
  const miss = Math.random() < Math.min(0.3, Math.max(0.04, 0.05 + (m.level - level) * 0.03));
  if (miss) {
    pop("Verfehlt", m.x, m.y, "info");
    return;
  }
  let dmg = amount * (dmgBuff > 0 ? 1.25 : 1);
  const crit = canCrit && Math.random() < (spec === "klinge" ? 0.12 : 0.08);
  if (crit) dmg *= 1.55;
  dmg = Math.max(1, Math.round(dmg));
  m.hp -= dmg;
  m.flash = 0.12;
  pop(crit ? `${dmg}!` : String(dmg), m.x, m.y - (crit ? 10 : 0), crit ? "gold" : "info");
  sfx.hit();
  combat = 5;
  if (m.kind !== "dummy") m.evade = 0;
  if (m.hp <= 0) {
    if (m.kind === "dummy") {
      m.hp = m.hpMax;
      pop("Steht wieder", m.x, m.y - 20, "info");
      return;
    }
    killMob(m);
  }
}

function killMob(m: Mob) {
  m.dead = true;
  m.hp = 0;
  m.respawn = 26;
  if (dot?.target === m.id) dot = null;
  const xpGain = xpFor(m);
  if (m.kind === "wolf" && quests.wolves === "active") {
    kills.wolf += 1;
    say(`Dornenwolf ${Math.min(kills.wolf, 6)}/6`, "good");
  } else if (m.kind === "wolf" && !toldFreeKill) {
    toldFreeKill = true;
    say("Ohne Auftrag zählt der Wolf nicht.", "sys");
  }
  if (m.kind === "bandit" && quests.bandits === "active") {
    kills.bandit += 1;
    say(`Rotschärpe ${Math.min(kills.bandit, 5)}/5`, "good");
  }
  if (xpGain > 0) addXp(xpGain);
  const loot = rollLoot(m);
  corpses.push({ id: m.id, name: m.name, x: m.x, y: m.y, gold: loot.gold, items: loot.items, ttl: 50 });
  if (dist(m.x, m.y) < 120) openLoot(m.id);
  if (attackId === m.id) attackId = null;
  markDirty();
}

function xpFor(m: Mob) {
  const d = m.level - level;
  if (d <= -5) return 0;
  if (d <= -3) return Math.round(m.xp * 0.35);
  if (d >= 3) return Math.round(m.xp * 1.15);
  return m.xp;
}
function rollLoot(m: Mob) {
  const items: BagStack[] = [];
  let g = 0;
  if (m.kind === "wolf") {
    g = 3 + Math.floor(Math.random() * 8);
    if (Math.random() < 0.6) items.push({ id: "pelz", qty: 1 });
  } else if (m.kind === "bandit") {
    g = 8 + Math.floor(Math.random() * 14);
    if (Math.random() < 0.55) items.push({ id: "schaerpe", qty: 1 });
    if (Math.random() < 0.12) items.push({ id: GREEN_WEAPON[spec], qty: 1 });
  }
  return { gold: g, items };
}
function addXp(n: number) {
  xp += n;
  say(`Erfahrung: ${n}`, "good");
  let up = false;
  while (level < 20 && xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level += 1;
    up = true;
  }
  if (up) {
    hp = hpMax();
    rp = rpMax();
    say(`Stufe auf! Du bist jetzt Stufe ${level}.`, "good");
    popSelf(`Stufe ${level}`, "gold");
    sfx.level();
  }
  markDirty();
}

function openLoot(id: string) {
  const c = corpses.find((corpse) => corpse.id === id);
  if (!c) return;
  if (dist(c.x, c.y) > 80) {
    chase = { kind: "loot", id };
    return;
  }
  panel = "loot";
  lootId = id;
  dialogNpc = null;
  publish();
}
export function takeLoot() {
  const open = corpses.find((corpse) => corpse.id === lootId);
  if (!open) {
    panel = null;
    lootId = null;
    publish();
    return;
  }
  if (open.gold) {
    gold += open.gold;
    say(`Plündern: ${open.gold} Kupfer`, "loot");
    sfx.coin();
    open.gold = 0;
  }
  const left: BagStack[] = [];
  for (const it of open.items) {
    const remain = addItem(it.id, it.qty);
    if (remain > 0) left.push({ id: it.id, qty: remain });
    else say(ITEMS[it.id]?.name ?? it.id, "loot");
  }
  open.items = left;
  if (left.length) say("Der Beutel ist voll.", "bad");
  if (!open.items.length && !open.gold) {
    corpses = corpses.filter((corpse) => corpse !== open);
    lootId = null;
    panel = null;
  } else panel = "loot";
  markDirty();
  publish();
}

function damagePlayer(raw: number, from: Mob) {
  if (dead || ghost || immune > 0) return;
  if (Math.random() < Math.min(0.25, Math.max(0.04, 0.05 + (level - from.level) * 0.02))) {
    popSelf("Ausgewichen", "info");
    return;
  }
  let dmg = raw;
  if (armorBuff > 0) dmg *= 0.55;
  const armor = armorOf(level, item(chestId), spec);
  dmg *= 1 - Math.min(0.5, armor / (armor + 85));
  dmg = Math.max(1, Math.round(dmg));
  if (absorb > 0) {
    const used = Math.min(absorb, dmg);
    absorb -= used;
    dmg -= used;
  }
  if (dmg <= 0) {
    popSelf("Geblockt", "mana");
    return;
  }
  hp -= dmg;
  shake = 5;
  popSelf(`-${dmg}`, "hurt");
  sfx.hurt();
  combat = 5;
  if (hp <= 0) die();
}
function die() {
  hp = 0;
  dead = true;
  ghost = false;
  casting = null;
  pending = null;
  attackId = null;
  chase = null;
  path = [];
  panel = "death";
  for (const m of mobs) m.evade = 0.4;
  sfx.death();
  say("Du bist gefallen.", "bad");
  markDirty();
  publish();
}
export function release() {
  if (!dead) return;
  dead = false;
  ghost = true;
  hp = 1;
  px = GRAVE.x;
  py = GRAVE.y;
  panel = null;
  say("Dein Geist findet den Friedhof im Süden.", "say");
  enterZone(zoneName(px, py), true);
  markDirty();
  publish();
}
export function rez() {
  if (!ghost) return;
  if (dist(GRAVE.x, GRAVE.y) > 100) {
    say("Der Stein auf dem Friedhof ruft dich.", "sys");
    return;
  }
  ghost = false;
  dead = false;
  hp = Math.round(hpMax() * 0.55);
  rp = Math.round(rpMax() * (spec === "klinge" ? 0.3 : 0.55));
  immune = 2.6;
  sfx.heal();
  say("Die Wacht nimmt dich zurück.", "good");
  markDirty();
  publish();
}

export function togglePanel(next: Panel) {
  if (dead) return;
  panel = panel === next ? null : next;
  if (panel !== "dialog") dialogNpc = null;
  sfx.ui();
  publish();
}
export function closePanel() {
  if (panel === "death") return;
  panel = null;
  dialogNpc = null;
  publish();
}
export function toggleSound() {
  soundOn = !soundOn;
  setMuted(!soundOn);
  markDirty();
  publish();
}

export function dialogClick(id: string) {
  if (id === "bye" || id === "back") {
    if (id === "back") dialogMode = "root";
    else {
      panel = null;
      dialogNpc = null;
    }
    publish();
    return;
  }
  if (id === "gossip" && dialogNpc) {
    say(`${npcBy(dialogNpc)?.name ?? ""}: ${gossipLine(dialogNpc)}`, "say");
    dialogMode = "root";
    publish();
    return;
  }
  if (id === "trade") {
    panel = "vendor";
    dialogNpc = null;
    publish();
    return;
  }
  const [kind, qid] = id.split(":") as [string, QuestId];
  const q = QUESTS.find((quest) => quest.id === qid);
  if (!q) return;
  if (kind === "offer") {
    dialogMode = "offer";
    dialogQuest = q.id;
  } else if (kind === "progress") {
    dialogMode = "progress";
    dialogQuest = q.id;
  } else if (kind === "turnin") {
    dialogMode = "turnin";
    dialogQuest = q.id;
  } else if (kind === "accept") {
    quests[q.id] = "active";
    say(`Auftrag angenommen: ${q.title}`, "good");
    sfx.quest();
    dialogMode = "root";
    hint = false;
    markDirty();
  } else if (kind === "confirm") {
    finishQuest(q);
    dialogMode = "root";
  }
  publish();
}

function gossipLine(id: string) {
  if (id === "mara") return "Ich halte diese Straße, seit das alte Tor schwieg. Kronwacht ist kein Reich mehr, nur ein Versprechen zwischen den Eichen.";
  if (id === "halden") return "Brot, Wasser, Stahl. Was die Wacht braucht, liegt in der Kiste.";
  return "Komm, bevor das Blut die Entscheidung trifft.";
}

function finishQuest(q: QuestDef) {
  if (qState(q.id) !== "ready") return;
  if (q.id === "herbs") removeItem("silberblatt", 4);
  quests[q.id] = "done";
  gold += q.gold;
  addXp(q.xp);
  if (q.id === "herbs") {
    const left = addItem("leinenwams", 1);
    if (left) say("Kein Platz für das Wams.", "bad");
  }
  if (q.id === "bandits") {
    const left = addItem(GREEN_WEAPON[spec], 1);
    if (left) say("Kein Platz für die Waffe.", "bad");
    else say(`${ITEMS[GREEN_WEAPON[spec]]?.name} liegt im Beutel.`, "loot");
  }
  say(q.done, "say");
  sfx.quest();
  sfx.coin();
  markDirty();
}

function openDialog(id: string) {
  dialogNpc = id;
  dialogMode = "root";
  dialogQuest = null;
  panel = "dialog";
  chase = null;
  path = [];
  click = null;
  const npc = npcBy(id);
  if (npc) say(`${npc.name} sieht dich an.`, "say");
  publish();
}

export function buy(id: string) {
  const price = id === WHITE_WEAPON[spec] ? 180 : 35;
  const def = ITEMS[id];
  if (!def || gold < price) {
    say("Zu wenig Kupfer.", "bad");
    publish();
    return;
  }
  if (addItem(id, 1) > 0) {
    say("Der Beutel ist voll.", "bad");
    publish();
    return;
  }
  gold -= price;
  sfx.coin();
  markDirty();
  publish();
}
export function sellSlot(index: number) {
  const s = bag[index];
  if (!s) return;
  const def = ITEMS[s.id];
  if (!def || def.sell <= 0) {
    say("Das kauft niemand.", "bad");
    publish();
    return;
  }
  gold += def.sell * s.qty;
  bag[index] = null;
  sfx.coin();
  markDirty();
  publish();
}
export function useSlot(index: number) {
  const s = bag[index];
  if (!s) return;
  const def = ITEMS[s.id];
  if (!def) return;
  if (def.kind === "weapon" || def.kind === "chest") {
    if (def.spec && def.spec !== spec) {
      say("Das liegt dir nicht.", "bad");
      publish();
      return;
    }
    const prev = def.kind === "weapon" ? weaponId : chestId;
    if (def.kind === "weapon") weaponId = def.id;
    else chestId = def.id;
    bag[index] = prev ? { id: prev, qty: 1 } : null;
    sfx.ui();
    markDirty();
    publish();
    return;
  }
  if (def.kind !== "potion") return;
  if (potionCd > 0 || dead || ghost) {
    popSelf("Zu früh", "info");
    return;
  }
  if (def.heal) hp = Math.min(hpMax(), hp + Math.round(hpMax() * def.heal));
  if (def.resource) {
    if (spec === "klinge") rp = Math.min(rpMax(), rp + 40);
    else rp = Math.min(rpMax(), rp + Math.round(rpMax() * def.resource));
  }
  s.qty -= 1;
  if (s.qty <= 0) bag[index] = null;
  potionCd = 18;
  sfx.heal();
  popSelf(def.name, "heal");
  markDirty();
  publish();
}

function tryGather(id: string) {
  const herb = herbs.find((h) => h.id === id && h.down <= 0);
  if (!herb) {
    chase = null;
    return;
  }
  if (dist(herb.x, herb.y) > 48) return;
  if (addItem("silberblatt", 1) > 0) {
    say("Der Beutel ist voll.", "bad");
    chase = null;
    return;
  }
  herb.down = 28;
  chase = null;
  sfx.quest();
  say(`Silberblatt ${countItem("silberblatt")}/4`, "good");
  pop("Silberblatt", herb.x, herb.y, "heal");
  markDirty();
}

function doAuto() {
  const tgt = mobBy(attackId);
  if (!tgt || tgt.dead) {
    attackId = null;
    return;
  }
  faceTarget(tgt.x, tgt.y);
  const w = item(weaponId);
  const base = spec === "klinge" ? weaponDamage(level, w) : spellPower(level, w) * 0.55;
  hurtMob(tgt, roll(base), true);
  if (spec === "klinge") rp = Math.min(rpMax(), rp + 8);
  sfx.hit();
}

function separateMobs(dt: number) {
  for (let i = 0; i < mobs.length; i++) {
    for (let j = i + 1; j < mobs.length; j++) {
      const a = mobs[i]!;
      const b = mobs[j]!;
      if (a.dead || b.dead) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d > 28 || d < 0.1) continue;
      const push = ((28 - d) / 28) * 40 * dt;
      const ux = dx / d;
      const uy = dy / d;
      if (canStand(a.x - ux * push, a.y)) a.x -= ux * push;
      if (canStand(a.x, a.y - uy * push)) a.y -= uy * push;
      if (canStand(b.x + ux * push, b.y)) b.x += ux * push;
      if (canStand(b.x, b.y + uy * push)) b.y += uy * push;
    }
  }
}

function updateMob(m: Mob, dt: number) {
  m.flash = Math.max(0, m.flash - dt);
  if (m.dead) {
    m.respawn -= dt;
    m.moving = false;
    if (m.respawn <= 0) {
      m.dead = false;
      m.hp = m.hpMax;
      m.x = m.homeX;
      m.y = m.homeY;
      m.evade = 1.2;
      corpses = corpses.filter((c) => c.id !== m.id);
    }
    return;
  }
  if (m.kind === "dummy") {
    if (m.hp < m.hpMax) {
      m.wander -= dt;
      if (m.wander <= 0) {
        m.hp = m.hpMax;
        m.wander = 4;
      }
    }
    return;
  }
  if (m.evade > 0) {
    m.evade -= dt;
    m.moving = moveMob(m, m.homeX, m.homeY, dt, m.speed * 1.3);
    if (Math.hypot(m.x - m.homeX, m.y - m.homeY) < 8) {
      m.hp = m.hpMax;
      m.evade = 0;
    }
    return;
  }
  const d = dist(m.x, m.y);
  const homeD = Math.hypot(m.x - m.homeX, m.y - m.homeY);
  const wants = !ghost && !dead && d < m.aggroR && homeD < 340;
  if (wants || (attackId === m.id && d < 200 && homeD < 360)) {
    if (d > 46) m.moving = moveMob(m, px, py, dt, m.speed);
    else {
      m.moving = false;
      m.swing -= dt;
      if (m.swing <= 0) {
        m.swing = m.attack;
        const raw = m.dmg0 + Math.random() * (m.dmg1 - m.dmg0);
        damagePlayer(raw, m);
      }
    }
    if (homeD > 360) m.evade = 0.2;
    return;
  }
  m.wander -= dt;
  if (m.wander <= 0) {
    m.wander = 2.4 + Math.random() * 2.5;
    const ang = Math.random() * Math.PI * 2;
    m.wx = m.homeX + Math.cos(ang) * 36;
    m.wy = m.homeY + Math.sin(ang) * 36;
  }
  m.moving = moveMob(m, m.wx, m.wy, dt, 42);
}

function moveMob(m: Mob, tx: number, ty: number, dt: number, speed: number) {
  const dx = tx - m.x;
  const dy = ty - m.y;
  const d = Math.hypot(dx, dy);
  if (d < 6) return false;
  const step = Math.min(d, speed * dt);
  const nx = m.x + (dx / d) * step;
  const ny = m.y + (dy / d) * step;
  if (canStand(nx, m.y, 8)) m.x = nx;
  if (canStand(m.x, ny, 8)) m.y = ny;
  return true;
}

export function tick(dt: number) {
  time += dt;
  for (const f of floats) {
    f.life -= dt;
    f.y += f.vy * dt;
  }
  floats = floats.filter((f) => f.life > 0);
  shake = Math.max(0, shake - dt * 18);
  if (bannerT > 0) {
    bannerT -= dt;
    if (bannerT <= 0) banner = null;
  }

  const camGoalX = px - viewW / 2;
  const camGoalY = py - viewH * 0.58;
  const follow = phase === "play" ? 1 - Math.exp(-dt * 8) : 1;
  camX += (Math.max(0, Math.min(WORLD_SAFE_W(), camGoalX)) - camX) * follow;
  camY += (Math.max(0, Math.min(WORLD_SAFE_H(), camGoalY)) - camY) * follow;

  if (phase !== "play") return;

  if (hint) {
    hintT += dt;
    if (hintT > 16) hint = false;
  }
  if (dirty) {
    saveT += dt;
    if (saveT > 2) {
      saveNow();
      saveT = 0;
    }
  }

  gcd = Math.max(0, gcd - dt);
  potionCd = Math.max(0, potionCd - dt);
  immune = Math.max(0, immune - dt);
  armorBuff = Math.max(0, armorBuff - dt);
  dmgBuff = Math.max(0, dmgBuff - dt);
  for (const id of Object.keys(cds)) cds[id] = Math.max(0, (cds[id] ?? 0) - dt);

  if (hotLeft > 0 && !dead && !ghost) {
    hotLeft -= dt;
    hotTick -= dt;
    if (hotTick <= 0) {
      hotTick = 1;
      hp = Math.min(hpMax(), hp + hotAmt);
      popSelf(`+${hotAmt}`, "heal");
    }
  }
  if (dot && !dead) {
    const tgt = mobBy(dot.target);
    if (!tgt || tgt.dead) dot = null;
    else {
      dot.left -= dt;
      dot.tick -= dt;
      if (dot.tick <= 0) {
        dot.tick = 1;
        hurtMob(tgt, dot.amount, false);
      }
      if (dot && dot.left <= 0) dot = null;
    }
  }

  const steer = steerVec();
  lastSpeed = 0;
  if (!dead) {
    if (casting) {
      if (steer.mag > 0.2 || ghost) {
        rp = Math.min(rpMax(), rp + casting.cost);
        casting = null;
        popSelf("Unterbrochen", "info");
      } else {
        casting.t += dt;
        const tgt = mobBy(casting.targetId);
        if (tgt) faceTarget(tgt.x, tgt.y);
        if (casting.t >= casting.dur) {
          const done = casting;
          casting = null;
          resolveSpell(done.spell, done.targetId);
        }
      }
    } else if (steer.mag > 0.2 && !ghostIsLocked()) {
      path = [];
      click = null;
      chase = null;
      pending = null;
      const step = 158 * steer.mag * dt;
      const nx = px + steer.x * step;
      const ny = py + steer.y * step;
      if (canStand(nx, py)) px = nx;
      if (canStand(px, ny)) py = ny;
      dir = face(steer.x, steer.y);
      lastSpeed = 158 * steer.mag;
      anim += dt;
      frame = Math.floor(anim * 8) % 4;
      if (panel && panel !== "death") panel = null;
    } else {
      let moved = false;
      const tgt = mobBy(attackId);
      if (pending != null && tgt && !tgt.dead && !ghost) {
        const spell = SPEC_SPELLS[spec][pending];
        if (spell && dist(tgt.x, tgt.y) <= spell.range) beginSpell(spell, tgt.id);
        else moved = chasePoint(tgt.x, tgt.y, dt);
      } else if (chase?.kind === "talk") {
        const n = npcBy(chase.id);
        if (!n) chase = null;
        else if (dist(n.x, n.y) < 62) openDialog(n.id);
        else moved = chasePoint(n.x, n.y, dt);
      } else if (chase?.kind === "gather") {
        const h = herbs.find((herb) => herb.id === chase?.id);
        if (!h || h.down > 0) chase = null;
        else if (dist(h.x, h.y) < 42) tryGather(h.id);
        else moved = chasePoint(h.x, h.y, dt);
      } else if (chase?.kind === "loot") {
        const c = corpses.find((corpse) => corpse.id === chase?.id);
        if (!c) chase = null;
        else if (dist(c.x, c.y) < 56) openLoot(c.id);
        else moved = chasePoint(c.x, c.y, dt);
      } else if (tgt && attackId && !tgt.dead && dist(tgt.x, tgt.y) > 54) {
        moved = chasePoint(tgt.x, tgt.y, dt);
      } else if (path.length) {
        const wp = path[0]!;
        if (dist(wp.x, wp.y) < 10) path.shift();
        else moved = chasePoint(wp.x, wp.y, dt);
        if (!path.length) click = null;
      }
      if (!moved) frame = 0;
    }
  }

  if (attackId && !dead && !ghost && !casting) {
    const tgt = mobBy(attackId);
    if (!tgt || tgt.dead) attackId = null;
    else {
      swing -= dt;
      if (dist(tgt.x, tgt.y) <= 56 && swing <= 0) {
        doAuto();
        swing = spec === "klinge" ? 2 : 2.15;
      }
    }
  }

  if (!dead && !ghost && combat <= 0) {
    hp = Math.min(hpMax(), hp + hpMax() * 0.04 * dt);
    if (spec === "klinge") rp = Math.max(0, rp - 7 * dt);
    else rp = Math.min(rpMax(), rp + rpMax() * 0.08 * dt);
  } else combat = Math.max(0, combat - dt);

  for (const m of mobs) updateMob(m, dt);
  separateMobs(dt);
  for (const h of herbs) if (h.down > 0) h.down -= dt;
  corpses = corpses.filter((c) => {
    c.ttl -= dt;
    return c.ttl > 0;
  });

  enterZone(zoneName(px, py));

  hudT += dt;
  if (hudT > 0.12) {
    hudT = 0;
    publish();
  }
}

function ghostIsLocked() {
  return false;
}
function chasePoint(x: number, y: number, dt: number) {
  const speed = ghost ? 170 : 156;
  if (lineClear(px, py, x, y)) {
    const before = dist(x, y);
    moveToward(x, y, dt, speed);
    const after = dist(x, y);
    lastSpeed = speed;
    anim += dt;
    frame = Math.floor(anim * 8) % 4;
    return after < before - 0.2;
  }
  if (!path.length || dist(path[path.length - 1]!.x, path[path.length - 1]!.y) > 24) {
    path = findPath(px, py, x, y) ?? [];
  }
  const wp = path[0];
  if (!wp) {
    moveToward(x, y, dt, speed * 0.85);
  } else if (dist(wp.x, wp.y) < 10) path.shift();
  else moveToward(wp.x, wp.y, dt, speed);
  lastSpeed = speed;
  anim += dt;
  frame = Math.floor(anim * 8) % 4;
  return true;
}

function WORLD_SAFE_W() {
  return Math.max(0, 32 * 48 - viewW);
}
function WORLD_SAFE_H() {
  return Math.max(0, 40 * 48 - viewH);
}

export function drawModel(): DrawModel {
  const actors: DrawActor[] = [];
  const selected = targetId;
  actors.push({
    id: "player",
    sprite: "hero",
    x: px,
    y: py,
    dir,
    frame,
    name: ghost ? `${name} (Geist)` : name,
    hp,
    hpMax: hpMax(),
    hostile: false,
    dead: false,
    ghost,
    showBar: false,
    mark: null,
    selected: false,
    hitH: 100,
  });
  for (const n of NPCS) {
    actors.push({
      id: n.id,
      sprite: n.sprite,
      x: n.x,
      y: n.y,
      dir: 0,
      frame: 0,
      name: n.name,
      hp: 1,
      hpMax: 1,
      hostile: false,
      dead: false,
      showBar: false,
      mark: markFor(n.id === "halden" ? "" : n.id === "mara" ? "mara" : "lira"),
      selected: selected === n.id,
      hitH: 108,
    });
  }
  for (const m of mobs) {
    const sprite = m.kind === "wolf" ? "wolf" : m.kind === "bandit" ? "bandit" : "dummy";
    actors.push({
      id: m.id,
      sprite,
      x: m.x,
      y: m.y,
      dir: 0,
      frame: m.moving ? Math.floor(time * 6) % 4 : 0,
      name: m.name,
      level: m.kind === "dummy" ? undefined : m.level,
      hp: m.hp,
      hpMax: m.hpMax,
      hostile: m.kind !== "dummy" ? true : true,
      dead: m.dead,
      showBar: selected === m.id || (m.hp < m.hpMax && !m.dead),
      mark: null,
      selected: selected === m.id,
      hitH: m.kind === "dummy" ? 96 : 78,
    });
  }
  const tgt = mobBy(targetId) ?? null;
  const npc = npcBy(targetId);
  return {
    camX,
    camY,
    viewW,
    viewH,
    dpr,
    time,
    shake,
    actors,
    herbsHidden: herbs.filter((h) => h.down > 0).map((h) => h.id),
    click,
    floats,
    target: tgt
      ? { x: tgt.x, y: tgt.y, hostile: true }
      : npc
        ? { x: npc.x, y: npc.y, hostile: false }
        : null,
    lowHp: !dead && !ghost && hp / hpMax() < 0.28,
    sparkles: corpses.map((c) => ({ x: c.x, y: c.y })),
  };
}

export function playerPoint() {
  return { x: px, y: py, dir };
}
export function portraitSprite() {
  const m = mobBy(targetId);
  if (m) return m.kind === "wolf" ? "wolf" : m.kind === "bandit" ? "bandit" : "dummy";
  const n = npcBy(targetId);
  if (n) return n.sprite;
  return "";
}

function buildHud(): Hud {
  const meta = SPEC_META[spec];
  const wpn = item(weaponId);
  const spells = (phase === "play" ? SPEC_SPELLS[spec] : []).map((spell) => {
    const cd = cds[spell.id] ?? 0;
    return {
      name: spell.name,
      icon: spell.icon,
      cd,
      cdMax: Math.max(spell.cd, 1),
      gcd,
      cost: spell.cost,
      oom: rp < spell.cost,
      desc: `${spell.blurb} ${estimate(spell)}. ${spell.cast ? `${spell.cast.toFixed(1)}s Zauber. ` : ""}${spell.cost ? `${spell.cost} ${meta.resource}.` : ""}`,
      ready: cd <= 0 && gcd <= 0 && rp >= spell.cost,
    };
  });
  const tracker = QUESTS.filter((q) => quests[q.id] === "active").map((q) => {
    const have = q.id === "wolves" ? kills.wolf : q.id === "bandits" ? kills.bandit : countItem("silberblatt");
    const ready = met(q);
    const who = q.giver === "mara" ? "Mara" : "Lira";
    return {
      title: q.title,
      ready,
      lines: ready ? [`Zurück zu ${who}`] : [`${q.objective}: ${Math.min(have, q.count)}/${q.count}`],
    };
  });
  if (!tracker.length && phase === "play") {
    tracker.push({ title: "Lindenhain", ready: false, lines: ["Such das gelbe !"] });
  }
  const tgt = mobBy(targetId);
  const npc = npcBy(targetId);
  const openCorpse = panel === "loot" ? corpses.find((c) => c.id === lootId) : null;
  return {
    phase,
    hasSave,
    savedName,
    art: artOn,
    name,
    spec,
    specName: meta.name,
    resourceName: meta.resource,
    level,
    hp: Math.round(hp),
    hpMax: hpMax(),
    rp: Math.round(rp),
    rpMax: rpMax(),
    xp,
    xpMax: xpToNext(level),
    gold,
    inCombat: combat > 0,
    dead,
    ghost,
    lowHp: hp / hpMax() < 0.28,
    casting: casting ? { name: casting.spell.name, pct: Math.min(1, casting.t / casting.dur) } : null,
    target: tgt
      ? { name: tgt.name, level: tgt.level, hp: Math.max(0, Math.round(tgt.hp)), hpMax: tgt.hpMax, hostile: tgt.kind !== "dummy", sprite: tgt.kind }
      : npc
        ? { name: npc.name, level: 0, hp: 1, hpMax: 1, hostile: false, sprite: npc.sprite }
        : null,
    spells,
    tracker,
    log: log.slice(0, 6),
    panel,
    dialog: dialogView(),
    bag: bag.map((s) =>
      s && ITEMS[s.id]
        ? { name: ITEMS[s.id]!.name, qty: s.qty, quality: ITEMS[s.id]!.quality, desc: ITEMS[s.id]!.desc, kind: ITEMS[s.id]!.kind }
        : null,
    ),
    weapon: wpn?.name ?? null,
    chest: item(chestId)?.name ?? null,
    stats: {
      dmg: `${Math.round(weaponDamage(level, wpn))}`,
      power: `${Math.round(spellPower(level, wpn))}`,
      armor: armorOf(level, item(chestId), spec),
      speed: spec === "klinge" ? "2.0s" : "2.2s",
    },
    loot: openCorpse
      ? {
          name: openCorpse.name,
          gold: openCorpse.gold,
          items: openCorpse.items.map((it) => ({
            name: ITEMS[it.id]?.name ?? it.id,
            qty: it.qty,
            quality: ITEMS[it.id]?.quality ?? "common",
          })),
        }
      : null,
    wares: [
      { id: "wegzehrung", name: "Wegzehrung", price: 35, quality: "common" },
      { id: "quellwasser", name: "Quellwasser", price: 35, quality: "common" },
      {
        id: WHITE_WEAPON[spec],
        name: ITEMS[WHITE_WEAPON[spec]]?.name ?? "Waffe",
        price: 180,
        quality: "common",
      },
    ],
    banner,
    hint: hint && phase === "play",
    sound: soundOn,
    zone,
  };
}

function dialogView(): Hud["dialog"] {
  if (panel !== "dialog" || !dialogNpc) return null;
  const npc = npcBy(dialogNpc);
  const title = npc?.name ?? "";
  if (dialogMode !== "root" && dialogQuest) {
    const q = questBy(dialogQuest);
    if (dialogMode === "offer") {
      return { name: title, text: q.offer, buttons: [{ id: `accept:${q.id}`, label: "Annehmen" }, { id: "back", label: "Zurück" }] };
    }
    if (dialogMode === "turnin") {
      return {
        name: title,
        text: q.done,
        buttons: [
          { id: `confirm:${q.id}`, label: "Belohnung nehmen" },
          { id: "back", label: "Zurück" },
        ],
      };
    }
    return { name: title, text: q.progress, buttons: [{ id: "back", label: "Zurück" }] };
  }
  const buttons: { id: string; label: string }[] = [];
  for (const q of QUESTS) {
    if (q.giver !== dialogNpc) continue;
    const s = qState(q.id);
    if (s === "ready") buttons.push({ id: `turnin:${q.id}`, label: `Abgeben: ${q.title}` });
    else if (s === "available") buttons.push({ id: `offer:${q.id}`, label: q.title });
    else if (s === "active") buttons.push({ id: `progress:${q.id}`, label: q.title });
  }
  if (dialogNpc === "halden") buttons.push({ id: "trade", label: "Handel" });
  buttons.push({ id: "gossip", label: "Wer bist du?" });
  buttons.push({ id: "bye", label: "Leb wohl" });
  return { name: title, text: "Die Straße ist ruhig, bis sie es nicht mehr ist.", buttons };
}
