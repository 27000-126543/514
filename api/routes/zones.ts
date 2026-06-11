import { Router, Response } from 'express';
import { getDb } from '../db/database';
import { AuthRequest } from '../middleware/auth';
import { Zone, DiseaseRule } from '../../shared/types';
import { generateId } from '../utils/helpers';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    
    const zonesResult = db.exec('SELECT * FROM zones ORDER BY created_at DESC');
    const rulesResult = db.exec('SELECT * FROM disease_rules');
    
    const rulesMap = new Map<string, DiseaseRule[]>();
    if (rulesResult.length > 0) {
      rulesResult[0].values.forEach(row => {
        const zoneId = row[1] as string;
        const rule: DiseaseRule = {
          id: row[0] as string,
          indicator: row[2] as string,
          threshold: row[3] as number,
          action: row[4] as 'notify' | 'lock'
        };
        if (!rulesMap.has(zoneId)) {
          rulesMap.set(zoneId, []);
        }
        rulesMap.get(zoneId)!.push(rule);
      });
    }

    const zones: Zone[] = [];
    if (zonesResult.length > 0) {
      zonesResult[0].values.forEach(row => {
        const zoneId = row[0] as string;
        zones.push({
          id: zoneId,
          name: row[1] as string,
          area: row[2] as number,
          targetOutput: row[3] as number,
          status: row[4] as Zone['status'],
          currentStock: row[5] as number,
          growthRate: row[6] as number,
          diseaseControlRules: rulesMap.get(zoneId) || [],
          createdAt: row[7] as string
        });
      });
    }

    res.json({ success: true, data: zones });
  } catch (err) {
    console.error('Get zones error:', err);
    res.status(500).json({ error: '获取养殖区列表失败' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    
    const zoneResult = db.exec('SELECT * FROM zones WHERE id = ?', [id]);
    if (zoneResult.length === 0 || zoneResult[0].values.length === 0) {
      return res.status(404).json({ error: '养殖区不存在' });
    }

    const rulesResult = db.exec('SELECT * FROM disease_rules WHERE zone_id = ?', [id]);
    const rules: DiseaseRule[] = [];
    if (rulesResult.length > 0) {
      rulesResult[0].values.forEach(row => {
        rules.push({
          id: row[0] as string,
          indicator: row[2] as string,
          threshold: row[3] as number,
          action: row[4] as 'notify' | 'lock'
        });
      });
    }

    const row = zoneResult[0].values[0];
    const zone: Zone = {
      id: row[0] as string,
      name: row[1] as string,
      area: row[2] as number,
      targetOutput: row[3] as number,
      status: row[4] as Zone['status'],
      currentStock: row[5] as number,
      growthRate: row[6] as number,
      diseaseControlRules: rules,
      createdAt: row[7] as string
    };

    res.json({ success: true, data: zone });
  } catch (err) {
    console.error('Get zone error:', err);
    res.status(500).json({ error: '获取养殖区详情失败' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, area, targetOutput, status, currentStock, growthRate } = req.body;
    const db = await getDb();
    
    const id = generateId();
    const now = new Date().toISOString();

    db.run(
      'INSERT INTO zones (id, name, area, target_output, status, current_stock, growth_rate, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, area, targetOutput, status || 'normal', currentStock || 0, growthRate || 0, now]
    );

    const zone: Zone = {
      id,
      name,
      area,
      targetOutput,
      status: status || 'normal',
      currentStock: currentStock || 0,
      growthRate: growthRate || 0,
      diseaseControlRules: [],
      createdAt: now
    };

    res.status(201).json({ success: true, data: zone });
  } catch (err) {
    console.error('Create zone error:', err);
    res.status(500).json({ error: '创建养殖区失败' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, area, targetOutput, status, currentStock, growthRate, diseaseControlRules } = req.body;
    const db = await getDb();

    db.run(
      'UPDATE zones SET name = ?, area = ?, target_output = ?, status = ?, current_stock = ?, growth_rate = ? WHERE id = ?',
      [name, area, targetOutput, status, currentStock, growthRate, id]
    );

    if (diseaseControlRules && Array.isArray(diseaseControlRules)) {
      db.run('DELETE FROM disease_rules WHERE zone_id = ?', [id]);
      diseaseControlRules.forEach((rule: DiseaseRule) => {
        db.run(
          'INSERT INTO disease_rules (id, zone_id, indicator, threshold, action, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [generateId(), id, rule.indicator, rule.threshold, rule.action, new Date().toISOString()]
        );
      });
    }

    if (status === 'locked') {
      const db2 = await getDb();
      db2.run(
        'INSERT INTO messages (id, user_id, type, title, content, related_id, related_type, has_voucher, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [generateId(), 'admin001', 'system', '养殖区已锁定', '养殖区 ' + name + ' 因指标异常已被系统锁定，请及时处理。', id, 'zone', 0, 0, new Date().toISOString()]
      );
    }

    res.json({ success: true, data: { message: '更新成功' } });
  } catch (err) {
    console.error('Update zone error:', err);
    res.status(500).json({ error: '更新养殖区失败' });
  }
});

export default router;

