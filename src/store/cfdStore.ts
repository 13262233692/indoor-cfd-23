import { create } from 'zustand';
import type {
  Point,
  Room,
  Vent,
  Geometry,
  SolverParams,
  CFDResult,
  Task,
  DrawingTool,
  ProgressMessage,
  ParticleSource,
  Particle,
  ParticleAnimation,
} from '../../shared/types.js';
import { submitTask as apiSubmitTask, getTask } from '../../utils/api';
import { ParticleTracker } from '../../utils/particleTracker';

interface CFDStore {
  drawingTool: DrawingTool;
  roomPoints: Point[];
  vents: Vent[];
  gridSize: number;
  showGrid: boolean;
  params: SolverParams;

  currentTask: Task | null;
  taskId: string | null;
  taskStatus: string | null;
  taskProgress: number;
  taskError: string | null;
  result: CFDResult | null;

  showConcentration: boolean;
  showArrows: boolean;
  showHeatmap: boolean;
  showParticles: boolean;
  arrowScale: number;
  heatmapOpacity: number;

  particleSources: ParticleSource[];
  particles: Particle[];
  animation: ParticleAnimation;

  wsConnected: boolean;

  history: { roomPoints: Point[]; vents: Vent[] }[];
  historyIndex: number;

  setDrawingTool: (tool: DrawingTool) => void;
  addRoomPoint: (point: Point) => void;
  removeLastPoint: () => void;
  clearRoom: () => void;
  addVent: (vent: Vent) => void;
  removeVent: (id: string) => void;
  setVents: (vents: Vent[]) => void;
  setGridSize: (size: number) => void;
  setShowGrid: (show: boolean) => void;
  setParams: (params: Partial<SolverParams>) => void;

  submitTask: () => Promise<void>;
  connectWS: () => void;
  disconnectWS: () => void;
  clearResult: () => void;
  clearError: () => void;

  setShowConcentration: (show: boolean) => void;
  setShowArrows: (show: boolean) => void;
  setShowHeatmap: (show: boolean) => void;
  setShowParticles: (show: boolean) => void;
  setArrowScale: (scale: number) => void;
  setHeatmapOpacity: (opacity: number) => void;

  addParticleSource: (position: Point) => void;
  removeParticleSource: (id: string) => void;
  clearParticleSources: () => void;
  setParticles: (particles: Particle[]) => void;
  stepAnimation: () => void;
  toggleAnimation: () => void;
  setAnimationSpeed: (speed: number) => void;
  resetAnimation: () => void;
  setAnimationShowTrails: (show: boolean) => void;
  setAnimationTrailLength: (len: number) => void;

  undo: () => void;
  redo: () => void;
  saveState: () => void;
  reset: () => void;
}

const defaultParams: SolverParams = {
  inletVelocity: 2.0,
  outletPressure: 0,
  kinematicViscosity: 1.5e-5,
  timeSteps: 300,
  relaxFactor: 1.0,
  withConcentration: true,
};

const defaultRoomPoints: Point[] = [
  { x: 100, y: 100 },
  { x: 500, y: 100 },
  { x: 500, y: 400 },
  { x: 100, y: 400 },
];

const defaultVents: Vent[] = [
  {
    id: 'vent-1',
    type: 'supply',
    position: { x: 200, y: 100 },
    normal: { x: 0, y: 1 },
    width: 0.5,
    velocity: 2.0,
  },
  {
    id: 'vent-2',
    type: 'return',
    position: { x: 400, y: 400 },
    normal: { x: 0, y: -1 },
    width: 0.5,
    velocity: 1.5,
  },
];

const defaultAnimation: ParticleAnimation = {
  playing: false,
  speed: 1.0,
  time: 0,
  maxTime: 30,
  showTrails: true,
  trailLength: 40,
};

const initialHistory = {
  roomPoints: defaultRoomPoints,
  vents: defaultVents,
};

let ws: WebSocket | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let animFrameId: number | null = null;
let lastFrameTime: number = 0;

