require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { openDatabase } = require('./db/db');
const { initializeDatabase } = require('./db/init');
const { createAuthRouter } = require('./routes/auth');
const { createScheduleRouter } = require('./routes/schedule');
const { createGradesRouter } = require('./routes/grades');
const { createAssignmentsRouter, UPLOADS_DIR } = require('./routes/assignments');
const { createStudentsRouter } = require('./routes/students');
const { createNotificationsRouter } = require('./routes/notifications');
const { authMiddleware } = require('./middleware/auth');
const { all } = require('./db/db');

const PORT = process.env.PORT || 3001;
const db = openDatabase();

async function start() {
  await initializeDatabase(db);

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const app = express();
  app.use(
    cors({
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  );
  app.use(express.json());
  app.use('/uploads', express.static(UPLOADS_DIR));

  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/schedule', createScheduleRouter(db));
  app.use('/api/grades', createGradesRouter(db));
  app.use('/api/assignments', createAssignmentsRouter(db));
  app.use('/api/students', createStudentsRouter(db));
  app.use('/api/notifications', createNotificationsRouter(db));

  app.get('/api/subjects', authMiddleware, async (req, res) => {
    try {
      const rows = await all(db, 'SELECT id, name FROM subjects ORDER BY name');
      res.json(rows);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });

  app.listen(PORT, () => {
    console.log(`МЭК API: http://localhost:${PORT}`);
    console.log(`БД: ${path.join(__dirname, 'db', 'database.sqlite')}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
