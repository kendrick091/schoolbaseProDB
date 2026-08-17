const express = require('express');
const db = require('../../schoolbaseProDB/db.js')
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth.js')
const router = express.Router();
require('dotenv').config();

const axios = require('axios'); //for the payment verification

const school = db.collection('users');
const student = db.collection('students');
const classes = db.collection('classes');
const payments = db.collection('payments');
const academicSessions = db.collection('academicSessions')

// ==========================================
// START SCHOOL ADMIN PAYSTACK PAYMENT
// FOR ONE STUDENT
// ==========================================

// ============================================
// Get the payment page for a single student
// ============================================
router.get(
    '/:studentId',
    auth,
    async (req, res) => {

        try {

            const schoolId =
                new ObjectId(req.user.id);

            const studentId =
                new ObjectId(req.params.studentId);


            // ==========================
            // ACTIVE ACADEMIC SESSION
            // ==========================

            const activeSession =
                await academicSessions.findOne({

                    schoolID: schoolId,

                    isActive: true

                });


            if (!activeSession) {

                return res.status(400).send(
                    'No active academic session found'
                );

            }


            // ==========================
            // FIND STUDENT
            // ==========================

            const studentData =
                await student.findOne({

                    _id: studentId,

                    schoolID: schoolId

                });


            if (!studentData) {

                return res.status(404).send(
                    'Student not found'
                );

            }


            // ==========================
            // GET SCHOOL
            // ==========================

            const schoolData =
                await school.findOne({

                    _id: schoolId

                });


            if (!schoolData) {

                return res.status(404).send(
                    'School not found'
                );

            }


            // ==========================
            // GET PAYMENTS FOR STUDENT
            // ==========================

            const studentPayments =
                await payments.find({

                    studentId:
                        studentData._id,

                    schoolId:
                        schoolId,

                    academicSessionId:
                        activeSession._id,

                    paymentType:
                        'school_student'

                }).toArray();


            // ==========================
            // SEND TO EJS
            // ==========================

            res.render(
                'admin/payEachStudentFee',
                {

                    title:
                        'Pay Student Fee',

                    student:
                        studentData,

                    price:
                        350,

                    academicSession:
                        activeSession,

                    school:
                        schoolData,

                    payments:
                        studentPayments,

                    paystackKey:
                        process.env.PAYSTACK_PUBLIC_KEY

                }
            );


        } catch (error) {

            console.error(error);

            res.status(500).send(
                'Failed to load payment page'
            );

        }

    }
);


// ==========================================
// VERIFY PAYSTACK PAYMENT FOR ONE STUDENT
// ==========================================

