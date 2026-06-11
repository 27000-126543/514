import { Router, Response } from 'express';
import { getDb } from '../db/database';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middleware/auth';
import { FryRelease } from '../../shared/types';

const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware(['admin', 'farmer']));

router.get('/', authMiddleware, roleMiddleware(['admin', 'farmer']), async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId, species } = req.query;
    const db = await getDb();
    let query = 'SELECT * FROM fry_releases';
    const params: any[] = [];
    const conds: string[] = [];
    if (zoneId) { conds.push('zone_id = ?'); params.push(zoneId); }
    if (species) { conds.push('species LIKE ?'); params.push('%' + species + '%'); }
    if (conds.length > 0) query += ' WHERE ' + conds.join(' AND ');
    query += ' ORDER BY created_at DESC LIMIT 500';
    const result = db.exec(query, params);
    const data: FryRelease[] = [];
    if (result.length > 0) {
      result[0].values.forEach(row => {
        data.push({ id: row[0] as string, zoneId: row[1] as string, zoneName: row[2] as string, species: row[3] as string, quantity: row[4] as number, recommendedDensity: row[5] as number || 0, feedFormula: row[6] as string || '', waterTemp: row[7] as number || 0, salinity: row[8] as number || 0, dissolvedOxygen: row[9] as number || 0, historicalMortality: row[10] as number || 0, archiveId: row[11] as string || '', createdAt: row[12] as string, operator: row[13] as string || '' });
      });
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error('Get fry release error:', err);
    res.status(500).json({ error: '获取投放记录失败' });
  }
});

router.post('/', authMiddleware, roleMiddleware(['admin', 'farmer']), async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId, zoneName, species, quantity, recommendedDensity, feedFormula, waterTemp, salinity, dissolvedOxygen, historicalMortality, operator } = req.body;
    const id = crypto.randomUUID();
    const archiveId = 'ARCH-' + Date.now().toString(36).toUpperCase();
    const now = new Date().toISOString();
    const db = await getDb();
    const opName = operator ? operator : (req.user ? req.user.name : '系统');
    db.run('INSERT INTO fry_releases (id, zone_id, zone_name, species, quantity, recommended_density, feed_formula, water_temp, salinity, dissolved_oxygen, historical_mortality, archive_id, created_at, operator) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, zoneId, zoneName, species, quantity, recommendedDensity || 0, feedFormula || '', waterTemp || 15, salinity || 30, dissolvedOxygen || 6, historicalMortality || 5, archiveId, now, opName]);
    res.status(201).json({ success: true, data: { id, archiveId } });
  } catch (err) {
    console.error('Create fry release error:', err);
    res.status(500).json({ error: '创建投放记录失败' });
  }
});

router.post('/recommend', authMiddleware, roleMiddleware(['admin', 'farmer']), async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId, species } = req.body;
    const db = await getDb();
    const zone = zoneId ? db.exec('SELECT area, name FROM zones WHERE id = ?', [zoneId]) : null;
    let area = 100;
    let zoneName = '未指定区域';
    if (zone && zone.length > 0 && zone[0].values.length > 0) { area = zone[0].values[0][0] as number; zoneName = zone[0].values[0][1] as string; }
    const recommendedDensity = Math.round(area * 30);
    const maxQuantity = Math.round(area * 40);
    const factors = [{ name: '水域面积', value: area, weight: 0.35 }, { name: '物种类型', value: species ? 1 : 0, weight: 0.25 }, { name: '历史数据', value: 0.8, weight: 0.25 }, { name: '季节因素', value: 0.9, weight: 0.15 }];
    const confidence = 85;
    let feedFormula = '专用配合饲料';
    if (species === '大菱鲆') { feedFormula = '大菱鲆专用配合饲料，蛋白质含量45%'; } else if (species === undefined || species === null || species.length === 0) { feedFormula = '大菱鲆专用配合饲料，蛋白质含量45%'; }
    res.json({ success: true, data: { zoneName, area, recommendedDensity, feedFormula, maxQuantity, confidence, factors } });
  } catch (err) {
    console.error('Recommend error:', err);
    res.status(500).json({ error: '推荐计算失败' });
  }
});

export default router;
