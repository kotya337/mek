import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await client.post('/auth/login', { email, password });
      login(data);
      navigate(data.role === 'teacher' ? '/teacher' : '/student', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-mek-bg px-4 py-10">
      <div className="w-full max-w-md mek-card p-8 sm:p-10 shadow-mek-card-md">
        <div className="flex justify-center mb-6">
          <div className="h-14 w-14 rounded-card bg-mek flex items-center justify-center text-white font-bold text-2xl shadow-mek-card-md">
            М
          </div>
        </div>
        <h1 className="mek-page-title text-center mb-1">МЭК</h1>
        <p className="text-center text-gray-500 text-sm mb-8">Московский электронный колледж</p>
        <form onSubmit={onSubmit} className="space-y-5">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-btn px-3 py-2.5">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-mek-text mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mek-input"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-mek-text mb-1.5">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mek-input"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="mek-btn-primary w-full">
            {loading ? 'Вход…' : 'Войти'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-8">
          Нет аккаунта?{' '}
          <Link to="/register" className="font-semibold text-mek-accent hover:text-mek">
            Регистрация
          </Link>
        </p>
        <p className="text-xs text-gray-400 mt-6 text-center leading-relaxed">
          Тест: sidorov@mek.ru / password123 (студент), ivanov@mek.ru / password123 (преподаватель)
        </p>
      </div>
    </div>
  );
}
