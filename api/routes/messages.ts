import { Router, Response } from 'express';
import { getDb } from '../db/database';
import { AuthRequest } from '../middleware/auth';
import { Message } from '../../shared/types';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { type, isRead } = req.query;
    const db = await getDb();
    
    let query = 'SELECT * FROM messages WHERE user_id = ?';
    const params: any[] = [userId];
    const conditions: string[] = [];

    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }
    if (isRead !== undefined) {
      conditions.push('is_read = ?');
      params.push(isRead === 'true' ? 1 : 0);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC LIMIT 100';

    const result = db.exec(query, params);
    
    const messages: Message[] = [];
    if (result.length > 0) {
      result[0].values.forEach(row => {
        messages.push({
          id: row[0] as string,
          userId: row[1] as string,
          type: row[2] as Message['type'],
          title: row[3] as string,
          content: row[4] as string,
          relatedId: row[5] as string,
          relatedType: row[6] as string,
          hasVoucher: row[7] as number === 1,
          voucherUrl: row[8] as string | undefined,
          isRead: row[9] as number === 1,
          createdAt: row[10] as string
        });
      });
    }

    res.json({ success: true, data: messages });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: '获取消息列表失败' });
  }
});

router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const db = await getDb();

    const result = db.exec(
      'SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    const count = result.length > 0 && result[0].values.length > 0 
      ? (result[0].values[0][0] as number) 
      : 0;

    res.json({ success: true, data: { count } });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({ error: '获取未读消息数失败' });
  }
});

router.put('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    db.run('UPDATE messages SET is_read = 1 WHERE id = ? AND user_id = ?', [id, req.user?.id]);

    res.json({ success: true, data: { message: '标记已读成功' } });
  } catch (err) {
    console.error('Mark message read error:', err);
    res.status(500).json({ error: '标记已读失败' });
  }
});

router.put('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const db = await getDb();

    db.run('UPDATE messages SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);

    res.json({ success: true, data: { message: '全部标记已读成功' } });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: '标记已读失败' });
  }
});

router.get('/:id/voucher', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const db = await getDb();

    const result = db.exec(
      'SELECT voucher_url, related_type, related_id FROM messages WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: '消息不存在' });
    }

    const voucherUrl = result[0].values[0][0] as string;
    const relatedType = result[0].values[0][1] as string;
    const relatedId = result[0].values[0][2] as string;

    if (voucherUrl) {
      return res.redirect(voucherUrl);
    }

    if (relatedType === 'fry_release' && relatedId) {
      return res.redirect(`/api/fry-release/${relatedId}/archive`);
    }

    if (relatedType === 'harvest' && relatedId) {
      return res.redirect(`/api/harvest/tasks/${relatedId}/pdf`);
    }

    res.status(404).json({ error: '凭证不存在' });
  } catch (err) {
    console.error('Get voucher error:', err);
    res.status(500).json({ error: '获取凭证失败' });
  }
});

export default router;
