const express = require('express');
const { ObjectId } = require('mongodb');
const db = require('../../schoolbaseProDB/db.js')
const auth = require('../middleware/auth.js')
const role = require('../middleware/roles.js')

const router = express.Router();

const userBoard = db.collection('users')
const classes = db.collection('classes')
const teacher = db.collection('teachers');
const academicSession = db.collection('academicSessions')
const subjects = db.collection('subjects')

router.get('/', auth, async (req, res) => {
  const schoolId = new ObjectId(req.user.id);

  const showUser = await userBoard.findOne({ _id: schoolId });
  const classList = await classes.find({ schoolID: schoolId }).toArray();
  const subjectList = await subjects.find({ schoolID: schoolId }).toArray();

  const listTeacher = await teacher.aggregate([
    { $match: { schoolID: schoolId } },

    // Join class
    {
      $lookup: {
        from: 'classes',
        localField: 'classAssigned',
        foreignField: '_id',
        as: 'classInfo'
      }
    },

    // Join subject
    {
      $lookup: {
        from: 'subjects',
        localField: 'subjectAssigned',
        foreignField: '_id',
        as: 'subjectInfo'
      }
    },

    // Flatten arrays
    {
      $addFields: {
        className: { $arrayElemAt: ['$classInfo.className', 0] },
        subjectName: { $arrayElemAt: ['$subjectInfo.subjectName', 0] }
      }
    }
  ]).toArray();

  res.render('admin/teacher', {
    title: 'Man. Teachers',
    showUser,
    listTeacher,
    subjectList,
    classList
  });
});



router.get('/delete/:id', auth, async (req, res) => {
  const schoolId = new ObjectId(req.user.id)
  await teacher.deleteOne({
    _id: new ObjectId(req.params.id),
    schoolID: schoolId,
  });

  res.redirect('/teachers');
});



module.exports = router;