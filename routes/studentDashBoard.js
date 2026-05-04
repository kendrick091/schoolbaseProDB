const express = require('express');
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth');
const role = require('../middleware/roles');
const db = require('../../schoolbaseProDB/db.js');
const multer = require('multer');
const path = require('path');

const router = express.Router();

const teachersCollection = db.collection('teachers');
const classesCollection = db.collection('classes');
const studentsCollection = db.collection('students');
const schoolCollection = db.collection('users');
const subjectsCollection = db.collection('subjects');
const academicCollection = db.collection('academicSessions');
const resultsCollection = db.collection('results')

router.get('/', auth, async (req, res) => {
    const student = await studentsCollection.findOne({
    _id: new ObjectId(req.user.id)
    });

  const sessions = await academicCollection.find({
    schoolID: new ObjectId(student.schoolID)
  }).toArray();

  const school = await schoolCollection.findOne({
    _id: new ObjectId(student.schoolID)
  })

  res.render('student/dashboard', {
    title: 'Student Dashboard',
    sessions,
    student,
    school
  });
});

router.get('/result/load', auth, async (req, res) => {
  try {
    const { academicSessionId, term } = req.query;
    if (!academicSessionId || !term) return res.json({ exists: false });

    const student = await studentsCollection.findOne({
      _id: new ObjectId(req.user.id)
    });
    if (!student) return res.json({ exists: false });

    const studentId = student._id;
    // const classId = new ObjectId(student.studentClass);

    const school = await schoolCollection.findOne({
      _id: new ObjectId(student.schoolID)
    })

    // 1️⃣ Fetch student results
    const results = await resultsCollection.aggregate([
      { $match: { studentId, academicSessionId: new ObjectId(academicSessionId), term } },
      { $lookup: { from: 'subjects', localField: 'subjectId', foreignField: '_id', as: 'subject' } },
      { $unwind: '$subject' }
    ]).toArray();
    if (!results.length) return res.json({ exists: false });

    const classId = new ObjectId(results[0].classId); // ✅ use result class

    const classInfo = await classesCollection.findOne({
      // _id: new ObjectId(student.studentClass)
      _id: classId // ✅ use classId from result, not student record
    });

    const teacher = await teachersCollection.findOne({
      classAssigned: new ObjectId(classId),
        schoolID: school._id
    })

    // WAEC grade function
    const computeGrade = (score) => {
      if (score >= 75) return 'A1';
      if (score >= 70) return 'B2';
      if (score >= 65) return 'B3';
      if (score >= 60) return 'C4';
      if (score >= 55) return 'C5';
      if (score >= 50) return 'C6';
      if (score >= 45) return 'D7';
      if (score >= 40) return 'E8';
      return 'F9';
    };

    // Format position (1st, 2nd, 3rd, nth)
    const formatPosition = (pos) => {
      if (pos === 1) return '1st';
      if (pos === 2) return '2nd';
      if (pos === 3) return '3rd';
      return pos + 'th';
    };

  function getGrade(score) {
  if(score >= 75) return "A";
  if(score >= 65) return "B";
  if(score >= 50) return "C";
  if(score >= 40) return "D";
  return "F";
}

function getRemark(score) {
  if(score >= 70) return "Excellent";
  if(score >= 60) return "Very Good";
  if(score >= 50) return "Good";
  if(score >= 45) return "Fair";
  if(score >= 40) return "Pass";
  return "Fail";
}

    // 2️⃣ Compute per-subject ranking
    const subjectRanks = {};
    for (const r of results) {
      const subjectId = r.subjectId;
      const subjectScores = await resultsCollection.aggregate([
        { $match: { classId, academicSessionId: new ObjectId(academicSessionId), term, subjectId } },
        { $sort: { total: -1 } },
        { $project: { studentId: 1, total: 1 } }
      ]).toArray();

      let lastScore = null, rank = 0;
      for (let i = 0; i < subjectScores.length; i++) {
        if (subjectScores[i].total !== lastScore) { rank = i + 1; lastScore = subjectScores[i].total; }
        if (subjectScores[i].studentId.toString() === studentId.toString()) {
          subjectRanks[subjectId.toString()] = formatPosition(rank);
          break;
        }
      }
    }

    // 3️⃣ Class total ranking
    const classTotals = await resultsCollection.aggregate([
      { $match: { classId, academicSessionId: new ObjectId(academicSessionId), term } },
      { $group: { _id: '$studentId', totalScore: { $sum: '$total' } } },
      { $sort: { totalScore: -1 } }
    ]).toArray();

    let last = null, rank = 0;
    const ranked = classTotals.map((r, i) => {
      if (r.totalScore !== last) { rank = i + 1; last = r.totalScore; }
      return { studentId: r._id.toString(), position: rank };
    });

    const myRankObj = ranked.find(r => r.studentId === studentId.toString());
    const positionInClass = myRankObj ? myRankObj.position : null;

    const totalScore = results.reduce((s, r) => s + r.total, 0);
    const average = (totalScore / results.length).toFixed(2);
    const grade = getGrade(average)

    //Head Teacher's Remark code
    function displayHeadTeacherRemark(grade) {
    if (!school.gradeRemarks) return '';

    return school.gradeRemarks[grade] || '';
  }
  //Form teacher's Remark Code
  function displayFormTeacherRemark(grade) {
    if (!teacher.gradeRemarks) return '';

    return teacher.gradeRemarks[grade] || '';
  }

const formTeacherRemark = displayFormTeacherRemark(grade)

const headTeacherRemark = displayHeadTeacherRemark(grade);


    // Map results
    const mappedResults = results.map(r => ({
      subjectId: r.subjectId.toString(),
      subjectName: r.subject.subjectName,
      ca1: r.ca1 || '-',
      ca2: r.ca2 || '-',
      ca3: r.ca3 || '-',
      ca4: r.ca4 || '-',
      exam: r.exam || '-',
      total: r.total,
      grade: computeGrade(r.total),
      subjectRank: subjectRanks[r.subjectId.toString()] || null,
      remark: getRemark(r.total)
    }));

    const attendance = await db.collection('attendance').findOne({
      studentId,
      academicSessionId: new ObjectId(academicSessionId),
      term
    });

  const attendanceText = attendance
    ? `${attendance.present} / ${attendance.total}`
    : '—';


    const academicSession = await academicCollection.findOne({
      _id: new ObjectId(academicSessionId)
    });

    if (!academicSession) {
      return res.json({ exists: false });
    }

    let vacationDate = null;
    let resumptionDate = null;

if (term === 'term1') {
  vacationDate = academicSession.firstTermVacate;
  resumptionDate = academicSession.secondTermResume;
}

if (term === 'term2') {
  vacationDate = academicSession.secondTermVacate;
  resumptionDate = academicSession.thirdTermResume;
}

if (term === 'term3') {
  vacationDate = academicSession.thirdTermVacate;
  resumptionDate = academicSession.firstTermResume;
}

const psychomotorData = await db.collection('psychomotor').findOne({
  studentId,
  academicSessionId: new ObjectId(academicSessionId),
  term
});

res.json({
  exists: true,
  school,
  studentName: student.studentFullName,
  className: classInfo ? classInfo.className : '',
  attendance: attendanceText,
  vacationDate,
  resumptionDate,
  results: mappedResults,

  // 👇 THIS IS THE KEY
  psychomotor: psychomotorData,
    // ✅ ADD THIS teacher Remark
  headTeacherRemark,
  formTeacherRemark,

  totalScore,
  average,
  grade,
  positionInClass: positionInClass ? formatPosition(positionInClass) : null,
  totalStudents: ranked.length
});


  } catch (err) {
    console.error(err);
    res.status(500).json({ exists: false });
  }
});

module.exports = router;