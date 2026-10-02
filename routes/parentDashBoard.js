const express = require('express');
const { ObjectId } = require('mongodb');
const db = require('../../schoolbaseProDB/db.js');
const auth = require('../middleware/auth.js');
const bcrypt = require('bcrypt');
const axios = require('axios');

const router = express.Router();

const userBoard = db.collection('users');
const parents = db.collection('parents');
const students = db.collection('students');
const classes = db.collection('classes');
const payments = db.collection('payments');
const parentManualPayments = db.collection('parentManualPayments');
const academicSessions = db.collection('academicSessions');


// ==========================================================
// HELPER: DETERMINE SCHOOL SECTION
// ==========================================================

function getSchoolSection(className) {

    if (!className) {
        return null;
    }

    const name =
        className
            .toLowerCase()
            .trim();


    if (
        name.startsWith('basic') ||
        name.startsWith('primary')
    ) {

        return 'primary';

    }


    if (
        name.startsWith('jss') ||
        name.includes('junior')
    ) {

        return 'juniorSecondary';

    }


    if (
        name.startsWith('ss') ||
        name.includes('senior')
    ) {

        return 'seniorSecondary';

    }


    return null;
}


// ==========================================================
// HELPER: GET TERM FEE
// ==========================================================

function getTermFee(school, schoolSection, term) {

    if (
        !school ||
        !schoolSection ||
        ![
            'term1',
            'term2',
            'term3'
        ].includes(term)
    ) {

        return 0;

    }


    const termNumber =
        term.replace('term', '');


    const feeField =
        `${schoolSection}FeeTerm${termNumber}`;


    return Number(
        school[feeField] || 0
    );
}


// ==========================================================
// HELPER: GET ALL SUCCESSFUL PAYMENTS
//
// This includes:
// - manual/admin-entered payments
// - successful Paystack payments
//
// All installment records are stored in
// parentManualPayments.
//
// payments collection is used for the
// completed/final school-fee record.
// ==========================================================

async function getSuccessfulStudentPayments({
    schoolId,
    studentId,
    academicSessionId,
    term
}) {

    const paymentRecords =
        await parentManualPayments
            .find({

                schoolId:
                    schoolId,

                studentId:
                    studentId,

                academicSessionId:
                    academicSessionId,

                term:
                    term,

                $or: [

                    {
                        paymentMethod:
                            'manual',

                        status: {
                            $in: [
                                null,
                                'success',
                                'completed'
                            ]
                        }
                    },

                    {
                        paymentMethod:
                            'paystack',

                        status:
                            'success'
                    }

                ]

            })
            .toArray();


    return paymentRecords;
}


// ==========================================================
// HELPER: CALCULATE TOTAL PAID
// ==========================================================

function calculateTotalPaid(paymentRecords) {

    return paymentRecords.reduce(
        (total, payment) => {

            return total +
                Number(
                    payment.amount || 0
                );

        },
        0
    );

}


// ==========================================================
// PARENT DASHBOARD
// ==========================================================

router.get('/', auth, async (req, res) => {

    try {

        const parentId =
            new ObjectId(req.user.id);


        const parent =
            await parents.findOne({
                _id: parentId
            });


        if (!parent) {

            return res.status(404).send(
                'Parent not found'
            );

        }


        const schoolId =
            new ObjectId(parent.schoolID);


        const school =
            await userBoard.findOne({
                _id: schoolId
            });


        const academicSessionData =
            await academicSessions.findOne({
                schoolID: schoolId,
                isActive: true
            });


        const studentList =
            await students
                .find({
                    schoolID: schoolId
                })
                .sort({
                    studentFullName: 1
                })
                .toArray();


        res.render('parent/dashBoard', {

            title:
                'Parent Dashboard',

            school,

            parent,

            students:
                studentList,

            session:
                academicSessionData

        });


    } catch (error) {

        console.error(
            'PARENT DASHBOARD ERROR:',
            error
        );

        return res.status(500).send(
            'Unable to load parent dashboard'
        );

    }

});


// ==========================================================
// GET SCHOOL FEES PAGE
// ==========================================================

