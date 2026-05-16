import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import { gradebookApi } from '../services/api';
import { GraduationCap, Users, BookOpen, Award, ClipboardList, MessageSquare, Plus, Edit2, Trash2, Send } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import DataTable from '../components/DataTable';
import Modal, { ConfirmModal } from '../components/Modal';
import SearchBar from '../components/SearchBar';
import { useForm } from 'react-hook-form';

const PAGE_LIMIT = 10;

function Badge({ children, variant = 'gray' }) {
  const v = { gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400', red: 'bg-red-100 text-red-700', yellow: 'bg-yellow-100 text-yellow-700', blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400', purple: 'bg-purple-100 text-purple-700' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v[variant] || v.gray}`}>{children}</span>;
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500';
function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ── OVERVIEW ──────────────────────────────────────────────────────────────
function GradebookOverview() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    gradebookApi.getStats().then(r => setStats(r.data.data)).catch(() => toast.error('Failed to load stats'));
  }, []);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard title="Total Students" value={stats?.totalStudents} icon={Users} color="blue" />
      <StatsCard title="Total Courses" value={stats?.totalCourses} icon={BookOpen} color="green" />
      <StatsCard title="Active Enrollments" value={stats?.activeEnrollments} icon={ClipboardList} color="orange" />
      <StatsCard title="Average GPA" value={stats?.avgGpa ? Number(stats.avgGpa).toFixed(2) : '—'} icon={Award} color="purple" subtitle="Across all students" />
    </div>
  );
}

// ── STUDENTS ──────────────────────────────────────────────────────────────
function StudentsView() {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [enrollModal, setEnrollModal] = useState(null);
  const [courses, setCourses] = useState([]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const { register: enrollReg, handleSubmit: enrollSubmit, reset: enrollReset } = useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await gradebookApi.getStudents({ search, page, limit: PAGE_LIMIT, department: deptFilter });
      setStudents(r.data.data); setTotal(r.data.total);
    } catch { toast.error('Failed to load students'); }
    setLoading(false);
  }, [search, page, deptFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    gradebookApi.getDepartments().then(r => setDepartments(r.data.data)).catch(() => {});
    gradebookApi.getCourses({ limit: 100 }).then(r => setCourses(r.data.data)).catch(() => {});
  }, []);
  useEffect(() => { setPage(1); }, [search, deptFilter]);

  const onSubmit = async (data) => {
    try {
      if (modal.student) { await gradebookApi.updateStudent(modal.student.student_id, data); toast.success('Student updated'); }
      else { await gradebookApi.createStudent(data); toast.success('Student added'); }
      setModal(null); reset(); load();
    } catch (e) { toast.error(e.message); }
  };

  const onEnroll = async (data) => {
    try {
      await gradebookApi.enrollStudent({ student_id: enrollModal.student_id, course_id: parseInt(data.course_id) });
      toast.success('Student enrolled'); setEnrollModal(null); enrollReset();
    } catch (e) { toast.error(e.message); }
  };

  const gpaColor = (gpa) => { if (!gpa) return 'gray'; if (gpa >= 3.5) return 'green'; if (gpa >= 2.5) return 'blue'; if (gpa >= 1.5) return 'yellow'; return 'red'; };
  const statusColor = { active: 'green', inactive: 'gray', graduated: 'blue', suspended: 'red' };

  const columns = [
    { key: 'student_id_num', label: 'ID', render: v => <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{v}</code> },
    { key: 'first_name', label: 'Name', render: (v, row) => <span className="font-medium">{v} {row.last_name}</span> },
    { key: 'email', label: 'Email' },
    { key: 'department', label: 'Department' },
    { key: 'gpa', label: 'GPA', render: v => v ? <Badge variant={gpaColor(v)}>{Number(v).toFixed(2)}</Badge> : '—' },
    { key: 'status', label: 'Status', render: v => <Badge variant={statusColor[v] || 'gray'}>{v}</Badge> },
    { key: 'active_courses', label: 'Courses' },
    { key: 'actions', label: '', render: (_, row) => (
      <div className="flex gap-1">
        <button onClick={() => setEnrollModal(row)} title="Enroll" className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"><Plus size={14} /></button>
        <button onClick={() => { setModal({ student: row }); reset({ ...row, department_id: row.department_id }); }} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit2 size={14} /></button>
        <button onClick={() => setDeleteId(row.student_id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search students..." />
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none">
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.department_id} value={d.name}>{d.name}</option>)}
        </select>
        <button onClick={() => { setModal({}); reset({ status: 'active', enrollment_year: new Date().getFullYear() }); }} className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 whitespace-nowrap">
          <Plus size={16} /> Add Student
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <DataTable columns={columns} data={students} loading={loading} total={total} page={page} limit={PAGE_LIMIT} onPageChange={setPage} />
      </div>

      <Modal isOpen={!!modal} onClose={() => { setModal(null); reset(); }} title={modal?.student ? 'Edit Student' : 'Add Student'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Student ID" error={errors.student_id_num?.message}><input {...register('student_id_num', { required: 'Required' })} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" error={errors.first_name?.message}><input {...register('first_name', { required: 'Required' })} className={inputCls} /></Field>
            <Field label="Last Name" error={errors.last_name?.message}><input {...register('last_name', { required: 'Required' })} className={inputCls} /></Field>
          </div>
          <Field label="Email" error={errors.email?.message}><input {...register('email', { required: 'Required' })} type="email" className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Department">
              <select {...register('department_id')} className={inputCls}>
                <option value="">None</option>
                {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Enrollment Year"><input {...register('enrollment_year')} type="number" className={inputCls} /></Field>
          </div>
          <Field label="Status">
            <select {...register('status')} className={inputCls}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated</option>
              <option value="suspended">Suspended</option>
            </select>
          </Field>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => { setModal(null); reset(); }} className="px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm rounded-xl bg-primary-600 text-white hover:bg-primary-700">Save</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!enrollModal} onClose={() => { setEnrollModal(null); enrollReset(); }} title={`Enroll: ${enrollModal?.first_name} ${enrollModal?.last_name}`}>
        <form onSubmit={enrollSubmit(onEnroll)} className="space-y-4">
          <Field label="Select Course">
            <select {...enrollReg('course_id', { required: true })} className={inputCls}>
              <option value="">Choose course...</option>
              {courses.map(c => <option key={c.course_id} value={c.course_id}>{c.course_code} — {c.course_name}</option>)}
            </select>
          </Field>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => { setEnrollModal(null); enrollReset(); }} className="px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm rounded-xl bg-primary-600 text-white hover:bg-primary-700">Enroll</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => gradebookApi.deleteStudent(deleteId).then(() => { toast.success('Student removed'); load(); })} />
    </div>
  );
}

// ── COURSES ────────────────────────────────────────────────────────────────
function CoursesView() {
  const [courses, setCourses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [instructors, setInstructors] = useState([]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await gradebookApi.getCourses({ search, page, limit: PAGE_LIMIT }); setCourses(r.data.data); setTotal(r.data.total); }
    catch { toast.error('Failed to load courses'); }
    setLoading(false);
  }, [search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { gradebookApi.getInstructors().then(r => setInstructors(r.data.data)).catch(() => {}); }, []);
  useEffect(() => { setPage(1); }, [search]);

  const onSubmit = async (data) => {
    try {
      if (modal.course) { await gradebookApi.updateCourse(modal.course.course_id, data); toast.success('Course updated'); }
      else { await gradebookApi.createCourse(data); toast.success('Course created'); }
      setModal(null); reset(); load();
    } catch (e) { toast.error(e.message); }
  };

  const columns = [
    { key: 'course_code', label: 'Code', render: v => <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{v}</code> },
    { key: 'course_name', label: 'Course Name', render: v => <span className="font-medium">{v}</span> },
    { key: 'instructor_name', label: 'Instructor', render: v => v || '—' },
    { key: 'credits', label: 'Credits' },
    { key: 'semester', label: 'Semester' },
    { key: 'academic_year', label: 'Year' },
    { key: 'enrolled_count', label: 'Students' },
    { key: 'actions', label: '', render: (_, row) => (
      <div className="flex gap-2">
        <button onClick={() => { setModal({ course: row }); reset(row); }} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit2 size={15} /></button>
        <button onClick={() => setDeleteId(row.course_id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={15} /></button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search courses..." />
        <button onClick={() => { setModal({}); reset({}); }} className="ml-3 flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 whitespace-nowrap">
          <Plus size={16} /> Add Course
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <DataTable columns={columns} data={courses} loading={loading} total={total} page={page} limit={PAGE_LIMIT} onPageChange={setPage} />
      </div>
      <Modal isOpen={!!modal} onClose={() => { setModal(null); reset(); }} title={modal?.course ? 'Edit Course' : 'Add Course'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Course Code" error={errors.course_code?.message}><input {...register('course_code', { required: 'Required' })} className={inputCls} /></Field>
            <Field label="Credits"><input {...register('credits')} type="number" className={inputCls} /></Field>
          </div>
          <Field label="Course Name" error={errors.course_name?.message}><input {...register('course_name', { required: 'Required' })} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Semester">
              <select {...register('semester')} className={inputCls}>
                <option value="">Select...</option>
                <option value="Fall">Fall</option>
                <option value="Spring">Spring</option>
                <option value="Summer">Summer</option>
                <option value="Winter">Winter</option>
              </select>
            </Field>
            <Field label="Academic Year" error={errors.academic_year?.message}><input {...register('academic_year', { required: 'Required' })} placeholder="e.g. 2024-2025" className={inputCls} /></Field>
          </div>
          <Field label="Instructor">
            <select {...register('instructor_id')} className={inputCls}>
              <option value="">None</option>
              {instructors.map(i => <option key={i.instructor_id} value={i.instructor_id}>{i.full_name}</option>)}
            </select>
          </Field>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => { setModal(null); reset(); }} className="px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm rounded-xl bg-primary-600 text-white hover:bg-primary-700">Save</button>
          </div>
        </form>
      </Modal>
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => gradebookApi.deleteCourse(deleteId).then(() => { toast.success('Course removed'); load(); })} />
    </div>
  );
}

// ── GRADES ─────────────────────────────────────────────────────────────────
function GradesView() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [courseFilter, setCourseFilter] = useState('');
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const selectedCourse = watch('course_id');

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await gradebookApi.getGrades({ course_id: courseFilter, limit: 20 }); setGrades(r.data.data); }
    catch { toast.error('Failed to load grades'); }
    setLoading(false);
  }, [courseFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    gradebookApi.getCourses({ limit: 100 }).then(r => setCourses(r.data.data)).catch(() => {});
    gradebookApi.getStudents({ limit: 100 }).then(r => setStudents(r.data.data)).catch(() => {});
  }, []);
  useEffect(() => {
    if (selectedCourse) gradebookApi.getAssignments({ course_id: selectedCourse }).then(r => setAssignments(r.data.data)).catch(() => {});
  }, [selectedCourse]);

  const onSubmit = async (data) => {
    try {
      await gradebookApi.submitGrade(data);
      toast.success('Grade saved & GPA recalculated');
      setModal(null); reset(); load();
    } catch (e) { toast.error(e.message); }
  };

  const gradeColor = { A: 'green', B: 'blue', C: 'yellow', D: 'orange', F: 'red' };
  const columns = [
    { key: 'student_name', label: 'Student', render: v => <span className="font-medium">{v}</span> },
    { key: 'course_code', label: 'Course' },
    { key: 'assignment_title', label: 'Assignment', render: v => <span className="line-clamp-1 max-w-xs">{v}</span> },
    { key: 'points_earned', label: 'Points', render: (v, row) => `${v}/${row.max_points}` },
    { key: 'letter_grade', label: 'Grade', render: v => v ? <Badge variant={gradeColor[v?.[0]] || 'gray'}>{v}</Badge> : '—' },
    { key: 'feedback', label: 'Feedback', render: v => v ? <span className="text-xs text-gray-400 line-clamp-1 max-w-xs">{v}</span> : '—' },
    { key: 'graded_at', label: 'Date', render: v => new Date(v).toLocaleDateString() },
    { key: 'actions', label: '', render: (_, row) => (
      <button onClick={() => setDeleteId(row.grade_id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={14} /></button>
    )},
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none flex-1">
          <option value="">All Courses</option>
          {courses.map(c => <option key={c.course_id} value={c.course_id}>{c.course_code} — {c.course_name}</option>)}
        </select>
        <button onClick={() => { setModal({}); reset({}); }} className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 whitespace-nowrap">
          <Plus size={16} /> Add Grade
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <DataTable columns={columns} data={grades} loading={loading} total={grades.length} page={1} limit={20} onPageChange={() => {}} />
      </div>
      <Modal isOpen={!!modal} onClose={() => { setModal(null); reset(); }} title="Submit Grade" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Course">
            <select {...register('course_id', { required: true })} className={inputCls}>
              <option value="">Select course...</option>
              {courses.map(c => <option key={c.course_id} value={c.course_id}>{c.course_code} — {c.course_name}</option>)}
            </select>
          </Field>
          <Field label="Assignment">
            <select {...register('assignment_id', { required: true })} className={inputCls}>
              <option value="">Select assignment...</option>
              {assignments.map(a => <option key={a.assignment_id} value={a.assignment_id}>{a.assignment_title || a.title}</option>)}
            </select>
          </Field>
          <Field label="Student">
            <select {...register('student_id', { required: true })} className={inputCls}>
              <option value="">Select student...</option>
              {students.map(s => <option key={s.student_id} value={s.student_id}>{s.first_name} {s.last_name} ({s.student_id_num})</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Points Earned" error={errors.points_earned?.message}><input {...register('points_earned', { required: 'Required', valueAsNumber: true })} type="number" step="0.01" className={inputCls} /></Field>
            <Field label="Max Points" error={errors.max_points?.message}><input {...register('max_points', { required: 'Required', valueAsNumber: true })} type="number" step="0.01" className={inputCls} /></Field>
            <Field label="Weight %"><input {...register('weight_percentage', { valueAsNumber: true })} type="number" step="0.01" defaultValue={100} className={inputCls} /></Field>
          </div>
          <Field label="Feedback"><textarea {...register('feedback')} rows={3} className={inputCls} /></Field>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => { setModal(null); reset(); }} className="px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm rounded-xl bg-primary-600 text-white hover:bg-primary-700">Submit Grade</button>
          </div>
        </form>
      </Modal>
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => gradebookApi.deleteGrade(deleteId).then(() => { toast.success('Grade deleted'); load(); })} />
    </div>
  );
}

// ── ASSIGNMENTS ────────────────────────────────────────────────────────────
function AssignmentsView() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [courses, setCourses] = useState([]);
  const [courseFilter, setCourseFilter] = useState('');
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await gradebookApi.getAssignments({ course_id: courseFilter, limit: 20 }); setAssignments(r.data.data); }
    catch { toast.error('Failed to load assignments'); }
    setLoading(false);
  }, [courseFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { gradebookApi.getCourses({ limit: 100 }).then(r => setCourses(r.data.data)).catch(() => {}); }, []);

  const onSubmit = async (data) => {
    try { await gradebookApi.createAssignment(data); toast.success('Assignment created'); setModal(null); reset(); load(); }
    catch (e) { toast.error(e.message); }
  };

  const typeColor = { homework: 'blue', quiz: 'yellow', exam: 'red', project: 'purple', midterm: 'orange' };
  const columns = [
    { key: 'assignment_title', label: 'Title', render: v => <span className="font-medium">{v}</span> },
    { key: 'course_code', label: 'Course' },
    { key: 'assignment_type', label: 'Type', render: v => <Badge variant={typeColor[v] || 'gray'}>{v}</Badge> },
    { key: 'max_points', label: 'Max Points' },
    { key: 'weight_percentage', label: 'Weight %' },
    { key: 'due_date', label: 'Due Date', render: v => {
      const d = new Date(v); const past = d < new Date();
      return <span className={past ? 'text-red-500' : 'text-green-600 dark:text-green-400'}>{d.toLocaleDateString()}</span>;
    }},
    { key: 'submissions_count', label: 'Submissions', render: (v, row) => `${v}/${row.enrolled_count}` },
    { key: 'actions', label: '', render: (_, row) => (
      <button onClick={() => setDeleteId(row.assignment_id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={14} /></button>
    )},
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none flex-1">
          <option value="">All Courses</option>
          {courses.map(c => <option key={c.course_id} value={c.course_id}>{c.course_code} — {c.course_name}</option>)}
        </select>
        <button onClick={() => { setModal({}); reset({}); }} className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 whitespace-nowrap">
          <Plus size={16} /> Add Assignment
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <DataTable columns={columns} data={assignments} loading={loading} total={assignments.length} page={1} limit={20} onPageChange={() => {}} />
      </div>
      <Modal isOpen={!!modal} onClose={() => { setModal(null); reset(); }} title="Create Assignment">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Course">
            <select {...register('course_id', { required: true })} className={inputCls}>
              <option value="">Select course...</option>
              {courses.map(c => <option key={c.course_id} value={c.course_id}>{c.course_code} — {c.course_name}</option>)}
            </select>
          </Field>
          <Field label="Title" error={errors.title?.message}><input {...register('title', { required: 'Required' })} className={inputCls} /></Field>
          <Field label="Description"><textarea {...register('description')} rows={3} className={inputCls} /></Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Max Points"><input {...register('max_points')} type="number" className={inputCls} /></Field>
            <Field label="Weight %"><input {...register('weight_percentage')} type="number" className={inputCls} /></Field>
            <Field label="Type">
              <select {...register('assignment_type')} className={inputCls}>
                <option value="homework">Homework</option>
                <option value="quiz">Quiz</option>
                <option value="exam">Exam</option>
                <option value="midterm">Midterm</option>
                <option value="project">Project</option>
              </select>
            </Field>
          </div>
          <Field label="Due Date"><input {...register('due_date', { required: true })} type="datetime-local" className={inputCls} /></Field>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => { setModal(null); reset(); }} className="px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm rounded-xl bg-primary-600 text-white hover:bg-primary-700">Create</button>
          </div>
        </form>
      </Modal>
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => gradebookApi.deleteAssignment(deleteId).then(() => { toast.success('Assignment deleted'); load(); })} />
    </div>
  );
}

// ── MESSAGES ───────────────────────────────────────────────────────────────
function MessagesView() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [students, setStudents] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const { register, handleSubmit, reset } = useForm({ defaultValues: { sender_type: 'instructor', receiver_type: 'student' } });

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await gradebookApi.getMessages({ user_id: 1, user_type: 'instructor', limit: 20 }); setMessages(r.data.data); }
    catch { toast.error('Failed to load messages'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    gradebookApi.getStudents({ limit: 100 }).then(r => setStudents(r.data.data)).catch(() => {});
    gradebookApi.getInstructors().then(r => setInstructors(r.data.data)).catch(() => {});
  }, []);

  const onSend = async (data) => {
    try { await gradebookApi.sendMessage(data); toast.success('Message sent'); setModal(null); reset(); load(); }
    catch (e) { toast.error(e.message); }
  };

  const columns = [
    { key: 'subject', label: 'Subject', render: (v, row) => <span className={`font-medium ${!row.is_read ? 'text-primary-600' : ''}`}>{v}</span> },
    { key: 'sender_type', label: 'From', render: (v, row) => <Badge variant={v === 'instructor' ? 'blue' : 'green'}>{v} #{row.sender_id}</Badge> },
    { key: 'receiver_type', label: 'To', render: (v, row) => <Badge variant="gray">{v} #{row.receiver_id}</Badge> },
    { key: 'is_read', label: 'Status', render: v => <Badge variant={v ? 'gray' : 'blue'}>{v ? 'Read' : 'Unread'}</Badge> },
    { key: 'sent_at', label: 'Sent', render: v => new Date(v).toLocaleString() },
    { key: 'actions', label: '', render: (_, row) => (
      !row.is_read && <button onClick={() => gradebookApi.markMessageRead(row.message_id).then(() => load())} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200">Mark read</button>
    )},
  ];

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => { setModal({}); reset(); }} className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700">
          <Send size={16} /> Send Message
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <DataTable columns={columns} data={messages} loading={loading} total={messages.length} page={1} limit={20} onPageChange={() => {}} />
      </div>
      <Modal isOpen={!!modal} onClose={() => { setModal(null); reset(); }} title="Send Message" size="lg">
        <form onSubmit={handleSubmit(onSend)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="From (type)">
              <select {...register('sender_type')} className={inputCls}>
                <option value="instructor">Instructor</option>
                <option value="student">Student</option>
              </select>
            </Field>
            <Field label="From (ID)">
              <input {...register('sender_id', { required: true })} type="number" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="To (type)">
              <select {...register('receiver_type')} className={inputCls}>
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
              </select>
            </Field>
            <Field label="To (ID)">
              <input {...register('receiver_id', { required: true })} type="number" className={inputCls} />
            </Field>
          </div>
          <Field label="Subject"><input {...register('subject', { required: true })} className={inputCls} /></Field>
          <Field label="Message"><textarea {...register('body', { required: true })} rows={5} className={inputCls} /></Field>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => { setModal(null); reset(); }} className="px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm rounded-xl bg-primary-600 text-white hover:bg-primary-700">Send</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── LAYOUT ─────────────────────────────────────────────────────────────────
const tabs = [
  { path: '', label: 'Overview', icon: GraduationCap },
  { path: 'students', label: 'Students', icon: Users },
  { path: 'courses', label: 'Courses', icon: BookOpen },
  { path: 'grades', label: 'Grades', icon: Award },
  { path: 'assignments', label: 'Assignments', icon: ClipboardList },
  { path: 'messages', label: 'Messages', icon: MessageSquare },
];

export default function GradebookDashboard() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <GraduationCap className="text-green-500" size={28} /> Student Gradebook
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Database: student_gradebook</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map(({ path, label, icon: Icon }) => (
          <NavLink key={path} to={path} end={path === ''} className={({ isActive }) =>
            `flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${isActive ? 'border-green-500 text-green-600 dark:text-green-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`
          }>
            <Icon size={15} /> {label}
          </NavLink>
        ))}
      </div>

      <Routes>
        <Route index element={<GradebookOverview />} />
        <Route path="students" element={<StudentsView />} />
        <Route path="courses" element={<CoursesView />} />
        <Route path="grades" element={<GradesView />} />
        <Route path="assignments" element={<AssignmentsView />} />
        <Route path="messages" element={<MessagesView />} />
      </Routes>
    </div>
  );
}
