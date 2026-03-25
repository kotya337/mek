export default function GradeItem({ grade, subjectName, assignmentTitle, date, studentName }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="font-medium text-mek-text">{subjectName}</p>
        {assignmentTitle && <p className="text-sm text-gray-500 mt-0.5">{assignmentTitle}</p>}
        {studentName && <p className="text-sm text-mek-accent font-medium mt-0.5">{studentName}</p>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{date}</span>
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-mek text-white font-bold text-sm shadow-mek-card">
          {grade}
        </span>
      </div>
    </div>
  );
}
