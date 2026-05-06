import { Router } from 'express';
import { fetchEmailBody, fetchThreadMessages } from '../services/mcpClient.js';
import { draftReply, summariseThread, adviseOnEmail } from '../services/aiService.js';

const router = Router();

router.post('/draft-reply', async (req, res) => {
  const { email, instruction } = req.body;
  if (!email?.id) return res.status(400).json({ error: 'Email data required' });

  try {
    const fullBody = email.uri ? await fetchEmailBody(email.uri) : null;
    const enriched = { ...email, body: fullBody || email.bodyPreview };

    let threadMessages = null;
    if (email.conversationId) {
      threadMessages = await fetchThreadMessages(email.conversationId, email.id);
    }

    const draft = await draftReply({ email: enriched, threadMessages, instruction });
    res.json({ draft });
  } catch (err) {
    console.error('[Actions] Draft reply error:', err);
    res.status(500).json({ error: 'Failed to generate draft reply' });
  }
});

router.post('/summarise', async (req, res) => {
  const { email } = req.body;
  if (!email?.id) return res.status(400).json({ error: 'Email data required' });

  try {
    let threadMessages = [];
    if (email.conversationId) {
      threadMessages = await fetchThreadMessages(email.conversationId, email.id);
    }
    if (!threadMessages.length) {
      const body = email.uri ? await fetchEmailBody(email.uri) : null;
      threadMessages = [{ ...email, body: body || email.bodyPreview }];
    }

    const summary = await summariseThread(threadMessages);
    const participants = [...new Set(threadMessages.map((m) => `${m.sender.name} <${m.sender.email}>`))];
    const dateRange = threadMessages.length
      ? { from: threadMessages[0].receivedAt, to: threadMessages[threadMessages.length - 1].receivedAt }
      : null;

    res.json({ ...summary, participants, dateRange });
  } catch (err) {
    console.error('[Actions] Summarise error:', err);
    res.status(500).json({ error: 'Failed to summarise thread' });
  }
});

router.post('/advise', async (req, res) => {
  const { email } = req.body;
  if (!email?.id) return res.status(400).json({ error: 'Email data required' });

  try {
    let threadMessages = null;
    if (email.conversationId) {
      threadMessages = await fetchThreadMessages(email.conversationId, email.id);
    }

    const fullBody = email.uri ? await fetchEmailBody(email.uri) : null;
    const enriched = { ...email, body: fullBody || email.bodyPreview };

    const advice = await adviseOnEmail({ email: enriched, threadMessages });
    res.json({ advice });
  } catch (err) {
    console.error('[Actions] Advise error:', err);
    res.status(500).json({ error: 'Failed to generate advice' });
  }
});

export default router;
