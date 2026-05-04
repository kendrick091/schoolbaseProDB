const logoInput = document.getElementById('logoInput');
const logoForm = document.getElementById('logoForm');

logoInput.addEventListener('change', () => {
    if (logoInput.files.length > 0) {
        logoForm.submit();
    }
});

