import type { CFDResult, Point, Particle, ParticleSource } from '../../shared/types.js';

export class ParticleTracker {
  private result: CFDResult;
  private nx: number;
  private ny: number;
  private dx: number;
  private xMin: number;
  private xMax: number;
  private yMin: number;
  private yMax: number;

  constructor(result: CFDResult) {
    this.result = result;
    this.nx = result.nx;
    this.ny = result.ny;
    this.dx = result.dx;
    this.xMin = result.x[0];
    this.xMax = result.x[result.x.length - 1];
    this.yMin = result.y[0];
    this.yMax = result.y[result.y.length - 1];
  }

  bilinearInterpolate(px: number, py: number, field: number[][]): number {
    const fx = (px - this.xMin) / this.dx;
    const fy = (py - this.yMin) / this.dx;

    const i0 = Math.floor(fx);
    const j0 = Math.floor(fy);
    const i1 = i0 + 1;
    const j1 = j0 + 1;

    if (i0 < 0 || i1 >= this.nx || j0 < 0 || j1 >= this.ny) {
      return 0;
    }

    const tx = fx - i0;
    const ty = fy - j0;

    const v00 = field[j0][i0];
    const v10 = field[j0][i1];
    const v01 = field[j1][i0];
    const v11 = field[j1][i1];

    return v00 * (1 - tx) * (1 - ty) + v10 * tx * (1 - ty) + v01 * (1 - tx) * ty + v11 * tx * ty;
  }

  getVelocity(px: number, py: number): Point {
    const u = this.bilinearInterpolate(px, py, this.result.u);
    const v = this.bilinearInterpolate(px, py, this.result.v);
    return { x: u, y: v };
  }

  isInsideDomain(px: number, py: number): boolean {
    return px >= this.xMin && px <= this.xMax && py >= this.yMin && py <= this.yMax;
  }

  advectRK4(px: number, py: number, dt: number): Point {
    const k1 = this.getVelocity(px, py);
    const k2 = this.getVelocity(px + 0.5 * dt * k1.x, py + 0.5 * dt * k1.y);
    const k3 = this.getVelocity(px + 0.5 * dt * k2.x, py + 0.5 * dt * k2.y);
    const k4 = this.getVelocity(px + dt * k3.x, py + dt * k3.y);

    return {
      x: px + (dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
      y: py + (dt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
    };
  }

  emitParticles(sources: ParticleSource[], maxLifetime: number): Particle[] {
    const particles: Particle[] = [];
    for (const src of sources) {
      const count = Math.max(1, Math.round(src.rate));
      for (let i = 0; i < count; i++) {
        const offset = {
          x: (Math.random() - 0.5) * this.dx * 2,
          y: (Math.random() - 0.5) * this.dx * 2,
        };
        particles.push({
          x: src.position.x + offset.x,
          y: src.position.y + offset.y,
          age: 0,
          maxAge: maxLifetime + (Math.random() - 0.5) * maxLifetime * 0.3,
          trail: [{ x: src.position.x + offset.x, y: src.position.y + offset.y }],
        });
      }
    }
    return particles;
  }

  stepParticles(particles: Particle[], dt: number, maxTrailLen: number): Particle[] {
    const alive: Particle[] = [];
    for (const p of particles) {
      p.age += dt;
      if (p.age >= p.maxAge) continue;

      const next = this.advectRK4(p.x, p.y, dt);
      if (!this.isInsideDomain(next.x, next.y)) continue;

      const vel = this.getVelocity(next.x, next.y);
      const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
      if (speed < 1e-12) continue;

      p.x = next.x;
      p.y = next.y;
      p.trail.push({ x: next.x, y: next.y });
      if (p.trail.length > maxTrailLen) {
        p.trail = p.trail.slice(p.trail.length - maxTrailLen);
      }
      alive.push(p);
    }
    return alive;
  }

  canvasToPhysical(cx: number, cy: number, canvasW: number, canvasH: number): Point {
    const scaleX = (canvasW - 100) / (this.nx * this.dx);
    const scaleY = (canvasH - 100) / (this.ny * this.dx);
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (canvasW - this.nx * this.dx * scale) / 2;
    const offsetY = (canvasH - this.ny * this.dx * scale) / 2;
    return {
      x: (cx - offsetX) / scale,
      y: (cy - offsetY) / scale,
    };
  }

  physicalToCanvas(px: number, py: number, canvasW: number, canvasH: number): Point {
    const scaleX = (canvasW - 100) / (this.nx * this.dx);
    const scaleY = (canvasH - 100) / (this.ny * this.dx);
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (canvasW - this.nx * this.dx * scale) / 2;
    const offsetY = (canvasH - this.ny * this.dx * scale) / 2;
    return {
      x: px * scale + offsetX,
      y: py * scale + offsetY,
    };
  }

  getConcentrationAt(px: number, py: number): number {
    if (!this.result.concentration) return 0;
    return this.bilinearInterpolate(px, py, this.result.concentration);
  }

  getVelocityMagnitudeAt(px: number, py: number): number {
    const v = this.getVelocity(px, py);
    return Math.sqrt(v.x * v.x + v.y * v.y);
  }
}

export function computeStreamlines(
  result: CFDResult,
  seedPoints: Point[],
  steps: number,
  dt: number
): Point[][] {
  const tracker = new ParticleTracker(result);
  const streamlines: Point[][] = [];

  for (const seed of seedPoints) {
    const line: Point[] = [{ x: seed.x, y: seed.y }];
    let px = seed.x;
    let py = seed.y;

    for (let s = 0; s < steps; s++) {
      const next = tracker.advectRK4(px, py, dt);
      if (!tracker.isInsideDomain(next.x, next.y)) break;
      const vel = tracker.getVelocity(next.x, next.y);
      if (Math.sqrt(vel.x * vel.x + vel.y * vel.y) < 1e-12) break;
      line.push(next);
      px = next.x;
      py = next.y;
    }

    if (line.length > 1) {
      streamlines.push(line);
    }
  }

  return streamlines;
}
