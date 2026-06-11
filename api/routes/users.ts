import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middleware/auth.js';
import { User, UserRole } from '../../shared/types.js';

const router = Router();

router.get('/', authMiddleware, roleMiddleware(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const { role, status, keyword } = req.query;
    
    let sql = `
      SELECT id, username, name, role, phone, email, status, created_at, last_login 
      FROM users WHERE 1=1
    `;
    const params: any[] = [];
    
    if (role && role !== 'all') {
      sql += ' AND role = ?';
      params.push(role);
    }
    
    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    if (keyword) {
      sql += ' AND (name LIKE ? OR username LIKE ? OR phone LIKE ?)';
      const search = `%${keyword}%`;
      params.push(search, search, search);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const result = db.exec(sql, params);
    const users: User[] = [];
    
    if (result.length > 0) {
      for (const row of result[0].values) {
        users.push({
          id: row[0] as string,
          username: row[1] as string,
          name: row[2] as string,
          role: row[3] as UserRole,
          phone: row[4] as string,
          email: row[5] as string,
          status: row[6] as 'active' | 'inactive',
          createdAt: row[7] as string,
          lastLogin: row[8] as string | undefined
        });
      }
    }
    
    res.json({
      success: true,
      data: users
    });
  } catch (err) {
    console.error('获取用户列表失败:', err);
    res.status(500).json({
      success: false,
      error: '获取用户列表失败'
    });
  }
});

router.get('/:id', authMiddleware, roleMiddleware(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    
    const result = db.exec(`
      SELECT id, username, name, role, phone, email, status, created_at, last_login 
      FROM users WHERE id = ?
    `, [id]);
    
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    const row = result[0].values[0];
    const user: User = {
      id: row[0] as string,
      username: row[1] as string,
      name: row[2] as string,
      role: row[3] as UserRole,
      phone: row[4] as string,
      email: row[5] as string,
      status: row[6] as 'active' | 'inactive',
      createdAt: row[7] as string,
      lastLogin: row[8] as string | undefined
    };
    
    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('获取用户详情失败:', err);
    res.status(500).json({
      success: false,
      error: '获取用户详情失败'
    });
  }
});

router.post('/', authMiddleware, roleMiddleware(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const { username, password, name, role, phone, email } = req.body;
    
    if (!username || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        error: '用户名、密码、姓名和角色为必填项'
      });
    }
    
    const existing = db.exec('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      return res.status(400).json({
        success: false,
        error: '用户名已存在'
      });
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    db.run(`
      INSERT INTO users (id, username, password_hash, name, role, phone, email, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `, [id, username, password, name, role, phone || '', email || '', now]);
    
    const result = db.exec(`
      SELECT id, username, name, role, phone, email, status, created_at 
      FROM users WHERE id = ?
    `, [id]);
    
    const row = result[0].values[0];
    const user: User = {
      id: row[0] as string,
      username: row[1] as string,
      name: row[2] as string,
      role: row[3] as UserRole,
      phone: row[4] as string,
      email: row[5] as string,
      status: row[6] as 'active' | 'inactive',
      createdAt: row[7] as string
    };
    
    res.json({
      success: true,
      data: user,
      message: '用户创建成功'
    });
  } catch (err) {
    console.error('创建用户失败:', err);
    res.status(500).json({
      success: false,
      error: '创建用户失败'
    });
  }
});

router.put('/:id', authMiddleware, roleMiddleware(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { name, role, phone, email, status, password } = req.body;
    
    const existing = db.exec('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length === 0 || existing[0].values.length === 0) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    const updateFields: string[] = [];
    const params: any[] = [];
    
    if (name !== undefined) {
      updateFields.push('name = ?');
      params.push(name);
    }
    if (role !== undefined) {
      updateFields.push('role = ?');
      params.push(role);
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      params.push(phone);
    }
    if (email !== undefined) {
      updateFields.push('email = ?');
      params.push(email);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      params.push(status);
    }
    if (password !== undefined) {
      updateFields.push('password_hash = ?');
      params.push(password);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有需要更新的字段'
      });
    }
    
    params.push(id);
    
    db.run(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, params);
    
    const result = db.exec(`
      SELECT id, username, name, role, phone, email, status, created_at, last_login 
      FROM users WHERE id = ?
    `, [id]);
    
    const row = result[0].values[0];
    const user: User = {
      id: row[0] as string,
      username: row[1] as string,
      name: row[2] as string,
      role: row[3] as UserRole,
      phone: row[4] as string,
      email: row[5] as string,
      status: row[6] as 'active' | 'inactive',
      createdAt: row[7] as string,
      lastLogin: row[8] as string | undefined
    };
    
    res.json({
      success: true,
      data: user,
      message: '用户更新成功'
    });
  } catch (err) {
    console.error('更新用户失败:', err);
    res.status(500).json({
      success: false,
      error: '更新用户失败'
    });
  }
});

router.delete('/:id', authMiddleware, roleMiddleware(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    
    if (id === 'admin001') {
      return res.status(400).json({
        success: false,
        error: '不能删除超级管理员账户'
      });
    }
    
    const existing = db.exec('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length === 0 || existing[0].values.length === 0) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    db.run('DELETE FROM users WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: '用户删除成功'
    });
  } catch (err) {
    console.error('删除用户失败:', err);
    res.status(500).json({
      success: false,
      error: '删除用户失败'
    });
  }
});

export default router;
