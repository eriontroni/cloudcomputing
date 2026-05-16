const { sql, gradebookPool } = require('../config/db');

// ── STATS ──────────────────────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM students WHERE status='active') AS totalStudents,
        (SELECT COUNT(*) FROM courses WHERE is_active=1) AS totalCourses,
        (SELECT COUNT(*) FROM enrollments WHERE status='active') AS activeEnrollments,
        (SELECT ISNULL(AVG(CAST(gpa AS FLOAT)),0) FROM students WHERE status='active' AND gpa IS NOT NULL) AS avgGpa
    `);
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

// ── STUDENTS ───────────────────────────────────────────────────────────────
exports.getStudents = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const { search = '', department = '', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    let where = `WHERE s.status != 'inactive' AND (s.first_name LIKE @search OR s.last_name LIKE @search OR s.email LIKE @search OR s.student_number LIKE @search)`;
    if (department) where += ` AND d.name = @department`;

    const req2 = pool.request()
      .input('search', sql.NVarChar, `%${search}%`)
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit));
    if (department) req2.input('department', sql.NVarChar, department);

    const result = await req2.query(`
      SELECT s.student_id, s.student_number AS student_id_num, s.first_name, s.last_name, s.email,
             s.department_id, d.name AS department, s.enrollment_year, s.gpa, s.status,
             (SELECT COUNT(*) FROM enrollments e WHERE e.student_id = s.student_id AND e.status='active') AS active_courses
      FROM students s
      LEFT JOIN departments d ON s.department_id = d.department_id
      ${where}
      ORDER BY s.last_name, s.first_name
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    const countReq = pool.request().input('search', sql.NVarChar, `%${search}%`);
    if (department) countReq.input('department', sql.NVarChar, department);
    const count = await countReq.query(`
      SELECT COUNT(*) AS total FROM students s
      LEFT JOIN departments d ON s.department_id = d.department_id
      ${where}
    `);

    res.json({ success: true, data: result.recordset, total: count.recordset[0].total });
  } catch (err) { next(err); }
};

exports.getStudentById = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const { id } = req.params;
    const student = await pool.request().input('id', sql.Int, id)
      .query(`SELECT * FROM students WHERE student_id=@id`);
    if (!student.recordset.length) return res.status(404).json({ success: false, message: 'Student not found' });

    const grades = await pool.request().input('id', sql.Int, id).query(`
      SELECT g.grade_id, g.points_earned, g.feedback, g.graded_at,
             a.max_points, a.weight_percentage,
             CASE
               WHEN a.max_points = 0 THEN 'F'
               WHEN (g.points_earned * 100.0 / a.max_points) >= 90 THEN 'A'
               WHEN (g.points_earned * 100.0 / a.max_points) >= 80 THEN 'B'
               WHEN (g.points_earned * 100.0 / a.max_points) >= 70 THEN 'C'
               WHEN (g.points_earned * 100.0 / a.max_points) >= 60 THEN 'D'
               ELSE 'F'
             END AS letter_grade,
             a.title AS assignment_title, a.due_date, a.assignment_type,
             c.title AS course_name, c.course_code
      FROM grades g
      JOIN submissions sub ON g.submission_id = sub.submission_id
      JOIN assignments a ON sub.assignment_id = a.assignment_id
      JOIN courses c ON a.course_id = c.course_id
      WHERE sub.student_id = @id
      ORDER BY c.title, a.due_date DESC
    `);
    res.json({ success: true, data: { ...student.recordset[0], grades: grades.recordset } });
  } catch (err) { next(err); }
};

exports.createStudent = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const { student_id_num, first_name, last_name, email, department_id, enrollment_year, status = 'active' } = req.body;
    const result = await pool.request()
      .input('student_number', sql.NVarChar, student_id_num)
      .input('first_name', sql.NVarChar, first_name)
      .input('last_name', sql.NVarChar, last_name)
      .input('email', sql.NVarChar, email)
      .input('department_id', sql.Int, department_id || null)
      .input('enrollment_year', sql.Int, enrollment_year)
      .input('status', sql.NVarChar, status)
      .query(`INSERT INTO students (student_number,first_name,last_name,email,department_id,enrollment_year,status) OUTPUT INSERTED.* VALUES (@student_number,@first_name,@last_name,@email,@department_id,@enrollment_year,@status)`);
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

