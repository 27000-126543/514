import { Router, Response } from 'express';
import { getDb } from '../db/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { DashboardStats, Zone, Warning, WaterQuality, FinanceReport } from '../../shared/types.js';

const router = Router();

router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    
    const zonesResult = db.exec(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) as warning,
        SUM(CASE WHEN status = 'locked' THEN 1 ELSE 0 END) as locked,
        SUM(current_stock) as total_stock
      FROM zones
    `);
    
    const warningsResult = db.exec(`
      SELECT COUNT(*) as pending
      FROM warnings 
      WHERE status = 'pending'
    `);
    
    const today = new Date().toISOString().split('T')[0];
    const feedingsResult = db.exec(`
      SELECT COUNT(*) as today_count
      FROM feeding_logs 
      WHERE DATE(fed_at) = ?
    `, [today]);
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const outputResult = db.exec(`
      SELECT COALESCE(SUM(output), 0) as monthly_output
      FROM finance_reports 
      WHERE report_month = ?
    `, [currentMonth]);
    
    let totalZones = 0, activeZones = 0, warningZones = 0, lockedZones = 0, totalStock = 0;
    if (zonesResult.length > 0 && zonesResult[0].values.length > 0) {
      const row = zonesResult[0].values[0];
      totalZones = row[0] as number;
      activeZones = row[1] as number;
      warningZones = row[2] as number;
      lockedZones = row[3] as number;
      totalStock = row[4] as number;
    }
    
    let pendingWarnings = 0;
    if (warningsResult.length > 0 && warningsResult[0].values.length > 0) {
      pendingWarnings = warningsResult[0].values[0][0] as number;
    }
    
    let todayFeedings = 0;
    if (feedingsResult.length > 0 && feedingsResult[0].values.length > 0) {
      todayFeedings = feedingsResult[0].values[0][0] as number;
    }
    
    let monthlyOutput = 0;
    if (outputResult.length > 0 && outputResult[0].values.length > 0) {
      monthlyOutput = outputResult[0].values[0][0] as number;
    }
    
    const stats: DashboardStats = {
      totalZones,
      activeZones,
      warningZones,
      lockedZones,
      totalStock,
      pendingWarnings,
      todayFeedings,
      monthlyOutput
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('获取统计数据失败:', err);
    res.status(500).json({
      success: false,
      error: '获取统计数据失败'
    });
  }
});

router.get('/zones-overview', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    
    const result = db.exec(`
      SELECT id, name, area, target_output, status, current_stock, growth_rate, created_at
      FROM zones
      ORDER BY name
    `);
    
    const zones: Zone[] = [];
    if (result.length > 0) {
      for (const row of result[0].values) {
        const zoneId = row[0] as string;
        const rulesResult = db.exec(`
          SELECT id, indicator, threshold, action
          FROM disease_rules
          WHERE zone_id = ?
        `, [zoneId]);
        
        const diseaseControlRules = [];
        if (rulesResult.length > 0) {
          for (const ruleRow of rulesResult[0].values) {
            diseaseControlRules.push({
              id: ruleRow[0] as string,
              indicator: ruleRow[1] as string,
              threshold: ruleRow[2] as number,
              action: ruleRow[3] as 'notify' | 'lock'
            });
          }
        }
        
        zones.push({
          id: zoneId,
          name: row[1] as string,
          area: row[2] as number,
          targetOutput: row[3] as number,
          status: row[4] as 'normal' | 'warning' | 'locked',
          currentStock: row[5] as number,
          growthRate: row[6] as number,
          diseaseControlRules,
          createdAt: row[7] as string
        });
      }
    }
    
    res.json({
      success: true,
      data: zones
    });
  } catch (err) {
    console.error('获取养殖区概览失败:', err);
    res.status(500).json({
      success: false,
      error: '获取养殖区概览失败'
    });
  }
});

router.get('/recent-warnings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const { limit = 10 } = req.query;
    
    const result = db.exec(`
      SELECT id, zone_id, zone_name, type, level, indicator, current_value, threshold,
             consecutive_days, suggestions, status, created_at, handled_at, handled_by, handle_note
      FROM warnings
      ORDER BY created_at DESC
      LIMIT ?
    `, [limit as number]);
    
    const warnings: Warning[] = [];
    if (result.length > 0) {
      for (const row of result[0].values) {
        warnings.push({
          id: row[0] as string,
          zoneId: row[1] as string,
          zoneName: row[2] as string,
          type: row[3] as 'water_quality' | 'growth' | 'disease',
          level: row[4] as 'low' | 'medium' | 'high',
          indicator: row[5] as string,
          currentValue: row[6] as number,
          threshold: row[7] as number,
          consecutiveDays: row[8] as number,
          suggestions: JSON.parse(row[9] as string),
          status: row[10] as 'pending' | 'processing' | 'resolved',
          createdAt: row[11] as string,
          handledAt: row[12] as string | undefined,
          handledBy: row[13] as string | undefined,
          handleNote: row[14] as string | undefined
        });
      }
    }
    
    res.json({
      success: true,
      data: warnings
    });
  } catch (err) {
    console.error('获取近期预警失败:', err);
    res.status(500).json({
      success: false,
      error: '获取近期预警失败'
    });
  }
});

router.get('/water-quality-trend', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const { zoneId, days = 7 } = req.query;
    
    let sql = `
      SELECT id, zone_id, zone_name, temperature, salinity, dissolved_oxygen, ph,
             ammonia_nitrogen, nitrite, recorded_by, recorded_at, is_normal, abnormal_items
      FROM water_quality
    `;
    const params: any[] = [];
    
    if (zoneId && zoneId !== 'all') {
      sql += ' WHERE zone_id = ?';
      params.push(zoneId);
    }
    
    sql += ' ORDER BY recorded_at DESC LIMIT ?';
    params.push(days as number);
    
    const result = db.exec(sql, params);
    
    const waterQualityData: WaterQuality[] = [];
    if (result.length > 0) {
      for (const row of result[0].values) {
        waterQualityData.push({
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
          isNormal: row[11] as boolean,
          abnormalItems: JSON.parse(row[12] as string || '[]')
        });
      }
    }
    
    res.json({
      success: true,
      data: waterQualityData.reverse()
    });
  } catch (err) {
    console.error('获取水质趋势失败:', err);
    res.status(500).json({
      success: false,
      error: '获取水质趋势失败'
    });
  }
});

router.get('/finance-overview', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const { month } = req.query;
    
    const reportMonth = month || new Date().toISOString().slice(0, 7);
    
    const result = db.exec(`
      SELECT id, report_month, zone_id, zone_name, output, fry_cost, feed_cost, labor_cost,
             other_cost, income, disease_loss_rate, profit, output_change, cost_change,
             income_change, profit_change, created_at, pushed
      FROM finance_reports
      WHERE report_month = ?
      ORDER BY zone_name
    `, [reportMonth]);
    
    const reports: FinanceReport[] = [];
    if (result.length > 0) {
      for (const row of result[0].values) {
        reports.push({
          id: row[0] as string,
          reportMonth: row[1] as string,
          zoneId: row[2] as string,
          zoneName: row[3] as string,
          output: row[4] as number,
          cost: {
            fry: row[5] as number,
            feed: row[6] as number,
            labor: row[7] as number,
            other: row[8] as number
          },
          income: row[9] as number,
          diseaseLossRate: row[10] as number,
          profit: row[11] as number,
          comparedLastMonth: {
            output: row[12] as number || 0,
            cost: row[13] as number || 0,
            income: row[14] as number || 0,
            profit: row[15] as number || 0
          },
          createdAt: row[16] as string,
          pushed: row[17] as boolean
        });
      }
    }
    
    res.json({
      success: true,
      data: reports
    });
  } catch (err) {
    console.error('获取财务概览失败:', err);
    res.status(500).json({
      success: false,
      error: '获取财务概览失败'
    });
  }
});

router.get('/production-chart', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const { months = 6 } = req.query;
    
    const today = new Date();
    const monthList: string[] = [];
    for (let i = (months as number) - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      monthList.push(d.toISOString().slice(0, 7));
    }
    
    const chartData: { month: string; output: number; income: number; profit: number }[] = [];
    
    for (const month of monthList) {
      const result = db.exec(`
        SELECT COALESCE(SUM(output), 0) as total_output,
               COALESCE(SUM(income), 0) as total_income,
               COALESCE(SUM(profit), 0) as total_profit
        FROM finance_reports
        WHERE report_month = ?
      `, [month]);
      
      let output = 0, income = 0, profit = 0;
      if (result.length > 0 && result[0].values.length > 0) {
        output = result[0].values[0][0] as number;
        income = result[0].values[0][1] as number;
        profit = result[0].values[0][2] as number;
      }
      
      chartData.push({ month, output, income, profit });
    }
    
    res.json({
      success: true,
      data: chartData
    });
  } catch (err) {
    console.error('获取生产图表数据失败:', err);
    res.status(500).json({
      success: false,
      error: '获取生产图表数据失败'
    });
  }
});

export default router;
