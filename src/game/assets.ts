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

const gameSrc = (file: string) => `${import.meta.env.BASE_URL}game/${file}?v=2`;

const SPEC = [
  { name: "hero", src: gameSrc("hero.png"), cols: 4, rows: 4, trim: false },
  { name: "wolf", src: gameSrc("wolf.png"), cols: 2, rows: 2, trim: false },
  { name: "bandit", src: gameSrc("bandit.png"), cols: 1, rows: 1, trim: true },
  { name: "mara", src: gameSrc("mara.png"), cols: 1, rows: 1, trim: true },
  { name: "vendor", src: gameSrc("vendor.png"), cols: 1, rows: 1, trim: true },
  { name: "lira", src: gameSrc("lira.png"), cols: 1, rows: 1, trim: true },
  { name: "trainer", src: gameSrc("trainer.png"), cols: 1, rows: 1, trim: true },
  { name: "tree", src: gameSrc("tree.png"), cols: 1, rows: 1, trim: true },
  { name: "cottage", src: gameSrc("cottage.png"), cols: 1, rows: 1, trim: true },
  { name: "well", src: gameSrc("well.png"), cols: 1, rows: 1, trim: true },
  { name: "dummy", src: gameSrc("dummy.png"), cols: 1, rows: 1, trim: true },
  { name: "fence", src: gameSrc("fence.png"), cols: 1, rows: 1, trim: true },
  { name: "props", src: gameSrc("props.png"), cols: 2, rows: 2, trim: false },
  { name: "icons", src: gameSrc("icons.png"), cols: 4, rows: 3, trim: false },
  { name: "grass", src: gameSrc("tile-grass.jpg"), cols: 1, rows: 1, trim: false },
  { name: "dirt", src: gameSrc("tile-dirt.jpg"), cols: 1, rows: 1, trim: false },
  { name: "water", src: gameSrc("tile-water.jpg"), cols: 1, rows: 1, trim: false },
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
