export const COLS = 32;
export const ROWS = 40;
export const TILE = 48;
export const WORLD_W = COLS * TILE;
export const WORLD_H = ROWS * TILE;

export type Tile = "g" | "d" | "w" | "t" | "h" | "f" | "e" | "r";

const SOLID: Record<Tile, boolean> = {
  g: false,
  d: false,
  w: true,
  t: true,
  h: true,
  f: true,
  e: true,
  r: true,
};

export interface Prop {
  kind: "tree" | "cottage" | "well" | "rock" | "barrel" | "fence" | "grave" | "herb";
  x: number;
  y: number;
  id?: string;
}

export interface Spot {
  id: string;
  name: string;
  x: number;
  y: number;
  sprite: string;
}

function hash(x: number, y: number) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function inside(x: number, y: number) {
  return x >= 0 && y >= 0 && x < COLS && y < ROWS;
}

export function tileCenter(tx: number, ty: number) {
  return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
}

function build() {
  const t: Tile[][] = Array.from({ length: ROWS }, () => Array<Tile>(COLS).fill("g"));
  const set = (x: number, y: number, v: Tile) => {
    if (inside(x, y)) t[y]![x] = v;
  };
  const pave = (x: number, y: number) => {
    if (!inside(x, y) || t[y]![x] === "w") return;
    t[y]![x] = "d";
  };
  const fill = (x: number, y: number, w: number, h: number, v: Tile) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      if (v === "d") pave(i, j);
      else set(i, j, v);
    }
  };

  for (let x = 0; x < COLS; x++) {
    set(x, 0, "t");
    set(x, ROWS - 1, "t");
  }
  for (let y = 0; y < ROWS; y++) {
    set(0, y, "t");
    set(COLS - 1, y, "t");
  }

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const dx = (x + 0.5 - 5.4) / 3.15;
      const dy = (y + 0.5 - 25) / 2.35;
      if (dx * dx + dy * dy <= 1) set(x, y, "w");
    }
  }

  for (let y = 1; y <= 15; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      if (t[y]![x] === "g" && hash(x, y) < 0.2) set(x, y, "t");
    }
  }

  for (let x = 6; x <= 25; x++) if (x !== 15 && x !== 16) set(x, 16, "f");

  for (let y = 4; y <= 36; y++) {
    pave(15, y);
    pave(16, y);
  }
  for (let x = 6; x <= 28; x++) {
    pave(x, 31);
    pave(x, 32);
  }
  fill(13, 28, 6, 6, "d");
  fill(13, 35, 6, 3, "d");
  fill(24, 26, 6, 7, "d");

  fill(9, 26, 3, 2, "h");
  fill(20, 26, 3, 2, "h");
  set(13, 30, "e");
  set(29, 26, "r");
  set(24, 29, "r");

  const clearSpot = (x: number, y: number, r = 1) => {
    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) {
        const tx = x + i;
        const ty = y + j;
        if (!inside(tx, ty)) continue;
        const cur = t[ty]![tx]!;
        if (cur === "t" || cur === "r") t[ty]![tx] = "g";
      }
    }
  };

  for (const [x, y] of WOLF_TILES) clearSpot(x, y, 1);
  for (const [x, y] of HERB_TILES) {
    if (t[y]![x] === "w" || t[y]![x] === "t" || t[y]![x] === "r") set(x, y, "g");
  }
  clearSpot(12, 33, 0);

  const props: Prop[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const tile = t[y]![x]!;
      const fx = (x + 0.5) * TILE;
      const fy = (y + 1) * TILE - 2;
      if (tile === "t") props.push({ kind: "tree", x: fx, y: fy });
      else if (tile === "f") props.push({ kind: "fence", x: fx, y: fy });
      else if (tile === "r") {
        props.push({ kind: y >= 24 && x >= 23 ? "barrel" : "rock", x: fx, y: fy });
      } else if (tile === "e") props.push({ kind: "well", x: fx, y: fy });
    }
  }
  props.push({ kind: "cottage", x: 10.5 * TILE, y: 28 * TILE });
  props.push({ kind: "cottage", x: 21.5 * TILE, y: 28 * TILE });
  props.push({ kind: "grave", x: tileCenter(15, 36).x, y: (36 + 1) * TILE - 2 });
  props.push({ kind: "grave", x: tileCenter(17, 36).x, y: (36 + 1) * TILE - 2, id: "grave" });
  HERB_TILES.forEach(([x, y], i) => {
    props.push({
      kind: "herb",
      x: tileCenter(x, y).x,
      y: (y + 1) * TILE - 6,
      id: `herb-${i}`,
    });
  });

  return { tiles: t, props };
}

export const WOLF_TILES: [number, number][] = [
  [13, 10],
  [18, 9],
  [14, 6],
  [19, 7],
  [12, 13],
  [20, 11],
  [17, 4],
  [10, 8],
];

export const BANDIT_TILES: [number, number][] = [
  [26, 28],
  [28, 27],
  [25, 30],
  [27, 30],
  [28, 31],
  [26, 27],
];

export const HERB_TILES: [number, number][] = [
  [7, 28],
  [4, 21],
  [8, 20],
  [6, 34],
  [10, 34],
];

const built = build();
export const tiles = built.tiles;
export const props = built.props;

export const SPAWN = tileCenter(16, 33);
export const GRAVE = tileCenter(16, 36);

export const NPCS: Spot[] = [
  { id: "mara", name: "Wächterin Mara", sprite: "mara", ...tileCenter(16, 28) },
  { id: "halden", name: "Halden", sprite: "vendor", ...tileCenter(10, 29) },
  { id: "lira", name: "Heilerin Lira", sprite: "lira", ...tileCenter(21, 29) },
  { id: "bronn", name: "Klassenlehrer Bronn", sprite: "trainer", ...tileCenter(18, 32) },
];

