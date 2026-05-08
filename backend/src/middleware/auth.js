import { acquireTokenSilent, isAzureConfigured } from '../config/msal.js';
import { setupMode } from '../services/emailService.js';

export const requireAuth = async (req, res, next) => {
  // IMAP and MCP modes don't require interactive sign-in — credentials live in env
  const mode = setupMode();
  if (mode === 'imap' || mode === 'mcp') return next();

  if (!req.session?.userId || !req.session?.accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const now = Date.now();
  const expiry = req.session.tokenExpiry || 0;
  const fiveMinutes = 5 * 60 * 1000;

  if (expiry - now < fiveMinutes && req.session.msalAccount && isAzureConfigured()) {
    try {
      const refreshed = await acquireTokenSilent(req.session.msalAccount);
      req.session.accessToken = refreshed.accessToken;
      req.session.tokenExpiry = refreshed.expiresOn?.getTime();
    } catch (err) {
      console.error('[Auth] Token refresh failed:', err.message);
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
  }

  next();
};
