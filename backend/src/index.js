require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Restrict CORS to the actual frontend domain only
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5000';
app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin requests (no origin header) and the configured frontend
    if (!origin || origin === ALLOWED_ORIGIN) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// Rate limit the verify endpoint — max 5 attempts per 15 min per IP
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait 15 minutes before trying again.' },
  skipSuccessfulRequests: true, // only count failed attempts
});
app.use('/api/auth/verify', verifyLimiter);

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/albums', require('./routes/albums'));
app.use('/api/songs', require('./routes/songs'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Serve frontend static files in production
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// All non-API routes serve the React app
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to init DB:', err);
  process.exit(1);
});
