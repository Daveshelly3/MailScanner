import 'isomorphic-fetch';
import { Client } from '@microsoft/microsoft-graph-client';

const FOLDER_FILTERS = {
  inbox: "parentFolderId eq 'inbox'",
  flagged: "flag/flagStatus eq 'flagged'",
  allmail: null,
};

const TIME_WINDOW_HOURS = {
  '6h': 6,
  '24h': 24,
  '48h': 48,
  '3d': 72,
  '7d': 168,
  alltime: null,
};

function buildGraphClient(accessToken) {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

export async function fetchEmails({ accessToken, timeWindow, folder, maxCount }) {
  const client = buildGraphClient(accessToken);

  const filters = [];

  const windowHours = TIME_WINDOW_HOURS[timeWindow] ?? TIME_WINDOW_HOURS['24h'];
  if (windowHours !== null) {
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
    filters.push(`receivedDateTime ge ${since}`);
  }

  const folderFilter = FOLDER_FILTERS[folder] ?? null;
  if (folderFilter) {
    filters.push(folderFilter);
  }

  const count = Math.min(Math.max(Number(maxCount) || 50, 5), 100);

  let request = client
    .api('/me/messages')
    .select('id,subject,from,receivedDateTime,bodyPreview,body,conversationId,isRead,flag')
    .orderby('receivedDateTime desc')
    .top(count);

  if (filters.length > 0) {
    request = request.filter(filters.join(' and '));
  }

  const response = await request.get();

  return (response.value || []).map((msg) => ({
    id: msg.id,
    subject: msg.subject || '(No subject)',
    sender: {
      name: msg.from?.emailAddress?.name || 'Unknown',
      email: msg.from?.emailAddress?.address || '',
    },
    receivedAt: msg.receivedDateTime,
    bodyPreview: msg.bodyPreview || '',
    body: msg.body?.content || msg.bodyPreview || '',
    conversationId: msg.conversationId,
    isRead: msg.isRead,
    isFlagged: msg.flag?.flagStatus === 'flagged',
  }));
}

export async function fetchConversationMessages({ accessToken, conversationId }) {
  const client = buildGraphClient(accessToken);

  const response = await client
    .api('/me/messages')
    .filter(`conversationId eq '${conversationId}'`)
    .select('id,subject,from,receivedDateTime,bodyPreview,body')
    .orderby('receivedDateTime asc')
    .top(20)
    .get();

  return (response.value || []).map((msg) => ({
    id: msg.id,
    subject: msg.subject || '(No subject)',
    sender: {
      name: msg.from?.emailAddress?.name || 'Unknown',
      email: msg.from?.emailAddress?.address || '',
    },
    receivedAt: msg.receivedDateTime,
    body: msg.body?.content || msg.bodyPreview || '',
  }));
}
