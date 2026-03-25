const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { all, run, get } = require('../db/db');
const { notifyUser } = require('../services/notifications');

/** Текущий семестр: осень 1 сен — 31 янв; весна 1 фев — 30 июн */
function getCurrentSemesterBounds() {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  if (m >= 9 || m === 1) {
    const startY = m === 1 ? y - 1 : y;
    const endY = m === 1 ? y : y + 1;
    return { start: `${startY}-09-01`, end: `${endY}-01-31`, label: 'осенний' };
  }
  if (m >= 2 && m <= 6) {
    return { start: `${y}-02-01`, end: `${y}-06-30`, label: 'весенний' };
  }
  return { start: `${y}-02-01`, end: `${y}-06-30`, label: 'весенний' };
}

function createGradesRouter(db) {
  const router = express.Router();

  router.get('/statistics', authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== 'student') {
        return res.status(403).json({ error: 'Статистика доступна только студентам' });
      }
      const studentId = req.user.id;

      const rows = await all(
        db,
        `SELECT gr.grade, gr.date, sub.id AS subject_id, sub.name AS subject_name
         FROM grades gr
         JOIN subjects sub ON sub.id = gr.subject_id
         WHERE gr.student_id = ?
         ORDER BY gr.date ASC, gr.id ASC`,
        [studentId]
      );

      if (!rows.length) {
        const sem = getCurrentSemesterBounds();
        return res.json({
          overall_average: null,
          semester: sem,
          by_subject: [],
          semester_trend: [],
          distribution: {
            excellent_percent: 0,
            good_percent: 0,
            satisfactory_percent: 0,
            poor_percent: 0,
            counts: { 5: 0, 4: 0, 3: 0, 2: 0 },
            total: 0,
          },
        });
      }

      const overall_average =
        rows.reduce((s, r) => s + r.grade, 0) / rows.length;

      const subjectAgg = {};
      for (const r of rows) {
        const k = r.subject_id;
        if (!subjectAgg[k]) {
          subjectAgg[k] = { subject_id: r.subject_id, subject_name: r.subject_name, sum: 0, count: 0 };
        }
        subjectAgg[k].sum += r.grade;
        subjectAgg[k].count += 1;
      }
      const by_subject = Object.values(subjectAgg).map((x) => ({
        subject_id: x.subject_id,
        subject_name: x.subject_name,
        average: Math.round((x.sum / x.count) * 100) / 100,
        count: x.count,
      }));

      const sem = getCurrentSemesterBounds();
      const inSemester = rows.filter((r) => r.date >= sem.start && r.date <= sem.end);

      const byMonth = {};
      for (const r of inSemester) {
        const key = r.date.slice(0, 7);
        if (!byMonth[key]) byMonth[key] = { sum: 0, count: 0 };
        byMonth[key].sum += r.grade;
        byMonth[key].count += 1;
      }
      const semester_trend = Object.keys(byMonth)
        .sort()
        .map((period) => ({
          period,
          average: Math.round((byMonth[period].sum / byMonth[period].count) * 100) / 100,
          count: byMonth[period].count,
        }));

      const counts = { 5: 0, 4: 0, 3: 0, 2: 0 };
      for (const r of rows) {
        if (counts[r.grade] !== undefined) counts[r.grade] += 1;
      }
      const total = rows.length;
      const pct = (n) => (total ? Math.round((n / total) * 1000) / 10 : 0);
      const distribution = {
        excellent_percent: pct(counts[5]),
        good_percent: pct(counts[4]),
        satisfactory_percent: pct(counts[3]),
        poor_percent: pct(counts[2]),
        counts,
        total,
      };

      res.json({
        overall_average: Math.round(overall_average * 100) / 100,
        semester: sem,
        by_subject,
        semester_trend,
        distribution,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  router.get('/', authMiddleware, async (req, res) => {
    try {
      const { role, id, group_id: studentGroup } = req.user;
      const groupId = req.query.group_id;

      if (role === 'student') {
        const rows = await all(
          db,
          `SELECT gr.id, gr.grade, gr.date, gr.assignment_id,
                  sub.name AS subject_name,
                  a.title AS assignment_title
           FROM grades gr
           JOIN subjects sub ON sub.id = gr.subject_id
           LEFT JOIN assignments a ON a.id = gr.assignment_id
           WHERE gr.student_id = ?
           ORDER BY gr.date DESC`,
          [id]
        );
        return res.json(rows);
      }

      if (role === 'teacher') {
        if (!groupId) {
          return res.status(400).json({ error: 'Укажите group_id' });
        }
        const rows = await all(
          db,
          `SELECT gr.id, gr.grade, gr.date, gr.assignment_id,
                  u.full_name AS student_name, u.id AS student_id,
                  sub.name AS subject_name,
                  a.title AS assignment_title
           FROM grades gr
           JOIN users u ON u.id = gr.student_id
           JOIN subjects sub ON sub.id = gr.subject_id
           LEFT JOIN assignments a ON a.id = gr.assignment_id
           WHERE u.role = 'student' AND u.group_id = ?
           ORDER BY u.full_name, gr.date DESC`,
          [groupId]
        );
        return res.json(rows);
      }

      return res.status(403).json({ error: 'Недостаточно прав' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  router.post('/', authMiddleware, requireRole('teacher'), async (req, res) => {
    try {
      const { student_id, subject_id, assignment_id, grade, date } = req.body || {};
      if (!student_id || !subject_id || grade == null) {
        return res.status(400).json({ error: 'Укажите student_id, subject_id и grade' });
      }
      const g = Number(grade);
      if (Number.isNaN(g) || g < 2 || g > 5) {
        return res.status(400).json({ error: 'Оценка должна быть от 2 до 5' });
      }
      const student = await get(db, "SELECT id, group_id FROM users WHERE id = ? AND role = 'student'", [student_id]);
      if (!student) {
        return res.status(404).json({ error: 'Студент не найден' });
      }
      const subject = await get(db, 'SELECT id FROM subjects WHERE id = ?', [subject_id]);
      if (!subject) {
        return res.status(404).json({ error: 'Предмет не найден' });
      }
      if (assignment_id) {
        const a = await get(db, 'SELECT id FROM assignments WHERE id = ?', [assignment_id]);
        if (!a) return res.status(404).json({ error: 'Задание не найдено' });
      }
      const d = date || new Date().toISOString().slice(0, 10);
      const ins = await run(
        db,
        `INSERT INTO grades (student_id, subject_id, assignment_id, grade, date)
         VALUES (?, ?, ?, ?, ?)`,
        [student_id, subject_id, assignment_id || null, g, d]
      );

      try {
        const subRow = await get(db, 'SELECT name FROM subjects WHERE id = ?', [subject_id]);
        const subLabel = subRow?.name || 'Предмет';
        await notifyUser(
          db,
          student_id,
          'Новая оценка',
          `${subLabel}: выставлена оценка ${g}`,
          'grade'
        );
      } catch (notifyErr) {
        console.error('notify grade:', notifyErr);
      }

      const row = await get(db, 'SELECT * FROM grades WHERE id = ?', [ins.lastID]);
      res.status(201).json(row);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  return router;
}

module.exports = { createGradesRouter };
