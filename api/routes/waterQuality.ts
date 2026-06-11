import { Router, Response } from 'express';
import { getDb } from '../db/database';
import { AuthRequest } from '../middleware/auth';
import { WaterQuality, ThresholdConfig, Warning } from '../../shared/types';
import { generateId, checkWaterQuality, generateSuggestions } from '../utils/helpers';

const router = Router();

router.get('/thresholds', async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const result = db.exec('SELECT indicator, min, max, unit FROM threshold_configs');
    
    const thresholds: ThresholdConfig[] = [];
    if (result.length > 0) {
      result[0].values.forEach(row => {
        thresholds.push({
          indicator: row[0] as string,
          min: row[1] as number,
          max: row[2] as number,
          unit: row[3] as string
        });
      });
    }

    res.json({ success: true, data: thresholds });
  } catch (err) {
    console.error('Get thresholds error:', err);
    res.status(500).json({ error: '获取阈值配置失败' });
  }
});

router.put('/thresholds', async (req: AuthRequest, res: Response) => {
  try {
    const thresholds: ThresholdConfig[] = req.body;
    const db = await getDb();

    thresholds.forEach(t => {
      db.run(
        'UPDATE threshold_configs SET min = ?, max = ?, unit = ? WHERE indicator = ?',
        [t.min, t.max, t.unit, t.indicator]
      );
    });

    res.json({ success: true, data: { message: '阈值更新成功' } });
  } catch (err) {
    console.error('Update thresholds error:', err);
    res.status(500).json({ error: '更新阈值配置失败' });
  }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId, startDate, endDate } = req.query;
    const db = await getDb();
    
    let query = 'SELECT * FROM water_quality';
    const params: any[] = [];
    const conditions: string[] = [];

    if (zoneId) {
      conditions.push('zone_id = ?');
      params.push(zoneId);
    }
    if (startDate) {
      conditions.push('recorded_at >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('recorded_at <= ?');
      params.push(endDate);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY recorded_at DESC LIMIT 100';

    const result = db.exec(query, params);
    
    const records: WaterQuality[] = [];
    if (result.length > 0) {
      result[0].values.forEach(row => {
        records.push({
          id: row[0] as string,
          zoneId: row[1] as string,
          zoneName: row[2] as string,
          temperature: row[3] as number,
          salinity: row[4] as number,
          dissolvedOxygen: row[5] as number,
          ph: row[6] as number,
          ammoniaNitrogen: row[7] as number,
          nitrite: row[8] as number,
          recordedBy: row[9] as string,
          recordedAt: row[10] as string,
          isNormal: row[11] as number === 1,
          abnormalItems: JSON.parse(row[12] as string || '[]')
        });
      });
    }

    res.json({ success: true, data: records });
  } catch (err) {
    console.error('Get water quality error:', err);
    res.status(500).json({ error: '获取水质数据失败' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId, zoneName, temperature, salinity, dissolvedOxygen, ph, ammoniaNitrogen, nitrite } = req.body;
    const db = await getDb();

    const thresholdResult = db.exec('SELECT indicator, min, max FROM threshold_configs');
    const thresholds: ThresholdConfig[] = [];
    if (thresholdResult.length > 0) {
      thresholdResult[0].values.forEach(row => {
        thresholds.push({
          indicator: row[0] as string,
          min: row[1] as number,
          max: row[2] as number,
          unit: ''
        });
      });
    }

    const { isNormal, abnormalItems } = checkWaterQuality(
      { temperature, salinity, dissolvedOxygen, ph, ammoniaNitrogen, nitrite },
      thresholds
    );

    const id = generateId();
    const recordedBy = req.user?.name || '系统';
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO water_quality 
       (id, zone_id, zone_name, temperature, salinity, dissolved_oxygen, ph, 
        ammonia_nitrogen, nitrite, recorded_by, recorded_at, is_normal, abnormal_items)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, zoneId, zoneName, temperature, salinity, dissolvedOxygen, ph,
       ammoniaNitrogen, nitrite, recordedBy, now, isNormal ? 1 : 0, JSON.stringify(abnormalItems)]
    );

    if (!isNormal) {
      const indicatorNames: Record<string, string> = {
        'temperature': '水温',
        'salinity': '盐度',
        'dissolved_oxygen': '溶解氧',
        'ph': 'pH值',
        'ammonia_nitrogen': '氨氮',
        'nitrite': '亚硝酸盐'
      };

      for (const indicator of abnormalItems) {
        const countResult = db.exec(
          `SELECT COUNT(*) FROM water_quality 
           WHERE zone_id = ? AND abnormal_items LIKE ? AND recorded_at >= datetime('now', '-2 days')`,
          [zoneId, `%${indicator}%`]
        );
        
        const consecutiveDays = (countResult[0]?.values[0]?.[0] as number) || 1;
        
        if (consecutiveDays >= 2) {
          const threshold = thresholds.find(t => t.indicator === indicator);
          const currentValue = { temperature, salinity, dissolved_oxygen: dissolvedOxygen, ph, ammonia_nitrogen: ammoniaNitrogen, nitrite }[indicator] as number;
          
          let level: Warning['level'] = 'low';
          const thresholdVal = indicator === 'dissolved_oxygen' ? threshold?.min : threshold?.max;
          const deviation = thresholdVal ? Math.abs(currentValue - thresholdVal) / thresholdVal : 0;
          
          if (deviation > 0.2) level = 'high';
          else if (deviation > 0.1) level = 'medium';

          const suggestions = generateSuggestions('water_quality', indicator, level);
          const warningId = generateId();

          db.run(
            `INSERT INTO warnings 
             (id, zone_id, zone_name, type, level, indicator, current_value, threshold, 
              consecutive_days, suggestions, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [warningId, zoneId, zoneName, 'water_quality', level, indicator,
             currentValue, thresholdVal || 0, consecutiveDays, JSON.stringify(suggestions),
             'pending', now]
          );

          const indicatorName = indicatorNames[indicator] || indicator;
          db.run(
            'INSERT INTO messages (id, user_id, type, title, content, related_id, related_type, has_voucher, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [generateId(), 'tech001', 'warning', '水质超标预警',
             `${zoneName}${indicatorName}连续${consecutiveDays}天超标，当前值${currentValue}，阈值${thresholdVal}。请及时处理。`,
             warningId, 'warning', 0, 0, now]
          );

          db.run(
            'INSERT INTO messages (id, user_id, type, title, content, related_id, related_type, has_voucher, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [generateId(), 'farmer001', 'warning', '水质超标提醒',
             `${zoneName}${indicatorName}超标，请关注并配合技术人员处理。`,
             warningId, 'warning', 0, 0, now]
          );
        }
      }
    }

    const record: WaterQuality = {
      id, zoneId, zoneName, temperature, salinity, dissolvedOxygen, ph,
      ammoniaNitrogen, nitrite, recordedBy, recordedAt: now, isNormal, abnormalItems
    };

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    console.error('Create water quality error:', err);
    res.status(500).json({ error: '上传水质数据失败' });
  }
});

export default router;
