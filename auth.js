function isLoggedIn() {
  const email = localStorage.getItem('email');
  return email && (email.endsWith('@wyomingarea.org') || email === 'teacheronly');
}

function updateLoginUI() {
  const link = document.getElementById('loginLink');
  const messageEl = document.getElementById('loginMessage');
  const teacherLink = document.getElementById('teacherLink');
  const email = localStorage.getItem('email');
  const isTeacher = email === 'teacheronly';
  if (isLoggedIn()) {
    if (link) {
      link.textContent = 'Logout';
      link.href = '#';
      link.onclick = (e) => { e.preventDefault(); logout(); };
    }
    if (messageEl) messageEl.textContent = '';
  } else {
    if (link) {
      link.textContent = 'Login';
      link.href = 'login.html';
    }
    if (messageEl) messageEl.textContent = "This is for Hizzy's students only";
  }
  if (teacherLink) teacherLink.style.display = isTeacher ? '' : 'none';
}

function requireLogin() {
  if (!isLoggedIn() && !window.location.pathname.endsWith('login.html')) {
    window.location.href = 'login.html';
  }
}

function logout() {
  localStorage.removeItem('email');
  updateLoginUI();
  window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', updateLoginUI);
requireLogin();