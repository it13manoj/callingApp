import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authRouter, authenticateToken } from './auth.js';
import { storage } from './storage.js';
import { setupSocketHandlers } from './socketHandler.js';
import { createHmac } from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Socket.io configuration
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);

app.get('/api/rtc-config', authenticateToken, (req, res) => {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ];
  const turnUrls = (process.env.TURN_URLS || '')
    .split(',')
    .map(url => url.trim())
    .filter(Boolean);

  if (turnUrls.length) {
    const sharedSecret = process.env.TURN_SHARED_SECRET;
    if (!sharedSecret) {
      return res.status(503).json({ error: 'TURN_SHARED_SECRET is required when TURN_URLS is set' });
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const username = `${expiresAt}:${req.user.id}`;
    const credential = createHmac('sha1', sharedSecret).update(username).digest('base64');
    iceServers.push({ urls: turnUrls, username, credential });
  }

  res.set('Cache-Control', 'no-store');
  return res.json({ iceServers });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'NexCall Server', timestamp: new Date().toISOString() });
});

// Get user directory / contacts (requires token)
app.get('/api/users', authenticateToken, (req, res) => {
  try {
    const users = storage.getAllUsers(req.user.id);
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get call history for current user
app.get('/api/calls/history', authenticateToken, (req, res) => {
  try {
    const history = storage.getUserCallHistory(req.user.id);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch call history' });
  }
});

// Serve frontend static build if available
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Attach WebRTC Socket Signaling
setupSocketHandlers(io);

const PORT = process.env.PORT || 6003;
server.listen(PORT, () => {
  console.log(`🚀 NexCall Server running on http://localhost:${PORT}`);
});

