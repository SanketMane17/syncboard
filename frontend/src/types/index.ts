export type Priority = 'low' | 'medium' | 'high';

export type ColumnId = 'backlog' | 'todo' | 'inprogress' | 'done';

export interface Task {
  id: string;
  column_id: ColumnId;
  title: string;
  description: string | null;
  priority: Priority;
  assignee_initials: string;
  assignee_color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: ColumnId;
  title: string;
  position: number;
  tasks: Task[];
}

export interface Board {
  id: string;
  columns: Column[];
}

// WebSocket event payloads
export interface TaskMovedPayload {
  taskId: string;
  fromColumnId: ColumnId;
  toColumnId: ColumnId;
  position: number;
  updatedAt: string;
}

export interface TaskCreatedPayload {
  task: Task;
}

export interface TaskUpdatedPayload {
  taskId: string;
  changes: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'assignee_initials'>>;
  updatedAt: string;
}

export interface TaskDeletedPayload {
  taskId: string;
  columnId: ColumnId;
}
