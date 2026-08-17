const express = require('express');
const { ObjectId } = require('mongodb');
const db = require('../../schoolbaseProDB/db.js');
const auth = require('../middleware/auth.js');
const bcrypt = require('bcrypt');

const router = express.Router();

const userBoard = db.collection('users');
const parents = db.collection('parents');
const students = db.collection('students');
const classes = db.collection('classes');
const payments = db.collection('payments');
const academicSessions = db.collection('academicSessions');

router.get('/', auth, async (req, res) => {

    const parentId = new ObjectId(req.user.id);
    const parent = await parents.findOne({_id: parentId});

    if (!parent) {
        return res.status(404).send('Parent not found');
    }
    const schoolId = new ObjectId(parent.schoolID);

    const school = await userBoard.findOne({_id: schoolId});

    const academicSessionData = await academicSessions
    .findOne({schoolID: schoolId, isActive: true});

    const studentList = await students.find({
        schoolID: schoolId
    }).sort({
        studentFullName:1
    }).toArray();

    

    res.render('parent/dashBoard', {
        title: 'Parent Dashboard',
        school,
        parent,
        students: studentList,
        session: academicSessionData
    });
});

// ==========================================


// ==========================================
// GET SCHOOL FEES PAGE
// ==========================================

router.get('/fees/:studentId', auth, async (req, res) => {

    try {

        // ==========================
        // GET STUDENT ID
        // ==========================

        const studentId =
            new ObjectId(req.params.studentId);


        // ==========================
        // GET PARENT
        // ==========================

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


        // ==========================
        // GET STUDENT
        // ==========================

        const student =
            await students.findOne({
                _id: studentId
            });


        if (!student) {
            return res.status(404).send(
                'Student not found'
            );
        }


        // ==========================
        // CHECK THAT STUDENT
        // BELONGS TO PARENT
        // ==========================

        const isParentChild =
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


        // ==========================
        // GET SCHOOL
        // ==========================

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


        // ==========================
        // GET STUDENT CLASS
        // ==========================

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


        // ==========================
        // GET ACTIVE ACADEMIC SESSION
        // ==========================

        const currentSession =
            await academicSessions.findOne({

                schoolID: schoolId,

                isActive: true

            });


        if (!currentSession) {

            return res.status(404).send(
                'No active academic session found'
            );

        }


        // ==========================
        // GET CLASS NAME
        // ==========================

        const className =
            studentClass.className
                .toLowerCase()
                .trim();


        console.log(
            'Student class:',
            studentClass.className
        );


        // ==========================
        // DETERMINE SCHOOL SECTION
        // ==========================

        let schoolSection;


        if (
            className.startsWith('basic') ||
            className.startsWith('primary')
        ) {

            schoolSection = 'primary';

        }

        else if (
            className.startsWith('jss') ||
            className.includes('junior')
        ) {

            schoolSection = 'juniorSecondary';

        }

        else if (
            className.startsWith('ss') ||
            className.includes('senior')
        ) {

            schoolSection = 'seniorSecondary';

        }

        else {

            return res.status(400).send(
                `Unable to determine school section for ${studentClass.className}`
            );

        }


        // ==========================
        // GET SCHOOL FEES
        // ==========================

        const fees = {

            term1:
                school[
                    `${schoolSection}FeeTerm1`
                ],

            term2:
                school[
                    `${schoolSection}FeeTerm2`
                ],

            term3:
                school[
                    `${schoolSection}FeeTerm3`
                ]

        };


        console.log('School section:', schoolSection);
        console.log('Fees:', fees);


        // ==========================
        // GET PAYMENTS
        // ==========================

        const studentPayments =
            await payments.find({

                studentId:
                    student._id,

                schoolId:
                    schoolId,

                academicSessionId:
                    currentSession._id,

                paymentType:
                    'school_student'

            }).toArray();


        // ==========================
        // RENDER PAGE
        // ==========================

        res.render('parent/fees', {

            title: 'School Fees',

            school,

            parent,

            student,

            studentClass,

            schoolSection,

            session: currentSession,

            fees,

            payments: studentPayments

        });


    } catch (error) {

        console.error(
            'SCHOOL FEES ERROR:',
            error
        );

        res.status(500).send(
            'Failed to load school fees'
        );

    }

});


