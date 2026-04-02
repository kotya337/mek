const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { all } = require('../db/db');

function createStudentsRouter(db) {
  const router = express.Router();

  router.get('/', authMiddleware, requireRole('teacher', 'zavuch'), async (req, res) => {
    try {
      const groupId = req.query.group_id;
      if (!groupId) {
        return res.status(400).json({ error: 'Укажите group_id' });
      }
      const rows = await all(
        db,
        `SELECT id, email, full_name, group_id
         FROM users
         WHERE role = 'student' AND group_id = ?
         ORDER BY full_name`,
        [groupId]
      );
      res.json(rows);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  return router;
}

module.exports = { createStudentsRouter };
