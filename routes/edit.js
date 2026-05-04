const express = require('express');
const { ObjectId } = require('mongodb');
const db = require('../../schoolbaseProDB/db.js')
const auth = require('../middleware/auth.js')
const role = require('../middleware/roles.js')

const router = express.Router();
const students = db.collection('students')
const classes = db.collection('classes')
const teachers = db.collection('teachers')
const subjects = db.collection('subjects')
const sessions = db.collection('academicSessions')

//Edit student code
router.get('/:id', auth, async (req, res) => {
  const schoolId = new ObjectId(req.user.id)
  const classesList = await classes.find({schoolID: schoolId}).toArray();

  const student = await students.findOne({
    _id: new ObjectId(req.params.id),
    schoolID: schoolId
  });

  res.render('admin/edit', {
    showUser: schoolId,
    student,
    classesList,
    title: 'Edit Student',
    action: 'student'
  });
});

router.post('/:id', auth, async(req, res)=>{
  const schoolId = new ObjectId(req.user.id);

  await students.updateOne(
    {_id: new ObjectId(req.params.id), schoolID: schoolId},
  {$set: {
    studentFullName: req.body.studentFullName,
    gender: req.body.gender,
    studentClass: new ObjectId(req.body.studentClass)
  }
}
)
res.redirect('/admin/student')
})

//Edit teacher code
router.get('/teacher/:id', auth, async (req, res) => {
  const schoolId = new ObjectId(req.user.id)
  const classesList = await classes.find({schoolID: schoolId}).toArray();

  const teacher = await teachers.findOne({
    _id: new ObjectId(req.params.id),
    schoolID: schoolId
  });

  const subject = await subjects.find({schoolID: schoolId}).toArray();

  res.render('admin/edit', {
    showUser: schoolId,
    teacher,
    classesList,
    title: 'Edit Teacher',
    action: 'teacher',
    subject
  });
});

router.post('/teacher/:id', auth, async (req, res) => {
  const schoolID = new ObjectId(req.user.id);
  const teacherID = new ObjectId(req.params.id);

  let {
    teacherName,
    phoneNo,
    teacherRole,
    classAssigned,
    subjectAssigned
  } = req.body;

  // Force null logic
  if (teacherRole === 'classTeacher') {
    classAssigned = classAssigned
      ? new ObjectId(classAssigned)
      : null;
    subjectAssigned = null;
  }

  if (teacherRole === 'subjectTeacher') {
    subjectAssigned = subjectAssigned
      ? new ObjectId(subjectAssigned)
      : null;
    classAssigned = null;
  }

  await teachers.updateOne(
    { _id: teacherID, schoolID },
    {
      $set: {
        teacherName,
        phoneNo,
        teacherRole,
        classAssigned,
        subjectAssigned
      }
    }
  );

  res.redirect('/teachers');
});

router.get('/class/:id', auth, async (req, res) => {
  const schoolId = new ObjectId(req.user.id)
  const classInfo = await classes.findOne({
    _id: new ObjectId(req.params.id),
    schoolID: schoolId
  });
  res.render('admin/edit', {
    showUser: schoolId,
    classInfo,
    title: 'Edit Class',
    action: 'class'
  });
});

router.post('/class/:id', auth, async(req, res)=>{
  const schoolId = new ObjectId(req.user.id);
  await classes.updateOne(
    {_id: new ObjectId(req.params.id), schoolID: schoolId},
  {$set: {
    className: req.body.className
  }
}
)
res.redirect('/classes')
});

router.get('/subject/:id', auth, async (req, res) => {
  const schoolId = new ObjectId(req.user.id)
  const subjectInfo = await subjects.findOne({
    _id: new ObjectId(req.params.id),
    schoolID: schoolId
  });
  res.render('admin/edit', {
    showUser: schoolId,
    subjectInfo,
    title: 'Edit Class',
    action: 'subjects'
  });
});

router.post('/subject/:id', auth,  async (req, res)=>{
  const schoolId = new ObjectId(req.user.id);
  await subjects.updateOne(
    {_id: new ObjectId(req.params.id), schoolID: schoolId},
  {$set: {
    subjectName: req.body.subjectName
  }
}
)
res.redirect('/subjects')
})

router.get('/session/:id', auth, async(req, res)=>{
  const schoolId = new ObjectId(req.user.id);
  const session = await sessions.findOne({
    _id: new ObjectId(req.params.id),
    schoolID: schoolId
  });
   res.render('admin/edit', {
    showUser: schoolId,
    session,
    title: 'Edit Session',
    action: 'session'
  });
})

router.post('/session/:id', auth, async(req, res)=>{
  const schoolId = new ObjectId(req.user.id);
  await sessions.updateOne(
    {
      _id: new ObjectId(req.params.id),
      schoolID: schoolId
    },
    {$set: {
      academicSession: req.body.academicSessionInput,
      firstTermVacate: req.body.firstTermVacate,
      secondTermResume: req.body.secondTermResume,
      secondTermVacate: req.body.secondTermVacate,
      thirdTermResume: req.body.thirdTermResume,
      thirdTermVacate: req.body.thirdTermVacate,
      firstTermResume: req.body.nextSessionResume
    }
  }
)
res.redirect('/sessions')
})


module.exports = router;