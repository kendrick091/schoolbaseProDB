const express = require('express');
const { ObjectId } = require('mongodb');
const db = require('../../schoolbaseProDB/db.js')
const auth = require('../middleware/auth.js')
const role = require('../middleware/roles.js')

const router = express.Router();

const userBoard = db.collection('users')
const classes = db.collection('classes');
const students = db.collection('students');

router.get('/', auth, async (req, res) => {
  const schoolId = new ObjectId(req.user.id);

  const showUser = await userBoard.findOne({ _id: schoolId });

  const listClass = await classes.aggregate([
  {
    $match: { schoolID: schoolId }
  },

  // Join ONLY active students in this class
  {
    $lookup: {
      from: 'students',
      let: { classId: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$studentClass', '$$classId'] },
                { $eq: ['$schoolID', schoolId] },
                { $eq: ['$isActive', true] }
              ]
            }
          }
        }
      ],
      as: 'students'
    }
  },

  // Count active students
  {
    $addFields: {
      studentCount: { $size: '$students' }
    }
  }
]).toArray();

  res.render('admin/classes', {
    title: 'Manage Classes',
    showUser,
    listClass,
    action: 'list'
  });
});

router.post('/delete/:id', auth, async (req, res) => {
  const schoolId = new ObjectId(req.user.id);
  const classId = new ObjectId(req.params.id);

  // Check if class has students
  const studentCount = await students.countDocuments({
    schoolID: schoolId,
    studentClass: classId
  });

  if (studentCount > 0) {
    return res.status(400).send(
      `<h2>Cannot delete class with students assigned</h2>`
    );
  }

  await classes.deleteOne({
    _id: classId,
    schoolID: schoolId
  });

  res.redirect('/classes');
});


module.exports = router;