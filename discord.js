// api/discord.js  (Node.js + Vercel)
export const config = { api: { bodyParser: false } };

import { Buffer } from 'buffer';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'No code' });

  const CLIENT_ID = '963238863256567848';
  const CLIENT_SECRET = 'YOUR_REAL_CLIENT_SECRET'; // PASTE HERE
  const REDIRECT_URI = 'https://capovh.github.io/CapTcha/dashboard.html';

  const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    console.error('Token error:', err);
    return res.status(400).json({ error: 'Invalid code', details: err });
  }

  const tokens = await tokenResponse.json();

  const userResponse = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userResponse.ok) return res.status(400).json({ error: 'User fetch failed' });

  const user = await userResponse.json();
  user.avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
    : `https://cdn.discordapp.com/embed/avatars/${(user.discriminator || 0) % 5}.png`;

  res.status(200).json({
    id: user.id,
    username: user.username,
    global_name: user.global_name,
    email: user.email,
    avatar: user.avatarUrl,
  });
}
