import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import client from '../api/client';
import ScheduleEditor from '../components/ScheduleEditor';
import GradeFormModal from '../components/GradeFormModal';

export default function TeacherDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [mainTab, setMainTab] = useState(tabParam === 'schedule' ? 'schedule' : 'home');
  const [groups, setGroups] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [journalGroupId, setJournalGroupId] = useState('');
  const [journalGrades, setJournalGrades] = useState([]);
  const [journalLoading, setJournalLoading] = useState(false);
  const [journalStudents, setJournalStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [gradeModalOpen, setGradeModalOpen] = useState(false);

  useEffect(() => {
    if (tabParam === 'schedule') {
      setMainTab('schedule');
    }
  }, [tabParam]);

  const setTab = (t) => {
    setMainTab(t);
    if (t === 'schedule') {
      setSearchParams({ tab: 'schedule' });
    } else {
      setSearchParams({});
    }
  };

  useEffect(() => {
    axios.get('/api/auth/groups').then((res) => setGroups(res.data)).catch(() => setGroups([]));
    client
      .get('/assignments')
      .then((res) => setAssignments(res.data.slice(0, 6)))
      .catch(() => setAssignments([]));
    client
      .get('/subjects')
      .then((res) => setSubjects(res.data))
      .catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    if (groups.length && !journalGroupId) {
      setJournalGroupId(String(groups[0].id));
    }
  }, [groups, journalGroupId]);

  const loadJournal = () => {
    if (!journalGroupId) return;
    setJournalLoading(true);
    client
      .get('/grades', { params: { group_id: journalGroupId } })
      .then((res) => setJournalGrades(res.data))
      .catch(() => setJournalGrades([]))
      .finally(() => setJournalLoading(false));
  };

  useEffect(() => {
    if (!journalGroupId) return;
    loadJournal();
    client
      .get('/students', { params: { group_id: journalGroupId } })
      .then((res) => setJournalStudents(res.data))
      .catch(() => setJournalStudents([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journalGroupId]);

  const tabBtn = (active) =>
    `rounded-btn px-4 py-2 text-sm font-semibold transition-colors ${
      active ? 'bg-mek text-white shadow-mek-card' : 'bg-white text-mek-text border border-gray-200 hover:border-mek-accent/40'
    }`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mek-page-title mb-2">Панель преподавателя</h1>
        <p className="text-gray-600">Группы, журнал и задания.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <button type="button" onClick={() => setTab('home')} className={tabBtn(mainTab === 'home')}>
          Главная
        </button>
        <button type="button" onClick={() => setTab('schedule')} className={tabBtn(mainTab === 'schedule')}>
          Редактировать расписание
        </button>
      </div>

      {mainTab === 'schedule' ? (
        <ScheduleEditor />
      ) : (
        <>
          <section>
            <h2 className="text-lg font-semibold text-mek-text mb-4">Группы</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.map((g) => (
                <div key={g.id} className="mek-card p-5 flex flex-col gap-2 shadow-mek-card-md">
                  <span className="font-bold text-mek text-lg">{g.name}</span>
                  <span className="text-sm text-gray-600">{g.course}</span>
                  <div className="flex gap-3 mt-2 flex-wrap">
                    <Link
                      to={`/teacher/grades?group=${g.id}`}
                      className="text-sm font-semibold text-mek-accent hover:text-mek"
                    >
                      Журнал
                    </Link>
                    <Link to="/teacher/assignments" className="text-sm font-semibold text-mek-accent hover:text-mek">
                      Задания
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mek-card p-6 shadow-mek-card-md">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-mek-text">Журнал оценок</h2>
                <p className="text-sm text-gray-500 mt-1">Краткая сводка по выбранной группе</p>
              </div>
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Группа</label>
                  <select
                    value={journalGroupId}
                    onChange={(e) => setJournalGroupId(e.target.value)}
                    className="mek-select min-w-[200px]"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="button" onClick={() => setGradeModalOpen(true)} className="mek-btn-primary">
                  Выставить оценку
                </button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-card border border-gray-100">
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
                  {journalLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        Загрузка…
                      </td>
                    </tr>
                  ) : !journalGrades.length ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        Нет оценок
                      </td>
                    </tr>
                  ) : (
                    journalGrades.slice(0, 12).map((g) => (
                      <tr key={g.id} className="hover:bg-gray-50/80">
                        <td className="px-4 py-3 font-medium text-mek-text">{g.student_name}</td>
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
            {journalGrades.length > 12 && (
              <p className="text-sm text-gray-500 mt-3">
                Показаны первые 12 записей.{' '}
                <Link to="/teacher/grades" className="font-semibold text-mek-accent hover:text-mek">
                  Полный журнал
                </Link>
              </p>
            )}
          </section>

          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-mek-text">Недавние задания</h2>
              <Link to="/teacher/assignments" className="text-sm font-semibold text-mek-accent hover:text-mek">
                Все задания
              </Link>
            </div>
            <ul className="space-y-3">
              {assignments.length ? (
                assignments.map((a) => (
                  <li key={a.id}>
                    <Link
                      to={`/teacher/assignments/${a.id}`}
                      className="block p-4 mek-card hover:shadow-mek-card-md transition-shadow"
                    >
                      <span className="font-semibold text-mek-text">{a.title}</span>
                      <span className="block text-sm text-gray-500 mt-1">
                        {a.group_name} · {a.deadline}
                      </span>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="text-gray-500">Заданий пока нет</li>
              )}
            </ul>
          </section>

          <section className="flex flex-wrap gap-3">
            <Link to="/teacher/grades" className="mek-btn-primary no-underline">
              Открыть журнал оценок
            </Link>
            <Link
              to="/teacher/schedule"
              className="mek-btn-secondary border border-mek text-mek hover:bg-mek/5 no-underline"
            >
              Просмотр расписания
            </Link>
          </section>

          <GradeFormModal
            open={gradeModalOpen}
            onClose={() => setGradeModalOpen(false)}
            groupId={journalGroupId}
            students={journalStudents}
            subjects={subjects}
            onSaved={loadJournal}
          />
        </>
      )}
    </div>
  );
}
