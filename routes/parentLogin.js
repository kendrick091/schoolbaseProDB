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
    const { parentPhoneNo, parentToken } = req.body;

    // 1️⃣ Find parent (DO NOT check token here)
    const parent = await db.collection('parents').findOne({
      phone: parentPhoneNo.trim()
    //   isActive: true
    /* The reason why isActive is commented is because it's not in 
     the parent database. */
    });

    if (!parent) {
      return res.status(401).send(`
        <div>
        <h2>Invalid Phone Number, Token or Account Deactivated</h2>
        </div>`);
    }

    // 2️⃣ Compare token
    const tokenMatch = await bcrypt.compare(
      parentToken,
      parent.tokenHash
    );

    if (!tokenMatch) {
      return res.status(401).send(`<h2>Invalid token.</h2>`);
    }

    // 3️⃣ Create JWT
    const jwtToken = jwt.sign(
      {
        id: parent._id,
        role: 'parent'
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

    res.redirect('/parentDashBoard');

  } catch (err) {
    console.error('PARENT LOGIN ERROR:', err);
    res.status(500).send('Server error');
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

module.exports = router;
