import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  getBoardWithTasks,
  createTask,
  moveTask,
  updateTask,
  deleteTask,
  getDefaultBoardId,
} from '../services/board.service.js';
import type { Server } from 'socket.io';

const CreateTaskSchema = z.object({
  columnId: z.enum(['backlog', 'todo', 'inprogress', 'done']),
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  assigneeInitials: z.string().max(3).default('?'),
  assigneeColor: z.string().default('purple'),
});

const MoveTaskSchema = z.object({
  toColumnId: z.enum(['backlog', 'todo', 'inprogress', 'done']),
  toPosition: z.number().int().min(0),
  updatedAt: z.string(), // ISO string — optimistic concurrency token
  socketId: z.string().optional(), // to skip re-broadcast back to mover
});

const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assigneeInitials: z.string().max(3).optional(),
});

export async function boardRoutes(app: FastifyInstance, io: Server) {
  // GET /api/board — full board snapshot
  app.get('/api/board', async (_req, reply) => {
    try {
      const boardId = await getDefaultBoardId();
      const board = await getBoardWithTasks(boardId);
      return reply.send(board);
    } catch (e) {
      return reply.status(500).send({ error: (e as Error).message });
    }
  });

  // POST /api/tasks — create task
  app.post('/api/tasks', async (req, reply) => {
    const parsed = CreateTaskSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    try {
      const task = await createTask(parsed.data);
      io.to('board').emit('task:created', { task });
      return reply.status(201).send(task);
    } catch (e) {
      return reply.status(500).send({ error: (e as Error).message });
    }
  });

  // PATCH /api/tasks/:taskId/move — move task between columns
  app.patch('/api/tasks/:taskId/move', async (req, reply) => {
    const { taskId } = req.params as { taskId: string };
    const parsed = MoveTaskSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { toColumnId, toPosition, updatedAt, socketId } = parsed.data;

    try {
      const task = await moveTask(taskId, toColumnId, toPosition, updatedAt);

      const payload = {
        taskId: task.id,
        fromColumnId: task.column_id, // before move — client should track this
        toColumnId,
        position: toPosition,
        updatedAt: task.updated_at,
      };

      // Broadcast to all OTHER clients in the board room
      if (socketId) {
        io.to('board').except(socketId).emit('task:moved', payload);
      } else {
        io.to('board').emit('task:moved', payload);
      }

      return reply.send(task);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.startsWith('CONFLICT')) return reply.status(409).send({ error: msg });
      return reply.status(500).send({ error: msg });
    }
  });

  // PATCH /api/tasks/:taskId — update task metadata
  app.patch('/api/tasks/:taskId', async (req, reply) => {
    const { taskId } = req.params as { taskId: string };
    const parsed = UpdateTaskSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    try {
      const task = await updateTask(taskId, {
        title: parsed.data.title,
        description: parsed.data.description ?? undefined,
        priority: parsed.data.priority,
        assignee_initials: parsed.data.assigneeInitials,
      });

      io.to('board').emit('task:updated', {
        taskId: task.id,
        changes: parsed.data,
        updatedAt: task.updated_at,
      });

      return reply.send(task);
    } catch (e) {
      return reply.status(500).send({ error: (e as Error).message });
    }
  });

  // DELETE /api/tasks/:taskId
  app.delete('/api/tasks/:taskId', async (req, reply) => {
    const { taskId } = req.params as { taskId: string };

    try {
      const task = await deleteTask(taskId);
      io.to('board').emit('task:deleted', { taskId, columnId: task.column_id });
      return reply.status(204).send();
    } catch (e) {
      return reply.status(404).send({ error: (e as Error).message });
    }
  });
}
