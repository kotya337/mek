import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import client from '../api/client';
import GradeItem from '../components/GradeItem';
import GradeFormModal from '../components/GradeFormModal';

export default function Grades({ variant }) {
  const [searchParams] = useSearchParams();
  const groupFromUrl = searchParams.get('group');
  const [grades, setGrades] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (variant !== 'teacher') return;
    client
      .get('/auth/groups')
      .then((res) => {
        setGroups(res.data);
        if (groupFromUrl && res.data.some((g) => String(g.id) === groupFromUrl)) {
          setGroupId(groupFromUrl);
        } else if (res.data[0]) {
          setGroupId(String(res.data[0].id));
        }
      })
      .catch(() => {});
  }, [variant, groupFromUrl]);

  useEffect(() => {
    if (variant !== 'teacher') return;
    client
      .get('/subjects')
      .then((res) => setSubjects(res.data))
      .catch(() => setSubjects([]));
  }, [variant]);

  const loadGrades = () => {
    if (variant === 'teacher' && !groupId) {
      setGrades([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const req =
      variant === 'teacher'
        ? client.get('/grades', { params: { group_id: groupId } })
        : client.get('/grades');
    req
      .then((res) => setGrades(res.data))
      .catch(() => setGrades([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, groupId]);

  useEffect(() => {
    if (variant !== 'teacher' || !groupId) {
      setStudents([]);
      return;
    }
    client
      .get('/students', { params: { group_id: groupId } })
      .then((res) => setStudents(res.data))
      .catch(() => setStudents([]));
  }, [variant, groupId]);

  const overallAvg =
    variant === 'student' && grades.length
      ? (grades.reduce((s, g) => s + g.grade, 0) / grades.length).toFixed(2)
      : null;

  const bySubject = useMemo(() => {
    if (variant !== 'student' || !grades.length) return [];
    const m = {};
    for (const g of grades) {
      const k = g.subject_name;
      if (!m[k]) m[k] = { sum: 0, count: 0 };
      m[k].sum += g.grade;
      m[k].count += 1;
    }
    return Object.entries(m).map(([name, v]) => ({
      name,
      avg: v.sum / v.count,
      count: v.count,
    }));
  }, [grades, variant]);

  if (loading && variant === 'student') {
    return <p className="text-gray-500">Загрузка…</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <h1 className="mek-page-title">{variant === 'teacher' ? 'Журнал оценок' : 'Мои оценки'}</h1>
        {variant === 'teacher' && (
          <button type="button" onClick={() => setModalOpen(true)} className="mek-btn-primary">
            Выставить оценку
          </button>
        )}
      </div>

      {variant === 'student' && overallAvg !== null && (
        <div className="mek-card p-6 mb-8 inline-block min-w-[200px]">
          <p className="text-sm font-medium text-gray-500">Общий средний балл</p>
          <p className="text-3xl font-bold text-mek mt-1">{overallAvg}</p>
        </div>
      )}

      {variant === 'student' && bySubject.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
          {bySubject.map(({ name, avg, count }) => {
            const pct = (avg / 5) * 100;
            return (
              <div key={name} className="mek-card p-5">
                <p className="font-semibold text-mek-text leading-snug">{name}</p>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-2xl font-bold text-mek">{avg.toFixed(2)}</span>
                  <span className="text-sm text-gray-500">средний · {count} оц.</span>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>2</span>
                    <span>5</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-mek-accent transition-all"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {variant === 'teacher' && (
        <div className="mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-mek-text mb-1.5">Группа</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="mek-select min-w-[220px]"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {variant === 'teacher' && (
        <div className="mek-card overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-4 py-3 font-semibold text-mek-text">Студент</th>
                  <th className="px-4 py-3 font-semibold text-mek-text">Предмет</th>
                  <th className="px-4 py-3 font-semibold text-mek-text">Задание</th>
                  <th className="px-4 py-3 font-semibold text-mek-text">Дата</th>
                  <th className="px-4 py-3 font-semibold text-mek-text text-center w-24">Оценка</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Загрузка…
                    </td>
                  </tr>
                ) : !grades.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Нет оценок
                    </td>
                  </tr>
                ) : (
                  grades.map((g) => (
                    <tr key={g.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3 text-mek-text font-medium">{g.student_name}</td>
                      <td className="px-4 py-3 text-gray-700">{g.subject_name}</td>
                      <td className="px-4 py-3 text-gray-600">{g.assignment_title || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{g.date}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-[2.25rem] h-9 px-2 rounded-full bg-mek text-white font-bold text-sm shadow-mek-card">
                          {g.grade}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {variant === 'student' && (
        <div className="mek-card p-5">
          <h2 className="text-base font-semibold text-mek-text mb-1">Все оценки</h2>
          <p className="text-sm text-gray-500 mb-4">Хронологический список</p>
          {loading ? (
            <p className="text-gray-500">Загрузка…</p>
          ) : !grades.length ? (
            <p className="text-gray-500">Нет оценок</p>
          ) : (
            grades.map((g) => (
              <GradeItem
                key={g.id}
                grade={g.grade}
                subjectName={g.subject_name}
                assignmentTitle={g.assignment_title}
                date={g.date}
              />
            ))
          )}
        </div>
      )}

      <GradeFormModal
        open={modalOpen && variant === 'teacher'}
        onClose={() => setModalOpen(false)}
        groupId={groupId}
        students={students}
        subjects={subjects}
        onSaved={loadGrades}
      />
    </div>
  );
}
