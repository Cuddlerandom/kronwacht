import { useEffect, useRef } from "react";
import { ITEMS } from "@/game/content";

export function ItemIcon({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 64;
    canvas.height = 64;
    drawItem(ctx, id, 64);
  }, [id]);
  return <canvas ref={ref} className="kw-itemicon" width={64} height={64} aria-hidden />;
}

function drawItem(ctx: CanvasRenderingContext2D, id: string, s: number) {
  const def = ITEMS[id];
  const glow = def?.quality === "uncommon" ? "#7dcea0" : def?.quality === "poor" ? "#8a8278" : "#e4c27a";
  ctx.clearRect(0, 0, s, s);
  ctx.fillStyle = "#241910";
  ctx.beginPath();
  ctx.roundRect(1, 1, s - 2, s - 2, 8);
  ctx.fill();
  const g = ctx.createRadialGradient(s * 0.4, s * 0.35, 2, s * 0.5, s * 0.5, s * 0.6);
  g.addColorStop(0, glow);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);

  if (id === "pelz") hide(ctx);
  else if (id === "schaerpe") sash(ctx);
  else if (id === "reisszahn") tooth(ctx);
  else if (id === "asche") dust(ctx);
  else if (id === "silberblatt") leaf(ctx, "#d5dde8", "#8ea0b4");
  else if (id === "glutkraut") leaf(ctx, "#ff8a2a", "#c4483a");
  else if (id === "wegzehrung") bread(ctx);
  else if (id === "quellwasser") bottle(ctx, "#8eb4ef");
  else if (def?.kind === "chest") tunic(ctx, id === "brandtuch" ? "#c4483a" : "#cbb892");
  else if (id === "stecken" || id === "kiefer" || id === "funkenzweig") staff(ctx, id === "funkenzweig" ? "#ff8a2a" : "#c4a574");
  else if (id === "zepter" || id === "blank" || id === "morgenzepter") mace(ctx, id === "morgenzepter" ? "#f0d48a" : "#d5dde8");
  else sword(ctx, id === "eichenhauer" ? "#7dcea0" : "#d5dde8");
}

function sword(ctx: CanvasRenderingContext2D, color: string) {
  ctx.save();
  ctx.translate(32, 34);
  ctx.rotate(-0.7);
  ctx.fillStyle = color;
  ctx.fillRect(-3, -22, 6, 28);
  ctx.beginPath();
  ctx.moveTo(-5, -22);
  ctx.lineTo(0, -30);
  ctx.lineTo(5, -22);
  ctx.fill();
  ctx.fillStyle = "#e4c27a";
  ctx.fillRect(-10, 6, 20, 4);
  ctx.fillStyle = "#6e5134";
  ctx.fillRect(-2.5, 10, 5, 8);
  ctx.restore();
}

function staff(ctx: CanvasRenderingContext2D, tip: string) {
  ctx.strokeStyle = "#6e5134";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(24, 50);
  ctx.lineTo(40, 14);
  ctx.stroke();
  ctx.fillStyle = tip;
  ctx.beginPath();
  ctx.arc(42, 14, 7, 0, Math.PI * 2);
  ctx.fill();
}

function mace(ctx: CanvasRenderingContext2D, head: string) {
  ctx.strokeStyle = "#6e5134";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(32, 50);
  ctx.lineTo(32, 22);
  ctx.stroke();
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.arc(32, 18, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e4c27a";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function tunic(ctx: CanvasRenderingContext2D, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(20, 16);
  ctx.lineTo(44, 16);
  ctx.lineTo(48, 28);
  ctx.lineTo(40, 28);
  ctx.lineTo(40, 50);
  ctx.lineTo(24, 50);
  ctx.lineTo(24, 28);
  ctx.lineTo(16, 28);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#e4c27a";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function hide(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#8a5a32";
  ctx.beginPath();
  ctx.ellipse(32, 34, 16, 12, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5c3a22";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(22, 30);
  ctx.quadraticCurveTo(32, 40, 42, 28);
  ctx.stroke();
}

function sash(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "#c4483a";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(16, 22);
  ctx.quadraticCurveTo(32, 40, 48, 44);
  ctx.stroke();
}

function tooth(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#f3e6c8";
  ctx.beginPath();
  ctx.moveTo(26, 46);
  ctx.lineTo(32, 14);
  ctx.lineTo(40, 46);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#c9bba4";
  ctx.fillRect(28, 42, 8, 6);
}

function dust(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#6e675c";
  for (const [x, y, r] of [
    [24, 36, 7],
    [34, 32, 9],
    [42, 40, 6],
    [30, 44, 5],
  ] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function leaf(ctx: CanvasRenderingContext2D, fill: string, vein: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(32, 32, 12, 18, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = vein;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, 44);
  ctx.lineTo(40, 20);
  ctx.stroke();
}

function bread(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#c47a45";
  ctx.beginPath();
  ctx.ellipse(32, 34, 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f3e6c8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 34);
  ctx.quadraticCurveTo(32, 26, 44, 34);
  ctx.stroke();
}

function bottle(ctx: CanvasRenderingContext2D, color: string) {
  ctx.fillStyle = "#d5dde8";
  ctx.fillRect(28, 12, 8, 8);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(24, 22, 16, 26, 6);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(27, 26, 3, 14);
}
