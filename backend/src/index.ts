import cors from '@fastify/cors';
import Fastify from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import { boardRoutes } from './routes/board.routes.js';
import { setupSocket } from './socket/index.js';

const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_URL = process.env.CLIENT_URL || '*';

async function bootstrap() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: CLIENT_URL,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  });

  const io = new SocketIOServer(app.server, {
    cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] },
  });

  setupSocket(io);
  await boardRoutes(app, io);

  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  await app.ready();

  await app.listen({ port: PORT, host: '0.0.0.0' });

  console.log(`\n🚀 SyncBoard API running on http://localhost:${PORT}`);
  console.log(`   WebSocket server ready on ws://localhost:${PORT}\n`);
}

bootstrap().catch((e) => {
  console.error(e);
  process.exit(1);
});
