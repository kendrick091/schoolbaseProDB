const adminBtn = document.getElementById('admin');
const teacherBtn = document.getElementById('teacher');
const studentBtn = document.getElementById('student');
const parentBtn = document.getElementById('parent');

const adminForm = document.getElementById('adminLogin');
const teacherForm = document.getElementById('teacherLoginIn');
const parentForm = document.getElementById('parentLoginIn');
const studentForm = document.getElementById('studentLoginIn');

const buttons = [adminBtn, teacherBtn, parentBtn, studentBtn]; // , parentBtn];

function hideAllForms() {
    adminForm.style.display = 'none';
    teacherForm.style.display = 'none';
    studentForm.style.display = 'none';
    parentForm.style.display = 'none';
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

parentBtn.onclick = () => {
    hideAllForms();
    parentForm.style.display = 'block';
    setActive(parentBtn);
}

studentBtn.onclick = () => {
    hideAllForms();
    studentForm.style.display = 'block';
    setActive(studentBtn);
};

// Default view
hideAllForms();
adminForm.style.display = 'block';
