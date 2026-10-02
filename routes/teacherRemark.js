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

// ======================================================
// LOAD TEACHER REMARK PAGE
// ======================================================

router.get(
    '/',
    auth,
    role('subjectTeacher', 'classTeacher'),
    async (req, res) => {

        try {

            const teacherId = new ObjectId(req.user.id);

            // Find teacher
            const teacherData = await teachersCollection.findOne({
                _id: teacherId
            });

            if (!teacherData) {
                return res.redirect('/login');
            }

            // Find school
            const schoolData = await schoolCollection.findOne({
                _id: new ObjectId(teacherData.schoolID)
            });

            if (!schoolData) {
                return res.status(404).send('School not found');
            }

            // ==================================================
            // FETCH SUBJECT
            // ==================================================

            let subjectData = null;

            if (teacherData.subjectAssigned) {

                subjectData = await subjectsCollection.findOne({
                    _id: new ObjectId(teacherData.subjectAssigned)
                });

            }

            // ==================================================
            // FETCH CLASS
            // ==================================================

            let classData = null;

            if (teacherData.classAssigned) {

                classData = await classesCollection.findOne({
                    _id: new ObjectId(teacherData.classAssigned)
                });

            }

            // ==================================================
            // FETCH CLASS LIST
            // ==================================================

            const classList = await classesCollection.find({
                schoolID: new ObjectId(schoolData._id)
            }).toArray();

            // ==================================================
            // FETCH STUDENTS IN TEACHER'S CLASS
            // ==================================================

            let students = [];

            if (classData) {

                students = await studentsCollection.find({

                    schoolID: new ObjectId(schoolData._id),

                    studentClass: classData._id

                })
                .sort({
                    studentFullName: 1
                })
                .toArray();

            }

            // ==================================================
            // FETCH ACADEMIC SESSIONS
            // ==================================================

            const sessions = await academicCollection.find({

                schoolID: new ObjectId(schoolData._id)

            }).toArray();

            // ==================================================
            // FETCH SUBJECT LIST
            // ==================================================

            const subjectList = await subjectsCollection.find({

                schoolID: new ObjectId(schoolData._id)

            }).toArray();

            // ==================================================
            // RENDER PAGE
            // ==================================================

            res.render('teacher/remark', {

                title: 'Remark Management',

                teacher: teacherData,

                school: schoolData,

                subject: subjectData,

                classList: classList,

                subjects: subjectList,

                classAssigned: classData,

                students: students,

                sessions: sessions,

                role: req.user.role

            });

        } catch (error) {

            console.error('TEACHER REMARK PAGE ERROR:', error);

            res.status(500).send('Unable to load teacher remark page');

        }

    }
);


// ======================================================
// TYPE 1
// SAVE GRADE REMARKS TO TEACHERS COLLECTION
// ======================================================

router.post('/update', auth, async (req, res) => {

    try {

        const teacherId = new ObjectId(req.user.id);

        const { remarks } = req.body;

        await teachersCollection.updateOne(

            {
                _id: teacherId
            },

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

        res.redirect('/teacherRemark');

    } catch (error) {

        console.error('TYPE 1 REMARK ERROR:', error);

        res.status(500).send('Unable to save grade remarks');

    }

});


module.exports = router;