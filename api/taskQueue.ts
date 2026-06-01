import { v4 as uuidv4 } from 'uuid';
import type { Task, TaskStatus, Geometry, SolverParams, CFDResult } from '../shared/types.js';
import { lbmSolver } from './solver/LBMSolver.js';
import { WebSocketServer, WebSocket } from 'ws';

interface TaskQueueConfig {
  maxConcurrent: number;
  resultTTL: number;
  taskTimeout: number;
}

interface ProgressMessage {
  type: 'progress' | 'result' | 'error';
  taskId: string;
  progress?: number;
  result?: CFDResult;
  error?: string;
}

export class TaskQueue {
  private tasks: Map<string, Task> = new Map();
  private pending: string[] = [];
  private running: Set<string> = new Set();
  private wss: WebSocketServer | null = null;
  private config: TaskQueueConfig = {
    maxConcurrent: 2,
    resultTTL: 30 * 60 * 1000,
    taskTimeout: 5 * 60 * 1000
  };

  constructor(config?: Partial<TaskQueueConfig>) {
    this.config = { ...this.config, ...config };
    this.startCleanupJob();
  }

  setWebSocketServer(wss: WebSocketServer) {
    this.wss = wss;
  }

  private broadcast(message: ProgressMessage) {
    if (!this.wss) return;
    
    this.wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(message));
        } catch (err) {
          console.error('[TaskQueue] WebSocket broadcast error:', err);
        }
      }
    });
  }

  submit(geometry: Geometry, params: SolverParams): string {
    const taskId = uuidv4();
    const task: Task = {
      id: taskId,
      status: 'queued',
      progress: 0,
      createdAt: new Date(),
      geometry,
      params
    };

    this.tasks.set(taskId, task);
    this.pending.push(taskId);
    this.processQueue();
    
    return taskId;
  }

  get(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getAll(): Task[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  private async processQueue() {
    while (this.pending.length > 0 && this.running.size < this.config.maxConcurrent) {
      const taskId = this.pending.shift();
      if (!taskId) break;

      const task = this.tasks.get(taskId);
      if (!task) continue;

      this.running.add(taskId);
      this.runTask(task).finally(() => {
        this.running.delete(taskId);
        this.processQueue();
      });
    }
  }

  private async runTask(task: Task) {
    task.status = 'running';
    task.startedAt = new Date();
    this.tasks.set(task.id, task);

    this.broadcast({
      type: 'progress',
      taskId: task.id,
      progress: 0
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('计算超时：求解器运行时间过长，请减少迭代步数或网格数量'));
      }, this.config.taskTimeout);
    });

    try {
      const result = await Promise.race([
        lbmSolver.run(task.geometry, task.params, (progress) => {
          task.progress = progress;
          this.tasks.set(task.id, task);
          this.broadcast({
            type: 'progress',
            taskId: task.id,
            progress
          });
        }),
        timeoutPromise
      ]);

      task.status = 'completed';
      task.progress = 1;
      task.completedAt = new Date();
      task.result = result;
      this.tasks.set(task.id, task);

      this.broadcast({
        type: 'result',
        taskId: task.id,
        result
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知计算错误';
      
      task.status = 'failed';
      task.error = errorMessage;
      task.completedAt = new Date();
      this.tasks.set(task.id, task);

      console.error(`[TaskQueue] Task ${task.id} failed:`, errorMessage);

      this.broadcast({
        type: 'error',
        taskId: task.id,
        error: errorMessage
      });
    }
  }

  private startCleanupJob() {
    setInterval(() => {
      const now = Date.now();
      for (const [taskId, task] of this.tasks) {
        if (task.completedAt && now - task.completedAt.getTime() > this.config.resultTTL) {
          this.tasks.delete(taskId);
        }
      }
    }, 60 * 1000);
  }
}

export const taskQueue = new TaskQueue();
