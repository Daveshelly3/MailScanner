import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getAuthCodeUrl, acquireTokenByCode, acquireTokenSilent } from '../config/msal.js';
import { prisma } from '../services/db.js';

const router = Router();

router.get('/login', async (req, res) => {
  try {
    const state = uuidv4();
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

  if (error) {
    const msg = encodeURIComponent(error_description || error);
    return res.redirect(`${process.env.FRONTEND_URL}/?error=${msg}`);
  }

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}/?error=No+authorization+code+received`);
  }

  if (state !== req.session.oauthState) {
    return res.redirect(`${process.env.FRONTEND_URL}/?error=Invalid+state+parameter`);
  }

  try {
    const tokenResponse = await acquireTokenByCode(code);

    const { account, accessToken, expiresOn } = tokenResponse;

    let user = await prisma.user.findUnique({
      where: { microsoftId: account.homeAccountId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          microsoftId: account.homeAccountId,
          email: account.username,
          displayName: account.name || account.username,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { displayName: account.name || account.username },
      });
    }

    req.session.userId = user.id;
    req.session.accessToken = accessToken;
    req.session.tokenExpiry = expiresOn?.getTime();
    req.session.msalAccount = account;
    req.session.oauthState = null;

    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (err) {
    console.error('[Auth] Callback error:', err);
    const msg = encodeURIComponent('Authentication failed. Please try again.');
    res.redirect(`${process.env.FRONTEND_URL}/?error=${msg}`);
  }
});

router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, email: true, displayName: true },
    });

    if (!user) {
      req.session.destroy();
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    console.error('[Auth] /me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('[Auth] Logout error:', err);
    res.json({ success: true });
  });
});

export default router;
