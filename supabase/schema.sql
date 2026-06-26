-- Run this in your Supabase project's SQL editor (Database > SQL Editor)

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tags (
  id            TEXT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT NOT NULL,
  is_predefined BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sections (
  id            TEXT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT '',
  date          TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  is_reminder   BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_date TEXT,
  is_pinned     BOOLEAN NOT NULL DEFAULT FALSE,
  blocks        JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS section_tags (
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  tag_id     TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (section_id, tag_id)
);

CREATE TABLE IF NOT EXISTS documents (
  id         TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL DEFAULT '',
  color      TEXT NOT NULL DEFAULT '#9b6fdb',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS sections_user_id ON sections(user_id);
CREATE INDEX IF NOT EXISTS sections_date    ON sections(date DESC);
CREATE INDEX IF NOT EXISTS tags_user_id     ON tags(user_id);
CREATE INDEX IF NOT EXISTS documents_user_id ON documents(user_id);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE tags         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents    ENABLE ROW LEVEL SECURITY;

-- Each user sees only their own rows
CREATE POLICY "tags: own rows"     ON tags     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "sections: own rows" ON sections FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "docs: own rows"     ON documents FOR ALL USING (auth.uid() = user_id);

-- section_tags: allow if the section belongs to the requesting user
CREATE POLICY "section_tags: own sections" ON section_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM sections WHERE sections.id = section_id AND sections.user_id = auth.uid())
  );

-- ── Google OAuth (set up in Supabase dashboard) ───────────────────────────────
-- Authentication > Providers > Google
-- Add your Google OAuth Client ID and Secret from Google Cloud Console.
-- Authorised redirect URIs to add in Google Cloud Console:
--   https://<your-project>.supabase.co/auth/v1/callback   (web)
--   tide://auth/callback                                   (Android deep link)

-- ── Storage: section images ───────────────────────────────────────────────────
-- Run in Supabase SQL Editor after creating the 'section-images' bucket:
--   Storage > New bucket > Name: section-images, Public: ON

INSERT INTO storage.buckets (id, name, public)
VALUES ('section-images', 'section-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "images: upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'section-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read of all images
CREATE POLICY "images: public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'section-images');

-- Allow users to delete their own images
CREATE POLICY "images: delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'section-images' AND (storage.foldername(name))[1] = auth.uid()::text);
