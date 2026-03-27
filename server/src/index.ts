// ===== STATIC ORBIT — Server Entry Point =====

import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/types.js';
import { initHandlers } from './socket/handlers.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST'],
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: 'STATIC ORBIT Server', timestamp: Date.now() });
});

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Wire up all socket event handlers
initHandlers(io);

httpServer.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║        STATIC ORBIT — Server v0.1        ║');
  console.log('║                                          ║');
  console.log(`║   Listening on http://localhost:${PORT}     ║`);
  console.log('║   Awaiting connections...                ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});
