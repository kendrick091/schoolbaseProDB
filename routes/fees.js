const express = require('express');
const db = require('../../schoolbaseProDB/db.js')
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth.js')
const router = express.Router();
require('dotenv').config();

const axios = require('axios'); //for the payment verification

const student = db.collection('students');
const classes = db.collection('classes');
const academicSessions = db.collection('academicSessions')
const studentsCollection = db.collection('students');

router.get('/', auth, async (req, res) => {
    const schoolId = new ObjectId(req.user.id);

    const classList = await classes
        .find({ schoolID: schoolId })
        .toArray();

    const students = await student
        .find({ schoolID: schoolId, isActive: true, payment: false})
        .toArray();
    
      const FEE_PER_STUDENT = 350;
      const totalStudents = students.length;
      const totalSchoolFee = totalStudents * FEE_PER_STUDENT;

    // map classId → className
    const classMap = {};
    classList.forEach(cls => {
        classMap[cls._id.toString()] = cls.className;
    });

    const studentsWithClass = students.map(stu => ({
        ...stu,
        className: classMap[stu.studentClass?.toString()] || 'No Class'
    }));

    const pubKey = process.env.PAYSTACK_PUBLIC_KEY;

    //Academic session check
    const activeSession = await academicSessions.findOne({
      schoolID: schoolId,
      isActive: true
  });

  if (!activeSession) {
      return res.status(400).send("No active academic session found.");
  }
    const school = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });

    res.render('admin/fees', {
      title: 'Fee Management',
      students: studentsWithClass,
      schoolId: req.user.id,
      schoolEmail: school.email,   // <-- pass this
      paymentStatus: school.payment,
      totalStudents,
      feePerStudent: FEE_PER_STUDENT,
      totalSchoolFee: totalStudents * FEE_PER_STUDENT,
      paystackKey: pubKey
      // academicSessionId: activeSession._id.toString(),
      // academicSession: activeSession.academicSession
    });

});


router.post('/verify-school-payment', auth, async (req, res) => {

    const { reference, term } = req.body;

    const secKey = process.env.PAYSTACK_SECRET_KEY;

    try {

        // ==========================================
        // 1. VERIFY PAYMENT WITH PAYSTACK
        // ==========================================

        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${secKey}`
                }
            }
        );


        if (response.data.data.status !== 'success') {

            return res.json({
                success: false,
                message: 'Payment was not successful'
            });

        }


        // ==========================================
        // 2. GET SCHOOL
        // ==========================================

        const schoolId =
            new ObjectId(req.user.id);


        // ==========================================
        // 3. GET ACTIVE ACADEMIC SESSION
        // ==========================================

        const activeSession =
            await academicSessions.findOne({

                schoolID: schoolId,

                isActive: true

            });


        if (!activeSession) {

            return res.status(400).json({

                success: false,

                message:
                    'No active academic session found.'

            });

        }


        // ==========================================
        // 4. GET ACTIVE STUDENTS
        // ==========================================

        const students =
            await studentsCollection.find({

                schoolID: schoolId,

                isActive: true

            }).toArray();


        if (students.length === 0) {

            return res.status(400).json({

                success: false,

                message:
                    'No active students found.'

            });

        }


        // ==========================================
        // 5. FEE
        // ==========================================

        const FEE_PER_STUDENT = 350;

        const totalStudents =
            students.length;

        const totalSchoolFee =
            totalStudents * FEE_PER_STUDENT;


        // ==========================================
        // 6. CHECK BULK PAYMENT
        // ==========================================

        const existingBulkPayment =
            await db.collection('payments').findOne({

                schoolId: schoolId,

                academicSessionId:
                    activeSession._id,

                paymentType:
                    'school_bulk',

                term: term

            });


        if (existingBulkPayment) {

            return res.json({

                success: false,

                message:
                    `${term} has already been paid.`

            });

        }


        // ==========================================
        // 7. CREATE SCHOOL BULK PAYMENT RECORD
        // ==========================================

        await db.collection('payments').insertOne({

            reference: reference,

            paymentType: 'school_bulk',

            paymentMethod: 'paystack',

            schoolId: schoolId,

            academicSessionId:
                activeSession._id,

            academicSession:
                activeSession.academicSession,

            term: term,

            totalStudents:
                totalStudents,

            feePerStudent:
                FEE_PER_STUDENT,

            amount:
                totalSchoolFee,

            createdAt:
                new Date()

        });


        // ==========================================
        // 8. CREATE PAYMENT FOR EACH STUDENT
        // ==========================================

        for (const stu of students) {

            // Check if this particular
            // student already has payment

            const existingPayment =
                await db.collection('payments').findOne({

                    schoolId: schoolId,

                    studentId: stu._id,

                    academicSessionId:
                        activeSession._id,

                    paymentType:
                        'school_student',

                    term: term

                });


            // If already paid,
            // don't create another record

            if (existingPayment) {

                continue;

            }


            // Create payment record

            await db.collection('payments').insertOne({

                reference: reference,

                paymentType:
                    'school_student',

                paymentMethod:
                    'paystack',

                schoolId:
                    schoolId,

                studentId:
                    stu._id,

                academicSessionId:
                    activeSession._id,

                academicSession:
                    activeSession.academicSession,

                amount:
                    FEE_PER_STUDENT,

                term:
                    term,

                createdAt:
                    new Date()

            });


            // ======================================
            // UPDATE THIS STUDENT
            // ======================================

            await studentsCollection.updateOne(

                {
                    _id: stu._id
                },

                {
                    $set: {
                        payment: true
                    }
                }

            );

        }


        // ==========================================
        // 9. UPDATE SCHOOL PAYMENT
        // ==========================================

        await db.collection('users').updateOne(

            {
                _id: schoolId
            },

            {
                $set: {

                    payment: true,

                    paidAt: new Date(),

                    paymentReference:
                        reference

                }

            }

        );


        // ==========================================
        // 10. SUCCESS
        // ==========================================

        return res.json({

            success: true,

            message:
                'School fees payment verified successfully',

            totalStudents:
                totalStudents,

            totalAmount:
                totalSchoolFee

        });


    } catch (err) {

        console.error(
            'VERIFY SCHOOL PAYMENT ERROR:',
            err
        );

        return res.status(500).json({

            success: false,

            message:
                'Failed to verify school payment'

        });

    }

});

module.exports = router;