router.get(
    '/fees/:studentId',
    auth,
    async (req, res) => {

        try {

            // ==================================================
            // VALIDATE STUDENT ID
            // ==================================================

            if (
                !ObjectId.isValid(
                    req.params.studentId
                )
            ) {

                return res.status(400).send(
                    'Invalid student ID'
                );

            }


            const studentId =
                new ObjectId(
                    req.params.studentId
                );


            // ==================================================
            // GET PARENT
            // ==================================================

            const parentId =
                new ObjectId(req.user.id);


            const parent =
                await parents.findOne({
                    _id: parentId
                });


            if (!parent) {

                return res.status(404).send(
                    'Parent not found'
                );

            }


            // ==================================================
            // GET STUDENT
            // ==================================================

            const student =
                await students.findOne({
                    _id: studentId
                });


            if (!student) {

                return res.status(404).send(
                    'Student not found'
                );

            }


            // ==================================================
            // MAKE SURE STUDENT BELONGS TO PARENT
            // ==================================================

            const isParentChild =
                Array.isArray(parent.children) &&
                parent.children.some(
                    id =>
                        id.toString() ===
                        student._id.toString()
                );


            if (!isParentChild) {

                return res.status(403).send(
                    'You are not authorized to view this student'
                );

            }


            // ==================================================
            // GET SCHOOL
            // ==================================================

            const schoolId =
                new ObjectId(parent.schoolID);


            const school =
                await userBoard.findOne({
                    _id: schoolId
                });


            if (!school) {

                return res.status(404).send(
                    'School not found'
                );

            }


            // ==================================================
            // GET STUDENT CLASS
            // ==================================================

            if (
                !ObjectId.isValid(
                    student.studentClass
                )
            ) {

                return res.status(400).send(
                    'Invalid student class'
                );

            }


            const studentClass =
                await classes.findOne({

                    _id:
                        new ObjectId(
                            student.studentClass
                        )

                });


            if (!studentClass) {

                return res.status(404).send(
                    'Student class not found'
                );

            }


            // ==================================================
            // DETERMINE SCHOOL SECTION
            // ==================================================

            const schoolSection =
                getSchoolSection(
                    studentClass.className
                );


            if (!schoolSection) {

                return res.status(400).send(
                    `Unable to determine school section for ${studentClass.className}`
                );

            }


            // ==================================================
            // SCHOOL FEES
            // ==================================================

            const fees = {

                term1:
                    getTermFee(
                        school,
                        schoolSection,
                        'term1'
                    ),

                term2:
                    getTermFee(
                        school,
                        schoolSection,
                        'term2'
                    ),

                term3:
                    getTermFee(
                        school,
                        schoolSection,
                        'term3'
                    )

            };


            // ==================================================
            // GET ALL ACADEMIC SESSIONS
            // ==================================================

            const allAcademicSessions =
                await academicSessions
                    .find({
                        schoolID: schoolId
                    })
                    .sort({
                        createdAt: -1
                    })
                    .toArray();


            // ==================================================
            // GET ACTIVE SESSION
            // ==================================================

            const currentSession =
                await academicSessions.findOne({

                    schoolID:
                        schoolId,

                    isActive:
                        true

                });


            if (!currentSession) {

                return res.status(404).send(
                    'No active academic session found'
                );

            }


            // ==================================================
            // GET ALL PAYMENT HISTORY
            //
            // This collection contains:
            // - manual payments
            // - Paystack payments
            // ==================================================

            const paymentHistory =
                await parentManualPayments
                    .find({

                        schoolId:
                            schoolId,

                        parentId:
                            parentId,

                        studentId:
                            studentId

                    })
                    .sort({
                        paidAt: -1,
                        createdAt: -1
                    })
                    .toArray();


            // ==================================================
            // CREATE PAYMENT SUMMARY
            // ==================================================

            const paymentSummary = {};


            paymentHistory.forEach(payment => {

                if (
                    !payment.academicSessionId ||
                    !payment.term
                ) {

                    return;

                }


                const sessionId =
                    payment
                        .academicSessionId
                        .toString();


                const key =
                    `${sessionId}_${payment.term}`;


                if (!paymentSummary[key]) {

                    paymentSummary[key] = {
                        totalPaid: 0
                    };

                }


                // Only count valid successful payments
                // and manual payments.

                const isManual =
                    payment.paymentMethod === 'manual';


                const isSuccessfulPaystack =
                    payment.paymentMethod === 'paystack' &&
                    payment.status === 'success';


                if (
                    isManual ||
                    isSuccessfulPaystack
                ) {

                    paymentSummary[key].totalPaid +=
                        Number(
                            payment.amount || 0
                        );

                }

            });


            // ==================================================
            // RENDER PAGE
            // ==================================================

            res.render('parent/fees', {

                title:
                    'School Fees',

                school,

                parent,

                student,

                studentClass,

                schoolSection,

                allAcademicSessions,

                session:
                    currentSession,

                fees,

                paymentSummary,

                paymentHistory

            });


        } catch (error) {

            console.error(
                'SCHOOL FEES ERROR:',
                error
            );

            return res.status(500).send(
                'Failed to load school fees'
            );

        }

    }
);


