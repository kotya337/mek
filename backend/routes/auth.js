const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, run, all } = require('../db/db');

function createAuthRouter(db) {
  const router = express.Router();
  const jwtSecret = process.env.JWT_SECRET || 'mek-dev-secret-change-me';

  function signToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        group_id: user.group_id,
        full_name: user.full_name,
      },
      jwtSecret,
      { expiresIn: '7d' }
    );
  }

  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Укажите email и пароль' });
      }
      const user = await get(db, 'SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
      }
      const token = signToken(user);
      return res.json({
        token,
        role: user.role,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          group_id: user.group_id,
        },
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  router.post('/register', async (req, res) => {
    try {
      const { email, password, full_name, role, group_id } = req.body || {};
      if (!email || !password || !full_name || !role) {
        return res.status(400).json({ error: 'Заполните все обязательные поля' });
      }
      if (!['student', 'teacher'].includes(role)) {
        return res.status(400).json({ error: 'Недопустимая роль' });
      }
      if (role === 'student' && !group_id) {
        return res.status(400).json({ error: 'Для студента укажите группу' });
      }
      if (role === 'teacher' && group_id) {
        return res.status(400).json({ error: 'Преподавателю не назначается группа при регистрации' });
      }
      const exists = await get(db, 'SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
      if (exists) {
        return res.status(409).json({ error: 'Пользователь с таким email уже есть' });
      }
      if (role === 'student') {
        const g = await get(db, 'SELECT id FROM groups WHERE id = ?', [group_id]);
        if (!g) return res.status(400).json({ error: 'Группа не найдена' });
      }
      const hash = bcrypt.hashSync(password, 10);
      await run(
        db,
        `INSERT INTO users (email, password, full_name, role, group_id)
         VALUES (?, ?, ?, ?, ?)`,
        [email.trim().toLowerCase(), hash, full_name.trim(), role, role === 'student' ? group_id : null]
      );
      const user = await get(db, 'SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
      const token = signToken(user);
      return res.status(201).json({
        token,
        role: user.role,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          group_id: user.group_id,
        },
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  router.get('/groups', async (req, res) => {
    try {
      const groups = await all(db, 'SELECT id, name, course FROM groups ORDER BY name');
      res.json(groups);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  return router;
}

module.exports = { createAuthRouter };