function startPolling(taskId: string) {
  stopPolling();
  pollTimer = setInterval(async () => {
    try {
      const task = await getTask(taskId);
      if (task.status === 'completed' && task.result) {
        useCFDStore.setState({ result: task.result, taskStatus: 'completed', taskProgress: 100 });
        stopPolling();
      } else if (task.status === 'failed') {
        useCFDStore.setState({
          taskStatus: 'failed',
          taskError: task.error || '计算失败',
        });
        stopPolling();
      } else if (task.status === 'running') {
        useCFDStore.setState({
          taskStatus: 'running',
          taskProgress: Math.round(task.progress * 100),
        });
      }
    } catch {
      // polling failed, will retry
    }
  }, 3000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startAnimLoop() {
  stopAnimLoop();
  lastFrameTime = performance.now();
  const loop = (now: number) => {
    const store = useCFDStore.getState();
    if (!store.animation.playing || !store.result) {
      animFrameId = null;
      return;
    }
    const delta = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    const dt = delta * store.animation.speed * 0.5;
    if (dt <= 0 || dt > 1) {
      animFrameId = requestAnimationFrame(loop);
      return;
    }

    const tracker = new ParticleTracker(store.result);
    let particles = store.particles;

    particles = tracker.stepParticles(particles, dt, store.animation.trailLength);

    const emitted = tracker.emitParticles(store.particleSources, 15);
    particles = particles.concat(emitted);

    const maxParticles = 2000;
    if (particles.length > maxParticles) {
      particles = particles.slice(particles.length - maxParticles);
    }

    const newTime = store.animation.time + dt;
    const maxTime = store.animation.maxTime;
    useCFDStore.setState({
      particles,
      animation: {
        ...store.animation,
        time: newTime > maxTime ? 0 : newTime,
      },
    });

    animFrameId = requestAnimationFrame(loop);
  };
  animFrameId = requestAnimationFrame(loop);
}

function stopAnimLoop() {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

export const useCFDStore = create<CFDStore>((set, get) => ({
  drawingTool: 'select',
  roomPoints: defaultRoomPoints,
  vents: defaultVents,
  gridSize: 50,
  showGrid: true,
  params: { ...defaultParams },

  currentTask: null,
  taskId: null,
  taskStatus: null,
  taskProgress: 0,
  taskError: null,
  result: null,

  showConcentration: false,
  showArrows: true,
  showHeatmap: true,
  showParticles: true,
  arrowScale: 1.0,
  heatmapOpacity: 0.7,

  particleSources: [],
  particles: [],
  animation: { ...defaultAnimation },

  wsConnected: false,

  history: [initialHistory],
  historyIndex: 0,

  setDrawingTool: (tool) => set({ drawingTool: tool }),

  addRoomPoint: (point) => {
    const { roomPoints } = get();
    set({ roomPoints: [...roomPoints, point] });
  },

  removeLastPoint: () => {
    const { roomPoints } = get();
    if (roomPoints.length > 0) {
      set({ roomPoints: roomPoints.slice(0, -1) });
    }
  },

  clearRoom: () => set({ roomPoints: [], vents: [] }),

  addVent: (vent) => {
    const { vents } = get();
    set({ vents: [...vents, vent] });
  },

  removeVent: (id) => {
    const { vents } = get();
    set({ vents: vents.filter(v => v.id !== id) });
  },

  setVents: (vents) => set({ vents }),

  setGridSize: (size) => set({ gridSize: size }),

  setShowGrid: (show) => set({ showGrid: show }),

  setParams: (params) =>
    set((state) => ({
      params: { ...state.params, ...params },
    })),

  submitTask: async () => {
    const { roomPoints, vents, gridSize, params } = get();
    if (roomPoints.length < 3) return;

    const xs = roomPoints.map((p) => p.x);
    const ys = roomPoints.map((p) => p.y);
    const canvas_w = (Math.max(...xs) - Math.min(...xs)) || 1;
    const canvas_h = (Math.max(...ys) - Math.min(...ys)) || 1;

    const room: Room = {
      points: roomPoints,
      width: 8,
      height: 8 * (canvas_h / canvas_w),
    };
    const geometry: Geometry = { room, vents, gridSize };

    set({ taskError: null, taskProgress: 0, taskStatus: 'queued' });

    try {
      const data = await apiSubmitTask(geometry, params);
      set({ taskId: data.taskId, taskStatus: data.status });
      get().connectWS();
      startPolling(data.taskId);
    } catch (err) {
      set({
        taskError: err instanceof Error ? err.message : String(err),
        taskStatus: 'failed',
      });
    }
  },

  connectWS: () => {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;

    ws = new WebSocket(url);

    ws.onopen = () => set({ wsConnected: true });

    ws.onmessage = (event) => {
      try {
        const msg: ProgressMessage = JSON.parse(event.data);
        const { taskId } = get();
        if (msg.taskId !== taskId) return;

        switch (msg.type) {
          case 'progress':
            set({
              taskProgress: Math.round((msg.progress ?? 0) * 100),
              taskStatus: 'running',
            });
            break;
          case 'result':
            stopPolling();
            set({ result: msg.result ?? null, taskStatus: 'completed', taskProgress: 100 });
            break;
          case 'error':
            stopPolling();
            set({ taskError: msg.error ?? '未知错误', taskStatus: 'failed' });
            break;
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => set({ wsConnected: false });

    ws.onerror = () => {
      set({ wsConnected: false });
    };
  },

  disconnectWS: () => {
    stopPolling();
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.close();
      ws = null;
    }
    set({ wsConnected: false });
  },

  clearResult: () => {
    stopAnimLoop();
    set({ result: null, particles: [], particleSources: [], animation: { ...defaultAnimation } });
  },

  clearError: () => set({ taskError: null }),

  setShowConcentration: (show) => set({ showConcentration: show }),

  setShowArrows: (show) => set({ showArrows: show }),

  setShowHeatmap: (show) => set({ showHeatmap: show }),

  setShowParticles: (show) => set({ showParticles: show }),

  setArrowScale: (scale) => set({ arrowScale: scale }),

  setHeatmapOpacity: (opacity) => set({ heatmapOpacity: opacity }),

  addParticleSource: (position) => {
    const { particleSources, result } = get();
    let physPos = position;
    if (result) {
      // placeholder - canvas-to-physical conversion happens in component
    }
    const src: ParticleSource = {
      id: `ps-${Date.now()}`,
      position: physPos,
      rate: 3,
      lifetime: 15,
    };
    set({ particleSources: [...particleSources, src] });
  },

  removeParticleSource: (id) => {
    const { particleSources } = get();
    set({ particleSources: particleSources.filter(s => s.id !== id) });
  },

  clearParticleSources: () => {
    stopAnimLoop();
    set({ particleSources: [], particles: [], animation: { ...get().animation, playing: false, time: 0 } });
  },

  setParticles: (particles) => set({ particles }),

  stepAnimation: () => {
    const { result, particles, particleSources, animation } = get();
    if (!result) return;

    const tracker = new ParticleTracker(result);
    const dt = 0.05 * animation.speed;
    let updated = tracker.stepParticles(particles, dt, animation.trailLength);
    const emitted = tracker.emitParticles(particleSources, 15);
    updated = updated.concat(emitted);

    if (updated.length > 2000) {
      updated = updated.slice(updated.length - 2000);
    }

    const newTime = animation.time + dt;
    set({
      particles: updated,
      animation: {
        ...animation,
        time: newTime > animation.maxTime ? 0 : newTime,
      },
    });
  },

  toggleAnimation: () => {
    const { animation } = get();
    if (animation.playing) {
      stopAnimLoop();
      set({ animation: { ...animation, playing: false } });
    } else {
      set({ animation: { ...animation, playing: true } });
      startAnimLoop();
    }
  },

  setAnimationSpeed: (speed) => {
    const { animation } = get();
    set({ animation: { ...animation, speed } });
  },

  resetAnimation: () => {
    stopAnimLoop();
    set({
      particles: [],
      animation: { ...defaultAnimation },
    });
  },

  setAnimationShowTrails: (show) => {
    const { animation } = get();
    set({ animation: { ...animation, showTrails: show } });
  },

  setAnimationTrailLength: (len) => {
    const { animation } = get();
    set({ animation: { ...animation, trailLength: len } });
  },

  saveState: () => {
    const { roomPoints, vents, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      roomPoints: [...roomPoints],
      vents: vents.map(v => ({ ...v })),
    });
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      set({
        roomPoints: [...state.roomPoints],
        vents: state.vents.map(v => ({ ...v })),
        historyIndex: newIndex,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      set({
        roomPoints: [...state.roomPoints],
        vents: state.vents.map(v => ({ ...v })),
        historyIndex: newIndex,
      });
    }
  },

  reset: () => {
    get().disconnectWS();
    stopAnimLoop();
    set({
      drawingTool: 'select',
      roomPoints: defaultRoomPoints,
      vents: defaultVents,
      gridSize: 50,
      showGrid: true,
      params: { ...defaultParams },
      currentTask: null,
      taskId: null,
      taskStatus: null,
      taskProgress: 0,
      taskError: null,
      result: null,
      showConcentration: false,
      showArrows: true,
      showHeatmap: true,
      showParticles: true,
      arrowScale: 1.0,
      heatmapOpacity: 0.7,
      particleSources: [],
      particles: [],
      animation: { ...defaultAnimation },
      wsConnected: false,
      history: [initialHistory],
      historyIndex: 0,
    });
  },
}));
