export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Sheet {
  img: HTMLImageElement;
  cols: number;
  rows: number;
  trim: boolean;
  bbox: BBox | null;
}

const SPEC = [
  { name: "hero", src: "/game/hero.png?v=2", cols: 4, rows: 4, trim: false },
  { name: "wolf", src: "/game/wolf.png?v=2", cols: 2, rows: 2, trim: false },
  { name: "bandit", src: "/game/bandit.png?v=2", cols: 1, rows: 1, trim: true },
  { name: "mara", src: "/game/mara.png?v=2", cols: 1, rows: 1, trim: true },
  { name: "vendor", src: "/game/vendor.png?v=2", cols: 1, rows: 1, trim: true },
  { name: "lira", src: "/game/lira.png?v=2", cols: 1, rows: 1, trim: true },
  { name: "tree", src: "/game/tree.png?v=2", cols: 1, rows: 1, trim: true },
  { name: "cottage", src: "/game/cottage.png?v=2", cols: 1, rows: 1, trim: true },
  { name: "well", src: "/game/well.png?v=2", cols: 1, rows: 1, trim: true },
  { name: "dummy", src: "/game/dummy.png?v=2", cols: 1, rows: 1, trim: true },
  { name: "fence", src: "/game/fence.png?v=2", cols: 1, rows: 1, trim: true },
  { name: "props", src: "/game/props.png?v=2", cols: 2, rows: 2, trim: false },
  { name: "icons", src: "/game/icons.png?v=2", cols: 4, rows: 3, trim: false },
  { name: "grass", src: "/game/tile-grass.jpg?v=2", cols: 1, rows: 1, trim: false },
  { name: "dirt", src: "/game/tile-dirt.jpg?v=2", cols: 1, rows: 1, trim: false },
  { name: "water", src: "/game/tile-water.jpg?v=2", cols: 1, rows: 1, trim: false },
] as const;

export const art: Record<string, Sheet | null> = {};

function measure(img: HTMLImageElement): BBox | null {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  let minX = c.width;
  let minY = c.height;
  let maxX = 0;
  let maxY = 0;
  let any = false;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const a = data[(y * c.width + x) * 4 + 3] ?? 0;
      if (a < 24) continue;
      any = true;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (!any) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export function loadAssets() {
  return Promise.all(
    SPEC.map(
      (spec) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            art[spec.name] = {
              img,
              cols: spec.cols,
              rows: spec.rows,
              trim: spec.trim,
              bbox: spec.trim ? measure(img) : null,
            };
            resolve();
          };
          img.onerror = () => resolve();
          img.src = spec.src;
        }),
    ),
  );
}

export function readyArt() {
  return Boolean(art.hero && art.icons && art.grass);
}
