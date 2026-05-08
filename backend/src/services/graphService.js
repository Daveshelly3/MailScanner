import 'isomorphic-fetch';
import { Client } from '@microsoft/microsoft-graph-client';

const TIME_WINDOW_HOURS = {
  '6h': 6, '24h': 24, '48h': 48, '3d': 72, '7d': 168, alltime: null,
};

const FOLDER_FILTERS = {
  inbox:   "parentFolderId eq 'inbox'",
  flagged: "flag/flagStatus eq 'flagged'",
  allmail: null,
};

function buildClient(accessToken) {
  return Client.init({ authProvider: (done) => done(null, accessToken) });
}

export async function fetchEmails({ accessToken, timeWindow, folder, maxCount }) {
  const client = buildClient(accessToken);
  const filters = [];

  const hours = TIME_WINDOW_HOURS[timeWindow] ?? TIME_WINDOW_HOURS['24h'];
  if (hours !== null) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    filters.push(`receivedDateTime ge ${since}`);
  }

  const folderFilter = FOLDER_FILTERS[folder] ?? null;
  if (folderFilter) filters.push(folderFilter);

  const count = Math.min(Math.max(Number(maxCount) || 50, 5), 100);

  let req = client
    .api('/me/messages')
    .select('id,subject,from,receivedDateTime,bodyPreview,body,conversationId,isRead,flag')
    .orderby('receivedDateTime desc')
    .top(count);

  if (filters.length) req = req.filter(filters.join(' and '));

  const response = await req.get();

  return (response.value || []).map((msg) => ({
    id: msg.id,
    subject: msg.subject || '(No subject)',
    sender: {
      name:  msg.from?.emailAddress?.name    || 'Unknown',
      email: msg.from?.emailAddress?.address || '',
    },
    receivedAt:     msg.receivedDateTime,
    bodyPreview:    msg.bodyPreview || '',
    body:           msg.body?.content || msg.bodyPreview || '',
    uri:            null,
    conversationId: msg.conversationId,
    isRead:         msg.isRead,
    isFlagged:      msg.flag?.flagStatus === 'flagged',
  }));
}

export async function fetchEmailBody({ accessToken, messageId }) {
  const client = buildClient(accessToken);
  const msg = await client.api(`/me/messages/${messageId}`).select('body').get();
  return msg.body?.content || null;
}

export async function fetchThreadMessages({ accessToken, conversationId }) {
  if (!conversationId) return [];
  const client = buildClient(accessToken);
  const response = await client
    .api('/me/messages')
    .filter(`conversationId eq '${conversationId}'`)
    .select('id,subject,from,receivedDateTime,bodyPreview,body')
    .orderby('receivedDateTime asc')
    .top(20)
    .get();

  return (response.value || []).map((m) => ({
    id: m.id,
    subject: m.subject || '(No subject)',
    sender: {
      name:  m.from?.emailAddress?.name    || 'Unknown',
      email: m.from?.emailAddress?.address || '',
    },
    receivedAt: m.receivedDateTime,
    body: m.body?.content || m.bodyPreview || '',
  }));
}
