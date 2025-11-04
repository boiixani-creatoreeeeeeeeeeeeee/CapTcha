import express from 'express';
import puppeteer from 'puppeteer';
import { initDb } from '../db.js';

const router = express.Router();
const dbPromise = initDb();

const patterns = {
  recaptcha: [/recaptcha/i, /grecaptcha/i, /data-sitekey/i],
  hcaptcha: [/hcaptcha/i, /h-captcha/i],
  image: [/captcha.*\.(png|jpg|jpeg|gif)/i, /captcha.*image/i],
  custom: [/captcha.*\.php/i, /verify.*code/i],
};

async function detectCaptcha(html) {
  const found = [];
  for (const [type, regexes] of Object.entries(patterns)) {
    for (const re of regexes) {
      if (re.test(html)) {
        found.push({ type: type.toUpperCase(), confidence: 90 });
        break;
      }
    }
  }
  return found.length ? found : [{ type: 'None', confidence: 0 }];
}

router.post('/', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Login required' });

  const { url } = req.body;
  if (!url?.startsWith('http')) return res.status(400).json({ error: 'Invalid URL' });

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    const html = await page.content();
    const captchas = await detectCaptcha(html);

    const db = await dbPromise;
    await db.run(
      'INSERT INTO scans (user_id, url, result) VALUES (?, ?, ?)',
      [req.session.userId, url, JSON.stringify(captchas)]
    );

    res.json({ url, captchas });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Scan failed' });
  } finally {
    if (browser) await browser.close();
  }
});

router.get('/history', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Login required' });

  const db = await dbPromise;
  const rows = await db.all(
    'SELECT url, result, scanned_at FROM scans WHERE user_id = ? ORDER BY scanned_at DESC LIMIT 50',
    [req.session.userId]
  );
  res.json(rows.map(r => ({ ...r, result: JSON.parse(r.result) })));
});

export default router;