export const DUMMY = { ...tileCenter(12, 33), id: "dummy", name: "Übungspuppe" };

export function isSolidTile(tx: number, ty: number) {
  if (!inside(tx, ty)) return true;
  return SOLID[tiles[ty]![tx]!];
}

export function tileAt(x: number, y: number) {
  return { tx: Math.floor(x / TILE), ty: Math.floor(y / TILE) };
}

export function canStand(x: number, y: number, radius = 10) {
  return (
    !isSolidTile(Math.floor(x / TILE), Math.floor(y / TILE)) &&
    !isSolidTile(Math.floor((x - radius) / TILE), Math.floor(y / TILE)) &&
    !isSolidTile(Math.floor((x + radius) / TILE), Math.floor(y / TILE)) &&
    !isSolidTile(Math.floor(x / TILE), Math.floor((y - radius) / TILE)) &&
    !isSolidTile(Math.floor(x / TILE), Math.floor((y + radius) / TILE))
  );
}

export function nearestWalkable(x: number, y: number) {
  const start = tileAt(x, y);
  if (!isSolidTile(start.tx, start.ty)) {
    const c = tileCenter(start.tx, start.ty);
    if (canStand(c.x, c.y)) return c;
  }
  for (let r = 1; r < 8; r++) {
    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) {
        if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue;
        const tx = start.tx + i;
        const ty = start.ty + j;
        if (isSolidTile(tx, ty)) continue;
        const c = tileCenter(tx, ty);
        if (canStand(c.x, c.y)) return c;
      }
    }
  }
  return { ...SPAWN };
}

function key(x: number, y: number) {
  return y * COLS + x;
}

export function findPath(x0: number, y0: number, x1: number, y1: number) {
  const s = tileAt(x0, y0);
  const g = tileAt(x1, y1);
  const goal = isSolidTile(g.tx, g.ty) ? tileAt(nearestWalkable(x1, y1).x, nearestWalkable(x1, y1).y) : g;
  if (isSolidTile(s.tx, s.ty)) return null;
  if (s.tx === goal.tx && s.ty === goal.ty) return [tileCenter(goal.tx, goal.ty)];

  const open: { x: number; y: number; f: number }[] = [{ x: s.tx, y: s.ty, f: 0 }];
  const gScore = new Map<number, number>([[key(s.tx, s.ty), 0]]);
  const came = new Map<number, number>();
  const seen = new Set<number>();
  const dirs = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, 1.41],
    [1, -1, 1.41],
    [-1, 1, 1.41],
    [-1, -1, 1.41],
  ] as const;

  let guard = 0;
  while (open.length && guard++ < 1400) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    const ck = key(cur.x, cur.y);
    if (seen.has(ck)) continue;
    seen.add(ck);
    if (cur.x === goal.tx && cur.y === goal.ty) {
      const path: { x: number; y: number }[] = [];
      let k = ck;
      while (came.has(k)) {
        const x = k % COLS;
        const y = (k - x) / COLS;
        path.push(tileCenter(x, y));
        k = came.get(k)!;
      }
      path.reverse();
      return path;
    }
    for (const [dx, dy, cost] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (isSolidTile(nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (isSolidTile(cur.x + dx, cur.y) || isSolidTile(cur.x, cur.y + dy))) continue;
      const nk = key(nx, ny);
      const ng = (gScore.get(ck) ?? 0) + cost;
      if (ng >= (gScore.get(nk) ?? 1e9)) continue;
      gScore.set(nk, ng);
      came.set(nk, ck);
      const h = Math.max(Math.abs(goal.tx - nx), Math.abs(goal.ty - ny));
      open.push({ x: nx, y: ny, f: ng + h });
    }
  }
  return null;
}

export function lineClear(x0: number, y0: number, x1: number, y1: number) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / 14));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    if (!canStand(x, y, 8)) return false;
  }
  return true;
}

export function zoneName(x: number, y: number) {
  const tx = x / TILE;
  const ty = y / TILE;
  if (ty >= 34.2) return "Friedhof von Lindenhain";
  if (tx >= 23.5 && ty >= 25 && ty <= 33.5) return "Ostrand";
  if (tx <= 11 && ty >= 18 && ty <= 34) return "Silberteich";
  if (ty <= 16.2) return "Dornwald";
  return "Lindenhain";
}

export function validateWorld() {
  const errors: string[] = [];
  const points: [string, number, number][] = [
    ["spawn", SPAWN.x, SPAWN.y],
    ["grave", GRAVE.x, GRAVE.y],
    ["dummy", DUMMY.x, DUMMY.y],
    ...NPCS.map((n) => [n.id, n.x, n.y] as [string, number, number]),
    ...WOLF_TILES.map(([x, y], i) => [`wolf${i}`, tileCenter(x, y).x, tileCenter(x, y).y] as [string, number, number]),
    ...BANDIT_TILES.map(([x, y], i) => [`bandit${i}`, tileCenter(x, y).x, tileCenter(x, y).y] as [string, number, number]),
    ...HERB_TILES.map(([x, y], i) => [`herb${i}`, tileCenter(x, y).x, tileCenter(x, y).y] as [string, number, number]),
  ];
  for (const [name, x, y] of points) {
    if (!canStand(x, y)) errors.push(`${name} blocked`);
    const path = findPath(SPAWN.x, SPAWN.y, x, y);
    if (!path) errors.push(`no path ${name}`);
  }
  return errors;
}
