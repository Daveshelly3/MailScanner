import { readFileSync, readdirSync } from 'fs';

function getMcpServerConfig() {
  // 1. Explicit env config wins (Windows / standalone deployments)
  if (process.env.MCP_SERVER_URL) {
    let headers = {};
    if (process.env.MCP_SERVER_HEADERS) {
      try { headers = JSON.parse(process.env.MCP_SERVER_HEADERS); }
      catch { console.warn('[MCP] MCP_SERVER_HEADERS is not valid JSON, ignoring'); }
    }
    // Auto-derive session/server headers from URL when running through
    // the Anthropic CCR proxy and headers were not supplied
    if (!Object.keys(headers).length && process.env.MCP_SERVER_URL.includes('api.anthropic.com')) {
      const sessionMatch = process.env.MCP_SERVER_URL.match(/ccr-sessions\/([^/]+)/);
      const serverMatch = process.env.MCP_SERVER_URL.match(/toolbox_mcp_server_id=([^&]+)/);
      if (sessionMatch) headers['X-Session-UUID'] = sessionMatch[1];
      if (serverMatch)  headers['X-MCP-Server-ID'] = serverMatch[1];
    }
    return { url: process.env.MCP_SERVER_URL, headers };
  }

  // 2. Auto-discover from Claude Code session config (works in CCR cloud only)
  try {
    const tmpFiles = readdirSync('/tmp').filter((f) => f.startsWith('mcp-config-'));
    if (tmpFiles.length) {
      const raw = readFileSync(`/tmp/${tmpFiles[0]}`, 'utf8');
      const config = JSON.parse(raw);
      const key = Object.keys(config.mcpServers).find(
        (k) => k !== 'github' && config.mcpServers[k].url?.includes('microsoft365')
      );
      if (key) {
        const s = config.mcpServers[key];
        return { url: s.url, headers: s.headers || {} };
      }
    }
  } catch { /* not in CCR environment */ }

  throw new Error(
    'No Outlook MCP server configured. Set MCP_SERVER_URL in .env or run inside a Claude Code session.'
  );
}

async function callTool(toolName, args) {
  const { url, headers } = getMcpServerConfig();

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      ...headers,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: toolName, arguments: args },
      id: Date.now(),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MCP call failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const contentType = res.headers.get('content-type') || '';
  let result;
  if (contentType.includes('text/event-stream')) {
    result = parseSseResponse(await res.text());
  } else {
    const json = await res.json();
    if (json.error) throw new Error(`MCP error: ${json.error.message}`);
    result = json.result;
  }

  return extractContent(result);
}

function parseSseResponse(raw) {
  for (const line of raw.split('\n')) {
    if (!line.startsWith('data:')) continue;
    try {
      const msg = JSON.parse(line.slice(5).trim());
      if (msg.result) return msg.result;
      if (msg.error)  throw new Error(`MCP SSE error: ${msg.error.message}`);
    } catch { /* skip unparseable lines */ }
  }
  throw new Error('No result found in SSE response');
}

function extractContent(result) {
  if (Array.isArray(result?.content)) {
    const text = result.content.find((c) => c.type === 'text');
    if (text) {
      try { return JSON.parse(text.text); } catch { return text.text; }
    }
  }
  return result;
}

const TIME_WINDOW_MAP = {
  '6h':    '6 hours ago',
  '24h':   '24 hours ago',
  '48h':   '48 hours ago',
  '3d':    '3 days ago',
  '7d':    '7 days ago',
  alltime: null,
};

export async function fetchEmails({ timeWindow, folder, maxCount }) {
  const since = TIME_WINDOW_MAP[timeWindow] ?? TIME_WINDOW_MAP['24h'];
  const limit = Math.min(Math.max(Number(maxCount) || 50, 5), 50);

  const args = { limit };
  if (since) args.afterDateTime = since;
  if (folder === 'inbox')   args.folderName = 'Inbox';
  if (folder === 'flagged') args.folderName = 'Flagged';

  const result = await callTool('outlook_email_search', args);

  // The MCP server may return a single email object, an array, or
  // a stream of objects concatenated as text — normalise to an array.
  let emails = [];
  if (Array.isArray(result))     emails = result;
  else if (result?.emails)       emails = result.emails;
  else if (result?.value)        emails = result.value;
  else if (typeof result === 'object' && result?.id) emails = [result];

  return emails.map((e) => ({
    id: e.id || e.messageId || String(Math.random()),
    subject: e.subject || '(No subject)',
    sender: {
      name: e.sender?.name || e.from?.name || (typeof e.sender === 'string' ? e.sender : 'Unknown'),
      email: e.sender?.email || e.from?.email || (typeof e.sender === 'string' ? e.sender : ''),
    },
    receivedAt: e.receivedDateTime || e.receivedAt || e.date,
    bodyPreview: (e.summary || e.bodyPreview || e.preview || '').slice(0, 500),
    uri: e.uri || (e.id ? `mail:///messages/${e.id}` : null),
    conversationId: e.conversationId || null,
  }));
}

export async function fetchEmailBody(uri) {
  if (!uri) return null;
  try {
    const result = await callTool('read_resource', { uri });
    return result?.body?.content || result?.body || result?.content || null;
  } catch (err) {
    console.warn('[MCP] read_resource failed for', uri, err.message);
    return null;
  }
}

export async function fetchThreadMessages(conversationId) {
  if (!conversationId) return [];
  try {
    const result = await callTool('outlook_email_search', { limit: 20 });
    const emails = Array.isArray(result) ? result : result?.emails || [];
    return emails
      .filter((e) => e.conversationId === conversationId)
      .map((e) => ({
        id: e.id,
        subject: e.subject || '(No subject)',
        sender: {
          name: e.sender?.name || e.from?.name || 'Unknown',
          email: e.sender?.email || e.from?.email || '',
        },
        receivedAt: e.receivedDateTime || e.date,
        body: e.summary || e.bodyPreview || '',
      }));
  } catch (err) {
    console.warn('[MCP] fetchThreadMessages failed:', err.message);
    return [];
  }
}
