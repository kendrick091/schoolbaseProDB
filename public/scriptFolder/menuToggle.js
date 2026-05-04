function toggleMenu() {
    document.querySelector(".sidebar nav").classList.toggle("active");
}

//code for dashboard menu toggle

const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');

let overlay = document.createElement('div');
overlay.className = 'sidebar-overlay';
document.body.appendChild(overlay);

menuToggle?.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
});

overlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
});
// Close sidebar on link click (for better UX on mobile)