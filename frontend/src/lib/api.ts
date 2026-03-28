import type { Board, ColumnId } from '@/types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  getBoard: () => apiFetch<Board>('/api/board'),

  createTask: (data: {
    columnId: ColumnId;
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high';
    assigneeInitials?: string;
    assigneeColor?: string;
  }) =>
    apiFetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  moveTask: (
    taskId: string,
    payload: {
      toColumnId: ColumnId;
      toPosition: number;
      updatedAt: string;
      socketId?: string;
    },
  ) =>
    apiFetch(`/api/tasks/${taskId}/move`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteTask: (taskId: string) =>
    apiFetch(`/api/tasks/${taskId}`, { method: 'DELETE' }),
};
