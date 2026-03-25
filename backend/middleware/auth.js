const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'mek-dev-secret-change-me');
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    next();
  };
}

/** Вызывать после authMiddleware. Доступ только для role === 'teacher'. */
function requireTeacher(req, res, next) {
  return requireRole('teacher')(req, res, next);
}

module.exports = { authMiddleware, requireRole, requireTeacher };
