import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';

import authRoutes from './routes/auth.js';
import scanRoutes from './routes/scan.js';
import actionsRoutes from './routes/actions.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
}));

app.use(express.json({ limit: '1mb' }));

const PgSession = connectPgSimple(session);
const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

app.use(session({
  store: new PgSession({
    pool: pgPool,
    tableName: 'user_sessions',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
}));

const scanLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred' });
});

app.listen(PORT, () => {
  console.log(`MailScanner API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
