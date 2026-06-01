import { useRef, useEffect, useState, useCallback } from 'react';
import { useCFDStore } from '../../store/cfdStore';
import { ParticleTracker } from '../../utils/particleTracker.js';
import type { Point } from '../../../shared/types.js';

export function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const {
    result,
    particles,
    particleSources,
    animation,
    drawingTool,
    addParticleSource,
  } = useCFDStore();

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

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingTool !== 'particle' || !result) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const tracker = new ParticleTracker(result);
    const phys = tracker.canvasToPhysical(cx, cy, canvasSize.width, canvasSize.height);
    addParticleSource(phys);
  }, [drawingTool, result, canvasSize, addParticleSource]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasSize;
    if (width === 0 || height === 0) return;

    ctx.clearRect(0, 0, width, height);

    if (!result) return;

    const tracker = new ParticleTracker(result);

    if (animation.showTrails && particles.length > 0) {
      for (const p of particles) {
        if (p.trail.length < 2) continue;
        const trailLen = p.trail.length;
        for (let i = 1; i < trailLen; i++) {
          const from = tracker.physicalToCanvas(p.trail[i - 1].x, p.trail[i - 1].y, width, height);
          const to = tracker.physicalToCanvas(p.trail[i].x, p.trail[i].y, width, height);
          const alpha = (i / trailLen) * 0.6 * (1 - p.age / p.maxAge);
          ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
        }
      }
    }

    for (const p of particles) {
      const pos = tracker.physicalToCanvas(p.x, p.y, width, height);
      const lifeRatio = 1 - p.age / p.maxAge;
      const radius = 2 + lifeRatio * 2;
      const alpha = lifeRatio * 0.9;

      const conc = result.concentration
        ? tracker.getConcentrationAt(p.x, p.y)
        : 0;
      const maxConc = result.concentration
        ? Math.max(...result.concentration.flat().filter(v => isFinite(v) && v > 0), 0.01)
        : 1;
      const concRatio = Math.min(conc / maxConc, 1);

      const r = Math.round(100 + concRatio * 155);
      const g = Math.round(200 - concRatio * 100);
      const b = Math.round(255 - concRatio * 200);

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius + 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`;
      ctx.fill();
    }

    for (const src of particleSources) {
      const pos = tracker.physicalToCanvas(src.position.x, src.position.y, width, height);

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 200, 50, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 200, 50, 0.6)';
      ctx.fill();

      const pulseRadius = 8 + 4 * Math.sin(animation.time * 3);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 200, 50, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

  }, [canvasSize, result, particles, particleSources, animation]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-auto" style={{ cursor: drawingTool === 'particle' ? 'crosshair' : 'default' }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onClick={handleClick}
        className="absolute top-0 left-0"
      />
    </div>
  );
}
