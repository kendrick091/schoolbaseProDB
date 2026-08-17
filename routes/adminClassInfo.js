const express = require('express');
const { ObjectId } = require('mongodb');
const db = require('../../schoolbaseProDB/db.js')
const auth = require('../middleware/auth.js')
const role = require('../middleware/roles.js')

const router = express.Router();

const userBoard = db.collection('users')
const classes = db.collection('classes');
const students = db.collection('students');
const teacher = db.collection('teachers');

router.get('/:id', auth, async (req, res) => {
  const schoolId = new ObjectId(req.user.id);
  const classId = new ObjectId(req.params.id);

  const classInfo = await classes.findOne({
    _id: classId,
    schoolID: schoolId
  });

  const classList = await classes.find({
    schoolID: schoolId,
  }).toArray();

  const studentsInClass = await students.find({
    schoolID: schoolId,
    studentClass: classId,
    isActive: true
  })
  .sort({ studentFullName: 1 })
  .toArray();



  const teachersInClass = await teacher.find({
    schoolID: schoolId,
    classAssigned: classId
  }).toArray();

  const classTeacher = teachersInClass.find(
    t => t.teacherRole === 'classTeacher'
  );

  res.render('admin/class-info', {
    title: 'Class Info',
    classInfo,
    students: studentsInClass,
    teachers: teachersInClass,
    classTeacher,
    classList
  });
});

// Update student class route
// Promote a single student to another class
router.post('/promote-student/:id', auth, async (req, res) => {
  try {
    const schoolId = new ObjectId(req.user.id);
    const studentId = new ObjectId(req.params.id);
    const { newClassId } = req.body;

    // Validate new class ID
    if (!newClassId || !ObjectId.isValid(newClassId)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid class.'
      });
    }

    const targetClassId = new ObjectId(newClassId);

    // Find the student and make sure he belongs to this school
    const student = await students.findOne({
      _id: studentId,
      schoolID: schoolId,
      isActive: true
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.'
      });
    }

    // Check that the destination class belongs to this school
    const targetClass = await classes.findOne({
      _id: targetClassId,
      schoolID: schoolId
    });

    if (!targetClass) {
      return res.status(404).json({
        success: false,
        message: 'The selected class does not belong to your school.'
      });
    }

    // Prevent moving to the same class
    if (student.studentClass &&
        student.studentClass.toString() === targetClassId.toString()) {

      return res.status(400).json({
        success: false,
        message: 'Student is already in this class.'
      });
    }

    // Get old class information
    const oldClass = student.studentClass
      ? await classes.findOne({
          _id: student.studentClass,
          schoolID: schoolId
        })
      : null;

    // Update student's class
    await students.updateOne(
      {
        _id: studentId,
        schoolID: schoolId
      },
      {
        $set: {
          studentClass: targetClassId,
          updatedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: `${student.studentFullName} has been promoted to ${targetClass.className}.`,
      oldClass: oldClass ? oldClass.className : null,
      newClass: targetClass.className
    });

  } catch (err) {
    console.error('PROMOTE STUDENT ERROR:', err);

    res.status(500).json({
      success: false,
      message: 'Unable to promote student.'
    });
  }
});

// Promote all students in the current class to another class
router.post('/promote-all', auth, async (req, res) => {

  try {

    const schoolId = new ObjectId(req.user.id);

    const { currentClassId, newClassId } = req.body;

    // -----------------------------
    // Validate IDs
    // -----------------------------

    if (
      !currentClassId ||
      !newClassId ||
      !ObjectId.isValid(currentClassId) ||
      !ObjectId.isValid(newClassId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid class information."
      });
    }

    const currentClassObjectId = new ObjectId(currentClassId);
    const newClassObjectId = new ObjectId(newClassId);

    // -----------------------------
    // Prevent same class
    // -----------------------------

    if (
      currentClassObjectId.toString() ===
      newClassObjectId.toString()
    ) {

      return res.status(400).json({
        success: false,
        message: "The destination class must be different from the current class."
      });

    }

    // -----------------------------
    // Verify current class belongs
    // to this school
    // -----------------------------

    const currentClass = await classes.findOne({
      _id: currentClassObjectId,
      schoolID: schoolId
    });

    if (!currentClass) {

      return res.status(404).json({
        success: false,
        message: "Current class not found."
      });

    }

    // -----------------------------
    // Verify destination class
    // belongs to this school
    // -----------------------------

    const newClass = await classes.findOne({
      _id: newClassObjectId,
      schoolID: schoolId
    });

    if (!newClass) {

      return res.status(404).json({
        success: false,
        message: "Destination class not found."
      });

    }

    // -----------------------------
    // Find students first
    // -----------------------------

    const studentCount = await students.countDocuments({
      schoolID: schoolId,
      studentClass: currentClassObjectId,
      isActive: true
    });

    if (studentCount === 0) {

      return res.status(404).json({
        success: false,
        message: `There are no active students in ${currentClass.className}.`
      });

    }

    // -----------------------------
    // Promote all students
    // -----------------------------

    const result = await students.updateMany(

      {
        schoolID: schoolId,
        studentClass: currentClassObjectId,
        isActive: true
      },

      {
        $set: {
          studentClass: newClassObjectId,
          updatedAt: new Date()
        }
      }

    );

    // -----------------------------
    // Response
    // -----------------------------

    res.json({

      success: true,

      message:
        `${result.modifiedCount} student(s) promoted from ` +
        `${currentClass.className} to ${newClass.className}.`,

      promotedCount: result.modifiedCount,

      fromClass: currentClass.className,

      toClass: newClass.className

    });

  } catch (err) {

    console.error("PROMOTE ALL STUDENTS ERROR:", err);

    res.status(500).json({

      success: false,

      message: "Unable to promote students."

    });

  }

});

router.get('/delete/:id', auth, async (req, res) => {
  try {
    const schoolId = new ObjectId(req.user.id);
    const studentId = new ObjectId(req.params.id);

    const student = await students.findOne({
      _id: new ObjectId(studentId),
      schoolID: schoolId
    });

    const selectedClass = await classes.findOne({
       _id: student.studentClass,
      schoolID: schoolId
    });

    await students.updateOne(
      {
        _id: studentId,
        schoolID: schoolId
      },
      {
        $set: {
          isActive: false,
          deactivatedAt: new Date() // optional but recommended
        }
      }
    );

    // console.log(`Student deactivated successfully for class: 
    //   ${selectedClass.className}
    //   id: ${selectedClass._id}`);

    res.redirect(`/classinfo/${student.studentClass}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Unable to deactivate student');
  }
});

module.exports = router;