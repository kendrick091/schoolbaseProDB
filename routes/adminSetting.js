const express = require('express');
const { ObjectId } = require('mongodb');
const db = require('../../schoolbaseProDB/db.js');
const auth = require('../middleware/auth.js');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const userBoard = db.collection('users');
const academicSession = db.collection('academicSessions');
const students = db.collection('students');
const classes = db.collection('classes');


// ======================================================
// STAMP + SIGNATURE FOLDER
// ======================================================

const stampFolder = path.join(
  __dirname,
  '../uploads/stamp'
);


// Make sure the folder exists

if (!fs.existsSync(stampFolder)) {

  fs.mkdirSync(
    stampFolder,
    {
      recursive: true
    }
  );

}


// ======================================================
// MULTER STORAGE
// ======================================================

const storage = multer.diskStorage({

  destination: function (req, file, cb) {

    cb(
      null,
      stampFolder
    );

  },


  filename: function (req, file, cb) {

    const schoolId = req.user.id;

    const extension =
      path.extname(file.originalname)
        .toLowerCase();


    const filename =
      `${schoolId}-stampSignature-${Date.now()}${extension}`;


    cb(
      null,
      filename
    );

  }

});


// ======================================================
// IMAGE FILTER
// ======================================================

const imageFilter = function (
  req,
  file,
  cb
) {

  const allowedTypes = [

    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'

  ];


  if (
    allowedTypes.includes(
      file.mimetype
    )
  ) {

    cb(
      null,
      true
    );

  } else {

    cb(
      new Error(
        'Only JPG, JPEG, PNG and WEBP images are allowed.'
      ),
      false
    );

  }

};


// ======================================================
// MULTER
// ======================================================

const uploadStampSignature =
  multer({

    storage: storage,

    fileFilter: imageFilter,

    limits: {

      // Maximum 5MB

      fileSize:
        5 * 1024 * 1024

    }

  }).single('stampSignature');



// ======================================================
// SETTINGS PAGE
// ======================================================

router.get(
  '/',
  auth,
  async (req, res) => {

    try {

      const school =
        await userBoard.findOne({

          _id:
            new ObjectId(
              req.user.id
            )

        });


      res.render(
        'admin/setting',
        {
          title: 'Settings Desk',
          school
        }
      );


    } catch (error) {

      console.error(
        'Error loading settings:',
        error
      );


      res.status(500).send(
        'Unable to load settings'
      );

    }

  }
);



// ======================================================
// UPDATE SETTINGS
// ======================================================

router.post(
  '/update',
  auth,
  uploadStampSignature,
  async (req, res) => {

    try {

      const schoolId =
        new ObjectId(
          req.user.id
        );


      const {

        updatedName,
        updatedAddress,
        updatedEmail,

        updatedBankAccount,
        updatedBankName,

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
        remarks

      } = req.body;


      // ==================================================
      // GET CURRENT SCHOOL
      // ==================================================

      const currentSchool =
        await userBoard.findOne({
          _id: schoolId
        });


      if (!currentSchool) {

        return res.status(404).send(
          'School not found'
        );

      }


      // ==================================================
      // SETTINGS TO UPDATE
      // ==================================================

      const updateData = {

        schoolname:
          updatedName,

        address:
          updatedAddress,

        email:
          updatedEmail,

        bankAccount:
          updatedBankAccount || '',

        bankName:
          updatedBankName || '',


        primaryFeeTerm1:
          parseFloat(
            updatedPrimaryFee1
          ) || 0,

        primaryFeeTerm2:
          parseFloat(
            updatedPrimaryFee2
          ) || 0,

        primaryFeeTerm3:
          parseFloat(
            updatedPrimaryFee3
          ) || 0,


        juniorSecondaryFeeTerm1:
          parseFloat(
            updatedJuniorSecondaryFee1
          ) || 0,

        juniorSecondaryFeeTerm2:
          parseFloat(
            updatedJuniorSecondaryFee2
          ) || 0,

        juniorSecondaryFeeTerm3:
          parseFloat(
            updatedJuniorSecondaryFee3
          ) || 0,


        seniorSecondaryFeeTerm1:
          parseFloat(
            updatedSeniorSecondaryFee1
          ) || 0,

        seniorSecondaryFeeTerm2:
          parseFloat(
            updatedSeniorSecondaryFee2
          ) || 0,

        seniorSecondaryFeeTerm3:
          parseFloat(
            updatedSeniorSecondaryFee3
          ) || 0,


        resultView:
          Number(resultView),

        cumulativeView:
          Number(
            req.body.cumulativeView
          ),

        positionView:
          req.body.positionView === 'on',


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

        }

      };


      // ==================================================
      // STAMP + SIGNATURE PHOTO
      // ==================================================

      if (req.file) {

        console.log(
          'Stamp/signature uploaded:',
          req.file.filename
        );


        // -----------------------------------------------
        // Delete old stamp/signature picture
        // -----------------------------------------------

        if (
          currentSchool.stampSignature
        ) {

          const oldFile =
            path.join(
              stampFolder,
              currentSchool.stampSignature
            );


          if (
            fs.existsSync(
              oldFile
            )
          ) {

            fs.unlinkSync(
              oldFile
            );

            console.log(
              'Old stamp/signature deleted'
            );

          }

        }


        // -----------------------------------------------
        // Save new filename to MongoDB
        // -----------------------------------------------

        updateData.stampSignature =
          req.file.filename;

      }


      // ==================================================
      // UPDATE DATABASE
      // ==================================================

      await userBoard.updateOne(

        {
          _id:
            schoolId
        },

        {
          $set:
            updateData
        }

      );


      // ==================================================
      // REDIRECT
      // ==================================================

      res.redirect(
        '/settings'
      );


    } catch (error) {

      console.error(
        'Error updating settings:',
        error
      );


      res.status(500).send(
        'Unable to update settings'
      );

    }

  }
);


module.exports = router;