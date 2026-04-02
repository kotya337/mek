import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import Schedule from './pages/Schedule';
import Grades from './pages/Grades';
import Assignments from './pages/Assignments';
import Statistics from './pages/Statistics';

function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireRole({ role, roles, children }) {
  const userRole = useAuthStore((s) => s.role);
  const allowed = roles || (role ? [role] : []);
  if (!allowed.includes(userRole)) {
    return <Navigate to={userRole === 'student' ? '/student' : '/teacher'} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/student"
        element={
          <RequireAuth>
            <RequireRole role="student">
              <Layout variant="student" />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="schedule" element={<Schedule variant="student" />} />
        <Route path="grades" element={<Grades variant="student" />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="assignments" element={<Assignments variant="student" />} />
        <Route path="assignments/:id" element={<Assignments variant="student" />} />
      </Route>
      <Route
        path="/teacher"
        element={
          <RequireAuth>
            <RequireRole roles={['teacher', 'zavuch']}>
              <Layout variant="teacher" />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<TeacherDashboard />} />
        <Route path="schedule" element={<Schedule variant="teacher" />} />
        <Route path="grades" element={<Grades variant="teacher" />} />
        <Route path="assignments" element={<Assignments variant="teacher" />} />
        <Route path="assignments/:id" element={<Assignments variant="teacher" />} />
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
