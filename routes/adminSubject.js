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
const subjects = db.collection('subjects');

router.get('/', auth, async(req, res)=>{
    const schoolId = new ObjectId(req.user.id);

    const subject = await subjects.find({schoolID: schoolId})
    .sort({subjectName: 1})
    .toArray()

    res.render('admin/subject', {
        title: 'Subjects Managment',
        subject,
    })
})

router.post('/delete/:id', auth, async (req, res) => {
  const schoolId = new ObjectId(req.user.id);
  const subjectId = new ObjectId(req.params.id);

  await subjects.deleteOne({
    _id: subjectId,
    schoolID: schoolId
  });

  res.redirect('/subjects');
});

module.exports = router;