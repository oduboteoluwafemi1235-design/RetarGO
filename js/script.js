const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const themeToggle = document.querySelector('.theme-toggle');

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.querySelectorAll('.nav-links a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

if (themeToggle) {
  const savedTheme = localStorage.getItem('retargo-theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    themeToggle.textContent = '☀️';
  }

  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    themeToggle.textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem('retargo-theme', isLight ? 'light' : 'dark');
  });
}

const year = document.getElementById('year');
if (year) {
  year.textContent = new Date().getFullYear();
}
