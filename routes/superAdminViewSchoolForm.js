// ======================================================
// SUPER ADMIN - VIEW / UPDATE SCHOOL SETTINGS
// ======================================================

const express = require('express');
const { ObjectId } = require('mongodb');

const auth = require('../middleware/auth');
const role = require('../middleware/roles');
const db = require('../../schoolbaseProDB/db.js');

const router = express.Router();

const userBoard = db.collection('users');


// ======================================================
// VIEW SCHOOL
// GET /superAdminViewSchoolForm/:schoolId
// ======================================================

router.get(
  '/:schoolId',
  auth,
  role('superAdmin'),
  async (req, res) => {

    try {

      const { schoolId } = req.params;

      // Validate ObjectId
      if (!ObjectId.isValid(schoolId)) {
        return res.status(400).send('Invalid school ID');
      }

      const school = await userBoard.findOne({
        _id: new ObjectId(schoolId)
      });

      if (!school) {
        return res.status(404).send('School not found');
      }

      res.render(
        'superAdmin/viewSchoolForm',
        {
          title: 'View School Form',
          school
        }
      );

    } catch (error) {

      console.error(
        'Error loading school:',
        error
      );

      res.status(500).send(
        'Internal Server Error'
      );
    }

  }
);


// ======================================================
// UPDATE SCHOOL SETTINGS
// POST /superAdminViewSchoolForm/update/:schoolId
// ======================================================

router.post(
  '/update/:schoolId',
  auth,
  role('superAdmin'),
  async (req, res) => {

    try {

      console.log('====================================');
      console.log('SUPER ADMIN UPDATE SCHOOL');
      console.log('School ID:', req.params.schoolId);
      console.log('Logged in user:', req.user);
      console.log('Form data:', req.body);
      console.log('====================================');


      // ==================================================
      // GET SCHOOL ID FROM URL
      // ==================================================

      const { schoolId } = req.params;


      // ==================================================
      // CHECK SCHOOL ID
      // ==================================================

      if (!ObjectId.isValid(schoolId)) {

        console.log('INVALID SCHOOL ID:', schoolId);

        return res.status(400).send(
          'Invalid school ID'
        );

      }


      const schoolObjectId =
        new ObjectId(schoolId);


      // ==================================================
      // FIND SCHOOL
      // ==================================================

      const currentSchool =
        await userBoard.findOne({
          _id: schoolObjectId
        });


      if (!currentSchool) {

        console.log(
          'SCHOOL NOT FOUND:',
          schoolId
        );

        return res.status(404).send(
          'School not found'
        );

      }


      console.log(
        'SCHOOL FOUND:',
        currentSchool.schoolname
      );


      // ==================================================
      // FORM DATA
      // ==================================================

      const {
        updatedName,
        updatedAddress,
        updatedEmail,

        updatedBankAccount,
        updatedBankName,
        updatedPaystackSubaccountCode,
        updatedVersion,

        updatedPrimaryFee1,
        updatedPrimaryFee2,
        updatedPrimaryFee3,

        updatedJuniorSecondaryFee1,
        updatedJuniorSecondaryFee2,
        updatedJuniorSecondaryFee3,

        updatedSeniorSecondaryFee1,
        updatedSeniorSecondaryFee2,
        updatedSeniorSecondaryFee3,

        resultView,
        cumulativeView,
        positionView,

        remarks

      } = req.body;


      // ==================================================
      // RESULT VIEW
      // ==================================================

      let selectedResultView =
        Number(resultView);

      if (![1, 2, 3].includes(selectedResultView)) {

        selectedResultView =
          currentSchool.resultView || 1;

      }


      // ==================================================
      // CUMULATIVE VIEW
      // ==================================================

      let selectedCumulativeView =
        Number(cumulativeView);

      if (![1, 2, 3, 4].includes(selectedCumulativeView)) {

        selectedCumulativeView =
          currentSchool.cumulativeView || 1;

      }


      // ==================================================
      // UPDATE DATA
      // ==================================================

      const updateData = {

        schoolname:
          (updatedName || '').trim(),

        address:
          (updatedAddress || '').trim(),

        email:
          (updatedEmail || '').trim(),


        bankAccount:
          (updatedBankAccount || '').trim(),

        bankName:
          (updatedBankName || '').trim(),


        paystackSubaccountCode:
          (updatedPaystackSubaccountCode || '').trim(),

        version:
          (updatedVersion || '').trim(),

        primaryFeeTerm1:
          parseFloat(updatedPrimaryFee1) || 0,

        primaryFeeTerm2:
          parseFloat(updatedPrimaryFee2) || 0,

        primaryFeeTerm3:
          parseFloat(updatedPrimaryFee3) || 0,


        juniorSecondaryFeeTerm1:
          parseFloat(updatedJuniorSecondaryFee1) || 0,

        juniorSecondaryFeeTerm2:
          parseFloat(updatedJuniorSecondaryFee2) || 0,

        juniorSecondaryFeeTerm3:
          parseFloat(updatedJuniorSecondaryFee3) || 0,


        seniorSecondaryFeeTerm1:
          parseFloat(updatedSeniorSecondaryFee1) || 0,

        seniorSecondaryFeeTerm2:
          parseFloat(updatedSeniorSecondaryFee2) || 0,

        seniorSecondaryFeeTerm3:
          parseFloat(updatedSeniorSecondaryFee3) || 0,


        resultView:
          selectedResultView,

        cumulativeView:
          selectedCumulativeView,

        positionView:
          positionView === 'on',


        gradeRemarks: {

          A:
            remarks?.A || '',

          B:
            remarks?.B || '',

          C:
            remarks?.C || '',

          D:
            remarks?.D || '',

          F:
            remarks?.F || ''

        },


        updatedAt:
          new Date()

      };


      console.log(
        'UPDATE DATA:',
        updateData
      );


      // ==================================================
      // UPDATE SCHOOL
      // ==================================================

      const result =
        await userBoard.updateOne(

          {
            _id: schoolObjectId
          },

          {
            $set: updateData
          }

        );


      console.log(
        'MONGODB UPDATE RESULT:',
        result
      );


      // ==================================================
      // CHECK MATCH
      // ==================================================

      if (result.matchedCount === 0) {

        return res.status(404).send(
          'School was not found in database'
        );

      }


      // ==================================================
      // SUCCESS
      // ==================================================

      console.log(
        'SCHOOL UPDATED SUCCESSFULLY'
      );


      res.redirect(
        `/superAdminViewSchoolForm/${schoolId}`
      );


    } catch (error) {

      console.error(
        '===================================='
      );

      console.error(
        'SUPER ADMIN UPDATE SCHOOL ERROR'
      );

      console.error(
        error
      );

      console.error(
        '===================================='
      );


      // TEMPORARILY SHOW REAL ERROR
      res.status(500).send(
        `Unable to update school settings: ${error.message}`
      );

    }

  }
);


module.exports = router;