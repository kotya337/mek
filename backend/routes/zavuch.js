const express = require('express');
const bcrypt = require('bcryptjs');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { run, get } = require('../db/db');

function createZavuchRouter(db) {
  const router = express.Router();

  router.post('/subjects', authMiddleware, requireRole('zavuch'), async (req, res) => {
    try {
      const { name } = req.body || {};
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Укажите name предмета' });
      }
      const subjectName = String(name).trim();

      const exists = await get(db, 'SELECT id FROM subjects WHERE name = ?', [subjectName]);
      if (exists) return res.status(409).json({ error: 'Предмет уже существует' });

      const ins = await run(db, 'INSERT INTO subjects (name) VALUES (?)', [subjectName]);
      const row = await get(db, 'SELECT id, name FROM subjects WHERE id = ?', [ins.lastID]);
      return res.status(201).json(row);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  router.post('/students', authMiddleware, requireRole('zavuch'), async (req, res) => {
    try {
      const { email, password, full_name, group_id } = req.body || {};
      if (!email || !password || !full_name || !group_id) {
        return res.status(400).json({ error: 'Укажите email, password, full_name, group_id' });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const gId = Number(group_id);
      if (!Number.isInteger(gId) || gId < 1) {
        return res.status(400).json({ error: 'group_id должен быть числом' });
      }

      const group = await get(db, 'SELECT id FROM groups WHERE id = ?', [gId]);
      if (!group) return res.status(404).json({ error: 'Группа не найдена' });

      const exists = await get(db, 'SELECT id FROM users WHERE email = ?', [normalizedEmail]);
      if (exists) return res.status(409).json({ error: 'Пользователь с таким email уже существует' });

      const hash = bcrypt.hashSync(String(password), 10);
      const ins = await run(
        db,
        `INSERT INTO users (email, password, full_name, role, group_id)
         VALUES (?, ?, ?, 'student', ?)`,
        [normalizedEmail, hash, String(full_name).trim(), gId]
      );

      const user = await get(
        db,
        'SELECT id, email, full_name, role, group_id FROM users WHERE id = ?',
        [ins.lastID]
      );
      return res.status(201).json(user);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  router.post('/teachers', authMiddleware, requireRole('zavuch'), async (req, res) => {
    try {
      const { email, password, full_name } = req.body || {};
      if (!email || !password || !full_name) {
        return res.status(400).json({ error: 'Укажите email, password, full_name' });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const exists = await get(db, 'SELECT id FROM users WHERE email = ?', [normalizedEmail]);
      if (exists) return res.status(409).json({ error: 'Пользователь с таким email уже существует' });

      const hash = bcrypt.hashSync(String(password), 10);
      const ins = await run(
        db,
        `INSERT INTO users (email, password, full_name, role, group_id)
         VALUES (?, ?, ?, 'teacher', NULL)`,
        [normalizedEmail, hash, String(full_name).trim()]
      );

      const user = await get(
        db,
        'SELECT id, email, full_name, role, group_id FROM users WHERE id = ?',
        [ins.lastID]
      );
      return res.status(201).json(user);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  return router;
}

module.exports = { createZavuchRouter };

