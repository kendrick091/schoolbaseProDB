const express = require('express');
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth.js');
const role = require('../middleware/roles.js');
const db = require('../../schoolbaseProDB/db.js');

const router = express.Router();

const teachersCollection = db.collection('teachers');
const classesCollection = db.collection('classes');
const studentsCollection = db.collection('students');
const schoolCollection = db.collection('users');
const academicCollection = db.collection('academicSessions');

router.get(
  '/:classId',
  auth,
  role('classTeacher'),
  async (req, res) => {
    try {
      const teacherId = new ObjectId(req.user.id);
      const classId = new ObjectId(req.params.classId);

      // 🔐 Get teacher
      const teacherData = await teachersCollection.findOne({
        _id: teacherId
      });

      if (!teacherData) {
        return res.redirect('/login');
      }

      // 🔐 Ensure teacher owns this class
      if (teacherData.classAssigned?.toString() !== classId.toString()) {
        return res.status(403).send('Unauthorized access to class');
      }

      // Get class
      const classData = await classesCollection.findOne({
        _id: classId,
        schoolID: new ObjectId(teacherData.schoolID)
      });

      if (!classData) {
        return res.status(404).send('Class not found');
      }

      // Get students (CONSISTENT FIELD)
      const studentsList = await studentsCollection
        .find({
          studentClass: classId,
          schoolID: new ObjectId(teacherData.schoolID),
          isActive: true
        })
        .sort({ studentFullName: 1 }) // ✅ alphabetical
        .toArray();

      // Get school info for layout
      const school = await schoolCollection.findOne({
        _id: new ObjectId(teacherData.schoolID)
      });

      res.render('teacher/class', {
        title: 'My Class',
        teacher: teacherData,
        classInfo: classData,
        students: studentsList,
        school,
        role: req.user.role
      });

    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  }
);

router.post(
  '/attendance/save',
  auth,
  role('classTeacher'),
  async (req, res) => {
    try {
      const { studentId, classId, term, present, absent, total } = req.body;

      // Get teacher
      const teacher = await teachersCollection.findOne({ _id: new ObjectId(req.user.id) });
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      // Get active academic session
      const activeSessions = await academicCollection.find({
        schoolID: new ObjectId(teacher.schoolID),
        isActive: true
      }).toArray();

      if (activeSessions.length !== 1) {
        return res.status(400).json({ message: 'Invalid academic session state. Please contact admin.' });
      }

      const academicSessionId = activeSessions[0]._id;

      const record = {
        studentId: new ObjectId(studentId),
        classId: new ObjectId(classId),
        term,
        present,
        absent,
        total,
        schoolID: new ObjectId(teacher.schoolID),
        academicSessionId: new ObjectId(academicSessionId),
        updatedAt: new Date()
      };

      await db.collection('attendance').updateOne(
        {
          studentId: new ObjectId(studentId),
          classId: new ObjectId(classId),
          term,
          schoolID: new ObjectId(teacher.schoolID),
          academicSessionId: new ObjectId(academicSessionId)
        },
        { $set: record },
        { upsert: true }
      );

      res.json({ message: 'Attendance saved successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Display data in form
router.get(
  '/attendance/:classId/:term',
  auth,
  role('classTeacher'),
  async (req, res) => {
    try {
      const teacher = await teachersCollection.findOne({
        _id: new ObjectId(req.user.id)
      });

      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      const classId = new ObjectId(req.params.classId);
      const term = req.params.term;

      // active session
      const activeSession = await academicCollection.findOne({
        schoolID: new ObjectId(teacher.schoolID),
        isActive: true
      });

      if (!activeSession) {
        return res.json([]);
      }

      const attendance = await db.collection('attendance')
        .find({
          classId,
          term,
          schoolID: new ObjectId(teacher.schoolID),
          academicSessionId: new ObjectId(activeSession._id)
        })
        .toArray();

      res.json(attendance);

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);



module.exports = router;