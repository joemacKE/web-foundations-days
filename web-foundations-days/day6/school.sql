-- 1. Create students table

CREATE TABLE students (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);



-- 2. Create courses table

CREATE TABLE courses (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);


-- 3. Create enrolments table


CREATE TABLE enrolments (
    id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,

    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),

    UNIQUE (student_id, course_id)
);


-- 4. Insert students

INSERT INTO students (id, name, email)
VALUES
    (1, 'Alice Johnson', 'alice@example.com'),
    (2, 'Brian Smith', 'brian@example.com'),
    (3, 'Carol Williams', 'carol@example.com'),
    (4, 'David Brown', 'david@example.com');



-- 5. Insert courses

INSERT INTO courses (id, name)
VALUES
    (1, 'HTML and CSS'),
    (2, 'JavaScript'),
    (3, 'Database Systems');



-- 6. Insert enrolments

INSERT INTO enrolments (id, student_id, course_id, grade)
VALUES
    (1, 1, 1, 'A'),
    (2, 1, 2, 'B'),
    (3, 2, 1, 'B'),
    (4, 2, 3, 'A'),
    (5, 3, 2, 'A');



-- QUERY 1
-- All courses for one student by name

SELECT
    students.name AS student,
    courses.name AS course,
    enrolments.grade
FROM students
JOIN enrolments
    ON students.id = enrolments.student_id
JOIN courses
    ON courses.id = enrolments.course_id
WHERE students.name = 'Alice Johnson';



-- QUERY 2
-- All students on one course

SELECT
    courses.name AS course,
    students.name AS student,
    enrolments.grade
FROM courses
JOIN enrolments
    ON courses.id = enrolments.course_id
JOIN students
    ON students.id = enrolments.student_id
WHERE courses.name = 'JavaScript';



-- QUERY 3
-- Number of students per course

SELECT
    courses.name AS course,
    COUNT(enrolments.student_id) AS student_count
FROM courses
LEFT JOIN enrolments
    ON courses.id = enrolments.course_id
GROUP BY courses.id, courses.name;



-- QUERY 4
-- Students who have no enrolments

SELECT
    students.name,
    students.email
FROM students
LEFT JOIN enrolments
    ON students.id = enrolments.student_id
WHERE enrolments.student_id IS NULL;



-- QUERY 5
-- Update one enrolment's grade


UPDATE enrolments
SET grade = 'A'
WHERE student_id = 2
  AND course_id = 1;