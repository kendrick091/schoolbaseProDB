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

router.get("/whatsapp/:studentId/", auth, async (req, res) => {
    try {

        const studentId = new ObjectId(req.params.studentId);

        // Find student
        const student = await students.findOne({
            _id: studentId
        });

        if (!student) {
            return res.status(404).send("Student not found");
        }

        // Find school
        const school = await userBoard.findOne({
            _id: student.schoolID
        });

        if (!school) {
            return res.status(404).send("School not found");
        }

        if (!student.parentNo) {
            return res.send("Parent phone number not available.");
        }

        // Remove leading zero and add Nigeria country code
        let phone = student.parentNo.replace(/\D/g, "");

        if (phone.startsWith("0")) {
            phone = "234" + phone.substring(1);
        }

        const message = `Dear Parent,

Here are your child's login details.

Student Full Name: ${student.studentFullName}

Admission Number: ${student.admissionNumber}

Token: ${school.token}

Use these details to log in to the SchoolBase Parent Portal.

Thank you.

${school.schoolname}`;

        const whatsappURL =
            `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

        res.redirect(whatsappURL);

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});


module.exports = router;