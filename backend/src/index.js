import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import betterSqlite3SessionStore from 'better-sqlite3-session-store';
import Database from 'better-sqlite3';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

import authRoutes from './routes/auth.js';
import scanRoutes from './routes/scan.js';
import actionsRoutes from './routes/actions.js';
import { authMode } from './services/emailService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = join(__dirname, '../../frontend/dist');
const SERVE_STATIC = existsSync(FRONTEND_DIST);

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || `http://localhost:${PORT}`,
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
}));

app.use(express.json({ limit: '1mb' }));

// SQLite session store
const SqliteStore = betterSqlite3SessionStore(session);
const sessionsDbPath = join(__dirname, '..', 'sessions.db');
mkdirSync(dirname(sessionsDbPath), { recursive: true });
const sessionsDb = new Database(sessionsDbPath);

app.use(session({
  store: new SqliteStore({
    client: sessionsDb,
    expired: { clear: true, intervalMs: 15 * 60 * 1000 },
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge:   8 * 60 * 60 * 1000, // 8 hours
    sameSite: 'lax',
  },
}));

const scanLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.session?.userId || req.ip,
  message: { error: 'Too many scan requests. Please wait before scanning again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/auth', authRoutes);
app.use('/scan', scanLimiter, scanRoutes);
app.use('/actions', actionsRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', mode: authMode(), timestamp: new Date().toISOString() });
});

if (SERVE_STATIC) {
  app.use(express.static(FRONTEND_DIST));
  app.get(/^(?!\/auth|\/scan|\/actions|\/health).*/, (req, res) => {
    res.sendFile(join(FRONTEND_DIST, 'index.html'));
  });
} else {
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
}

app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred' });
});

app.listen(PORT, () => {
  console.log(`MailScanner API running on port ${PORT}`);
  console.log(`Auth mode: ${authMode()}`);
  console.log(`Open: http://localhost:${PORT}`);
});
