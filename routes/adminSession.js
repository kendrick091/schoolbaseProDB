const express = require('express');
const {ObjectId} = require('mongodb')
const db = require('../../schoolbaseProDB/db.js')
const auth = require('../middleware/auth.js')

const router = express.Router();
const userBoard = db.collection('users')
const academicSession = db.collection('academicSessions')
const students = db.collection('students')
const classes = db.collection('classes')


router.get('/', auth, async (req, res) => {
  const schoolId = new ObjectId(req.user.id);

  const showUser = await userBoard.findOne({ _id: schoolId });

  const student = await students.findOne({ schoolID: schoolId})
  const classesList = await classes.find({schoolID: schoolId}).toArray()
  const sessions = await academicSession
    .find({ schoolID: schoolId })
    .sort({ createdAt: -1 })
    .toArray();

  res.render('admin/session', {
    title: 'Academic Sessions',
    sessions,
    showUser,
    student,
    classesList,
    studentCount: student ? student.totalStudents : 0,
  });
});

router.post('/activate/:id', auth, async (req, res)=>{
    const schoolId = new ObjectId(req.user.id);
    const sessionID = new ObjectId(req.params.id)

    // Deactivate all
    await academicSession.updateMany(
    { schoolID: schoolId },
    { $set: { isActive: false } }
    );

    // Activate selected
    await academicSession.updateOne(
    { _id: sessionID, schoolID: schoolId },
    { $set: { isActive: true } }
    );

    res.redirect('/sessions')

})

module.exports = router;