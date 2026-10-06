# School Database Design

## 1. Tables

### Students

The `students` table stores information about each student. It contains the student's unique ID, name, and email address. The email address is required and must be unique so that two students cannot use the same email.

### Courses

The `courses` table stores information about the courses offered by the school. Each course has a unique ID and a required course name.

### Enrolments

The `enrolments` table records which students are enrolled in which courses. It contains a unique ID, a student ID, a course ID, and an optional grade.

The `student_id` and `course_id` columns are foreign keys that connect each enrolment to a student and a course.

The table also has a unique constraint on `(student_id, course_id)` to prevent the same student from enrolling in the same course more than once.

## 2. Relationships

There is a **one-to-many relationship** between `students` and `enrolments`. One student can have many enrolments, while each enrolment belongs to one student.

There is also a **one-to-many relationship** between `courses` and `enrolments`. One course can have many enrolments, while each enrolment belongs to one course.

Together, `students` and `courses` have a **many-to-many relationship**. A student can take many courses, and a course can have many students.

The `enrolments` table is needed as a **join table** to represent this many-to-many relationship. It connects students to courses and also allows additional information, such as the student's grade, to be stored for each enrolment.

## 3. Index

One useful index would be an index on `enrolments(student_id)`.

```sql
CREATE INDEX idx_enrolments_student_id
ON enrolments(student_id);
```

This index would make it faster to find all enrolments belonging to a particular student, especially as the number of students and enrolments grows.

## 4. SQL vs NoSQL

I chose SQL for this school database because the data has clear relationships between students, courses, and enrolments. A relational database makes it easy to enforce primary keys, foreign keys, unique values, and other constraints. SQL also makes it straightforward to retrieve related data using `JOIN`, `GROUP BY`, and `LEFT JOIN`. A NoSQL database could be useful for large amounts of flexible or unstructured data, but SQL is a better fit for this structured school database because data consistency and relationships are important.

