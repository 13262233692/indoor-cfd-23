import { useRef, useEffect, useState, useCallback } from 'react';
import { useCFDStore } from '../../store/cfdStore';
import { snapToGrid, findNearestPointOnPolygon, getEdgeNormal, distance } from '../../utils/geometry';
import type { Point } from '../../../shared/types';
import { v4 as uuidv4 } from 'uuid';

export function DrawingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [mousePos, setMousePos] = useState<Point | null>(null);

  const {
    drawingTool,
    roomPoints,
    vents,
    addRoomPoint,
    removeLastPoint,
    addVent,
    removeVent,
    setDrawingTool,
    gridSize,
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

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const raw = getCanvasCoords(e);
    const point = snapToGrid(raw, gridSize);

    if (drawingTool === 'room') {
      addRoomPoint(point);
    } else if ((drawingTool === 'supply' || drawingTool === 'return') && roomPoints.length >= 3) {
      const nearest = findNearestPointOnPolygon(point, roomPoints);
      const edgeA = roomPoints[nearest.edgeIndex];
      const edgeB = roomPoints[(nearest.edgeIndex + 1) % roomPoints.length];
      const normal = getEdgeNormal(edgeA, edgeB, drawingTool === 'supply');

      addVent({
        id: uuidv4(),
        type: drawingTool,
        position: nearest.projection,
        normal,
        width: 20,
        velocity: 1.0,
      });
    } else if (drawingTool === 'erase') {
      let minDist = Infinity;
      let nearestVentId = '';
      for (const vent of vents) {
        const d = distance(raw, vent.position);
        if (d < minDist) {
          minDist = d;
          nearestVentId = vent.id;
        }
      }
      if (nearestVentId && minDist < 30) {
        removeVent(nearestVentId);
      }
    }
  }, [drawingTool, roomPoints, vents, gridSize, addRoomPoint, addVent, removeVent, getCanvasCoords]);

  const handleDoubleClick = useCallback(() => {
    if (drawingTool === 'room') {
      removeLastPoint();
      const currentPoints = useCFDStore.getState().roomPoints;
      if (currentPoints.length >= 3) {
        setDrawingTool('select');
      }
    }
  }, [drawingTool, removeLastPoint, setDrawingTool]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    removeLastPoint();
  }, [removeLastPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasCoords(e);
    setMousePos(point);
  }, [getCanvasCoords]);

  const handleMouseLeave = useCallback(() => {
    setMousePos(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        removeLastPoint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [removeLastPoint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasSize;
    if (width === 0 || height === 0) return;

    ctx.fillStyle = '#0f1626';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(45, 55, 72, 0.5)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (roomPoints.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(roomPoints[0].x, roomPoints[0].y);
      for (let i = 1; i < roomPoints.length; i++) {
        ctx.lineTo(roomPoints[i].x, roomPoints[i].y);
      }
      if (roomPoints.length >= 3) {
        ctx.closePath();
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      roomPoints.forEach((p) => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    vents.forEach((vent) => {
      ctx.save();
      const color = vent.type === 'supply' ? '#ff6b35' : '#4ecdc4';

      ctx.translate(vent.position.x, vent.position.y);
      ctx.rotate(Math.atan2(vent.normal.y, vent.normal.x) - Math.PI / 2);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(-8, 6);
      ctx.lineTo(8, 6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle =
        vent.type === 'supply'
          ? 'rgba(255, 107, 53, 0.4)'
          : 'rgba(78, 205, 196, 0.4)';
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(-5, -8);
      ctx.lineTo(5, -8);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    });
  }, [canvasSize, roomPoints, vents, gridSize]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="absolute top-0 left-0 cursor-crosshair"
      />
      {mousePos && (
        <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 font-mono text-xs text-gray-300 pointer-events-none">
          ({Math.round(mousePos.x)}, {Math.round(mousePos.y)})
        </div>
      )}
    </div>
  );
}
