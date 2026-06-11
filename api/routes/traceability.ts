import { Router, Response } from 'express';
import { getDb } from '../db/database';
import { AuthRequest } from '../middleware/auth';
import { Order, TraceRecord } from '../../shared/types';
import { generateId } from '../utils/helpers';
import QRCode from 'qrcode';

const router = Router();

router.get('/orders', async (req: AuthRequest, res: Response) => {
  try {
    const { status, zoneId } = req.query;
    const db = await getDb();
    
    let query = 'SELECT * FROM orders';
    const params: any[] = [];
    const conditions: string[] = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (zoneId) {
      conditions.push('zone_id = ?');
      params.push(zoneId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const result = db.exec(query, params);
    
    const orders: Order[] = [];
    if (result.length > 0) {
      result[0].values.forEach(row => {
        orders.push({
          id: row[0] as string,
          orderNo: row[1] as string,
          zoneId: row[2] as string,
          zoneName: row[3] as string,
          species: row[4] as string,
          quantity: row[5] as number,
          unitPrice: row[6] as number,
          totalAmount: row[7] as number,
          customerName: row[8] as string,
          traceCode: row[9] as string,
          status: row[10] as Order['status'],
          createdAt: row[11] as string
        });
      });
    }

    res.json({ success: true, data: orders });
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: '获取订单列表失败' });
  }
});

router.post('/orders', async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId, zoneName, species, quantity, unitPrice, customerName } = req.body;
    const db = await getDb();

    const id = generateId();
    const now = new Date().toISOString();
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const orderNo = `ORD${dateStr}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const traceCode = `TRACE${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const totalAmount = quantity * unitPrice;

    const archiveResult = db.exec(
      'SELECT id FROM breeding_archives ORDER BY created_at DESC LIMIT 1'
    );
    let archiveId = 'default_archive';
    if (archiveResult.length > 0 && archiveResult[0].values.length > 0) {
      archiveId = archiveResult[0].values[0][0] as string;
    }

    db.run(
      `INSERT INTO orders 
       (id, order_no, zone_id, zone_name, species, quantity, unit_price, total_amount, 
        customer_name, trace_code, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, orderNo, zoneId, zoneName, species, quantity, unitPrice, totalAmount,
       customerName, traceCode, 'pending', now]
    );

    db.run(
      'INSERT INTO trace_codes (code, order_id, archive_id, created_at) VALUES (?, ?, ?, ?)',
      [traceCode, id, archiveId, now]
    );

    db.run(
      'INSERT INTO messages (id, user_id, type, title, content, related_id, related_type, has_voucher, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [generateId(), req.user?.id || 'farmer001', 'sale', '订单已创建',
       `订单${orderNo}已创建，溯源码${traceCode}已生成。`,
       id, 'order', 0, 0, now]
    );

    const order: Order = {
      id, orderNo, zoneId, zoneName, species, quantity, unitPrice, totalAmount,
      customerName, traceCode, status: 'pending', createdAt: now
    };

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: '创建订单失败' });
  }
});

router.get('/trace/:code', async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const db = await getDb();

    const traceResult = db.exec(
      'SELECT tc.code, tc.order_id, tc.archive_id, tc.created_at, o.*, ba.content as archive_content ' +
      'FROM trace_codes tc ' +
      'LEFT JOIN orders o ON tc.order_id = o.id ' +
      'LEFT JOIN breeding_archives ba ON tc.archive_id = ba.id ' +
      'WHERE tc.code = ?',
      [code]
    );

    if (traceResult.length === 0 || traceResult[0].values.length === 0) {
      return res.status(404).json({ error: '溯源码不存在' });
    }

    const row = traceResult[0].values[0];
    const orderId = row[1] as string;
    const archiveContent = row[13] as string;
    const species = row[6] as string;
    const zoneId = row[3] as string;
    const zoneName = row[4] as string;

    const wqResult = db.exec(
      'SELECT * FROM water_quality WHERE zone_id = ? ORDER BY recorded_at DESC LIMIT 10',
      [zoneId]
    );

    const feedingResult = db.exec(
      'SELECT * FROM feeding_logs WHERE zone_id = ? ORDER BY fed_at DESC LIMIT 10',
      [zoneId]
    );

    const records: TraceRecord[] = [
      {
        type: 'order_created',
        description: `订单创建 - ${row[2] as string}`,
        operator: row[9] as string,
        timestamp: row[12] as string,
        data: { orderNo: row[2], customer: row[9], quantity: row[7], unitPrice: row[8] }
      }
    ];

    if (archiveContent) {
      records.push({
        type: 'fry_release',
        description: '鱼苗投放',
        operator: '养殖户',
        timestamp: row[12] as string,
        data: { archiveContent }
      });
    }

    if (wqResult.length > 0) {
      wqResult[0].values.forEach(r => {
        records.push({
          type: 'water_quality',
          description: `水质监测 - ${r[2] as string}`,
          operator: r[10] as string,
          timestamp: r[11] as string,
          data: {
            temperature: r[3],
            salinity: r[4],
            dissolvedOxygen: r[5],
            ph: r[6],
            isNormal: r[12] === 1
          }
        });
      });
    }

    if (feedingResult.length > 0) {
      feedingResult[0].values.forEach(r => {
        records.push({
          type: 'feeding',
          description: `投喂记录 - ${r[3] as string}`,
          operator: '系统',
          timestamp: r[10] as string,
          data: {
            scheduledAmount: r[5],
            actualAmount: r[6],
            weather: r[8],
            growthDays: r[9]
          }
        });
      });
    }

    records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ success: true, data: {
      traceCode: code,
      orderId,
      species,
      zoneName,
      records
    }});
  } catch (err) {
    console.error('Get trace error:', err);
    res.status(500).json({ error: '获取溯源信息失败' });
  }
});

router.get('/orders/:id/qrcode', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const result = db.exec('SELECT trace_code FROM orders WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: '订单不存在' });
    }

    const traceCode = result[0].values[0][0] as string;
    const traceUrl = `${req.protocol}://${req.get('host')}/trace/${traceCode}`;
    
    const qrDataUrl = await QRCode.toDataURL(traceUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#0A2463',
        light: '#FFFFFF'
      }
    });

    res.json({ success: true, data: { qrCode: qrDataUrl, traceCode, traceUrl } });
  } catch (err) {
    console.error('Generate QR code error:', err);
    res.status(500).json({ error: '生成二维码失败' });
  }
});

export default router;
