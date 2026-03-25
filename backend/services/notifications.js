const { run, all } = require('../db/db');

async function notifyGroupStudents(db, groupId, title, message, type) {
  const students = await all(
    db,
    "SELECT id FROM users WHERE role = 'student' AND group_id = ?",
    [groupId]
  );
  for (const { id } of students) {
    await run(
      db,
      `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
       VALUES (?, ?, ?, ?, 0, datetime('now'))`,
      [id, title, message, type]
    );
  }
}

async function notifyUser(db, userId, title, message, type) {
  await run(
    db,
    `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
     VALUES (?, ?, ?, ?, 0, datetime('now'))`,
    [userId, title, message, type]
  );
}

module.exports = { notifyGroupStudents, notifyUser };
