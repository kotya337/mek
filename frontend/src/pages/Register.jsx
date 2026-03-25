import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function Register() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [groups, setGroups] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('student');
  const [groupId, setGroupId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios
      .get('/api/auth/groups')
      .then((res) => setGroups(res.data))
      .catch(() => setGroups([]));
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = {
        email,
        password,
        full_name: fullName,
        role,
        group_id: role === 'student' ? Number(groupId) : undefined,
      };
      const { data } = await client.post('/auth/register', body);
      login(data);
      navigate(data.role === 'teacher' ? '/teacher' : '/student', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-mek-bg px-4 py-10">
      <div className="w-full max-w-md mek-card p-8 sm:p-10 shadow-mek-card-md">
        <h1 className="mek-page-title text-center mb-2">Регистрация</h1>
        <p className="text-center text-gray-500 text-sm mb-8">Создайте аккаунт МЭК</p>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-btn px-3 py-2.5">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-mek-text mb-1.5">ФИО</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mek-input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-mek-text mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mek-input" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-mek-text mb-1.5">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mek-input"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-mek-text mb-1.5">Роль</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="mek-select">
              <option value="student">Ученик</option>
              <option value="teacher">Преподаватель</option>
            </select>
          </div>
          {role === 'student' && (
            <div>
              <label className="block text-sm font-medium text-mek-text mb-1.5">Группа</label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="mek-select"
                required
              >
                <option value="">Выберите группу</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} — {g.course}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button type="submit" disabled={loading} className="mek-btn-primary w-full mt-2">
            {loading ? 'Создание…' : 'Зарегистрироваться'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-8">
          <Link to="/login" className="font-semibold text-mek-accent hover:text-mek">
            Уже есть аккаунт — войти
          </Link>
        </p>
      </div>
    </div>
  );
}
