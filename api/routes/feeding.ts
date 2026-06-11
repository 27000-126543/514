import { Router, Response } from 'express';
import { getDb } from '../db/database';
import { AuthRequest } from '../middleware/auth';
import { FeedingPlan, FeedingLog } from '../../shared/types';
import { generateId } from '../utils/helpers';

const router = Router();

router.get('/plans', async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const result = db.exec('SELECT * FROM feeding_plans ORDER BY created_at DESC');
    
    const plans: FeedingPlan[] = [];
    if (result.length > 0) {
      result[0].values.forEach(row => {
        plans.push({
          id: row[0] as string,
          zoneId: row[1] as string,
          zoneName: row[2] as string,
          species: row[3] as string,
          growthStage: row[4] as string,
          dailyAmount: row[5] as number,
          frequency: row[6] as number,
          autoAdjust: row[7] as number === 1,
          weatherAdjust: row[8] as number === 1,
          isActive: row[9] as number === 1,
          createdAt: row[10] as string
        });
      });
    }

    res.json({ success: true, data: plans });
  } catch (err) {
    console.error('Get feeding plans error:', err);
    res.status(500).json({ error: '获取投喂计划失败' });
  }
});

router.post('/plans', async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId, zoneName, species, growthStage, dailyAmount, frequency, autoAdjust, weatherAdjust } = req.body;
    const db = await getDb();

    const id = generateId();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO feeding_plans 
       (id, zone_id, zone_name, species, growth_stage, daily_amount, frequency, 
        auto_adjust, weather_adjust, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, zoneId, zoneName, species, growthStage, dailyAmount, frequency,
       autoAdjust ? 1 : 0, weatherAdjust ? 1 : 0, 1, now]
    );

    const plan: FeedingPlan = {
      id, zoneId, zoneName, species, growthStage, dailyAmount, frequency,
      autoAdjust: !!autoAdjust, weatherAdjust: !!weatherAdjust, isActive: true, createdAt: now
    };

    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    console.error('Create feeding plan error:', err);
    res.status(500).json({ error: '创建投喂计划失败' });
  }
});

router.put('/plans/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { species, growthStage, dailyAmount, frequency, autoAdjust, weatherAdjust, isActive } = req.body;
    const db = await getDb();

    db.run(
      `UPDATE feeding_plans 
       SET species = ?, growth_stage = ?, daily_amount = ?, frequency = ?, 
           auto_adjust = ?, weather_adjust = ?, is_active = ?
       WHERE id = ?`,
      [species, growthStage, dailyAmount, frequency,
       autoAdjust ? 1 : 0, weatherAdjust ? 1 : 0, isActive ? 1 : 0, id]
    );

    res.json({ success: true, data: { message: '更新成功' } });
  } catch (err) {
    console.error('Update feeding plan error:', err);
    res.status(500).json({ error: '更新投喂计划失败' });
  }
});

router.get('/logs', async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId, planId, startDate, endDate } = req.query;
    const db = await getDb();
    
    let query = 'SELECT * FROM feeding_logs';
    const params: any[] = [];
    const conditions: string[] = [];

    if (zoneId) {
      conditions.push('zone_id = ?');
      params.push(zoneId);
    }
    if (planId) {
      conditions.push('plan_id = ?');
      params.push(planId);
    }
    if (startDate) {
      conditions.push('fed_at >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('fed_at <= ?');
      params.push(endDate);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY fed_at DESC LIMIT 100';

    const result = db.exec(query, params);
    
    const logs: FeedingLog[] = [];
    if (result.length > 0) {
      result[0].values.forEach(row => {
        logs.push({
          id: row[0] as string,
          planId: row[1] as string,
          zoneId: row[2] as string,
          zoneName: row[3] as string,
          scheduledAmount: row[4] as number,
          actualAmount: row[5] as number,
          adjustedReason: row[6] as string,
          weather: row[7] as string,
          growthDays: row[8] as number,
          fedAt: row[9] as string
        });
      });
    }

    res.json({ success: true, data: logs });
  } catch (err) {
    console.error('Get feeding logs error:', err);
    res.status(500).json({ error: '获取投喂日志失败' });
  }
});

router.post('/logs', async (req: AuthRequest, res: Response) => {
  try {
    const { planId, zoneId, zoneName, scheduledAmount, actualAmount, adjustedReason, weather, growthDays } = req.body;
    const db = await getDb();

    const id = generateId();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO feeding_logs 
       (id, plan_id, zone_id, zone_name, scheduled_amount, actual_amount, 
        adjusted_reason, weather, growth_days, fed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, planId, zoneId, zoneName, scheduledAmount, actualAmount,
       adjustedReason || '', weather, growthDays, now]
    );

    const log: FeedingLog = {
      id, planId, zoneId, zoneName, scheduledAmount, actualAmount,
      adjustedReason: adjustedReason || '', weather, growthDays, fedAt: now
    };

    res.status(201).json({ success: true, data: log });
  } catch (err) {
    console.error('Create feeding log error:', err);
    res.status(500).json({ error: '创建投喂日志失败' });
  }
});

export default router;
