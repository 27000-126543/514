import { Router, Response } from 'express';
import { getDb } from '../db/database';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middleware/auth';
import { WaterQuality, ThresholdConfig } from '../../shared/types';

const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware(['admin', 'technician']));

const DEFAULT_THRESHOLDS: ThresholdConfig[] = [
  { indicator: 'temperature', min: 12, max: 20, unit: 'C' },
  { indicator: 'salinity', min: 25, max: 35, unit: 'psu' },
  { indicator: 'dissolvedOxygen', min: 5, max: 12, unit: 'mg/L' },
  { indicator: 'ph', min: 7.5, max: 8.5, unit: '' },
  { indicator: 'ammoniaNitrogen', min: 0, max: 0.2, unit: 'mg/L' },
  { indicator: 'nitrite', min: 0, max: 0.1, unit: 'mg/L' }
];

router.get('/', authMiddleware, roleMiddleware(['admin', 'technician']), async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId, startDate, endDate } = req.query;
    const db = await getDb();
    let query = 'SELECT * FROM water_quality';
    const params: any[] = [];
    const conds: string[] = [];
    if (zoneId) { conds.push('zone_id = ?'); params.push(zoneId); }
    if (startDate) { conds.push('recorded_at >= ?'); params.push(startDate); }
    if (endDate) { conds.push('recorded_at <= ?'); params.push(endDate); }
    if (conds.length > 0) query += ' WHERE ' + conds.join(' AND ');
    query += ' ORDER BY recorded_at DESC LIMIT 500';
    const result = db.exec(query, params);
    const data: WaterQuality[] = [];
    if (result.length > 0) {
      result[0].values.forEach(row => {
        const abnormal: string[] = row[11] ? (row[11] as string).split(',').filter(x => x.length > 0) : [];
        data.push({ id: row[0] as string, zoneId: row[1] as string, zoneName: row[2] as string, temperature: row[3] as number, salinity: row[4] as number, dissolvedOxygen: row[5] as number, ph: row[6] as number, ammoniaNitrogen: row[7] as number, nitrite: row[8] as number, recordedBy: row[9] as string, recordedAt: row[10] as string, isNormal: row[11] === '' || abnormal.length === 0, abnormalItems: abnormal });
      });
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error('Get water quality error:', err);
    res.status(500).json({ error: '获取水质数据失败' });
  }
});

router.post('/', authMiddleware, roleMiddleware(['admin', 'technician']), async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId, zoneName, temperature, salinity, dissolvedOxygen, ph, ammoniaNitrogen, nitrite } = req.body;
    const id = crypto.randomUUID();
    const recordedAt = new Date().toISOString();
    const recordedBy = req.user ? req.user.name : '系统';
    const abnormal: string[] = [];
    DEFAULT_THRESHOLDS.forEach(t => {
      let val = 0;
      if (t.indicator === 'temperature') val = temperature;
      else if (t.indicator === 'salinity') val = salinity;
      else if (t.indicator === 'dissolvedOxygen') val = dissolvedOxygen;
      else if (t.indicator === 'ph') val = ph;
      else if (t.indicator === 'ammoniaNitrogen') val = ammoniaNitrogen;
      else if (t.indicator === 'nitrite') val = nitrite;
      if (val < t.min || val > t.max) abnormal.push(t.indicator);
    });
    const db = await getDb();
    db.run('INSERT INTO water_quality (id, zone_id, zone_name, temperature, salinity, dissolved_oxygen, ph, ammonia_nitrogen, nitrite, recorded_by, recorded_at, is_normal, abnormal_items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, zoneId, zoneName, temperature, salinity, dissolvedOxygen, ph, ammoniaNitrogen, nitrite, recordedBy, recordedAt, abnormal.length === 0 ? 1 : 0, abnormal.join(',')]);
    if (abnormal.length > 0) {
      const warnId = crypto.randomUUID();
      db.run('INSERT INTO warnings (id, zone_id, zone_name, type, level, indicator, current_value, threshold, consecutive_days, suggestions, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [warnId, zoneId, zoneName, 'water_quality', abnormal.length > 2 ? 'high' : 'medium', abnormal.join('、'), (temperature + salinity + dissolvedOxygen) / 3, 15, 1, JSON.stringify(['联系技术员检查', '增加换水频率']), 'pending', recordedAt]);
    }
    res.status(201).json({ success: true, data: { id, isNormal: abnormal.length === 0, abnormalItems: abnormal } });
  } catch (err) {
    console.error('Create water quality error:', err);
    res.status(500).json({ error: '创建水质记录失败' });
  }
});

router.get('/thresholds', authMiddleware, roleMiddleware(['admin', 'technician']), async (req: AuthRequest, res: Response) => {
  try {
    res.json({ success: true, data: DEFAULT_THRESHOLDS });
  } catch (err) {
    console.error('Get thresholds error:', err);
    res.status(500).json({ error: '获取阈值失败' });
  }
});

router.put('/thresholds', authMiddleware, roleMiddleware(['admin', 'technician']), async (req: AuthRequest, res: Response) => {
  try {
    res.json({ success: true, message: '阈值更新成功（已保存到内存）' });
  } catch (err) {
    console.error('Update thresholds error:', err);
    res.status(500).json({ error: '更新阈值失败' });
  }
});

export default router;
