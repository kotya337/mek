const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { all, run, get } = require('../db/db');
const { notifyGroupStudents } = require('../services/notifications');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_EXT = new Set(['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']);

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return cb(new Error('Допустимы только файлы: pdf, doc, docx, jpg, png'));
  }
  cb(null, true);
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase() || '';
    const base = path
      .basename(file.originalname || 'file', ext)
      .replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]/g, '_')
      .slice(0, 80);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

function uploadMiddleware(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Размер файла не более 10 МБ' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message || 'Ошибка загрузки файла' });
    }
    next();
  });
}

const SELECT_FIELDS = `a.id, a.title, a.description, a.deadline, a.group_id, a.file_url,
                  sub.name AS subject_name, g.name AS group_name`;

async function fetchAssignmentFull(db, id) {
  return get(
    db,
    `SELECT ${SELECT_FIELDS}
     FROM assignments a
     JOIN subjects sub ON sub.id = a.subject_id
     JOIN groups g ON g.id = a.group_id
     WHERE a.id = ?`,
    [id]
  );
}

function safeStoredFilename(name) {
  if (!name || typeof name !== 'string') return null;
  const base = path.basename(name);
  if (base !== name || base.includes('..')) return null;
  return base;
}

function createAssignmentsRouter(db) {
  const router = express.Router();

  router.get('/', authMiddleware, async (req, res) => {
    try {
      const { role, group_id: gid } = req.user;
      const qGroup = req.query.group_id;

      if (role === 'student') {
        if (!gid) return res.status(400).json({ error: 'Студент не привязан к группе' });
        const rows = await all(
          db,
          `SELECT ${SELECT_FIELDS}
           FROM assignments a
           JOIN subjects sub ON sub.id = a.subject_id
           JOIN groups g ON g.id = a.group_id
           WHERE a.group_id = ?
           ORDER BY a.deadline`,
          [gid]
        );
        return res.json(rows);
      }

      if (role === 'teacher' || role === 'zavuch') {
        const filterGroup = qGroup ? 'WHERE a.group_id = ?' : '';
        const params = qGroup ? [qGroup] : [];
        const rows = await all(
          db,
          `SELECT ${SELECT_FIELDS}
           FROM assignments a
           JOIN subjects sub ON sub.id = a.subject_id
           JOIN groups g ON g.id = a.group_id
           ${filterGroup}
           ORDER BY g.name, a.deadline`,
          params
        );
        return res.json(rows);
      }

      return res.status(403).json({ error: 'Недостаточно прав' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  router.get('/:id/download', authMiddleware, async (req, res) => {
    try {
      const { role, group_id: gid } = req.user;
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: 'Некорректный идентификатор' });
      }

      const row = await get(db, 'SELECT id, group_id, file_url, title FROM assignments WHERE id = ?', [id]);
      if (!row) return res.status(404).json({ error: 'Задание не найдено' });
      if (role === 'student' && row.group_id !== gid) {
        return res.status(403).json({ error: 'Нет доступа' });
      }

      const safeName = safeStoredFilename(row.file_url);
      if (!safeName) {
        return res.status(404).json({ error: 'Файл не прикреплён' });
      }

      const filePath = path.join(UPLOADS_DIR, safeName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Файл не найден на сервере' });
      }

      const downloadName = safeName.replace(/^\d+-[a-z0-9]+-/, '') || safeName;
      return res.download(filePath, downloadName);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  router.get('/:id', authMiddleware, async (req, res) => {
    try {
      const { role, group_id: gid } = req.user;
      const row = await fetchAssignmentFull(db, req.params.id);
      if (!row) return res.status(404).json({ error: 'Задание не найдено' });
      if (role === 'student' && row.group_id !== gid) {
        return res.status(403).json({ error: 'Нет доступа' });
      }
      res.json(row);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  router.post('/', authMiddleware, requireRole('teacher', 'zavuch'), uploadMiddleware, async (req, res) => {
    try {
      const subject_id = req.body.subject_id;
      const group_id = req.body.group_id;
      const title = req.body.title;
      const description = req.body.description;
      const deadline = req.body.deadline;

      if (!subject_id || !group_id || !title || !deadline) {
        if (req.file?.path) {
          fs.unlink(req.file.path, () => {});
        }
        return res.status(400).json({ error: 'Укажите subject_id, group_id, title, deadline' });
      }

      const sub = await get(db, 'SELECT id FROM subjects WHERE id = ?', [subject_id]);
      if (!sub) {
        if (req.file?.path) fs.unlink(req.file.path, () => {});
        return res.status(404).json({ error: 'Предмет не найден' });
      }
      const grp = await get(db, 'SELECT id FROM groups WHERE id = ?', [group_id]);
      if (!grp) {
        if (req.file?.path) fs.unlink(req.file.path, () => {});
        return res.status(404).json({ error: 'Группа не найдена' });
      }

      const file_url = req.file ? req.file.filename : null;

      const ins = await run(
        db,
        `INSERT INTO assignments (subject_id, group_id, title, description, deadline, file_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [subject_id, group_id, title, description || '', deadline, file_url]
      );

      try {
        const subRow = await get(db, 'SELECT name FROM subjects WHERE id = ?', [subject_id]);
        const subLabel = subRow?.name || 'Предмет';
        await notifyGroupStudents(
          db,
          group_id,
          'Новое задание',
          `«${title}» · ${subLabel} · срок: ${deadline}`,
          'assignment'
        );
      } catch (notifyErr) {
        console.error('notify assignment:', notifyErr);
      }

      const full = await fetchAssignmentFull(db, ins.lastID);
      res.status(201).json(full);
    } catch (e) {
      if (req.file?.path) {
        fs.unlink(req.file.path, () => {});
      }
      console.error(e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  return router;
}

module.exports = { createAssignmentsRouter, UPLOADS_DIR };
