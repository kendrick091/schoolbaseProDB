const sessionSelect = document.getElementById('academicSession');
const termSelect = document.getElementById('term');
const resultArea = document.getElementById('resultArea');
const printBtn = document.getElementById('printBtn');

sessionSelect.addEventListener('change', loadResult);
termSelect.addEventListener('change', loadResult);

async function loadResult() {
  const academicSessionId = sessionSelect.value;
  const term = termSelect.value;

  if (!academicSessionId || !term) {
    resultArea.innerHTML = '';
    printBtn.style.display = 'none';
    return;
  }

  const res = await fetch(
    `/studentDashBoard/result/load?academicSessionId=${academicSessionId}&term=${term}`
  );

  const data = await res.json();

  if (!data.exists) {
    resultArea.innerHTML = '<p>No result available for this term.</p>';
    printBtn.style.display = 'none';
    return;
  }

  let html = `
    <div class="schoolInfo">
      <div class="logo">
        <img 
            src="${data.school?.schoolLogo || '/images/default-school.png'}" 
            alt="School Logo">
      </div>
      <div class="schoolHead">
        <div class="headSchoolName">${data.school.schoolname}</div>
        <div class="headSchoolAddress">${data.school.address}</div>
      </div>
      <div class="logo"></div>
    </div>
    <div class="result-header">
  <table class="header-table">
    <tr>
      <td><strong>Student Name:</strong></td>
      <td id="studentName"></td>
    </tr>
    <tr>
      <td><strong>Academic Session:</strong></td>
      <td id="academicSessionText"></td>
    </tr>
    <tr>
      <td><strong>Class:</strong></td>
      <td id="className"></td>
    </tr>
    <tr>
      <td><strong>Attendance:</strong></td>
      <td id="attendance"></td>
    </tr>
  </table>

  <table class="header-table">
    <tr>
      <td><strong>Term:</strong></td>
      <td id="termText"></td>
    </tr>
    <tr>
      <td><strong>Vacation Date:</strong></td>
      <td id="vacationDate"></td>
    </tr>
    <tr>
      <td><strong>Next Term Begins:</strong></td>
      <td id="resumptionDate"></td>
    </tr>
    <tr>
      <td><strong>Students in Class:</strong></td>
      <td id="studentsInClass"></td>
    </tr>
  </table>
</div>

    <table width="100%">
      <tr>
        <th>Subject</th>
        <th>CA 1</th>
        <th>CA 2</th>
        <th>Exam</th>
        <th>Total</th>
        <th>Rank</th>
        <th>Grade</th>
        <th>Remark</th>
      </tr>
  `;

  data.results.forEach(r => {
  html += `
    <tr>
      <td>${r.subjectName}</td>
      <td class="caTd">${r.ca1}</td>
      <td class="caTd">${r.ca2}</td>
      <td class="caTd">${r.exam}</td>
      <td class="caTd">${r.total}</td>
      <td class="caTd">${r.subjectRank || '-'}</td>
      <td class="caTd">${r.grade}</td>
      <td class="caTd">${r.remark}</td>
    </tr>
  `;
});

//to display position if the school enhanced the position attribute
let show = (db, sh)=>{
  if(db === true){
    return `<strong>Position: </strong>` + sh
  }else{
    return '-'
  }
}

  html += `
    </table>

    <p>
    <strong>Total:</strong> ${data.totalScore} |
    <strong>Average:</strong> ${data.average} |
    <strong>Grade:</strong> ${data.grade} | 
    ${show(data.school.positionView, data.positionInClass)}
    <!-----/ ${data.totalStudents} ---->
    </p>
  `;

 /* ================= PSYCHOMOTOR & BEHAVIOUR ================= */

const psycho = data.psychomotor;

const makeRow = (label, value) => {
  const v = parseInt(value, 10);
  let cells = "";
  for (let i = 1; i <= 5; i++) {
    cells += `<td style="text-align:center;">${i === v ? "✔" : ""}</td>`;
  }
  return `<tr><td>${label}</td>${cells}</tr>`;
};

if (psycho && (psycho.psychomotor || psycho.behaviour)) {
  html += `
    <h4 style="margin-top:5px; margin-bottom: 2px;">
    Psychomotor & Behaviour Assessment</h4>

    <div class="displayPsychomotor">
    <!-- Psychomotor -->
    <table border="1" width="100%" cellspacing="0" cellpadding="3">
      <thead>
        <tr>
          <th>Psychomotor Skills</th>
          <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th>
        </tr>
      </thead>
      <tbody>
        ${makeRow("Handwriting", psycho.psychomotor.handwriting)}
        ${makeRow("Fluency", psycho.psychomotor.fluency)}
        ${makeRow("Sports", psycho.psychomotor.sports)}
        ${makeRow("Handling of Tools", psycho.psychomotor.handlingOfTools)}
        ${makeRow("Drawing & Painting", psycho.psychomotor.drawing)}
        ${makeRow("Crafts", psycho.psychomotor.crafts)}
      </tbody>
    </table>

    <!-- Behaviour -->
    <table border="1" width="100%" cellspacing="0" cellpadding="3" style="margin-top:10px;">
      <thead>
        <tr>
          <th>Behavioural Traits</th>
          <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th>
        </tr>
      </thead>
      <tbody>
        ${makeRow("Punctuality", psycho.behaviour.punctuality)}
        ${makeRow("Attendance at Class", psycho.behaviour.attendanceAtClass)}
        ${makeRow("Reliability", psycho.behaviour.reliability)}
        ${makeRow("Honesty", psycho.behaviour.honesty)}
        ${makeRow("Relationship with Staff", psycho.behaviour.relationshipWithStaff)}
        ${makeRow("Relationship with Students", psycho.behaviour.relationshipWithOtherStudents)}
      </tbody>
    </table>
    <!-- Behaviour -->
    <table border="1" width="100%" cellspacing="0" cellpadding="4" style="margin-top:10px;">
      <thead>
        <tr>
          <th>Behavioural Traits</th>
          <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th>
        </tr>
      </thead>
      <tbody>
        ${makeRow("Spirit of Cooperation", psycho.behaviour.spiritOfCooperation)}
        ${makeRow("Sense of Responsibility", psycho.behaviour.senseOfResponsibility)}
        ${makeRow("Attentiveness", psycho.behaviour.attentiveness)}
        ${makeRow("Organizational Ability", psycho.behaviour.organizationalAbility)}
        ${makeRow("Perseverance", psycho.behaviour.perseverance)}
        ${makeRow("Self Control", psycho.behaviour.selfControl)}
      </tbody>
    </table>
    </div>

    <p style="margin-top:8px;">
      <strong>Key:</strong> 1 = Poor, 2 = Fair, 3 = Good, 4 = Very Good, 5 = Excellent
    </p>
  `;
} else {
  html += `<p><em>--__ .</em></p>`;
}

function viewHeadTeacherRemark(){
  if(!data.headTeacherRemark){
    html += ``;
  }else{
    html += `<div class="head-teacher-remark">
    <strong>Head Teacher's Remark:</strong>
    ${data.headTeacherRemark}
  </div>`;
  }
}

function viewFormTeacherRemark(){
  if(!data.formTeacherRemark){
    html += ``;
  }else{
    html += `<div class="head-teacher-remark">
    <strong>Form Teacher's Remark:</strong>
    ${data.formTeacherRemark}
  </div>`;
  }
}

viewFormTeacherRemark();

viewHeadTeacherRemark()

  resultArea.innerHTML = html;

  document.getElementById('studentName').innerText = data.studentName;
document.getElementById('academicSessionText').innerText =
  sessionSelect.options[sessionSelect.selectedIndex].text;

document.getElementById('className').innerText = data.className;
document.getElementById('attendance').innerText = data.attendance || '—';

document.getElementById('termText').innerText =
  term === 'term1' ? '1st Term' :
  term === 'term2' ? '2nd Term' : '3rd Term';

document.getElementById('vacationDate').innerText = data.vacationDate || '—';
document.getElementById('resumptionDate').innerText = data.resumptionDate || '—';
document.getElementById('studentsInClass').innerText = data.totalStudents;

}