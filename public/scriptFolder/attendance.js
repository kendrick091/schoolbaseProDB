const studentsList = document.getElementById('studentsList');
const classId = document.getElementById('classId').value;
const termSelect = document.getElementById('termSelect');

// Auto-calculate total
studentsList.addEventListener('input', (e) => {
  const form = e.target.closest('form');
  if (!form) return;

  const present = Number(form.querySelector('.present').value || 0);
  const absent = Number(form.querySelector('.absent').value || 0);
  form.querySelector('.total').value = present + absent;
});


// LOAD ATTENDANCE WHEN TERM CHANGES
termSelect.addEventListener('change', loadAttendance);

async function loadAttendance() {

  const term = termSelect.value;
  if (!term) return;

  try {

    const res = await fetch(`/teacherClass/attendance/${classId}/${term}`);
    const data = await res.json();

    // clear all inputs first
    document.querySelectorAll('.student-form').forEach(form => {
      form.querySelector('.present').value = '';
      form.querySelector('.absent').value = '';
      form.querySelector('.total').value = '';
      form.querySelector('.status').textContent = '';
    });

    data.forEach(record => {

      const form = document.querySelector(
        `[data-student-id="${record.studentId}"]`
      );

      if (!form) return;

      form.querySelector('.present').value = record.present;
      form.querySelector('.absent').value = record.absent;
      form.querySelector('.total').value = record.total;
      form.querySelector('.status').textContent = "Loaded ✓";
      form.querySelector('.status').style.color = "green";
    });

  } catch (err) {
    console.log(err);
  }
}


// SAVE ATTENDANCE
studentsList.addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.target;
  if (!form.classList.contains('student-form')) return;

  const studentId = form.dataset.studentId;
  const term = termSelect.value;
  const statusEl = form.querySelector('.status');

  if (!term) {
    statusEl.textContent = 'Please select a term';
    statusEl.style.color = 'red';
    return;
  }

  const formData = {
    studentId,
    classId,
    term,
    present: Number(form.querySelector('.present').value || 0),
    absent: Number(form.querySelector('.absent').value || 0),
    total: Number(form.querySelector('.total').value || 0)
  };

  statusEl.textContent = 'Saving...';

  try {

    const res = await fetch('/teacherClass/attendance/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await res.json();

    if (!res.ok) {
      statusEl.textContent = data.message;
      statusEl.style.color = 'red';
    } else {
      statusEl.textContent = 'Saved ✓';
      statusEl.style.color = 'green';
    }

  } catch (err) {
    statusEl.textContent = 'Network error';
    statusEl.style.color = 'red';
  }
});