export interface Point {
  x: number;
  y: number;
}

export interface Room {
  points: Point[];
  width: number;
  height: number;
}

export interface Vent {
  id: string;
  type: 'supply' | 'return';
  position: Point;
  normal: Point;
  width: number;
  velocity: number;
}

export interface Geometry {
  room: Room;
  vents: Vent[];
  gridSize: number;
}

export interface SolverParams {
  inletVelocity: number;
  outletPressure: number;
  kinematicViscosity: number;
  timeSteps: number;
  relaxFactor: number;
  withConcentration: boolean;
}

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface CFDResult {
  nx: number;
  ny: number;
  dx: number;
  x: number[];
  y: number[];
  u: number[][];
  v: number[][];
  velocity: number[][];
  concentration?: number[][];
  pressure?: number[][];
}

export interface Task {
  id: string;
  status: TaskStatus;
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  geometry: Geometry;
  params: SolverParams;
  result?: CFDResult;
  error?: string;
}

export interface SubmitTaskRequest {
  geometry: Geometry;
  params: SolverParams;
}

export interface SubmitTaskResponse {
  taskId: string;
  status: TaskStatus;
}

export interface TaskStatusResponse {
  taskId: string;
  status: TaskStatus;
  progress: number;
}

export interface ProgressMessage {
  type: 'progress' | 'result' | 'error';
  taskId: string;
  progress?: number;
  result?: CFDResult;
  error?: string;
}

export type DrawingTool = 'select' | 'room' | 'supply' | 'return' | 'erase' | 'particle';

export interface ParticleSource {
  id: string;
  position: Point;
  rate: number;
  lifetime: number;
}

export interface Particle {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  trail: Point[];
}

export interface ParticleAnimation {
  playing: boolean;
  speed: number;
  time: number;
  maxTime: number;
  showTrails: boolean;
  trailLength: number;
}
