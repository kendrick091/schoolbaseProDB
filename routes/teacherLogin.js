const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../../schoolbaseProDB/db.js');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();

//LOGIN ROUTE
// router.get('/', (req, res) => {
//     res.render('auth/login')
// });

router.post('/', async (req, res) => {
    const { teacherPhoneNo, teacherToken } = req.body;

    const teacher = await db.collection('teachers').findOne({
        phoneNo: teacherPhoneNo,
        token: teacherToken
    });

    if (!teacher) {
        return res.status(401).send('Invalid phone number or token');
    }

    const jwtToken = jwt.sign(
        {
            id: teacher._id,
            role: teacher.teacherRole
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );

    res.cookie('token', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });

    res.redirect('/teacherDashBoard');
});


router.get('/logout', (req, res) => {
    res.clearCookie('token'); // same name you used when setting it
    res.redirect('/');
});

module.exports = router;