exports.updateStudent = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const { id } = req.params;
    const { first_name, last_name, email, department_id, status } = req.body;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('first_name', sql.NVarChar, first_name)
      .input('last_name', sql.NVarChar, last_name)
      .input('email', sql.NVarChar, email)
      .input('department_id', sql.Int, department_id || null)
      .input('status', sql.NVarChar, status)
      .query(`UPDATE students SET first_name=@first_name, last_name=@last_name, email=@email, department_id=@department_id, status=@status OUTPUT INSERTED.* WHERE student_id=@id`);
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

exports.deleteStudent = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const { id } = req.params;
    await pool.request().input('id', sql.Int, id).query(`UPDATE students SET status='inactive' WHERE student_id=@id`);
    res.json({ success: true, message: 'Student deactivated' });
  } catch (err) { next(err); }
};

exports.getDepartments = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const result = await pool.request().query(`SELECT department_id, name FROM departments ORDER BY name`);
    res.json({ success: true, data: result.recordset });
  } catch (err) { next(err); }
};

// ── COURSES ────────────────────────────────────────────────────────────────
exports.getCourses = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const { search = '', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const result = await pool.request()
      .input('search', sql.NVarChar, `%${search}%`)
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit))
      .query(`
        SELECT c.course_id, c.course_code, c.title AS course_name, c.credits, c.semester, c.academic_year, c.is_active,
               i.first_name + ' ' + i.last_name AS instructor_name,
               (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.course_id AND e.status='active') AS enrolled_count
        FROM courses c
        LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
        WHERE c.is_active=1 AND (c.title LIKE @search OR c.course_code LIKE @search)
        ORDER BY c.course_code
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    const count = await pool.request().input('search', sql.NVarChar, `%${search}%`)
      .query(`SELECT COUNT(*) AS total FROM courses c WHERE c.is_active=1 AND (c.title LIKE @search OR c.course_code LIKE @search)`);
    res.json({ success: true, data: result.recordset, total: count.recordset[0].total });
  } catch (err) { next(err); }
};

exports.createCourse = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const { course_code, course_name, credits, semester, academic_year, instructor_id } = req.body;
    const result = await pool.request()
      .input('course_code', sql.NVarChar, course_code)
      .input('title', sql.NVarChar, course_name)
      .input('credits', sql.Int, credits)
      .input('semester', sql.NVarChar, semester)
      .input('academic_year', sql.NVarChar, academic_year)
      .input('instructor_id', sql.Int, instructor_id || null)
      .query(`INSERT INTO courses (course_code,title,credits,semester,academic_year,instructor_id,is_active) OUTPUT INSERTED.* VALUES (@course_code,@title,@credits,@semester,@academic_year,@instructor_id,1)`);
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const { id } = req.params;
    const { course_code, course_name, credits, semester, academic_year, instructor_id } = req.body;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('course_code', sql.NVarChar, course_code)
      .input('title', sql.NVarChar, course_name)
      .input('credits', sql.Int, credits)
      .input('semester', sql.NVarChar, semester)
      .input('academic_year', sql.NVarChar, academic_year)
      .input('instructor_id', sql.Int, instructor_id || null)
      .query(`UPDATE courses SET course_code=@course_code,title=@title,credits=@credits,semester=@semester,academic_year=@academic_year,instructor_id=@instructor_id OUTPUT INSERTED.* WHERE course_id=@id`);
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

exports.deleteCourse = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const { id } = req.params;
    await pool.request().input('id', sql.Int, id).query(`UPDATE courses SET is_active=0 WHERE course_id=@id`);
    res.json({ success: true, message: 'Course deactivated' });
  } catch (err) { next(err); }
};

// ── ENROLLMENTS ────────────────────────────────────────────────────────────
exports.enrollStudent = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const { student_id, course_id } = req.body;
    const exists = await pool.request()
      .input('student_id', sql.Int, student_id)
      .input('course_id', sql.Int, course_id)
      .query(`SELECT 1 FROM enrollments WHERE student_id=@student_id AND course_id=@course_id AND status='active'`);
    if (exists.recordset.length) return res.status(400).json({ success: false, message: 'Student already enrolled' });

    const result = await pool.request()
      .input('student_id', sql.Int, student_id)
      .input('course_id', sql.Int, course_id)
      .query(`INSERT INTO enrollments (student_id,course_id,enrollment_date,status) OUTPUT INSERTED.* VALUES (@student_id,@course_id,GETDATE(),'active')`);
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

exports.unenrollStudent = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const { id } = req.params;
    await pool.request().input('id', sql.Int, id).query(`UPDATE enrollments SET status='dropped' WHERE enrollment_id=@id`);
    res.json({ success: true, message: 'Student unenrolled' });
  } catch (err) { next(err); }
};

// ── GRADES ─────────────────────────────────────────────────────────────────
exports.getGrades = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const { course_id = '', student_id = '', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = `WHERE 1=1`;
    if (course_id) where += ` AND a.course_id = @course_id`;
    if (student_id) where += ` AND sub.student_id = @student_id`;

    const req2 = pool.request()
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit));
    if (course_id) req2.input('course_id', sql.Int, course_id);
    if (student_id) req2.input('student_id', sql.Int, student_id);

    const result = await req2.query(`
      SELECT g.grade_id, g.points_earned, g.feedback, g.graded_at,
             a.max_points, a.weight_percentage,
             CASE
               WHEN a.max_points = 0 THEN 'F'
               WHEN (g.points_earned * 100.0 / a.max_points) >= 90 THEN 'A'
               WHEN (g.points_earned * 100.0 / a.max_points) >= 80 THEN 'B'
               WHEN (g.points_earned * 100.0 / a.max_points) >= 70 THEN 'C'
               WHEN (g.points_earned * 100.0 / a.max_points) >= 60 THEN 'D'
               ELSE 'F'
             END AS letter_grade,
             s.first_name + ' ' + s.last_name AS student_name, s.student_number AS student_id_num,
             a.title AS assignment_title, a.assignment_type,
             c.title AS course_name, c.course_code
      FROM grades g
      JOIN submissions sub ON g.submission_id = sub.submission_id
      JOIN students s ON sub.student_id = s.student_id
      JOIN assignments a ON sub.assignment_id = a.assignment_id
      JOIN courses c ON a.course_id = c.course_id
      ${where}
      ORDER BY g.graded_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    res.json({ success: true, data: result.recordset });
  } catch (err) { next(err); }
};

