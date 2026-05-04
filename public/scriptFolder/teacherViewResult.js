function viewResultT(studentId, classId) {
    const sessionId = document.getElementById("academicSession").value;
    const term = document.getElementById("term").value;

    if (!sessionId || !term) {
        alert("Please select academic session and term first.");
        return;
    }

    window.location.href =
      `/teacherResult/student/${studentId}/result?academicSessionId=${sessionId}&term=${term}&classId=${classId}`;
}