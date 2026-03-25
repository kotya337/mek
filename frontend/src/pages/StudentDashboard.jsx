import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import ScheduleTable from '../components/ScheduleTable';
import GradeItem from '../components/GradeItem';

export default function StudentDashboard() {
  const [schedule, setSchedule] = useState([]);
  const [grades, setGrades] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      client.get('/schedule').then((r) => r.data).catch(() => []),
      client.get('/grades').then((r) => r.data).catch(() => []),
      client.get('/assignments').then((r) => r.data).catch(() => []),
    ])
      .then(([s, g, a]) => {
        if (!cancelled) {
          setSchedule(s);
          setGrades(g);
          setAssignments(a);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const avg = useMemo(() => {
    if (!grades.length) return null;
    return (grades.reduce((acc, x) => acc + x.grade, 0) / grades.length).toFixed(2);
  }, [grades]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return [...assignments]
      .filter((a) => new Date(a.deadline) >= now)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 4);
  }, [assignments]);

  const recentGrades = useMemo(() => grades.slice(0, 5), [grades]);

  if (loading) {
    return <p className="text-gray-500">Загрузка дашборда…</p>;
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="mek-page-title mb-2">Добро пожаловать</h1>
        <p className="text-gray-600">Расписание, успеваемость и задания в одном месте.</p>
      </div>
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-mek-text">Расписание (неделя)</h2>
          <Link to="/student/schedule" className="text-sm font-semibold text-mek-accent hover:text-mek">
            Полное расписание
          </Link>
        </div>
        <ScheduleTable rows={schedule} />
      </section>
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-mek-text">Средний балл</h2>
            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              <Link to="/student/statistics" className="text-mek-accent hover:text-mek">
                Статистика
              </Link>
              <Link to="/student/grades" className="text-mek-accent hover:text-mek">
                Все оценки
              </Link>
            </div>
          </div>
          <div className="mek-card p-6 shadow-mek-card-md">
            {avg !== null ? (
              <p className="text-4xl font-bold text-mek">{avg}</p>
            ) : (
              <p className="text-gray-500">Пока нет оценок</p>
            )}
          </div>
          {recentGrades.length > 0 && (
            <div className="mt-4 mek-card p-5 shadow-mek-card-md">
              <p className="text-sm font-semibold text-mek-text mb-3">Последние оценки</p>
              {recentGrades.map((g) => (
                <GradeItem
                  key={g.id}
                  grade={g.grade}
                  subjectName={g.subject_name}
                  assignmentTitle={g.assignment_title}
                  date={g.date}
                />
              ))}
            </div>
          )}
        </section>
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-mek-text">Ближайшие задания</h2>
            <Link to="/student/assignments" className="text-sm font-semibold text-mek-accent hover:text-mek">
              Все задания
            </Link>
          </div>
          <ul className="space-y-3">
            {upcoming.length ? (
              upcoming.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/student/assignments/${a.id}`}
                    className="block p-4 mek-card hover:shadow-mek-card-md transition-shadow"
                  >
                    <span className="font-semibold text-mek-text">{a.title}</span>
                    <span className="block text-sm text-gray-500 mt-1">{a.deadline}</span>
                  </Link>
                </li>
              ))
            ) : (
              <li className="text-gray-500">Нет активных заданий</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
