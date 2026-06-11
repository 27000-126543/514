import { Router, Response } from 'express';
import { getDb } from '../db/database';
import { AuthRequest } from '../middleware/auth';
import { Warning } from '../../shared/types';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, type, level } = req.query;
    const db = await getDb();
    
    let query = 'SELECT * FROM warnings';
    const params: any[] = [];
    const conditions: string[] = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }
    if (level) {
      conditions.push('level = ?');
      params.push(level);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const result = db.exec(query, params);
    
    const warnings: Warning[] = [];
    if (result.length > 0) {
      result[0].values.forEach(row => {
        warnings.push({
          id: row[0] as string,
          zoneId: row[1] as string,
          zoneName: row[2] as string,
          type: row[3] as Warning['type'],
          level: row[4] as Warning['level'],
          indicator: row[5] as string,
          currentValue: row[6] as number,
          threshold: row[7] as number,
          consecutiveDays: row[8] as number,
          suggestions: JSON.parse(row[9] as string || '[]'),
          status: row[10] as Warning['status'],
          createdAt: row[11] as string,
          handledAt: row[12] as string | undefined,
          handledBy: row[13] as string | undefined,
          handleNote: row[14] as string | undefined
        });
      });
    }

    res.json({ success: true, data: warnings });
  } catch (err) {
    console.error('Get warnings error:', err);
    res.status(500).json({ error: '获取预警列表失败' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    
    const result = db.exec('SELECT * FROM warnings WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: '预警不存在' });
    }

    const row = result[0].values[0];
    const warning: Warning = {
      id: row[0] as string,
      zoneId: row[1] as string,
      zoneName: row[2] as string,
      type: row[3] as Warning['type'],
      level: row[4] as Warning['level'],
      indicator: row[5] as string,
      currentValue: row[6] as number,
      threshold: row[7] as number,
      consecutiveDays: row[8] as number,
      suggestions: JSON.parse(row[9] as string || '[]'),
      status: row[10] as Warning['status'],
      createdAt: row[11] as string,
      handledAt: row[12] as string | undefined,
      handledBy: row[13] as string | undefined,
      handleNote: row[14] as string | undefined
    };

    res.json({ success: true, data: warning });
  } catch (err) {
    console.error('Get warning error:', err);
    res.status(500).json({ error: '获取预警详情失败' });
  }
});

router.put('/:id/handle', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, handleNote } = req.body;
    const db = await getDb();

    const handledBy = req.user?.name || '系统';
    const handledAt = new Date().toISOString();

    db.run(
      'UPDATE warnings SET status = ?, handled_at = ?, handled_by = ?, handle_note = ? WHERE id = ?',
      [status || 'processing', handledAt, handledBy, handleNote || '', id]
    );

    if (status === 'resolved') {
      const warnResult = db.exec('SELECT zone_name, indicator FROM warnings WHERE id = ?', [id]);
      if (warnResult.length > 0 && warnResult[0].values.length > 0) {
        const zoneName = warnResult[0].values[0][0] as string;
        const indicator = warnResult[0].values[0][1] as string;
        
        db.run(
          'INSERT INTO messages (id, user_id, type, title, content, related_id, related_type, has_voucher, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [crypto.randomUUID(), 'admin001', 'warning', '预警已处理',
           `${zoneName}${indicator}超标预警已由${handledBy}处理完成。`,
           id, 'warning', 0, 0, handledAt]
        );
      }
    }

    res.json({ success: true, data: { message: '处理成功' } });
  } catch (err) {
    console.error('Handle warning error:', err);
    res.status(500).json({ error: '处理预警失败' });
  }
});

export default router;
