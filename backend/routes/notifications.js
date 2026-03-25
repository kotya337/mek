const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { all, run } = require('../db/db');

function mapRow(row) {
  return {
    ...row,
    is_read: !!row.is_read,
  };
}

function createNotificationsRouter(db) {
  const router = express.Router();

  router.get('/', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const rows = await all(
        db,
        `SELECT id, user_id, title, message, type, is_read, created_at
         FROM notifications
         WHERE user_id = ?
         ORDER BY datetime(created_at) DESC, id DESC
         LIMIT 100`,
        [userId]
      );
      res.json(rows.map(mapRow));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  router.post('/mark-read', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const { ids, all: markAll } = req.body || {};

      if (markAll === true) {
        await run(db, 'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
        return res.json({ ok: true });
      }

      if (!Array.isArray(ids) || !ids.length) {
        return res.status(400).json({ error: 'Передайте ids (массив) или all: true' });
      }

      const cleanIds = ids.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0);
      if (!cleanIds.length) {
        return res.status(400).json({ error: 'Некорректные идентификаторы' });
      }

      const placeholders = cleanIds.map(() => '?').join(',');
      await run(
        db,
        `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN (${placeholders})`,
        [userId, ...cleanIds]
      );
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  return router;
}

module.exports = { createNotificationsRouter };
