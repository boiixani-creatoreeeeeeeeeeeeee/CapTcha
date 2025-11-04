import express from 'express';
import bcrypt from 'bcrypt';
import { initDb } from '../db.js';

const router = express.Router();
const dbPromise = initDb();

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  const db = await dbPromise;
  const hash = await bcrypt.hash(password, 10);
  try {
    await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash]);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'Username already taken' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const db = await dbPromise;
  const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ success: true });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

router.get('/me', (req, res) => {
  if (req.session.userId) {
    res.json({ username: req.session.username });
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

export default router;
