import Database from 'better-sqlite3';

const db = new Database('creator_os.db');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS brands (
    user_id TEXT PRIMARY KEY,
    name TEXT,
    tagline TEXT,
    archetype TEXT,
    personality TEXT,
    colors TEXT, -- JSON string
    typography TEXT, -- JSON string
    visual_style TEXT,
    thumbnail_style TEXT,
    content_hooks TEXT, -- JSON string
    catchphrases TEXT, -- JSON string
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS content (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT,
    body TEXT,
    type TEXT, -- 'post', 'script', 'video'
    platform TEXT, -- 'tiktok', 'instagram', 'youtube', 'linkedin', 'twitter'
    status TEXT, -- 'draft', 'scheduled', 'published'
    score INTEGER,
    score_feedback TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    date DATE DEFAULT CURRENT_DATE,
    followers INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    engagement INTEGER DEFAULT 0,
    revenue_est REAL DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS streaks (
    user_id TEXT PRIMARY KEY,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_publish_date DATE,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS challenges (
    user_id TEXT PRIMARY KEY,
    day_number INTEGER DEFAULT 1,
    stage TEXT DEFAULT 'idea_discovery', -- 'idea_discovery', 'writing', 'publishing', 'growth', 'monetization'
    completed_days TEXT, -- JSON array of completed day numbers
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_accounts (
    user_id TEXT,
    platform TEXT, -- 'youtube', 'tiktok', etc.
    access_token TEXT,
    refresh_token TEXT,
    expiry_date INTEGER,
    profile_data TEXT, -- JSON string
    PRIMARY KEY (user_id, platform),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

export default db;
