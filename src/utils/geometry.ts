import type { Point } from '../../shared/types.js';

export function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

export function distanceToSegment(p: Point, a: Point, b: Point): { distance: number; projection: Point; t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  
  if (len2 === 0) {
    return {
      distance: distance(p, a),
      projection: { ...a },
      t: 0,
    };
  }
  
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  
  const projection = {
    x: a.x + t * dx,
    y: a.y + t * dy,
  };
  
  return {
    distance: distance(p, projection),
    projection,
    t,
  };
}

export function findNearestPointOnPolygon(p: Point, polygon: Point[]): { 
  distance: number; 
  projection: Point; 
  edgeIndex: number;
  t: number;
} {
  let minDist = Infinity;
  let nearestProj = { x: 0, y: 0 };
  let nearestEdge = 0;
  let nearestT = 0;
  
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    
    const result = distanceToSegment(p, a, b);
    if (result.distance < minDist) {
      minDist = result.distance;
      nearestProj = result.projection;
      nearestEdge = i;
      nearestT = result.t;
    }
  }
  
  return {
    distance: minDist,
    projection: nearestProj,
    edgeIndex: nearestEdge,
    t: nearestT,
  };
}

export function pointInPolygon(p: Point, polygon: Point[]): boolean {
  let inside = false;
  const n = polygon.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    if (((yi > p.y) !== (yj > p.y)) &&
        (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

export function getPolygonCentroid(polygon: Point[]): Point {
  let cx = 0, cy = 0, area = 0;
  
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    const cross = p1.x * p2.y - p2.x * p1.y;
    area += cross;
    cx += (p1.x + p2.x) * cross;
    cy += (p1.y + p2.y) * cross;
  }
  
  area *= 3;
  cx /= area;
  cy /= area;
  
  return { x: cx, y: cy };
}

export function getEdgeNormal(p1: Point, p2: Point, inward: boolean = true): Point {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  
  if (len === 0) return { x: 0, y: -1 };
  
  let nx = -dy / len;
  let ny = dx / len;
  
  if (!inward) {
    nx = -nx;
    ny = -ny;
  }
  
  return { x: nx, y: ny };
}

export function snapToGrid(p: Point, gridSize: number = 20): Point {
  return {
    x: Math.round(p.x / gridSize) * gridSize,
    y: Math.round(p.y / gridSize) * gridSize,
  };
}

export function scalePoint(p: Point, scale: number, origin: Point = { x: 0, y: 0 }): Point {
  return {
    x: origin.x + (p.x - origin.x) * scale,
    y: origin.y + (p.y - origin.y) * scale,
  };
}

export function translatePoint(p: Point, dx: number, dy: number): Point {
  return {
    x: p.x + dx,
    y: p.y + dy,
  };
}
