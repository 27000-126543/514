import { Router, Response } from 'express';
import { getDb } from '../db/database';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middleware/auth';
import { SampleTest, HarvestPrediction, HarvestTask, Zone } from '../../shared/types';

const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware(['admin', 'farmer']));

router.post('/sample-test', authMiddleware, roleMiddleware(['admin', 'farmer']), async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId, zoneName, averageWeight, survivalRate, sampleCount } = req.body;
    const id = crypto.randomUUID();
    const testedAt = new Date().toISOString();
    const testedBy = req.user ? req.user.name : '系统';
    const db = await getDb();
    db.run('INSERT INTO sample_tests (id, zone_id, zone_name, average_weight, survival_rate, sample_count, tested_by, tested_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, zoneId, zoneName, averageWeight, survivalRate, sampleCount || 30, testedBy, testedAt]);
    res.status(201).json({ success: true, data: { id } });
  } catch (err) {
    console.error('Create sample test error:', err);
    res.status(500).json({ error: '创建抽检记录失败' });
  }
});

router.get('/predictions', authMiddleware, roleMiddleware(['admin', 'farmer']), async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const zones = db.exec('SELECT id, name, current_stock, growth_rate FROM zones');
    const predictions: HarvestPrediction[] = [];
    if (zones.length > 0) {
      zones[0].values.forEach(row => {
        const stock = row[2] as number;
        const rate = row[3] as number;
        const estimated = stock > 0 ? Math.round(stock * rate * 0.95) : 0;
        const now = new Date();
        const bestStart = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const bestEnd = new Date(now.getTime() + (21 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const reason = (estimated > 5000) ? '当前存量高，生长速率稳定，适合批量捕捞上市' : '存量适中，建议分批次少量捕捞';
        predictions.push({ zoneId: row[0] as string, zoneName: row[1] as string, estimatedTotal: estimated, bestHarvestWindow: { start: bestStart, end: bestEnd, reason }, priceForecast: 45, confidence: estimated > 0 ? 82 : 0 });
      });
    }
    res.json({ success: true, data: predictions });
  } catch (err) {
    console.error('Get harvest predictions error:', err);
    res.status(500).json({ error: '获取捕捞预测失败' });
  }
});

router.get('/tasks', authMiddleware, roleMiddleware(['admin', 'farmer']), async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId, status } = req.query;
    const db = await getDb();
    let query = 'SELECT * FROM harvest_tasks';
    const params: any[] = [];
    const conds: string[] = [];
    if (zoneId) { conds.push('zone_id = ?'); params.push(zoneId); }
    if (status) { conds.push('status = ?'); params.push(status); }
    if (conds.length > 0) query += ' WHERE ' + conds.join(' AND ');
    query += ' ORDER BY harvest_date DESC';
    const result = db.exec(query, params);
    const tasks: HarvestTask[] = [];
    if (result.length > 0) {
      result[0].values.forEach(row => {
        tasks.push({ id: row[0] as string, zoneId: row[1] as string, zoneName: row[2] as string, predictedOutput: row[3] as number, harvestDate: row[4] as string, status: row[5] as HarvestTask['status'], taskOrderNo: row[6] as string, createdAt: row[7] as string });
      });
    }
    res.json({ success: true, data: tasks });
  } catch (err) {
    console.error('Get harvest tasks error:', err);
    res.status(500).json({ error: '获取捕捞任务失败' });
  }
});

router.post('/tasks', authMiddleware, roleMiddleware(['admin', 'farmer']), async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId, zoneName, predictedOutput, harvestDate } = req.body;
    const id = crypto.randomUUID();
    const taskOrderNo = 'HT-' + Date.now().toString(36).toUpperCase();
    const status = 'pending';
    const createdAt = new Date().toISOString();
    const db = await getDb();
    db.run('INSERT INTO harvest_tasks (id, zone_id, zone_name, predicted_output, harvest_date, status, task_order_no, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, zoneId, zoneName, predictedOutput || 0, harvestDate, status, taskOrderNo, createdAt]);
    res.json({ success: true, data: { id, taskOrderNo } });
  } catch (err) {
    console.error('Create harvest task error:', err);
    res.status(500).json({ error: '创建捕捞任务失败' });
  }
});

router.get('/tasks/:id/pdf', authMiddleware, roleMiddleware(['admin', 'farmer']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const result = db.exec('SELECT * FROM harvest_tasks WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) { return res.status(404).json({ error: '捕捞任务不存在' }); }
    const row = result[0].values[0];
    const zoneName = row[2] as string;
    const harvestDate = row[4] as string;
    const NL = String.fromCharCode(10);
    const pdfContent = '捕捞任务单' + NL + NL + '任务编号：' + id + NL + '任务单号：' + (row[6] as string) + NL + '养殖区域：' + zoneName + NL + '捕捞日期：' + harvestDate + NL + '预计产量：' + (row[3] as number) + 'kg' + NL + NL + '—— 生成时间：' + new Date().toISOString() + NL;
    res.setHeader('Content-Type', 'application/pdf');
    const disp = 'attachment; filename="harvest-' + id + '.txt"';
    res.setHeader('Content-Disposition', disp);
    res.send(Buffer.from(pdfContent, 'utf-8'));
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: '生成PDF失败' });
  }
});

export default router;