// ==========================================================
// INITIALIZE PARENT SCHOOL FEE PAYMENT
// ==========================================================

router.post(
    '/pay-fees/:studentId',
    auth,
    async (req, res) => {

        try {

            // ==================================================
            // VALIDATE STUDENT ID
            // ==================================================

            if (
                !ObjectId.isValid(
                    req.params.studentId
                )
            ) {

                return res.status(400).send(
                    'Invalid student ID'
                );

            }


            const studentId =
                new ObjectId(
                    req.params.studentId
                );


            // ==================================================
            // GET FORM DATA
            // ==================================================

            const {
                sessionId,
                term,
                amount
            } = req.body;


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
                    'Invalid term'
                );

            }


            // ==================================================
            // VALIDATE AMOUNT
            // ==================================================

            const paymentAmount =
                Number(amount);


            if (
                !Number.isFinite(
                    paymentAmount
                ) ||
                paymentAmount <= 0
            ) {

                return res.status(400).send(
                    'Invalid payment amount'
                );

            }


            // ==================================================
            // GET PARENT
            // ==================================================

            const parentId =
                new ObjectId(
                    req.user.id
                );


            const parent =
                await parents.findOne({
                    _id: parentId
                });


            if (!parent) {

                return res.status(404).send(
                    'Parent not found'
                );

            }


            // ==================================================
            // VERIFY PARENT -> CHILD
            // ==================================================

            const isParentChild =
                Array.isArray(parent.children) &&
                parent.children.some(
                    id =>
                        id.toString() ===
                        studentId.toString()
                );


            if (!isParentChild) {

                return res.status(403).send(
                    'You are not authorized to pay for this student'
                );

            }


            // ==================================================
            // GET STUDENT
            // ==================================================

            const student =
                await students.findOne({
                    _id: studentId
                });


            if (!student) {

                return res.status(404).send(
                    'Student not found'
                );

            }


            // ==================================================
            // GET SCHOOL
            // ==================================================

            const schoolId =
                new ObjectId(
                    parent.schoolID
                );


            const school =
                await userBoard.findOne({
                    _id: schoolId
                });


            if (!school) {

                return res.status(404).send(
                    'School not found'
                );

            }


            // ==================================================
            // CHECK PAYSTACK SUBACCOUNT
            // ==================================================

            if (
                !school.paystackSubaccountCode
            ) {

                return res.status(400).send(
                    'This school has not completed Paystack payment setup.'
                );

            }


            // ==================================================
            // VALIDATE ACADEMIC SESSION
            // ==================================================

            if (
                !ObjectId.isValid(sessionId)
            ) {

                return res.status(400).send(
                    'Invalid academic session'
                );

            }


            const academicSessionId =
                new ObjectId(
                    sessionId
                );


            const academicSession =
                await academicSessions.findOne({

                    _id:
                        academicSessionId,

                    schoolID:
                        schoolId

                });


            if (!academicSession) {

                return res.status(404).send(
                    'Academic session not found'
                );

            }


            // ==================================================
            // GET STUDENT CLASS
            // ==================================================

            if (
                !ObjectId.isValid(
                    student.studentClass
                )
            ) {

                return res.status(400).send(
                    'Invalid student class'
                );

            }


            const studentClass =
                await classes.findOne({

                    _id:
                        new ObjectId(
                            student.studentClass
                        )

                });


            if (!studentClass) {

                return res.status(404).send(
                    'Student class not found'
                );

            }


            // ==================================================
            // DETERMINE SCHOOL SECTION
            // ==================================================

            const schoolSection =
                getSchoolSection(
                    studentClass.className
                );


            if (!schoolSection) {

                return res.status(400).send(
                    'Unable to determine school section'
                );

            }


            // ==================================================
            // GET CORRECT TERM FEE
            // ==================================================

            const schoolFee =
                getTermFee(
                    school,
                    schoolSection,
                    term
                );


            if (schoolFee <= 0) {

                return res.status(400).send(
                    'School fee has not been configured for this term'
                );

            }


            // ==================================================
            // GET ALL SUCCESSFUL PAYMENTS
            //
            // IMPORTANT:
            //
            // Do NOT separately add online payments.
            //
            // Every successful Paystack installment is already
            // stored inside parentManualPayments.
            // ==================================================

            const existingPayments =
                await getSuccessfulStudentPayments({

                    schoolId:
                        schoolId,

                    studentId:
                        studentId,

                    academicSessionId:
                        academicSessionId,

                    term:
                        term

                });


            // ==================================================
            // CALCULATE TOTAL ALREADY PAID
            // ==================================================

            const alreadyPaid =
                calculateTotalPaid(
                    existingPayments
                );


            // ==================================================
            // CALCULATE REMAINING
            // ==================================================

            const remaining =
                Math.max(
                    schoolFee -
                    alreadyPaid,
                    0
                );


            // ==================================================
            // CHECK FULL PAYMENT
            // ==================================================

            if (remaining <= 0) {

                return res.status(400).send(
                    'This term has already been fully paid.'
                );

            }


            // ==================================================
            // PREVENT OVERPAYMENT
            // ==================================================

            if (
                paymentAmount >
                remaining
            ) {

                return res.status(400).send(

                    `Payment is more than the remaining balance. Remaining balance is ₦${remaining.toLocaleString()}`

                );

            }


            // ==================================================
            // GET PARENT EMAIL
            // ==================================================

            const parentEmail =
                parent.email ||
                parent.emailAddress ||
                school.email;


            if (!parentEmail) {

                return res.status(400).send(
                    'No email address is available for this payment.'
                );

            }


            // ==================================================
            // CREATE UNIQUE REFERENCE
            // ==================================================

            const reference =
                `SB-FEE-${Date.now()}-${studentId}`;


            // ==================================================
            // PAYSTACK SECRET KEY
            // ==================================================

            const secretKey =
                process.env.PAYSTACK_SECRET_KEY;


            if (!secretKey) {

                console.error(
                    'PAYSTACK SECRET KEY IS MISSING'
                );

                return res.status(500).send(
                    'Payment service is not configured.'
                );

            }


            // ==================================================
            // INITIALIZE PAYSTACK
            // ==================================================

            const paystackResponse =
                await axios.post(

                    'https://api.paystack.co/transaction/initialize',

                    {

                        email:
                            parentEmail,

                        amount:
                            Math.round(
                                paymentAmount * 100
                            ).toString(),

                        currency:
                            'NGN',

                        reference:
                            reference,

                        // School Paystack subaccount
                        subaccount:
                            school.paystackSubaccountCode,

                        callback_url:
                            `${req.protocol}://${req.get('host')}/parentDashBoard/paystack/callback`,

                        metadata: {

                            paymentType:
                                'school_fee',

                            paymentMethod:
                                'paystack',

                            schoolId:
                                schoolId.toString(),

                            parentId:
                                parentId.toString(),

                            studentId:
                                studentId.toString(),

                            academicSessionId:
                                academicSessionId.toString(),

                            term:
                                term,

                            amount:
                                paymentAmount

                        }

                    },

                    {

                        headers: {

                            Authorization:
                                `Bearer ${secretKey}`,

                            'Content-Type':
                                'application/json'

                        }

                    }

                );


            // ==================================================
            // CHECK PAYSTACK RESPONSE
            // ==================================================

            if (
                !paystackResponse.data ||
                !paystackResponse.data.status
            ) {

                console.error(
                    'PAYSTACK INITIALIZATION FAILED:',
                    paystackResponse.data
                );

                return res.status(500).send(
                    'Unable to initialize Paystack payment.'
                );

            }


            // ==================================================
            // GET CHECKOUT URL
            // ==================================================

            const authorizationUrl =
                paystackResponse
                    .data
                    .data
                    .authorization_url;


            if (!authorizationUrl) {

                return res.status(500).send(
                    'Paystack did not return a payment URL.'
                );

            }


            // ==================================================
            // REDIRECT TO PAYSTACK
            // ==================================================

            return res.redirect(
                authorizationUrl
            );


        } catch (error) {

            console.error(
                '===================================='
            );

            console.error(
                'PAYSTACK SCHOOL FEE ERROR'
            );

            console.error(
                'Message:',
                error.message
            );


            if (error.response) {

                console.error(
                    'Paystack Status:',
                    error.response.status
                );

                console.error(
                    'Paystack Response:',
                    error.response.data
                );

            }


            console.error(
                '===================================='
            );


            return res.status(500).send(

                error.response?.data?.message ||
                'Unable to initialize school fee payment'

            );

        }

    }
);


