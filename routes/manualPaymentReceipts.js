const express = require('express');
const { ObjectId } = require('mongodb');

const db = require('../../schoolbaseProDB/db');
const auth = require('../middleware/auth');

const router = express.Router();

const parentsCollection = db.collection('parents');
const studentsCollection = db.collection('students');
const academicSessionsCollection = db.collection('academicSessions');
const manualPaymentsCollection = db.collection('parentManualPayments');


// ======================================================
// LOAD PAYMENT RECEIPT PAGE
// ======================================================
router.get('/', auth, async (req, res) => {
    try {

        const schoolId = new ObjectId(req.user.id);

        const school = await db.collection('users').findOne({
            _id: schoolId
        });

        // Get all parents belonging to this school
        const parents = await parentsCollection
            .find({
                schoolID: schoolId
            })
            .sort({
                fullName: 1
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


        res.render(
            'admin/manualPaymentReceipts',
            {
                parents,
                academicSessions,
                school
            }
        );


    } catch (error) {

        console.error(
            'Error loading payment receipts:',
            error
        );

        res.status(500).send(
            'Unable to load payment receipts'
        );

    }
});



// ======================================================
// LOAD STUDENTS BASED ON SELECTED PARENT
// ======================================================
router.get(
    '/parent/:parentId/students',
    auth,
    async (req, res) => {

        try {

            const schoolId =
                new ObjectId(req.user.id);

            const parentId =
                new ObjectId(req.params.parentId);


            // Find parent
            // We already know from your previous fix that
            // querying by _id is safer for your current schema.
            const parent =
                await parentsCollection.findOne({
                    _id: parentId
                });


            if (!parent) {

                return res.status(404).json({
                    success: false,
                    message: 'Parent not found'
                });

            }


            // Convert children IDs safely
            const childrenIds =
                (parent.children || [])
                    .map(child => {

                        try {

                            return new ObjectId(
                                child.toString()
                            );

                        } catch {

                            return null;

                        }

                    })
                    .filter(Boolean);


            const students =
                await studentsCollection
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
                'Error loading students:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'Unable to load students'
            });

        }

    }
);



// ======================================================
// GET PAYMENT HISTORY
// ======================================================
router.get(
    '/history',
    auth,
    async (req, res) => {

        try {

            const schoolId =
                new ObjectId(req.user.id);


            const {
                parentId,
                studentId,
                academicSessionId,
                term
            } = req.query;


            // Validate
            if (
                !parentId ||
                !studentId ||
                !academicSessionId ||
                !term
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Please provide all receipt details'
                });

            }


            // ============================================
            // VERIFY PARENT
            // ============================================

            const parent =
                await parentsCollection.findOne({
                    _id:
                        new ObjectId(parentId)
                });


            if (!parent) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Parent not found'
                });

            }


            // ============================================
            // VERIFY STUDENT
            // ============================================

            const student =
                await studentsCollection.findOne({
                    _id:
                        new ObjectId(studentId),

                    schoolID:
                        schoolId
                });


            if (!student) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Student not found'
                });

            }


            // ============================================
            // VERIFY SESSION
            // ============================================

            const academicSession =
                await academicSessionsCollection.findOne({
                    _id:
                        new ObjectId(
                            academicSessionId
                        )
                });


            // ============================================
            // GET ALL INSTALLMENTS
            // ============================================

            const payments =
                await manualPaymentsCollection
                    .find({

                        schoolId: schoolId,

                        parentId:
                            new ObjectId(parentId),

                        studentId:
                            new ObjectId(studentId),

                        academicSessionId:
                            new ObjectId(
                                academicSessionId
                            ),

                        term: term

                    })
                    .sort({
                        createdAt: 1
                    })
                    .toArray();


            // ============================================
            // CALCULATE TOTAL PAID
            // ============================================

            const totalPaid =
                payments.reduce(
                    (total, payment) => {

                        return (
                            total +
                            Number(payment.amount || 0)
                        );

                    },
                    0
                );


            res.json({

                success: true,

                parent: {

                    _id: parent._id,

                    name:
                        parent.parentFullName ||
                        parent.parentName ||
                        parent.name ||
                        '-'

                },


                student: {

                    _id: student._id,

                    name:
                        student.studentFullName,

                    admissionNumber:
                        student.admissionNumber ||
                        '-'

                },


                academicSession: academicSession
                    ? (
                        academicSession.academicSession ||
                        academicSession.sessionName ||
                        academicSession.name
                    )
                    : '-',


                term: term,

                payments: payments,

                totalPaid: totalPaid

            });


        } catch (error) {

            console.error(
                'Error loading payment history:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'Unable to load payment history'
            });

        }

    }
);


module.exports = router;