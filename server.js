const express = require('express');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const Parser = require('rss-parser');
const cron = require('node-cron');
const path = require('path');
const feeds = require('./feeds');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const FETCH_CRON = process.env.FETCH_CRON || '*/10 * * * *';

const db = new Database(path.join(__dirname, 'technews.db'));
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY, url TEXT UNIQUE NOT NULL, title TEXT NOT NULL,
  summary TEXT, source TEXT NOT NULL, category TEXT NOT NULL,
  image TEXT, published_at INTEGER NOT NULL, fetched_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_articles_pub ON articles(published_at DESC);
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id INTEGER NOT NULL, article_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, article_id));
`);

/* ---------- Auto-fetching ---------- */
const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'TechNewsBot/1.0 (+personal news reader)' },
  customFields: { item: [['media:content', 'media', { keepArray: false }], ['media:thumbnail', 'thumb']] }
});
const clean = (s = '', n = 280) => {
  const t = s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n).replace(/\s\S*$/, '') + '…' : t;
};
const pickImage = (it) =>
  it.media?.$?.url || it.thumb?.$?.url || it.enclosure?.url ||
  (it.content || it['content:encoded'] || '').match(/<img[^>]+src="([^"]+)"/i)?.[1] || null;

const insert = db.prepare(`INSERT OR IGNORE INTO articles
  (url,title,summary,source,category,image,published_at,fetched_at)
  VALUES (@url,@title,@summary,@source,@category,@image,@published_at,@fetched_at)`);

async function fetchAll() {
  let added = 0;
  await Promise.allSettled(feeds.map(async (f) => {
    try {
      const feed = await parser.parseURL(f.url);
      const now = Date.now();
      const tx = db.transaction((items) => {
        for (const it of items) {
          if (!it.link || !it.title) continue;
          const pub = Date.parse(it.isoDate || it.pubDate || '') || now;
          const r = insert.run({
            url: it.link, title: clean(it.title, 200),
            summary: clean(it.contentSnippet || it.summary || it.content || ''),
            source: f.source, category: f.category, image: pickImage(it),
            published_at: Math.min(pub, now), fetched_at: now
          });
          added += r.changes;
        }
      });
      tx(feed.items.slice(0, 40));
    } catch (e) { console.warn(`[feed] ${f.source} failed: ${e.message}`); }
  }));
  console.log(`[feed] ${new Date().toISOString()} added ${added} new articles`);
}
cron.schedule(FETCH_CRON, fetchAll);
fetchAll();

/* ---------- App + auth ---------- */
const app = express();
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
const setCookie = (res, user) => res.cookie('token',
  jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' }),
  { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 30 * 864e5 });
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });

function requireAuth(req, res, next) {
  try {
    const { id } = jwt.verify(req.cookies.token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(id);
    if (!user) throw 0;
    req.user = user; next();
  } catch { res.status(401).json({ error: 'Please log in.' }); }
}

app.post('/api/register', authLimiter, (req, res) => {
  const { name = '', email = '', password = '' } = req.body;
  if (name.trim().length < 2) return res.status(400).json({ error: 'Enter your name.' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  const e = email.trim().toLowerCase();
  if (db.prepare('SELECT 1 FROM users WHERE email=?').get(e))
    return res.status(409).json({ error: 'An account with this email already exists. Try logging in.' });
  const info = db.prepare('INSERT INTO users (name,email,password_hash,created_at) VALUES (?,?,?,?)')
    .run(name.trim(), e, bcrypt.hashSync(password, 12), Date.now());
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid);
  setCookie(res, user); res.json(publicUser(user));
});

app.post('/api/login', authLimiter, (req, res) => {
  const { email = '', password = '' } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  setCookie(res, user); res.json(publicUser(user));
});

app.post('/api/logout', (req, res) => { res.clearCookie('token'); res.json({ ok: true }); });
app.get('/api/me', requireAuth, (req, res) => res.json(publicUser(req.user)));

/* ---------- Public Landing Page API ---------- */
app.get('/api/public-preview', (req, res) => {
  try {
    const { category } = req.query;
    const where = category ? 'WHERE category = ?' : '';
    const args = category ? [category] : [];
    const rows = db.prepare(`SELECT id, url, title, summary, source, category, image, published_at FROM articles ${where} ORDER BY published_at DESC LIMIT 8`).all(...args);
    res.json(rows);
  } catch (e) {
    res.json([]);
  }
});

app.get('/api/public-categories', (req, res) => {
  try {
    res.json(db.prepare('SELECT category, COUNT(*) n FROM articles GROUP BY category ORDER BY n DESC').all());
  } catch (e) {
    res.json([]);
  }
});

/* ---------- News API ---------- */
app.get('/api/categories', requireAuth, (req, res) =>
  res.json(db.prepare('SELECT category, COUNT(*) n FROM articles GROUP BY category ORDER BY n DESC').all()));

app.get('/api/news', requireAuth, (req, res) => {
  const { category, q, saved, before } = req.query;
  const where = [], args = { uid: req.user.id };
  if (category) { where.push('a.category = @category'); args.category = category; }
  if (q) { where.push('(a.title LIKE @q OR a.summary LIKE @q)'); args.q = `%${q}%`; }
  if (saved === '1') where.push('b.user_id IS NOT NULL');
  if (before) { where.push('a.published_at < @before'); args.before = Number(before); }
  const rows = db.prepare(`
    SELECT a.*, b.user_id IS NOT NULL AS saved FROM articles a
    LEFT JOIN bookmarks b ON b.article_id = a.id AND b.user_id = @uid
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY a.published_at DESC LIMIT 30`).all(args);
  res.json(rows);
});

// How many articles arrived since the page was loaded (drives the "new stories" banner)
app.get('/api/news/new-count', requireAuth, (req, res) =>
  res.json(db.prepare('SELECT COUNT(*) n FROM articles WHERE fetched_at > ?').get(Number(req.query.since) || 0)));

app.post('/api/bookmarks/:id', requireAuth, (req, res) => {
  const args = [req.user.id, Number(req.params.id)];
  const had = db.prepare('DELETE FROM bookmarks WHERE user_id=? AND article_id=?').run(...args).changes;
  if (!had) db.prepare('INSERT OR IGNORE INTO bookmarks VALUES (?,?)').run(...args);
  res.json({ saved: !had });
});

function startServer(p) {
  const server = app.listen(p, () => console.log(`TechTide running at http://localhost:${p}`));
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[server] Port ${p} in use, trying http://localhost:${Number(p) + 1}...`);
      startServer(Number(p) + 1);
    } else {
      console.error('[server] Error:', err);
    }
  });
}
startServer(PORT);
