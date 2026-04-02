const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { all, get, run } = require('../db/db');

function createScheduleRouter(db) {
  const router = express.Router();

  async function getScheduleRowForTeacher(id) {
    return get(
      db,
      `SELECT s.id, s.day_of_week, s.lesson_number, s.room,
              sub.name AS subject_name, g.name AS group_name, g.id AS group_id
       FROM schedule s
       JOIN subjects sub ON sub.id = s.subject_id
       JOIN groups g ON g.id = s.group_id
       WHERE s.id = ?`,
      [id]
    );
  }

  router.get('/', authMiddleware, async (req, res) => {
    try {
      const { role, id, group_id: gid } = req.user;
      let rows;
      if (role === 'student') {
        if (!gid) {
          return res.status(400).json({ error: 'Студент не привязан к группе' });
        }
        rows = await all(
          db,
          `SELECT s.id, s.day_of_week, s.lesson_number, s.room,
                  sub.name AS subject_name, u.full_name AS teacher_name, g.name AS group_name
           FROM schedule s
           JOIN subjects sub ON sub.id = s.subject_id
           JOIN users u ON u.id = s.teacher_id
           JOIN groups g ON g.id = s.group_id
           WHERE s.group_id = ?
           ORDER BY s.day_of_week, s.lesson_number`,
          [gid]
        );
      } else if (role === 'teacher') {
        rows = await all(
          db,
          `SELECT s.id, s.day_of_week, s.lesson_number, s.room,
                  sub.name AS subject_name, g.name AS group_name, g.id AS group_id
           FROM schedule s
           JOIN subjects sub ON sub.id = s.subject_id
           JOIN groups g ON g.id = s.group_id
           WHERE s.teacher_id = ?
           ORDER BY s.day_of_week, s.lesson_number, g.name`,
          [id]
        );
      } else if (role === 'zavuch') {
        rows = await all(
          db,
          `SELECT s.id, s.day_of_week, s.lesson_number, s.room,
                  sub.name AS subject_name, g.name AS group_name, g.id AS group_id
           FROM schedule s
           JOIN subjects sub ON sub.id = s.subject_id
           JOIN groups g ON g.id = s.group_id
           ORDER BY s.day_of_week, s.lesson_number, g.name`
        );
      } else {
        return res.status(403).json({ error: 'Недостаточно прав' });
      }
      res.json(rows);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  router.post('/', authMiddleware, requireRole('zavuch'), async (req, res) => {
    try {
      const teacherId = req.user.id;
      const { group_id, subject_id, day_of_week, lesson_number, room } = req.body || {};

      if (group_id == null || subject_id == null || day_of_week == null || lesson_number == null || !room) {
        return res.status(400).json({ error: 'Укажите group_id, subject_id, day_of_week, lesson_number и room' });
      }

      const dow = Number(day_of_week);
      const ln = Number(lesson_number);
      if (!Number.isInteger(dow) || dow < 0 || dow > 6) {
        return res.status(400).json({ error: 'day_of_week должен быть от 0 до 6' });
      }
      if (!Number.isInteger(ln) || ln < 1 || ln > 8) {
        return res.status(400).json({ error: 'lesson_number должен быть от 1 до 8' });
      }

      const grp = await get(db, 'SELECT id FROM groups WHERE id = ?', [group_id]);
      if (!grp) return res.status(404).json({ error: 'Группа не найдена' });
      const sub = await get(db, 'SELECT id FROM subjects WHERE id = ?', [subject_id]);
      if (!sub) return res.status(404).json({ error: 'Предмет не найден' });

      const conflict = await get(
        db,
        `SELECT id FROM schedule WHERE group_id = ? AND day_of_week = ? AND lesson_number = ?`,
        [group_id, dow, ln]
      );
      if (conflict) {
        return res.status(409).json({
          error: 'На это время у группы уже назначена пара',
        });
      }

      const ins = await run(
        db,
        `INSERT INTO schedule (group_id, subject_id, teacher_id, day_of_week, lesson_number, room)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [group_id, subject_id, teacherId, dow, ln, String(room).trim()]
      );

      const row = await getScheduleRowForTeacher(ins.lastID);
      res.status(201).json(row);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  router.delete('/:id', authMiddleware, requireRole('zavuch'), async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: 'Некорректный идентификатор' });
      }

      const row = await get(db, 'SELECT id FROM schedule WHERE id = ?', [id]);
      if (!row) {
        return res.status(404).json({ error: 'Пара не найдена' });
      }

      await run(db, 'DELETE FROM schedule WHERE id = ?', [id]);
      res.status(204).send();
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  return router;
}

module.exports = { createScheduleRouter };
