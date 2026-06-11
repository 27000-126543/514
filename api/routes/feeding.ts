import { Router, Response } from 'express';
import { getDb } from '../db/database';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middleware/auth';
import { FeedingPlan, FeedingLog } from '../../shared/types';

const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware(['admin', 'farmer']));

router.get('/plans', authMiddleware, roleMiddleware(['admin', 'farmer']), async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId } = req.query;
    const db = await getDb();
    let query = 'SELECT * FROM feeding_plans';
    const params: any[] = [];
    const conds: string[] = [];
    if (zoneId) { conds.push('zone_id = ?'); params.push(zoneId); }
    if (conds.length > 0) query += ' WHERE ' + conds.join(' AND ');
    query += ' ORDER BY created_at DESC';
    const result = db.exec(query, params);
    const plans: FeedingPlan[] = [];
    if (result.length > 0) {
      result[0].values.forEach(row => {
        plans.push({ id: row[0] as string, zoneId: row[1] as string, zoneName: row[2] as string, species: row[3] as string, growthStage: row[4] as string, dailyAmount: row[5] as number, frequency: row[6] as number, autoAdjust: row[7] === 1 || row[7] === true, weatherAdjust: row[8] === 1 || row[8] === true, isActive: row[9] === 1 || row[9] === true, createdAt: row[10] as string });
      });
    }
    res.json({ success: true, data: plans });
  } catch (err) {
    console.error('Get feeding plans error:', err);
    res.status(500).json({ error: '获取投喂计划失败' });
  }
});

router.post('/plans', authMiddleware, roleMiddleware(['admin', 'farmer']), async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId, zoneName, species, growthStage, dailyAmount, frequency, autoAdjust, weatherAdjust } = req.body;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const db = await getDb();
    db.run('INSERT INTO feeding_plans (id, zone_id, zone_name, species, growth_stage, daily_amount, frequency, auto_adjust, weather_adjust, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, zoneId, zoneName, species, growthStage || '成鱼', dailyAmount, frequency || 2, autoAdjust === true ? 1 : 0, weatherAdjust === true ? 1 : 0, 1, now]);
    res.json({ success: true, data: { id } });
  } catch (err) {
    console.error('Create feeding plan error:', err);
    res.status(500).json({ error: '创建投喂计划失败' });
  }
});

router.put('/plans/:id', authMiddleware, roleMiddleware(['admin', 'farmer']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const fields: any = { species: 'species', growthStage: 'growth_stage', dailyAmount: 'daily_amount', frequency: 'frequency', autoAdjust: 'auto_adjust', weatherAdjust: 'weather_adjust', isActive: 'is_active' };
    const sets: string[] = [];
    const vals: any[] = [];
    Object.keys(req.body).forEach(k => { if (fields[k]) { sets.push(fields[k] + ' = ?'); vals.push(typeof req.body[k] === 'boolean' ? (req.body[k] ? 1 : 0) : req.body[k]); } });
    if (sets.length === 0) return res.json({ success: true });
    vals.push(id);
    db.run('UPDATE feeding_plans SET ' + sets.join(', ') + ' WHERE id = ?', vals);
    res.json({ success: true });
  } catch (err) {
    console.error('Update feeding plan error:', err);
    res.status(500).json({ error: '更新投喂计划失败' });
  }
});

router.get('/logs', authMiddleware, roleMiddleware(['admin', 'farmer']), async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId, planId } = req.query;
    const db = await getDb();
    let query = 'SELECT * FROM feeding_logs';
    const params: any[] = [];
    const conds: string[] = [];
    if (zoneId) { conds.push('zone_id = ?'); params.push(zoneId); }
    if (planId) { conds.push('plan_id = ?'); params.push(planId); }
    if (conds.length > 0) query += ' WHERE ' + conds.join(' AND ');
    query += ' ORDER BY fed_at DESC LIMIT 500';
    const result = db.exec(query, params);
    const logs: FeedingLog[] = [];
    if (result.length > 0) {
      result[0].values.forEach(row => {
        logs.push({ id: row[0] as string, planId: row[1] as string, zoneId: row[2] as string, zoneName: row[3] as string, scheduledAmount: row[4] as number, actualAmount: row[5] as number, adjustedReason: row[6] as string || '', weather: row[7] as string || '', growthDays: row[8] as number, fedAt: row[9] as string });
      });
    }
    res.json({ success: true, data: logs });
  } catch (err) {
    console.error('Get feeding logs error:', err);
    res.status(500).json({ error: '获取投喂记录失败' });
  }
});

router.post('/logs', authMiddleware, roleMiddleware(['admin', 'farmer']), async (req: AuthRequest, res: Response) => {
  try {
    const { planId, zoneId, zoneName, scheduledAmount, actualAmount, adjustedReason, weather, growthDays } = req.body;
    const id = crypto.randomUUID();
    const fedAt = new Date().toISOString();
    const db = await getDb();
    db.run('INSERT INTO feeding_logs (id, plan_id, zone_id, zone_name, scheduled_amount, actual_amount, adjusted_reason, weather, growth_days, fed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, planId || '', zoneId, zoneName, scheduledAmount, actualAmount || scheduledAmount, adjustedReason || '', weather || '晴', growthDays || 0, fedAt]);
    res.json({ success: true, data: { id } });
  } catch (err) {
    console.error('Create feeding log error:', err);
    res.status(500).json({ error: '创建投喂记录失败' });
  }
});

export default router;
