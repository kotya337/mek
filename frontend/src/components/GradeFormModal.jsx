import { useEffect, useState } from 'react';
import client from '../api/client';

export default function GradeFormModal({
  open,
  onClose,
  groupId,
  students,
  subjects,
  onSaved,
}) {
  const [form, setForm] = useState({
    student_id: '',
    subject_id: '',
    assignment_id: '',
    grade: '5',
    date: new Date().toISOString().slice(0, 10),
  });
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMsg('');
    setForm((f) => ({
      ...f,
      student_id: students[0]?.id ? String(students[0].id) : '',
      subject_id: subjects[0]?.id ? String(subjects[0].id) : '',
      assignment_id: '',
      grade: '5',
      date: new Date().toISOString().slice(0, 10),
    }));
  }, [open, groupId, students, subjects]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    setSaving(true);
    try {
      await client.post('/grades', {
        student_id: Number(form.student_id),
        subject_id: Number(form.subject_id),
        assignment_id: form.assignment_id ? Number(form.assignment_id) : null,
        grade: Number(form.grade),
        date: form.date,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-mek-text/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grade-modal-title"
      onClick={onClose}
    >
      <div
        className="mek-card w-full max-w-lg p-6 shadow-mek-card-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <h2 id="grade-modal-title" className="text-lg font-semibold text-mek-text">
            Выставить оценку
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-btn p-1 text-gray-500 hover:bg-gray-100 hover:text-mek-text"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {msg && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-btn px-3 py-2">{msg}</div>
          )}
          {!students.length ? (
            <p className="text-sm text-gray-500">В выбранной группе нет студентов.</p>
          ) : (
            <div>
              <label className="block text-sm font-medium text-mek-text mb-1.5">Студент</label>
              <select
                value={form.student_id}
                onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}
                className="mek-select"
                required
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!!students.length && (
            <>
              <div>
                <label className="block text-sm font-medium text-mek-text mb-1.5">Предмет</label>
                <select
                  value={form.subject_id}
                  onChange={(e) => setForm((f) => ({ ...f, subject_id: e.target.value }))}
                  className="mek-select"
                  required
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-mek-text mb-1.5">Оценка</label>
                  <input
                    type="number"
                    min={2}
                    max={5}
                    value={form.grade}
                    onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
                    className="mek-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-mek-text mb-1.5">Дата</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="mek-input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-mek-text mb-1.5">ID задания (необязательно)</label>
                <input
                  type="number"
                  placeholder="Необязательно"
                  value={form.assignment_id}
                  onChange={(e) => setForm((f) => ({ ...f, assignment_id: e.target.value }))}
                  className="mek-input"
                />
              </div>
            </>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            <button type="submit" disabled={saving || !students.length} className="mek-btn-primary">
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
            <button type="button" onClick={onClose} className="mek-btn-secondary">
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
