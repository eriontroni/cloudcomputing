-- ============================================================
-- DATABASE: student_gradebook
-- ============================================================
USE student_gradebook;
GO

CREATE TABLE instructors (
    instructor_id INT IDENTITY(1,1) PRIMARY KEY,
    first_name    NVARCHAR(50)  NOT NULL,
    last_name     NVARCHAR(50)  NOT NULL,
    email         NVARCHAR(100) NOT NULL UNIQUE,
    department    NVARCHAR(100),
    is_active     BIT           NOT NULL DEFAULT 1
);

CREATE TABLE students (
    student_id      INT IDENTITY(1,1) PRIMARY KEY,
    student_id_num  NVARCHAR(20)  NOT NULL UNIQUE,
    first_name      NVARCHAR(50)  NOT NULL,
    last_name       NVARCHAR(50)  NOT NULL,
    email           NVARCHAR(100) NOT NULL UNIQUE,
    department      NVARCHAR(100),
    enrollment_year INT,
    gpa             DECIMAL(4,2),
    status          NVARCHAR(20)  NOT NULL DEFAULT 'active',  -- active, inactive, graduated, suspended
    is_active       BIT           NOT NULL DEFAULT 1,
    created_at      DATETIME      NOT NULL DEFAULT GETDATE()
);

CREATE TABLE courses (
    course_id     INT IDENTITY(1,1) PRIMARY KEY,
    course_code   NVARCHAR(20)  NOT NULL UNIQUE,
    course_name   NVARCHAR(200) NOT NULL,
    credits       INT           NOT NULL DEFAULT 3,
    semester      NVARCHAR(20),
    instructor_id INT           REFERENCES instructors(instructor_id),
    is_active     BIT           NOT NULL DEFAULT 1
);

CREATE TABLE enrollments (
    enrollment_id   INT IDENTITY(1,1) PRIMARY KEY,
    student_id      INT      REFERENCES students(student_id),
    course_id       INT      REFERENCES courses(course_id),
    enrollment_date DATETIME NOT NULL DEFAULT GETDATE(),
    status          NVARCHAR(20) NOT NULL DEFAULT 'active',  -- active, dropped, completed
    UNIQUE (student_id, course_id)
);

CREATE TABLE assignments (
    assignment_id    INT IDENTITY(1,1) PRIMARY KEY,
    course_id        INT           REFERENCES courses(course_id),
    title            NVARCHAR(200) NOT NULL,
    description      NVARCHAR(MAX),
    due_date         DATETIME,
    max_points       DECIMAL(8,2)  NOT NULL DEFAULT 100,
    weight_percentage DECIMAL(5,2) NOT NULL DEFAULT 100,
    assignment_type  NVARCHAR(20)  NOT NULL DEFAULT 'homework'  -- homework, quiz, exam, midterm, project
);

CREATE TABLE grades (
    grade_id          INT IDENTITY(1,1) PRIMARY KEY,
    student_id        INT           REFERENCES students(student_id),
    assignment_id     INT           REFERENCES assignments(assignment_id),
    points_earned     DECIMAL(8,2)  NOT NULL,
    max_points        DECIMAL(8,2)  NOT NULL,
    weight_percentage DECIMAL(5,2)  NOT NULL DEFAULT 100,
    letter_grade      CHAR(2),
    feedback          NVARCHAR(MAX),
    graded_at         DATETIME      NOT NULL DEFAULT GETDATE(),
    UNIQUE (student_id, assignment_id)
);

CREATE TABLE messages (
    message_id    INT IDENTITY(1,1) PRIMARY KEY,
    sender_id     INT          NOT NULL,
    sender_type   NVARCHAR(20) NOT NULL,   -- student, instructor
    receiver_id   INT          NOT NULL,
    receiver_type NVARCHAR(20) NOT NULL,   -- student, instructor
    subject       NVARCHAR(200),
    body          NVARCHAR(MAX),
    sent_at       DATETIME     NOT NULL DEFAULT GETDATE(),
    is_read       BIT          NOT NULL DEFAULT 0
);

-- ── Seed Data ──────────────────────────────────────────────
INSERT INTO instructors (first_name, last_name, email, department) VALUES
('Dr. Sarah',  'Connor',  'sconnor@uni.edu',   'Computer Science'),
('Prof. Alan', 'Turing',  'aturing@uni.edu',   'Mathematics'),
('Dr. Maria',  'Curie',   'mcurie@uni.edu',    'Physics');

INSERT INTO students (student_id_num, first_name, last_name, email, department, enrollment_year, status) VALUES
('STU001', 'Emma',   'Wilson',   'emma@uni.edu',   'Computer Science', 2022, 'active'),
('STU002', 'James',  'Davis',    'james@uni.edu',  'Mathematics',      2021, 'active'),
('STU003', 'Sophia', 'Martinez', 'sophia@uni.edu', 'Physics',          2023, 'active'),
('STU004', 'Liam',   'Anderson', 'liam@uni.edu',   'Computer Science', 2022, 'active');

INSERT INTO courses (course_code, course_name, credits, semester, instructor_id) VALUES
('CS101', 'Introduction to Programming',  3, 'Fall 2024',   1),
('MATH201', 'Linear Algebra',             3, 'Fall 2024',   2),
('CS301', 'Data Structures & Algorithms', 4, 'Spring 2025', 1),
('PHYS101', 'Classical Mechanics',        3, 'Fall 2024',   3);

INSERT INTO enrollments (student_id, course_id) VALUES
(1, 1), (1, 3), (2, 2), (2, 1), (3, 4), (4, 1), (4, 3);

INSERT INTO assignments (course_id, title, max_points, weight_percentage, assignment_type, due_date) VALUES
(1, 'Hello World Program',    100, 10, 'homework', DATEADD(day, -30, GETDATE())),
(1, 'Midterm Exam',          100, 30, 'midterm',  DATEADD(day, -15, GETDATE())),
(1, 'Final Project',         100, 40, 'project',  DATEADD(day,  30, GETDATE())),
(2, 'Matrix Operations HW',  50,  20, 'homework', DATEADD(day, -10, GETDATE())),
(3, 'Sorting Algorithms',    100, 25, 'homework', DATEADD(day,  15, GETDATE()));

INSERT INTO grades (student_id, assignment_id, points_earned, max_points, weight_percentage, letter_grade, feedback) VALUES
(1, 1,  92, 100, 10, 'A', 'Excellent work!'),
(1, 2,  85, 100, 30, 'B', 'Good understanding of concepts'),
(2, 1,  78, 100, 10, 'C', 'Needs more practice'),
(4, 1,  95, 100, 10, 'A', 'Perfect!'),
(4, 2,  88, 100, 30, 'B', 'Well done');

INSERT INTO messages (sender_id, sender_type, receiver_id, receiver_type, subject, body, is_read) VALUES
(1, 'instructor', 1, 'student', 'RE: Project Question', 'Great question! Please see the docs...', 0),
(1, 'student', 1, 'instructor', 'Project Question', 'Hi, I have a question about the final project...', 1);

-- Recalculate GPA for seeded grades
UPDATE students SET gpa = (
    SELECT ISNULL(SUM((g.points_earned / g.max_points) * g.weight_percentage) / NULLIF(SUM(g.weight_percentage),0) * 4.0, NULL)
    FROM grades g WHERE g.student_id = students.student_id
) WHERE student_id IN (SELECT DISTINCT student_id FROM grades);
