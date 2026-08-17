const phoneInput = document.getElementById("parentPhone");
const studentList = document.getElementById("student-list");

let debounceTimer;

phoneInput.addEventListener("input", () => {

    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(searchStudents, 300);

});

async function searchStudents() {

    const phone = phoneInput.value.trim();

    studentList.innerHTML = "";

    // Don't search until at least 4 digits
    if (phone.length < 4) return;

    try {

        const response = await fetch(`/addParent/search/${encodeURIComponent(phone)}`);

        if (!response.ok) {
            throw new Error("Failed to fetch students.");
        }

        const students = await response.json();

        if (students.length === 0) {

            studentList.innerHTML = `
                <div class="no-result">
                    No student found with this phone number.
                </div>
            `;

            return;
        }

        const fragment = document.createDocumentFragment();

        students.forEach(student => {

            const div = document.createElement("div");

            div.className = "student-card";

            div.innerHTML = `
                <label>
                    <input
                        type="checkbox"
                        name="children"
                        value="${student._id}">
                    <strong>${student.studentFullName}</strong><br>
                    <small>${student.admissionNumber || ""}</small>
                </label>
            `;

            fragment.appendChild(div);

        });

        studentList.appendChild(fragment);

    } catch (err) {

        console.error(err);

        studentList.innerHTML = `
            <div class="error">
                Unable to load students.
            </div>
        `;

    }

}