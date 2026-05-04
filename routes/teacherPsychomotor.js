const express = require('express');
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth.js');
const role = require('../middleware/roles.js');
const db = require('../../schoolbaseProDB/db.js');
const multer = require('multer');
const path = require('path');

const router = express.Router();

const teachersCollection = db.collection('teachers');
const classesCollection = db.collection('classes');
const studentsCollection = db.collection('students');
const schoolCollection = db.collection('users');
const subjectsCollection = db.collection('subjects');
const academicCollection = db.collection('academicSessions');

router.get(
    '/',
    auth,
    role('subjectTeacher', 'classTeacher'),
    async (req, res) => {

        const teacherId = new ObjectId(req.user.id);

        const teacherData = await teachersCollection.findOne({
            _id: teacherId
        });

        if (!teacherData) {
            return res.redirect('/login');
        }

        const schoolData = await schoolCollection.findOne({
            _id: new ObjectId(teacherData.schoolID)
        });

        // ✅ Fetch subject if assigned
        let subjectData = null;
        if (teacherData.subjectAssigned) {
            subjectData = await subjectsCollection.findOne({
                _id: new ObjectId(teacherData.subjectAssigned)
            });
        } 
        
        // ✅ Fetch class if assigned
        let classData = null;
        if (teacherData.classAssigned) {
            classData = await classesCollection.findOne({
                _id: new ObjectId(teacherData.classAssigned)
            });
        }

        const classList = await classesCollection.find({
            schoolID: new ObjectId(schoolData._id)
        }).toArray();

        // ✅ Fetch students in teacher's class
        let students = [];
        if (classData) {
        students = await studentsCollection.find({
            schoolID: new ObjectId(schoolData._id),
            studentClass: classData._id,
            isActive: true
        }).sort({studentFullName: 1})
        .toArray();
        }

        const sessions = await academicCollection.find({
            schoolID: new ObjectId(schoolData._id),
        }).toArray();

        const subjectList = await subjectsCollection.find({
            schoolID: new ObjectId(schoolData._id)
        }).toArray();

        res.render('teacher/psychomotor', {
            title: 'Psychomotor Data',
            teacher: teacherData,
            school: schoolData,
            subject: subjectData,   // 👈 pass subject
            classList: classList,
            subjects: subjectList,
            classAssigned: classData, // 👈 pass class
            students,
            sessions,
            role: req.user.role
        });
    }
);

//Route To Auto-Display the student psychomotor score
router.get(
  '/load',
  auth,
  role('classTeacher'),
  async (req, res) => {
    try {
      const { studentId, academicSessionId, term } = req.query;

      if (!studentId || !academicSessionId || !term) {
        return res.json({ exists: false });
      }

      const record = await db.collection('psychomotor').findOne({
        studentId: new ObjectId(studentId),
        academicSessionId: new ObjectId(academicSessionId),
        term
      });

      if (!record) {
        return res.json({ exists: false });
      }

      res.json({
        exists: true,
        psychomotor: record.psychomotor,
        behaviour: record.behaviour
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);


router.post(
  '/save',
  auth,
  role('classTeacher'),
  async (req, res) => {
    try {
      const teacherId = new ObjectId(req.user.id);

      const {
        studentId,
        academicSessionId,
        term,

        handwriting,
        fluency,
        sports,
        handlingOfTools,
        drawing,
        crafts,

        punctuality,
        attendanceAtClass,
        reliability,
        honesty,
        relationshipWithStaff,
        relationshipWithOtherStudents,
        spiritOfCooperation,
        senseOfResponsibility,
        attentiveness,
        organizationalAbility,
        perseverance,
        selfControl
      } = req.body;

      if (!studentId || !academicSessionId || !term) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // ✅ Teacher & school
      const teacher = await teachersCollection.findOne({
        _id: new ObjectId(req.user.id)
      });

      const schoolId = new ObjectId(teacher.schoolID);
      const classId = new ObjectId(teacher.classAssigned);

      // ✅ Confirm student belongs to teacher class
      const student = await studentsCollection.findOne({
        _id: new ObjectId(studentId),
        schoolID: schoolId,
        studentClass: classId
      });

      if (!student) {
        return res.status(404).json({
          message: 'Student not found in class'
        });
      }

      // ✅ SAVE / UPDATE (SINGLE OPERATION)
      await db.collection('psychomotor').updateOne(
        {
          studentId: new ObjectId(studentId),
          academicSessionId: new ObjectId(academicSessionId),
          term
        },
        {
          $set: {
            schoolID: schoolId,
            classId,
            psychomotor: {
              handwriting,
              fluency,
              sports,
              handlingOfTools,
              drawing,
              crafts
            },
            behaviour: {
              punctuality,
              attendanceAtClass,
              reliability,
              honesty,
              relationshipWithStaff,
              relationshipWithOtherStudents,
              spiritOfCooperation,
              senseOfResponsibility,
              attentiveness,
              organizationalAbility,
              perseverance,
              selfControl
            },
            teacherId,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );

      res.json({ message: 'Psychomotor assessment saved successfully' });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;