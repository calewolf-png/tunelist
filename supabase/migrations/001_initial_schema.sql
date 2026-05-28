-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Standards (global DB, pre-seeded)
CREATE TABLE standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  composer TEXT[] NOT NULL DEFAULT '{}',
  year_composed INTEGER,
  original_key TEXT,
  time_signature TEXT NOT NULL DEFAULT '4/4',
  tempo_feel TEXT CHECK (tempo_feel IN ('ballad', 'medium', 'up-tempo', 'variable')),
  form TEXT CHECK (form IN ('blues', 'rhythm-changes')),
  era_tags TEXT[] NOT NULL DEFAULT '{}',
  feel_tags TEXT[] NOT NULL DEFAULT '{}',
  factoid TEXT,
  is_official BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'official' CHECK (status IN ('official', 'pending', 'submitted')),
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recordings (semi-global)
CREATE TABLE recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id UUID NOT NULL REFERENCES standards(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('spotify', 'apple_music', 'amazon_music')),
  external_url TEXT NOT NULL,
  external_id TEXT,
  artist TEXT NOT NULL,
  album_title TEXT,
  album_art_url TEXT,
  year_recorded INTEGER,
  duration_ms INTEGER,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User's collection of standards
CREATE TABLE user_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  standard_id UUID NOT NULL REFERENCES standards(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'know' CHECK (status IN ('know', 'learning', 'want_to_learn')),
  favorite_recording_id UUID REFERENCES recordings(id) ON DELETE SET NULL,
  notes TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, standard_id)
);

-- User's saved recordings
CREATE TABLE user_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, recording_id)
);

-- Standard submission requests
CREATE TABLE standard_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  composer TEXT,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  upvotes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  standard_id UUID REFERENCES standards(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_standards_title ON standards USING gin(to_tsvector('english', title));
CREATE INDEX idx_standards_status ON standards(status);
CREATE INDEX idx_standards_form ON standards(form);
CREATE INDEX idx_recordings_standard_id ON recordings(standard_id);
CREATE INDEX idx_user_standards_user_id ON user_standards(user_id);
CREATE INDEX idx_user_standards_standard_id ON user_standards(standard_id);
CREATE INDEX idx_user_recordings_user_id ON user_recordings(user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER standards_updated_at BEFORE UPDATE ON standards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Row Level Security
ALTER TABLE standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE standard_requests ENABLE ROW LEVEL SECURITY;

-- Standards: anyone can read official, users can submit
CREATE POLICY "standards_read" ON standards FOR SELECT USING (
  status = 'official' OR submitted_by = auth.uid()
);
CREATE POLICY "standards_insert" ON standards FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND is_official = false
);

-- Recordings: anyone can read, authed users can insert
CREATE POLICY "recordings_read" ON recordings FOR SELECT USING (true);
CREATE POLICY "recordings_insert" ON recordings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Profiles: public profiles readable by all, private only by owner
CREATE POLICY "profiles_read" ON profiles FOR SELECT USING (
  is_public = true OR id = auth.uid()
);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid());

-- User standards: only owner
CREATE POLICY "user_standards_read" ON user_standards FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_standards_insert" ON user_standards FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_standards_update" ON user_standards FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "user_standards_delete" ON user_standards FOR DELETE USING (user_id = auth.uid());

-- User recordings: only owner
CREATE POLICY "user_recordings_read" ON user_recordings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_recordings_insert" ON user_recordings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_recordings_delete" ON user_recordings FOR DELETE USING (user_id = auth.uid());

-- Standard requests: authed users can read/insert, owner can update
CREATE POLICY "requests_read" ON standard_requests FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "requests_insert" ON standard_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "requests_update" ON standard_requests FOR UPDATE USING (requested_by = auth.uid());
