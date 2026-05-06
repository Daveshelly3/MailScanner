import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { fetchEmails } from '../services/graphService.js';
import { classifyEmails } from '../services/aiService.js';
import { prisma } from '../services/db.js';

const router = Router();

router.post('/', requireAuth, async (req, res) => {
  const { timeWindow = '24h', folder = 'inbox', maxCount = 50 } = req.body;

  const validWindows = ['6h', '24h', '48h', '3d', '7d', 'alltime'];
  const validFolders = ['inbox', 'allmail', 'flagged'];

  if (!validWindows.includes(timeWindow)) {
    return res.status(400).json({ error: 'Invalid time window' });
  }
  if (!validFolders.includes(folder)) {
    return res.status(400).json({ error: 'Invalid folder' });
  }

  try {
    const emails = await fetchEmails({
      accessToken: req.session.accessToken,
      timeWindow,
      folder,
      maxCount,
    });

    const classified = await classifyEmails(emails);

    const flagged = classified.filter((e) => e.needsAttention);
    const urgent = flagged.filter((e) => e.priority === 'high');

    await prisma.scanResult.create({
      data: {
        userId: req.session.userId,
        timeWindow,
        folder,
        emailCount: classified.length,
        flaggedCount: flagged.length,
        urgentCount: urgent.length,
        results: flagged,
      },
    });

    res.json({
      scanned: classified.length,
      flagged: flagged.length,
      urgent: urgent.length,
      noAction: classified.length - flagged.length,
      emails: classified,
    });
  } catch (err) {
    console.error('[Scan] Error:', err);
    if (err.statusCode === 401) {
      return res.status(401).json({ error: 'Microsoft access token expired. Please sign in again.' });
    }
    res.status(500).json({ error: 'Scan failed. Please try again.' });
  }
});

router.get('/history', requireAuth, async (req, res) => {
  try {
    const history = await prisma.scanResult.findMany({
      where: { userId: req.session.userId },
      orderBy: { scannedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        scannedAt: true,
        timeWindow: true,
        folder: true,
        emailCount: true,
        flaggedCount: true,
        urgentCount: true,
      },
    });

    res.json({ history });
  } catch (err) {
    console.error('[Scan] History error:', err);
    res.status(500).json({ error: 'Failed to load scan history' });
  }
});

export default router;
