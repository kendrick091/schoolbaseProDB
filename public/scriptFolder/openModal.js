function openModal(id) {
    document.getElementById("overlay").style.display = "block";
    document.getElementById(id).style.display = "block";
}

function closeAll() {
    document.getElementById("overlay").style.display = "none";
    document.querySelectorAll(".modal").forEach(m => {
        m.style.display = "none";
    });
}

const teacherRole = document.getElementById('teacherRole');
  const assignSubject = document.getElementById('assignSubject');
  const assignClass = document.getElementById('assignClass');

  teacherRole.addEventListener('change', () => {
    // hide both first
    assignSubject.style.display = 'none';
    assignClass.style.display = 'none';

    // reset values (important)
    assignSubject.value = '';
    assignClass.value = '';

    if (teacherRole.value === 'classTeacher') {
      assignClass.style.display = 'block';
    }

    if (teacherRole.value === 'subjectTeacher') {
      assignSubject.style.display = 'block';
    }
  });

  teacherRole.addEventListener('change', () => {
  assignSubject.style.display = 'none';
  assignClass.style.display = 'none';

  assignSubject.required = false;
  assignClass.required = false;

  if (teacherRole.value === 'classTeacher') {
    assignClass.style.display = 'block';
    assignClass.required = true;
  }

  if (teacherRole.value === 'subjectTeacher') {
    assignSubject.style.display = 'block';
    assignSubject.required = true;
  }
});
