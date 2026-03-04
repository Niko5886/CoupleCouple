import './login.css';
import loginTemplate from './login.html?raw';
import { signIn } from '../../services/supabaseClient.js';
import { refreshUser } from '../../services/authState.js';
import { markLastSeen } from '../../services/profileService.js';
import { router } from '../../router/router.js';

function bindAuthForm(container) {
  const form = container.querySelector('[data-auth-form]');
  const status = container.querySelector('[data-auth-status]');
  const submitButton = form.querySelector('[type="submit"]');
  const originalButtonText = submitButton.textContent;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const formData = new FormData(form);
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) {
      status.textContent = 'Please enter both email and password.';
      status.className = 'auth-status auth-status--error';
      return;
    }

    // Disable form during submission
    submitButton.disabled = true;
    submitButton.textContent = 'Signing in...';
    status.textContent = 'Signing in...';
    status.className = 'auth-status';

    const { data, error } = await signIn(email, password);

    if (error) {
      status.textContent = error.message || 'Failed to sign in. Please try again.';
      status.className = 'auth-status auth-status--error';
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
      return;
    }

    status.textContent = 'Login successful! Redirecting...';
    status.className = 'auth-status auth-status--success';
    
    // Refresh auth state and redirect to dashboard
    await refreshUser();
    await markLastSeen();
    
    // Navigate to dashboard
    setTimeout(() => {
      router.navigate('/users');
    }, 500);
  });
}

function bindTestCredentials(container) {
  const toggleBtn = container.querySelector('[data-toggle-creds]');
  const credsList = container.querySelector('[data-creds-list]');
  const adminBtn = container.querySelector('[data-use-admin]');
  const userBtn = container.querySelector('[data-use-user]');
  const sofiBtn = container.querySelector('[data-use-sofi]');
  const emailInput = container.querySelector('[name="email"]');
  const passwordInput = container.querySelector('[name="password"]');

  // Toggle credentials visibility
  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const isHidden = credsList.hidden;
    credsList.hidden = !isHidden;
    toggleBtn.setAttribute('aria-expanded', String(isHidden));
    const icon = toggleBtn.querySelector('.toggle-icon');
    icon.textContent = isHidden ? '▲' : '▼';
  });

  // Use admin credentials
  adminBtn.addEventListener('click', (e) => {
    e.preventDefault();
    emailInput.value = 'nik@gmail.com';
    passwordInput.value = 'Password123!';
    emailInput.focus();
  });

  // Use user credentials
  userBtn.addEventListener('click', (e) => {
    e.preventDefault();
    emailInput.value = 'maria@gmail.com';
    passwordInput.value = 'Password123!';
    emailInput.focus();
  });

  // Use sofi credentials
  sofiBtn.addEventListener('click', (e) => {
    e.preventDefault();
    emailInput.value = 'sofi@gmail.com';
    passwordInput.value = 'pas123';
    emailInput.focus();
  });
}

export function renderLoginPage() {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = loginTemplate;
  const page = wrapper.firstElementChild;
  bindAuthForm(page);
  bindTestCredentials(page);
  return page;
}
