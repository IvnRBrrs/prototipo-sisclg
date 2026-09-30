CREATE TABLE IF NOT EXISTS content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pages (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  show_in_menu INTEGER DEFAULT 1,
  parent_slug TEXT,
  menu_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (parent_slug) REFERENCES pages(slug)
);

CREATE TABLE IF NOT EXISTS page_content (
  page_slug TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  PRIMARY KEY (page_slug, key),
  FOREIGN KEY (page_slug) REFERENCES pages(slug)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  data TEXT NOT NULL,
  type TEXT NOT NULL,
  component_type TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS content_backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_key TEXT NOT NULL,
  value TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  author TEXT DEFAULT '',
  date TEXT NOT NULL,
  tags TEXT DEFAULT '[]',
  images TEXT DEFAULT '[]',
  videos TEXT DEFAULT '[]',
  slug TEXT UNIQUE,
  published INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
