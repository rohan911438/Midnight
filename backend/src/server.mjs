import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import ordersRouter from './routes/orders.mjs';
import matchesRouter from './routes/matches.mjs';
import db from './db.mjs';

// Root .env (one level above backend/) holds the shared preview-network
// config used by both this server and scripts/deploy.mjs.
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.env') });

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Order/match submission triggers real proof generation -- cheap to abuse
// otherwise. Generous enough for a live demo, tight enough to matter.
app.use(
  '/api/',
  rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, network: process.env.NETWORK ?? 'preview' });
});

app.use('/api/orders', ordersRouter);
app.use('/api/matches', matchesRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.statusCode ?? 500).json({ error: err.message ?? 'Internal error' });
});

const port = Number(process.env.BACKEND_PORT ?? 4000);
const server = app.listen(port, () => {
  console.log(`Private Swap backend listening on http://localhost:${port} (network: ${process.env.NETWORK ?? 'preview'})`);
});

// Closes the SQLite file handle cleanly so scripts/reset-demo.mjs (or a
// plain restart) doesn't hit Windows' EPERM-on-open-file the moment
// afterward -- verified against that exact failure mode this session.
function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