exports.submitGrade = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const { student_id, assignment_id, points_earned, feedback } = req.body;

    // Find or create submission
    const subCheck = await pool.request()
      .input('student_id', sql.Int, student_id)
      .input('assignment_id', sql.Int, assignment_id)
      .query(`SELECT submission_id FROM submissions WHERE student_id=@student_id AND assignment_id=@assignment_id`);

    let submission_id;
    if (subCheck.recordset.length) {
      submission_id = subCheck.recordset[0].submission_id;
    } else {
      const newSub = await pool.request()
        .input('student_id', sql.Int, student_id)
        .input('assignment_id', sql.Int, assignment_id)
        .query(`INSERT INTO submissions (student_id,assignment_id,submission_date,status,is_late) OUTPUT INSERTED.submission_id VALUES (@student_id,@assignment_id,GETDATE(),'graded',0)`);
      submission_id = newSub.recordset[0].submission_id;
    }

    // Insert or update grade
    const existing = await pool.request()
      .input('submission_id', sql.Int, submission_id)
      .query(`SELECT grade_id FROM grades WHERE submission_id=@submission_id`);

    let result;
    if (existing.recordset.length) {
      result = await pool.request()
        .input('id', sql.Int, existing.recordset[0].grade_id)
        .input('points_earned', sql.Decimal(8, 2), points_earned)
        .input('feedback', sql.NVarChar(sql.MAX), feedback || null)
        .query(`UPDATE grades SET points_earned=@points_earned, feedback=@feedback, graded_at=GETDATE() OUTPUT INSERTED.* WHERE grade_id=@id`);
    } else {
      result = await pool.request()
        .input('submission_id', sql.Int, submission_id)
        .input('points_earned', sql.Decimal(8, 2), points_earned)
        .input('feedback', sql.NVarChar(sql.MAX), feedback || null)
        .query(`INSERT INTO grades (submission_id,points_earned,feedback,graded_at) OUTPUT INSERTED.* VALUES (@submission_id,@points_earned,@feedback,GETDATE())`);
    }

    // Recalculate GPA
    await pool.request().input('student_id', sql.Int, student_id).query(`
      UPDATE students SET gpa = (
        SELECT ISNULL(
          SUM((g.points_earned / a.max_points) * a.weight_percentage) / NULLIF(SUM(a.weight_percentage),0) * 4.0,
          0
        )
        FROM grades g
        JOIN submissions sub ON g.submission_id = sub.submission_id
        JOIN assignments a ON sub.assignment_id = a.assignment_id
        WHERE sub.student_id = @student_id
      ) WHERE student_id = @student_id
    `);

    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

exports.deleteGrade = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const { id } = req.params;
    await pool.request().input('id', sql.Int, id).query(`DELETE FROM grades WHERE grade_id=@id`);
    res.json({ success: true, message: 'Grade deleted' });
  } catch (err) { next(err); }
};

