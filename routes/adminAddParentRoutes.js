const express = require('express');
const { ObjectId } = require('mongodb');
const db = require('../../schoolbaseProDB/db.js');
const auth = require('../middleware/auth.js');
const bcrypt = require('bcrypt');

const router = express.Router();

const userBoard = db.collection('users');
const parents = db.collection('parents');
const students = db.collection('students');


// Render Page
router.get('/', auth, async (req, res) => {

    const schoolId = new ObjectId(req.user.id);

    const admin = await userBoard.findOne({_id: schoolId});

    const parentList = await parents.find({
        schoolID: schoolId
    }).toArray();
      // Attach student details to each parent
    for (const parent of parentList) {

        const children = await students.find({
            _id: { $in: parent.children || [] }
        }).toArray();

        parent.children = children;
    }

    const studentList = await students.find({
        schoolID: schoolId
    }).sort({
        studentFullName:1
    }).toArray();

    res.render('admin/addParent',{
        title:'Add Parent',
        admin,
        parent: parentList,
        students: studentList,
        action:'addParent'
    });

});

router.get('/search/:phone', auth, async (req, res) => {

    try {

        const schoolId = new ObjectId(req.user.id);

        const phone = req.params.phone;

        const studentList = await students.find({

            schoolID: schoolId,

            parentNo: {
                $regex: "^" + phone
            }

        }).toArray();

        res.json(studentList);

    } catch(err){

        console.log(err);

        res.status(500).json({
            message: err.message
        });

    }

});

// Add Parent Post Route
router.post('/', auth, async (req, res) => {

    try {

        const schoolId = new ObjectId(req.user.id);

        const school = await userBoard.findOne({
            _id: schoolId
        });

        const {
            parentFullName,
            phone,
            email,
            children
        } = req.body;

        let childArray = [];

        if (Array.isArray(children)) {

            childArray = children.map(id => new ObjectId(id));

        } else if (children) {

            childArray.push(new ObjectId(children));

        }

        const existingParent = await parents.findOne({
            schoolID: schoolId,
            phone: phone.trim()
        });

        if (existingParent) {
            return res.status(400).send("A parent with this phone number already exists.");
        }

        // Initial password = school token
        const passwordHash = await bcrypt.hash(school.token, 8);

        await parents.insertOne({

            schoolID: schoolId,

            parentFullName,

            phone: phone.trim(),

            email: email.trim(),

            tokenHash: passwordHash,

            children: childArray,

            createdAt: new Date(),

            mustChangePassword: true

        });

        res.redirect('/addParent');

    } catch (err) {

        console.error(err);
        res.status(500).send("Unable to create parent.");

    }

});
//Edit Parent

router.get('/edit/:id', auth, async (req, res) => {
    const schoolId = new ObjectId(req.user.id);
    const parentId = new ObjectId(req.params.id);
    const studentList = await students.find({
        schoolID: schoolId
    }).sort({
        studentFullName:1
    }).toArray();
    const parent = await parents.findOne({
        _id: parentId,
        schoolID: schoolId
    });

    res.render('admin/editParent', {
        title: 'Edit Parent',
        admin: schoolId,
        parent,
        students: studentList
    });
});

//post the edited parent
router.post('/edit/:id', auth, async (req, res) => {

    try {

        const schoolId = new ObjectId(req.user.id);
        const parentId = new ObjectId(req.params.id);

        const {
            parentFullName,
            phone,
            email,
            children
        } = req.body;

        let childArray = [];

        if (Array.isArray(children)) {

            childArray = children.map(id => new ObjectId(id));

        } else if (children) {

            childArray.push(new ObjectId(children));

        }

        await parents.updateOne(

            {
                _id: parentId,
                schoolID: schoolId
            },

            {
                $set: {
                    parentFullName,
                    phone,
                    email,
                    children: childArray,
                    updatedAt: new Date()
                }
            }

        );

        res.redirect('/addParent');

    } catch (err) {

        console.error(err);

        res.status(500).send("Unable to update parent.");

    }

});

router.get('/delete/:id', auth, async (req, res) => {
  const schoolId = new ObjectId(req.user.id);
  const parentId = new ObjectId(req.params.id);

  await parents.deleteOne({
    _id: parentId,
    schoolID: schoolId
  });

  res.redirect('/addParent');
});

module.exports = router;