document.addEventListener('DOMContentLoaded', () => {
const sessionSelect = document.getElementById('academicSession');
const studentId =
  document.getElementById('resultArea')
  .dataset.studentId;


sessionSelect.addEventListener('change', loadCumulative);

async function loadCumulative() {

  const academicSessionId = sessionSelect.value;

  if (!academicSessionId) {
    resultArea.innerHTML = '';
    return;
  }

    const res = await fetch(
    `/adminStudentCumulative2/load/result?studentId=${studentId}&academicSessionId=${academicSessionId}`
    );

  const data = await res.json();

  if (!data.exists) {
    resultArea.innerHTML = '<p>No cumulative result available.</p>';
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
        <br>
        <div class="headSchoolName">Cumulative Result</div>
      </div>
      <div class="logo"></div>
    </div>
    <hr>

    <div class="cumulative-headers">
    <div class="cumulative-header">
      <p><strong>Student Name:</strong> ${data.studentName}</p>
      <p><strong>Academic Session:</strong> ${data.academicSession}</p>
      <p><strong>Class:</strong> ${data.className}</p>
      </div>

      <div class="cumulative-header">
      <p><strong>Vacation Date:</strong> ${data.vacationDate || '-'}</p>
      <p><strong>Resumption Date:</strong> ${data.resumptionDate || '-'}</p>
        </div>
    </div>

    <table width="100%">
      <tr>
        <th>Subject</th>
        <th>1st Term</th>
        <th>2nd Term</th>

        <th>CA1</th>
        <th>CA2</th>
        <th>CA3</th>
        <th>CA4</th>

        <th>Exam</th>

        <th>3rd Term</th>

        <th>Cumulative</th>

        <th>Average</th>

        <th>Grade</th>
     </tr>
  `;

  data.results.forEach(r => {
    const terms =
  [r.term1, r.term2, r.term3]
  .filter(score => score > 0);

const termAvg =
  terms.length
    ? (r.total / terms.length).toFixed(2)
    : 0;

    html += `
     <tr>

    <td>${r.subjectName}</td>

    <td>${r.firstTerm}</td>

    <td>${r.secondTerm}</td>

    <td>${r.ca1}</td>

    <td>${r.ca2}</td>

    <td>${r.ca3}</td>

    <td>${r.ca4}</td>

    <td>${r.exam}</td>

    <td>${r.thirdTerm}</td>

    <td>${r.cumulativeTotal}</td>

    <td>${r.average}</td>

    <td>${r.grade}</td>

  </tr>
    `;
  });

 const avg = parseFloat(data.average);

let promotionStatus = "";
if (avg > 45) {
  promotionStatus = `<span style="color:green; font-weight:bold;">
    Promoted
  </span>`;
} else {
  promotionStatus = `<span style="color:red; font-weight:bold;">
    Not Promoted
  </span>`;
}

html += `
  </table>

  <p>
    <strong>Total:</strong> ${data.total} |
    <strong>Average:</strong> ${data.average} |
    <strong>Grade:</strong> ${data.grade}
  </p>

  <p>
    <strong>Status:</strong> ${promotionStatus}
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
    <h4 style="margin-top:5px; margin-bottom: 2px;">Psychomotor & Behaviour Assessment</h4>

    <div class="displayPsychomotor">
    <!-- Psychomotor -->
    <table border="1" width="100%" cellspacing="0" cellpadding="4">
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
    <table border="1" width="100%" cellspacing="0" cellpadding="4" style="margin-top:10px;">
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

    <p style="margin-top:6px;">
      <strong>Key:</strong> 1 = Poor, 2 = Fair, 3 = Good, 4 = Very Good, 5 = Excellent
    </p>
  `;
} else {
  html += `<p><em>--__ .</em></p>`;
}
//=======================
//=======================

  if (data.headTeacherRemark) {
    html += `
      <div style="margin-top:10px;">
        <strong>Head Teacher's Remark:</strong>
        ${data.headTeacherRemark}
      </div>
    `;
  }

  resultArea.innerHTML = html;
}
});