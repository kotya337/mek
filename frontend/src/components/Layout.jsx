import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import NotificationsDropdown from './NotificationsDropdown';

const studentLinks = [
  { to: '/student', label: 'Дашборд', end: true },
  { to: '/student/schedule', label: 'Расписание' },
  { to: '/student/grades', label: 'Оценки' },
  { to: '/student/statistics', label: 'Статистика' },
  { to: '/student/assignments', label: 'Задания' },
];

const teacherLinks = [
  { to: '/teacher', label: 'Дашборд', end: true },
  { to: '/teacher/schedule', label: 'Расписание' },
  { to: '/teacher/grades', label: 'Журнал' },
  { to: '/teacher/assignments', label: 'Задания' },
];

function initials(name) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/).filter(Boolean);
  const a = (p[0]?.[0] || '').toUpperCase();
  const b = (p[1]?.[0] || '').toUpperCase();
  return (a + b) || '?';
}

export default function Layout({ variant }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const links = variant === 'teacher' ? teacherLinks : studentLinks;
  const [menuOpen, setMenuOpen] = useState(false);
  const [ddOpen, setDdOpen] = useState(false);
  const ddRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ddRef.current && !ddRef.current.contains(e.target)) {
        setDdOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const handleLogout = () => {
    setDdOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const navClass = ({ isActive }) =>
    `rounded-btn px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
      isActive ? 'bg-mek/10 text-mek' : 'text-mek-text hover:bg-gray-100'
    }`;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-mek-bg">
      <aside className="lg:w-56 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 lg:min-h-screen lg:sticky lg:top-0 lg:self-start shadow-mek-card lg:shadow-none z-40">
        <div className="p-4 flex flex-col gap-4">
          <NavLink
            to={links[0].to}
            end={!!links[0].end}
            className="flex items-center gap-3"
            onClick={() => setMenuOpen(false)}
          >
            <div className="h-10 w-10 rounded-card bg-mek flex items-center justify-center text-white font-bold text-lg shadow-mek-card shrink-0">
              М
            </div>
            <div className="leading-tight">
              <span className="block font-bold text-mek-text text-lg tracking-tight">МЭК</span>
              <span className="text-xs text-gray-500 font-medium">Электронный колледж</span>
            </div>
          </NavLink>

          <button
            type="button"
            className="lg:hidden mek-btn-secondary w-full justify-center text-sm"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
          >
            {menuOpen ? 'Скрыть меню' : 'Меню'}
          </button>

          <nav
            className={`flex flex-col gap-1 ${menuOpen ? 'flex' : 'hidden lg:flex'}`}
            aria-label="Основная навигация"
          >
            {links.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={navClass} onClick={() => setMenuOpen(false)}>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="h-14 px-4 flex items-center justify-end gap-2 border-b border-gray-200 bg-white/90 backdrop-blur-sm sticky top-0 z-30 shadow-mek-card">
          <NotificationsDropdown />
          <div className="relative" ref={ddRef}>
            <button
              type="button"
              onClick={() => setDdOpen((v) => !v)}
              className="flex items-center gap-2 rounded-btn pl-1 pr-2 py-1 hover:bg-gray-100 transition-colors"
              aria-expanded={ddOpen}
              aria-haspopup="true"
            >
              <span className="h-9 w-9 rounded-full bg-mek-accent text-white text-sm font-semibold flex items-center justify-center shadow-mek-card">
                {initials(user?.full_name)}
              </span>
              <span className="hidden sm:block text-sm font-medium text-mek-text max-w-[160px] truncate text-left">
                {user?.full_name}
              </span>
              <span className="text-gray-400 text-xs" aria-hidden>
                ▾
              </span>
            </button>
            {ddOpen && (
              <div
                className="absolute right-0 mt-2 w-52 mek-card py-1 z-50 shadow-mek-card-md border border-gray-200"
                role="menu"
              >
                <div className="px-3 py-2 border-b border-gray-100 sm:hidden">
                  <p className="text-sm font-medium text-mek-text truncate">{user?.full_name}</p>
                  {user?.email && <p className="text-xs text-gray-500 truncate">{user.email}</p>}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2.5 text-sm text-mek-text hover:bg-gray-50 rounded-b-card"
                >
                  Выход
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