// ==========================================
// START PAYSTACK SCHOOL FEE PAYMENT
// ==========================================

router.post('/pay-fees/:studentId', auth, async (req, res) => {

    try {

        const studentId =
            new ObjectId(req.params.studentId);

        const { term } = req.body;


        // ==========================
        // CHECK TERM
        // ==========================

        if (!['term1', 'term2', 'term3'].includes(term)) {

            return res.status(400).send(
                'Invalid term'
            );

        }


        // ==========================
        // GET PARENT
        // ==========================

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


        // ==========================
        // GET STUDENT
        // ==========================

        const student =
            await students.findOne({
                _id: studentId
            });


        if (!student) {

            return res.status(404).send(
                'Student not found'
            );

        }


        // ==========================
        // MAKE SURE STUDENT
        // BELONGS TO PARENT
        // ==========================

        const isParentChild =
            parent.children.some(
                id =>
                    id.toString() ===
                    student._id.toString()
            );


        if (!isParentChild) {

            return res.status(403).send(
                'You are not authorized to pay for this student'
            );

        }


        // ==========================
        // GET SCHOOL
        // ==========================

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


        // ==========================
        // GET ACTIVE SESSION
        // ==========================

        const currentSession =
            await academicSession.findOne({

                schoolID: schoolId,

                isActive: true

            });


        if (!currentSession) {

            return res.status(404).send(
                'No active academic session found'
            );

        }


        // ==========================
        // CHECK IF ALREADY PAID
        // ==========================

        const existingPayment =
            await db.collection('payments').findOne({

                studentId:
                    student._id,

                schoolId:
                    schoolId,

                academicSessionId:
                    currentSession._id,

                term:
                    term,

                paymentType:
                    'school_student'

            });


        if (existingPayment) {

            return res.status(400).send(
                'This term has already been paid'
            );

        }


        // ==========================
        // PAYMENT AMOUNT
        // ==========================

        const FEE_PER_STUDENT = 350;

        // Paystack uses the smallest
        // currency unit.
        //
        // ₦350 = 35,000 kobo

        const amount =
            FEE_PER_STUDENT * 100;


        // ==========================
        // CREATE UNIQUE REFERENCE
        // ==========================

        const reference =
            `SB-${Date.now()}-${student._id}`;


        // ==========================
        // PAYSTACK INITIALIZE
        // ==========================

        const paystackResponse =
            await fetch(
                'https://api.paystack.co/transaction/initialize',
                {

                    method: 'POST',

                    headers: {

                        Authorization:
                            `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,

                        'Content-Type':
                            'application/json'

                    },

                    body: JSON.stringify({

                        email:
                            parent.email,

                        amount:
                            amount,

                        currency:
                            'NGN',

                        reference:
                            reference,

                        callback_url:
                            `${process.env.APP_URL}/parentDashBoard/paystack/callback`,

                        metadata: {

                            studentId:
                                student._id.toString(),

                            schoolId:
                                schoolId.toString(),

                            academicSessionId:
                                currentSession._id.toString(),

                            term:
                                term,

                            parentId:
                                parent._id.toString()

                        }

                    })

                }
            );


        const paystackData =
            await paystackResponse.json();


        if (
            !paystackResponse.ok ||
            !paystackData.status
        ) {

            console.error(
                'Paystack initialize error:',
                paystackData
            );

            return res.status(500).send(
                'Unable to initialize payment'
            );

        }


        // ==========================
        // SEND PARENT TO PAYSTACK
        // ==========================

        res.redirect(
            paystackData.data.authorization_url
        );


    } catch (error) {

        console.error(error);

        res.status(500).send(
            'Failed to initialize payment'
        );

    }

});

// ==========================================
// PAYSTACK CALLBACK
// ==========================================

router.get(
    '/paystack/callback',
    async (req, res) => {

        try {

            const reference =
                req.query.reference;


            if (!reference) {

                return res.status(400).send(
                    'Payment reference missing'
                );

            }


            // ==========================
            // VERIFY PAYMENT WITH PAYSTACK
            // ==========================

            const response =
                await fetch(
                    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
                    {

                        method: 'GET',

                        headers: {

                            Authorization:
                                `Bearer ${process.env.PAYSTACK_SECRET_KEY}`

                        }

                    }
                );


            const result =
                await response.json();


            if (
                !response.ok ||
                !result.status
            ) {

                console.error(
                    'Paystack verification error:',
                    result
                );

                return res.status(400).send(
                    'Unable to verify payment'
                );

            }


            // IMPORTANT:
            // result.status means the API request worked.
            //
            // result.data.status tells us
            // whether the customer actually paid.

            if (
                result.data.status !== 'success'
            ) {

                return res.status(400).send(
                    'Payment was not successful'
                );

            }


            const payment =
                result.data;


            // ==========================
            // GET METADATA
            // ==========================

            const metadata =
                payment.metadata;


            if (!metadata) {

                return res.status(400).send(
                    'Payment information missing'
                );

            }


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
            // CHECK DUPLICATE PAYMENT
            // ==========================

            const existingPayment =
                await db.collection('payments').findOne({

                    reference:
                        payment.reference

                });


            if (existingPayment) {

                return res.redirect(
                    `/parentDashBoard/receipt/${studentId}`
                );

            }


            // ==========================
            // CHECK TERM PAYMENT
            // ==========================

            const existingTermPayment =
                await db.collection('payments').findOne({

                    studentId:
                        studentId,

                    schoolId:
                        schoolId,

                    academicSessionId:
                        academicSessionId,

                    term:
                        term,

                    paymentType:
                        'school_student'

                });


            if (existingTermPayment) {

                return res.redirect(
                    `/parentDashBoard/receipt/${studentId}`
                );

            }


            // ==========================
            // GET SESSION
            // ==========================

            const currentSession =
                await academicSession.findOne({

                    _id:
                        academicSessionId,

                    schoolID:
                        schoolId

                });


            if (!currentSession) {

                return res.status(404).send(
                    'Academic session not found'
                );

            }


            // ==========================
            // CREATE PAYMENT RECORD
            // ==========================

            await db.collection('payments').insertOne({

                reference:
                    payment.reference,

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
                    currentSession.academicSession,

                amount:
                    payment.amount / 100,

                term:
                    term,

                receiptNumber:
                    payment.receipt_number,

                paidAt:
                    payment.paid_at
                        ? new Date(payment.paid_at)
                        : new Date(),

                channel:
                    payment.channel,

                createdAt:
                    new Date()

            });


            // ==========================
            // UPDATE STUDENT PAYMENT
            // ==========================

            await students.updateOne(

                {
                    _id:
                        studentId
                },

                {
                    $set: {
                        payment: true
                    }
                }

            );


            // ==========================
            // PAYMENT SUCCESS
            // ==========================

            res.redirect(
                `/parentDashBoard/receipt/${studentId}`
            );


        } catch (error) {

            console.error(error);

            res.status(500).send(
                'Payment verification failed'
            );

        }

    }
);


// ==========================================
// PAYSTACK CALLBACK
// ==========================================
// GET RECEIPT PAGE
router.get('/receipt/:studentId', auth, async (req, res) => {
    const studentId = new ObjectId(req.params.studentId);
    const student = await students.findOne({_id: studentId});

    if (!student) {
        return res.status(404).send('Student not found');
    }

    res.render('parent/receipt', {
        title: 'Receipt',
        student
    });
});

module.exports = router;