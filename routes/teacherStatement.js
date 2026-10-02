const express = require('express');
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth.js');
const role = require('../middleware/roles.js');
const db = require('../db.js');
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

            res.render('teacher/statement', {

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
// GET EXISTING STUDENT STATEMENT
// ======================================================

router.get(
    '/get',
    auth,
    async (req, res) => {

        try {

            // ==============================================
            // VALIDATE LOGGED-IN TEACHER
            // ==============================================

            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    success: false,
                    message: 'Teacher authentication required'
                });
            }

            if (!ObjectId.isValid(req.user.id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid teacher account'
                });
            }

            const teacherId = new ObjectId(req.user.id);


            // ==============================================
            // GET REQUEST DATA
            // ==============================================

            const {
                studentId,
                academicSessionId,
                term
            } = req.query;


            // ==============================================
            // VALIDATE STUDENT
            // ==============================================

            if (
                !studentId ||
                !ObjectId.isValid(studentId)
            ) {

                return res.status(400).json({
                    success: false,
                    message: 'Invalid student'
                });

            }


            // ==============================================
            // VALIDATE SESSION
            // ==============================================

            if (
                !academicSessionId ||
                !ObjectId.isValid(academicSessionId)
            ) {

                return res.status(400).json({
                    success: false,
                    message: 'Invalid academic session'
                });

            }


            // ==============================================
            // VALIDATE TERM
            // ==============================================

            if (
                ![
                    'term1',
                    'term2',
                    'term3'
                ].includes(term)
            ) {

                return res.status(400).json({
                    success: false,
                    message: 'Invalid term'
                });

            }


            // ==============================================
            // FIND TEACHER
            // ==============================================

            const teacherData =
                await teachersCollection.findOne({

                    _id: teacherId

                });


            if (!teacherData) {

                return res.status(404).json({
                    success: false,
                    message: 'Teacher not found'
                });

            }


            // ==============================================
            // VALIDATE SCHOOL
            // ==============================================

            if (
                !teacherData.schoolID ||
                !ObjectId.isValid(
                    teacherData.schoolID
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message: 'Teacher school information is invalid'
                });

            }


            const schoolId =
                new ObjectId(
                    teacherData.schoolID
                );


            // ==============================================
            // CHECK STUDENT BELONGS TO THIS SCHOOL
            // ==============================================

            const studentData =
                await studentsCollection.findOne({

                    _id: new ObjectId(studentId),

                    schoolID: schoolId

                });


            if (!studentData) {

                return res.status(404).json({
                    success: false,
                    message: 'Student not found'
                });

            }


            // ==============================================
            // MAKE SURE STUDENT IS IN TEACHER'S CLASS
            // ==============================================

            if (teacherData.classAssigned) {

                if (
                    !studentData.studentClass ||
                    String(studentData.studentClass) !==
                    String(teacherData.classAssigned)
                ) {

                    return res.status(403).json({
                        success: false,
                        message: 'This student is not in your assigned class'
                    });

                }

            }


            // ==============================================
            // FIND EXISTING REMARK
            // ==============================================

            const teacherRemarkCollection =
                db.collection('teacherRemark');


            const existingRemark =
                await teacherRemarkCollection.findOne({

                    schoolID: schoolId,

                    studentId:
                        new ObjectId(studentId),

                    academicSessionId:
                        new ObjectId(academicSessionId),

                    term: term

                });


            // ==============================================
            // NO REMARK FOUND
            // ==============================================

            if (!existingRemark) {

                return res.json({

                    success: true,

                    exists: false,

                    manualRemark: ''

                });

            }


            // ==============================================
            // REMARK FOUND
            // ==============================================

            return res.json({

                success: true,

                exists: true,

                manualRemark:
                    existingRemark.manualRemark || '',

                remarkId:
                    existingRemark._id

            });


        } catch (error) {

            console.error(
                'GET TEACHER STATEMENT ERROR:',
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    'Unable to load student statement'

            });

        }

    }
);


// ======================================================
// TYPE 2
// SAVE MANUAL STUDENT REMARK TO remarks COLLECTION
// ======================================================

