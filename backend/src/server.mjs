import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import ordersRouter from './routes/orders.mjs';
import matchesRouter from './routes/matches.mjs';

// Root .env (one level above backend/) holds the shared preview-network
// config used by both this server and scripts/deploy.mjs.
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.env') });

const app = express();
app.use(cors());
app.use(express.json());

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
app.listen(port, () => {
  console.log(`Private Swap backend listening on http://localhost:${port} (network: ${process.env.NETWORK ?? 'preview'})`);
});
