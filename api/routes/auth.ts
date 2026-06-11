import { Router, Response } from 'express';
import { getDb } from '../db/database';
import { authMiddleware, AuthRequest, generateToken } from '../middleware/auth';
import { LoginRequest, LoginResponse, User } from '../../shared/types';

const router = Router();

router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { username, password }: LoginRequest = req.body;
    const db = await getDb();

    const result = db.exec(
      'SELECT id, username, name, role, phone, email, status FROM users WHERE username = ? AND password_hash = ?',
      [username, password]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const row = result[0].values[0];
    const user: User = {
      id: row[0] as string,
      username: row[1] as string,
      name: row[2] as string,
      role: row[3] as User['role'],
      phone: row[4] as string,
      email: row[5] as string,
      status: row[6] as User['status'],
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    if (user.status !== 'active') {
      return res.status(403).json({ error: '账户已被禁用' });
    }

    db.run('UPDATE users SET last_login = ? WHERE id = ?', [new Date().toISOString(), user.id]);

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    });

    const response: LoginResponse = { token, user };
    res.json({ success: true, data: response });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未授权访问' });
    }

    const db = await getDb();
    const result = db.exec(
      'SELECT id, username, name, role, phone, email, status, created_at, last_login FROM users WHERE id = ?',
      [req.user.id]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const row = result[0].values[0];
    const user: User = {
      id: row[0] as string,
      username: row[1] as string,
      name: row[2] as string,
      role: row[3] as User['role'],
      phone: row[4] as string,
      email: row[5] as string,
      status: row[6] as User['status'],
      createdAt: row[7] as string,
      lastLogin: row[8] as string | undefined
    };

    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

export default router;

