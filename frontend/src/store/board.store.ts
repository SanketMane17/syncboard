import { create } from 'zustand';
import type { Board, Column, ColumnId, Task, TaskMovedPayload, TaskCreatedPayload, TaskDeletedPayload } from '@/types';

// A lightweight snapshot of tasks for rollback
type TaskSnapshot = Record<string, Task>;

interface BoardState {
  board: Board | null;
  isLoading: boolean;
  error: string | null;

  // ── Actions ────────────────────────────────────────────────────────────────
  setBoard: (board: Board) => void;
  setLoading: (v: boolean) => void;
  setError: (msg: string | null) => void;

  /** Snapshot current tasks before an optimistic update */
  snapshotTasks: () => TaskSnapshot;

  /** Optimistically move a task — call BEFORE the API request */
  optimisticMove: (taskId: string, toColumnId: ColumnId, toPosition: number) => void;

  /** Roll back to a previous snapshot — call when API request fails */
  rollback: (snapshot: TaskSnapshot) => void;

  /** Apply a move event from another user via WebSocket */
  applyRemoteMove: (payload: TaskMovedPayload) => void;

  /** Apply a task:created event */
  applyRemoteCreate: (payload: TaskCreatedPayload) => void;

  /** Apply a task:deleted event */
  applyRemoteDelete: (payload: TaskDeletedPayload) => void;

  /** Update a task's updatedAt after a confirmed server response */
  confirmMove: (taskId: string, updatedAt: string) => void;

  // ── Selectors ──────────────────────────────────────────────────────────────
  getTasksByColumn: (columnId: ColumnId) => Task[];
  getAllTasksMap: () => Record<string, Task>;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  board: null,
  isLoading: false,
  error: null,

  setBoard: (board) => set({ board }),
  setLoading: (v) => set({ isLoading: v }),
  setError: (msg) => set({ error: msg }),

  snapshotTasks: () => {
    const { board } = get();
    if (!board) return {};
    const map: TaskSnapshot = {};
    for (const col of board.columns) {
      for (const task of col.tasks) {
        map[task.id] = { ...task };
      }
    }
    return map;
  },

  optimisticMove: (taskId, toColumnId, toPosition) => {
    set((state) => {
      if (!state.board) return state;

      const updatedColumns = state.board.columns.map((col): Column => {
        // Remove task from its current column
        const filtered = col.tasks.filter((t) => t.id !== taskId);

        if (col.id === toColumnId) {
          // Find the task from wherever it was
          const allTasks = state.board!.columns.flatMap((c) => c.tasks);
          const task = allTasks.find((t) => t.id === taskId);
          if (!task) return { ...col, tasks: filtered };

          const moved: Task = { ...task, column_id: toColumnId, position: toPosition };

          // Insert at the right position and re-index
          const withNew = [...filtered];
          withNew.splice(toPosition, 0, moved);

          return {
            ...col,
            tasks: withNew.map((t, i) => ({ ...t, position: i })),
          };
        }

        return { ...col, tasks: filtered.map((t, i) => ({ ...t, position: i })) };
      });

      return { board: { ...state.board!, columns: updatedColumns } };
    });
  },

  rollback: (snapshot) => {
    set((state) => {
      if (!state.board) return state;

      const restoredColumns = state.board.columns.map((col): Column => ({
        ...col,
        tasks: col.tasks
          .map((t) => snapshot[t.id] ?? t)
          .concat(
            // Re-add tasks that were removed from this column during the optimistic update
            Object.values(snapshot).filter(
              (t) =>
                t.column_id === col.id &&
                !col.tasks.find((ct) => ct.id === t.id),
            ),
          )
          .sort((a, b) => a.position - b.position),
      }));

      return { board: { ...state.board!, columns: restoredColumns } };
    });
  },

  applyRemoteMove: (payload) => {
    const { taskId, toColumnId, position, updatedAt } = payload;
    get().optimisticMove(taskId, toColumnId, position);
    get().confirmMove(taskId, updatedAt);
  },

  applyRemoteCreate: ({ task }) => {
    set((state) => {
      if (!state.board) return state;
      const columns = state.board.columns.map((col): Column => {
        if (col.id !== task.column_id) return col;
        return { ...col, tasks: [...col.tasks, task] };
      });
      return { board: { ...state.board, columns } };
    });
  },

  applyRemoteDelete: ({ taskId }) => {
    set((state) => {
      if (!state.board) return state;
      const columns = state.board.columns.map((col): Column => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== taskId),
      }));
      return { board: { ...state.board, columns } };
    });
  },

  confirmMove: (taskId, updatedAt) => {
    set((state) => {
      if (!state.board) return state;
      const columns = state.board.columns.map((col): Column => ({
        ...col,
        tasks: col.tasks.map((t) =>
          t.id === taskId ? { ...t, updated_at: updatedAt } : t,
        ),
      }));
      return { board: { ...state.board, columns } };
    });
  },

  getTasksByColumn: (columnId) => {
    const { board } = get();
    if (!board) return [];
    return (
      board.columns
        .find((c) => c.id === columnId)
        ?.tasks.slice()
        .sort((a, b) => a.position - b.position) ?? []
    );
  },

  getAllTasksMap: () => {
    const { board } = get();
    if (!board) return {};
    const map: Record<string, Task> = {};
    for (const col of board.columns) {
      for (const task of col.tasks) map[task.id] = task;
    }
    return map;
  },
}));