// ==========================================================
// PAYSTACK SCHOOL FEE CALLBACK
// ==========================================================

router.get(
    '/paystack/callback',
    async (req, res) => {

        try {

            // ==================================================
            // GET REFERENCE
            // ==================================================

            const reference =
                req.query.reference;


            if (!reference) {

                return res.status(400).send(
                    'Payment reference is missing'
                );

            }


            // ==================================================
            // SECRET KEY
            // ==================================================

            const secretKey =
                process.env.PAYSTACK_SECRET_KEY;


            if (!secretKey) {

                console.error(
                    'PAYSTACK SECRET KEY IS MISSING'
                );

                return res.status(500).send(
                    'Payment service is not configured.'
                );

            }


            // ==================================================
            // VERIFY TRANSACTION
            // ==================================================

            const verifyResponse =
                await axios.get(

                    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,

                    {

                        headers: {

                            Authorization:
                                `Bearer ${secretKey}`

                        }

                    }

                );


            const transaction =
                verifyResponse.data.data;


            // ==================================================
            // VERIFY SUCCESS
            // ==================================================

            if (
                !verifyResponse.data.status ||
                !transaction ||
                transaction.status !== 'success'
            ) {

                return res.status(400).send(
                    'Payment was not successful.'
                );

            }


            // ==================================================
            // GET METADATA
            // ==================================================

            const metadata =
                transaction.metadata;


            if (!metadata) {

                return res.status(400).send(
                    'Payment metadata is missing.'
                );

            }


            const {
                schoolId,
                parentId,
                studentId,
                academicSessionId,
                term
            } = metadata;


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
                    'Invalid payment term.'
                );

            }


            // ==================================================
            // VALIDATE IDS
            // ==================================================

            if (
                !ObjectId.isValid(schoolId) ||
                !ObjectId.isValid(parentId) ||
                !ObjectId.isValid(studentId) ||
                !ObjectId.isValid(academicSessionId)
            ) {

                return res.status(400).send(
                    'Invalid payment information.'
                );

            }


            const schoolObjectId =
                new ObjectId(schoolId);


            const parentObjectId =
                new ObjectId(parentId);


            const studentObjectId =
                new ObjectId(studentId);


            const academicSessionObjectId =
                new ObjectId(academicSessionId);


            // ==================================================
            // CHECK DUPLICATE PAYSTACK PAYMENT
            // ==================================================

            const existingPayment =
                await parentManualPayments.findOne({

                    reference:
                        transaction.reference,

                    paymentMethod:
                        'paystack',

                    paymentType:
                        'school_fee'

                });


            if (existingPayment) {

                return res.redirect(
                    `/parentDashBoard/fees/${studentId}`
                );

            }


            // ==================================================
            // VERIFY SCHOOL
            // ==================================================

            const school =
                await userBoard.findOne({

                    _id:
                        schoolObjectId

                });


            if (!school) {

                return res.status(404).send(
                    'School not found.'
                );

            }


            // ==================================================
            // VERIFY PARENT
            // ==================================================

            const parent =
                await parents.findOne({

                    _id:
                        parentObjectId

                });


            if (!parent) {

                return res.status(404).send(
                    'Parent not found.'
                );

            }


            // ==================================================
            // VERIFY PARENT -> CHILD
            // ==================================================

            const isParentChild =
                Array.isArray(parent.children) &&
                parent.children.some(
                    id =>
                        id.toString() ===
                        studentObjectId.toString()
                );


            if (!isParentChild) {

                return res.status(403).send(
                    'Student does not belong to this parent.'
                );

            }


            // ==================================================
            // VERIFY STUDENT
            // ==================================================

            const student =
                await students.findOne({

                    _id:
                        studentObjectId

                });


            if (!student) {

                return res.status(404).send(
                    'Student not found.'
                );

            }


            // ==================================================
            // VERIFY STUDENT BELONGS TO SCHOOL
            // ==================================================

            if (
                student.schoolID &&
                student.schoolID.toString() !==
                schoolObjectId.toString()
            ) {

                return res.status(403).send(
                    'Student does not belong to this school.'
                );

            }


            // ==================================================
            // GET ACADEMIC SESSION
            // ==================================================

            const academicSession =
                await academicSessions.findOne({

                    _id:
                        academicSessionObjectId,

                    schoolID:
                        schoolObjectId

                });


            if (!academicSession) {

                return res.status(404).send(
                    'Academic session not found.'
                );

            }


            // ==================================================
            // GET STUDENT CLASS
            // ==================================================

            if (
                !ObjectId.isValid(
                    student.studentClass
                )
            ) {

                return res.status(400).send(
                    'Invalid student class.'
                );

            }


            const studentClass =
                await classes.findOne({

                    _id:
                        new ObjectId(
                            student.studentClass
                        )

                });


            if (!studentClass) {

                return res.status(404).send(
                    'Student class not found.'
                );

            }


            // ==================================================
            // DETERMINE SCHOOL SECTION
            // ==================================================

            const schoolSection =
                getSchoolSection(
                    studentClass.className
                );


            if (!schoolSection) {

                return res.status(400).send(
                    'Unable to determine school section.'
                );

            }


            // ==================================================
            // GET SCHOOL FEE
            // ==================================================

            const schoolFee =
                getTermFee(
                    school,
                    schoolSection,
                    term
                );


            if (schoolFee <= 0) {

                return res.status(400).send(
                    'School fee has not been configured for this term.'
                );

            }


            // ==================================================
            // PAYMENT AMOUNT
            // ==================================================

            const paidAmount =
                Number(
                    transaction.amount
                ) / 100;


            if (
                !Number.isFinite(
                    paidAmount
                ) ||
                paidAmount <= 0
            ) {

                return res.status(400).send(
                    'Invalid payment amount.'
                );

            }


            // ==================================================
            // PAYMENT DATE
            //
            // Paystack's paid_at is preferred.
            // ==================================================

            const paymentDate =
                transaction.paid_at
                    ? new Date(
                        transaction.paid_at
                    )
                    : new Date();


            // ==================================================
            // SAVE PAYSTACK INSTALLMENT
            // ==================================================

            await parentManualPayments.insertOne({

                reference:
                    transaction.reference,

                paymentType:
                    'school_fee',

                paymentMethod:
                    'paystack',

                status:
                    'success',

                schoolId:
                    schoolObjectId,

                parentId:
                    parentObjectId,

                studentId:
                    studentObjectId,

                academicSessionId:
                    academicSessionObjectId,

                academicSession:
                    academicSession.academicSession,

                term:
                    term,

                amount:
                    paidAmount,

                paystackSubaccountCode:
                    school.paystackSubaccountCode,

                paystackTransactionId:
                    transaction.id,

                channel:
                    transaction.channel,

                paidAt:
                    paymentDate,

                createdAt:
                    paymentDate

            });


            // ==================================================
            // GET ALL SUCCESSFUL PAYMENTS
            //
            // This includes the payment we just inserted.
            // ==================================================

            const successfulPayments =
                await getSuccessfulStudentPayments({

                    schoolId:
                        schoolObjectId,

                    studentId:
                        studentObjectId,

                    academicSessionId:
                        academicSessionObjectId,

                    term:
                        term

                });


            // ==================================================
            // CALCULATE TOTAL PAID
            // ==================================================

            const totalPaid =
                calculateTotalPaid(
                    successfulPayments
                );


            console.log(
                'SCHOOL FEE PAYMENT SUMMARY:',
                {
                    studentId:
                        studentId,

                    term:
                        term,

                    schoolFee:
                        schoolFee,

                    totalPaid:
                        totalPaid,

                    remaining:
                        Math.max(
                            schoolFee -
                            totalPaid,
                            0
                        )
                }
            );


            // ==================================================
            // CHECK WHETHER TERM IS FULLY PAID
            // ==================================================

            if (
                totalPaid >= schoolFee
            ) {

                // ==============================================
                // CHECK IF COMPLETED RECORD ALREADY EXISTS
                // ==============================================

                const completedPayment =
                    await payments.findOne({

                        schoolId:
                            schoolObjectId,

                        studentId:
                            studentObjectId,

                        academicSessionId:
                            academicSessionObjectId,

                        term:
                            term,

                        paymentType:
                            'school_fee'

                    });


                // ==============================================
                // CREATE COMPLETED PAYMENT RECORD
                // ==============================================

                if (!completedPayment) {

                    await payments.insertOne({

                        reference:
                            transaction.reference,

                        paymentType:
                            'school_fee',

                        paymentMethod:
                            'paystack',

                        status:
                            'success',

                        schoolId:
                            schoolObjectId,

                        parentId:
                            parentObjectId,

                        studentId:
                            studentObjectId,

                        academicSessionId:
                            academicSessionObjectId,

                        academicSession:
                            academicSession.academicSession,

                        term:
                            term,

                        // Actual school fee
                        amount:
                            schoolFee,

                        // Total of all installments
                        totalPaid:
                            totalPaid,

                        paidAt:
                            paymentDate,

                        completedAt:
                            new Date(),

                        createdAt:
                            new Date()

                    });


                    console.log(
                        'SCHOOL FEE COMPLETED:',
                        {
                            studentId:
                                studentId,

                            term:
                                term,

                            amount:
                                schoolFee
                        }
                    );

                }

            }


            // ==================================================
            // SEND PARENT BACK TO FEES PAGE
            // ==================================================

            return res.redirect(
                `/parentDashBoard/fees/${studentId}`
            );


        } catch (error) {

            console.error(
                '===================================='
            );

            console.error(
                'PAYSTACK SCHOOL FEE CALLBACK ERROR'
            );

            console.error(
                'Message:',
                error.message
            );


            if (error.response) {

                console.error(
                    'Paystack Status:',
                    error.response.status
                );

                console.error(
                    'Paystack Response:',
                    error.response.data
                );

            }


            console.error(
                '===================================='
            );


            return res.status(500).send(
                'Unable to verify school fee payment.'
            );

        }

    }
);


