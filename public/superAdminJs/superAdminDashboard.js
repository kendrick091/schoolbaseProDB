const displayView = document.getElementById("displayView");

function showDashboard() {
    displayView.innerHTML = `
        <h3>Dashboard Overview</h3>
        <p>Total Active Students: ${activeStudents.length}</p>
        <p>Total Inactive Students: ${inactiveStudents.length}</p>

        <div>
            <button class="btn green-btn" onclick="updatePaymentTrue()">
                Update Student Payment to True
                <div>
                    Total Paid: ${
                        activeStudents.filter(s => s.payment === true).length
                    }
                </div>
            </button>

            <button class=" btn red-btn" onclick="updatePaymentFalse()">
                Update Student Payment to False
                <div>
                    Total Unpaid: ${
                        activeStudents.filter(s => s.payment === false).length
                    }
                </div>
            </button>
            
            <button class="btn blue-btn" onclick="updateSchoolPayment()">
                Update School Payment
                <div>
                    (Status: <span style="color: 
                    ${schoolPayment === true ? 'green' : 'red'}">
                    ${ schoolPayment ? "Paid" : "Unpaid" }
                    </span>)
                </div>
            </button>
        </div>
    `;
}

function viewActiveStudent() {
    if (activeStudents.length === 0) {
        displayView.innerHTML = `<p>No active students found.</p>`;
        return;
    }

    let html = `
        <h3>Active Students</h3>

        <input
      type="text"
      id="searchInput"
      placeholder="Search student..."
      onkeyup="searchTable()"
    />
        <table id="studentTable" border="1">
            <tr>
                <th onclick="sortTable(0)">Name</th>
                <th>Fee</th>
                <th>Actions</th>
            </tr>
    `;

    activeStudents.forEach(student => {
        html += `
            <tr>
                <td>${student.studentFullName}</td>
                <td>${student.payment ? "Paid" : "Unpaid"}</td>
                <td>
                    <button onclick="viewStudentDetails('${student._id}')">View Details</button>
                    <button onclick="toggleStudentPayment('${student._id}', ${student.payment})">
                        Toggle Payment
                    </button>
                    <button onclick="toggleStudentStatus('${student._id}', ${student.isActive})">
                        ${student.isActive ? "Deactivate" : "Activate"}
                    </button>
                </td>
            </tr>
        `;
    });

    html += `</table>`;
    displayView.innerHTML = html;
}

function viewInactiveStudent() {
    if (inactiveStudents.length === 0) {
        displayView.innerHTML = `<p>No inactive students found.</p>`;
        return;
    }

    let html = `
        <h3>Inactive Students</h3>
        <input
      type="text"
      id="searchInput"
      placeholder="Search student..."
      onkeyup="searchTable()"
    />
        <table id="studentTable" border="1">
            <tr>
                <th onclick="sortTable(0)">Name</th>
                <th>Fee</th>
                <th>Actions</th>
            </tr>
    `;

    inactiveStudents.forEach(student => {
        html += `
            <tr>
                <td>${student.studentFullName}</td>
                <td>${student.payment ? "Paid" : "Unpaid"}</td>
                <td>
                    <button onclick="viewStudentDetails('${student._id}')">View Details</button>
                    <button onclick="toggleStudentPayment('${student._id}', ${student.payment})">
                        Toggle Payment
                    </button>
                    <button onclick="toggleStudentStatus('${student._id}', ${student.active})">
                        ${student.active ? "Deactivate" : "Activate"}
                    </button>
                </td>
            </tr>
        `;
    });

    html += `</table>`;
    displayView.innerHTML = html;
}

async function updatePaymentTrue() {
    try {
        const response = await fetch(
            `/superAdminDashboard/update-payment/${schoolId}/true`,
            {
                method: "POST"
            }
        );

        if (!response.ok) {
            throw new Error("Route not found");
        }

        const data = await response.json();

        alert(data.message);
        location.reload();

    } catch (error) {
        console.error(error);
        alert("Failed to update payment");
    }
}

// Update payment for School
async function updateSchoolPayment() {
    try {
        const response = await fetch(
            `/superAdminDashboard/toggle-school-payment/${schoolId}`,
            {
                method: "POST"
            }
        );

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            location.reload();
        }

    } catch (error) {
        console.error(error);
        alert("Failed to update school payment");
    }
}

async function updatePaymentFalse() {
    try {
        const response = await fetch(
            `/superAdminDashboard/update-payment/${schoolId}/false`,
            {
                method: "POST"
            }
        );

        if (!response.ok) {
            throw new Error("Route not found");
        }

        const data = await response.json();

        alert(data.message);
        location.reload();

    } catch (error) {
        console.error(error);
        alert("Failed to update payment");
    }
}

// ====================================
// Update for each student payment toggle and Status toggle
//=====================================
async function toggleStudentPayment(studentId, currentPaymentStatus) {
    try {
        const response = await fetch(
            `/superAdminDashboard/toggle-student-payment/${studentId}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    payment: !currentPaymentStatus
                })
            }
        );

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            location.reload();
        }

    } catch (error) {
        console.error(error);
        alert("Failed to update student payment");
    }
}


async function toggleStudentStatus(studentId, currentStatus) {
    try {
        const response = await fetch(
            `/superAdminDashboard/toggle-student-status/${studentId}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    isActive: !currentStatus
                })
            }
        );

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            location.reload();
        }

    } catch (error) {
        console.error(error);
        alert("Failed to update student status");
    }
}