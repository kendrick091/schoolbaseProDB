const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../../schoolbaseProDB/db.js');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();

// LOGIN ROUTE
// router.get('/', (req, res) => {
//     res.render('auth/login')
// });

router.post('/', async (req, res) => {
  try {
    const { admissionNumber, studentName, studentToken } = req.body;

    // 1️⃣ Find student (DO NOT check token here)
    const student = await db.collection('students').findOne({
      admissionNumber: admissionNumber.trim(),
      studentFullName: studentName.trim(),
      isActive: true
    });

    if (!student) {
      return res.status(401).send(`
        <div>
        <h2>Invalid Admission Number, Name or Account Deactivated</h2>
        </div>`);
    }

    // 2️⃣ Compare token
    const tokenMatch = await bcrypt.compare(
      studentToken,
      student.tokenHash
    );

    if (!tokenMatch) {
      return res.status(401).send(`<h2>Invalid token.</h2>`);
    }

    // 3️⃣ Create JWT
    const jwtToken = jwt.sign(
      {
        id: student._id,
        role: 'student'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // 4️⃣ Set cookie
    res.cookie('token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.redirect('/studentDashBoard');

  } catch (err) {
    console.error('STUDENT LOGIN ERROR:', err);
    res.status(500).send('Server error');
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

module.exports = router;
