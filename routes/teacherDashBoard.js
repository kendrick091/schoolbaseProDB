const express = require('express');
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth');
const role = require('../middleware/roles');
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

        const subjectList = await subjectsCollection.find({
            schoolID: new ObjectId(schoolData._id)
        }).toArray();

        res.render('teacher/dashboard', {
            title: 'Teacher Dashboard',
            teacher: teacherData,
            school: schoolData,
            subject: subjectData,   // 👈 pass subject
            classList: classList,
            subjects: subjectList,
            classAssigned: classData, // 👈 pass class
            role: req.user.role
        });
    }
);

// Fetch students by class and term
router.get(
  '/students-by-class/:classId/:term/:subjectId',
  auth,
  role('subjectTeacher', 'classTeacher'),
  async (req, res) => {
    const { classId, term } = req.params;
    const teacherId = new ObjectId(req.user.id);

    const teacher = await teachersCollection.findOne({
      _id: teacherId
    });

    // 🔐 ROLE-BASED SUBJECT CONTROL
    let subjectId;
    if (teacher.teacherRole === 'subjectTeacher') {
      subjectId = teacher.subjectAssigned;
    } else {
      subjectId = req.params.subjectId;
    }

    const students = await studentsCollection.find({
      studentClass: new ObjectId(classId),
      isActive: true,
      schoolID: new ObjectId(teacher.schoolID)
    }).toArray();

    const school = await schoolCollection.findOne({
      _id: new ObjectId(teacher.schoolID)
    });

    // Active academic session
    const activeSessions = await academicCollection.find({
      schoolID: new ObjectId(school._id),
      isActive: true
    }).toArray();

    if (activeSessions.length !== 1) {
      return res.status(400).json({
        message: 'Invalid academic session state. Please contact admin.'
      });
    }

    const academicSession = activeSessions[0];

    const results = await db.collection('results').find({
      academicSessionId: new ObjectId(academicSession._id),
      classId: new ObjectId(classId),
      subjectId: new ObjectId(subjectId),
      term
    }).toArray();

    const studentsWithScores = students.map(student => {
      const result = results.find(
        r => r.studentId.toString() === student._id.toString()
      );

      return {
        ...student,
        ca1: result?.ca1 || '',
        ca2: result?.ca2 || '',
        ca3: result?.ca3 || '',
        ca4: result?.ca4 || '',
        exam: result?.exam || ''
      };
    });

    res.json(studentsWithScores);
  }
);


// Save student results
router.post(
  '/save-result',
  auth,
  role('subjectTeacher', 'classTeacher'),
  async (req, res) => {
    try {
      const {
        studentId,
        classId,
        term,
        ca1,
        ca2,
        ca3,
        ca4,
        exam
      } = req.body;

      const teacherId = new ObjectId(req.user.id);

      // Get teacher
      const teacher = await teachersCollection.findOne({
        _id: new ObjectId(teacherId)
      });

      // 🔐 ROLE-BASED SUBJECT CONTROL
      let subjectId;
      if (teacher.teacherRole === 'subjectTeacher') {
        subjectId = teacher.subjectAssigned;
      } else {
        subjectId = req.body.subjectId;
      }

      // Get school
      const school = await schoolCollection.findOne({
        _id: new ObjectId(teacher.schoolID)
      });

      // Get active academic session
      const activeSessions = await academicCollection.find({
  schoolID: new ObjectId(school._id),
  isActive: true
}).toArray();

if (activeSessions.length !== 1) {
  return res.status(400).json({
    message: 'Invalid academic session state. Please contact admin.'
  });
}

const academicSession = activeSessions[0];

      const total =
        Number(ca1 || 0) +
        Number(ca2 || 0) +
        Number(ca3 || 0) +
        Number(ca4 || 0) +
        Number(exam || 0);

      /**
       * 🔑 UNIQUE MATCH CONDITION
       * This defines whether the document exists
       */
      const matchQuery = {
        studentId: new ObjectId(studentId),
        classId: new ObjectId(classId),
        subjectId: new ObjectId(subjectId),
        term,
        academicSessionId: new ObjectId(academicSession._id)
      };

      /**
       * 🔄 UPDATE or INSERT
       */
      await db.collection('results').updateOne(
        matchQuery,
        {
          $set: {
            ca1: Number(ca1 || 0),
            ca2: Number(ca2 || 0),
            ca3: Number(ca3 || 0),
            ca4: Number(ca4 || 0),
            exam: Number(exam || 0),
            total,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );

      res.json({ message: 'Result saved successfully' });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);


module.exports = router;