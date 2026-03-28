'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { KanbanColumn } from './KanbanColumn';
import { TaskCardOverlay } from './TaskCard';
import { useBoardStore } from '@/store/board.store';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import type { Task, ColumnId } from '@/types';

export function BoardShell() {
  const { board, optimisticMove, rollback, snapshotTasks, confirmMove } = useBoardStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require 5px movement before drag starts — prevents accidental drags on click
      activationConstraint: { distance: 5 },
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current;
      if (data?.type === 'task') {
        setActiveTask(data.task as Task);
      }
    },
    [],
  );

  // While dragging over a column, highlight it (handled via useDroppable in KanbanColumn)
  const handleDragOver = useCallback((_event: DragOverEvent) => {}, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveTask(null);

      const { active, over } = event;
      if (!over || !board) return;

      const activeData = active.data.current;
      if (activeData?.type !== 'task') return;

      const task = activeData.task as Task;
      const fromColumnId = task.column_id;

      // Determine where it was dropped
      let toColumnId: ColumnId;
      let toPosition: number;

      const overData = over.data.current;

      if (overData?.type === 'column') {
        // Dropped directly onto a column (empty column area)
        toColumnId = overData.column.id as ColumnId;
        const col = board.columns.find((c) => c.id === toColumnId);
        toPosition = col ? col.tasks.length : 0;
      } else if (overData?.type === 'task') {
        // Dropped onto another task — insert before it
        const overTask = overData.task as Task;
        toColumnId = overTask.column_id;
        toPosition = overTask.position;
      } else {
        // Dropped on column id directly
        toColumnId = over.id as ColumnId;
        const col = board.columns.find((c) => c.id === toColumnId);
        toPosition = col ? col.tasks.length : 0;
      }

      // No-op: same position in same column
      if (fromColumnId === toColumnId && task.position === toPosition) return;

      // ── Optimistic update ──────────────────────────────────────────────────
      const snapshot = snapshotTasks();
      optimisticMove(task.id, toColumnId, toPosition);

      // ── API call ───────────────────────────────────────────────────────────
      try {
        const socketId = getSocket().id;
        const updated = await api.moveTask(task.id, {
          toColumnId,
          toPosition,
          updatedAt: task.updated_at,
          socketId,
        }) as Task;

        // Sync the confirmed updatedAt so future moves have the right token
        confirmMove(task.id, updated.updated_at);
      } catch (e) {
        const msg = (e as Error).message;

        // ── Rollback ─────────────────────────────────────────────────────────
        rollback(snapshot);

        if (msg.startsWith('CONFLICT')) {
          toast.error('Move conflict — another user moved this task. Board refreshed.');
        } else {
          toast.error(`Move failed — "${task.title}" snapped back.`);
        }
      }
    },
    [board, optimisticMove, rollback, snapshotTasks, confirmMove],
  );

  if (!board) return null;

  const columns = [...board.columns].sort((a, b) => a.position - b.position);

  return (
    <div className="flex min-h-screen flex-col bg-[#f0eff5]">
      {/* ── Top nav ─────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-[#e8e7ed] bg-white/80 px-6 py-3.5 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          {/* Logo mark */}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500">
            <svg className="h-4 w-4 text-white" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2h5v12H2V2zm7 0h5v7h-5V2z" />
            </svg>
          </div>
          <span className="text-[15px] font-bold tracking-tight text-[#1a1a2e]">
            SyncBoard
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 rounded-full border border-green-100 bg-green-50 px-2.5 py-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            <span className="text-[11px] font-medium text-green-600">Live</span>
          </div>

          {/* Avatar */}
          <div className="h-8 w-8 rounded-full bg-gray-200 ring-2 ring-white overflow-hidden">
            <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-gray-500">
              SM
            </div>
          </div>
        </div>
      </header>

      {/* ── Board ───────────────────────────────────────────────────────── */}
      <main className="flex flex-1 gap-4 justify-center overflow-x-auto p-6 flex-wrap">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {columns.map((col) => (
            <KanbanColumn key={col.id} column={col} />
          ))}

          {/* Drag overlay — renders the floating card under the cursor */}
          <DragOverlay dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}>
            {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
}
