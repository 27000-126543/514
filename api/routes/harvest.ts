import { Router, Response } from 'express';
import { getDb } from '../db/database';
import { AuthRequest } from '../middleware/auth';
import { SampleTest, HarvestPrediction, HarvestTask } from '../../shared/types';
import { generateId, calculateHarvestWindow } from '../utils/helpers';
import jsPDF from 'jspdf';

const router = Router();

router.post('/sample', async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId, zoneName, averageWeight, survivalRate, sampleCount } = req.body;
    const db = await getDb();

    const id = generateId();
    const testedBy = req.user?.name || '系统';
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO sample_tests 
       (id, zone_id, zone_name, average_weight, survival_rate, sample_count, tested_by, tested_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, zoneId, zoneName, averageWeight, survivalRate, sampleCount, testedBy, now]
    );

    const test: SampleTest = {
      id, zoneId, zoneName, averageWeight, survivalRate, sampleCount, testedBy, testedAt: now
    };

    res.status(201).json({ success: true, data: test });
  } catch (err) {
    console.error('Create sample test error:', err);
    res.status(500).json({ error: '创建样品检测失败' });
  }
});

router.get('/predict/:zoneId', async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId } = req.params;
    const db = await getDb();

    const zoneResult = db.exec('SELECT name, current_stock, growth_rate FROM zones WHERE id = ?', [zoneId]);
    if (zoneResult.length === 0 || zoneResult[0].values.length === 0) {
      return res.status(404).json({ error: '养殖区不存在' });
    }

    const zoneName = zoneResult[0].values[0][0] as string;
    const currentStock = zoneResult[0].values[0][1] as number;
    const growthRate = zoneResult[0].values[0][2] as number;

    const sampleResult = db.exec(
      'SELECT average_weight, survival_rate FROM sample_tests WHERE zone_id = ? ORDER BY tested_at DESC LIMIT 1',
      [zoneId]
    );

    let averageWeight = 350;
    let survivalRate = 0.85;

    if (sampleResult.length > 0 && sampleResult[0].values.length > 0) {
      averageWeight = sampleResult[0].values[0][0] as number;
      survivalRate = sampleResult[0].values[0][1] as number;
    }

    const estimatedTotal = Math.floor(currentStock * survivalRate * (averageWeight / 1000));
    const harvestWindow = calculateHarvestWindow(averageWeight, survivalRate, growthRate);
    const priceForecast = 45 + Math.random() * 20;
    const confidence = Math.round((0.75 + Math.random() * 0.2) * 100);

    const prediction: HarvestPrediction = {
      zoneId,
      zoneName,
      estimatedTotal,
      bestHarvestWindow: {
        start: harvestWindow.start.toISOString(),
        end: harvestWindow.end.toISOString(),
        reason: harvestWindow.reason
      },
      priceForecast: Math.round(priceForecast * 100) / 100,
      confidence
    };

    res.json({ success: true, data: prediction });
  } catch (err) {
    console.error('Predict harvest error:', err);
    res.status(500).json({ error: '获取捕捞预测失败' });
  }
});

router.get('/tasks', async (req: AuthRequest, res: Response) => {
  try {
    const { status, zoneId } = req.query;
    const db = await getDb();
    
    let query = 'SELECT * FROM harvest_tasks';
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
    
    const tasks: HarvestTask[] = [];
    if (result.length > 0) {
      result[0].values.forEach(row => {
        tasks.push({
          id: row[0] as string,
          zoneId: row[1] as string,
          zoneName: row[2] as string,
          predictedOutput: row[3] as number,
          harvestDate: row[4] as string,
          status: row[5] as HarvestTask['status'],
          taskOrderNo: row[6] as string,
          createdAt: row[7] as string
        });
      });
    }

    res.json({ success: true, data: tasks });
  } catch (err) {
    console.error('Get harvest tasks error:', err);
    res.status(500).json({ error: '获取捕捞任务失败' });
  }
});

router.post('/tasks', async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId, zoneName, predictedOutput, harvestDate } = req.body;
    const db = await getDb();

    const id = generateId();
    const now = new Date().toISOString();
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const taskOrderNo = `HT${dateStr}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    db.run(
      `INSERT INTO harvest_tasks 
       (id, zone_id, zone_name, predicted_output, harvest_date, status, task_order_no, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, zoneId, zoneName, predictedOutput, harvestDate, 'pending', taskOrderNo, now]
    );

    db.run(
      'INSERT INTO messages (id, user_id, type, title, content, related_id, related_type, has_voucher, voucher_url, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [generateId(), req.user?.id || 'farmer001', 'harvest', '捕捞任务已创建',
       `${zoneName}捕捞任务单${taskOrderNo}已生成，请按时安排捕捞作业。`,
       id, 'harvest', 1, `/api/harvest/tasks/${id}/pdf`, 0, now]
    );

    const task: HarvestTask = {
      id, zoneId, zoneName, predictedOutput, harvestDate, status: 'pending', taskOrderNo, createdAt: now
    };

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    console.error('Create harvest task error:', err);
    res.status(500).json({ error: '创建捕捞任务失败' });
  }
});

router.get('/tasks/:id/pdf', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const result = db.exec('SELECT * FROM harvest_tasks WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: '捕捞任务不存在' });
    }

    const row = result[0].values[0];
    const task: HarvestTask = {
      id: row[0] as string,
      zoneId: row[1] as string,
      zoneName: row[2] as string,
      predictedOutput: row[3] as number,
      harvestDate: row[4] as string,
      status: row[5] as HarvestTask['status'],
      taskOrderNo: row[6] as string,
      createdAt: row[7] as string
    };

    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('捕捞任务单', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`任务单号: ${task.taskOrderNo}`, 20, 40);
    doc.text(`创建时间: ${new Date(task.createdAt).toLocaleString()}`, 20, 50);
    doc.text(`养殖区域: ${task.zoneName}`, 20, 60);
    doc.text(`捕捞日期: ${task.harvestDate}`, 20, 70);
    doc.text(`预计产量: ${task.predictedOutput.toFixed(0)} kg`, 20, 80);
    doc.text(`任务状态: ${task.status === 'pending' ? '待执行' : task.status === 'in_progress' ? '执行中' : '已完成'}`, 20, 90);
    
    doc.setFontSize(10);
    doc.text('捕捞注意事项：', 20, 110);
    doc.text('1. 请按照预定时间安排捕捞作业', 25, 120);
    doc.text('2. 捕捞前检查设备状态', 25, 128);
    doc.text('3. 注意天气变化，确保作业安全', 25, 136);
    doc.text('4. 准确记录实际产量', 25, 144);
    
    doc.setFontSize(10);
    doc.text('海洋牧场综合管理平台', 105, 280, { align: 'center' });

    const pdfBuffer = doc.output('arraybuffer');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="捕捞任务单_${task.taskOrderNo}.pdf"`);
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error('Generate PDF error:', err);
    res.status(500).json({ error: '生成PDF失败' });
  }
});

export default router;
