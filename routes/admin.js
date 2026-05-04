const express = require('express');
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth');
const role = require('../middleware/roles');
const db = require('../../schoolbaseProDB/db.js');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt')

const router = express.Router();
const userBoard = db.collection('users');
const classes = db.collection('classes')
const students = db.collection('students');
const academicSession = db.collection('academicSessions')
const teacher = db.collection('teachers');
const subjects = db.collection('subjects');

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

// ======= ADMIN DASHBOARD ==========

router.get('/', auth, async (req, res) => {
  const schoolId = new ObjectId(req.user.id);
  const showUser = await userBoard.findOne({_id: schoolId});

  const listClass = await classes.find({schoolID: schoolId}).toArray()
  const listSubject = await db.collection('subjects')
  .find({schoolID: schoolId}).toArray();
  
   // ✅ Get ACTIVE academic session
    const session = await academicSession.findOne({ 
      schoolID: schoolId,
      isActive: true });

  const classCount = await classes.countDocuments({schoolID: schoolId});
  const studentCount = await students.countDocuments({schoolID: schoolId,
    isActive: true});
  const totalBoys = await students.countDocuments({schoolID: schoolId,
    isActive: true, gender: 'male'})
  const totalGirls = await students.countDocuments({schoolID: schoolId, 
    isActive: true, gender: 'female'})
  
  const teacherCount = await db.collection('teachers')
  .countDocuments({schoolID: schoolId});
  const maleTeachers = await db.collection('teachers')
  .countDocuments({schoolID: schoolId, gender: 'male'});
  const femaleTeachers = await db.collection('teachers')
  .countDocuments({schoolID: schoolId, gender: 'female'});
  
  const subjectCount = await db.collection('subjects')
  .countDocuments({schoolID: schoolId});

  res.render('admin/index', {
    showUser,
    listClass,
    listSubject,
    classCount,
    studentCount,
    teacherCount,
    subjectCount,
    session,
    totalBoys,
    totalGirls,
    maleTeachers,
    femaleTeachers,
    title: 'Admin Dashboard'
  });
});

router.post(
  '/update-logo',
  auth,
  upload.single('schoolLogo'),
  async (req, res) => {
    try {
        if (!req.file) {
            return res.redirect('/admin');
        }

        const schoolId = new ObjectId(req.user.id);

        await db.collection('users').updateOne(
            { _id: schoolId },
            {
                $set: {
                    schoolLogo: `/uploads/logos/${req.file.filename}`,
                    updatedAt: new Date()
                }
            }
        );

        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating logo');
    }
});


router.post('/addSubject', auth,  async (req, res)=>{
  const schoolId = new ObjectId(req.user.id);
  const subjects = db.collection('subjects');
  await subjects.insertOne({
    subjectName: req.body.subjectName,
    schoolID: schoolId,
    createdAt: new Date()
  });
  res.redirect('/admin')
})

router.post('/addClass', auth, async (req, res)=>{
  const classes = db.collection('classes');
  await classes.insertOne({
    className: req.body.className,
    schoolID: new ObjectId(req.body.schoolID),
    createdAt: new Date()
  });
  res.redirect('/admin')
})

router.post('/addSession', auth, async (req, res) => {
  try {
    const academicSessions = db.collection('academicSessions');
    const students = db.collection('students');

    const schoolId = new ObjectId(req.user.id);

    // 1️⃣ Deactivate old session
    await academicSessions.updateMany(
      { schoolID: schoolId, isActive: true },
      { $set: { isActive: false } }
    );

    // 2️⃣ Insert new session
    const newSession = {
      schoolID: schoolId,
      academicSession: req.body.academicSession,
      firstTermVacate: '',
      secondTermResume: '',
      secondTermVacate: '',
      thirdTermResume: '',
      thirdTermVacate: '',
      firstTermResume: '',
      isActive: true,
      createdAt: new Date()
    };

    const { insertedId } = await academicSessions.insertOne(newSession);

    // 3️⃣ Update students with new session
    await students.updateMany(
      { schoolID: schoolId },
      { $set: { academicSessionId: insertedId } }
    );

    res.redirect('/admin');

  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating academic session');
  }
});



router.post('/addTeacher', auth, async (req, res) => {
  const schoolID = new ObjectId(req.user.id);

  let {
    teacherName,
    phoneNo,
    gender,
    teacherRole,
    classAssigned,
    subjectAssigned,
    token
  } = req.body;

  // Validation
  if (!teacherRole) {
    return res.status(400).send('Teacher role is required');
  }

  // Role-based logic
  if (teacherRole === 'classTeacher') {
    if (!classAssigned) {
      return res.status(400).send('Class Teacher must have a class');
    }
    classAssigned = new ObjectId(classAssigned);
    subjectAssigned = null;
  }

  if (teacherRole === 'subjectTeacher') {
    if (!subjectAssigned) {
      return res.status(400).send('Subject Teacher must have a subject');
    }
    subjectAssigned = new ObjectId(subjectAssigned);
    classAssigned = null;
  }

  // INSERT (not update)
  await teacher.insertOne({
    teacherName,
    phoneNo,
    gender,
    teacherRole,
    classAssigned,
    subjectAssigned,
    schoolID,
    token,
    createdAt: new Date()
  });

  res.redirect('/admin');
});


//Add student
router.post('/addStudent', auth, async (req, res) => {
  try {
    const students = db.collection('students');
    const academicSessions = db.collection('academicSessions');

    const schoolId = new ObjectId(req.user.id);

    const activeSession = await academicSessions.findOne({
      schoolID: schoolId,
      isActive: true
    });

    if (!activeSession) {
      return res.send(`
        <script>
          alert("No academic session yet. Please add an academic session");
          window.location.href = "/admin";
        </script>
      `);
    }

    const year = new Date().getFullYear();

    const lastStudent = await students.find({ schoolID: schoolId })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    let nextNumber = 1;
    if (lastStudent.length && lastStudent[0].admissionNumber) {
      nextNumber = parseInt(
        lastStudent[0].admissionNumber.split('/').pop()
      ) + 1;
    }

    const admissionNumber = `SB/${year}/${String(nextNumber).padStart(4, '0')}`;

    if (!req.body.token) {
      return res.status(400).send('Student token is required');
    }

    const tokenHash = await bcrypt.hash(req.body.token, 10);

    const tShozakNo = `ESjk:/${req.body.token}EEzop.Show Ins`;

    const student = {
      admissionNumber,
      studentFullName: req.body.studentFullName.trim(),
      gender: req.body.gender,
      studentClass: new ObjectId(req.body.studentClass),
      schoolID: schoolId,
      academicSessionId: activeSession._id,
      payment: false,
      tokenHash,
      tShozakNo,
      isActive: true,
      createdAt: new Date()
    };

    await students.insertOne(student);

    res.redirect('/admin');

  } catch (err) {
    console.error('ADD STUDENT ERROR:', err);
    res.status(500).send(err.message);
  }
});

module.exports = router;
