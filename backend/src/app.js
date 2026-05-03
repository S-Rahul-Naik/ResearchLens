require('dotenv').config();
const express = require('express');
const cors = require('cors');
const modulesRouter = require('./routes/modules');
const authRouter = require('./routes/auth');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'researchlens-backend' });
});

app.use('/api/auth', authRouter);
app.use('/api', modulesRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Unknown error'
  });
});

module.exports = app;
