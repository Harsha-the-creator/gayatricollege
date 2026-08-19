import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { loadFirebaseConfig } from './firebase-config.js';

let auth = null;
const authReady = loadFirebaseConfig()
  .then(firebaseConfig => {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    return auth;
  })
  .catch(error => {
    console.error('Firebase authentication setup failed:', error);
    return null;
  });

const passwordToggle = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const passwordVisibilityIcon = document.getElementById('passwordVisibilityIcon');

if (passwordToggle && passwordInput && passwordVisibilityIcon) {
  passwordToggle.addEventListener('click', () => {
    const isVisible = passwordInput.type === 'text';
    passwordInput.type = isVisible ? 'password' : 'text';
    passwordToggle.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
    passwordToggle.setAttribute('title', isVisible ? 'Show password' : 'Hide password');
    passwordVisibilityIcon.innerHTML = isVisible
      ? '<path d="M2.06 12.35a1 1 0 0 1 0-.7C3.73 7.61 7.65 5 12 5s8.27 2.61 9.94 6.65a1 1 0 0 1 0 .7C20.27 16.39 16.35 19 12 19s-8.27-2.61-9.94-6.65Z"/><circle cx="12" cy="12" r="3"/>'
      : '<path d="M3 3l18 18"/><path d="M10.58 10.58a2 2 0 0 0 2.83 2.83"/><path d="M9.36 5.36A10.94 10.94 0 0 1 12 5c4.35 0 8.27 2.61 9.94 6.65a1 1 0 0 1 0 .7 10.98 10.98 0 0 1-4.1 4.75"/><path d="M6.61 6.61a10.98 10.98 0 0 0-4.55 5.04 1 1 0 0 0 0 .7C3.73 16.39 7.65 19 12 19c1.17 0 2.29-.2 3.32-.57"/>';
  });
}

function showAuthFeedback(message, type = 'info') {
  const toastContainer = document.getElementById('toastContainer');

  if (toastContainer && typeof window.showToast === 'function') {
    window.showToast('Password Reset', message, type);
    return;
  }

  if (type === 'success') {
    alert(message);
  } else {
    alert(message);
  }
}

window.loginAdmin = async function () {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const msg = document.getElementById("msg");

  const pageLoader = document.getElementById('pageLoader');
  const submitBtn = document.querySelector('#adminLoginForm button[type="submit"]');
  const forgotBtn = document.querySelector('#adminLoginForm button[onclick="forgotPassword()"]');

  msg.innerText = "";
  msg.style.color = "";

  const firebaseAuth = await authReady;
  if (!firebaseAuth) {
    msg.style.color = "red";
    msg.innerText = "Unable to connect to the authentication service. Start the backend on port 5000 and try again.";
    return;
  }

  try {
    // show loader and disable form while authenticating
    if (pageLoader) {
      pageLoader.style.display = 'flex';
      pageLoader.classList.remove('fade-out');
    }
    if (submitBtn) submitBtn.disabled = true;
    if (forgotBtn) forgotBtn.disabled = true;

    await signInWithEmailAndPassword(firebaseAuth, email, password);
    msg.style.color = "green";
    msg.innerText = "Login successful. Redirecting...";
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 700);
  } catch (error) {
    console.error('Firebase login failed:', error);
    msg.style.color = "red";
    msg.innerText = "Invalid email or password";
    // hide loader and re-enable form on failure
    if (pageLoader) {
      pageLoader.classList.add('fade-out');
      setTimeout(() => { pageLoader.style.display = 'none'; }, 400);
    }
    if (submitBtn) submitBtn.disabled = false;
    if (forgotBtn) forgotBtn.disabled = false;
  }
};

window.forgotPassword = async function () {
  const email = document.getElementById("email").value.trim();
  const msg = document.getElementById("msg");

  msg.innerText = "";
  msg.style.color = "";

  if (!email) {
    msg.style.color = "red";
    msg.innerText = "Enter your email first";
    return;
  }

  const firebaseAuth = await authReady;
  if (!firebaseAuth) {
    msg.style.color = "red";
    msg.innerText = "Unable to connect to the authentication service.";
    return;
  }

  try {
    await sendPasswordResetEmail(firebaseAuth, email);
    msg.style.color = "green";
    msg.innerText = "Password reset email sent. Check your inbox.";
  } catch (error) {
    console.error('Password reset failed:', error);
    msg.style.color = "red";
    msg.innerText = "Unable to send reset email";
  }
};

window.resetCurrentAdminPassword = async function () {
  const firebaseAuth = await authReady;
  const user = firebaseAuth?.currentUser;

  if (!user || !user.email) {
    showAuthFeedback('Please sign in again before resetting your password.', 'error');
    return;
  }

  const confirmed = confirm('Send a password reset email to your registered admin email?');
  if (!confirmed) return;

  try {
    await sendPasswordResetEmail(firebaseAuth, user.email);
    showAuthFeedback('Password reset email sent to your registered admin email.', 'success');
  } catch (error) {
    console.error('Password reset failed:', error);
    showAuthFeedback('Unable to send password reset email right now.', 'error');
  }
};

window.logoutAdmin = async function () {
  try {
    const firebaseAuth = await authReady;
    if (firebaseAuth) await signOut(firebaseAuth);
  } catch (error) {
    console.error('Firebase sign out failed:', error);
  }
  window.location.href = "admin.html";
};

window.checkDashboardAuth = function () {
  authReady.then(firebaseAuth => {
    if (!firebaseAuth) {
      window.location.href = 'admin.html';
      return;
    }

    onAuthStateChanged(firebaseAuth, function (user) {
    const currentPath = window.location.pathname;

    if (user && currentPath.includes('dashboard.html')) {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0 && navEntries[0].type === 'reload') {
        signOut(firebaseAuth).then(() => {
          window.location.href = 'admin.html';
        });
        return;
      }
    }

    if (!user && currentPath.includes('dashboard.html')) {
      window.location.href = 'admin.html';
      return;
    }

    if (user && currentPath.includes('admin.html')) {
      window.location.href = 'dashboard.html';
    }
    });
  });
};

// Inactivity Logout Logic (1 Hour)
let inactivityTimer;
const INACTIVITY_LIMIT = 60 * 60 * 1000; // 1 hour in milliseconds

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    if (auth?.currentUser && window.location.pathname.includes('dashboard.html')) {
      alert("Session expired due to inactivity.");
      window.logoutAdmin();
    }
  }, INACTIVITY_LIMIT);
}

// Only track inactivity on the dashboard
if (window.location.pathname.includes('dashboard.html')) {
  ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, resetInactivityTimer, { passive: true });
  });
  resetInactivityTimer();
}
