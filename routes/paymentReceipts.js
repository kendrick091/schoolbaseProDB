const express = require('express');
const { ObjectId } = require('mongodb');
const db = require('../../schoolbaseProDB/db');
const auth = require('../middleware/auth');

const router = express.Router();

const paymentsCollection = db.collection('payments');
const studentsCollection = db.collection('students');
const academicSessionsCollection = db.collection('academicSessions');


// ======================================================
// PAYMENT RECEIPTS PAGE
// ======================================================
router.get('/', auth, async (req, res) => {
    try {

        const schoolId = new ObjectId(req.user.id);

        const schoolName = schoolId.schoolname;

        // ----------------------------------------------
        // Get school payments
        // ----------------------------------------------
        const payments = await paymentsCollection.aggregate([

            {
                $match: {
                    schoolId: schoolId
                }
            },

            // ------------------------------------------
            // Get student information
            // ------------------------------------------
            {
                $lookup: {
                    from: 'students',
                    localField: 'studentId',
                    foreignField: '_id',
                    as: 'student'
                }
            },

            {
                $unwind: {
                    path: '$student',
                    preserveNullAndEmptyArrays: true
                }
            },

            // ------------------------------------------
            // Get academic session
            // ------------------------------------------
            {
                $lookup: {
                    from: 'academicSessions',
                    localField: 'academicSessionId',
                    foreignField: '_id',
                    as: 'session'
                }
            },

            {
                $unwind: {
                    path: '$session',
                    preserveNullAndEmptyArrays: true
                }
            },

            // ------------------------------------------
            // Sort newest payment first
            // ------------------------------------------
            {
                $sort: {
                    createdAt: -1
                }
            },

            // ------------------------------------------
            // Return only fields needed by frontend
            // ------------------------------------------
            {
                $project: {
                    _id: 1,

                    reference: 1,

                    amount: 1,

                    term: 1,

                    paymentType: 1,

                    paymentMethod: 1,

                    createdAt: 1,

                    schoolName,

                    studentId: 1,

                    'student.studentFullName': 1,
                    'student.admissionNumber': 1,

                    academicSessionId: 1,

                    'session.sessionName': 1,
                    'session.name': 1,
                    'session.academicSession': 1
                }
            }

        ]).toArray();


        // ----------------------------------------------
        // Calculate total
        // ----------------------------------------------

        const totalAmount = payments.reduce((total, payment) => {

            return total + Number(payment.amount || 0);

        }, 0);


        res.render('admin/paymentReceipts', {
            payments,
            totalAmount
        });

    } catch (error) {

        console.error('Payment receipts error:', error);

        res.status(500).send('Unable to load payment receipts');

    }
});


// ======================================================
// SINGLE PAYMENT RECEIPT
// ======================================================
router.get('/:paymentId', auth, async (req, res) => {

    try {

        const schoolId = new ObjectId(req.user.id);
        const paymentId = new ObjectId(req.params.paymentId);


        const payment = await paymentsCollection.aggregate([

            {
                $match: {
                    _id: paymentId,
                    schoolId: schoolId
                }
            },

            // ------------------------------------------
            // Student
            // ------------------------------------------
            {
                $lookup: {
                    from: 'students',
                    localField: 'studentId',
                    foreignField: '_id',
                    as: 'student'
                }
            },

            {
                $unwind: {
                    path: '$student',
                    preserveNullAndEmptyArrays: true
                }
            },

            // ------------------------------------------
            // Academic session
            // ------------------------------------------
            {
                $lookup: {
                    from: 'academicSessions',
                    localField: 'academicSessionId',
                    foreignField: '_id',
                    as: 'session'
                }
            },

            {
                $unwind: {
                    path: '$session',
                    preserveNullAndEmptyArrays: true
                }
            },

            // ------------------------------------------
            // School
            // ------------------------------------------
            {
                $lookup: {
                    from: 'users',
                    localField: 'schoolId',
                    foreignField: '_id',
                    as: 'school'
                }
            },

            {
                $unwind: {
                    path: '$school',
                    preserveNullAndEmptyArrays: true
                }
            }

        ]).toArray();


        if (!payment.length) {

            return res.status(404).send('Payment receipt not found');

        }


        res.render('admin/paymentReceipt', {
            payment: payment[0]
        });


    } catch (error) {

        console.error('Single receipt error:', error);

        res.status(500).send('Unable to load payment receipt');

    }

});


module.exports = router;