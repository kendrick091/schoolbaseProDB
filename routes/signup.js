const express = require('express');
const bcrypt = require('bcrypt')
const db = require('../../schoolbaseProDB/db.js');
const crypto = require('crypto');
require('dotenv').config();

const router = express.Router();

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/logos');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images allowed'), false);
        }
    }
});



//======= SIGNUP ==========
router.get('/', (req, res) =>{
    res.render('auth/signup');
});

router.post('/', upload.single('schoolLogo'), async (req, res) => {
    try {
        const { schoolname, email, address, password } = req.body;

        if (!schoolname || !email || !address || !password) {
            return res.send('All fields are required');
        }

        // check logo
        if (!req.file) {
            return res.send('School logo is required');
        }

        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return res.send('User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const token = crypto.randomBytes(4).toString('hex');

        await db.collection('users').insertOne({
            schoolname,
            email,
            address,
            payment: false,
            schoolLogo: `/uploads/logos/${req.file.filename}`, // ✅ saved path
            password: hashedPassword,
            pTokCard: `FizyTo(ken)${password}cardSch/${schoolname}`,
            token: token,
            positionView: false,
            resultView: 1,
            createdAt: new Date()
        });

        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;