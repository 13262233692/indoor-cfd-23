import type { 
  Geometry, 
  SolverParams, 
  SubmitTaskResponse, 
  Task,
  TaskStatusResponse 
} from '../../shared/types.js';

const API_BASE = '/api';

export async function submitTask(
  geometry: Geometry,
  params: SolverParams
): Promise<SubmitTaskResponse> {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ geometry, params }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to submit task' }));
    throw new Error(error.error || 'Failed to submit task');
  }

  return response.json();
}

export async function getTask(taskId: string): Promise<Task> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}`);

  if (!response.ok) {
    throw new Error('Task not found');
  }

  return response.json();
}

export async function getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}/status`);

  if (!response.ok) {
    throw new Error('Task not found');
  }

  return response.json();
}

export async function getAllTasks(): Promise<Task[]> {
  const response = await fetch(`${API_BASE}/tasks`);

  if (!response.ok) {
    throw new Error('Failed to fetch tasks');
  }

  return response.json();
}

export function getWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/ws`;
}
