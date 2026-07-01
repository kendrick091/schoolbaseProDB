const express = require('express');
const {ObjectId} = require('mongodb')
const db = require('../../schoolbaseProDB/db.js')
const auth = require('../middleware/auth.js')

const router = express.Router();
const userBoard = db.collection('users')
const academicSession = db.collection('academicSessions')
const students = db.collection('students')
const classes = db.collection('classes')

router.get('/', auth, async (req, res) => {
  const school = await userBoard.findOne({
    _id: new ObjectId(req.user.id)
  });

  res.render('admin/setting', { 
    title: 'Settings Desk',
    school 
  });
});

router.post('/update', auth, async (req, res) => {
  const schoolId = new ObjectId(req.user.id);
  const {updatedName, updatedAddress, updatedEmail, resultView, remarks } = req.body;

  await db.collection('users').updateOne(
    { _id: schoolId },
    {
      $set: {
        schoolname: updatedName,
        address: updatedAddress,
        email: updatedEmail,
        resultView: Number(resultView),
        cumulativeView: Number(req.body.cumulativeView), //Select cumulative view value
        positionView: req.body.positionView === 'on',
        gradeRemarks: {
          A: remarks?.A || '',
          B: remarks?.B || '',
          C: remarks?.C || '',
          D: remarks?.D || '',
          F: remarks?.F || ''
        }
      }
    }
  );

  res.redirect('/settings');
});


module.exports = router;