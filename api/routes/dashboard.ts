import { Router, Response } from 'express';
import { getDb } from '../db/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const zones = (db.exec('SELECT COUNT(*) FROM zones')[0].values[0][0] as number) || 0;
    const fry = (db.exec('SELECT COUNT(*) FROM fry_release_records')[0].values[0][0] as number) || 0;
    const wq = (db.exec('SELECT COUNT(*) FROM water_quality_records')[0].values[0][0] as number) || 0;
    const warn = db.exec('SELECT status, COUNT(*) FROM warnings GROUP BY status');
    const warnings = { total: 0, pending: 0, processing: 0, resolved: 0 };
    if (warn.length > 0) warn[0].values.forEach((w: any) => { warnings.total += w[1] as number; if (warnings[w[0]] !== undefined) warnings[w[0]] = w[1] as number; });
    const feeding = (db.exec('SELECT COUNT(*) FROM feeding_logs')[0].values[0][0] as number) || 0;
    const harvest = (db.exec('SELECT COUNT(*) FROM harvest_tasks')[0].values[0][0] as number) || 0;
    const finance = db.exec('SELECT COALESCE(SUM(amount),0) FROM finance_reports WHERE type="income"');
    const totalIncome = (finance.length > 0 ? (finance[0].values[0][0] as number) : 0) || 0;
    const userRole = req.user?.role || 'admin';
    res.json({ success: true, data: { totalZones: zones, totalFryRelease: fry, totalWaterQualityRecords: wq, totalWarnings: warnings.total, pendingWarnings: warnings.pending, processingWarnings: warnings.processing, resolvedWarnings: warnings.resolved, totalFeedingLogs: feeding, totalHarvestTasks: harvest, totalIncome, userRole } });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: '获取概览失败' });
  }
});

router.get('/zones-overview', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const zones = db.exec('SELECT id, name, status, area FROM zones ORDER BY name');
    const data: any[] = [];
    if (zones.length > 0) zones[0].values.forEach((z: any) => {
      const wq = db.exec('SELECT ph, dissolved_oxygen, ammonia_nitrogen, temperature, recorded_at FROM water_quality_records WHERE zone_id = ? ORDER BY recorded_at DESC LIMIT 1', [z[0]]);
      const lastWq = wq.length > 0 && wq[0].values.length > 0 ? { ph: wq[0].values[0][0], do: wq[0].values[0][1], ammonia: wq[0].values[0][2], temp: wq[0].values[0][3], recordedAt: wq[0].values[0][4] } : null;
      const wrn = (db.exec('SELECT COUNT(*) FROM warnings WHERE zone_id = ? AND status != "resolved"', [z[0]])[0].values[0][0] as number) || 0;
      data.push({ id: z[0], name: z[1], status: z[2], area: z[3], latestWaterQuality: lastWq, activeWarnings: wrn });
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('Zones overview error:', err);
    res.status(500).json({ error: '获取区域概览失败' });
  }
});

router.get('/recent-warnings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const { limit = 10 } = req.query;
    const n = Math.min(50, parseInt(limit as string) || 10);
    const result = db.exec('SELECT id, zone_name, type, level, indicator, current_value, threshold, status, created_at FROM warnings ORDER BY created_at DESC LIMIT ?', [n]);
    const data: any[] = [];
    if (result.length > 0) result[0].values.forEach((r: any) => data.push({ id: r[0], zoneName: r[1], type: r[2], level: r[3], indicator: r[4], currentValue: r[5], threshold: r[6], status: r[7], createdAt: r[8] }));
    res.json({ success: true, data });
  } catch (err) {
    console.error('Recent warnings error:', err);
    res.status(500).json({ error: '获取近期预警失败' });
  }
});

router.get('/water-quality-trend', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const { zoneId, days = 14 } = req.query;
    const d = Math.min(90, Math.max(3, parseInt(days as string) || 14));
    const params: any[] = [];
    let zoneFilter = '';
    if (zoneId) { zoneFilter = ' WHERE zone_id = ?'; params.push(zoneId); }
    const limit = d * 5;
    const result = db.exec('SELECT zone_id, zone_name, recorded_at, ph, dissolved_oxygen, ammonia_nitrogen, nitrite, temperature FROM water_quality_records' + zoneFilter + ' ORDER BY recorded_at DESC LIMIT ?', [...params, limit]);
    const trend: any[] = [];
    if (result.length > 0) result[0].values.forEach((r: any) => trend.push({ zoneId: r[0], zoneName: r[1], recordedAt: r[2], ph: r[3], dissolvedOxygen: r[4], ammoniaNitrogen: r[5], nitrite: r[6], temperature: r[7] }));
    res.json({ success: true, data: trend.reverse() });
  } catch (err) {
    console.error('Water quality trend error:', err);
    res.status(500).json({ error: '获取水质趋势失败' });
  }
});

router.get('/finance-overview', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const reports = db.exec('SELECT type, category, amount, report_date FROM finance_reports ORDER BY report_date DESC LIMIT 100');
    let totalIncome = 0, totalExpense = 0;
    const byCategory: any = {};
    const monthly: any = {};
    if (reports.length > 0) reports[0].values.forEach((r: any) => {
      const amt = r[2] as number;
      const cat = r[1] as string;
      const dt = (r[3] as string).substring(0, 7);
      if (r[0] === 'income') totalIncome += amt; else totalExpense += amt;
      byCategory[cat] = (byCategory[cat] || 0) + amt;
      if (monthly[dt] === undefined) monthly[dt] = { income: 0, expense: 0 };
      if (r[0] === 'income') monthly[dt].income += amt; else monthly[dt].expense += amt;
    });
    const netProfit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 10000) / 100 : 0;
    const monthlyTrend = Object.keys(monthly).sort().map(k => ({ month: k, income: monthly[k].income, expense: monthly[k].expense, net: monthly[k].income - monthly[k].expense }));
    res.json({ success: true, data: { totalIncome, totalExpense, netProfit, profitMargin, byCategory, monthlyTrend } });
  } catch (err) {
    console.error('Finance overview error:', err);
    res.status(500).json({ error: '获取财务概览失败' });
  }
});

router.get('/production-chart', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const fry = db.exec('SELECT release_date, species, quantity FROM fry_release_records ORDER BY release_date DESC LIMIT 100');
    const feed = db.exec('SELECT feeding_time, feed_type, amount FROM feeding_logs ORDER BY feeding_time DESC LIMIT 200');
    const harvest = db.exec("SELECT plan_date, plan_yield, actual_yield FROM harvest_tasks WHERE actual_yield IS NOT NULL ORDER BY plan_date DESC LIMIT 50");
    const fryData: any[] = [], feedData: any[] = [], harvestData: any[] = [];
    if (fry.length > 0) fry[0].values.forEach((r: any) => fryData.push({ date: r[0], species: r[1], quantity: r[2] }));
    if (feed.length > 0) feed[0].values.forEach((r: any) => feedData.push({ date: (r[0] as string).substring(0, 10), feedType: r[1], amount: r[2] }));
    if (harvest.length > 0) harvest[0].values.forEach((r: any) => harvestData.push({ date: r[0], planYield: r[1], actualYield: r[2] }));
    res.json({ success: true, data: { fryRelease: fryData.reverse(), feeding: feedData.reverse(), harvest: harvestData.reverse() } });
  } catch (err) {
    console.error('Production chart error:', err);
    res.status(500).json({ error: '获取生产图表失败' });
  }
});

export default router;
