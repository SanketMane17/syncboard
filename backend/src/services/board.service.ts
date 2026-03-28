import { sql } from '../db/client.js';
import type { Task, ColumnId } from '../types/index.js';

export async function getBoardWithTasks(boardId: string) {
  const columns = await sql`
    SELECT c.id, c.title, c.position
    FROM columns c
    WHERE c.board_id = ${boardId}
    ORDER BY c.position ASC
  `;

  const tasks = await sql<Task[]>`
    SELECT t.*
    FROM tasks t
    JOIN columns c ON t.column_id = c.id
    WHERE c.board_id = ${boardId}
    ORDER BY t.column_id, t.position ASC
  `;

  return {
    id: boardId,
    columns: columns.map((col) => ({
      ...col,
      tasks: tasks.filter((t) => t.column_id === col.id),
    })),
  };
}

export async function createTask(data: {
  columnId: ColumnId;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  assigneeInitials: string;
  assigneeColor: string;
}) {
  // Position = max + 1 in that column
  const [{ max_pos }] = await sql`
    SELECT COALESCE(MAX(position), -1) AS max_pos
    FROM tasks
    WHERE column_id = ${data.columnId}
  `;

  const [task] = await sql<Task[]>`
    INSERT INTO tasks (column_id, title, description, priority, assignee_initials, assignee_color, position)
    VALUES (
      ${data.columnId},
      ${data.title},
      ${data.description ?? null},
      ${data.priority},
      ${data.assigneeInitials},
      ${data.assigneeColor},
      ${(max_pos as number) + 1}
    )
    RETURNING *
  `;
  return task;
}

export async function moveTask(
  taskId: string,
  toColumnId: ColumnId,
  toPosition: number,
  clientUpdatedAt: string, // optimistic concurrency check
) {
  // Concurrency guard: reject if someone else moved it after the client's snapshot
  const [current] = await sql<Task[]>`
    SELECT * FROM tasks WHERE id = ${taskId}
  `;

  if (!current) throw new Error('Task not found');

  if (new Date(current.updated_at) > new Date(clientUpdatedAt)) {
    throw new Error('CONFLICT: Task was modified by another user');
  }

  // Shift other tasks in the target column to make room
  await sql`
    UPDATE tasks
    SET position = position + 1
    WHERE column_id = ${toColumnId}
      AND position >= ${toPosition}
      AND id != ${taskId}
  `;

  const [updated] = await sql<Task[]>`
    UPDATE tasks
    SET column_id  = ${toColumnId},
        position   = ${toPosition},
        updated_at = NOW()
    WHERE id = ${taskId}
    RETURNING *
  `;

  return updated;
}

export async function updateTask(
  taskId: string,
  changes: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'assignee_initials'>>,
) {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (changes.title !== undefined)             { fields.push('title = $' + (values.push(changes.title)));             }
  if (changes.description !== undefined)       { fields.push('description = $' + (values.push(changes.description)));  }
  if (changes.priority !== undefined)          { fields.push('priority = $' + (values.push(changes.priority)));        }
  if (changes.assignee_initials !== undefined) { fields.push('assignee_initials = $' + (values.push(changes.assignee_initials))); }

  if (fields.length === 0) throw new Error('No fields to update');

  values.push(taskId);
  const [updated] = await sql<Task[]>`
    UPDATE tasks
    SET ${sql.unsafe(fields.join(', '))}, updated_at = NOW()
    WHERE id = ${taskId}
    RETURNING *
  `;
  return updated;
}

export async function deleteTask(taskId: string) {
  const [deleted] = await sql<Task[]>`
    DELETE FROM tasks WHERE id = ${taskId} RETURNING *
  `;
  if (!deleted) throw new Error('Task not found');
  return deleted;
}

export async function getDefaultBoardId(): Promise<string> {
  const [board] = await sql`SELECT id FROM boards LIMIT 1`;
  if (!board) throw new Error('No board found. Run migrations first.');
  return board.id;
}
