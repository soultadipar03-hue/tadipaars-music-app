-- Run this in your Supabase project: Dashboard → SQL Editor → New query

-- Users: stores Google OAuth tokens and the unique access code
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_access_token TEXT,
  google_refresh_token TEXT,
  access_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Albums: belongs to a user, holds a name and optional cover image URL
CREATE TABLE IF NOT EXISTS albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Songs: metadata only — actual MP3 lives in Google Drive
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  drive_file_id TEXT,
  drive_link TEXT,
  duration INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
