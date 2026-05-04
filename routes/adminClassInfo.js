const express = require('express');
const { ObjectId } = require('mongodb');
const db = require('../../schoolbaseProDB/db.js')
const auth = require('../middleware/auth.js')
const role = require('../middleware/roles.js')

const router = express.Router();

const userBoard = db.collection('users')
const classes = db.collection('classes');
const students = db.collection('students');
const teacher = db.collection('teachers');

router.get('/:id', auth, async (req, res) => {
  const schoolId = new ObjectId(req.user.id);
  const classId = new ObjectId(req.params.id);

  const classInfo = await classes.findOne({
    _id: classId,
    schoolID: schoolId
  });

  const studentsInClass = await students.find({
    schoolID: schoolId,
    studentClass: classId,
    isActive: true
  })
  .sort({ studentFullName: 1 })
  .toArray();



  const teachersInClass = await teacher.find({
    schoolID: schoolId,
    classAssigned: classId
  }).toArray();

  const classTeacher = teachersInClass.find(
    t => t.teacherRole === 'classTeacher'
  );

  res.render('admin/class-info', {
    title: 'Class Info',
    classInfo,
    students: studentsInClass,
    teachers: teachersInClass,
    classTeacher
  });
});

module.exports = router;