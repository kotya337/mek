import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import client from '../api/client';
import { DAY_LABELS, DAYS_ORDER_PN_VS } from '../constants/scheduleDays';

const LESSONS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function ScheduleEditor() {
  const [groups, setGroups] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    group_id: '',
    subject_id: '',
    day_of_week: '1',
    lesson_number: '1',
    room: '',
  });
  const defaultsSet = useRef(false);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      axios.get('/api/auth/groups').then((r) => r.data),
      client.get('/subjects').then((r) => r.data),
      client.get('/schedule').then((r) => r.data),
    ])
      .then(([g, sub, sch]) => {
        setGroups(g);
        setSubjects(sub);
        setRows(sch);
        if (!defaultsSet.current && g[0] && sub[0]) {
          defaultsSet.current = true;
          setForm((f) => ({
            ...f,
            group_id: String(g[0].id),
            subject_id: String(sub[0].id),
          }));
        }
      })
      .catch(() => {
        setError('Не удалось загрузить данные');
        setRows([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
        return a.lesson_number - b.lesson_number;
      }),
    [rows]
  );

  const addPair = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await client.post('/schedule', {
        group_id: Number(form.group_id),
        subject_id: Number(form.subject_id),
        day_of_week: Number(form.day_of_week),
        lesson_number: Number(form.lesson_number),
        room: form.room.trim(),
      });
      setRows((prev) => [...prev, data]);
      setForm((f) => ({ ...f, room: '' }));
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось добавить пару');
    } finally {
      setSaving(false);
    }
  };

  const removePair = async (id) => {
    setError('');
    try {
      await client.delete(`/schedule/${id}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось удалить пару');
    }
  };

  if (loading) {
    return <p className="text-gray-500">Загрузка редактора…</p>;
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-btn px-3 py-2.5">{error}</div>
      )}

      <form
        onSubmit={addPair}
        className="mek-card p-5 sm:p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 items-end shadow-mek-card-md"
      >
        <p className="sm:col-span-2 lg:col-span-3 xl:col-span-6 font-semibold text-mek-text">Добавить пару</p>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Группа</label>
          <select
            value={form.group_id}
            onChange={(e) => setForm((f) => ({ ...f, group_id: e.target.value }))}
            className="mek-select text-sm"
            required
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Предмет</label>
          <select
            value={form.subject_id}
            onChange={(e) => setForm((f) => ({ ...f, subject_id: e.target.value }))}
            className="mek-select text-sm"
            required
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">День недели</label>
          <select
            value={form.day_of_week}
            onChange={(e) => setForm((f) => ({ ...f, day_of_week: e.target.value }))}
            className="mek-select text-sm"
            required
          >
            {DAYS_ORDER_PN_VS.map((d) => (
              <option key={d} value={d}>
                {DAY_LABELS[d]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Урок (1–8)</label>
          <select
            value={form.lesson_number}
            onChange={(e) => setForm((f) => ({ ...f, lesson_number: e.target.value }))}
            className="mek-select text-sm"
            required
          >
            {LESSONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Кабинет</label>
          <input
            value={form.room}
            onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
            className="mek-input text-sm"
            placeholder="напр. 301"
            required
          />
        </div>
        <button type="submit" disabled={saving} className="mek-btn-primary text-sm w-full xl:w-auto">
          {saving ? 'Добавление…' : 'Добавить пару'}
        </button>
      </form>

      <section>
        <h2 className="text-lg font-semibold text-mek-text mb-4">Мои пары в расписании</h2>
        {!sorted.length ? (
          <p className="text-gray-500 py-10 text-center mek-card border-dashed border-2 border-gray-200">
            Пока нет записей. Добавьте пару выше.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-card border border-gray-200 bg-white shadow-mek-card-md">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-4 py-3 font-semibold text-mek-text">День</th>
                  <th className="px-4 py-3 font-semibold text-mek-text">Пара</th>
                  <th className="px-4 py-3 font-semibold text-mek-text">Предмет</th>
                  <th className="px-4 py-3 font-semibold text-mek-text">Группа</th>
                  <th className="px-4 py-3 font-semibold text-mek-text">Аудитория</th>
                  <th className="px-4 py-3 font-semibold text-mek-text w-14" aria-label="Удалить" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 whitespace-nowrap text-mek-text">
                      {DAY_LABELS[r.day_of_week] ?? r.day_of_week}
                    </td>
                    <td className="px-4 py-3 font-medium">{r.lesson_number}</td>
                    <td className="px-4 py-3 font-semibold text-mek-text">{r.subject_name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.group_name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.room}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => removePair(r.id)}
                        className="text-lg leading-none p-2 rounded-btn hover:bg-red-50 text-gray-500 hover:text-red-600"
                        title="Удалить пару"
                        aria-label="Удалить пару"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
