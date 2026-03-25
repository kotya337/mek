import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import client from '../api/client';

const CHART_PRIMARY = '#1E3A8A';
const CHART_ACCENT = '#2563EB';

function formatPeriod(period) {
  const [yy, mm] = period.split('-');
  const d = new Date(Number(yy), Number(mm) - 1, 1);
  return d.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
}

export default function Statistics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    client
      .get('/grades/statistics')
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || 'Не удалось загрузить статистику');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-gray-500">Загрузка статистики…</p>;
  }
  if (error) {
    return <p className="text-red-600">{error}</p>;
  }
  if (!data) {
    return null;
  }

  const barData = (data.by_subject || []).map((s) => ({
    name:
      s.subject_name.length > 22 ? `${s.subject_name.slice(0, 20)}…` : s.subject_name,
    fullName: s.subject_name,
    average: s.average,
  }));

  const lineData = (data.semester_trend || []).map((t) => ({
    ...t,
    label: formatPeriod(t.period),
  }));

  const { distribution } = data;
  const distRows = [
    { key: 'Отлично (5)', pct: distribution.excellent_percent, color: 'bg-emerald-500' },
    { key: 'Хорошо (4)', pct: distribution.good_percent, color: 'bg-mek-accent' },
    { key: 'Удовлетворительно (3)', pct: distribution.satisfactory_percent, color: 'bg-amber-400' },
    { key: 'Неудовлетворительно (2)', pct: distribution.poor_percent, color: 'bg-red-400' },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="mek-page-title mb-2">Статистика успеваемости</h1>
        <p className="text-gray-600 text-sm">
          Текущий семестр:{' '}
          <span className="font-medium text-mek-text">
            {data.semester?.label} ({data.semester?.start} — {data.semester?.end})
          </span>
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="mek-card p-5 shadow-mek-card-md sm:col-span-2 lg:col-span-1">
          <p className="text-sm font-medium text-gray-500">Общий средний балл</p>
          <p className="text-3xl font-bold text-mek mt-1">
            {data.overall_average != null ? data.overall_average.toFixed(2) : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-2">По всем оценкам</p>
        </div>
        {distRows.map((row) => (
          <div key={row.key} className="mek-card p-5 shadow-mek-card-md">
            <p className="text-sm font-medium text-gray-600">{row.key}</p>
            <p className="text-2xl font-bold text-mek-text mt-1">{row.pct}%</p>
            <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className={`h-full ${row.color}`} style={{ width: `${Math.min(100, row.pct)}%` }} />
            </div>
          </div>
        ))}
      </div>

      <section className="mek-card p-5 sm:p-6 shadow-mek-card-md">
        <h2 className="text-lg font-semibold text-mek-text mb-4">Средний балл по предметам</h2>
        {barData.length === 0 ? (
          <p className="text-gray-500 text-sm">Нет данных для диаграммы</p>
        ) : (
          <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 64 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#374151' }}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={70}
                />
                <YAxis domain={[2, 5]} tickCount={4} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [Number(value).toFixed(2), 'Средний балл']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                />
                <Bar dataKey="average" fill={CHART_PRIMARY} radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="mek-card p-5 sm:p-6 shadow-mek-card-md">
        <h2 className="text-lg font-semibold text-mek-text mb-1">Динамика за семестр</h2>
        <p className="text-sm text-gray-500 mb-4">Средний балл по месяцам в границах текущего семестра</p>
        {lineData.length === 0 ? (
          <p className="text-gray-500 text-sm">За семестр пока нет оценок</p>
        ) : (
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis domain={[2, 5]} tickCount={4} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [Number(value).toFixed(2), 'Средний за месяц']}
                  labelFormatter={(l) => l}
                />
                <Line
                  type="monotone"
                  dataKey="average"
                  stroke={CHART_ACCENT}
                  strokeWidth={2}
                  dot={{ r: 4, fill: CHART_ACCENT }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
