const phoneInput = document.getElementById("parentPhone");
const studentList = document.getElementById("student-list");

let timer;

phoneInput.addEventListener("input", () => {

    clearTimeout(timer);

    timer = setTimeout(loadStudents,300);

});

window.addEventListener("DOMContentLoaded",loadStudents);

async function loadStudents(){

    const phone = phoneInput.value.trim();

    studentList.innerHTML = "";

    if(phone.length < 4) return;

    const response = await fetch(
        `/addParent/search/${encodeURIComponent(phone)}`
    );

    const students = await response.json();

    if(students.length===0){

        studentList.innerHTML=`
        <p>No student found.</p>
        `;

        return;

    }

    students.forEach(student=>{

        const checked =
            selectedChildren.includes(student._id);

        studentList.innerHTML += `

<label class="student-card">

<input
type="checkbox"
name="children"
value="${student._id}"
${checked ? "checked":""}
>

<div>

<strong>

${student.studentFullName}

</strong>

<br>

Admission:
${student.admissionNumber ?? ""}

</div>

</label>

`;

    });

}