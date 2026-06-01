import { useRef, useEffect, useState } from 'react';
import { useCFDStore } from '../../store/cfdStore';
import type { CFDResult, Point } from '../../../shared/types';

function valueToColor(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  const r = t < 0.5 ? t * 2 * 255 : 255;
  const g = t < 0.5 ? t * 2 * 255 : (1 - t) * 2 * 255;
  const b = t < 0.5 ? 255 : (1 - t) * 2 * 255;
  return [Math.round(r), Math.round(g), Math.round(b)];
}

function drawLegend(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
) {
  const imgData = ctx.createImageData(width, height);
  for (let row = 0; row < height; row++) {
    const t = 1 - row / (height - 1);
    const [r, g, b] = valueToColor(t);
    for (let col = 0; col < width; col++) {
      const idx = (row * width + col) * 4;
      imgData.data[idx] = r;
      imgData.data[idx + 1] = g;
      imgData.data[idx + 2] = b;
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, x, y);

  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('1.0', x + width + 4, y + 10);
  ctx.fillText('0.5', x + width + 4, y + height / 2 + 3);
  ctx.fillText('0.0', x + width + 4, y + height);

  ctx.save();
  ctx.translate(x + width + 4, y + height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, -8);
  ctx.restore();
}

function drawRoomOutline(
  ctx: CanvasRenderingContext2D,
  roomPoints: Point[],
  offsetX: number,
  offsetY: number,
  scale: number,
) {
  if (roomPoints.length < 3) return;
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(offsetX + roomPoints[0].x * scale, offsetY + roomPoints[0].y * scale);
  for (let i = 1; i < roomPoints.length; i++) {
    ctx.lineTo(offsetX + roomPoints[i].x * scale, offsetY + roomPoints[i].y * scale);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawVelocityField(
  ctx: CanvasRenderingContext2D,
  result: CFDResult,
  canvasW: number,
  canvasH: number,
  roomPoints: Point[],
) {
  const { nx, ny, u, v, velocity } = result;

  let maxVel = 0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      if (velocity[j][i] > maxVel) maxVel = velocity[j][i];
    }
  }
  if (maxVel === 0) maxVel = 1;

  const padding = 20;
  const legendW = 20;
  const legendGap = 30;
  const drawW = canvasW - padding * 2 - legendW - legendGap;
  const drawH = canvasH - padding * 2;

  const cellW = drawW / nx;
  const cellH = drawH / ny;

  const step = Math.max(1, Math.floor(Math.min(nx, ny) / 40));
  const arrowMaxLen = Math.min(cellW, cellH) * step * 0.8;

  for (let j = 0; j < ny; j += step) {
    for (let i = 0; i < nx; i += step) {
      const cx = padding + (i + 0.5) * cellW;
      const cy = padding + (j + 0.5) * cellH;
      const uVal = u[j][i];
      const vVal = v[j][i];
      const speed = velocity[j][i];
      const angle = Math.atan2(vVal, uVal);
      const len = (speed / maxVel) * arrowMaxLen;

      const t = speed / maxVel;
      const [r, g, b] = valueToColor(t);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.strokeStyle = `rgb(${r},${g},${b})`;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.lineWidth = 1.5;

      const headLen = Math.min(len * 0.3, 6);

      ctx.beginPath();
      ctx.moveTo(-len / 2, 0);
      ctx.lineTo(len / 2 - headLen, 0);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(len / 2, 0);
      ctx.lineTo(len / 2 - headLen, -headLen * 0.5);
      ctx.lineTo(len / 2 - headLen, headLen * 0.5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  const scale = Math.min(drawW, drawH) / 500;
  const xs = roomPoints.map((p) => p.x);
  const ys = roomPoints.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const offsetX = padding - minX * scale;
  const offsetY = padding - minY * scale;
  drawRoomOutline(ctx, roomPoints, offsetX, offsetY, scale);

  drawLegend(ctx, canvasW - padding - legendW, padding, legendW, drawH, '速度');
}

function drawConcentrationField(
  ctx: CanvasRenderingContext2D,
  result: CFDResult,
  canvasW: number,
  canvasH: number,
  roomPoints: Point[],
) {
  const { nx, ny, concentration } = result;
  if (!concentration) return;

  let maxConc = 0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      if (concentration[j][i] > maxConc) maxConc = concentration[j][i];
    }
  }
  if (maxConc === 0) maxConc = 1;

  const padding = 20;
  const legendW = 20;
  const legendGap = 30;
  const drawW = canvasW - padding * 2 - legendW - legendGap;
  const drawH = canvasH - padding * 2;

  const imgData = ctx.createImageData(nx, ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const t = concentration[j][i] / maxConc;
      const [r, g, b] = valueToColor(t);
      const idx = (j * nx + i) * 4;
      imgData.data[idx] = r;
      imgData.data[idx + 1] = g;
      imgData.data[idx + 2] = b;
      imgData.data[idx + 3] = 255;
    }
  }

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = nx;
  tempCanvas.height = ny;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(imgData, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(tempCanvas, padding, padding, drawW, drawH);

  const scale = Math.min(drawW, drawH) / 500;
  const xs = roomPoints.map((p) => p.x);
  const ys = roomPoints.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const offsetX = padding - minX * scale;
  const offsetY = padding - minY * scale;
  drawRoomOutline(ctx, roomPoints, offsetX, offsetY, scale);

  drawLegend(ctx, canvasW - padding - legendW, padding, legendW, drawH, '浓度');
}

export function ResultCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const result = useCFDStore((s) => s.result);
  const showConcentration = useCFDStore((s) => s.showConcentration);
  const roomPoints = useCFDStore((s) => s.roomPoints);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasSize;
    if (width === 0 || height === 0) return;

    ctx.fillStyle = '#0f1626';
    ctx.fillRect(0, 0, width, height);

    if (!result) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('提交计算后查看结果', width / 2, height / 2);
      return;
    }

    if (showConcentration && result.concentration) {
      drawConcentrationField(ctx, result, width, height, roomPoints);
    } else {
      drawVelocityField(ctx, result, width, height, roomPoints);
    }
  }, [canvasSize, result, showConcentration, roomPoints]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="absolute top-0 left-0"
      />
    </div>
  );
}
