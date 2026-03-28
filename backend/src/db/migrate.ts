import { sql } from './client.js';

async function migrate() {
  console.log('Running migrations...');

  await sql`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto"
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS boards (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS columns (
      id         TEXT PRIMARY KEY,
      board_id   UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      position   INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      column_id          TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
      title              TEXT NOT NULL CHECK (char_length(title) <= 100),
      description        TEXT,
      priority           TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
      assignee_initials  TEXT NOT NULL DEFAULT 'UN',
      assignee_color     TEXT NOT NULL DEFAULT 'purple',
      position           INTEGER NOT NULL DEFAULT 0,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Indexes for fast lookups
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_position  ON tasks(column_id, position)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_columns_board   ON columns(board_id, position)`;

  // Seed board
  const [existing] = await sql`SELECT id FROM boards LIMIT 1`;
  if (existing) {
    console.log('Seed data already exists, skipping.');
    await sql.end();
    return;
  }

  const [board] = await sql`
    INSERT INTO boards (name) VALUES ('SyncBoard') RETURNING id
  `;

  await sql`
    INSERT INTO columns (id, board_id, title, position) VALUES
      ('backlog',    ${board.id}, 'Backlog',     0),
      ('todo',       ${board.id}, 'To Do',       1),
      ('inprogress', ${board.id}, 'In Progress', 2),
      ('done',       ${board.id}, 'Done',        3)
  `;

  await sql`
    INSERT INTO tasks (column_id, title, description, priority, assignee_initials, assignee_color, position) VALUES
      ('backlog',    'API Implementation', 'Implicit implementation''s API comparoitors.',         'high',   'JD', 'purple', 0),
      ('backlog',    'Schema Design',      'Design a schema and schema integration.',               'medium', 'AM', 'teal',   1),
      ('backlog',    'WebSocket Setup',    'Configure update task for using WebSocket Setup.',      'high',   'RK', 'orange', 2),
      ('todo',       'Schema Design',      'Design a schema and schema integration.',               'medium', 'AM', 'teal',   0),
      ('inprogress', 'WebSocket Setup',    'Setup concelists with WebSocket or oppole lows.',       'high',   'AM', 'teal',   0),
      ('inprogress', 'Auth Integration',   'Converts auth integration, with integration and services.', 'low', 'KL', 'orange', 1),
      ('done',       'UI Refinement',      'Derineas a UI rection and a UI content collaboroate.', 'low',    'KL', 'orange', 0),
      ('done',       'UI Refinement',      'Derineas a UI nenirom UI integration.',                'low',    'KL', 'orange', 1)
  `;

  console.log('Migration and seed complete. Board ID:', board.id);
  await sql.end();
}

migrate().catch((e) => { console.error(e); process.exit(1); });
