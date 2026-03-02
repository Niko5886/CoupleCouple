import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './styles/bootstrap-theme.css';
import './styles/global.css';
import { initializeRouter } from './router/router.js';
import { initializeAuth } from './services/authState.js';

// Initialize authentication state first
await initializeAuth();

// Then initialize router
initializeRouter();
