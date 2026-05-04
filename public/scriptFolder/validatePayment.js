const FEE_PER_STUDENT = 500;

function payStudent(studentId, name) {
const session = document.getElementById('academicSession').value;
const term = document.getElementById('term').value;

if (!session || !term) {
    alert('Please select Academic Session and Term');
    return;
}

if (!confirm(`Pay ₦${FEE_PER_STUDENT} for ${name}?`)) return;

// Redirect with parameters
window.location.href =
    `/fees/verify/${studentId}?session=${session}&term=${term}&amount=${FEE_PER_STUDENT}`;
}

