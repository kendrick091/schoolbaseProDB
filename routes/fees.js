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

router.get('/', auth, async (req, res) => {
    const schoolId = new ObjectId(req.user.id);

    const classList = await classes
        .find({ schoolID: schoolId })
        .toArray();

    const students = await student
        .find({ schoolID: schoolId, isActive: true })
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
    const sessions = await academicSessions
  .find({ schoolID: new ObjectId(schoolId) })
  .toArray();
    const school = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });

    res.render('admin/fees', {
      title: 'Fee Management',
      schoolId: req.user.id,
      schoolEmail: school.email,   // <-- pass this
      paymentStatus: school.payment,
      totalStudents,
      feePerStudent: FEE_PER_STUDENT,
      totalSchoolFee: totalStudents * FEE_PER_STUDENT,
      paystackKey: pubKey
    });

});


router.post('/verify-school-payment', auth, async (req, res) => {
  const { reference } = req.body;
 const secKey = process.env.PAYSTACK_SECRET_KEY;
  try {
    // 1️⃣ Verify payment with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${secKey}`
        }
      }
    );

    if (response.data.data.status !== 'success') {
      return res.json({ success: false, message: 'Payment not successful' });
    }

    const schoolId = req.user.id; // assuming auth sets req.user

    // 2️⃣ Update the school's payment field to true
    await db.collection('users').updateOne(
      { _id: new ObjectId(schoolId) },
      {
        $set: {
          payment: true,
          paidAt: new Date(),
          paymentReference: reference
        }
      }
    );

    // 3️⃣ Optionally save a payment record for audit
    await db.collection('payments').insertOne({
      reference,
      schoolId: new ObjectId(schoolId),
      amount: response.data.data.amount / 100, // Paystack returns in kobo
      paymentType: 'school_bulk',
      createdAt: new Date()
    });

    return res.json({ success: true });

  } catch (err) {
    console.error('VERIFY SCHOOL PAYMENT ERROR:', err);
    return res.status(500).json({ success: false });
  }
});

module.exports = router;