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
  const {
    updatedName, updatedAddress, updatedEmail,
    updatedBankAccount, updatedBankName,
    updatedPrimaryFee1, updatedPrimaryFee2, updatedPrimaryFee3,
    updatedJuniorSecondaryFee1, updatedJuniorSecondaryFee2, updatedJuniorSecondaryFee3,
    updatedSeniorSecondaryFee1, updatedSeniorSecondaryFee2, updatedSeniorSecondaryFee3,
    resultView, remarks 
  } = req.body;

  await db.collection('users').updateOne(
    { _id: schoolId },
    {
      $set: {
        schoolname: updatedName,
        address: updatedAddress,
        email: updatedEmail,
        bankAccount: updatedBankAccount || '',
        bankName: updatedBankName || '',
        primaryFeeTerm1: parseFloat(updatedPrimaryFee1) || 0,
        primaryFeeTerm2: parseFloat(updatedPrimaryFee2) || 0,
        primaryFeeTerm3: parseFloat(updatedPrimaryFee3) || 0,
        juniorSecondaryFeeTerm1: parseFloat(updatedJuniorSecondaryFee1) || 0,
        juniorSecondaryFeeTerm2: parseFloat(updatedJuniorSecondaryFee2) || 0,
        juniorSecondaryFeeTerm3: parseFloat(updatedJuniorSecondaryFee3) || 0,

        seniorSecondaryFeeTerm1: parseFloat(updatedSeniorSecondaryFee1) || 0,
        seniorSecondaryFeeTerm2: parseFloat(updatedSeniorSecondaryFee2) || 0,
        seniorSecondaryFeeTerm3: parseFloat(updatedSeniorSecondaryFee3) || 0,
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