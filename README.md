# SyncBoard — Real-Time Collaborative Kanban

A full-stack Kanban board with real-time multi-user sync, optimistic UI updates, and automatic rollback on failure.

---

## Live Demo

[https://sanket-syncboard.vercel.app/](https://sanket-syncboard.vercel.app/)

---

## Quick Start

**Prerequisites:** Node 20+, PostgreSQL 16

**1. Database**

```bash
createdb syncboard
```

**2. Backend**

```bash
cd backend
cp .env.example .env          # edit DATABASE_URL if needed
npm install
npm run db:migrate            # creates tables + seeds data
npm run dev                   # runs on :4000
```

**3. Frontend**

```bash
cd frontend
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                   # runs on :3000
```

---

## Architecture Decisions

### Why Zustand over Redux Toolkit?

Redux Toolkit is excellent for large apps requiring time-travel debugging or complex middleware chains. For a Kanban board, Zustand's flat store with direct mutations is significantly less boilerplate — the entire board state (optimistic move, rollback, remote event application) fits in one file with zero ceremony. RTK's extra abstractions would add noise without benefit here.

### Why dnd-kit over react-beautiful-dnd?

`react-beautiful-dnd` is unmaintained (last release 2022). `dnd-kit` is the current community standard: tree-shakeable, accessible by default, supports both mouse and touch, and has first-class TypeScript types. The `useSortable` + `useDroppable` split maps cleanly to the card/column mental model.

### Why Fastify over Express?

~30% faster throughput on benchmarks, built-in Zod-compatible schema validation, and first-class TypeScript support out of the box. For a real-time app where the backend is handling both REST and WebSocket connections, the lower overhead matters.

### Why PostgreSQL over MongoDB?

Tasks have clear relational structure: `board → column → task`. The critical requirement — maintaining card order — needs a `position` integer column and `ORDER BY position` queries. Relational databases handle this trivially and with correct transactional guarantees. MongoDB would require manual position bookkeeping without the safety net of ACID transactions.

### Why Socket.io over raw WebSockets?

Automatic reconnection, room-based broadcasting (`io.to('board').emit`), and the `except(socketId)` API (skip broadcasting back to the user who triggered the change) are all built in. Raw WebSockets would require implementing all of this manually.

---

## How Optimistic UI + Rollback Works

```
User drags card
    │
    ├─→ snapshotTasks()          ← save a copy of current state
    ├─→ optimisticMove()         ← update UI instantly (no wait)
    │
    ├─→ PATCH /api/tasks/:id/move
    │       │
    │       ├── Success → confirmMove(updatedAt)   ← sync server timestamp
    │       │             WS broadcasts to others
    │       │
    │       └── Failure → rollback(snapshot)       ← restore previous state
    │                     toast.error(...)
    │
    └── Other users receive task:moved via WebSocket → applyRemoteMove()
```

**Race condition handling:** Every move request sends the task's `updated_at` timestamp as a concurrency token. The server rejects the move with HTTP 409 if the task was modified after the client's snapshot, preventing last-writer-wins data loss.

---

## Project Structure

```
syncboard/
├── backend/
│   └── src/
│       ├── db/
│       │   ├── client.ts          # postgres connection pool
│       │   └── migrate.ts         # schema + seed
│       ├── services/
│       │   └── board.service.ts   # all DB queries
│       ├── routes/
│       │   └── board.routes.ts    # REST endpoints + WS broadcast
│       ├── socket/
│       │   └── index.ts           # Socket.io setup
│       └── index.ts               # Fastify bootstrap
│
└── frontend/
    └── src/
        ├── app/                   # Next.js App Router
        ├── components/
        │   ├── board/
        │   │   ├── BoardShell.tsx     # DnD context + drag logic
        │   │   ├── KanbanColumn.tsx   # Droppable column
        │   │   ├── TaskCard.tsx       # Sortable card + overlay
        │   │   └── AddTaskModal.tsx   # Create task form
        │   └── ui/
        │       ├── Avatar.tsx
        │       └── PriorityBadge.tsx
        ├── store/
        │   └── board.store.ts     # Zustand: all state + mutations
        ├── hooks/
        │   └── useSocket.ts       # WS event wiring
        └── lib/
            ├── api.ts             # REST client
            └── socket.ts          # Socket.io singleton
```

---

## Trade-offs Made to Meet Deadline

1. **Single board only.** The DB schema supports multiple boards (board_id FK), but the frontend always loads the first board. Multi-board routing would add ~1 hour of work.

2. **No authentication.** Users are anonymous. The socket ID is used as a "moved by" identifier for skipping echo broadcasts. Adding auth (NextAuth + JWT) would take a full day on its own.

3. **No task editing.** The `PATCH /api/tasks/:taskId` endpoint exists on the backend but the frontend has no edit UI yet — only create and move are wired up.

4. **No drag between sortable lists.** Cards can be dragged to any column, but the within-column reorder position is approximate (drops at the end or before the hovered card). A production implementation would use `@dnd-kit/sortable`'s `arrayMove` with precise insertion tracking.

5. **No delete UI.** The `DELETE /api/tasks/:taskId` endpoint is implemented on the backend but there is no delete button on the frontend yet. Cards can only be created and moved.

6. **AI assistance.** Claude was used to accelerate scaffolding - primarily the boilerplate parts (DB migration schema, Zod validation wiring, Tailwind class composition). Core logic - the optimistic update/rollback flow, the `updated_at` concurrency guard on moves, the WebSocket echo-skip using `socket.to().except()`, and the rollback bug fix (snapshot-based column rebuild vs. patching current state) - was reasoned through and written directly. AI was treated as a faster way to type, not a replacement for understanding what the code does.

---

## API Reference

| Method   | Path                  | Description                                    |
| -------- | --------------------- | ---------------------------------------------- |
| `GET`    | `/api/board`          | Full board snapshot with all columns and tasks |
| `POST`   | `/api/tasks`          | Create a new task                              |
| `PATCH`  | `/api/tasks/:id/move` | Move task to column + position                 |
| `PATCH`  | `/api/tasks/:id`      | Update task metadata                           |
| `DELETE` | `/api/tasks/:id`      | Delete task                                    |
| `GET`    | `/health`             | Health check                                   |

## WebSocket Events (server → client)

| Event          | Payload                                       | Description      |
| -------------- | --------------------------------------------- | ---------------- |
| `task:moved`   | `{ taskId, toColumnId, position, updatedAt }` | Task was moved   |
| `task:created` | `{ task }`                                    | New task created |
| `task:deleted` | `{ taskId, columnId }`                        | Task deleted     |

# syncboard
