import { acquireTokenSilent } from '../config/msal.js';

export const requireAuth = async (req, res, next) => {
  if (!req.session.userId || !req.session.accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const now = Date.now();
  const expiry = req.session.tokenExpiry || 0;
  const fiveMinutes = 5 * 60 * 1000;

  if (expiry - now < fiveMinutes && req.session.msalAccount) {
    try {
      const refreshed = await acquireTokenSilent(req.session.msalAccount);
      req.session.accessToken = refreshed.accessToken;
      req.session.tokenExpiry = refreshed.expiresOn?.getTime();
    } catch (err) {
      console.error('[Auth] Token refresh failed:', err.message);
      req.session.destroy();
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
  }

  next();
};
