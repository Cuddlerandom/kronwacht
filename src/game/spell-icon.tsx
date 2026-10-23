import { useEffect, useRef } from "react";

const GLOW = [
  "#d5dde8",
  "#e4c27a",
  "#e07060",
  "#d8dee8",
  "#ff8a2a",
  "#ff5a1a",
  "#ffb15a",
  "#ff6a22",
  "#ffe38a",
  "#f0d48a",
  "#9ec0f0",
  "#8dcea0",
];

export function SpellIcon({ icon }: { icon: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 64;
    canvas.height = 64;
    drawIcon(ctx, icon, 64);
  }, [icon]);
  return <canvas ref={ref} className="kw-spellicon" width={64} height={64} aria-hidden />;
}

function plate(ctx: CanvasRenderingContext2D, s: number, glow: string) {
  ctx.clearRect(0, 0, s, s);
  ctx.fillStyle = "#241910";
  ctx.beginPath();
  ctx.roundRect(1, 1, s - 2, s - 2, 8);
  ctx.fill();
  const g = ctx.createRadialGradient(s * 0.42, s * 0.38, 2, s * 0.5, s * 0.5, s * 0.62);
  g.addColorStop(0, glow);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
}

function sword(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, rot: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.fillRect(-3, -len / 2, 6, len * 0.72);
  ctx.beginPath();
  ctx.moveTo(-4, -len / 2);
  ctx.lineTo(0, -len / 2 - 8);
  ctx.lineTo(4, -len / 2);
  ctx.fill();
  ctx.fillStyle = "#e4c27a";
  ctx.fillRect(-9, len * 0.22, 18, 5);
  ctx.fillStyle = "#6e5134";
  ctx.fillRect(-3, len * 0.22 + 5, 6, 9);
  ctx.restore();
}

function shield(ctx: CanvasRenderingContext2D, x: number, y: number, fill: string, trim: string) {
  ctx.beginPath();
  ctx.moveTo(x, y - 18);
  ctx.lineTo(x + 16, y - 10);
  ctx.lineTo(x + 14, y + 8);
  ctx.quadraticCurveTo(x, y + 22, x, y + 22);
  ctx.quadraticCurveTo(x, y + 22, x - 14, y + 8);
  ctx.lineTo(x - 16, y - 10);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = trim;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = trim;
  ctx.beginPath();
  ctx.moveTo(x, y - 12);
  ctx.lineTo(x, y + 12);
  ctx.moveTo(x - 8, y - 2);
  ctx.lineTo(x + 8, y - 2);
  ctx.stroke();
}

function orb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, core: string, edge: string) {
  const g = ctx.createRadialGradient(x - 4, y - 5, 2, x, y, r);
  g.addColorStop(0, "#fff4d2");
  g.addColorStop(0.45, core);
  g.addColorStop(1, edge);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function flame(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.bezierCurveTo(x + 14, y - h * 0.4, x + 12, y, x, y + 6);
  ctx.bezierCurveTo(x - 14, y - 2, x - 10, y - h * 0.55, x, y - h);
  ctx.fill();
  ctx.fillStyle = "#ffe38a";
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.35);
  ctx.bezierCurveTo(x + 6, y, x + 4, y + 2, x, y + 2);
  ctx.bezierCurveTo(x - 6, y, x - 4, y - h * 0.1, x, y - h * 0.35);
  ctx.fill();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.42;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawIcon(ctx: CanvasRenderingContext2D, icon: number, s: number) {
  plate(ctx, s, GLOW[icon] ?? "#e4c27a");
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (icon === 0) sword(ctx, 34, 32, 44, -0.75, "#e8eef6");
  else if (icon === 1) shield(ctx, 32, 34, "#c5ced8", "#e4c27a");
  else if (icon === 2) {
    ctx.strokeStyle = "#f0a098";
    ctx.lineWidth = 4;
    for (const r of [10, 16, 22]) {
      ctx.beginPath();
      ctx.arc(24, 34, r, -0.8, 0.8);
      ctx.stroke();
    }
    ctx.fillStyle = "#e4c27a";
    ctx.beginPath();
    ctx.arc(22, 34, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (icon === 3) {
    sword(ctx, 28, 34, 38, -0.95, "#e8eef6");
    sword(ctx, 40, 32, 38, 0.35, "#b7c4d4");
  } else if (icon === 4) orb(ctx, 32, 32, 16, "#ffb15a", "#ff3b12");
  else if (icon === 5) flame(ctx, 32, 42, 26, "#ff6a1a");
  else if (icon === 6) shield(ctx, 32, 34, "#ff8a3a", "#ffe38a");
  else if (icon === 7) {
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      flame(ctx, 32 + Math.cos(a) * 16, 34 + Math.sin(a) * 16, 10, "#ff7a1a");
    }
  } else if (icon === 8) star(ctx, 32, 32, 18, "#ffe38a");
  else if (icon === 9) {
    ctx.strokeStyle = "#ffe38a";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(32, 12);
    ctx.lineTo(22, 34);
    ctx.lineTo(32, 30);
    ctx.lineTo(28, 52);
    ctx.stroke();
  } else if (icon === 10) shield(ctx, 32, 34, "#8eb4ef", "#ffe38a");
  else {
    ctx.strokeStyle = "#8dcea0";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(32, 14);
    ctx.lineTo(32, 50);
    ctx.moveTo(16, 32);
    ctx.lineTo(48, 32);
    ctx.stroke();
  }
}
