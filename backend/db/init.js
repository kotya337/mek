require('dotenv').config();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { openDatabase, run, get, all, dbPath } = require('./db');

async function initializeDatabase(db) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await run(db, 'PRAGMA foreign_keys = ON');

  await run(db, `
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      course TEXT NOT NULL
    )
  `);

  await run(db, `
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `);

  await run(db, `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'zavuch')),
      group_id INTEGER,
      FOREIGN KEY (group_id) REFERENCES groups(id)
    )
  `);

  await run(db, `
    CREATE TABLE IF NOT EXISTS schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      teacher_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL,
      lesson_number INTEGER NOT NULL,
      room TEXT NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id),
      FOREIGN KEY (teacher_id) REFERENCES users(id)
    )
  `);

  await run(db, `
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      deadline TEXT NOT NULL,
      file_url TEXT,
      FOREIGN KEY (subject_id) REFERENCES subjects(id),
      FOREIGN KEY (group_id) REFERENCES groups(id)
    )
  `);

  const assignmentCols = await all(db, 'PRAGMA table_info(assignments)');
  if (!assignmentCols.some((c) => c.name === 'file_url')) {
    await run(db, 'ALTER TABLE assignments ADD COLUMN file_url TEXT');
  }

  await run(db, `
    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      assignment_id INTEGER,
      grade INTEGER NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (student_id) REFERENCES users(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id),
      FOREIGN KEY (assignment_id) REFERENCES assignments(id)
    )
  `);

  await run(db, `
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      type TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  const hash = bcrypt.hashSync('password123', 10);

  // Миграция: если в уже созданной БД в таблице `users` нет роли `zavuch`,
  // перестраиваем таблицу с корректным CHECK-ограничением и вставляем завуча (если его ещё нет).
  const usersSqlRow = await get(
    db,
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'"
  );
  const usersSql = usersSqlRow?.sql ? String(usersSqlRow.sql) : '';
  const scheduleSqlRow = await get(
    db,
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'schedule'"
  );
  const gradesSqlRow = await get(
    db,
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'grades'"
  );
  const notificationsSqlRow = await get(
    db,
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'notifications'"
  );

  const scheduleSql = scheduleSqlRow?.sql ? String(scheduleSqlRow.sql) : '';
  const gradesSql = gradesSqlRow?.sql ? String(gradesSqlRow.sql) : '';
  const notificationsSql = notificationsSqlRow?.sql ? String(notificationsSqlRow.sql) : '';

  const needsUsersMigration =
    !usersSql.toLowerCase().includes('zavuch') ||
    scheduleSql.includes('users_old') ||
    gradesSql.includes('users_old') ||
    notificationsSql.includes('users_old');

  if (needsUsersMigration) {
    await run(db, 'PRAGMA foreign_keys = OFF');
    await run(db, 'ALTER TABLE users RENAME TO users_old');
    await run(db, `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'zavuch')),
        group_id INTEGER,
        FOREIGN KEY (group_id) REFERENCES groups(id)
      )
    `);
    await run(
      db,
      `INSERT INTO users (id, email, password, full_name, role, group_id)
       SELECT id, email, password, full_name, role, group_id FROM users_old`
    );

    // Пересобираем таблицы с FK на users, чтобы они ссылались на новую таблицу `users`.
    await run(db, 'DROP TABLE IF EXISTS schedule_old');
    await run(db, 'ALTER TABLE schedule RENAME TO schedule_old');
    await run(db, `
      CREATE TABLE schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL,
        teacher_id INTEGER NOT NULL,
        day_of_week INTEGER NOT NULL,
        lesson_number INTEGER NOT NULL,
        room TEXT NOT NULL,
        FOREIGN KEY (group_id) REFERENCES groups(id),
        FOREIGN KEY (subject_id) REFERENCES subjects(id),
        FOREIGN KEY (teacher_id) REFERENCES users(id)
      )
    `);
    await run(db, 'INSERT INTO schedule (id, group_id, subject_id, teacher_id, day_of_week, lesson_number, room) SELECT id, group_id, subject_id, teacher_id, day_of_week, lesson_number, room FROM schedule_old');
    await run(db, 'DROP TABLE schedule_old');

    await run(db, 'DROP TABLE IF EXISTS grades_old');
    await run(db, 'ALTER TABLE grades RENAME TO grades_old');
    await run(db, `
      CREATE TABLE grades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL,
        assignment_id INTEGER,
        grade INTEGER NOT NULL,
        date TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES users(id),
        FOREIGN KEY (subject_id) REFERENCES subjects(id),
        FOREIGN KEY (assignment_id) REFERENCES assignments(id)
      )
    `);
    await run(db, 'INSERT INTO grades (id, student_id, subject_id, assignment_id, grade, date) SELECT id, student_id, subject_id, assignment_id, grade, date FROM grades_old');
    await run(db, 'DROP TABLE grades_old');

    await run(db, 'DROP TABLE IF EXISTS notifications_old');
    await run(db, 'ALTER TABLE notifications RENAME TO notifications_old');
    await run(db, `
      CREATE TABLE notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        type TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    await run(db, 'INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) SELECT id, user_id, title, message, type, is_read, created_at FROM notifications_old');
    await run(db, 'DROP TABLE notifications_old');

    await run(db, 'DROP TABLE users_old');
    await run(db, 'PRAGMA foreign_keys = ON');
  }

  const userCount = await get(db, 'SELECT COUNT(*) AS c FROM users');
  const zavuchExists = await get(db, 'SELECT id FROM users WHERE email = ?', ['zavuch@mek.ru']);
  if (userCount.c > 0) {
    if (!zavuchExists) {
      await run(
        db,
        `INSERT INTO users (email, password, full_name, role, group_id)
         VALUES (?, ?, ?, 'zavuch', NULL)`,
        ['zavuch@mek.ru', hash, 'Завуч МЭК']
      );
    }
    return;
  }

  await run(db, "INSERT INTO groups (name, course) VALUES ('ПИ-01', 'Программирование в ИС')");
  await run(db, "INSERT INTO groups (name, course) VALUES ('ПИ-02', 'Программирование в ИС')");

  await run(db, "INSERT INTO subjects (name) VALUES ('Разработка кода ИС')");
  await run(db, "INSERT INTO subjects (name) VALUES ('БЖД')");
  await run(db, "INSERT INTO subjects (name) VALUES ('Проектирование ИС')");

  await run(db, `INSERT INTO users (email, password, full_name, role, group_id) VALUES
    ('ivanov@mek.ru', ?, 'Иванов Иван Иванович', 'teacher', NULL),
    ('petrova@mek.ru', ?, 'Петрова Мария Сергеевна', 'teacher', NULL),
    ('zavuch@mek.ru', ?, 'Завуч МЭК', 'zavuch', NULL)
  `, [hash, hash, hash]);

  await run(db, `INSERT INTO users (email, password, full_name, role, group_id) VALUES
    ('sidorov@mek.ru', ?, 'Сидоров Алексей', 'student', 1),
    ('kozlov@mek.ru', ?, 'Козлов Дмитрий', 'student', 1),
    ('morozova@mek.ru', ?, 'Морозова Анна', 'student', 2),
    ('volkov@mek.ru', ?, 'Волков Пётр', 'student', 2)
  `, [hash, hash, hash, hash]);

  const teachers = await all(db, "SELECT id FROM users WHERE role = 'teacher' ORDER BY id");
  const t1 = teachers[0].id;
  const t2 = teachers[1].id;

  const seedSchedule = [
    [1, 1, t1, 1, 1, '301'],
    [1, 2, t2, 1, 2, '205'],
    [1, 3, t1, 1, 3, '301'],
    [1, 1, t1, 2, 1, '301'],
    [1, 3, t1, 2, 2, '302'],
    [1, 2, t2, 3, 1, '205'],
    [1, 1, t1, 3, 2, '301'],
    [1, 2, t2, 4, 1, '205'],
    [1, 3, t1, 4, 2, '302'],
    [1, 2, t2, 5, 1, '205'],
    [1, 1, t1, 5, 2, '301'],
    [2, 3, t1, 1, 1, '302'],
    [2, 1, t1, 1, 2, '303'],
    [2, 2, t2, 2, 1, '206'],
    [2, 3, t1, 3, 2, '302'],
    [2, 1, t1, 4, 1, '303'],
    [2, 2, t2, 5, 2, '206'],
  ];

  for (const row of seedSchedule) {
    await run(
      db,
      `INSERT INTO schedule (group_id, subject_id, teacher_id, day_of_week, lesson_number, room)
       VALUES (?, ?, ?, ?, ?, ?)`,
      row
    );
  }

  // Воскресенье (0): 8 пар (уроки 1–8) для демонстрации диапазона номеров уроков
  for (let ln = 1; ln <= 8; ln += 1) {
    const subjectRot = ((ln - 1) % 3) + 1;
    const teach = ln % 2 === 1 ? t1 : t2;
    await run(
      db,
      `INSERT INTO schedule (group_id, subject_id, teacher_id, day_of_week, lesson_number, room)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [1, subjectRot, teach, 0, ln, `1${String(ln).padStart(2, '0')}`]
    );
  }

  await run(db, `INSERT INTO assignments (subject_id, group_id, title, description, deadline) VALUES
    (1, 1, 'Лабораторная: REST API', 'Реализовать CRUD для сущности «Студент»', date('now', '+7 days')),
    (3, 1, 'Проект: ER-диаграмма', 'Схема БД для учебного заведения', date('now', '+14 days')),
    (1, 2, 'Домашнее: асинхронность', 'Переписать три функции на async/await', date('now', '+5 days')),
    (2, 2, 'Тест по БЖД', 'Подготовить ответы по разделу «Пожарная безопасность»', date('now', '+3 days'))
  `);

  const studentsG1 = await all(db, "SELECT id FROM users WHERE role = 'student' AND group_id = 1 ORDER BY id");
  const studentsG2 = await all(db, "SELECT id FROM users WHERE role = 'student' AND group_id = 2 ORDER BY id");
  const a1 = await get(db, 'SELECT id FROM assignments WHERE group_id = 1 ORDER BY id LIMIT 1');
  const a3 = await get(db, 'SELECT id FROM assignments WHERE group_id = 2 ORDER BY id LIMIT 1');

  await run(db, `INSERT INTO grades (student_id, subject_id, assignment_id, grade, date) VALUES
    (?, 1, ?, 5, date('now', '-2 days')),
    (?, 3, NULL, 4, date('now', '-5 days')),
    (?, 2, NULL, 5, date('now', '-1 days')),
    (?, 1, ?, 4, date('now', '-1 days'))
  `, [studentsG1[0].id, a1.id, studentsG1[1].id, studentsG2[0].id, a3.id]);
}

if (require.main === module) {
  const db = openDatabase();
  initializeDatabase(db)
    .then(() => {
      db.close();
      console.log('База данных инициализирована:', dbPath);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      db.close();
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