router.post(
    '/save',
    auth,
    async (req, res) => {

        try {

            // ==================================================
            // LOGGED-IN TEACHER
            // ==================================================

            if (!req.user || !req.user.id) {

                return res.status(401).send(
                    'Teacher authentication required'
                );

            }


            if (!ObjectId.isValid(req.user.id)) {

                return res.status(400).send(
                    'Invalid teacher account'
                );

            }


            const teacherId =
                new ObjectId(req.user.id);


            // ==================================================
            // GET FORM DATA
            // ==================================================

            const {
                studentId,
                term,
                academicSessionId,
                manualRemark
            } = req.body;


            console.log(
                'TEACHER REMARK FORM DATA:',
                {
                    studentId,
                    term,
                    academicSessionId,
                    manualRemark
                }
            );


            // ==================================================
            // VALIDATE STUDENT
            // ==================================================

            if (!studentId) {

                return res.status(400).send(
                    'Please select a student'
                );

            }


            if (!ObjectId.isValid(studentId)) {

                return res.status(400).send(
                    'Invalid student ID'
                );

            }


            // ==================================================
            // VALIDATE TERM
            // ==================================================

            if (
                ![
                    'term1',
                    'term2',
                    'term3'
                ].includes(term)
            ) {

                return res.status(400).send(
                    'Please select a valid term'
                );

            }


            // ==================================================
            // VALIDATE REMARK
            // ==================================================

            if (
                !manualRemark ||
                !manualRemark.trim()
            ) {

                return res.status(400).send(
                    'Please write a manual remark'
                );

            }


            // ==================================================
            // FIND TEACHER
            // ==================================================

            const teacherData =
                await teachersCollection.findOne({

                    _id:
                        teacherId

                });


            if (!teacherData) {

                return res.status(404).send(
                    'Teacher not found'
                );

            }


            // ==================================================
            // VALIDATE TEACHER SCHOOL
            // ==================================================

            if (
                !teacherData.schoolID ||
                !ObjectId.isValid(
                    teacherData.schoolID
                )
            ) {

                return res.status(400).send(
                    'Teacher school information is invalid'
                );

            }


            const schoolId =
                new ObjectId(
                    teacherData.schoolID
                );


            // ==================================================
            // FIND SCHOOL
            // ==================================================

            const schoolData =
                await schoolCollection.findOne({

                    _id:
                        schoolId

                });


            if (!schoolData) {

                return res.status(404).send(
                    'School not found'
                );

            }


            // ==================================================
            // MAKE SURE TYPE 2 IS ENABLED
            // ==================================================

            if (
                Number(
                    schoolData.teacherRemarkType
                ) !== 2
            ) {

                return res.status(403).send(

                    'Manual student remarks are not enabled for this school'

                );

            }


            // ==================================================
            // FIND STUDENT
            // ==================================================

            const studentObjectId =
                new ObjectId(
                    studentId
                );


            const studentData =
                await studentsCollection.findOne({

                    _id:
                        studentObjectId,

                    schoolID:
                        schoolId

                });


            if (!studentData) {

                return res.status(404).send(
                    'Student not found in this school'
                );

            }


            // ==================================================
            // MAKE SURE STUDENT BELONGS TO TEACHER'S CLASS
            // ==================================================

            if (
                teacherData.classAssigned
            ) {

                if (
                    !studentData.studentClass
                ) {

                    return res.status(403).send(
                        'This student has no assigned class'
                    );

                }


                if (
                    String(
                        studentData.studentClass
                    ) !==
                    String(
                        teacherData.classAssigned
                    )
                ) {

                    return res.status(403).send(
                        'This student is not in your assigned class'
                    );

                }

            }


            // ==================================================
            // FIND ACADEMIC SESSION
            // ==================================================

            let sessionData = null;


            if (
                academicSessionId &&
                ObjectId.isValid(
                    academicSessionId
                )
            ) {

                sessionData =
                    await academicCollection.findOne({

                        _id:
                            new ObjectId(
                                academicSessionId
                            ),

                        schoolID:
                            schoolId

                    });

            }


            // ==================================================
            // IF SESSION WAS NOT FOUND
            // ==================================================

            if (!sessionData) {

                return res.status(404).send(
                    'Academic session not found'
                );

            }


            // ==================================================
            // TEACHER REMARK COLLECTION
            //
            // IMPORTANT:
            // Your requested collection name is:
            //
            // teacherRemark
            //
            // NOT:
            // remarks
            // ==================================================

            const teacherRemarkCollection =
                db.collection(
                    'teacherRemark'
                );


            // ==================================================
            // CHECK EXISTING REMARK
            //
            // One manual remark per:
            //
            // school
            // student
            // academic session
            // term
            // ==================================================

            const existingRemark =
                await teacherRemarkCollection.findOne({

                    schoolID:
                        schoolId,

                    studentId:
                        studentObjectId,

                    academicSessionId:
                        sessionData._id,

                    term:
                        term

                });


            // ==================================================
            // UPDATE EXISTING REMARK
            // ==================================================

            if (existingRemark) {

                await teacherRemarkCollection.updateOne(

                    {
                        _id:
                            existingRemark._id
                    },

                    {
                        $set: {

                            manualRemark:
                                manualRemark.trim(),

                            teacherId:
                                teacherId,

                            updatedAt:
                                new Date()

                        }

                    }

                );


                console.log(
                    'TEACHER REMARK UPDATED:',
                    existingRemark._id.toString()
                );

            }


            // ==================================================
            // CREATE NEW REMARK
            // ==================================================

            else {

                const newManualRemark = {

                    schoolID:
                        schoolId,

                    studentId:
                        studentObjectId,

                    teacherId:
                        teacherId,

                    academicSessionId:
                        sessionData._id,

                    academicSession:
                        sessionData.academicSession ||
                        '',

                    term:
                        term,

                    manualRemark:
                        manualRemark.trim(),

                    createdAt:
                        new Date(),

                    updatedAt:
                        new Date()

                };


                const insertResult =
                    await teacherRemarkCollection.insertOne(
                        newManualRemark
                    );


                console.log(
                    'TEACHER REMARK CREATED:',
                    insertResult.insertedId.toString()
                );

            }


            // ==================================================
            // SUCCESS
            // ==================================================

            return res.redirect(
                '/teacherStatement'
            );


        } catch (error) {

            console.error(
                '===================================='
            );

            console.error(
                'TYPE 2 TEACHER REMARK ERROR'
            );

            console.error(
                'Message:',
                error.message
            );

            console.error(
                'Stack:',
                error.stack
            );

            console.error(
                '===================================='
            );


            return res.status(500).send(
                'Unable to save student remark'
            );

        }

    }
);

module.exports = router