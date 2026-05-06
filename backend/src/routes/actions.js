import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { fetchConversationMessages } from '../services/graphService.js';
import { draftReply, summariseThread, adviseOnEmail } from '../services/aiService.js';

const router = Router();

router.post('/draft-reply', requireAuth, async (req, res) => {
  const { email, instruction } = req.body;

  if (!email?.id) {
    return res.status(400).json({ error: 'Email data required' });
  }

  try {
    let threadMessages = null;
    if (email.conversationId) {
      threadMessages = await fetchConversationMessages({
        accessToken: req.session.accessToken,
        conversationId: email.conversationId,
      });
    }

    const draft = await draftReply({ email, threadMessages, instruction });
    res.json({ draft });
  } catch (err) {
    console.error('[Actions] Draft reply error:', err);
    res.status(500).json({ error: 'Failed to generate draft reply' });
  }
});

router.post('/summarise', requireAuth, async (req, res) => {
  const { email } = req.body;

  if (!email?.conversationId) {
    return res.status(400).json({ error: 'Email with conversationId required' });
  }

  try {
    const threadMessages = await fetchConversationMessages({
      accessToken: req.session.accessToken,
      conversationId: email.conversationId,
    });

    const summary = await summariseThread(threadMessages);
    const participants = [...new Set(threadMessages.map((m) => `${m.sender.name} <${m.sender.email}>`))];
    const dateRange = threadMessages.length > 0
      ? { from: threadMessages[0].receivedAt, to: threadMessages[threadMessages.length - 1].receivedAt }
      : null;

    res.json({ ...summary, participants, dateRange });
  } catch (err) {
    console.error('[Actions] Summarise error:', err);
    res.status(500).json({ error: 'Failed to summarise thread' });
  }
});

router.post('/advise', requireAuth, async (req, res) => {
  const { email } = req.body;

  if (!email?.id) {
    return res.status(400).json({ error: 'Email data required' });
  }

  try {
    let threadMessages = null;
    if (email.conversationId) {
      threadMessages = await fetchConversationMessages({
        accessToken: req.session.accessToken,
        conversationId: email.conversationId,
      });
    }

    const advice = await adviseOnEmail({ email, threadMessages });
    res.json({ advice });
  } catch (err) {
    console.error('[Actions] Advise error:', err);
    res.status(500).json({ error: 'Failed to generate advice' });
  }
});

export default router;
