import { Router, Response } from 'express';
import { getDb } from '../db/database';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middleware/auth';
import { Order, TraceRecord } from '../../shared/types';

const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware(['admin', 'farmer']));

router.get('/orders', authMiddleware, roleMiddleware(['admin', 'farmer']), async (req: AuthRequest, res: Response) => {
  try {
    const { status, zoneId } = req.query;
    const db = await getDb();
    let query = 'SELECT * FROM orders';
    const params: any[] = [];
    const conds: string[] = [];
    if (status) { conds.push('status = ?'); params.push(status); }
    if (zoneId) { conds.push('zone_id = ?'); params.push(zoneId); }
    if (conds.length > 0) query += ' WHERE ' + conds.join(' AND ');
    query += ' ORDER BY created_at DESC LIMIT 500';
    const result = db.exec(query, params);
    const orders: Order[] = [];
    if (result.length > 0) {
      result[0].values.forEach(row => {
        orders.push({ id: row[0] as string, orderNo: row[1] as string, zoneId: row[2] as string, zoneName: row[3] as string, species: row[4] as string, quantity: row[5] as number, unitPrice: row[6] as number, totalAmount: row[7] as number, customerName: row[8] as string, traceCode: row[9] as string, status: row[10] as Order['status'], createdAt: row[11] as string });
      });
    }
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: '获取订单失败' });
  }
});

router.post('/orders', authMiddleware, roleMiddleware(['admin', 'farmer']), async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId, zoneName, species, quantity, unitPrice, customerName } = req.body;
    const id = crypto.randomUUID();
    const orderNo = 'ORD-' + Date.now().toString(36).toUpperCase();
    const traceCode = 'TRACE-' + crypto.randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase();
    const totalAmount = Math.round(quantity * unitPrice * 100) / 100;
    const status = 'pending';
    const createdAt = new Date().toISOString();
    const db = await getDb();
    db.run('INSERT INTO orders (id, order_no, zone_id, zone_name, species, quantity, unit_price, total_amount, customer_name, trace_code, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, orderNo, zoneId, zoneName, species || '大菱鲆', quantity, unitPrice, totalAmount, customerName, traceCode, status, createdAt]);
    res.status(201).json({ success: true, data: { id, orderNo, traceCode, totalAmount } });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: '创建订单失败' });
  }
});

router.get('/trace/:code', authMiddleware, roleMiddleware(['admin', 'farmer']), async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const db = await getDb();
    const result = db.exec('SELECT * FROM orders WHERE trace_code = ?', [code]);
    let order = null;
    if (result.length > 0 && result[0].values.length > 0) {
      const row = result[0].values[0];
      order = {
        id: row[0] as string, orderNo: row[1] as string, zoneId: row[2] as string, zoneName: row[3] as string,
        species: row[4] as string, quantity: row[5] as number, unitPrice: row[6] as number, totalAmount: row[7] as number,
        customerName: row[8] as string, traceCode: row[9] as string, status: row[10] as Order['status'], createdAt: row[11] as string
      };
    }
    const records: TraceRecord[] = [];
    if (order) {
      const zoneName = order.zoneName;
      records.push({ type: 'fry_release', description: '鱼苗投放 - 区域：' + zoneName, operator: '养殖员', timestamp: order.createdAt, data: { species: order.species, quantity: order.quantity } });
      records.push({ type: 'feeding', description: '日常投喂管理 - 区域：' + zoneName, operator: '养殖员', timestamp: order.createdAt, data: { feedType: '配合饲料', frequency: '每日2次' } });
      records.push({ type: 'water_quality', description: '水质监测 - 区域：' + zoneName, operator: '技术员', timestamp: order.createdAt, data: { temperature: 16, salinity: 30, dissolvedOxygen: 7, ph: 8 } });
      records.push({ type: 'harvest', description: '捕捞收获 - 区域：' + zoneName, operator: '管理员', timestamp: order.createdAt, data: { method: '人工捕捞', quality: 'A级' } });
      records.push({ type: 'processing', description: '加工包装', operator: '加工厂', timestamp: order.createdAt, data: { package: '真空包装', coldChain: true } });
      records.push({ type: 'sale', description: '销售出库 - 订单号：' + order.orderNo, operator: '销售员', timestamp: order.createdAt, data: { customer: order.customerName, quantity: order.quantity, totalAmount: order.totalAmount } });
    }
    res.json({ success: true, data: order ? { order, records } : null });
  } catch (err) {
    console.error('Get trace error:', err);
    res.status(500).json({ error: '获取溯源信息失败' });
  }
});

router.get('/qrcode/:code', authMiddleware, roleMiddleware(['admin', 'farmer']), async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    res.json({ success: true, data: { code, url: 'https://example.com/trace/' + code, base64: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmZmIi8+PHRleHQgeD0iMTAiIHk9IjY1IiBmb250LXNpemU9IjEwIiBmaWxsPSIjMzMzIj7nu4jorI3ku6vnoIHmnJ/kuI3po448L3RleHQ+PC9zdmc+' } });
  } catch (err) {
    console.error('Get qrcode error:', err);
    res.status(500).json({ error: '获取二维码失败' });
  }
});

export default router;
