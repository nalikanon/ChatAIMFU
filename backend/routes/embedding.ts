import { Router, Request, Response, NextFunction } from 'express';
import { titanEmbedService } from '../services/titan';

const router = Router();

/**
 * POST /api/embed
 * Expects: { inputText: string }
 * Returns: { embedding: number[] }
 */
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { inputText } = req.body;
    if (!inputText) {
      res.status(400).json({ error: 'inputText is required' });
      return;
    }
    const embedding = await titanEmbedService.embedText(inputText);
    res.json({ embedding });
  } catch (error) {
    next(error);
  }
});

export default router;