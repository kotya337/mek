import { DAY_LABELS, DAYS_ORDER_PN_VS } from '../constants/scheduleDays';

export default function ScheduleTable({ rows, showGroup = false }) {
  if (!rows?.length) {
    return (
      <p className="text-gray-500 py-10 text-center mek-card border-dashed border-2 border-gray-200">
        Нет записей расписания
      </p>
    );
  }

  const byDay = {};
  for (const r of rows) {
    const d = r.day_of_week;
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(r);
  }

  return (
    <div className="space-y-4">
      {DAYS_ORDER_PN_VS.map((day) => {
        const dayRows = byDay[day];
        if (!dayRows?.length) return null;
        const sortedLessons = [...dayRows].sort((a, b) => a.lesson_number - b.lesson_number);
        return (
          <section
            key={day}
            className="rounded-card border border-gray-200 overflow-hidden bg-white shadow-mek-card-md"
          >
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-mek-text">{DAY_LABELS[day] ?? `День ${day}`}</h3>
            </div>
            <div className="p-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sortedLessons.map((r) => (
                <article
                  key={r.id}
                  className="rounded-card border border-gray-100 bg-white p-4 shadow-mek-card hover:shadow-mek-card-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-btn bg-mek/10 text-mek text-sm font-bold">
                      {r.lesson_number} пара
                    </span>
                    <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-btn">
                      {r.room}
                    </span>
                  </div>
                  <p className="font-semibold text-mek-text leading-snug">{r.subject_name}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {showGroup ? r.group_name : r.teacher_name || r.group_name}
                  </p>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
