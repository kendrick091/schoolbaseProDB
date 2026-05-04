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
            studentClass: classData._id
        }).sort({studentFullName: 1})
        .toArray();
        }

        const sessions = await academicCollection.find({
            schoolID: new ObjectId(schoolData._id),
        }).toArray();

        const subjectList = await subjectsCollection.find({
            schoolID: new ObjectId(schoolData._id)
        }).toArray();

        res.render('teacher/remark', {
            title: 'Remark Management',
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

router.post('/update', auth, async (req, res) => {
  const teacherId = new ObjectId(req.user.id);
  const { remarks } = req.body;

  await db.collection('teachers').updateOne(
    { _id: teacherId },
    {
      $set: {
        gradeRemarks: {
          A: remarks?.A || '',
          B: remarks?.B || '',
          C: remarks?.C || '',
          D: remarks?.D || '',
          F: remarks?.F || ''
        }
      }
    }
  );

  res.redirect('/teacherDashBoard');
});


module.exports = router;