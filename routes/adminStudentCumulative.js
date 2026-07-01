const express = require('express');
const { ObjectId } = require('mongodb');
const db = require('../../schoolbaseProDB/db');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/:id', auth, async (req, res) => {
  try {

    const studentId = new ObjectId(req.params.id);

    const student = await db.collection('students')
      .findOne({ _id: studentId });

    const admin = await db.collection('users')
      .findOne({ _id: new ObjectId(student.schoolID) });

    // 🔥 Get sessions ONLY from this student's results
    const sessionIds = await db.collection('results').distinct(
      "academicSessionId",
      { studentId: studentId }
    );

    // If student has no results
    if (!sessionIds.length) {
      return res.render('admin/studentCumulative', {
        student,
        admin,
        sessions: []
      });
    }

    // Fetch those sessions
    const sessions = await db.collection('academicSessions')
      .find({ _id: { $in: sessionIds } })
      .sort({ createdAt: -1 })
      .toArray();

    res.render('admin/studentCumulative', {
      student,
      admin,
      sessions
    });

  } catch (err) {
    console.error("CUMULATIVE PAGE ERROR:", err);
    res.status(500).send("Server Error");
  }
});

router.get('/load/result', auth, async (req, res) => {
  try {

    const { studentId, academicSessionId } = req.query;

    if (!studentId || !academicSessionId) {
      return res.json({ exists: false });
    }

    const studentObjectId = new ObjectId(studentId);
    const sessionId = new ObjectId(academicSessionId);

    // Get student
    const student = await db.collection('students')
      .findOne({ _id: studentObjectId });

    if (!student) {
      return res.json({ exists: false });
    }

    // Get school
    const school = await db.collection('users')
      .findOne({ _id: new ObjectId(student.schoolID) });

    // Get results
    const results = await db.collection('results')
      .find({
        studentId: studentObjectId,
        academicSessionId: sessionId
      })
      .toArray();

    if (!results.length) {
      return res.json({ exists: false });
    }

    // Get subjects
    const subjectIds = [
      ...new Set(results.map(r => r.subjectId.toString()))
    ];

    const subjects = await db.collection('subjects')
      .find({
        _id: {
          $in: subjectIds.map(id => new ObjectId(id))
        }
      })
      .toArray();

    const subjectMap = {};

    subjects.forEach(sub => {
      subjectMap[sub._id.toString()] = sub.subjectName;
    });

    // Group terms
    const cumulative = {};

    results.forEach(r => {

      const key = r.subjectId.toString();

      if (!cumulative[key]) {
        cumulative[key] = {
          subjectName: subjectMap[key] || "Unknown",
          term1: 0,
          term2: 0,
          term3: 0
        };
      }

      if (r.term === 'term1') cumulative[key].term1 = r.total || 0;
      if (r.term === 'term2') cumulative[key].term2 = r.total || 0;
      if (r.term === 'term3') cumulative[key].term3 = r.total || 0;

    });

    const finalResults = Object.values(cumulative).map(sub => {

      const total = sub.term1 + sub.term2 + sub.term3;

      return {
        ...sub,
        total
      };

    });

    const overallTotal = finalResults.reduce(
      (sum, s) => sum + s.total,
      0
    );

    const average = (
      overallTotal / finalResults.length
    ).toFixed(2);

    let grade = "F";

    if (average >= 75) grade = "A";
    else if (average >= 65) grade = "B";
    else if (average >= 50) grade = "C";
    else if (average >= 45) grade = "D";
    else if (average >= 40) grade = "E";

    const classData = await db.collection('classes')
      .findOne({ _id: results[0].classId });

    const sessionData = await db.collection('academicSessions')
      .findOne({ _id: sessionId });

    res.json({
      exists: true,
      school,
      studentName: student.studentFullName,
      admissionNumber: student.admissionNumber,
      className: classData?.className || "",
      vacationDate: sessionData?.thirdTermVacate,
      resumptionDate: sessionData?.firstTermResume,
      academicSession: sessionData?.academicSession,
      results: finalResults,
      total: overallTotal,
      average,
      grade,
      headTeacherRemark: sessionData?.headTeacherRemark || null
    });

  } catch (err) {

    console.error("ADMIN CUMULATIVE LOAD ERROR:", err);

    res.status(500).json({
      exists: false
    });

  }
});

module.exports = router;