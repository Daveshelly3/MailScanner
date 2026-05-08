import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

export const isImapConfigured = () =>
  Boolean(process.env.IMAP_USER && process.env.IMAP_PASSWORD);

const TIME_WINDOW_HOURS = {
  '6h': 6, '24h': 24, '48h': 48, '3d': 72, '7d': 168, alltime: null,
};

function buildClient() {
  return new ImapFlow({
    host: process.env.IMAP_HOST || 'outlook.office365.com',
    port: Number(process.env.IMAP_PORT || 993),
    secure: true,
    auth: {
      user: process.env.IMAP_USER,
      pass: process.env.IMAP_PASSWORD,
    },
    logger: false,
    socketTimeout: 60000,
  });
}

async function withClient(fn) {
  const client = buildClient();
  await client.connect();
  try {
    return await fn(client);
  } finally {
    try { await client.logout(); } catch { /* swallow */ }
  }
}

function normaliseSubject(subject) {
  return (subject || '').replace(/^(Re|Fwd?|Fw):\s*/gi, '').trim().toLowerCase();
}

export async function fetchEmails({ timeWindow, folder, maxCount }) {
  return withClient(async (client) => {
    const folderName = 'INBOX';
    const lock = await client.getMailboxLock(folderName);
    try {
      const search = {};
      const hours = TIME_WINDOW_HOURS[timeWindow] ?? 24;
      if (hours) search.since = new Date(Date.now() - hours * 60 * 60 * 1000);
      if (folder === 'flagged') search.flagged = true;

      const uids = await client.search(search, { uid: true });
      if (!uids?.length) return [];

      const limit = Math.min(Math.max(Number(maxCount) || 50, 5), 100);
      // newest first → take last N UIDs
      const recent = uids.slice(-limit);

      const emails = [];
      for await (const msg of client.fetch(
        recent,
        { envelope: true, source: true, uid: true, flags: true },
        { uid: true }
      )) {
        let bodyText = '';
        try {
          const parsed = await simpleParser(msg.source);
          bodyText = parsed.text || (parsed.html ? parsed.html.replace(/<[^>]+>/g, ' ') : '');
        } catch { /* ignore parse errors */ }

        const subject = msg.envelope.subject || '(No subject)';
        emails.push({
          id: String(msg.uid),
          subject,
          sender: {
            name:  msg.envelope.from?.[0]?.name    || 'Unknown',
            email: msg.envelope.from?.[0]?.address || '',
          },
          receivedAt:     msg.envelope.date?.toISOString(),
          bodyPreview:    bodyText.replace(/\s+/g, ' ').slice(0, 500),
          body:           bodyText,
          uri:            null,
          conversationId: normaliseSubject(subject) || null,
          isRead:         msg.flags.has('\\Seen'),
          isFlagged:      msg.flags.has('\\Flagged'),
        });
      }

      // Newest first
      return emails.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
    } finally {
      lock.release();
    }
  });
}

export async function fetchEmailBody({ messageId }) {
  return withClient(async (client) => {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const msg = await client.fetchOne(messageId, { source: true }, { uid: true });
      if (!msg) return null;
      const parsed = await simpleParser(msg.source);
      return parsed.text || (parsed.html ? parsed.html.replace(/<[^>]+>/g, ' ') : null);
    } finally {
      lock.release();
    }
  });
}

export async function fetchThreadMessages({ conversationId }) {
  if (!conversationId) return [];
  return withClient(async (client) => {
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Find emails with the same normalised subject in the last 30 days
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const uids = await client.search({ since }, { uid: true });
      if (!uids?.length) return [];

      const recent = uids.slice(-200); // limit search scope
      const matches = [];
      for await (const msg of client.fetch(
        recent,
        { envelope: true, source: true, uid: true },
        { uid: true }
      )) {
        if (normaliseSubject(msg.envelope.subject) !== conversationId) continue;
        let bodyText = '';
        try {
          const parsed = await simpleParser(msg.source);
          bodyText = parsed.text || (parsed.html ? parsed.html.replace(/<[^>]+>/g, ' ') : '');
        } catch { /* ignore */ }
        matches.push({
          id: String(msg.uid),
          subject: msg.envelope.subject || '(No subject)',
          sender: {
            name:  msg.envelope.from?.[0]?.name    || 'Unknown',
            email: msg.envelope.from?.[0]?.address || '',
          },
          receivedAt: msg.envelope.date?.toISOString(),
          body: bodyText,
        });
        if (matches.length >= 20) break;
      }
      return matches.sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt));
    } finally {
      lock.release();
    }
  });
}

export async function testConnection() {
  return withClient(async (client) => {
    const status = await client.status('INBOX', { messages: true });
    return { connected: true, inboxCount: status.messages };
  });
}
