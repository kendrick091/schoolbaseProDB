const express = require('express');
const { ObjectId } = require('mongodb');
const db = require('../../schoolbaseProDB/db.js')
const auth = require('../middleware/auth.js')


const router = express.Router();

const userBoard = db.collection('users')
const classes = db.collection('classes')
const students = db.collection('students');
const academicSession = db.collection('academicSessions')

router.get('/', auth, async (req, res)=>{
    const schoolId = new ObjectId(req.user.id)

    const showUser = await userBoard.findOne({ _id: schoolId });

    const studentCount = await students.countDocuments({schoolID: schoolId,
      isActive: true
    })
    
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


    res.render('admin/result', {
        showUser,
        listClass,
        studentCount,
        title: "Admin result Management",
        action: 'listC'
    })
})

router.get('/more/:classId', auth, async(req, res)=>{
    const schoolId = new ObjectId(req.user.id);
    const showUser = await userBoard.findOne({ _id: schoolId });

      const classId = new ObjectId(req.params.classId);
    
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
    
      const sessions = await academicSession
  .find({ schoolID: schoolId })
  .toArray();

    
      res.render('admin/result', {
        title: 'Class Info',
        classInfo,
        students: studentsInClass,
        action: 'listStudent',
        sessions,
        showUser
    });
});

//update student payment
router.post('/update-payment', auth, async (req, res) => {
  const schoolId = new ObjectId(req.user.id);
  const { studentIds, paymentStatus } = req.body;

  if (!studentIds || studentIds.length === 0) {
    return res.json({ success: false, message: 'No students selected' });
  }

  const objectIds = studentIds.map(id => new ObjectId(id));

  await students.updateMany(
    {
      _id: { $in: objectIds },
      schoolID: schoolId
    },
    {
      $set: {
        payment: paymentStatus,
        updatedAt: new Date()
      }
    }
  );

  res.json({ success: true });
});


module.exports = router;