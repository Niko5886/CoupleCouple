import './register.css';
import registerTemplate from './register.html?raw';
import { signUp } from '../../services/supabaseClient.js';
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
    const confirmPassword = formData.get('confirmPassword');

    // Validation
    if (!email || !password || !confirmPassword) {
      status.textContent = 'Please fill in all fields.';
      status.className = 'auth-status auth-status--error';
      return;
    }

    if (password.length < 6) {
      status.textContent = 'Password must be at least 6 characters long.';
      status.className = 'auth-status auth-status--error';
      return;
    }

    if (password !== confirmPassword) {
      status.textContent = 'Passwords do not match.';
      status.className = 'auth-status auth-status--error';
      return;
    }

    // Disable form during submission
    submitButton.disabled = true;
    submitButton.textContent = 'Creating account...';
    status.textContent = 'Creating your account...';
    status.className = 'auth-status';

    const { data, error } = await signUp(email, password);

    if (error) {
      status.textContent = error.message || 'Failed to create account. Please try again.';
      status.className = 'auth-status auth-status--error';
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
      return;
    }

    // Success message
    status.textContent = 'Account created successfully! Please check your email to verify your account.';
    status.className = 'auth-status auth-status--success';
    form.reset();
    
    // Redirect to login after delay
    setTimeout(() => {
      router.navigate('/login');
    }, 2000);
  });
}

function bindTestCredentials(container) {
  const toggleBtn = container.querySelector('[data-toggle-creds]');
  const credsList = container.querySelector('[data-creds-list]');
  const adminBtn = container.querySelector('[data-use-admin]');
  const userBtn = container.querySelector('[data-use-user]');
  const emailInput = container.querySelector('[name="email"]');
  const passwordInput = container.querySelector('[name="password"]');
  const confirmPasswordInput = container.querySelector('[name="confirmPassword"]');

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
    confirmPasswordInput.value = 'Password123!';
    emailInput.focus();
  });

  // Use user credentials
  userBtn.addEventListener('click', (e) => {
    e.preventDefault();
    emailInput.value = 'maria@gmail.com';
    passwordInput.value = 'Password123!';
    confirmPasswordInput.value = 'Password123!';
    emailInput.focus();
  });
}

export function renderRegisterPage() {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = registerTemplate;
  const page = wrapper.firstElementChild;
  bindAuthForm(page);
  bindTestCredentials(page);
  return page;
}
