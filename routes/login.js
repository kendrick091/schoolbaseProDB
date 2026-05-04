const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../../schoolbaseProDB/db.js');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();

//LOGIN ROUTE
router.get('/', (req, res) => {
    res.render('auth/login')
});

router.post('/adminLogin', async (req, res) => {
    const user = await db.collection('users').findOne({
        email: req.body.email
    });
    if (!user) return res.status(401).send('Invalid email or password');
    const match = await bcrypt.compare(req.body.password, user.password)
    if (!match) return res.send("Invalid Credentials");

    const token = jwt.sign(
        {id: user._id},
        process.env.JWT_SECRET,
        {expiresIn: '1d'}
    );

    res.cookie('token', token, {httpOnly: true});
    res.redirect(`/admin`);
})

router.get('/logout', (req, res) => {
    res.clearCookie('token'); // same name you used when setting it
    res.redirect('/');
});

module.exports = router;
