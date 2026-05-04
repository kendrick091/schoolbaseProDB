const express = require('express');
const { ObjectId } = require('mongodb');
const db = require('../../schoolbaseProDB/db.js')
const auth = require('../middleware/auth.js')
const role = require('../middleware/roles.js')

const router = express.Router();

const userBoard = db.collection('users')
const classes = db.collection('classes')
const students = db.collection('students');
const academicSession = db.collection('academicSessions')

router.get('/', auth, async (req, res) => {

  const schoolId = new ObjectId(req.user.id)

  const showUser = await userBoard.findOne({
    _id: schoolId
  });

  const listClass = await classes.find({ 
    schoolID: schoolId 
  }).toArray();

  const session = await academicSession.findOne({ 
    schoolID: schoolId,
    isActive: true 
  });

  const listStudent = await students.aggregate([
    { $match: { schoolID: schoolId,
      isActive: true
     } },

    {
      $lookup: {
        from: 'classes',
        localField: 'studentClass',
        foreignField: '_id',
        as: 'classInfo'
      }
    },
    { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: 'academicSessions',
        localField: 'academicSessionId',
        foreignField: '_id',
        as: 'sessionInfo'
      }
    },
    { $unwind: { path: '$sessionInfo', preserveNullAndEmptyArrays: true } },

    {
      $project: {
        studentFullName: 1,
        admissionNumber: 1,
        payment: 1,
        studentClass: 1,
        className: '$classInfo.className',
        sessionName: '$sessionInfo.academicSession'
      }
    },
    // 🔹 Sort alphabetically by studentFullName
  { $sort: { studentFullName: 1 } }
  ]).toArray();

  const student = await students.findOne(
    {schoolID: schoolId},
    {studentId: new ObjectId(req.params.id)});

  res.render('admin/student', {
    showUser,
    action: req.user.role,
    listClass,
    students: listStudent,
    session,
    student,
    title: 'Admin Student'
  });
});


router.get('/delete/:id', auth, async (req, res) => {
  try {
    const schoolId = new ObjectId(req.user.id);
    const studentId = new ObjectId(req.params.id);

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

    res.redirect('/admin/student');
  } catch (err) {
    console.error(err);
    res.status(500).send('Unable to deactivate student');
  }
});




module.exports = router;