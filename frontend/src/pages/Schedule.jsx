import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import ScheduleTable from '../components/ScheduleTable';
import { DAY_LABELS, DAYS_ORDER_PN_VS } from '../constants/scheduleDays';

const tabs = [
  { id: 'day', label: 'День' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
];

export default function Schedule({ variant }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('week');
  const [selectedDay, setSelectedDay] = useState(1);

  useEffect(() => {
    let cancelled = false;
    client
      .get('/schedule')
      .then((res) => {
        if (!cancelled) setRows(res.data);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const showGroup = variant === 'teacher';

  const byDay = useMemo(() => {
    const m = {};
    for (const r of rows) {
      if (!m[r.day_of_week]) m[r.day_of_week] = [];
      m[r.day_of_week].push(r);
    }
    return m;
  }, [rows]);

  const filtered = useMemo(() => {
    if (tab === 'day') return rows.filter((r) => r.day_of_week === selectedDay);
    if (tab === 'week') return rows;
    return rows;
  }, [rows, tab, selectedDay]);

  if (loading) {
    return <p className="text-gray-500">Загрузка расписания…</p>;
  }

  const tabClass = (active) =>
    `rounded-btn px-4 py-2 text-sm font-semibold transition-colors ${
      active ? 'bg-mek text-white shadow-mek-card' : 'bg-white text-mek-text border border-gray-200 hover:border-mek-accent/40'
    }`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="mek-page-title">Расписание</h1>
        {variant === 'teacher' && (
          <Link to="/teacher?tab=schedule" className="mek-btn-primary text-sm">
            Редактировать
          </Link>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={tabClass(tab === t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'day' && (
        <div className="mb-6 flex flex-wrap gap-2">
          {DAYS_ORDER_PN_VS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDay(d)}
              className={`rounded-btn px-3 py-2 text-sm font-medium ${
                selectedDay === d ? 'bg-mek text-white shadow-mek-card' : 'bg-white text-mek-text border border-gray-200'
              }`}
            >
              {DAY_LABELS[d]}
            </button>
          ))}
        </div>
      )}
      {tab === 'month' && (
        <p className="text-sm text-gray-600 mb-6">
          В учебном расписании отображается повторяющаяся неделя. Ниже — все занятия (как «шаблон» месяца).
        </p>
      )}
      {tab === 'month' ? (
        <div className="space-y-8">
          {DAYS_ORDER_PN_VS.map((d) =>
            byDay[d]?.length ? (
              <section key={d}>
                <h2 className="text-lg font-semibold text-mek-text mb-3">{DAY_LABELS[d]}</h2>
                <ScheduleTable rows={byDay[d]} showGroup={showGroup} />
              </section>
            ) : null
          )}
        </div>
      ) : (
        <ScheduleTable rows={filtered} showGroup={showGroup} />
      )}
    </div>
  );
}
