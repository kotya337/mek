import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';

const POLL_MS = 30_000;

export default function NotificationsDropdown() {
  const token = useAuthStore((s) => s.token);
  const { items, unreadCount, loading, fetch, markRead, markAllRead, reset } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!token) {
      reset();
      setOpen(false);
      return undefined;
    }
    fetch();
    const id = setInterval(() => fetch(), POLL_MS);
    return () => clearInterval(id);
  }, [token, fetch, reset]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!token) {
    return null;
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-btn hover:bg-gray-100 transition-colors text-mek-text"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Уведомления${unreadCount ? `, непрочитанных: ${unreadCount}` : ''}`}
      >
        <span className="text-xl leading-none" aria-hidden>
          🔔
        </span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 min-w-[1.125rem] h-[1.125rem] px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(100vw-2rem,22rem)] max-h-[min(24rem,70vh)] overflow-hidden flex flex-col mek-card shadow-mek-card-md border border-gray-200 z-[60]">
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between gap-2 shrink-0 bg-white">
            <span className="font-semibold text-sm text-mek-text">Уведомления</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs font-semibold text-mek-accent hover:text-mek"
                onClick={() => markAllRead()}
              >
                Прочитать все
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {loading && items.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">Загрузка…</p>
            ) : null}
            {!loading && items.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">Пока нет уведомлений</p>
            ) : null}
            <ul className="divide-y divide-gray-50">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-3 hover:bg-gray-50/90 transition-colors ${
                      n.is_read ? '' : 'bg-mek/5 border-l-2 border-l-mek-accent'
                    }`}
                    onClick={() => {
                      if (!n.is_read) {
                        markRead([n.id]);
                      }
                    }}
                  >
                    <p className="text-sm font-semibold text-mek-text">{n.title}</p>
                    {n.message && (
                      <p className="text-xs text-gray-600 mt-1 leading-snug">{n.message}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1.5">{n.created_at}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
