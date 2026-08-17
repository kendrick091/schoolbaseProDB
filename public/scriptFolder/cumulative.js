document.addEventListener('DOMContentLoaded', () => {
const sessionSelect = document.getElementById('academicSession');
const resultArea = document.getElementById('resultArea');


sessionSelect.addEventListener('change', loadCumulative);

async function loadCumulative() {

  const academicSessionId = sessionSelect.value;

  if (!academicSessionId) {
    resultArea.innerHTML = '';
    return;
  }

  const res = await fetch(
    `/studentCumulative/cumulative/load?academicSessionId=${academicSessionId}&term=term3`
  );

  const data = await res.json();

  console.log(data);

  if (!data.success) {

    if(data.reason === "payment_required"){

    resultArea.innerHTML = `
        <div class="payment-warning">
            <h2>Fee Not Paid</h2>
            <p>Your school fee for this academic session has not been paid.</p>
        </div>
    `;

    printBtn.style.display = "none";

    return;
}else if(data.reason === "no_result"){
    resultArea.innerHTML = `
        <div class="payment-warning">
            <h2>No Result Available</h2>
            <p>No result has been uploaded for this term.</p>
        </div>
    `;

}
    return;
}


  let html = `
 <div class="schoolInfo">
      <div class="logo">
        <img 
            src="${data.student?.studentPassport || '/images/default-school.png'}" 
            alt="Student Passport">
      </div>
      <div class="schoolHead">
        <div class="headSchoolName">${data.school.schoolname}</div>
        <div class="headSchoolAddress">${data.school.address}</div>
      </div>
      <div class="logo">
      <img 
            src="${data.school?.schoolLogo || '/images/default-school.png'}" 
            alt="School Logo">
      </div>
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
        <th>3rd Term</th>
        <th>Total</th>
        <th>Average</th>
      </tr>
  `;

  data.results.forEach(r => {
    html += `
      <tr>
        <td>${r.subjectName}</td>
        <td>${r.term1}</td>
        <td>${r.term2}</td>
        <td>${r.term3}</td>
        <td>${r.total}</td>
        <td>${(r.total/3).toFixed(2)}</td>
      </tr>
    `;
  });

 const avg = parseFloat(data.average);

let promotionStatus = "";
if (avg > 45) {
  promotionStatus = `<span style="color:green; font-weight:bold;">
    Promoted to Next Class
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