// ======================================================
// PARENT RECEIPT PAGE
// ======================================================

router.get(
    '/receipt/:studentId',
    auth,
    async (req, res) => {

        try {

            // --------------------------------------------------
            // VALIDATE STUDENT ID
            // --------------------------------------------------

            if (!ObjectId.isValid(req.params.studentId)) {

                return res.status(400).send(
                    'Invalid student ID'
                );

            }


            const studentId =
                new ObjectId(req.params.studentId);


            const parentId =
                new ObjectId(req.user.id);


            // --------------------------------------------------
            // GET PARENT
            // --------------------------------------------------

            const parent =
                await parents.findOne({
                    _id: parentId
                });


            if (!parent) {

                return res.status(404).send(
                    'Parent not found'
                );

            }


            // --------------------------------------------------
            // VERIFY CHILD BELONGS TO PARENT
            // --------------------------------------------------

            const isParentChild =
                Array.isArray(parent.children) &&
                parent.children.some(
                    id =>
                        id.toString() ===
                        studentId.toString()
                );


            if (!isParentChild) {

                return res.status(403).send(
                    'You are not authorized to view this receipt'
                );

            }


            // --------------------------------------------------
            // GET STUDENT
            // --------------------------------------------------

            const student =
                await students.findOne({
                    _id: studentId
                });


            if (!student) {

                return res.status(404).send(
                    'Student not found'
                );

            }


            // --------------------------------------------------
            // GET SCHOOL
            // --------------------------------------------------

            if (!ObjectId.isValid(parent.schoolID)) {

                return res.status(400).send(
                    'Invalid school ID'
                );

            }


            const schoolId =
                new ObjectId(parent.schoolID);


            const school =
                await userBoard.findOne({
                    _id: schoolId
                });


            if (!school) {

                return res.status(404).send(
                    'School not found'
                );

            }


            // --------------------------------------------------
            // GET ACADEMIC SESSIONS
            // --------------------------------------------------

            const academicSessionsList =
                await academicSessions
                    .find({
                        schoolID: schoolId
                    })
                    .sort({
                        createdAt: -1
                    })
                    .toArray();


            // --------------------------------------------------
            // RENDER RECEIPT PAGE
            // --------------------------------------------------

            return res.render(
                'parent/receipt',
                {

                    title: 'Payment Receipt',

                    school,

                    parent,

                    student,

                    academicSessions:
                        academicSessionsList

                }
            );


        } catch (error) {

            console.error(
                'RECEIPT PAGE ERROR:',
                error
            );

            return res.status(500).send(
                'Unable to load receipt'
            );

        }

    }
);

