// Unified email-fetch facade. Uses Microsoft Graph API when the user is
// signed in via Azure OAuth (the standard standalone path), and falls back
// to the MCP server when running inside a Claude Code session or when
// MCP_SERVER_URL is explicitly configured.

import * as graph from './graphService.js';
import * as mcp from './mcpClient.js';
import { isAzureConfigured } from '../config/msal.js';

function preferMcp(req) {
  // Use MCP only when the user is NOT logged in via Azure (or Azure isn't configured)
  // and an MCP source is available.
  if (req?.session?.accessToken) return false;
  if (!isAzureConfigured() && (process.env.MCP_SERVER_URL || canAutoDetectMcp())) return true;
  return false;
}

function canAutoDetectMcp() {
  try {
    const { readdirSync } = require('fs');
    return readdirSync('/tmp').some((f) => f.startsWith('mcp-config-'));
  } catch { return false; }
}

export async function fetchEmails(req, opts) {
  if (preferMcp(req)) return mcp.fetchEmails(opts);
  if (!req.session?.accessToken) {
    const err = new Error('Not authenticated');
    err.statusCode = 401;
    throw err;
  }
  return graph.fetchEmails({ accessToken: req.session.accessToken, ...opts });
}

export async function fetchEmailBody(req, { uri, messageId }) {
  if (preferMcp(req)) return mcp.fetchEmailBody(uri);
  if (!req.session?.accessToken) return null;
  try {
    return await graph.fetchEmailBody({ accessToken: req.session.accessToken, messageId });
  } catch (err) {
    console.warn('[Email] Body fetch failed:', err.message);
    return null;
  }
}

export async function fetchThreadMessages(req, { conversationId }) {
  if (preferMcp(req)) return mcp.fetchThreadMessages(conversationId);
  if (!req.session?.accessToken) return [];
  try {
    return await graph.fetchThreadMessages({ accessToken: req.session.accessToken, conversationId });
  } catch (err) {
    console.warn('[Email] Thread fetch failed:', err.message);
    return [];
  }
}

export function authMode() {
  if (isAzureConfigured()) return 'azure';
  if (process.env.MCP_SERVER_URL || canAutoDetectMcp()) return 'mcp';
  return 'none';
}
