/* 🔍 SEARCH */
function searchTable() {
  const input = document.getElementById("searchInput").value.toLowerCase();
  const rows = document.querySelectorAll("#studentTable tbody tr");

  rows.forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(input)
      ? ""
      : "none";
  });
}

/* ⬍ SORT */
function sortTable(colIndex) {
  const table = document.getElementById("studentTable");
  const rows = Array.from(table.rows).slice(1);
  const asc = table.dataset.sort !== "asc";

  rows.sort((a, b) => {
    const x = a.cells[colIndex].innerText.toLowerCase();
    const y = b.cells[colIndex].innerText.toLowerCase();
    return asc ? x.localeCompare(y) : y.localeCompare(x);
  });

  table.dataset.sort = asc ? "asc" : "desc";
  rows.forEach(row => table.tBodies[0].appendChild(row));
}

/* 🗑 DELETE CONFIRM */
function confirmDelete() {
  return confirm("Are you sure you want to delete this student?");
}

//= ===========================================
// code for teacherClass.ejs search functionality

/* 🔍 Simple client-side search */
const searchInput = document.getElementById('searchStudent');
const rows = document.querySelectorAll('#studentsTable tbody tr');

searchInput.addEventListener('input', () => {
  const value = searchInput.value.toLowerCase();
  rows.forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(value)
      ? ''
      : 'none';
  });
});