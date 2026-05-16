const router = require('express').Router();
const c = require('../controllers/gradebook.controller');

router.get('/stats', c.getStats);
router.get('/departments', c.getDepartments);
router.get('/instructors', c.getInstructors);

router.get('/students', c.getStudents);
router.get('/students/:id', c.getStudentById);
router.post('/students', c.createStudent);
router.put('/students/:id', c.updateStudent);
router.delete('/students/:id', c.deleteStudent);

router.get('/courses', c.getCourses);
router.post('/courses', c.createCourse);
router.put('/courses/:id', c.updateCourse);
router.delete('/courses/:id', c.deleteCourse);

router.post('/enrollments', c.enrollStudent);
router.delete('/enrollments/:id', c.unenrollStudent);

router.get('/grades', c.getGrades);
router.post('/grades', c.submitGrade);
router.delete('/grades/:id', c.deleteGrade);

router.get('/assignments', c.getAssignments);
router.post('/assignments', c.createAssignment);
router.delete('/assignments/:id', c.deleteAssignment);

router.get('/messages', c.getMessages);
router.post('/messages', c.sendMessage);
router.put('/messages/:id/read', c.markMessageRead);

module.exports = router;
