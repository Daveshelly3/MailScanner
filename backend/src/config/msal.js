import { ConfidentialClientApplication } from '@azure/msal-node';

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'common'}`,
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[MSAL]', message);
        }
      },
      piiLoggingEnabled: false,
      logLevel: 3,
    },
  },
};

export const msalClient = new ConfidentialClientApplication(msalConfig);

export const OAUTH_SCOPES = ['Mail.Read', 'User.Read', 'offline_access'];

export const getAuthCodeUrl = async (state) => {
  return msalClient.getAuthCodeUrl({
    scopes: OAUTH_SCOPES,
    redirectUri: process.env.AZURE_REDIRECT_URI,
    state,
  });
};

export const acquireTokenByCode = async (code) => {
  return msalClient.acquireTokenByCode({
    code,
    scopes: OAUTH_SCOPES,
    redirectUri: process.env.AZURE_REDIRECT_URI,
  });
};

export const acquireTokenSilent = async (account) => {
  return msalClient.acquireTokenSilent({
    account,
    scopes: OAUTH_SCOPES,
  });
};
