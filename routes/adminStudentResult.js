const express = require('express');
const { ObjectId } = require('mongodb');
const db = require('../../schoolbaseProDB/db.js')
const auth = require('../middleware/auth.js')


const router = express.Router();

const teachersCollection = db.collection('teachers');
const classesCollection = db.collection('classes');
const studentsCollection = db.collection('students');
const schoolCollection = db.collection('users');
const subjectsCollection = db.collection('subjects');
const academicCollection = db.collection('academicSessions');
const resultsCollection = db.collection('results')

router.get('/:id', auth, async (req, res)=>{
     const school = await schoolCollection.findOne({
         _id: new ObjectId(req.user.id)
        });

    const student = await studentsCollection.findOne({
        _id: new ObjectId(req.params.id)
    })
   
     const sessions = await academicCollection.find({
       schoolID: new ObjectId(school._id)
     }).toArray();

     res.render('admin/studentResult', {
       title: 'Student Result',
       sessions,
       student,
       school
     });
})

// To show Result
router.get('/result/load', auth, async (req, res) => {
  try {
    const { academicSessionId, term, studentId } = req.query;

    if (!academicSessionId || !term || !studentId) {
      return res.json({ exists: false });
    }

    // 1. Get student
    const student = await studentsCollection.findOne({
      _id: new ObjectId(studentId)
    });

    if (!student) return res.json({ exists: false });

    // 2. Get school from student (IMPORTANT FIX)
    const school = await schoolCollection.findOne({
      _id: new ObjectId(student.schoolID)
    });

    if (!school) return res.json({ exists: false });

    const studentObjectId = student._id;

    // 3. Fetch results
    const results = await resultsCollection.aggregate([
      {
        $match: {
          studentId: studentObjectId,
          academicSessionId: new ObjectId(academicSessionId),
          term
        }
      },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subjectId',
          foreignField: '_id',
          as: 'subject'
        }
      },
      { $unwind: '$subject' }
    ]).toArray();

    if (!results.length) return res.json({ exists: false });

    const classId = results[0].classId
      ? new ObjectId(results[0].classId)
      : null;

    // 4. Class info
    const classInfo = await classesCollection.findOne({
      _id: classId
    });

    // 5. Teacher info
    const teacher = await teachersCollection.findOne({
      classAssigned: classId,
      schoolID: school._id
    });

    // 6. Grade helpers
    const getGrade = (score) => {
      if (score >= 75) return "A";
      if (score >= 65) return "B";
      if (score >= 50) return "C";
      if (score >= 40) return "D";
      return "F";
    };

    const getRemark = (score) => {
      if (score >= 70) return "Excellent";
      if (score >= 60) return "Very Good";
      if (score >= 50) return "Good";
      if (score >= 45) return "Fair";
      if (score >= 40) return "Pass";
      return "Fail";
    };

    // Format position (1st, 2nd, 3rd, nth)
    const formatPosition = (num) => {
  if (num % 100 >= 11 && num % 100 <= 13) {
    return `${num}th`;
  }

  switch (num % 10) {
    case 1:
      return `${num}st`;
    case 2:
      return `${num}nd`;
    case 3:
      return `${num}rd`;
    default:
      return `${num}th`;
  }
};

    // 2️⃣ Compute per-subject ranking
       // 2️⃣ Compute per-subject ranking (optimized)
const subjectRanks = {};

// Get all class results for this session + term
const allSubjectResults = await resultsCollection.aggregate([
  {
    $match: {
      classId,
      academicSessionId: new ObjectId(academicSessionId),
      term
    }
  },
  {
    $group: {
      _id: {
        subjectId: "$subjectId",
        studentId: "$studentId"
      },
      totalScore: { $sum: "$total" }
    }
  },
  {
    $sort: {
      "_id.subjectId": 1,
      totalScore: -1
    }
  }
]).toArray();


// Group rankings by subject
const groupedSubjects = {};

for (const item of allSubjectResults) {
  const subjectId = item._id.subjectId.toString();

  if (!groupedSubjects[subjectId]) {
    groupedSubjects[subjectId] = [];
  }

  groupedSubjects[subjectId].push({
    studentId: item._id.studentId.toString(),
    totalScore: item.totalScore
  });
}


// Calculate rank for each subject
for (const subjectId in groupedSubjects) {
  const students = groupedSubjects[subjectId];

  let lastScore = null;
  let rank = 0;

  for (let i = 0; i < students.length; i++) {
    if (students[i].totalScore !== lastScore) {
      rank = i + 1;
      lastScore = students[i].totalScore;
    }

    if (students[i].studentId === studentId.toString()) {
      subjectRanks[subjectId] = formatPosition(rank);
      break;
    }
  }
}

    // 8. Class ranking
    const classTotals = await resultsCollection.aggregate([
      {
        $match: {
          classId,
          academicSessionId: new ObjectId(academicSessionId),
          term
        }
      },
      {
        $group: {
          _id: '$studentId',
          totalScore: { $sum: '$total' }
        }
      },
      { $sort: { totalScore: -1 } }
    ]).toArray();

    let rank = 0, last = null;

    const ranked = classTotals.map((r, i) => {
      if (r.totalScore !== last) {
        rank = i + 1;
        last = r.totalScore;
      }
      return {
        studentId: r._id.toString(),
        position: rank
      };
    });

    const myRank = ranked.find(r => r.studentId === studentObjectId.toString());

    // 9. totals
    const totalScore = results.reduce((s, r) => s + r.total, 0);
    const average = (totalScore / results.length).toFixed(2);

    const grade = getGrade(average);

    // 10. remarks
    const headTeacherRemark =
      school.gradeRemarks?.[grade] || '';

    const formTeacherRemark =
      teacher?.gradeRemarks?.[grade] || '';

    // 11. map results
    const mappedResults = results.map(r => ({
      subjectId: r.subjectId.toString(),
      subjectName: r.subject.subjectName,
      ca1: r.ca1 || '-',
      ca2: r.ca2 || '-',
      ca3: r.ca3 || '-',
      ca4: r.ca4 || '-',
      exam: r.exam || '-',
      total: r.total,
      grade: getGrade(r.total),
      remark: getRemark(r.total),
      subjectRank: subjectRanks[r.subjectId.toString()] || '-'
    }));

    // 12. attendance
    const attendance = await db.collection('attendance').findOne({
      studentId: studentObjectId,
      academicSessionId: new ObjectId(academicSessionId),
      term
    });

    const attendanceText = attendance
      ? `${attendance.present} / ${attendance.total}`
      : '—';

    // 13. academic session
    const academicSession = await academicCollection.findOne({
      _id: new ObjectId(academicSessionId)
    });

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

    // 14. psychomotor
    const psychomotorData = await db.collection('psychomotor').findOne({
      studentId: studentObjectId,
      academicSessionId: new ObjectId(academicSessionId),
      term
    });

    // 15. response
    return res.json({
      exists: true,
      school,
      studentName: student.studentFullName,
      className: classInfo?.className || '',
      attendance: attendanceText,
      vacationDate,
      resumptionDate,
      results: mappedResults,
      psychomotor: psychomotorData,
      headTeacherRemark,
      formTeacherRemark,
      totalScore,
      average,
      grade,
      positionInClass: myRank ? formatPosition(myRank.position) : null, totalStudents: ranked.length
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ exists: false });
  }
});

module.exports = router