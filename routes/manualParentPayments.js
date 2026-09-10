const express = require('express');
const { ObjectId } = require('mongodb');

const db = require('../../schoolbaseProDB/db');
const auth = require('../middleware/auth');

const router = express.Router();

const parentsCollection = db.collection('parents');
const studentsCollection = db.collection('students');
const academicSessionsCollection = db.collection('academicSessions');
const manualPaymentsCollection = db.collection('parentManualPayments');


// =====================================================
// GET MANUAL PAYMENT PAGE
// =====================================================
router.get('/', auth, async (req, res) => {
    try {

        const schoolId = new ObjectId(req.user.id);


        // Get parents belonging to this school
        const parents = await parentsCollection
            .find({
                _id: { $exists: true },
                schoolID: schoolId,
                // isActive: true
            })
            .sort({
                parentFullName: 1
            })
            .toArray();


        // Get academic sessions
        const academicSessions = await academicSessionsCollection
            .find({
                schoolID: schoolId
            })
            .sort({
                createdAt: -1
            })
            .toArray();


        res.render('admin/manualParentPayments', {
            parents,
            academicSessions
        });


    } catch (error) {

        console.error(
            'Error loading manual payment page:',
            error
        );

        res.status(500).send(
            'Unable to load payment page'
        );

    }
});


// =====================================================
// GET STUDENTS BELONGING TO SELECTED PARENT
// =====================================================
router.get('/parent/:parentId/students', auth, async (req, res) => {
    try {

        const schoolId = new ObjectId(req.user.id);
        const parentId = new ObjectId(req.params.parentId);


        // Find parent
        const parent = await parentsCollection.findOne({
            _id: new ObjectId(parentId),
            schoolID: schoolId,
            // isActive: true
        });


        if (!parent) {

            return res.status(404).json({
                success: false,
                message: 'Parent not found'
            });

        }


        // Parent children contains student IDs
        const childrenIds = (parent.children || []).map(
            child => {

                return new ObjectId(child);

            }
        );


        const students = await studentsCollection
            .find({
                _id: {
                    $in: childrenIds
                },

                schoolID: schoolId
            })
            .sort({
                studentFullName: 1
            })
            .toArray();


        res.json({
            success: true,
            students
        });


    } catch (error) {

        console.error(
            'Error loading parent students:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Unable to load students'
        });

    }
});


// =====================================================
// SAVE MANUAL / CASH PAYMENT
// =====================================================
router.post('/save', auth, async (req, res) => {

    try {

        const schoolId = new ObjectId(req.user.id);


        const {
            parentId,
            studentId,
            academicSessionId,
            term,
            amount,
            note
        } = req.body;


        // -----------------------------------------------
        // VALIDATION
        // -----------------------------------------------

        if (
            !parentId ||
            !studentId ||
            !academicSessionId ||
            !term ||
            !amount
        ) {

            return res.status(400).json({
                success: false,
                message: 'Please fill in all required fields'
            });

        }


        const paymentAmount = Number(amount);


        if (
            isNaN(paymentAmount) ||
            paymentAmount <= 0
        ) {

            return res.status(400).json({
                success: false,
                message: 'Please enter a valid amount'
            });

        }


        // -----------------------------------------------
        // VERIFY PARENT
        // -----------------------------------------------

        const parent = await parentsCollection.findOne({
            _id: new ObjectId(parentId),
            schoolID: schoolId
        });


        if (!parent) {

            return res.status(404).json({
                success: false,
                message: 'Parent not found'
            });

        }


        // -----------------------------------------------
        // VERIFY STUDENT
        // -----------------------------------------------

        const student = await studentsCollection.findOne({
            _id: new ObjectId(studentId),
            schoolID: schoolId
        });


        if (!student) {

            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });

        }


        // -----------------------------------------------
        // VERIFY STUDENT BELONGS TO PARENT
        // -----------------------------------------------

        const parentChildren = (parent.children || []).map(
            child => child.toString()
        );


        if (
            !parentChildren.includes(studentId)
        ) {

            return res.status(403).json({
                success: false,
                message:
                    'This student does not belong to the selected parent'
            });

        }


        // -----------------------------------------------
        // VERIFY ACADEMIC SESSION
        // -----------------------------------------------

        const academicSession =
            await academicSessionsCollection.findOne({

                _id: new ObjectId(academicSessionId),

                schoolID: schoolId

            });


        if (!academicSession) {

            return res.status(404).json({
                success: false,
                message: 'Academic session not found'
            });

        }


        // -----------------------------------------------
        // CREATE PAYMENT RECORD
        // -----------------------------------------------

        const paymentReference =
            `CASH-${Date.now()}-${studentId}`;


        const paymentDocument = {

            schoolId: schoolId,

            parentId: new ObjectId(parentId),

            studentId: new ObjectId(studentId),

            academicSessionId:
                new ObjectId(academicSessionId),

            term: term,

            amount: paymentAmount,

            paymentMethod: 'manual',

            paymentType: 'parent_installment',

            reference: paymentReference,

            note: note || '',

            recordedBy: schoolId,

            createdAt: new Date()

        };


        const result =
            await manualPaymentsCollection.insertOne(
                paymentDocument
            );


        res.status(201).json({

            success: true,

            message:
                'Payment recorded successfully',

            paymentId:
                result.insertedId

        });


    } catch (error) {

        console.error(
            'Error saving manual payment:',
            error
        );

        res.status(500).json({
            success: false,
            message:
                'Unable to save payment'
        });

    }

});


module.exports = router;