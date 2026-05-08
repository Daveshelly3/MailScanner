import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, readdirSync } from 'fs';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getMcpServerConfig() {
  // If explicitly configured, use that
  if (process.env.MCP_SERVER_URL) {
    return { url: process.env.MCP_SERVER_URL, headers: {} };
  }

  // Auto-discover from Claude Code session config (when running inside CCR)
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

async function runMcpPrompt(prompt, maxTokens = 4096) {
  const { url, headers } = getMcpServerConfig();

  const response = await anthropic.beta.messages.create({
    model: process.env.AI_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    mcp_servers: [
      {
        type: 'url',
        url,
        name: 'microsoft365',
        ...(Object.keys(headers).length ? { headers } : {}),
      },
    ],
    messages: [{ role: 'user', content: prompt }],
    betas: ['mcp-client-2025-04-04'],
  });

  // Extract text from the final response
  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock?.text || '';
}

const TIME_WINDOW_MAP = {
  '6h':    '6 hours ago',
  '24h':   'yesterday',
  '48h':   '2 days ago',
  '3d':    '3 days ago',
  '7d':    '7 days ago',
  alltime: null,
};

export async function fetchEmails({ timeWindow, folder, maxCount }) {
  const since = TIME_WINDOW_MAP[timeWindow] ?? TIME_WINDOW_MAP['24h'];
  const count = Math.min(Math.max(Number(maxCount) || 50, 5), 50);

  const folderInstruction = folder === 'inbox'
    ? 'from the Inbox folder'
    : folder === 'flagged'
    ? 'that are flagged'
    : 'from all mail';

  const timeInstruction = since ? `received since ${since}` : '';

  const prompt = `Use the outlook_email_search tool to fetch up to ${count} emails ${folderInstruction} ${timeInstruction}.
For each email returned, if you need the full body use read_resource with the email URI.

Return ONLY a JSON array (no markdown, no explanation) where each item has:
{
  "id": string,
  "subject": string,
  "sender": { "name": string, "email": string },
  "receivedAt": ISO datetime string,
  "bodyPreview": string (first 300 chars of body),
  "uri": string (the mail URI),
  "conversationId": string or null
}`;

  const raw = await runMcpPrompt(prompt, 8192);

  try {
    const match = raw.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch {
    console.error('[MCP] Failed to parse email list:', raw.slice(0, 200));
    return [];
  }
}

export async function fetchEmailBody(uri) {
  if (!uri) return null;
  try {
    const raw = await runMcpPrompt(
      `Use the read_resource tool to fetch the full content of this email URI: ${uri}
Return ONLY the plain text body of the email, nothing else.`,
      2048
    );
    return raw || null;
  } catch (err) {
    console.warn('[MCP] fetchEmailBody failed:', err.message);
    return null;
  }
}

export async function fetchThreadMessages(conversationId) {
  if (!conversationId) return [];
  try {
    const raw = await runMcpPrompt(
      `Use the outlook_email_search tool to find all emails in the conversation with conversationId "${conversationId}". Limit 20.
Return ONLY a JSON array with each item:
{ "id": string, "subject": string, "sender": { "name": string, "email": string }, "receivedAt": string, "body": string }`,
      4096
    );
    const match = raw.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch (err) {
    console.warn('[MCP] fetchThreadMessages failed:', err.message);
    return [];
  }
}