// ── ASSIGNMENTS ────────────────────────────────────────────────────────────
exports.getAssignments = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const { course_id = '', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    let where = `WHERE 1=1`;
    if (course_id) where += ` AND a.course_id = @course_id`;

    const req2 = pool.request()
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit));
    if (course_id) req2.input('course_id', sql.Int, course_id);

    const result = await req2.query(`
      SELECT a.assignment_id, a.title AS assignment_title, a.description, a.due_date, a.max_points, a.weight_percentage, a.assignment_type,
             c.title AS course_name, c.course_code,
             (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.assignment_id) AS submissions_count,
             (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = a.course_id AND e.status='active') AS enrolled_count
      FROM assignments a
      JOIN courses c ON a.course_id = c.course_id
      ${where}
      ORDER BY a.due_date DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    res.json({ success: true, data: result.recordset });
  } catch (err) { next(err); }
};

exports.createAssignment = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const { course_id, title, description, due_date, max_points, weight_percentage, assignment_type } = req.body;
    const result = await pool.request()
      .input('course_id', sql.Int, course_id)
      .input('title', sql.NVarChar, title)
      .input('description', sql.NVarChar(sql.MAX), description || null)
      .input('due_date', sql.DateTime, new Date(due_date))
      .input('max_points', sql.Decimal(8, 2), max_points)
      .input('weight_percentage', sql.Decimal(5, 2), weight_percentage)
      .input('assignment_type', sql.NVarChar, assignment_type)
      .query(`INSERT INTO assignments (course_id,title,description,assigned_date,due_date,max_points,weight_percentage,assignment_type,is_published) OUTPUT INSERTED.* VALUES (@course_id,@title,@description,GETDATE(),@due_date,@max_points,@weight_percentage,@assignment_type,0)`);
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

exports.deleteAssignment = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const { id } = req.params;
    await pool.request().input('id', sql.Int, id).query(`DELETE FROM assignments WHERE assignment_id=@id`);
    res.json({ success: true, message: 'Assignment deleted' });
  } catch (err) { next(err); }
};

// ── MESSAGES ───────────────────────────────────────────────────────────────
exports.getMessages = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const { user_id, user_type, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const result = await pool.request()
      .input('user_id', sql.Int, user_id)
      .input('user_type', sql.NVarChar, user_type)
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit))
      .query(`
        SELECT m.message_id, m.subject, m.content AS body, m.sent_at, m.is_read,
               m.sender_id, m.sender_type, m.receiver_id, m.receiver_type
        FROM messages m
        WHERE (m.receiver_id=@user_id AND m.receiver_type=@user_type)
           OR (m.sender_id=@user_id AND m.sender_type=@user_type)
        ORDER BY m.sent_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    res.json({ success: true, data: result.recordset });
  } catch (err) { next(err); }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const { sender_id, sender_type, receiver_id, receiver_type, subject, body } = req.body;
    const result = await pool.request()
      .input('sender_id', sql.Int, sender_id)
      .input('sender_type', sql.NVarChar, sender_type)
      .input('receiver_id', sql.Int, receiver_id)
      .input('receiver_type', sql.NVarChar, receiver_type)
      .input('subject', sql.NVarChar, subject)
      .input('content', sql.NVarChar(sql.MAX), body)
      .query(`INSERT INTO messages (sender_id,sender_type,receiver_id,receiver_type,subject,content,sent_at,is_read) OUTPUT INSERTED.* VALUES (@sender_id,@sender_type,@receiver_id,@receiver_type,@subject,@content,GETDATE(),0)`);
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

exports.markMessageRead = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const { id } = req.params;
    await pool.request().input('id', sql.Int, id).query(`UPDATE messages SET is_read=1 WHERE message_id=@id`);
    res.json({ success: true, message: 'Message marked as read' });
  } catch (err) { next(err); }
};

// ── INSTRUCTORS ────────────────────────────────────────────────────────────
exports.getInstructors = async (req, res, next) => {
  try {
    const pool = await gradebookPool;
    const result = await pool.request().query(`
      SELECT i.instructor_id, i.first_name + ' ' + i.last_name AS full_name, i.email,
             d.name AS department,
             (SELECT COUNT(*) FROM courses c WHERE c.instructor_id = i.instructor_id AND c.is_active=1) AS course_count
      FROM instructors i
      LEFT JOIN departments d ON i.department_id = d.department_id
      WHERE i.is_active=1 ORDER BY i.last_name
    `);
    res.json({ success: true, data: result.recordset });
  } catch (err) { next(err); }
};