router.post(
    '/verify-student-payment',
    auth,
    async (req, res) => {

        try {

            const {
                reference,
                studentId,
                term
            } = req.body;


            // ==========================
            // CHECK DATA
            // ==========================

            if (!reference || !studentId || !term) {

                return res.status(400).json({

                    success: false,

                    message:
                        'Missing payment information'

                });

            }


            // ==========================
            // CHECK TERM
            // ==========================

            if (
                !['term1', 'term2', 'term3']
                    .includes(term)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        'Invalid term'

                });

            }


            // ==========================
            // SCHOOL
            // ==========================

            const schoolId =
                new ObjectId(req.user.id);


            // ==========================
            // STUDENT
            // ==========================

            const studentIdObject =
                new ObjectId(studentId);


            const studentData =
                await student.findOne({

                    _id:
                        studentIdObject,

                    schoolID:
                        schoolId

                });


            if (!studentData) {

                return res.status(404).json({

                    success: false,

                    message:
                        'Student not found'

                });

            }


            // ==========================
            // ACTIVE SESSION
            // ==========================

            const activeSession =
                await academicSessions.findOne({

                    schoolID:
                        schoolId,

                    isActive:
                        true

                });


            if (!activeSession) {

                return res.status(400).json({

                    success: false,

                    message:
                        'No active academic session found'

                });

            }


            // ==========================
            // CHECK DUPLICATE
            // ==========================

            const existingPayment =
                await payments.findOne({

                    reference:
                        reference

                });


            if (existingPayment) {

                return res.json({

                    success: true,

                    message:
                        'Payment already recorded'

                });

            }


            // ==========================
            // VERIFY WITH PAYSTACK
            // ==========================

            const verifyResponse =
                await axios.get(

                    `https://api.paystack.co/transaction/verify/${reference}`,

                    {

                        headers: {

                            Authorization:
                                `Bearer ${process.env.PAYSTACK_SECRET_KEY}`

                        }

                    }

                );


            console.log(
                'PAYSTACK RESPONSE:',
                verifyResponse.data
            );


            // ==========================
            // CHECK PAYSTACK STATUS
            // ==========================

            if (
                !verifyResponse.data.status ||
                verifyResponse.data.data.status !== 'success'
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        'Paystack payment was not successful'

                });

            }


            const paymentData =
                verifyResponse.data.data;


            // ==========================
            // AMOUNT
            // ==========================

            const amount =
                paymentData.amount / 100;


            // ==========================
            // CREATE PAYMENT
            // ==========================

            const newPayment = {

                reference:
                    reference,

                paymentType:
                    'school_student',

                paymentMethod:
                    'paystack',

                schoolId:
                    schoolId,

                studentId:
                    studentIdObject,

                academicSessionId:
                    activeSession._id,

                academicSession:
                    activeSession.academicSession,

                amount:
                    amount,

                term:
                    term,

                createdAt:
                    new Date(),

                paystackTransactionId:
                    paymentData.id

            };


            await payments.insertOne(
                newPayment
            );

            console.log(
                'PAYMENT SAVED:',
                newPayment
            );


            // ==========================
            // UPDATE STUDENT
            // ==========================

            const updudent =
                await student.updateOne(

                    {

                        _id:
                            studentIdObject,

                        schoolID:
                            schoolId

                    },

                    {

                        $set: {

                            payment:
                                true

                        }

                    }

                );


            console.log(
                'STUDENT UPDATE:',
                updudent
            );


            // ==========================
            // SUCCESS
            // ==========================

            return res.json({

                success:
                    true,

                message:
                    'Payment successfully recorded',

                student:
                    studentData.studentFullName,

                amount:
                    amount,

                term:
                    term,

                reference:
                    reference

            });


        } catch (error) {

            console.error(
                'VERIFY STUDENT PAYMENT ERROR:',
                error.response?.data ||
                error.message
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    'Failed to verify payment'

            });

        }

    }
);

// ==========================================
// PAYSTACK CALLBACK
// ==========================================

