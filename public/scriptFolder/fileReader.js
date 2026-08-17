const passportInput = document.getElementById("passport");
const passportPreview = document.getElementById("passportPreview");

// This code is used to display image selected by user
passportInput.addEventListener("change", function () {
    const file = this.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {
        passportPreview.src = e.target.result;
    };

    reader.readAsDataURL(file);
});