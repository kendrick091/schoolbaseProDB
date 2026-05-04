const classSelect = document.getElementById('classSelect');
const termSelect = document.getElementById('termSelect');
const subjectInput = document.getElementById('subject');
const studentsList = document.getElementById('studentsList');

function loadStudents() {
    const classId = classSelect.value;
    const term = termSelect.value;
    const subjectId = subjectInput?.value;

    // 🔐 Required fields
    if (!classId || !term || !subjectId) {
        studentsList.innerHTML = '';
        return;
    }

    fetch(`/teacherDashBoard/students-by-class/${classId}/${term}/${subjectId}`)
        .then(res => res.json())
        .then(students => {
            studentsList.innerHTML = '';

            if (!Array.isArray(students) || !students.length) {
                studentsList.innerHTML = `<li>No students found</li>`;
                return;
            }

            // Sort alphabetically
            students.sort((a, b) =>
                a.studentFullName.localeCompare(b.studentFullName)
            );

            students.forEach(student => {
                studentsList.innerHTML += `
                    <li class="student-item">
                        <form class="student-form" data-student-id="${student._id}">
                            <div class="student-header">
                                ${student.studentFullName} (${student.gender})
                            </div>

                            <input type="number" name="ca1" min="0" max="20" placeholder="1st CA" value="${student.ca1 || ''}">
                            <input type="number" name="ca2" min="0" max="20" placeholder="2nd CA" value="${student.ca2 || ''}">
                            <input type="number" name="ca3" min="0" max="20" placeholder="3rd CA" value="${student.ca3 || ''}">
                            <input type="number" name="ca4" min="0" max="20" placeholder="4th CA" value="${student.ca4 || ''}">
                            <input type="number" name="exam" min="0" max="60" placeholder="Exam" value="${student.exam || ''}">

                            <button type="submit" class="save-btn">Save</button>
                            <small class="status"></small>
                        </form>
                    </li>
                `;
            });
        })
        .catch(err => {
            console.error(err);
            studentsList.innerHTML = `<li>Error loading students</li>`;
        });
}

// 🔄 Reload when inputs change
classSelect.addEventListener('change', loadStudents);
termSelect.addEventListener('change', loadStudents);
subjectInput?.addEventListener('change', loadStudents);

// 💾 Save student results
studentsList.addEventListener('submit', async (e) => {
    e.preventDefault();

    const form = e.target;
    if (!form.classList.contains('student-form')) return;

    const statusEl = form.querySelector('.status');

    const formData = {
        studentId: form.dataset.studentId,
        classId: classSelect.value,
        term: termSelect.value,
        subjectId: subjectInput.value,
        ca1: form.ca1.value || 0,
        ca2: form.ca2.value || 0,
        ca3: form.ca3.value || 0,
        ca4: form.ca4.value || 0,
        exam: form.exam.value || 0
    };

    statusEl.textContent = 'Saving...';
    statusEl.style.color = 'black';

    try {
        const res = await fetch('/teacherDashBoard/save-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (!res.ok) {
            statusEl.textContent = data.message || 'Error saving';
            statusEl.style.color = 'red';
        } else {
            statusEl.textContent = 'Saved ✓';
            statusEl.style.color = 'green';
        }
    } catch (err) {
        console.error(err);
        statusEl.textContent = 'Network error';
        statusEl.style.color = 'red';
    }
});
