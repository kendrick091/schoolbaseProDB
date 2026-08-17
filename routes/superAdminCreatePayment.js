// CREATE STUDENT PAYMENT PAGE
const express = require('express');
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth.js');
const role = require('../middleware/roles.js');
const db = require('../db.js');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { render } = require('ejs');

const router = express.Router();

// ============================================
// CREATE STUDENT PAYMENT PAGE
// ============================================
const schoolsCollection = db.collection('users');
const studentsCollection = db.collection('students');
const paymentsCollection = db.collection('payments');
const academicSessionsCollection = db.collection('academicSessions');

router.get('/:id', auth, role('superAdmin'), async (req, res) => {
    try {
        const school = await schoolsCollection
        .findOne({ _id: new ObjectId(req.params.id) });

        const students = await studentsCollection
        .find({ schoolID: new ObjectId(req.params.id), isActive: true })
        .sort({ studentFullName: 1 })
        .toArray();

        const academicSessions = await academicSessionsCollection
        .find({ schoolID: new ObjectId(req.params.id) })
        .sort({ academicSession: -1 })
        .toArray();

        res.render('superAdmin/createPayment', { 
            action: 'view_student',
            title: 'view student',
            school,
            academicSessions, 
            students
            });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch schools' });
    }
});

// CREATE PAYMENT FOR STUDENT FOR ONE STUDENT
router.get('/createPayment/:studentId', auth, role('superAdmin'), async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const student = await studentsCollection
        .findOne({ _id: new ObjectId(studentId) });

        const school = await schoolsCollection
        .findOne({ _id: new ObjectId(student.schoolID) });

        const academicSessions = await academicSessionsCollection
            .find({ schoolID: new ObjectId(student.schoolID) }).toArray();

        res.render('superAdmin/createPayment', { 
            action: 'create_payment',
            title: 'create payment',
            school,
            academicSessions,
            student
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch student' });
    }
});

// CHECK IF STUDENT HAS ALREADY PAID
router.get(
    '/check-payment/:studentId/:academicSessionId/:term',
    auth,
    role('superAdmin'),
    async (req, res) => {

        try {

            const studentId =
                new ObjectId(req.params.studentId);

            const academicSessionId =
                new ObjectId(req.params.academicSessionId);

            const term =
                req.params.term;


            const payment =
                await paymentsCollection.findOne({
                    studentId: studentId,
                    academicSessionId: academicSessionId,
                    term: term,
                    paymentType: { $in: ['school_student', 'school_bulk'] }
                });


            if (payment) {

                return res.json({
                    success: true,
                    paid: true
                });

            }


            res.json({
                success: true,
                paid: false
            });


        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message: 'Failed to check payment'
            });

        }

    }
);

// CREATE PAYMENT POST ROUTE
router.post(
    '/createPayment/:studentId',
    auth,
    role('superAdmin'),
    async (req, res) => {

        try {

            const studentId = req.params.studentId;

            const {
                amount,
                academicSessionId,
                term
            } = req.body;


            // Find the student
            const student =
                await studentsCollection.findOne({
                    _id: new ObjectId(studentId)
                });


            if (!student) {

                return res.status(404).json({
                    success: false,
                    message: 'Student not found'
                });

            }


            // Find the academic session
            const academicSession =
                await academicSessionsCollection.findOne({
                    _id: new ObjectId(academicSessionId)
                });


            if (!academicSession) {

                return res.status(404).json({
                    success: false,
                    message: 'Academic session not found'
                });

            }


            // Check that a term was selected
            if (!term) {

                return res.status(400).json({
                    success: false,
                    message: 'Please select a term'
                });

            }


            // Create payment
            const newPayment = {

                reference:
                    `ADM-${Date.now()}`,

                paymentType:
                    'school_student',

                paymentMethod:
                    'manual',

                schoolId:
                    new ObjectId(student.schoolID),

                studentId:
                    new ObjectId(studentId),

                academicSessionId:
                    new ObjectId(academicSessionId),

                academicSession:
                    academicSession.academicSession,

                amount:
                    parseFloat(amount),

                term:

                    term,

                createdAt:
                    new Date()

            };


            // Save payment
            await paymentsCollection.insertOne(
                newPayment
            );

              // ==========================
                // UPDATE STUDENT PAYMENT
                // ==========================

                await studentsCollection.updateOne(

                    {
                        _id: student._id
                    },

                    {
                        $set: {
                            payment: true
                        }
                    }

                );


            res.status(201).json({

                success: true,

                message:
                    `<h2>Payment created successfully</h2>`

            });


        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    `<h2>Failed to create payment</h2>`

            });

        }

    }
);

