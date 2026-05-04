const adminBtn = document.getElementById('admin');
const teacherBtn = document.getElementById('teacher');
const studentBtn = document.getElementById('student');

const adminForm = document.getElementById('adminLogin');
const teacherForm = document.getElementById('teacherLoginIn');
const studentForm = document.getElementById('studentLoginIn');

const buttons = [adminBtn, teacherBtn, studentBtn];

function hideAllForms() {
    adminForm.style.display = 'none';
    teacherForm.style.display = 'none';
    studentForm.style.display = 'none';
}

function setActive(btn) {
    buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

adminBtn.onclick = () => {
    hideAllForms();
    adminForm.style.display = 'block';
    setActive(adminBtn);
};

teacherBtn.onclick = () => {
    hideAllForms();
    teacherForm.style.display = 'block';
    setActive(teacherBtn);
};

studentBtn.onclick = () => {
    hideAllForms();
    studentForm.style.display = 'block';
    setActive(studentBtn);
};

// Default view
hideAllForms();
adminForm.style.display = 'block';
