import { readFileSync, readdirSync } from 'fs';

function loadMcpConfig() {
  // Auto-discover the session config written by Claude Code
  const tmpFiles = readdirSync('/tmp').filter((f) => f.startsWith('mcp-config-'));
  if (!tmpFiles.length) throw new Error('No MCP session config found in /tmp');

  const raw = readFileSync(`/tmp/${tmpFiles[0]}`, 'utf8');
  const config = JSON.parse(raw);

  const outlookKey = Object.keys(config.mcpServers).find(
    (k) => k !== 'github' && config.mcpServers[k].url?.includes('microsoft365')
  );
  if (!outlookKey) throw new Error('Outlook MCP server not found in session config');

  const server = config.mcpServers[outlookKey];
  return { url: server.url, headers: server.headers };
}

async function callTool(toolName, args) {
  const { url, headers } = loadMcpConfig();

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
    throw new Error(`MCP call failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('text/event-stream')) {
    return parseSseResponse(await res.text());
  }

  const json = await res.json();
  if (json.error) throw new Error(`MCP error: ${json.error.message}`);
  return extractContent(json.result);
}

function parseSseResponse(raw) {
  for (const line of raw.split('\n')) {
    if (!line.startsWith('data:')) continue;
    try {
      const msg = JSON.parse(line.slice(5).trim());
      if (msg.result) return extractContent(msg.result);
      if (msg.error) throw new Error(`MCP SSE error: ${msg.error.message}`);
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
  '6h':     '6 hours ago',
  '24h':    '24 hours ago',
  '48h':    '48 hours ago',
  '3d':     '3 days ago',
  '7d':     '7 days ago',
  alltime:  null,
};

export async function fetchEmails({ timeWindow, folder, maxCount }) {
  const afterDateTime = TIME_WINDOW_MAP[timeWindow] ?? TIME_WINDOW_MAP['24h'];
  const count = Math.min(Math.max(Number(maxCount) || 50, 5), 50);

  const args = { limit: count };
  if (afterDateTime) args.afterDateTime = afterDateTime;
  if (folder && folder !== 'allmail') {
    args.folderName = folder === 'inbox' ? 'Inbox' : folder === 'flagged' ? 'Flagged' : folder;
  }

  const result = await callTool('outlook_email_search', args);

  const emails = Array.isArray(result) ? result : result?.emails || result?.value || [];

  return emails.map((e) => ({
    id: e.id || e.messageId || String(Math.random()),
    subject: e.subject || '(No subject)',
    sender: {
      name: e.from?.name || e.sender?.name || e.from || 'Unknown',
      email: e.from?.email || e.sender?.email || e.fromAddress || '',
    },
    receivedAt: e.receivedDateTime || e.receivedAt || e.date,
    bodyPreview: e.bodyPreview || e.preview || '',
    uri: e.uri || (e.id ? `mail:///messages/${e.id}` : null),
    conversationId: e.conversationId,
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

export async function fetchThreadMessages(conversationId, emailId) {
  try {
    const args = { limit: 20 };
    if (conversationId) args.query = `conversationId:${conversationId}`;

    const result = await callTool('outlook_email_search', args);
    const emails = Array.isArray(result) ? result : result?.emails || [];

    return emails.map((e) => ({
      id: e.id,
      subject: e.subject || '(No subject)',
      sender: {
        name: e.from?.name || e.from || 'Unknown',
        email: e.from?.email || e.fromAddress || '',
      },
      receivedAt: e.receivedDateTime || e.date,
      body: e.bodyPreview || e.preview || '',
      uri: e.uri || (e.id ? `mail:///messages/${e.id}` : null),
    }));
  } catch (err) {
    console.warn('[MCP] fetchThreadMessages failed:', err.message);
    return [];
  }
}
