require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/albums', require('./routes/albums'));
app.use('/api/songs', require('./routes/songs'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Serve frontend static files in production
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// All non-API routes serve the React app
app.get('*', (req, res) => {
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