//==================================================
// CREATE PAYMENT FOR ALL STUDENTS IN SCHOOL
//==================================================

router.post(
    '/createPaymentForAllStudents/:schoolId',
    auth,
    role('superAdmin'),
    async (req, res) => {

        try {

            const schoolId =
                new ObjectId(req.params.schoolId);

            const {
                academicSessionId,
                term
            } = req.body;


            // ==========================
            // FIND SCHOOL
            // ==========================

            const school =
                await schoolsCollection.findOne({
                    _id: schoolId
                });


            if (!school) {

                return res.status(404).json({
                    success: false,
                    message: 'School not found'
                });

            }


            // ==========================
            // FIND ACADEMIC SESSION
            // ==========================

            const academicSession =
                await academicSessionsCollection.findOne({

                    _id:
                        new ObjectId(
                            academicSessionId
                        ),

                    schoolID:
                        schoolId

                });


            if (!academicSession) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Academic session not found'
                });

            }


            // ==========================
            // GET ACTIVE STUDENTS
            // ==========================

            const students =
                await studentsCollection
                    .find({
                        schoolID: schoolId,
                        isActive: true
                    })
                    .sort({
                        studentFullName: 1
                    })
                    .toArray();


            if (students.length === 0) {

                return res.status(400).json({
                    success: false,
                    message:
                        'No active students found'
                });

            }


            // ==========================
            // PAYMENT AMOUNT
            // ==========================

            const FEE_PER_STUDENT = 350;


            let createdPayments = 0;

            let alreadyPaid = 0;


            // ==========================
            // CREATE PAYMENT FOR EACH STUDENT
            // ==========================

            for (const student of students) {


                // Check if this student
                // already paid this term

                const existingPayment =
                    await paymentsCollection.findOne({

                        studentId:
                            student._id,

                        schoolId:
                            schoolId,

                        academicSessionId:
                            new ObjectId(
                                academicSessionId
                            ),

                        term:
                            term,

                        paymentType:
                            'school_student'

                    });


                // If already paid,
                // don't create another payment

                if (existingPayment) {

                    alreadyPaid++;

                    continue;

                }


                // Create payment record

                const payment = {

                    reference:
                        `ADM-BULK-${Date.now()}-${student._id}`,

                    paymentType:
                        'school_student',

                    paymentMethod:
                        'manual',

                    schoolId:
                        schoolId,

                    studentId:
                        student._id,

                    academicSessionId:
                        new ObjectId(
                            academicSessionId
                        ),

                    academicSession:
                        academicSession.academicSession,

                    amount:
                        FEE_PER_STUDENT,

                    term:
                        term,

                    createdAt:
                        new Date()

                };


                await paymentsCollection.insertOne(
                    payment
                );

                  // ==========================
                // UPDATE STUDENT PAYMENT
                // ==========================

                await studentsCollection.updateOne(

                    {
                        _id: student._id
                    },

                    {
                        $set: {
                            payment: true
                        }
                    }

                );


                createdPayments++;

            }


            // ==========================
            // RESPONSE
            // ==========================

            res.status(201).json({

                success: true,

                message:
                    'Payment created for students',

                totalStudents:
                    students.length,

                createdPayments:
                    createdPayments,

                alreadyPaid:
                    alreadyPaid,

                totalAmount:
                    createdPayments *
                    FEE_PER_STUDENT

            });


        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    'Failed to create payments'

            });

        }

    }
);

module.exports = router;