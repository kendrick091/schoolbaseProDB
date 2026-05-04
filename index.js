const express = require('express');
const path = require('path');
require('dotenv').config();
const cookieParser = require('cookie-parser');

const { connectDB } = require('./db');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const PORT = 3000;


async function startServer() {
  try {
    await connectDB(); // ✅ CONNECT FIRST

    // ✅ LOAD ROUTES AFTER DB CONNECTION
    app.use('/signup', require('./routes/signup'));
    app.use('/', require('./routes/login'));
    app.use('/admin', require('./routes/admin'));
    app.use('/admin/student', require('./routes/adminStudent'));
    app.use('/teachers', require('./routes/adminTeacher'));
    app.use('/edit', require('./routes/edit'));
    app.use('/classes', require('./routes/adminClass'));
    app.use('/sessions', require('./routes/adminSession'));
    app.use('/classinfo', require('./routes/adminClassInfo'));
    app.use('/subjects', require('./routes/adminSubject'));
    app.use('/adminResult', require('./routes/adminResult'));
    app.use('/settings', require('./routes/adminSetting'));
    app.use('/fees', require('./routes/fees'));
    app.use('/adminStudentResult', require('./routes/adminStudentResult'));

    app.use('/teacherLogin', require('./routes/teacherLogin'));
    app.use('/teacherDashBoard', require('./routes/teacherDashBoard'));
    app.use('/teacherClass', require('./routes/teacherClass'));
    app.use('/teacherResult', require('./routes/teacherResult'));
    app.use('/teacherPsychomotor', require('./routes/teacherPsychomotor'));
    app.use('/teacherRemark', require('./routes/teacherRemark'));

    app.use('/studentLogin', require('./routes/studentLogin'));
    app.use('/studentDashBoard', require('./routes/studentDashBoard'));
    app.use('/studentCumulative', require('./routes/studentCumulative'));

    app.use('/superAdminDashboard', require('./routes/superAdmin'));
    app.use('/superAdminLogin', require('./routes/superAdminLogin'));

    app.listen(PORT, () => {
      console.log(`🚀 SchoolBase running on port ${PORT}`);
    });

  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
