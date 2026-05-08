// Unified email-fetch facade. Selects between three sources in priority order:
//   1. IMAP   — IMAP_USER + IMAP_PASSWORD set (recommended for most users)
//   2. Azure  — AZURE_CLIENT_ID + AZURE_CLIENT_SECRET set, user signed in
//   3. MCP    — MCP_SERVER_URL set or auto-detected from a Claude Code session

import * as graph from './graphService.js';
import * as imap  from './imapService.js';
import * as mcp   from './mcpClient.js';
import { isAzureConfigured } from '../config/msal.js';
import { isImapConfigured } from './imapService.js';
import { readdirSync } from 'fs';

function autoDetectMcp() {
  try { return readdirSync('/tmp').some((f) => f.startsWith('mcp-config-')); }
  catch { return false; }
}

export function authMode(req) {
  if (isImapConfigured()) return 'imap';
  if (process.env.MCP_SERVER_URL) return 'mcp';
  if (isAzureConfigured()) return 'azure';
  if (autoDetectMcp()) return 'mcp';
  return 'none';
}

// Login mode for the frontend — distinguishes "needs sign-in" (azure)
// from "ready" (imap/mcp) from "not configured" (none).
export function setupMode() {
  if (isImapConfigured()) return 'imap';
  if (isAzureConfigured()) return 'azure';
  if (process.env.MCP_SERVER_URL || autoDetectMcp()) return 'mcp';
  return 'none';
}

function pick(req) {
  const m = authMode(req);
  if (m === 'imap') return 'imap';
  if (m === 'mcp')  return 'mcp';
  if (m === 'azure' && req?.session?.accessToken) return 'azure';
  return null;
}

export async function fetchEmails(req, opts) {
  const m = pick(req);
  if (m === 'imap')  return imap.fetchEmails(opts);
  if (m === 'mcp')   return mcp.fetchEmails(opts);
  if (m === 'azure') return graph.fetchEmails({ accessToken: req.session.accessToken, ...opts });

  const err = new Error(setupMode() === 'azure' ? 'Not authenticated' : 'No email source configured');
  err.statusCode = setupMode() === 'azure' ? 401 : 500;
  throw err;
}

export async function fetchEmailBody(req, { uri, messageId }) {
  const m = pick(req);
  try {
    if (m === 'imap')  return await imap.fetchEmailBody({ messageId });
    if (m === 'mcp')   return await mcp.fetchEmailBody(uri);
    if (m === 'azure') return await graph.fetchEmailBody({ accessToken: req.session.accessToken, messageId });
  } catch (err) {
    console.warn('[Email] Body fetch failed:', err.message);
  }
  return null;
}

export async function fetchThreadMessages(req, { conversationId }) {
  const m = pick(req);
  try {
    if (m === 'imap')  return await imap.fetchThreadMessages({ conversationId });
    if (m === 'mcp')   return await mcp.fetchThreadMessages(conversationId);
    if (m === 'azure') return await graph.fetchThreadMessages({ accessToken: req.session.accessToken, conversationId });
  } catch (err) {
    console.warn('[Email] Thread fetch failed:', err.message);
  }
  return [];
}
