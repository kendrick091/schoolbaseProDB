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

router.get('/delete/:id', auth, async (req, res) => {
  try {
    const schoolId = new ObjectId(req.user.id);
    const studentId = new ObjectId(req.params.id);

    const student = await students.findOne({
      _id: new ObjectId(studentId),
      schoolID: schoolId
    });

    const selectedClass = await classes.findOne({
       _id: student.studentClass,
      schoolID: schoolId
    });

    await students.updateOne(
      {
        _id: studentId,
        schoolID: schoolId
      },
      {
        $set: {
          isActive: false,
          deactivatedAt: new Date() // optional but recommended
        }
      }
    );

    // console.log(`Student deactivated successfully for class: 
    //   ${selectedClass.className}
    //   id: ${selectedClass._id}`);

    res.redirect(`/classinfo/${student.studentClass}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Unable to deactivate student');
  }
});

module.exports = router;