router.get(
    '/paystack/callback',
    async (req, res) => {

        try {

            // ==========================
            // GET REFERENCE
            // ==========================

            const reference = req.query.reference;

            console.log('PAYSTACK CALLBACK REFERENCE:', reference);


            if (!reference) {

                return res.status(400).send(
                    'Payment reference not found'
                );

            }


            // ==========================
            // VERIFY PAYMENT WITH PAYSTACK
            // ==========================

            const verifyResponse =
                await axios.get(

                    `https://api.paystack.co/transaction/verify/${reference}`,

                    {
                        headers: {

                            Authorization:
                                `Bearer ${process.env.PAYSTACK_SECRET_KEY}`

                        }
                    }

                );


            console.log(
                'PAYSTACK VERIFY RESPONSE:',
                verifyResponse.data
            );


            // ==========================
            // CHECK PAYMENT STATUS
            // ==========================

            if (
                !verifyResponse.data.status ||
                verifyResponse.data.data.status !== 'success'
            ) {

                return res.send(`

                    <h2>Payment was not successful</h2>

                    <p>Please try again.</p>

                    <a href="/fees">
                        Return to Fee Management
                    </a>

                `);

            }


            const paymentData =
                verifyResponse.data.data;


            // ==========================
            // GET METADATA
            // ==========================

            const metadata =
                paymentData.metadata;


            console.log(
                'PAYMENT METADATA:',
                metadata
            );


            if (
                !metadata ||
                !metadata.studentId ||
                !metadata.schoolId ||
                !metadata.academicSessionId ||
                !metadata.term
            ) {

                console.error(
                    'Missing payment metadata'
                );

                return res.status(400).send(
                    'Payment metadata is incomplete'
                );

            }


            // ==========================
            // CONVERT IDs
            // ==========================

            const studentId =
                new ObjectId(
                    metadata.studentId
                );


            const schoolId =
                new ObjectId(
                    metadata.schoolId
                );


            const academicSessionId =
                new ObjectId(
                    metadata.academicSessionId
                );


            const term =
                metadata.term;


            // ==========================
            // CHECK FOR DUPLICATE
            // ==========================

            const existingPayment =
                await payments.findOne({

                    reference:
                        reference

                });


            if (existingPayment) {

                console.log(
                    'Payment already exists:',
                    reference
                );

                return res.send(`

                    <h2>Payment already recorded</h2>

                    <p>
                        This payment has already
                        been recorded successfully.
                    </p>

                    <a href="/fees">
                        Return to Fee Management
                    </a>

                `);

            }


            // ==========================
            // CHECK STUDENT
            // ==========================

            const studentData =
                await student.findOne({

                    _id:
                        studentId,

                    schoolID:
                        schoolId

                });


            if (!studentData) {

                console.error(
                    'Student not found:',
                    studentId
                );

                return res.status(404).send(
                    'Student not found'
                );

            }


            // ==========================
            // CREATE PAYMENT RECORD
            // ==========================

            const payment = {

                reference:
                    reference,

                paymentType:
                    'school_student',

                paymentMethod:
                    'paystack',

                schoolId:
                    schoolId,

                studentId:
                    studentId,

                academicSessionId:
                    academicSessionId,

                academicSession:
                    metadata.academicSession || '',

                amount:
                    paymentData.amount / 100,

                term:
                    term,

                createdAt:
                    new Date(),

                paystackTransactionId:
                    paymentData.id

            };


            await payments.insertOne(payment);


            console.log(
                'PAYMENT SAVED:',
                reference
            );


            // ==========================
            // UPDATE STUDENT
            // ==========================

            const studentUpdate =
                await student.updateOne(

                    {
                        _id:
                            studentId,

                        schoolID:
                            schoolId

                    },

                    {
                        $set: {

                            payment:
                                true

                        }

                    }

                );


            console.log(
                'STUDENT PAYMENT UPDATED:',
                studentUpdate
            );


            // ==========================
            // SUCCESS PAGE
            // ==========================

            res.send(`

                <!DOCTYPE html>

                <html>

                <head>

                    <title>
                        Payment Successful
                    </title>

                </head>

                <body>

                    <center>

                        <h2>
                            Payment Successful
                        </h2>

                        <p>
                            ₦${(paymentData.amount / 100).toLocaleString()}
                            payment has been successfully recorded.
                        </p>

                        <p>
                            Student:
                            ${studentData.studentFullName}
                        </p>

                        <p>
                            Term:
                            ${term}
                        </p>

                        <p>
                            Academic Session:
                            ${metadata.academicSession}
                        </p>

                        <p>
                            Reference:
                            ${reference}
                        </p>

                        <br>

                        <a href="/fees">
                            Return to Fee Management
                        </a>

                    </center>

                </body>

                </html>

            `);


        } catch (error) {

            console.error(
                'PAYSTACK CALLBACK ERROR:',
                error.response?.data ||
                error.message
            );


            res.status(500).send(
                'Failed to verify payment'
            );

        }

    }
);

module.exports = router;