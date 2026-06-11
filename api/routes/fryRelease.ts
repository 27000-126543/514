import { Router, Response } from 'express';
import { getDb } from '../db/database';
import { AuthRequest } from '../middleware/auth';
import { RecommendRequest, RecommendResponse, FryRelease, BreedingArchive } from '../../shared/types';
import { generateId, calculateDensity, calculateFeedFormula } from '../utils/helpers';

const router = Router();

router.post('/recommend', async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId, species }: RecommendRequest = req.body;
    const db = await getDb();

    const zoneResult = db.exec('SELECT area FROM zones WHERE id = ?', [zoneId]);
    if (zoneResult.length === 0 || zoneResult[0].values.length === 0) {
      return res.status(404).json({ error: '养殖区不存在' });
    }
    const area = zoneResult[0].values[0][0] as number;

    const wqResult = db.exec(
      'SELECT temperature, salinity, dissolved_oxygen FROM water_quality WHERE zone_id = ? ORDER BY recorded_at DESC LIMIT 1',
      [zoneId]
    );

    let temperature = 23;
    let salinity = 26;
    let dissolvedOxygen = 7.5;

    if (wqResult.length > 0 && wqResult[0].values.length > 0) {
      temperature = wqResult[0].values[0][0] as number;
      salinity = wqResult[0].values[0][1] as number;
      dissolvedOxygen = wqResult[0].values[0][2] as number;
    }

    const historyResult = db.exec(
      'SELECT historical_mortality FROM fry_releases WHERE zone_id = ? ORDER BY created_at DESC LIMIT 3',
      [zoneId]
    );
    let historicalMortality = 0.05;
    if (historyResult.length > 0 && historyResult[0].values.length > 0) {
      const mortalities = historyResult[0].values.map(r => r[0] as number);
      historicalMortality = mortalities.reduce((a, b) => a + b, 0) / mortalities.length;
    }

    const { density, maxQuantity, confidence } = calculateDensity(
      area, temperature, salinity, dissolvedOxygen, historicalMortality
    );

    const feedFormula = calculateFeedFormula(species, temperature);

    const response: RecommendResponse = {
      recommendedDensity: density,
      feedFormula,
      maxQuantity,
      confidence,
      factors: [
        { name: '水域面积', value: area, weight: 0.3 },
        { name: '水温', value: temperature, weight: 0.2 },
        { name: '盐度', value: salinity, weight: 0.15 },
        { name: '溶解氧', value: dissolvedOxygen, weight: 0.2 },
        { name: '历史死亡率', value: historicalMortality, weight: 0.15 }
      ]
    };

    res.json({ success: true, data: response });
  } catch (err) {
    console.error('Recommend error:', err);
    res.status(500).json({ error: '获取推荐方案失败' });
  }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const result = db.exec('SELECT * FROM fry_releases ORDER BY created_at DESC');
    
    const releases: FryRelease[] = [];
    if (result.length > 0) {
      result[0].values.forEach(row => {
        releases.push({
          id: row[0] as string,
          zoneId: row[1] as string,
          zoneName: row[2] as string,
          species: row[3] as string,
          quantity: row[4] as number,
          recommendedDensity: row[5] as number,
          feedFormula: row[6] as string,
          waterTemp: row[7] as number,
          salinity: row[8] as number,
          dissolvedOxygen: row[9] as number,
          historicalMortality: row[10] as number,
          archiveId: row[11] as string,
          operator: row[12] as string,
          createdAt: row[13] as string
        });
      });
    }

    res.json({ success: true, data: releases });
  } catch (err) {
    console.error('Get fry releases error:', err);
    res.status(500).json({ error: '获取投放记录失败' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId, zoneName, species, quantity, recommendedDensity, feedFormula,
            waterTemp, salinity, dissolvedOxygen, historicalMortality } = req.body;
    const db = await getDb();

    const id = generateId();
    const archiveId = generateId();
    const operator = req.user?.name || '系统';
    const now = new Date().toISOString();

    const archiveContent = `电子养殖档案
编号：${archiveId}
投放区域：${zoneName}
鱼苗品种：${species}
投放数量：${quantity}尾
推荐密度：${recommendedDensity}尾/㎡
投放时间：${now}
水质参数：
  - 水温：${waterTemp}°C
  - 盐度：${salinity}‰
  - 溶解氧：${dissolvedOxygen}mg/L
历史死亡率：${(historicalMortality * 100).toFixed(2)}%
饲料配方：${feedFormula}
操作员：${operator}`;

    db.run(
      'INSERT INTO breeding_archives (id, fry_release_id, content, created_at) VALUES (?, ?, ?, ?)',
      [archiveId, id, archiveContent, now]
    );

    db.run(
      `INSERT INTO fry_releases 
       (id, zone_id, zone_name, species, quantity, recommended_density, feed_formula, 
        water_temp, salinity, dissolved_oxygen, historical_mortality, archive_id, operator, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, zoneId, zoneName, species, quantity, recommendedDensity, feedFormula,
       waterTemp, salinity, dissolvedOxygen, historicalMortality, archiveId, operator, now]
    );

    db.run(
      'INSERT INTO messages (id, user_id, type, title, content, related_id, related_type, has_voucher, voucher_url, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [generateId(), req.user?.id || 'farmer001', 'fry_release', '鱼苗投放成功',
       `${zoneName} ${species}鱼苗投放${quantity}尾已完成，养殖档案已生成。`,
       id, 'fry_release', 1, `/api/fry-release/${id}/archive`, 0, now]
    );

    const release: FryRelease = {
      id, zoneId, zoneName, species, quantity, recommendedDensity, feedFormula,
      waterTemp, salinity, dissolvedOxygen, historicalMortality, archiveId, operator, createdAt: now
    };

    res.status(201).json({ success: true, data: release });
  } catch (err) {
    console.error('Create fry release error:', err);
    res.status(500).json({ error: '创建投放记录失败' });
  }
});

router.get('/:id/archive', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    
    const result = db.exec(
      'SELECT ba.* FROM breeding_archives ba JOIN fry_releases fr ON ba.fry_release_id = fr.id WHERE fr.id = ? OR ba.id = ?',
      [id, id]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: '养殖档案不存在' });
    }

    const row = result[0].values[0];
    const archive: BreedingArchive = {
      id: row[0] as string,
      fryReleaseId: row[1] as string,
      content: row[2] as string,
      createdAt: row[3] as string
    };

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="养殖档案_${archive.id}.txt"`);
    res.send(archive.content);
  } catch (err) {
    console.error('Get archive error:', err);
    res.status(500).json({ error: '获取养殖档案失败' });
  }
});

export default router;
