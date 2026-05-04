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
const results = db.collection('results');

router.get('/', auth, async(req, res)=>{
    const teacher = new ObjectId(req.user.id);

    const teacherId = await teachersCollection.findOne({
        _id: teacher,
    })

    const school = await schoolCollection.findOne({
        _id: new ObjectId(teacherId.schoolID)
    })
    
      const classInfo = await classesCollection.findOne({
        _id: new ObjectId(teacherId.classAssigned),
        schoolID: teacherId.schoolID
      });
    
      const studentsInClass = await studentsCollection.find({
        schoolID: new ObjectId(teacherId.schoolID),
        studentClass: teacherId.classAssigned,
        isActive: true
      })
      .sort({ studentFullName: 1 })
      .toArray();
    
      const sessions = await academicCollection
  .find({ schoolID: teacherId.schoolID })
  .toArray();

  const classList = await classesCollection.find({
    schoolID: new ObjectId(teacherId.schoolID)
  }).toArray();

    
  
      res.render('teacher/result', {
        title: 'Class Info',
        classInfo,
        students: studentsInClass,
        action: 'listStudent',
        sessions,
        classList
    });
});

//Student result page
router.get('/student/:studentId/result', auth, async (req, res) => {
  try {
    const studentId = new ObjectId(req.params.studentId);
    const { academicSessionId, term, classId } = req.query;

    if (!academicSessionId || !term || !classId) {
    return res.status(400).send('Session, term and class required');
    }

    const teacher = await teachersCollection.findOne({
      _id: new ObjectId(req.user.id)
    });

    if (!teacher) {
      return res.status(403).send('Teacher not found');
    }

    const schoolId = await schoolCollection.findOne({
      _id: teacher.schoolID
    })

    const student = await studentsCollection.findOne({
      _id: studentId,
      // studentClass: teacher.classAssigned,
      isActive: true
    });

    if (!student) {
      return res.status(404).send('Student not found');
    }

    // const classId = student.studentClass;

    const teacherClass = await classesCollection.findOne({
    _id: new ObjectId(classId)
    })

    if (teacher.classAssigned.toString() !== new ObjectId(classId).toString()) {
    return res.status(403).send("You are not authorized to manage this result");
    }

    // 1️⃣ Student subject results
    const results = await db.collection('results').aggregate([
      {
        $match: {
          studentId,
        classId: new ObjectId(classId),
        academicSessionId: new ObjectId(academicSessionId),
        term
      }
      },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subjectId',
          foreignField: '_id',
          as: 'subject'
        }
      },
      { $unwind: '$subject' }
    ]).toArray();

    // 2️⃣ Class ranking
    const classResults = await db.collection('results').aggregate([
      {
        $match: {
          classId,
          academicSessionId: new ObjectId(academicSessionId),
          term
        }
      },
      // Join students to check isActive
  {
    $lookup: {
      from: 'students',
      localField: 'studentId',
      foreignField: '_id',
      as: 'student'
    }
  },
  { $unwind: '$student' },
  // ✅ Only active students
  {
    $match: {
      'student.isActive': true
    }
  },
      {
        $group: {
          _id: '$studentId',
          totalScore: { $sum: '$total' }
        }
      },
      { $sort: { totalScore: -1 } }
    ]).toArray();

    let lastScore = null;
    let rank = 0;

    const ranked = classResults.map((r, i) => {
      if (r.totalScore !== lastScore) {
        rank = i + 1;
        lastScore = r.totalScore;
      }
      return { studentId: r._id.toString(), position: rank };
    });

    const studentRank = ranked.find(
      r => r.studentId === studentId.toString()
    );

    const positionInClass = studentRank?.position || null;
    const totalStudents = ranked.length;

    const totalScore = results.reduce((s, r) => s + r.total, 0);
    const average = results.length
      ? (totalScore / results.length).toFixed(2)
      : 0;

    res.render('teacher/student-result', {
      student,
      results,
      teacherClass,
      totalScore,
      average,
      term,
      positionInClass,
      totalStudents
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Promote single student to next class
router.post('/promote-student/:id', auth, async (req, res) => {
  try {
    const studentId = req.params.id;
    const { newClassId } = req.body;

    await studentsCollection.updateOne(
      { _id: new ObjectId(studentId) },
      { $set: { studentClass: new ObjectId(newClassId) } } // ✅ FIX HERE
    );

    res.json({ message: "Student promoted successfully" });
  } catch (err) {
    console.error("PROMOTE STUDENT ERROR:", err);
    res.status(500).json({ message: "Error promoting student" });
  }
});

// Promot all students in a class to next class
router.post('/promote-all', auth, async (req, res) => {
  try {
    const { newClassId } = req.body;

    const teacher = await teachersCollection.findOne({
      _id: new ObjectId(req.user.id)
    });

    await studentsCollection.updateMany(
      {
        schoolID: new ObjectId(teacher.schoolID),
        studentClass: teacher.classAssigned,
        isActive: true
      },
      {
        $set: { studentClass: new ObjectId(newClassId) }
      }
    );

    res.json({ message: "All students promoted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error promoting students" });
  }
});

// Delete student result
router.get('/delete/:id', auth, async (req, res) => {
  try {

    const teacher = await teachersCollection.findOne({
      _id: new ObjectId(req.user.id)
    });

    if (!teacher) {
      return res.status(403).send('Teacher not found');
    }

    await results.deleteOne({
      _id: new ObjectId(req.params.id),
      // classId: teacher.classAssigned   // only allow teacher delete from his class
    });

    res.redirect('/teacherResult'); // return to student result page

  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting result');
  }
});


module.exports = router;