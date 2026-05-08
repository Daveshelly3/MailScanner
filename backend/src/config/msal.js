import { ConfidentialClientApplication } from '@azure/msal-node';

export const OAUTH_SCOPES = ['Mail.Read', 'User.Read', 'offline_access'];

export const isAzureConfigured = () =>
  Boolean(process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET);

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!isAzureConfigured()) {
    throw new Error('Azure OAuth not configured. Set AZURE_CLIENT_ID and AZURE_CLIENT_SECRET in .env.');
  }
  _client = new ConfidentialClientApplication({
    auth: {
      clientId: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'common'}`,
    },
  });
  return _client;
}

export const getAuthCodeUrl = (state) =>
  getClient().getAuthCodeUrl({
    scopes: OAUTH_SCOPES,
    redirectUri: process.env.AZURE_REDIRECT_URI || `${process.env.FRONTEND_URL}/auth/callback`,
    state,
  });

export const acquireTokenByCode = (code) =>
  getClient().acquireTokenByCode({
    code,
    scopes: OAUTH_SCOPES,
    redirectUri: process.env.AZURE_REDIRECT_URI || `${process.env.FRONTEND_URL}/auth/callback`,
  });

export const acquireTokenSilent = (account) =>
  getClient().acquireTokenSilent({ account, scopes: OAUTH_SCOPES });
