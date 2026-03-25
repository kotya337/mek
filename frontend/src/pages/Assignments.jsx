import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function doneKey(userId, assignmentId) {
  return `mek-assignment-done-${userId}-${assignmentId}`;
}

async function downloadAssignmentFile(assignmentId) {
  try {
    const res = await client.get(`/assignments/${assignmentId}/download`, { responseType: 'blob' });
    let filename = 'file';
    const cd = res.headers['content-disposition'];
    if (cd) {
      const utf = /filename\*=UTF-8''([^;\s]+)/i.exec(cd);
      const quoted = /filename="([^"]+)"/i.exec(cd);
      if (utf) {
        try {
          filename = decodeURIComponent(utf[1]);
        } catch {
          filename = utf[1];
        }
      } else if (quoted) {
        filename = quoted[1];
      }
    }
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    let message = 'Не удалось скачать файл';
    const data = err.response?.data;
    if (data instanceof Blob && data.type?.includes('application/json')) {
      try {
        const text = await data.text();
        const j = JSON.parse(text);
        if (j.error) message = j.error;
      } catch {
        /* ignore */
      }
    } else if (err.response?.data?.error) {
      message = err.response.data.error;
    }
    alert(message);
  }
}

export default function Assignments({ variant }) {
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef(null);
  const [list, setList] = useState([]);
  const [groups, setGroups] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [groupFilter, setGroupFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(!!id);
  const [form, setForm] = useState({
    title: '',
    description: '',
    deadline: '',
    subject_id: '',
    group_id: '',
  });
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [doneMap, setDoneMap] = useState({});

  useEffect(() => {
    if (variant !== 'student' || !user?.id) {
      setDoneMap({});
      return;
    }
    const next = {};
    for (const a of list) {
      next[String(a.id)] = localStorage.getItem(doneKey(user.id, a.id)) === '1';
    }
    setDoneMap(next);
  }, [list, user?.id, variant]);

  const setDone = (assignmentId, value) => {
    if (!user?.id) return;
    const k = doneKey(user.id, assignmentId);
    if (value) localStorage.setItem(k, '1');
    else localStorage.removeItem(k);
    setDoneMap((m) => ({ ...m, [String(assignmentId)]: value }));
  };

  useEffect(() => {
    if (variant !== 'teacher') return;
    client.get('/auth/groups').then((res) => {
      setGroups(res.data);
      if (res.data[0]) {
        setGroupFilter(String(res.data[0].id));
        setForm((f) => ({ ...f, group_id: String(res.data[0].id) }));
      }
    });
    client.get('/subjects').then((res) => {
      setSubjects(res.data);
      if (res.data[0]) setForm((f) => ({ ...f, subject_id: String(res.data[0].id) }));
    });
  }, [variant]);

  const loadList = () => {
    setLoading(true);
    const params = variant === 'teacher' && groupFilter ? { group_id: groupFilter } : {};
    client
      .get('/assignments', { params })
      .then((res) => setList(res.data))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (id) {
      setDetailLoading(true);
      client
        .get(`/assignments/${id}`)
        .then((res) => setDetail(res.data))
        .catch(() => setDetail(null))
        .finally(() => setDetailLoading(false));
      return;
    }
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, variant, groupFilter]);

  const base = variant === 'teacher' ? '/teacher' : '/student';

  const createAssignment = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description || '');
      fd.append('deadline', form.deadline);
      fd.append('subject_id', String(form.subject_id));
      fd.append('group_id', String(form.group_id));
      if (file) {
        fd.append('file', file);
      }
      await client.post('/assignments', fd);
      setMsg('Задание создано');
      setForm((f) => ({ ...f, title: '', description: '' }));
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadList();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Ошибка');
    }
  };

  const isOverdue = (deadline) => {
    try {
      return new Date(deadline) < new Date(new Date().toDateString());
    } catch {
      return false;
    }
  };

  if (id) {
    if (detailLoading) {
      return <p className="text-gray-500">Загрузка…</p>;
    }
    if (!detail) {
      return <p className="text-gray-500">Не найдено</p>;
    }
    const studentDone = variant === 'student' && user?.id ? doneMap[String(detail.id)] : false;
    return (
      <div>
        <Link
          to={`${base}/assignments`}
          className="text-mek-accent text-sm font-semibold hover:text-mek mb-4 inline-block"
        >
          ← К списку
        </Link>
        <div className="mek-card p-6 sm:p-8 shadow-mek-card-md">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <h1 className="mek-page-title mb-0">{detail.title}</h1>
            {variant === 'student' && user?.id && (
              <button
                type="button"
                onClick={() => setDone(detail.id, !studentDone)}
                className={`rounded-btn px-4 py-2 text-sm font-semibold transition-colors ${
                  studentDone
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-900 border border-amber-200'
                }`}
              >
                {studentDone ? 'Выполнено' : 'Отметить выполненным'}
              </button>
            )}
          </div>
          <p className="text-gray-500 text-sm mb-6">
            {detail.subject_name} · {detail.group_name}
          </p>
          <div className="inline-flex items-center gap-2 rounded-btn bg-gray-100 px-3 py-2 text-sm text-mek-text mb-6">
            <span className="font-medium text-gray-500">Дедлайн:</span>
            <span className={isOverdue(detail.deadline) ? 'text-red-600 font-semibold' : 'font-semibold'}>
              {formatDate(detail.deadline)}
            </span>
          </div>
          {detail.file_url && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => downloadAssignmentFile(detail.id)}
                className="mek-btn-primary"
              >
                Скачать файл
              </button>
              <p className="text-xs text-gray-400 mt-2">
                Вложение к заданию (pdf, doc, docx, jpg, png, до 10 МБ)
              </p>
            </div>
          )}
          {variant === 'student' && (
            <p className="text-xs text-gray-400 mb-4">
              Статус «выполнено» сохраняется только в этом браузере.
            </p>
          )}
          <div className="prose prose-slate max-w-none border-t border-gray-100 pt-6">
            <p className="whitespace-pre-wrap text-mek-text leading-relaxed">{detail.description || 'Без описания'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mek-page-title mb-8">Задания</h1>
      {variant === 'teacher' && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-mek-text mb-1.5">Группа (фильтр)</label>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="mek-select max-w-xs"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <form onSubmit={createAssignment} className="mek-card p-6 mb-8 space-y-4 shadow-mek-card-md">
            <p className="font-semibold text-mek-text">Новое задание</p>
            <input
              placeholder="Название"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mek-input"
              required
            />
            <textarea
              placeholder="Описание"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="mek-input min-h-[100px] resize-y"
            />
            <div>
              <label className="block text-sm font-medium text-mek-text mb-1.5">Файл (необязательно)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-mek-text file:mr-3 file:rounded-btn file:border-0 file:bg-mek/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-mek"
              />
              <p className="text-xs text-gray-500 mt-1">pdf, doc, docx, jpg, png · до 10 МБ</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                className="mek-input w-auto"
                required
              />
              <select
                value={form.subject_id}
                onChange={(e) => setForm((f) => ({ ...f, subject_id: e.target.value }))}
                className="mek-select w-auto min-w-[180px]"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                value={form.group_id}
                onChange={(e) => setForm((f) => ({ ...f, group_id: e.target.value }))}
                className="mek-select w-auto min-w-[160px]"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="mek-btn-primary">
              Создать
            </button>
            {msg && <p className="text-sm text-gray-600">{msg}</p>}
          </form>
        </>
      )}
      {loading ? (
        <p className="text-gray-500">Загрузка…</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {list.map((a) => {
            const overdue = isOverdue(a.deadline);
            const done = variant === 'student' && doneMap[String(a.id)];
            return (
              <li key={a.id}>
                <div className="mek-card overflow-hidden shadow-mek-card-md flex flex-col h-full">
                  <Link
                    to={`${base}/assignments/${a.id}`}
                    className="flex-1 p-5 block hover:bg-gray-50/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-semibold text-mek-text leading-snug">{a.title}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{a.subject_name}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-btn px-2.5 py-1 text-xs font-semibold ${
                          overdue ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        до {formatDate(a.deadline)}
                      </span>
                      {variant === 'teacher' && (
                        <span className="text-xs text-gray-500 font-medium">{a.group_name}</span>
                      )}
                      {a.file_url && (
                        <span className="inline-flex items-center rounded-btn px-2.5 py-1 text-xs font-semibold bg-mek/10 text-mek border border-mek/20">
                          Есть файл
                        </span>
                      )}
                    </div>
                  </Link>
                  {a.file_url && (
                    <div className="px-5 pb-3">
                      <button
                        type="button"
                        onClick={() => downloadAssignmentFile(a.id)}
                        className="text-sm font-semibold text-mek-accent hover:text-mek underline-offset-2 hover:underline"
                      >
                        Скачать вложение
                      </button>
                    </div>
                  )}
                  {variant === 'student' && user?.id && (
                    <div className="px-5 pb-5 flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/60">
                      <span
                        className={`text-xs font-bold uppercase tracking-wide ${
                          done ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {done ? 'Выполнено' : 'Не выполнено'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDone(a.id, !done)}
                        className="mek-btn-secondary text-xs py-2 px-3"
                      >
                        {done ? 'Снять отметку' : 'Выполнено'}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!loading && !list.length && <p className="text-gray-500 mt-4">Список пуст</p>}
    </div>
  );
}
