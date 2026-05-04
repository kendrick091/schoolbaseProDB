const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../../schoolbaseProDB/db.js');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();

// SHOW LOGIN PAGE
router.get('/', async (req, res) => {

    const superAdminExists = await db.collection('superAdmin').findOne({
        role: 'superAdmin'
    });

    res.render('superAdmin/login', { firstSetup: !superAdminExists });
});


// LOGIN OR CREATE SUPER ADMIN
router.post('/', async (req, res) => {

    const { userName, password } = req.body;

    // CHECK IF SUPER ADMIN EXISTS
    const existingSuperAdmin = await db.collection('superAdmin').findOne({
        role: 'superAdmin'
    });

    // 🔹 IF NO SUPER ADMIN → CREATE ONE
    if (!existingSuperAdmin) {

        const hashedPassword = await bcrypt.hash(password, 10);

        const newSuperAdmin = {
            userName,
            password: hashedPassword,
            role: 'superAdmin',
            createdAt: new Date(),
            supPass: password + '123Salt#####xx love'
        };

        const result = await db.collection('superAdmin').insertOne(newSuperAdmin);

        const token = jwt.sign(
            { id: result.insertedId },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.cookie('token', token, { httpOnly: true });

        return res.redirect('/superAdminDashboard');
    }

    // 🔹 IF SUPER ADMIN EXISTS → LOGIN ONLY
    const user = await db.collection('superAdmin').findOne({
        userName,
        role: 'superAdmin'
    });

    if (!user) return res.status(401).send('Invalid username or password');

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).send("Invalid credentials");

    const token = jwt.sign(
        { id: user._id,
            role: user.role   // ✅ ADD THIS
         },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );

    res.cookie('token', token, { httpOnly: true });

    res.redirect('/superAdminDashboard');
});


// LOGOUT
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
});

module.exports = router;