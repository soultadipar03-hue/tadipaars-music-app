const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      google_access_token TEXT NOT NULL,
      google_refresh_token TEXT NOT NULL,
      access_code VARCHAR(9) UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS albums (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      cover_drive_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS songs (
      id SERIAL PRIMARY KEY,
      album_id INTEGER REFERENCES albums(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      drive_file_id TEXT NOT NULL,
      duration INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('Database tables initialized');
}

module.exports = { pool, initDB };
