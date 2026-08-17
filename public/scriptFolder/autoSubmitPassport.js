const passportInput = document.getElementById('passportInput');
const passportForm = document.getElementById('passportForm');

passportInput.addEventListener('change', () => {
    if (passportInput.files.length > 0) {
        passportForm.submit();
    }
});