// ======================================================
// GET RECEIPT PAYMENT HISTORY
// ======================================================

router.get(
    '/receipt/:studentId/history',
    auth,
    async (req, res) => {

        try {

            const {
                academicSessionId,
                term
            } = req.query;


            // --------------------------------------------------
            // VALIDATE IDS
            // --------------------------------------------------

            if (!ObjectId.isValid(req.params.studentId)) {

                return res.status(400).json({
                    success: false,
                    message: 'Invalid student ID'
                });

            }


            if (!ObjectId.isValid(academicSessionId)) {

                return res.status(400).json({
                    success: false,
                    message: 'Invalid academic session'
                });

            }


            if (![
                'term1',
                'term2',
                'term3'
            ].includes(term)) {

                return res.status(400).json({
                    success: false,
                    message: 'Invalid term'
                });

            }


            const studentId =
                new ObjectId(req.params.studentId);


            const parentId =
                new ObjectId(req.user.id);


            const sessionObjectId =
                new ObjectId(academicSessionId);


            // --------------------------------------------------
            // GET PARENT
            // --------------------------------------------------

            const parent =
                await parents.findOne({
                    _id: parentId
                });


            if (!parent) {

                return res.status(404).json({
                    success: false,
                    message: 'Parent not found'
                });

            }


            // --------------------------------------------------
            // VERIFY CHILD
            // --------------------------------------------------

            const isParentChild =
                Array.isArray(parent.children) &&
                parent.children.some(
                    id =>
                        id.toString() ===
                        studentId.toString()
                );


            if (!isParentChild) {

                return res.status(403).json({
                    success: false,
                    message:
                        'You are not authorized to view this receipt'
                });

            }


            // --------------------------------------------------
            // GET STUDENT
            // --------------------------------------------------

            const student =
                await students.findOne({
                    _id: studentId
                });


            if (!student) {

                return res.status(404).json({
                    success: false,
                    message: 'Student not found'
                });

            }


            // --------------------------------------------------
            // SCHOOL ID
            // --------------------------------------------------

            if (!ObjectId.isValid(parent.schoolID)) {

                return res.status(400).json({
                    success: false,
                    message: 'Invalid school ID'
                });

            }


            const schoolId =
                new ObjectId(parent.schoolID);


            // --------------------------------------------------
            // GET SCHOOL
            // --------------------------------------------------

            const school =
                await userBoard.findOne({
                    _id: schoolId
                });


            if (!school) {

                return res.status(404).json({
                    success: false,
                    message: 'School not found'
                });

            }


            // --------------------------------------------------
            // GET ACADEMIC SESSION
            // --------------------------------------------------

            const session =
                await academicSessions.findOne({
                    _id: sessionObjectId,
                    schoolID: schoolId
                });


            if (!session) {

                return res.status(404).json({
                    success: false,
                    message: 'Academic session not found'
                });

            }


            // --------------------------------------------------
            // GET PAYMENT HISTORY
            // --------------------------------------------------
            //
            // parentManualPayments is being used as the
            // installment payment ledger.
            //
            // Manual payments:
            // paymentMethod = manual
            //
            // Paystack payments:
            // paymentMethod = paystack
            // status = success
            //
            // --------------------------------------------------

            const paymentHistory =
                await parentManualPayments
                    .find({

                        schoolId: schoolId,

                        parentId: parentId,

                        studentId: studentId,

                        academicSessionId:
                            sessionObjectId,

                        term: term,

                        paymentType:
                            'school_fee',

                        $or: [

                            {
                                paymentMethod:
                                    'manual'
                            },

                            {
                                paymentMethod:
                                    'paystack',

                                status:
                                    'success'
                            }

                        ]

                    })
                    .sort({
                        paidAt: -1,
                        createdAt: -1
                    })
                    .toArray();


            // --------------------------------------------------
            // CALCULATE TOTAL
            // --------------------------------------------------

            const totalPaid =
                paymentHistory.reduce(
                    (total, payment) => {

                        return total +
                            Number(
                                payment.amount || 0
                            );

                    },
                    0
                );


            // --------------------------------------------------
            // RETURN DATA
            // --------------------------------------------------

            return res.json({

                success: true,

                parent: {

                    name:
                        parent.parentFullName ||
                        parent.parentName ||
                        parent.name ||
                        parent.phone ||
                        '-'

                },

                student: {

                    name:
                        student.studentFullName ||
                        '-',

                    admissionNumber:
                        student.admissionNumber ||
                        '-'

                },

                academicSession:
                    session.academicSession ||
                    session.sessionName ||
                    session.name ||
                    '-',

                term,

                payments:
                    paymentHistory,

                totalPaid

            });


        } catch (error) {

            console.error(
                'RECEIPT HISTORY ERROR:',
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    'Unable to load payment history'

            });

        }

    }
);


module.exports = router;