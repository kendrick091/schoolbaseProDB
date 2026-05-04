function openEditStudent(id, name, classId) {
    document.getElementById('editStudentId').value = id;
    document.getElementById('editStudentName').value = name;
    document.getElementById('editStudentClass').value = classId;

    openModal('editStudentModal');
}