import { Router } from 'express';
import { randomUUID } from 'crypto';
import {
  getAuthCodeUrl,
  acquireTokenByCode,
  isAzureConfigured,
} from '../config/msal.js';
import { setupMode } from '../services/emailService.js';
import { prisma } from '../services/db.js';

const router = Router();

router.get('/mode', (req, res) => {
  res.json({ mode: setupMode() });
});

router.get('/login', async (req, res) => {
  if (!isAzureConfigured()) {
    return res.status(400).json({
      error: 'Azure OAuth not configured. Add AZURE_CLIENT_ID and AZURE_CLIENT_SECRET to backend/.env, then restart.',
    });
  }
  try {
    const state = randomUUID();
    req.session.oauthState = state;
    const authUrl = await getAuthCodeUrl(state);
    res.json({ authUrl });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'Failed to generate login URL' });
  }
});

router.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  const fe = process.env.FRONTEND_URL || 'http://localhost:3001';

  if (error) {
    return res.redirect(`${fe}/?error=${encodeURIComponent(error_description || error)}`);
  }
  if (!code) {
    return res.redirect(`${fe}/?error=No+authorization+code+received`);
  }
  if (state !== req.session.oauthState) {
    return res.redirect(`${fe}/?error=Invalid+state+parameter`);
  }

  try {
    const tokenResponse = await acquireTokenByCode(code);
    const { account, accessToken, expiresOn } = tokenResponse;

    let user = await prisma.user.findUnique({ where: { microsoftId: account.homeAccountId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          microsoftId: account.homeAccountId,
          email:       account.username,
          displayName: account.name || account.username,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data:  { displayName: account.name || account.username },
      });
    }

    req.session.userId       = user.id;
    req.session.accessToken  = accessToken;
    req.session.tokenExpiry  = expiresOn?.getTime();
    req.session.msalAccount  = account;
    req.session.oauthState   = null;

    res.redirect(fe + '/');
  } catch (err) {
    console.error('[Auth] Callback error:', err);
    res.redirect(`${fe}/?error=${encodeURIComponent('Authentication failed. Please try again.')}`);
  }
});

router.get('/me', async (req, res) => {
  // IMAP and MCP modes: no Azure user, app is "logged in" automatically
  const mode = setupMode();
  if (mode === 'imap') {
    return res.json({
      user: { displayName: process.env.IMAP_USER, email: process.env.IMAP_USER, id: 'imap' },
      mode: 'imap',
    });
  }
  if (mode === 'mcp') {
    return res.json({
      user: { displayName: 'Claude Code Session', email: 'mcp', id: 'mcp' },
      mode: 'mcp',
    });
  }

  if (!req.session?.userId) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.session.userId },
      select: { id: true, email: true, displayName: true },
    });
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'User not found' });
    }
    res.json({ user, mode: 'azure' });
  } catch (err) {
    console.error('[Auth] /me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

export default router;
