// SUPER ADMIN DASHBOARD ROUTES
const express = require('express');
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth');
const role = require('../middleware/roles');
const db = require('../../schoolbaseProDB/db.js');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { render } = require('ejs');

const router = express.Router();

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

// ======= SUPER ADMIN DASHBOARD ==========

router.get('/', auth, role('superAdmin'), async (req, res) => {

   const schools = await db.collection('users').aggregate([
    {
        $lookup: {
            from: "students",
            let: { schoolId: "$_id" },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                { $eq: ["$schoolID", "$$schoolId"] },
                                { $eq: ["$isActive", true] } // ✅ filter active students
                            ]
                        }
                    }
                }
            ],
            as: "students"
        }
    },
    {
        $addFields: {
            totalStudents: { $size: "$students" }
        }
    }
]).toArray();

const students = await db.collection('students')
.find({ isActive: true }).toArray(); // ✅ get all active students

// Count total schools
const totalSchools = schools.length;
const studentCount = students.length;

    res.render('superAdmin/dashboard', {
        title: 'Super Admin Dashboard',
        action: `home`,
        schools,
        totalSchools,
        studentCount,
        students: null,
        inactiveStudents: null
    });
})

router.get('/edit/:id', auth, role('superAdmin'), async (req, res) => {
    const schools = await db.collection('users')
    .findOne({ _id: new ObjectId(req.params.id) });

    if (!schools) return res.status(404).send('School not found');

    const students = await db.collection('students')
    .find({ schoolID: new ObjectId(req.params.id), isActive: true }).toArray();

    const inactiveStudents = await db.collection('students')
    .find({ schoolID: new ObjectId(req.params.id), isActive: false }).toArray();

    res.render('superAdmin/dashboard', { 
        title: 'Edit School',
        action: `edit`,
        schools,
        students,
        inactiveStudents
     });
});

//update payment status to true
router.post('/update-payment/:schoolId/true', auth, role('superAdmin'), async (req, res) => {
    try {
        const schoolId = new ObjectId(req.params.schoolId);

        await db.collection('students').updateMany(
            { schoolID: schoolId },
            {
                $set: {
                    payment: true
                }
            }
        );

        res.json({
            success: true,
            message: "All students payment updated to true"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

// Update payment status to false
router.post('/update-payment/:schoolId/false', auth, role('superAdmin'), async (req, res) => {
    try {
        const schoolId = new ObjectId(req.params.schoolId);

        await db.collection('students').updateMany(
            { schoolID: schoolId },
            {
                $set: {
                    payment: false
                }
            }
        );

        res.json({
            success: true,
            message: "All students payment updated to false"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

// Code for school payment toggle
router.post('/toggle-school-payment/:schoolId', auth, role('superAdmin'), async (req, res) => {
    try {
        const schoolId = new ObjectId(req.params.schoolId);

        const school = await db.collection('users').findOne({
            _id: schoolId
        });

        if (!school) {
            return res.status(404).json({
                success: false,
                message: "School not found"
            });
        }

        const newPaymentStatus = !school.payment;

        await db.collection('users').updateOne(
            { _id: schoolId },
            {
                $set: {
                    payment: newPaymentStatus
                }
            }
        );

        res.json({
            success: true,
            payment: newPaymentStatus,
            message: `School payment updated to ${
                newPaymentStatus ? "Paid" : "Unpaid"
            }`
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false
        });
    }
});

//=================================
// Toggle student active status and payment
//=================================
router.post(
    '/toggle-student-payment/:studentId',
    auth,
    role('superAdmin'),
    async (req, res) => {
        try {
            const studentId = new ObjectId(req.params.studentId);

            const student = await db.collection('students').findOne({
                _id: studentId
            });

            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: "Student not found"
                });
            }

            const newPaymentStatus = !student.payment;

            await db.collection('students').updateOne(
                { _id: studentId },
                {
                    $set: {
                        payment: newPaymentStatus
                    }
                }
            );

            res.json({
                success: true,
                message: `Student payment updated to ${
                    newPaymentStatus ? "Paid" : "Unpaid"
                }`
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({
                success: false
            });
        }
    }
);

router.post(
    '/toggle-student-status/:studentId',
    auth,
    role('superAdmin'),
    async (req, res) => {
        try {
            const studentId = new ObjectId(req.params.studentId);

            const student = await db.collection('students').findOne({
                _id: studentId
            });

            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: "Student not found"
                });
            }

            const newStatus = !student.isActive;

            await db.collection('students').updateOne(
                { _id: studentId },
                {
                    $set: {
                        isActive: newStatus
                    }
                }
            );

            res.json({
                success: true,
                message: `Student ${
                    newStatus ? "Activated" : "Deactivated"
                } successfully`
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({
                success: false
            });
        }
    }
);

module.exports = router;